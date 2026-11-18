import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import {
  AiCatchUpSummary,
  ChatMessageRecord,
  DvrChapter,
  DvrEvent,
  DvrRecording,
  FlashcardItem,
  QosSample,
  QuizQuestion,
  RoomParticipant,
  RoomState,
  StudioPoll,
  StudioQuestion,
  TranscriptEntry,
  VideoMode,
} from './types';
import {
  deleteFirestoreDocument,
  FirebaseUserPayload,
  getFirestoreDocument,
  listFirestoreCollection,
   sanitizeUserId,
  saveUserToFirestore,
  syncRoomToFirestore,
  upsertFirestoreDocument,
  verifyFirebaseIdToken,
} from './firebase';
import {
  AuthenticatedRequest,
  authenticateSocketConnection,
  createExpressRateLimiter,
  MAX_DVR_EVENTS_PER_ROOM,
  MAX_PARTICIPANTS_PER_ROOM,
  MAX_ROOMS,
  MAX_STROKES_PER_ROOM,
  requireFirebaseAuth,
  sanitizeDisplayText,
  sanitizeMultilineText,
  sanitizeRoomOrEntityId,
  securityHeadersMiddleware,
  SlidingWindowRateLimiter,
  validateAndSanitizeLaser,
  validateAndSanitizeStroke,
  validateWebRtcSignal,
} from './security';

const app = express();
app.disable('x-powered-by');

const server = http.createServer(app);

// Strict Origin Allowlist
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : DEFAULT_ALLOWED_ORIGINS
  ).filter(Boolean)
);

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  return allowedOrigins.has(origin);
};

const io = new Server(server, {
  maxHttpBufferSize: 32 * 1024, // Hard 32 KB frame limit against memory DoS
  pingTimeout: 20_000,
  pingInterval: 25_000,
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by Chalk CORS policy'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 1. Security Headers
app.use(securityHeadersMiddleware);

// 2. Strict CORS Policy
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by Chalk CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  })
);

// 3. Strict JSON Body Size Limit (64 KB: quizzes and notes need more than 16 KB)
app.use(express.json({ limit: '64kb', strict: true }));

// 4. Rate Limiters
const generalApiLimiter = createExpressRateLimiter(240, 60_000); // 240 req/min per IP
const strictMutationLimiter = createExpressRateLimiter(40, 60_000); // 40 req/min per IP

app.use(generalApiLimiter);

// --- Bounded In-Memory Meeting State ---
const MAX_CHAT_PER_ROOM = 300;
const MAX_QOS_SAMPLES = 2000;
const EMPTY_ROOM_GRACE_MS = 30_000; // keep a session alive briefly across page reloads
const MAX_TOTAL_SLIDES = 50;
const DEFAULT_TOTAL_SLIDES = 1;
// Public "Try a live class" room from the landing page; guests may wipe its board.
const TRIAL_ROOM_ID = 'csc401-algo';

const rooms: Map<string, RoomState> = new Map();
const activeDvrSessions: Map<string, { startTime: number; events: DvrEvent[] }> =
  new Map();
const savedRecordings: Map<string, DvrRecording> = new Map();
const emptyRoomTimers: Map<string, NodeJS.Timeout> = new Map();
const qosSamples: QosSample[] = [];

// Restore persisted recordings and QoS measurements
(async () => {
  try {
    const persisted = await listFirestoreCollection('replays');
    for (const rec of persisted) {
      if (typeof rec.id === 'string' && Array.isArray(rec.events)) {
        savedRecordings.set(rec.id, rec as unknown as DvrRecording);
      }
    }
    const metrics = getFirestoreDocument('metrics', 'qos');
    if (metrics && Array.isArray(metrics.samples)) {
      qosSamples.push(...(metrics.samples as QosSample[]).slice(-MAX_QOS_SAMPLES));
    }
  } catch (err) {
    console.warn('[Chalk Server] Could not restore persisted recordings/metrics:', err);
  }
})();

let qosPersistTimer: NodeJS.Timeout | null = null;
const scheduleQosPersist = () => {
  if (qosPersistTimer) return;
  qosPersistTimer = setTimeout(() => {
    qosPersistTimer = null;
    upsertFirestoreDocument('metrics', 'qos', {
      samples: qosSamples.slice(-1000),
    }).catch(() => { });
  }, 5_000);
  qosPersistTimer.unref?.();
};

// --- Helpers ---

const deriveInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const roundTo = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const persistRoom = (room: RoomState) => {
  syncRoomToFirestore(room.id, {
    id: room.id,
    title: room.title,
    lecturerName: room.lecturerName,
    courseCode: room.courseCode,
    courseId: room.courseId || null,
    strokes: room.strokes,
    activeSlideIndex: room.activeSlideIndex,
    totalSlides: room.totalSlides,
  }).catch(() => { });
};

const pushDvrEvent = (roomId: string, type: DvrEvent['type'], data: unknown) => {
  const dvr = activeDvrSessions.get(roomId);
  if (dvr && dvr.events.length < MAX_DVR_EVENTS_PER_ROOM) {
    dvr.events.push({ t: Date.now() - dvr.startTime, type, data });
  }
};

const broadcastParticipants = (room: RoomState) => {
  io.to(room.id).emit('participants_update', {
    roomId: room.id,
    participants: room.participants,
    lecturerName: room.lecturerName,
    hostUserId: room.hostUserId || null,
    lecturerId: room.lecturerId || null,
  });
};

const hasLecturerPresent = (room: RoomState) =>
  room.participants.some((p) => p.role === 'lecturer');

const buildRecording = (
  room: RoomState,
  dvr: { startTime: number; events: DvrEvent[] }
): DvrRecording | null => {
  const meaningful = dvr.events.some(
    (e) => e.type === 'stroke' || e.type === 'chat' || e.type === 'clear' || e.type === 'remove'
  );
  if (!meaningful) return null;

  const endedAt = Date.now();
  const durationMs = Math.max(1000, endedAt - dvr.startTime);

  const snapshot = dvr.events.find((e) => e.type === 'snapshot');
  const initialSlide =
    typeof snapshot?.data?.activeSlideIndex === 'number' ? snapshot.data.activeSlideIndex : 0;

  const chapters: DvrChapter[] = [
    { timestampMs: 0, title: `Board page ${initialSlide + 1}`, slideIndex: initialSlide },
  ];
  for (const ev of dvr.events) {
    if (ev.type !== 'slide_change') continue;
    const slideIndex = Number(ev.data?.slideIndex);
    if (!Number.isInteger(slideIndex)) continue;
    const last = chapters[chapters.length - 1];
    if (last.slideIndex === slideIndex) continue;
    if (chapters.length > 1 && ev.t - last.timestampMs < 5_000) {
      // Rapid paging: collapse into the previous chapter marker
      last.slideIndex = slideIndex;
      last.title = `Board page ${slideIndex + 1}`;
      const prev = chapters[chapters.length - 2];
      if (prev && prev.slideIndex === slideIndex) chapters.pop();
      continue;
    }
    chapters.push({
      timestampMs: ev.t,
      title: `Board page ${slideIndex + 1}`,
      slideIndex,
    });
  }

  const eventsJson = JSON.stringify(dvr.events);
  return {
    id: `rec_${dvr.startTime.toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
    roomId: room.id,
    ...(room.courseId ? { courseId: room.courseId } : {}),
    courseCode: room.courseCode,
    title: room.title,
    lecturerName: room.lecturerName,
    recordedAt: new Date(dvr.startTime).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMs,
    totalEvents: dvr.events.length,
    strokeCount: dvr.events.filter((e) => e.type === 'stroke').length,
    chatCount: dvr.events.filter((e) => e.type === 'chat').length,
    participantCount: room.peakParticipants,
    attendeeIds: room.attendeeIds.slice(0, 500),
    eventsSizeKb: roundTo(Buffer.byteLength(eventsJson, 'utf8') / 1024, 1),
    chapters,
    events: dvr.events,
  };
};

/** Ends the current session of an empty room: saves its DVR recording and frees memory. */
const finalizeSession = (roomId: string) => {
  emptyRoomTimers.delete(roomId);
  const room = rooms.get(roomId);
  if (!room || room.participants.length > 0) return;

  const dvr = activeDvrSessions.get(roomId);
  activeDvrSessions.delete(roomId);
  if (dvr) {
    const recording = buildRecording(room, dvr);
    if (recording) {
      savedRecordings.set(recording.id, recording);
      upsertFirestoreDocument(
        'replays',
        recording.id,
        recording as unknown as Record<string, unknown>
      ).catch(() => { });
      console.log(
        `[Chalk Server] Saved recording ${recording.id} for room "${roomId}" (${recording.totalEvents} events, ${recording.eventsSizeKb} KB)`
      );
    }
  }

  // Clear blackboard strokes and slide pointer so subsequent classes start clean
  room.strokes = [];
  room.activeSlideIndex = 0;
  persistRoom(room);
  rooms.delete(roomId);
};

/**
 * Explicitly ends the live studio session for everyone:
 * Broadcasts `clear_canvas` and `session_ended` to all participants, generates and persists the DVR recording,
 * deletes any LiveKit room, persists final room state, and clears the room from active memory.
 */
const endAndFinalizeRoom = async (roomId: string, endedByName?: string) => {
  cancelFinalize(roomId);
  const room = rooms.get(roomId);
  if (!room) return;

  const endedBy = endedByName || room.lecturerName || 'Lecturer';

  // 1. Notify all participants in this room that the canvas is cleared and the studio session has ended
  io.to(roomId).emit('clear_canvas', { roomId });
  io.to(roomId).emit('session_ended', {
    roomId,
    endedBy,
    endedAt: new Date().toISOString(),
    message: 'The studio session has ended.',
  });

  // 2. Finalize and persist DVR recording
  const dvr = activeDvrSessions.get(roomId);
  activeDvrSessions.delete(roomId);
  if (dvr) {
    const recording = buildRecording(room, dvr);
    if (recording) {
      savedRecordings.set(recording.id, recording);
      upsertFirestoreDocument(
        'replays',
        recording.id,
        recording as unknown as Record<string, unknown>
      ).catch(() => {});
      console.log(
        `[Chalk Server] Saved recording ${recording.id} for ended room "${roomId}" (${recording.totalEvents} events, ${recording.eventsSizeKb} KB)`
      );
    }
  }

  // 3. Mark room recording as finished, reset board strokes, and persist clean room state
  room.isRecording = false;
  room.strokes = [];
  room.activeSlideIndex = 0;
  persistRoom(room);

  // 4. Delete room from LiveKit if configured
  try {
    const livekitHost = process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880';
    const livekitKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const livekitSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const roomService = new RoomServiceClient(livekitHost, livekitKey, livekitSecret);
    await roomService.deleteRoom(roomId).catch(() => {});
  } catch (err) {
    // LiveKit may not be running or standalone
  }

  // 5. Delete room from active in-memory Map
  rooms.delete(roomId);

  // 6. Broadcast updated active rooms to all listeners
  const activeRooms = Array.from(rooms.values())
    .filter((r) => r.participants.length > 0)
    .map(summarizeRoom);
  io.emit('rooms_update', activeRooms);
};

const scheduleFinalizeIfEmpty = (room: RoomState) => {
  if (room.participants.length > 0 || emptyRoomTimers.has(room.id)) return;
  const timer = setTimeout(() => finalizeSession(room.id), EMPTY_ROOM_GRACE_MS);
  timer.unref?.();
  emptyRoomTimers.set(room.id, timer);
};

const cancelFinalize = (roomId: string) => {
  const timer = emptyRoomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    emptyRoomTimers.delete(roomId);
  }
};

const summarizeRoom = (r: RoomState) => ({
  id: r.id,
  title: r.title,
  lecturerName: r.lecturerName,
  hostUserId: r.hostUserId || null,
  lecturerId: r.lecturerId || null,
  courseCode: r.courseCode,
  courseId: r.courseId || null,
  participantCount: r.participants.length,
  lecturerPresent: hasLecturerPresent(r),
  strokeCount: r.strokes.length,
  isRecording: r.isRecording,
  sessionStartedAt: r.sessionStartedAt,
});

const recordingSummary = (r: DvrRecording) => ({
  id: r.id,
  roomId: r.roomId,
  courseId: r.courseId || null,
  courseCode: r.courseCode,
  title: r.title,
  lecturerName: r.lecturerName,
  recordedAt: r.recordedAt,
  endedAt: r.endedAt,
  durationMs: r.durationMs,
  totalEvents: r.totalEvents,
  strokeCount: r.strokeCount,
  chatCount: r.chatCount,
  participantCount: r.participantCount,
  attendeeIds: r.attendeeIds,
  eventsSizeKb: r.eventsSizeKb,
  chapters: r.chapters,
});

const MAX_TRANSCRIPT_PER_ROOM = 500;

const formatMsTimestamp = (ms: number): string => {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};

export interface ClientCatchUpSnapshot {
  title?: string;
  courseCode?: string;
  courseId?: string;
  lecturerName?: string;
  sessionStartedAt?: number;
  elapsedMs?: number;
  participantCount?: number;
  activeSlideIndex?: number;
  totalSlides?: number;
  strokes?: any[];
  chat?: any[];
  transcript?: any[];
  polls?: any[];
  questions?: any[];
  courseContext?: {
    department?: string;
    subject?: string;
    topics?: string[];
    recentAnnouncements?: string[];
    assignments?: string[];
  };
}

/**
 * Builds a "Catch me up" recap from what actually happened in the live session
 * from 00:00 (sessionStartedAt) up to the exact moment it was requested.
 */
const buildCatchUp = (room?: RoomState, clientSnap?: ClientCatchUpSnapshot, fallbackRoomId = 'studio') => {
  const roomId = room?.id || fallbackRoomId;
  const dvr = room ? activeDvrSessions.get(room.id) : undefined;
  const now = Date.now();
  const startTime =
    dvr?.startTime ??
    room?.sessionStartedAt ??
    (typeof clientSnap?.sessionStartedAt === 'number' && clientSnap.sessionStartedAt > 0
      ? clientSnap.sessionStartedAt
      : now - (typeof clientSnap?.elapsedMs === 'number' ? clientSnap.elapsedMs : 60_000));
  const elapsedMs = Math.max(1000, now - startTime);
  const windowMs =
    elapsedMs <= 15 * 60_000 ? 3 * 60_000 : elapsedMs <= 60 * 60_000 ? 10 * 60_000 : 15 * 60_000;

  const strokes =
    room && room.strokes.length > 0
      ? room.strokes
      : Array.isArray(clientSnap?.strokes)
        ? clientSnap!.strokes
        : [];
  const chat: ChatMessageRecord[] =
    room && room.chat.length > 0
      ? room.chat
      : Array.isArray(clientSnap?.chat)
        ? clientSnap!.chat.map((m: any, i: number) => ({
            id: String(m?.id || `chat_${i}`),
            roomId,
            userId: String(m?.userId || ''),
            senderName: sanitizeDisplayText(m?.senderName, 48) || 'Participant',
            senderRole: m?.senderRole === 'lecturer' ? 'lecturer' : 'student',
            text: sanitizeMultilineText(m?.text, 1000),
            timestamp: typeof m?.timestamp === 'number' ? m.timestamp : now,
          }))
        : [];
  const transcript: TranscriptEntry[] =
    room && Array.isArray(room.transcript) && room.transcript.length > 0
      ? room.transcript
      : Array.isArray(clientSnap?.transcript)
        ? clientSnap!.transcript.map((t: any, i: number) => {
            const ts = typeof t?.timestamp === 'number' ? t.timestamp : now;
            const offset =
              typeof t?.offsetMs === 'number' ? t.offsetMs : Math.max(0, ts - startTime);
            return {
              id: String(t?.id || `tr_${i}`),
              roomId,
              speakerId: String(t?.speakerId || ''),
              speakerName: sanitizeDisplayText(t?.speakerName || t?.speaker, 48) || 'Speaker',
              speakerRole: t?.speakerRole === 'lecturer' ? 'lecturer' : 'student',
              text: sanitizeMultilineText(t?.text, 600),
              timestamp: ts,
              offsetMs: offset,
            };
          })
        : [];
  const polls: StudioPoll[] =
    room && Array.isArray(room.polls) && room.polls.length > 0
      ? room.polls
      : Array.isArray(clientSnap?.polls)
        ? (clientSnap!.polls as StudioPoll[])
        : [];
  const questions: StudioQuestion[] =
    room && Array.isArray(room.questions) && room.questions.length > 0
      ? room.questions
      : Array.isArray(clientSnap?.questions)
        ? (clientSnap!.questions as StudioQuestion[])
        : [];

  type Segment = {
    startMs: number;
    endMs: number;
    strokes: number;
    chats: number;
    slides: number[];
    contributors: string[];
    highlights: string[];
  };
  const segments = new Map<number, Segment>();
  const getSegment = (t: number) => {
    const clampedT = Math.max(0, Math.min(elapsedMs, t));
    const idx = Math.floor(clampedT / windowMs);
    let seg = segments.get(idx);
    if (!seg) {
      seg = {
        startMs: idx * windowMs,
        endMs: Math.min(elapsedMs, (idx + 1) * windowMs),
        strokes: 0,
        chats: 0,
        slides: [],
        contributors: [],
        highlights: [],
      };
      segments.set(idx, seg);
    }
    return seg;
  };

  if (dvr?.events && dvr.events.length > 0) {
    for (const ev of dvr.events) {
      if (ev.type === 'stroke') {
        const seg = getSegment(ev.t);
        seg.strokes += 1;
        const slide = Number(ev.data?.slideIndex ?? 0);
        if (!seg.slides.includes(slide)) seg.slides.push(slide);
        const who = String(ev.data?.userName || '');
        if (who && !seg.contributors.includes(who)) seg.contributors.push(who);
      } else if (ev.type === 'chat') {
        const seg = getSegment(ev.t);
        seg.chats += 1;
        if (ev.data?.senderRole === 'lecturer' && seg.highlights.length < 4) {
          const text = String(ev.data.text || '');
          seg.highlights.push(
            `${ev.data.senderName}: ${text.length > 160 ? `${text.slice(0, 157)}...` : text}`
          );
        }
      } else if (ev.type === 'transcript') {
        const seg = getSegment(ev.t);
        if (seg.highlights.length < 4 && ev.data?.text) {
          const text = String(ev.data.text || '');
          seg.highlights.push(
            `[Spoken] ${ev.data.speakerName || 'Speaker'}: ${text.length > 160 ? `${text.slice(0, 157)}...` : text}`
          );
        }
      } else if (ev.type === 'slide_change') {
        const seg = getSegment(ev.t);
        const slide = Number(ev.data?.slideIndex ?? 0);
        if (!seg.slides.includes(slide)) seg.slides.push(slide);
        if (seg.highlights.length < 4) seg.highlights.push(`Moved to board page ${slide + 1}`);
      } else if (ev.type === 'clear') {
        const seg = getSegment(ev.t);
        if (seg.highlights.length < 4) seg.highlights.push('Board was wiped');
      }
    }
  } else {
    // Reconstruct timeline segments from strokes, chat, and transcript when DVR events are empty
    for (const s of strokes) {
      const offset =
        typeof s.timestamp === 'number' && s.timestamp > startTime
          ? s.timestamp - startTime
          : 0;
      const seg = getSegment(offset);
      seg.strokes += 1;
      const slide = typeof s.slideIndex === 'number' ? s.slideIndex : 0;
      if (!seg.slides.includes(slide)) seg.slides.push(slide);
      if (s.userName && !seg.contributors.includes(s.userName)) {
        seg.contributors.push(s.userName);
      }
    }
    for (const m of chat) {
      const offset =
        typeof m.timestamp === 'number' && m.timestamp > startTime
          ? m.timestamp - startTime
          : elapsedMs / 2;
      const seg = getSegment(offset);
      seg.chats += 1;
      if (m.senderRole === 'lecturer' && seg.highlights.length < 4) {
        seg.highlights.push(
          `${m.senderName}: ${m.text.length > 160 ? `${m.text.slice(0, 157)}...` : m.text}`
        );
      }
    }
    for (const tr of transcript) {
      const seg = getSegment(tr.offsetMs);
      if (seg.highlights.length < 4 && tr.text) {
        seg.highlights.push(
          `[Spoken] ${tr.speakerName}: ${tr.text.length > 160 ? `${tr.text.slice(0, 157)}...` : tr.text}`
        );
      }
    }
  }

  const slideStats = new Map<number, { strokeCount: number; contributors: string[]; tools: string[] }>();
  for (const s of strokes) {
    const idx = typeof s.slideIndex === 'number' ? s.slideIndex : 0;
    const entry = slideStats.get(idx) || { strokeCount: 0, contributors: [], tools: [] };
    entry.strokeCount += 1;
    if (s.userName && !entry.contributors.includes(s.userName)) {
      entry.contributors.push(s.userName);
    }
    if (s.tool && !entry.tools.includes(s.tool)) {
      entry.tools.push(s.tool);
    }
    slideStats.set(idx, entry);
  }

  return {
    roomId,
    title: room?.title || sanitizeDisplayText(clientSnap?.title, 96) || `Room ${roomId}`,
    courseCode: room?.courseCode || sanitizeDisplayText(clientSnap?.courseCode, 24) || '',
    courseId: room?.courseId || sanitizeRoomOrEntityId(clientSnap?.courseId) || undefined,
    lecturerName: room?.lecturerName || sanitizeDisplayText(clientSnap?.lecturerName, 64) || 'Lecturer',
    isLive: room ? room.participants.length > 0 : true,
    sessionStartedAt: startTime,
    elapsedMs,
    participantCount: room ? Math.max(1, room.participants.length) : Math.max(1, Number(clientSnap?.participantCount) || 1),
    strokeCount: strokes.length,
    chatCount: chat.length,
    activeSlideIndex: room?.activeSlideIndex ?? (Number(clientSnap?.activeSlideIndex) || 0),
    totalSlides: room?.totalSlides ?? (Number(clientSnap?.totalSlides) || 1),
    segments: Array.from(segments.values()).sort((a, b) => a.startMs - b.startMs),
    slides: Array.from(slideStats.entries())
      .map(([slideIndex, v]) => ({ slideIndex, ...v }))
      .sort((a, b) => a.slideIndex - b.slideIndex),
    lecturerMessages: chat.filter((m) => m.senderRole === 'lecturer').slice(-8),
    recentMessages: chat.slice(-15),
    transcript: transcript.slice(-80),
    polls: polls.slice(0, 10),
    questions: questions.slice(0, 15),
    courseContext: clientSnap?.courseContext,
  };
};

/**
 * Reconstructs the Catch-Up synthesis context from a persisted session recording,
 * matching `buildCatchUp` so Gemini AI synthesis and follow-up Q&A work identically
 * for completed sessions outside the live Studio.
 */
const buildCatchUpFromRecording = (recording: DvrRecording): ReturnType<typeof buildCatchUp> => {
  const startTime = recording.recordedAt ? Date.parse(recording.recordedAt) || Date.now() - recording.durationMs : Date.now() - recording.durationMs;
  const elapsedMs = Math.max(1000, recording.durationMs || 60_000);
  const windowMs =
    elapsedMs <= 15 * 60_000 ? 3 * 60_000 : elapsedMs <= 60 * 60_000 ? 10 * 60_000 : 15 * 60_000;

  type Segment = {
    startMs: number;
    endMs: number;
    strokes: number;
    chats: number;
    slides: number[];
    contributors: string[];
    highlights: string[];
  };
  const segments = new Map<number, Segment>();
  const getSegment = (t: number) => {
    const clampedT = Math.max(0, Math.min(elapsedMs, t));
    const idx = Math.floor(clampedT / windowMs);
    let seg = segments.get(idx);
    if (!seg) {
      seg = {
        startMs: idx * windowMs,
        endMs: Math.min(elapsedMs, (idx + 1) * windowMs),
        strokes: 0,
        chats: 0,
        slides: [],
        contributors: [],
        highlights: [],
      };
      segments.set(idx, seg);
    }
    return seg;
  };

  const slideStats = new Map<number, { strokeCount: number; contributors: string[]; tools: string[] }>();
  const chat: ChatMessageRecord[] = [];
  const transcript: TranscriptEntry[] = [];
  const polls: StudioPoll[] = [];
  const questions: StudioQuestion[] = [];
  let maxSlideIndex = 0;

  for (let i = 0; i < (recording.events || []).length; i++) {
    const ev = recording.events[i];
    if (ev.type === 'stroke') {
      const seg = getSegment(ev.t);
      seg.strokes += 1;
      const slide = Number(ev.data?.slideIndex ?? 0);
      if (slide > maxSlideIndex) maxSlideIndex = slide;
      if (!seg.slides.includes(slide)) seg.slides.push(slide);
      const who = String(ev.data?.userName || '');
      if (who && !seg.contributors.includes(who)) seg.contributors.push(who);

      const entry = slideStats.get(slide) || { strokeCount: 0, contributors: [], tools: [] };
      entry.strokeCount += 1;
      if (who && !entry.contributors.includes(who)) entry.contributors.push(who);
      const tool = String(ev.data?.tool || '');
      if (tool && !entry.tools.includes(tool)) entry.tools.push(tool);
      slideStats.set(slide, entry);
    } else if (ev.type === 'chat' && ev.data) {
      const seg = getSegment(ev.t);
      seg.chats += 1;
      const msg: ChatMessageRecord = {
        id: String(ev.data.id || `chat_${i}`),
        roomId: recording.roomId,
        userId: String(ev.data.userId || ''),
        senderName: sanitizeDisplayText(ev.data.senderName, 48) || 'Participant',
        senderRole: ev.data.senderRole === 'lecturer' ? 'lecturer' : 'student',
        text: sanitizeMultilineText(ev.data.text, 1000),
        timestamp: startTime + ev.t,
      };
      chat.push(msg);
      if (msg.senderRole === 'lecturer' && seg.highlights.length < 4 && msg.text) {
        seg.highlights.push(
          `${msg.senderName}: ${msg.text.length > 160 ? `${msg.text.slice(0, 157)}...` : msg.text}`
        );
      }
    } else if (ev.type === 'transcript' && ev.data?.text) {
      const seg = getSegment(ev.t);
      const tr: TranscriptEntry = {
        id: String(ev.data.id || `tr_${i}`),
        roomId: recording.roomId,
        speakerId: String(ev.data.speakerId || ''),
        speakerName: sanitizeDisplayText(ev.data.speakerName, 48) || 'Speaker',
        speakerRole: ev.data.speakerRole === 'lecturer' ? 'lecturer' : 'student',
        text: sanitizeMultilineText(ev.data.text, 600),
        timestamp: startTime + ev.t,
        offsetMs: ev.t,
      };
      transcript.push(tr);
      if (seg.highlights.length < 4) {
        seg.highlights.push(
          `[Spoken] ${tr.speakerName}: ${tr.text.length > 160 ? `${tr.text.slice(0, 157)}...` : tr.text}`
        );
      }
    } else if (ev.type === 'slide_change') {
      const seg = getSegment(ev.t);
      const slide = Number(ev.data?.slideIndex ?? 0);
      if (slide > maxSlideIndex) maxSlideIndex = slide;
      if (!seg.slides.includes(slide)) seg.slides.push(slide);
      if (seg.highlights.length < 4) seg.highlights.push(`Moved to board page ${slide + 1}`);
    } else if (ev.type === 'clear') {
      const seg = getSegment(ev.t);
      if (seg.highlights.length < 4) seg.highlights.push('Board was wiped');
    } else if (ev.type === 'poll' && ev.data) {
      polls.push(ev.data as StudioPoll);
    } else if (ev.type === 'question' && ev.data) {
      questions.push(ev.data as StudioQuestion);
    }
  }

  return {
    roomId: recording.roomId,
    title: recording.title,
    courseCode: recording.courseCode || '',
    courseId: recording.courseId,
    lecturerName: recording.lecturerName || 'Lecturer',
    isLive: false,
    sessionStartedAt: startTime,
    elapsedMs,
    participantCount: Math.max(1, recording.participantCount || 1),
    strokeCount: recording.strokeCount ?? slideStats.size,
    chatCount: recording.chatCount ?? chat.length,
    activeSlideIndex: maxSlideIndex,
    totalSlides: Math.max(1, maxSlideIndex + 1),
    segments: Array.from(segments.values()).sort((a, b) => a.startMs - b.startMs),
    slides: Array.from(slideStats.entries())
      .map(([slideIndex, v]) => ({ slideIndex, ...v }))
      .sort((a, b) => a.slideIndex - b.slideIndex),
    lecturerMessages: chat.filter((m) => m.senderRole === 'lecturer').slice(-8),
    recentMessages: chat.slice(-15),
    transcript: transcript.slice(-80),
    polls: polls.slice(0, 10),
    questions: questions.slice(0, 15),
    courseContext: undefined,
  };
};

const buildSessionPromptContext = (catchUp: ReturnType<typeof buildCatchUp>): string => {
  const lines: string[] = [];
  lines.push(`SESSION METADATA (From 00:00 to ${formatMsTimestamp(catchUp.elapsedMs)}):`);
  lines.push(`- Room ID: ${catchUp.roomId}`);
  lines.push(`- Lecture / Studio Title: ${catchUp.title}`);
  if (catchUp.courseCode) lines.push(`- Course Code: ${catchUp.courseCode}`);
  if (catchUp.lecturerName) lines.push(`- Lecturer / Host: ${catchUp.lecturerName}`);
  lines.push(`- Elapsed Time Since Start: ${formatMsTimestamp(catchUp.elapsedMs)} (${Math.round(catchUp.elapsedMs / 1000)}s)`);
  lines.push(`- Active Participants: ${catchUp.participantCount}`);
  lines.push(`- Chalkboard State: Currently on Slide ${catchUp.activeSlideIndex + 1} of ${catchUp.totalSlides} (${catchUp.strokeCount} total vector strokes)`);

  if (catchUp.courseContext) {
    const cc = catchUp.courseContext;
    lines.push(`\nCOURSE ACADEMIC CONTEXT:`);
    if (cc.department) lines.push(`- Department: ${cc.department}`);
    if (cc.subject) lines.push(`- Subject: ${cc.subject}`);
    if (Array.isArray(cc.topics) && cc.topics.length > 0) {
      lines.push(`- Syllabus / Course Modules: ${cc.topics.slice(0, 6).join(' | ')}`);
    }
    if (Array.isArray(cc.recentAnnouncements) && cc.recentAnnouncements.length > 0) {
      lines.push(`- Recent Lecturer Announcements: ${cc.recentAnnouncements.slice(0, 3).join(' // ')}`);
    }
    if (Array.isArray(cc.assignments) && cc.assignments.length > 0) {
      lines.push(`- Related Classwork / Problem Sets: ${cc.assignments.slice(0, 3).join(' | ')}`);
    }
  }

  if (catchUp.slides.length > 0) {
    lines.push(`\nCHALKBOARD SLIDE ACTIVITY (00:00 -> ${formatMsTimestamp(catchUp.elapsedMs)}):`);
    for (const s of catchUp.slides) {
      const toolsInfo = (s as any).tools?.length ? ` using tools [${(s as any).tools.join(', ')}]` : '';
      const whoInfo = s.contributors.length ? ` by ${s.contributors.join(', ')}` : '';
      lines.push(`- Slide ${s.slideIndex + 1}: ${s.strokeCount} vector strokes${toolsInfo}${whoInfo}`);
    }
  }

  if (catchUp.segments.length > 0) {
    lines.push(`\nTIME-WINDOWED TELEMETRY SEGMENTS:`);
    for (const seg of catchUp.segments) {
      const range = `${formatMsTimestamp(seg.startMs)} - ${formatMsTimestamp(seg.endMs)}`;
      const slidesText = seg.slides.length ? `Slides [${seg.slides.map((n) => n + 1).join(', ')}]` : 'No board strokes';
      const highlightsText = seg.highlights.length ? ` | Highlights: ${seg.highlights.join('; ')}` : '';
      lines.push(`- [${range}] ${seg.strokes} strokes on ${slidesText}, ${seg.chats} chat msgs${highlightsText}`);
    }
  }

  if (catchUp.transcript.length > 0) {
    lines.push(`\nLIVE SPEECH TRANSCRIPT (00:00 -> ${formatMsTimestamp(catchUp.elapsedMs)}):`);
    for (const tr of catchUp.transcript) {
      lines.push(`- [${formatMsTimestamp(tr.offsetMs)}] ${tr.speakerName} (${tr.speakerRole}): "${tr.text}"`);
    }
  } else {
    lines.push(`\nLIVE SPEECH TRANSCRIPT: No spoken transcript segments recorded yet.`);
  }

  if (catchUp.recentMessages.length > 0) {
    lines.push(`\nIN-CALL CHAT MESSAGES (00:00 -> ${formatMsTimestamp(catchUp.elapsedMs)}):`);
    for (const m of catchUp.recentMessages) {
      const relMs = typeof m.timestamp === 'number' ? Math.max(0, m.timestamp - catchUp.sessionStartedAt) : 0;
      lines.push(`- [${formatMsTimestamp(relMs)}] ${m.senderName} (${m.senderRole}): "${m.text}"`);
    }
  }

  if (catchUp.polls.length > 0) {
    lines.push(`\nLIVE POLLS IN SESSION:`);
    for (const p of catchUp.polls) {
      const opts = (p.options || []).map((o) => `${o.text} (${o.votes} votes)`).join(', ');
      lines.push(`- Poll (${p.isOpen ? 'OPEN' : 'CLOSED'}): "${p.question}" -> Options: ${opts}`);
    }
  }

  if (catchUp.questions.length > 0) {
    lines.push(`\nSTUDENT Q&A QUESTIONS IN SESSION:`);
    for (const q of catchUp.questions) {
      lines.push(
        `- Q&A by ${q.authorName} (${q.upvotes?.length || 0} upvotes, ${q.isAnswered ? 'ANSWERED' : 'OPEN'}): "${q.text}"`
      );
    }
  }

  return lines.join('\n');
};

const hasSessionActivity = (catchUp: ReturnType<typeof buildCatchUp>): boolean =>
  catchUp.strokeCount > 0 ||
  catchUp.chatCount > 0 ||
  catchUp.transcript.length > 0 ||
  catchUp.polls.length > 0 ||
  catchUp.questions.length > 0;

const callGeminiCatchUp = async (
  catchUp: ReturnType<typeof buildCatchUp>,
  overrideApiKey?: string
): Promise<{ aiSummary?: AiCatchUpSummary; aiError?: string; aiErrorCode?: string }> => {
  if (!hasSessionActivity(catchUp)) {
    return {
      aiSummary: {
        overview: 'Nothing has been said or done in this studio session yet.',
        takeaways: [],
        walkthrough: [],
        keyConceptsOrFormulas: [],
        generatedAtIso: new Date().toISOString(),
        isEmptySession: true,
      },
    };
  }

  const apiKey = (overrideApiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      aiErrorCode: 'GEMINI_API_KEY_MISSING',
      aiError:
        'AI API key is not configured on the backend server. Add your API key on the server (or paste your key below) to generate session summaries.',
    };
  }
  if (overrideApiKey && overrideApiKey.trim()) {
    process.env.GEMINI_API_KEY = overrideApiKey.trim();
  }

  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  const sessionContext = buildSessionPromptContext(catchUp);
  const currentElapsedStr = formatMsTimestamp(catchUp.elapsedMs);

  const systemInstruction = `You are Chalk AI, an academic pedagogical assistant embedded inside a live university virtual classroom ("Chalk Studio").
A student or participant just clicked the "Catch Me Up!" button at elapsed timestamp ${currentElapsedStr} (measuring from 00:00 when the studio session started).
Your job is to synthesize a clear, accurate, academically rigorous summary of everything that has happened in the studio session from 00:00 up to ${currentElapsedStr} based on the provided live session log (speech transcript, chalkboard vector activity & slides, lecturer chat notices, student Q&A, polls, and course context).
Return ONLY valid JSON matching the requested schema:
- "overview": A cohesive 2-4 sentence executive briefing explaining what the session is covering and what has taken place from 00:00 up to ${currentElapsedStr}.
- "takeaways": An array of 3 to 5 concise, high-signal bullet points summarizing the core concepts, board annotations, notices, or discussions covered so far.
- "walkthrough": An array of chronological phases covering 00:00 to ${currentElapsedStr}, each with "timeRange" (e.g. "00:00 - 02:15"), "title", "summary", and optional "slideIndex" (0-based integer).
- "keyConceptsOrFormulas": An array of 2 to 5 key academic terms, invariants, equations, or action items relevant to the session so far.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate the "Catch Me Up!" live session summary from 00:00 to ${currentElapsedStr} for the following studio session:\n\n${sessionContext}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              overview: { type: 'STRING' },
              takeaways: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              walkthrough: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    timeRange: { type: 'STRING' },
                    title: { type: 'STRING' },
                    summary: { type: 'STRING' },
                    slideIndex: { type: 'INTEGER' },
                  },
                  required: ['timeRange', 'title', 'summary'],
                },
              },
              keyConceptsOrFormulas: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['overview', 'takeaways', 'walkthrough', 'keyConceptsOrFormulas'],
          },
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.warn(`[Chalk AI] Model ${model} returned HTTP ${response.status}:`, errBody);
      return {
        aiErrorCode: `AI_HTTP_${response.status}`,
        aiError: `AI service returned HTTP ${response.status}.`,
      };
    }

    const json = (await response.json()) as any;
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      return {
        aiErrorCode: 'AI_EMPTY_RESPONSE',
        aiError: 'AI service returned an empty summary response.',
      };
    }

    const parsed = JSON.parse(rawText);
    const aiSummary: AiCatchUpSummary = {
      overview: sanitizeMultilineText(parsed.overview, 1500) || 'Session summary generated.',
      takeaways: Array.isArray(parsed.takeaways)
        ? parsed.takeaways.map((t: unknown) => sanitizeMultilineText(t, 500)).filter(Boolean).slice(0, 8)
        : [],
      walkthrough: Array.isArray(parsed.walkthrough)
        ? parsed.walkthrough.slice(0, 8).map((w: any) => ({
            timeRange: sanitizeDisplayText(w?.timeRange, 32) || `00:00 - ${currentElapsedStr}`,
            title: sanitizeDisplayText(w?.title, 120) || 'Session Activity',
            summary: sanitizeMultilineText(w?.summary, 800) || '',
            ...(typeof w?.slideIndex === 'number' && w.slideIndex >= 0
              ? { slideIndex: w.slideIndex }
              : {}),
          }))
        : [],
      keyConceptsOrFormulas: Array.isArray(parsed.keyConceptsOrFormulas)
        ? parsed.keyConceptsOrFormulas
            .map((k: unknown) => sanitizeDisplayText(k, 160))
            .filter(Boolean)
            .slice(0, 8)
        : [],
      generatedAtIso: new Date().toISOString(),
    };

    return { aiSummary };
  } catch (err: any) {
    console.warn(`[Chalk AI] Exception during Catch Me Up:`, err?.message || err);
    return {
      aiErrorCode: 'AI_REQUEST_FAILED',
      aiError: 'Failed to reach the AI service. Check network connectivity.',
    };
  }
};

const callGeminiFollowUp = async (
  catchUp: ReturnType<typeof buildCatchUp>,
  question: string,
  history: { role: 'user' | 'assistant'; text: string }[] = [],
  overrideApiKey?: string
): Promise<{ answer?: string; error?: string; errorCode?: string }> => {
  if (!hasSessionActivity(catchUp)) {
    return {
      answer:
        'Nothing has been said or done in this studio session yet, so there is no session activity to answer questions from.',
    };
  }

  const apiKey = (overrideApiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      errorCode: 'GEMINI_API_KEY_MISSING',
      error: 'AI API key is not configured on the backend server.',
    };
  }
  if (overrideApiKey && overrideApiKey.trim()) {
    process.env.GEMINI_API_KEY = overrideApiKey.trim();
  }

  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  const sessionContext = buildSessionPromptContext(catchUp);
  const currentElapsedStr = formatMsTimestamp(catchUp.elapsedMs);

  const systemInstruction = `You are Chalk AI, the live in-class pedagogical assistant for "${catchUp.title}" (${catchUp.courseCode || catchUp.roomId}).
Answer the student's follow-up question clearly and concisely (in 2-5 sentences or bullet points) based on everything that has happened in the studio session from 00:00 up to ${currentElapsedStr}, as well as the academic subject matter of the course.

LIVE STUDIO CONTEXT (00:00 -> ${currentElapsedStr}):
${sessionContext}`;

  const contents = [
    ...history.slice(-6).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: sanitizeMultilineText(h.text, 1000) }],
    })),
    {
      role: 'user',
      parts: [{ text: sanitizeMultilineText(question, 600) }],
    },
  ];

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.35,
        },
      }),
    });

    if (!response.ok) {
      return {
        errorCode: `AI_HTTP_${response.status}`,
        error: `AI service returned HTTP ${response.status}.`,
      };
    }

    const json = (await response.json()) as any;
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      return {
        errorCode: 'AI_EMPTY_RESPONSE',
        error: 'AI service returned an empty answer.',
      };
    }
    return { answer: rawText.trim() };
  } catch {
    return {
      errorCode: 'AI_REQUEST_FAILED',
      error: 'Failed to reach the AI service.',
    };
  }
};

export interface GenerateFlashcardsPayload {
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  department?: string;
  topics?: string[];
  notes?: string;
  materials?: Array<{ title: string; description?: string; type?: string; attachments?: any[] }>;
  announcements?: string[];
  transcripts?: string[];
  userPrompt?: string;
  count?: number;
  geminiApiKey?: string;
}

const buildFlashcardsPromptContext = (payload: GenerateFlashcardsPayload): string => {
  const lines: string[] = [];
  lines.push('=== COURSE ACADEMIC INFORMATION ===');
  lines.push(`Course Identifier: ${payload.courseCode || payload.courseId}`);
  if (payload.courseTitle) lines.push(`Title: ${payload.courseTitle}`);
  if (payload.department) lines.push(`Department: ${payload.department}`);

  if (Array.isArray(payload.topics) && payload.topics.length > 0) {
    lines.push('\n=== SYLLABUS MODULES & TOPICS ===');
    payload.topics.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }

  if (payload.notes && payload.notes.trim()) {
    lines.push('\n=== COURSE LECTURE NOTES & DERIVATIONS ===');
    lines.push(payload.notes.trim().slice(0, 16_000));
  }

  if (Array.isArray(payload.materials) && payload.materials.length > 0) {
    lines.push('\n=== COURSE CLASSWORK, REFERENCE MATERIALS & ASSIGNMENTS ===');
    payload.materials.slice(0, 12).forEach((m, idx) => {
      lines.push(`${idx + 1}. [${m.type || 'material'}] ${m.title}`);
      if (m.description) lines.push(`   Description: ${m.description.slice(0, 500)}`);
    });
  }

  if (Array.isArray(payload.announcements) && payload.announcements.length > 0) {
    lines.push('\n=== LECTURER ANNOUNCEMENTS & STREAM NOTICES ===');
    payload.announcements.slice(0, 8).forEach((a) => lines.push(`- ${a}`));
  }

  if (Array.isArray(payload.transcripts) && payload.transcripts.length > 0) {
    lines.push('\n=== RECENT LECTURE TRANSCRIPT EXCERPTS ===');
    payload.transcripts.slice(0, 8).forEach((tr) => lines.push(`- ${tr}`));
  }

  if (payload.userPrompt && payload.userPrompt.trim()) {
    lines.push('\n=== STUDENT FOCUS / SPECIFIC INSTRUCTION ===');
    lines.push(`Please prioritize the following concept or exam focus: "${payload.userPrompt.trim()}".`);
  }

  return lines.join('\n');
};

const callGeminiGenerateFlashcards = async (
  payload: GenerateFlashcardsPayload,
  overrideApiKey?: string
): Promise<{
  flashcards?: FlashcardItem[];
  error?: string;
  errorCode?: string;
  modelUsed?: string;
}> => {
  const apiKey = (overrideApiKey || payload.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      errorCode: 'GEMINI_API_KEY_MISSING',
      error:
        'GEMINI_API_KEY is not configured on the backend server. Add GEMINI_API_KEY to apps/node_backend/.env (or enter your key in the prompt) to generate live flashcards with Gemini AI.',
    };
  }
  if (overrideApiKey && overrideApiKey.trim()) {
    process.env.GEMINI_API_KEY = overrideApiKey.trim();
  }

  const requestedCount = Math.min(25, Math.max(3, payload.count || 6));
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  const contextText = buildFlashcardsPromptContext(payload);
  const systemInstruction = `You are Chalk AI, an elite university pedagogy expert specializing in spaced repetition and active recall.
Your job is to generate exactly ${requestedCount} high-yield, academically rigorous study flashcards for university students enrolled in:
"${payload.courseTitle || payload.courseCode || 'University Course'}" (${payload.courseCode || payload.courseId}).

IMPORTANT GUIDELINES:
1. Base the flashcards directly on the provided course material (lecture notes, syllabus modules, classwork materials, assignments, lecturer announcements, and transcripts).
2. Avoid generic or trivial trivia. Formulate deep, testable questions covering definitions, edge cases, theorems, formulas, algorithmic invariants, and conceptual trade-offs.
3. Every card must have:
   - "topic": A concise module or topic name (e.g. "Graph Invariants", "Memory Layout", "Parsing").
   - "front": An engaging, unambiguous prompt or question requiring active recall (e.g., "Why does...", "State the invariant...", "Compare X and Y in terms of...").
   - "back": A clear, accurate, and comprehensive explanation or derivation answering the question. You may include concise markdown formulas or bullet points where appropriate.
   - "hint": A brief, helpful clue or mnemonic to assist recall without giving away the full answer.
4. Return ONLY valid JSON matching the schema with a "flashcards" array.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate ${requestedCount} active-recall study flashcards based on the following course materials:\n\n${contextText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              flashcards: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    topic: { type: 'STRING' },
                    front: { type: 'STRING' },
                    back: { type: 'STRING' },
                    hint: { type: 'STRING' },
                  },
                  required: ['topic', 'front', 'back'],
                },
              },
            },
            required: ['flashcards'],
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[Chalk AI Flashcards] Model ${model} returned HTTP ${response.status}: ${errText.slice(0, 160)}`);
      return {
        errorCode: 'GEMINI_API_ERROR',
        error: `AI service returned HTTP ${response.status}. Please verify your API key.`,
      };
    }

    const json = (await response.json()) as any;
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      return {
        errorCode: 'GEMINI_EMPTY_RESPONSE',
        error: 'AI service returned an empty response.',
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.flashcards)
        ? parsed.flashcards
        : [];

    const now = Date.now();
    const flashcards: FlashcardItem[] = rawList
      .map((c: any, idx: number) => ({
        id: `fc_ai_${now}_${idx + 1}`,
        courseId: payload.courseId,
        topic: sanitizeDisplayText(c?.topic, 80) || payload.courseCode || 'Core Concept',
        front: sanitizeMultilineText(c?.front, 600) || '',
        back: sanitizeMultilineText(c?.back, 2000) || '',
        hint: sanitizeDisplayText(c?.hint, 300) || undefined,
      }))
      .filter((c: FlashcardItem) => c.front && c.back);

    if (flashcards.length > 0) {
      return { flashcards };
    }
  } catch (err: any) {
    console.warn(`[Chalk AI Flashcards] Exception testing ${model}:`, err?.message);
  }

  return {
    errorCode: 'GEMINI_REQUEST_FAILED',
    error: 'Failed to generate flashcards. Please check network connectivity and your API key.',
  };
};

const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const summarizeSamples = (samples: QosSample[]) => {
  const rtts = samples.map((s) => s.rttMs).filter((v): v is number => typeof v === 'number');
  const losses = samples
    .map((s) => s.packetLoss)
    .filter((v): v is number => typeof v === 'number');
  const r = (v: number | null, d = 1) => (v === null ? null : roundTo(v, d));
  return {
    samples: samples.length,
    avgRttMs: r(avg(rtts), 0),
    p95RttMs: r(percentile(rtts, 95), 0),
    avgPacketLoss: r(avg(losses), 2),
    avgAudioKbps: r(avg(samples.map((s) => s.audioKbps))),
    avgVideoKbps: r(avg(samples.map((s) => s.videoKbps))),
    avgTelemetryKbps: r(avg(samples.map((s) => s.telemetryKbps)), 2),
    avgTotalKbps: r(avg(samples.map((s) => s.totalKbps))),
  };
};

const toCourseMember = (user: FirebaseUserPayload) => ({
  id: user.uid,
  name: sanitizeDisplayText(user.name || 'Campus User', 64),
  avatarTag: sanitizeDisplayText(user.avatarTag || deriveInitials(user.name || ''), 4),
  role: user.role,
  matricOrStaffId: sanitizeDisplayText(user.matricOrStaffId || '', 40),
});

const notesDocId = (uid: string, courseId: string) =>
  `n${crypto.createHash('sha1').update(`${uid}|${courseId}`).digest('hex')}`;

// LiveKit WebRTC SFU Configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

// --- REST Endpoints ---

app.get('/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'Chalk Crisis-Resilient Virtual Classroom',
    version: '1.2.0',
    security: 'hardened',
    capabilities: {
      firestoreCatalog: true,
      meetings: true,
      webrtcSignaling: true,
      livekit: true,
    },
    livekit: {
      url: LIVEKIT_URL,
      configured: Boolean(process.env.LIVEKIT_URL || process.env.LIVEKIT_API_KEY),
    },
    activeRooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// LiveKit WebRTC SFU Access Token & Configuration Endpoints
app.get('/api/livekit/config', (_req, res) => {
  res.json({
    url: LIVEKIT_URL,
    configured: Boolean(process.env.LIVEKIT_URL || process.env.LIVEKIT_API_KEY),
  });
});

app.post('/api/livekit/token', strictMutationLimiter, async (req: Request, res: Response) => {
  try {
    const rawRoom = req.body?.roomName || req.body?.room || req.body?.roomId;
    const roomName = sanitizeRoomOrEntityId(rawRoom) || 'default-room';

    let identity = '';
    let name = '';
    let role: 'student' | 'lecturer' = 'student';
    let avatarTag = '';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = await verifyFirebaseIdToken(token);
      if (verified) {
        identity = verified.uid;
        name = verified.name || 'Campus User';
        role = verified.role === 'lecturer' ? 'lecturer' : 'student';
        avatarTag = verified.avatarTag || deriveInitials(name);
      }
    }

    if (!identity) {
      identity =
        sanitizeRoomOrEntityId(req.body?.identity) ||
        `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      name = sanitizeDisplayText(req.body?.name, 48) || 'Campus Guest';
      role = req.body?.role === 'lecturer' ? 'lecturer' : 'student';
      avatarTag = sanitizeDisplayText(req.body?.avatarTag, 4) || deriveInitials(name);
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      metadata: JSON.stringify({
        role,
        avatarTag,
        socketId: req.body?.socketId || '',
        userId: identity,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwtToken = await at.toJwt();

    res.json({
      success: true,
      token: jwtToken,
      url: LIVEKIT_URL,
      roomName,
      identity,
      name,
      role,
      avatarTag,
    });
  } catch (err) {
    console.error('[LiveKit Server] Error generating token:', err);
    res.status(500).json({ error: 'Failed to generate LiveKit token' });
  }
});

app.get('/api/livekit/token', async (req: Request, res: Response) => {
  try {
    const roomName = sanitizeRoomOrEntityId(req.query.room as string) || 'default-room';
    const identity =
      sanitizeRoomOrEntityId(req.query.identity as string) ||
      `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const name = sanitizeDisplayText(req.query.name as string, 48) || 'Campus Guest';
    const role: 'student' | 'lecturer' = req.query.role === 'lecturer' ? 'lecturer' : 'student';
    const avatarTag = sanitizeDisplayText(req.query.avatarTag as string, 4) || deriveInitials(name);

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      metadata: JSON.stringify({
        role,
        avatarTag,
        socketId: req.body?.socketId || '',
        userId: identity,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwtToken = await at.toJwt();

    res.json({
      success: true,
      token: jwtToken,
      url: LIVEKIT_URL,
      roomName,
      identity,
      name,
      role,
      avatarTag,
    });
  } catch (err) {
    console.error('[LiveKit Server] Error generating token:', err);
    res.status(500).json({ error: 'Failed to generate LiveKit token' });
  }
});

// 1. Firebase Google Auth Verification & User Provisioning Endpoint
app.post('/api/auth/verify', strictMutationLimiter, async (req, res) => {
  const idToken =
    typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
  if (!idToken) {
    res.status(400).json({ error: 'Missing idToken' });
    return;
  }
  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser) {
    res.status(401).json({
      error: 'Invalid, expired, or non-Google Firebase ID token',
    });
    return;
  }

  const existingDoc = getFirestoreDocument('users', verifiedUser.uid);
  const existingMatric =
    typeof existingDoc?.matricOrStaffId === 'string'
      ? existingDoc.matricOrStaffId.trim()
      : '';
  const isExistingComplete = Boolean(
    existingDoc?.isProfileComplete || Boolean(existingMatric)
  );
  const reqMatric =
    typeof req.body?.matricOrStaffId === 'string'
      ? req.body.matricOrStaffId.trim()
      : '';
  const isProfileComplete = Boolean(
    isExistingComplete ||
      req.body?.isProfileComplete === true ||
      Boolean(reqMatric)
  );
  const isNewUser = !isProfileComplete;

  const savedProfile = await saveUserToFirestore(verifiedUser.uid, {
    name: req.body?.name || existingDoc?.name || verifiedUser.name,
    email: verifiedUser.email || req.body?.email || existingDoc?.email,
    role: existingDoc?.role || req.body?.role || verifiedUser.role,
    department: existingDoc?.department || req.body?.department || verifiedUser.department,
    matricOrStaffId: existingMatric || reqMatric || verifiedUser.matricOrStaffId,
    avatarTag: existingDoc?.avatarTag || req.body?.avatarTag || verifiedUser.avatarTag,
    isProfileComplete,
  });

  res.json({
    success: true,
    user: savedProfile || verifiedUser,
    isNewUser,
  });
});

// 2. Authenticated User Profile Endpoints (Firestore `users/{uid}`)
app.get(
  '/api/users/me',
  requireFirebaseAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const verifiedUser = req.user;
    if (!verifiedUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const profile = getFirestoreDocument('users', verifiedUser.uid) || verifiedUser;
    res.json({ user: profile });
  }
);

app.post(
  '/api/users/profile',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const verifiedUser = req.user;
    if (!verifiedUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const saved = await saveUserToFirestore(verifiedUser.uid, {
      ...req.body,
      email: verifiedUser.email || req.body?.email,
      isProfileComplete: true,
    });

    if (!saved) {
      res.status(500).json({ error: 'Failed to persist user profile to Firestore' });
      return;
    }

    res.json({ success: true, user: saved });
  }
);

const MOCK_COURSE_IDS = new Set<string>();
const MOCK_ANN_IDS = new Set<string>();
const MOCK_ASG_IDS = new Set<string>();

// 3. Protected Courses Endpoints (Firestore `courses/{id}`)
app.get('/api/courses', requireFirebaseAuth, async (_req, res) => {
  const allCourses = await listFirestoreCollection('courses');
  const courses = allCourses.filter(
    (c) => typeof c.id === 'string' && !MOCK_COURSE_IDS.has(c.id)
  );
  res.json({ courses });
});

app.post(
  '/api/courses',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const isClientLecturer =
      req.user?.role === 'lecturer' || req.body?.role === 'lecturer';
    if (!req.user || !isClientLecturer) {
      res.status(403).json({ error: 'Only lecturers can create courses' });
      return;
    }

    if (req.user.role !== 'lecturer') {
      req.user.role = 'lecturer';
      await saveUserToFirestore(req.user.uid, {
        name: req.body?.lecturerName || req.user.name,
        email: req.user.email,
        role: 'lecturer',
        department: req.body?.department || req.user.department,
        isProfileComplete: true,
      });
    }

    const code = sanitizeDisplayText(req.body?.code, 16).toUpperCase();
    const title = sanitizeDisplayText(req.body?.title, 96);
    const scheduleTime =
      sanitizeDisplayText(req.body?.scheduleTime, 64) || 'Schedule to be announced';
    const department =
      sanitizeDisplayText(req.body?.department, 80) || req.user.department || 'General';
    const section = sanitizeDisplayText(req.body?.section, 48);
    const room = sanitizeDisplayText(req.body?.room, 48);
    const subject = sanitizeDisplayText(req.body?.subject, 64);

    if (!code || !title) {
      res.status(400).json({ error: 'Course code and title are required' });
      return;
    }

    const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '') || 'course';
    const id =
      sanitizeRoomOrEntityId(req.body?.id) ||
      `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    const liveRoomCode =
      sanitizeRoomOrEntityId(req.body?.liveRoomCode) ||
      `${slug}-${crypto.randomBytes(3).toString('hex')}`;

    const lecturerId =
      sanitizeUserId(req.body?.lecturerId) || req.user.uid;
    const lecturerName =
      sanitizeDisplayText(req.body?.lecturerName, 64) ||
      req.user.name ||
      'Lecturer';

    const existing = getFirestoreDocument('courses', id);
    const existingMemberIds = Array.isArray(existing?.memberIds)
      ? (existing.memberIds as string[])
      : Array.isArray(req.body?.memberIds)
        ? (req.body.memberIds as string[])
        : [];
    const lecturerMember = toCourseMember({
      ...req.user,
      uid: lecturerId,
      name: lecturerName,
      role: 'lecturer',
    });
    const existingMembers = Array.isArray(existing?.members)
      ? (existing.members as Record<string, unknown>[])
      : Array.isArray(req.body?.members)
        ? (req.body.members as Record<string, unknown>[])
        : [lecturerMember];
    const hasLecturerInMembers = existingMembers.some(
      (m) => String(m?.id || '').toLowerCase() === lecturerId.toLowerCase()
    );
    const mergedMembers = hasLecturerInMembers
      ? existingMembers
      : [lecturerMember, ...existingMembers];

    const courseData: Record<string, unknown> = {
      id,
      code,
      title,
      lecturerName,
      lecturerId,
      accentHex: sanitizeDisplayText(req.body?.accentHex, 12) || '#059669',
      hasLiveSession: true,
      liveRoomCode,
      enrolledCount:
        typeof existing?.enrolledCount === 'number'
          ? existing.enrolledCount
          : existingMemberIds.length,
      memberIds: existingMemberIds,
      members: mergedMembers,
      scheduleTime,
      department,
      ...(section ? { section } : {}),
      ...(room ? { room } : {}),
      ...(subject ? { subject } : {}),
      isArchived: Boolean(req.body?.isArchived ?? existing?.isArchived ?? false),
    };

    const saved = await upsertFirestoreDocument('courses', id, courseData);
    res.status(201).json({ success: true, course: saved });
  }
);

app.patch(
  '/api/courses/:courseId/settings',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const courseId = sanitizeRoomOrEntityId(req.params.courseId);
    if (!courseId || !req.user) {
      res.status(400).json({ error: 'Valid courseId is required' });
      return;
    }
    const existing = getFirestoreDocument('courses', courseId);
    if (!existing) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (typeof req.body?.title === 'string' && req.body.title.trim()) {
      updates.title = sanitizeDisplayText(req.body.title, 96);
    }
    if (typeof req.body?.scheduleTime === 'string') {
      updates.scheduleTime = sanitizeDisplayText(req.body.scheduleTime, 64);
    }
    if (typeof req.body?.section === 'string') {
      updates.section = sanitizeDisplayText(req.body.section, 48);
    }
    if (typeof req.body?.room === 'string') {
      updates.room = sanitizeDisplayText(req.body.room, 48);
    }
    if (typeof req.body?.subject === 'string') {
      updates.subject = sanitizeDisplayText(req.body.subject, 64);
    }
    if (typeof req.body?.themeColor === 'string') {
      updates.themeColor = sanitizeDisplayText(req.body.themeColor, 16);
      updates.accentHex = updates.themeColor;
    }
    if (typeof req.body?.isArchived === 'boolean') {
      updates.isArchived = req.body.isArchived;
    }
    if (Array.isArray(req.body?.memberIds)) {
      updates.memberIds = req.body.memberIds;
    }
    if (Array.isArray(req.body?.members)) {
      updates.members = req.body.members;
    }
    if (typeof req.body?.enrolledCount === 'number') {
      updates.enrolledCount = req.body.enrolledCount;
    }

    const saved = await upsertFirestoreDocument('courses', courseId, {
      ...existing,
      ...updates,
    });
    res.json({ success: true, course: saved });
  }
);

app.delete(
  '/api/courses/:courseId',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const courseId = sanitizeRoomOrEntityId(req.params.courseId);
    if (!courseId || !req.user) {
      res.status(400).json({ error: 'Valid courseId is required' });
      return;
    }
    await deleteFirestoreDocument('courses', courseId);

    // Also clean up announcements and assignments associated with the deleted course
    const [allAnns, allAsgs] = await Promise.all([
      listFirestoreCollection('announcements'),
      listFirestoreCollection('assignments'),
    ]);
    for (const ann of allAnns) {
      if (String(ann.courseId || '').toLowerCase() === courseId.toLowerCase() && typeof ann.id === 'string') {
        await deleteFirestoreDocument('announcements', ann.id);
      }
    }
    for (const asg of allAsgs) {
      if (String(asg.courseId || '').toLowerCase() === courseId.toLowerCase() && typeof asg.id === 'string') {
        await deleteFirestoreDocument('assignments', asg.id);
      }
    }

    res.json({ success: true });
  }
);

app.post(
  '/api/courses/join',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const rawCode = sanitizeDisplayText(req.body?.code, 48);
    if (!rawCode || !req.user) {
      res.status(400).json({ error: 'Course code is required' });
      return;
    }

    const normalized = rawCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const allCourses = await listFirestoreCollection('courses');
    // Sort active (non-archived) and most recently updated courses first
    const sortedCourses = [...allCourses].sort((a, b) => {
      const aArch = a.isArchived ? 1 : 0;
      const bArch = b.isArchived ? 1 : 0;
      if (aArch !== bArch) return aArch - bArch;
      const aTime = String(a.updatedAt || '');
      const bTime = String(b.updatedAt || '');
      return bTime.localeCompare(aTime);
    });

    const matched =
      sortedCourses.find(
        (c) =>
          String(c.id).toLowerCase() === rawCode.toLowerCase() ||
          String(c.liveRoomCode).toLowerCase() === rawCode.toLowerCase()
      ) ||
      sortedCourses.find(
        (c) =>
          String(c.code).toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
      );

    if (!matched) {
      res.status(404).json({ error: 'No course matches that code' });
      return;
    }

    const studentId = sanitizeUserId(req.body?.studentId) || req.user.uid;
    const studentName =
      sanitizeDisplayText(req.body?.studentName, 64) ||
      req.user.name ||
      'Campus Student';
    const studentAvatar =
      sanitizeDisplayText(req.body?.avatarTag, 4) ||
      req.user.avatarTag ||
      deriveInitials(studentName);
    const studentMatric =
      sanitizeDisplayText(req.body?.matricOrStaffId, 40) ||
      req.user.matricOrStaffId ||
      '';

    const memberIds = Array.isArray(matched.memberIds)
      ? (matched.memberIds as string[])
      : [];
    const members = Array.isArray(matched.members)
      ? (matched.members as Record<string, unknown>[])
      : [];

    const alreadyInMemberIds = memberIds.some(
      (id) => String(id).toLowerCase() === studentId.toLowerCase()
    );
    const alreadyInMembers = members.some(
      (m) =>
        String(m?.id || '').toLowerCase() === studentId.toLowerCase() &&
        m?.role === 'student'
    );

    if (alreadyInMemberIds && alreadyInMembers) {
      res.json({ success: true, course: matched });
      return;
    }

    const nextMemberIds = alreadyInMemberIds
      ? memberIds
      : [...memberIds, studentId];
    const studentMemberObj = {
      id: studentId,
      name: studentName,
      avatarTag: studentAvatar,
      role: 'student',
      matricOrStaffId: studentMatric,
    };
    const nextMembers = alreadyInMembers
      ? members
      : [...members, studentMemberObj];

    const studentCount = nextMembers.filter((m) => m?.role === 'student').length;

    const updated = await upsertFirestoreDocument('courses', String(matched.id), {
      ...matched,
      memberIds: nextMemberIds,
      members: nextMembers,
      enrolledCount: Math.max(nextMemberIds.length, studentCount),
    });

    res.json({ success: true, course: updated });
  }
);

// 4. Protected Announcements Endpoints (Firestore `announcements/{id}`)
app.get('/api/announcements', requireFirebaseAuth, async (_req, res) => {
  const all = await listFirestoreCollection('announcements');
  const announcements = all.filter(
    (a) =>
      typeof a.id === 'string' &&
      !MOCK_ANN_IDS.has(a.id) &&
      typeof a.courseId === 'string' &&
      !MOCK_COURSE_IDS.has(a.courseId)
  );
  res.json({ announcements });
});

app.post(
  '/api/announcements',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const courseId = sanitizeRoomOrEntityId(req.body?.courseId);
    const content = sanitizeMultilineText(req.body?.content, 1000);
    if (!courseId || !content) {
      res.status(400).json({ error: 'Valid courseId and content are required' });
      return;
    }

    const annId =
      sanitizeRoomOrEntityId(req.body?.id) || `ann_${Date.now()}`;
    const saved = await upsertFirestoreDocument('announcements', annId, {
      id: annId,
      courseId,
      authorName: req.user?.name || 'Campus User',
      authorRole: req.user?.role || 'student',
      timestamp: new Date().toISOString(),
      createdAtIso: new Date().toISOString(),
      content,
      isLiveNotice: Boolean(req.body?.isLiveNotice),
    });

    res.status(201).json({ success: true, announcement: saved });
  }
);

// 5. Protected Assignments Endpoints (Firestore `assignments/{id}`)
app.get('/api/assignments', requireFirebaseAuth, async (_req, res) => {
  const all = await listFirestoreCollection('assignments');
  const assignments = all.filter(
    (a) =>
      typeof a.id === 'string' &&
      !MOCK_ASG_IDS.has(a.id) &&
      typeof a.courseId === 'string' &&
      !MOCK_COURSE_IDS.has(a.courseId)
  );
  res.json({ assignments });
});

app.post(
  '/api/assignments',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user || req.user.role !== 'lecturer') {
      res.status(403).json({ error: 'Only lecturers can post assignments' });
      return;
    }
    const courseId = sanitizeRoomOrEntityId(req.body?.courseId);
    const title = sanitizeDisplayText(req.body?.title, 140);
    const description = sanitizeMultilineText(req.body?.description, 2000);
    const dueDate = sanitizeDisplayText(req.body?.dueDate, 64) || 'No due date';
    const points = sanitizeDisplayText(req.body?.points, 24) || 'Ungraded';
    if (!courseId || !title || !description) {
      res.status(400).json({ error: 'courseId, title and description are required' });
      return;
    }
    const id = sanitizeRoomOrEntityId(req.body?.id) || `asg_${Date.now()}`;
    const saved = await upsertFirestoreDocument('assignments', id, {
      id,
      courseId,
      title,
      description,
      dueDate,
      points,
      isSubmitted: false,
    });
    res.status(201).json({ success: true, assignment: saved });
  }
);

app.post(
  '/api/assignments/:assignmentId/submit',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const assignmentId = sanitizeRoomOrEntityId(req.params.assignmentId);
    if (!assignmentId) {
      res.status(400).json({ error: 'Invalid assignmentId' });
      return;
    }

    const existing = getFirestoreDocument('assignments', assignmentId);
    if (!existing) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const note =
      sanitizeDisplayText(req.body?.note, 400) || 'Submitted.';
    const updated = await upsertFirestoreDocument('assignments', assignmentId, {
      ...existing,
      isSubmitted: true,
      submissionNote: note,
      submittedBy: req.user?.uid,
      submittedAt: new Date().toISOString(),
    });

    res.json({ success: true, assignment: updated });
  }
);

// 6. Live Rooms, Catch-Up & Replays Endpoints
app.get('/api/rooms', (_req, res) => {
  res.json(
    Array.from(rooms.values())
      .filter((r) => r.participants.length > 0)
      .map(summarizeRoom)
  );
});

app.get('/api/rooms/:roomId', (req, res) => {
  const safeRoomId = sanitizeRoomOrEntityId(req.params.roomId);
  if (!safeRoomId) {
    res.status(400).json({ error: 'Invalid roomId parameter' });
    return;
  }
  const room = rooms.get(safeRoomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(summarizeRoom(room));
});

app.post('/api/rooms/:roomId/end', strictMutationLimiter, async (req: Request, res: Response) => {
  const safeRoomId = sanitizeRoomOrEntityId(req.params.roomId);
  if (!safeRoomId) {
    res.status(400).json({ error: 'Invalid roomId parameter' });
    return;
  }
  const room = rooms.get(safeRoomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found or already ended' });
    return;
  }
  const endedBy = sanitizeDisplayText(req.body?.endedBy, 48) || room.lecturerName || 'Lecturer';
  await endAndFinalizeRoom(safeRoomId, endedBy);
  res.json({ success: true, message: 'Studio session ended successfully' });
});

app.get('/api/rooms/:roomId/catch-up', async (req, res) => {
  const safeRoomId = sanitizeRoomOrEntityId(req.params.roomId);
  if (!safeRoomId) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }
  const room = rooms.get(safeRoomId);
  const catchUpBase = buildCatchUp(room, undefined, safeRoomId);
  const { aiSummary, aiError, aiErrorCode } = await callGeminiCatchUp(catchUpBase);
  res.json({
    ...catchUpBase,
    ...(aiSummary ? { aiSummary } : {}),
    ...(aiError ? { aiError, aiErrorCode } : {}),
  });
});

app.post('/api/rooms/:roomId/catch-up', strictMutationLimiter, async (req, res) => {
  const safeRoomId = sanitizeRoomOrEntityId(req.params.roomId);
  if (!safeRoomId) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }
  const room = rooms.get(safeRoomId);
  const clientSnap: ClientCatchUpSnapshot | undefined =
    req.body && typeof req.body === 'object' ? (req.body as ClientCatchUpSnapshot) : undefined;
  const overrideApiKey =
    typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : undefined;

  const catchUpBase = buildCatchUp(room, clientSnap, safeRoomId);
  const { aiSummary, aiError, aiErrorCode } = await callGeminiCatchUp(
    catchUpBase,
    overrideApiKey
  );

  res.json({
    ...catchUpBase,
    ...(aiSummary ? { aiSummary } : {}),
    ...(aiError ? { aiError, aiErrorCode } : {}),
  });
});

app.post('/api/rooms/:roomId/catch-up/ask', strictMutationLimiter, async (req, res) => {
  const safeRoomId = sanitizeRoomOrEntityId(req.params.roomId);
  if (!safeRoomId) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }
  const question = sanitizeMultilineText(req.body?.question, 600);
  if (!question) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }
  const room = rooms.get(safeRoomId);
  const clientSnap: ClientCatchUpSnapshot | undefined =
    req.body?.contextSnapshot && typeof req.body.contextSnapshot === 'object'
      ? (req.body.contextSnapshot as ClientCatchUpSnapshot)
      : undefined;
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const overrideApiKey =
    typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : undefined;

  const catchUpBase = buildCatchUp(room, clientSnap, safeRoomId);
  const result = await callGeminiFollowUp(catchUpBase, question, history, overrideApiKey);
  if (result.error) {
    res.status(result.errorCode === 'GEMINI_API_KEY_MISSING' ? 400 : 502).json(result);
    return;
  }
  res.json({
    answer: result.answer,
    elapsedMs: catchUpBase.elapsedMs,
  });
});

app.get('/api/catch-up/sessions', requireFirebaseAuth, (_req, res) => {
  const sessions = Array.from(savedRecordings.values())
    .sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''))
    .map((rec) => ({
      ...recordingSummary(rec),
      ...(rec.aiSummary ? { aiSummary: rec.aiSummary } : {}),
    }));
  res.json({ sessions });
});

app.post(
  '/api/catch-up/sessions/:sessionId/synthesize',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req, res) => {
    const safeId = sanitizeRoomOrEntityId(req.params.sessionId);
    const recording = safeId ? savedRecordings.get(safeId) : undefined;
    const clientSnap: ClientCatchUpSnapshot | undefined =
      req.body?.sessionSnapshot && typeof req.body.sessionSnapshot === 'object'
        ? (req.body.sessionSnapshot as ClientCatchUpSnapshot)
        : undefined;

    if (!recording && !clientSnap) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const overrideApiKey =
      typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : undefined;
    const catchUpBase = recording
      ? buildCatchUpFromRecording(recording)
      : buildCatchUp(undefined, clientSnap, safeId || 'studio');
    if (req.body?.courseContext && typeof req.body.courseContext === 'object') {
      catchUpBase.courseContext = req.body.courseContext;
    }

    const { aiSummary, aiError, aiErrorCode } = await callGeminiCatchUp(
      catchUpBase,
      overrideApiKey
    );

    if (aiSummary && recording) {
      recording.aiSummary = aiSummary;
      savedRecordings.set(recording.id, recording);
      upsertFirestoreDocument(
        'replays',
        recording.id,
        recording as unknown as Record<string, unknown>
      ).catch(() => {});
    }

    res.json({
      ...catchUpBase,
      ...(aiSummary ? { aiSummary } : {}),
      ...(aiError ? { aiError, aiErrorCode } : {}),
    });
  }
);

app.post(
  '/api/catch-up/sessions/:sessionId/ask',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req, res) => {
    const safeId = sanitizeRoomOrEntityId(req.params.sessionId);
    const recording = safeId ? savedRecordings.get(safeId) : undefined;
    const clientSnap: ClientCatchUpSnapshot | undefined =
      req.body?.sessionSnapshot && typeof req.body.sessionSnapshot === 'object'
        ? (req.body.sessionSnapshot as ClientCatchUpSnapshot)
        : undefined;

    if (!recording && !clientSnap) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const question = sanitizeMultilineText(req.body?.question, 600);
    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const overrideApiKey =
      typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : undefined;

    const catchUpBase = recording
      ? buildCatchUpFromRecording(recording)
      : buildCatchUp(undefined, clientSnap, safeId || 'studio');
    if (req.body?.courseContext && typeof req.body.courseContext === 'object') {
      catchUpBase.courseContext = req.body.courseContext;
    }

    const result = await callGeminiFollowUp(catchUpBase, question, history, overrideApiKey);
    if (result.error) {
      res.status(result.errorCode === 'GEMINI_API_KEY_MISSING' ? 400 : 502).json(result);
      return;
    }
    res.json({
      answer: result.answer,
      elapsedMs: catchUpBase.elapsedMs,
    });
  }
);

app.post(
  '/api/database/sync-room',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const safeRoomId = sanitizeRoomOrEntityId(req.body?.roomId);
    if (!safeRoomId) {
      res.status(400).json({ error: 'Invalid roomId' });
      return;
    }
    const room = rooms.get(safeRoomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    persistRoom(room);
    res.json({ success: true, roomId: safeRoomId });
  }
);

// 7. Measured Benchmarks (aggregated from real client QoS reports + saved recordings)
app.get('/api/benchmarks', (_req, res) => {
  const byMode: Record<VideoMode, QosSample[]> = { off: [], low: [], standard: [], hd: [] };
  for (const s of qosSamples) byMode[s.videoMode]?.push(s);

  const recordings = Array.from(savedRecordings.values());
  const totalDurationMs = recordings.reduce((a, r) => a + r.durationMs, 0);
  const totalEventsKb = recordings.reduce((a, r) => a + r.eventsSizeKb, 0);
  const hours = totalDurationMs / 3_600_000;

  const liveRooms = Array.from(rooms.values()).filter((r) => r.participants.length > 0);

  res.json({
    generatedAt: new Date().toISOString(),
    windowStart: qosSamples.length ? qosSamples[0].at : null,
    overall: summarizeSamples(qosSamples),
    byVideoMode: {
      off: summarizeSamples(byMode.off),
      low: summarizeSamples(byMode.low),
      standard: summarizeSamples(byMode.standard),
      hd: summarizeSamples(byMode.hd),
    },
    recordings: {
      count: recordings.length,
      totalDurationMs,
      totalEventsKb: roundTo(totalEventsKb, 1),
      avgKbPerHour: hours > 0 ? roundTo(totalEventsKb / hours, 1) : null,
      avgBoardKbps:
        totalDurationMs > 0
          ? roundTo((totalEventsKb * 1024 * 8) / 1000 / (totalDurationMs / 1000), 3)
          : null,
    },
    live: {
      rooms: liveRooms.length,
      participants: liveRooms.reduce((a, r) => a + r.participants.length, 0),
    },
  });
});

// 8. Course Quizzes (lecturer-authored, answers checked server-side)
const sanitizeQuizQuestions = (raw: unknown): QuizQuestion[] | null => {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 25) return null;
  const out: QuizQuestion[] = [];
  for (const [i, q] of raw.entries()) {
    if (!q || typeof q !== 'object') return null;
    const item = q as Record<string, unknown>;
    const question = sanitizeMultilineText(item.question, 500);
    const options = Array.isArray(item.options)
      ? item.options.map((o) => sanitizeMultilineText(o, 200)).filter(Boolean)
      : [];
    const correctIndex = Number(item.correctIndex);
    if (!question || options.length < 2 || options.length > 6) return null;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return null;
    }
    out.push({
      id: `q${i + 1}`,
      question,
      options,
      correctIndex,
      explanation: sanitizeMultilineText(item.explanation, 600),
    });
  }
  return out;
};

const publicQuiz = (quiz: Record<string, unknown>, uid: string) => {
  const isAuthor = quiz.authorId === uid;
  const questions = (quiz.questions as QuizQuestion[]) || [];
  const attempts = Array.isArray(quiz.attempts)
    ? (quiz.attempts as { uid: string; name: string; score: number; total: number; at: string }[])
    : [];
  const mine = attempts.filter((a) => a.uid === uid);
  return {
    id: quiz.id,
    courseId: quiz.courseId,
    title: quiz.title,
    authorId: quiz.authorId,
    authorName: quiz.authorName,
    createdAt: quiz.createdAt,
    questions: isAuthor
      ? questions
      : questions.map(({ correctIndex: _c, explanation: _e, ...rest }) => rest),
    myBestScore: mine.length ? Math.max(...mine.map((a) => a.score)) : null,
    myAttempts: mine.length,
    ...(isAuthor
      ? {
        attemptCount: attempts.length,
        averageScore: attempts.length
          ? roundTo(attempts.reduce((a, b) => a + b.score / Math.max(1, b.total), 0) / attempts.length * 100, 1)
          : null,
      }
      : {}),
  };
};

app.get('/api/quizzes', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  const courseId = sanitizeRoomOrEntityId(req.query.courseId);
  const all = await listFirestoreCollection('quizzes');
  const list = all
    .filter((q) => !courseId || q.courseId === courseId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((q) => publicQuiz(q, req.user!.uid));
  res.json({ quizzes: list });
});

app.post(
  '/api/quizzes',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user || req.user.role !== 'lecturer') {
      res.status(403).json({ error: 'Only lecturers can create quizzes' });
      return;
    }
    const courseId = sanitizeRoomOrEntityId(req.body?.courseId);
    const title = sanitizeDisplayText(req.body?.title, 120);
    const questions = sanitizeQuizQuestions(req.body?.questions);
    if (!courseId || !title || !questions) {
      res.status(400).json({
        error: 'A course, title and 1-25 questions (2-6 options each, one correct) are required',
      });
      return;
    }
    const id = `quiz_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
    const saved = await upsertFirestoreDocument('quizzes', id, {
      id,
      courseId,
      title,
      authorId: req.user.uid,
      authorName: req.user.name || 'Lecturer',
      createdAt: new Date().toISOString(),
      questions,
      attempts: [],
    });
    res.status(201).json({ quiz: publicQuiz(saved || {}, req.user.uid) });
  }
);

app.post(
  '/api/quizzes/:quizId/check',
  requireFirebaseAuth,
  (req: AuthenticatedRequest, res) => {
    const quizId = sanitizeRoomOrEntityId(req.params.quizId);
    const quiz = quizId ? getFirestoreDocument('quizzes', quizId) : undefined;
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    const question = ((quiz.questions as QuizQuestion[]) || []).find(
      (q) => q.id === req.body?.questionId
    );
    const selected = Number(req.body?.selectedIndex);
    if (!question || !Number.isInteger(selected)) {
      res.status(400).json({ error: 'Invalid question or answer' });
      return;
    }
    res.json({
      correct: selected === question.correctIndex,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    });
  }
);

app.post(
  '/api/quizzes/:quizId/attempts',
  strictMutationLimiter,
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const quizId = sanitizeRoomOrEntityId(req.params.quizId);
    const quiz = quizId ? getFirestoreDocument('quizzes', quizId) : undefined;
    if (!quiz || !req.user) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    const questions = (quiz.questions as QuizQuestion[]) || [];
    const answers = req.body?.answers;
    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'answers are required' });
      return;
    }
    // Score is computed on the server from the submitted answers
    let score = 0;
    for (const q of questions) {
      if (Number((answers as Record<string, unknown>)[q.id]) === q.correctIndex) score += 1;
    }
    const attempts = Array.isArray(quiz.attempts) ? (quiz.attempts as unknown[]) : [];
    const updated = await upsertFirestoreDocument('quizzes', String(quiz.id), {
      ...quiz,
      attempts: [
        ...attempts,
        {
          uid: req.user.uid,
          name: req.user.name || 'Student',
          score,
          total: questions.length,
          at: new Date().toISOString(),
        },
      ].slice(-1000),
    });
    res.json({ score, total: questions.length, quiz: publicQuiz(updated || quiz, req.user.uid) });
  }
);

// 9. Personal Study Notes (per user, per course)
app.get('/api/notes/:courseId', requireFirebaseAuth, (req: AuthenticatedRequest, res) => {
  const courseId = sanitizeRoomOrEntityId(req.params.courseId);
  if (!courseId || !req.user) {
    res.status(400).json({ error: 'Invalid courseId' });
    return;
  }
  const doc = getFirestoreDocument('notes', notesDocId(req.user.uid, courseId));
  res.json({
    content: typeof doc?.content === 'string' ? doc.content : '',
    updatedAt: typeof doc?.updatedAt === 'string' ? doc.updatedAt : null,
  });
});

app.post(
  '/api/notes/:courseId',
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res) => {
    const courseId = sanitizeRoomOrEntityId(req.params.courseId);
    if (!courseId || !req.user) {
      res.status(400).json({ error: 'Invalid courseId' });
      return;
    }
    const content = sanitizeMultilineText(req.body?.content, 20_000);
    const saved = await upsertFirestoreDocument('notes', notesDocId(req.user.uid, courseId), {
      uid: req.user.uid,
      courseId,
      content,
    });
    res.json({ success: true, updatedAt: saved?.updatedAt || new Date().toISOString() });
  }
);

// 10. Flashcard Generation (Gemini AI based on course material) & Course Deck Endpoints
app.post(
  '/api/ai/flashcards/generate',
  strictMutationLimiter,
  async (req: Request, res: Response) => {
    const courseId = sanitizeRoomOrEntityId(req.body?.courseId);
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    // Pull server-side materials if available from Firestore
    const courseDoc = getFirestoreDocument('courses', courseId);
    const allAssignments = await listFirestoreCollection('assignments');
    const serverMaterials = allAssignments.filter(
      (a) => String(a.courseId || '').toLowerCase() === courseId.toLowerCase()
    );
    const allAnnouncements = await listFirestoreCollection('announcements');
    const serverAnnouncements = allAnnouncements
      .filter((a) => String(a.courseId || '').toLowerCase() === courseId.toLowerCase())
      .map((a) => (typeof a.content === 'string' ? a.content : ''))
      .filter(Boolean);

    const payload: GenerateFlashcardsPayload = {
      courseId,
      courseCode: sanitizeDisplayText(req.body?.courseCode || courseDoc?.code, 24) || courseId.toUpperCase(),
      courseTitle: sanitizeDisplayText(req.body?.courseTitle || courseDoc?.title, 140) || 'Academic Course',
      department: sanitizeDisplayText(req.body?.department || courseDoc?.department, 100),
      topics: Array.isArray(req.body?.topics)
        ? req.body.topics.map((t: any) => sanitizeDisplayText(String(t), 120))
        : [],
      notes: sanitizeMultilineText(req.body?.notes, 20_000) || (typeof courseDoc?.notes === 'string' ? courseDoc.notes : ''),
      materials: Array.isArray(req.body?.materials) && req.body.materials.length > 0
        ? req.body.materials.map((m: any) => ({
            title: sanitizeDisplayText(m.title, 140),
            description: sanitizeMultilineText(m.description, 500),
            type: sanitizeDisplayText(m.type, 24) || 'material',
          }))
        : serverMaterials.map((m) => ({
            title: sanitizeDisplayText(m.title, 140),
            description: sanitizeMultilineText(m.description, 500),
            type: sanitizeDisplayText(m.type, 24) || 'material',
          })),
      announcements: Array.isArray(req.body?.announcements) && req.body.announcements.length > 0
        ? req.body.announcements.map((a: any) => sanitizeMultilineText(String(a), 400))
        : serverAnnouncements,
      transcripts: Array.isArray(req.body?.transcripts)
        ? req.body.transcripts.map((t: any) => sanitizeMultilineText(String(t), 600))
        : [],
      userPrompt: sanitizeMultilineText(req.body?.userPrompt, 400),
      count: typeof req.body?.count === 'number' ? req.body.count : undefined,
      geminiApiKey: typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : undefined,
    };

    const overrideApiKey =
      typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : undefined;

    const result = await callGeminiGenerateFlashcards(payload, overrideApiKey);
    if (result.error) {
      res.status(result.errorCode === 'GEMINI_API_KEY_MISSING' ? 400 : 502).json(result);
      return;
    }

    res.json({
      success: true,
      flashcards: result.flashcards || [],
      modelUsed: result.modelUsed,
    });
  }
);

app.get('/api/courses/:courseId/flashcards', async (req: Request, res: Response) => {
  const courseId = sanitizeRoomOrEntityId(req.params.courseId);
  if (!courseId) {
    res.status(400).json({ error: 'Invalid courseId' });
    return;
  }
  const doc = getFirestoreDocument('flashcards', `fc_${courseId}`);
  const flashcards = Array.isArray(doc?.flashcards) ? doc.flashcards : [];
  res.json({ flashcards });
});

app.post(
  '/api/courses/:courseId/flashcards',
  strictMutationLimiter,
  async (req: Request, res: Response) => {
    const courseId = sanitizeRoomOrEntityId(req.params.courseId);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid courseId' });
      return;
    }
    const cards = Array.isArray(req.body?.flashcards) ? req.body.flashcards : [];
    const sanitizedCards: FlashcardItem[] = cards
      .slice(0, 100)
      .map((c: any, idx: number) => ({
        id: sanitizeRoomOrEntityId(c.id) || `fc_${courseId}_${Date.now()}_${idx + 1}`,
        courseId,
        topic: sanitizeDisplayText(c.topic, 80) || 'Topic',
        front: sanitizeMultilineText(c.front, 600) || '',
        back: sanitizeMultilineText(c.back, 2000) || '',
        hint: sanitizeDisplayText(c.hint, 300) || undefined,
      }))
      .filter((c: FlashcardItem) => c.front && c.back);

    await upsertFirestoreDocument('flashcards', `fc_${courseId}`, {
      courseId,
      flashcards: sanitizedCards,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, count: sanitizedCards.length, flashcards: sanitizedCards });
  }
);

// Global Express Error Handler (prevents stack trace leakage)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message?.includes('CORS')) {
    res.status(403).json({ error: 'Forbidden: Origin not permitted' });
    return;
  }
  res.status(400).json({ error: 'Bad request payload' });
});

// --- Real-time Socket.io Meeting Signaling (Hardened + Firestore Synced) ---

const socketTelemetryLimiter = new SlidingWindowRateLimiter(180, 1_000); // 180 events/sec per socket
const socketControlLimiter = new SlidingWindowRateLimiter(40, 60_000); // 40 control actions/min per socket
const socketStatusLimiter = new SlidingWindowRateLimiter(40, 60_000); // mute / hand toggles
const socketChatLimiter = new SlidingWindowRateLimiter(10, 10_000); // 10 messages / 10s
const socketSignalLimiter = new SlidingWindowRateLimiter(300, 10_000); // WebRTC SDP + ICE
const socketQosLimiter = new SlidingWindowRateLimiter(3, 15_000);

// Handshake Authentication Middleware
io.use(async (socket, next) => {
  try {
    const verifiedIdentity = await authenticateSocketConnection(socket);
    socket.data.user = verifiedIdentity;
    socket.data.joinedRooms = new Set<string>();
    next();
  } catch {
    next(new Error('Unauthorized socket connection'));
  }
});

io.on('connection', (socket: Socket) => {
  const socketUser: FirebaseUserPayload = socket.data.user;
  const joinedRooms: Set<string> = socket.data.joinedRooms;

  const findSelf = (room: RoomState) =>
    room.participants.find((p) => p.socketId === socket.id);

  const resolveJoinedRoomId = (rawRoomId: unknown): string | null => {
    const sanitized = sanitizeRoomOrEntityId(rawRoomId);
    if (sanitized && joinedRooms.has(sanitized)) return sanitized;
    return Array.from(joinedRooms)[0] || null;
  };

  const canUseChalkboard = (room: RoomState): boolean => {
    const self = findSelf(room);
    return Boolean(
      room.id === TRIAL_ROOM_ID ||
      room.useChalkboardAllowed ||
      socketUser.role === 'lecturer' ||
      self?.role === 'lecturer' ||
      self?.canDraw ||
      (Boolean(self?.name) && room.lecturerName?.toLowerCase() === self?.name?.toLowerCase()) ||
      room.participants[0]?.socketId === socket.id ||
      !hasLecturerPresent(room)
    );
  };

  const leaveRoom = (roomId: string) => {
    joinedRooms.delete(roomId);
    socket.leave(roomId);
    const room = rooms.get(roomId);
    if (!room) return;
    const before = room.participants.length;
    room.participants = room.participants.filter((p) => p.socketId !== socket.id);
    if (room.participants.length !== before) {
      broadcastParticipants(room);
      io.to(roomId).emit('peer_left', { socketId: socket.id });
    }
    scheduleFinalizeIfEmpty(room);
  };

  socket.on('join_room', (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) {
      socket.emit('error_notice', { error: 'Rate limit exceeded for join_room' });
      return;
    }

    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId) {
      socket.emit('error_notice', { error: 'Invalid room code.' });
      return;
    }

    const userId = socketUser.uid;
    const clientProvidedName = sanitizeDisplayText(raw.userName, 48);
    const userName = socketUser.isGuest
      ? clientProvidedName || socketUser.name || 'Guest'
      : socketUser.name || clientProvidedName || 'Campus User';
    const clientRequestedRole: 'lecturer' | 'student' =
      raw.role === 'lecturer' ||
      socketUser.role === 'lecturer' ||
      (Boolean(raw.lecturerName) &&
        Boolean(clientProvidedName) &&
        String(raw.lecturerName).toLowerCase() === clientProvidedName.toLowerCase())
        ? 'lecturer'
        : 'student';
    const role: 'lecturer' | 'student' = clientRequestedRole;

    let room = rooms.get(safeRoomId);
    if (!room) {
      if (rooms.size >= MAX_ROOMS) {
        socket.emit('error_notice', {
          error: 'Maximum active classroom capacity reached.',
        });
        return;
      }
      // Restore the board from the last session if previously persisted
      const persistedRoom = getFirestoreDocument('rooms', safeRoomId);
      const metaTitle = sanitizeDisplayText(raw.title, 96);
      const metaCourseCode = sanitizeDisplayText(raw.courseCode, 16);
      const metaLecturer = sanitizeDisplayText(raw.lecturerName, 64);
      const metaLecturerId = sanitizeRoomOrEntityId(raw.lecturerId) || (role === 'lecturer' ? userId : undefined);
      const metaCourseId = sanitizeRoomOrEntityId(raw.courseId) || undefined;
      const persistedTotal = Number(persistedRoom?.totalSlides);
      const persistedHostUserId = typeof persistedRoom?.hostUserId === 'string' ? persistedRoom.hostUserId : undefined;
      const persistedLecturerId = typeof persistedRoom?.lecturerId === 'string' ? persistedRoom.lecturerId : undefined;
      room = {
        id: safeRoomId,
        title:
          metaTitle ||
          (typeof persistedRoom?.title === 'string' ? persistedRoom.title : '') ||
          `Room ${safeRoomId}`,
        lecturerName:
          metaLecturer ||
          (typeof persistedRoom?.lecturerName === 'string' ? persistedRoom.lecturerName : '') ||
          (role === 'lecturer' ? userName : ''),
        hostUserId: role === 'lecturer' ? userId : persistedHostUserId,
        lecturerId: metaLecturerId || persistedLecturerId,
        courseCode:
          metaCourseCode ||
          (typeof persistedRoom?.courseCode === 'string' ? persistedRoom.courseCode : ''),
        courseId:
          metaCourseId ||
          (typeof persistedRoom?.courseId === 'string' ? persistedRoom.courseId : undefined),
        strokes: [],
        activeSlideIndex: 0,
        totalSlides:
          Number.isInteger(persistedTotal) && persistedTotal > 0 && persistedTotal <= MAX_TOTAL_SLIDES
            ? persistedTotal
            : DEFAULT_TOTAL_SLIDES,
        stageLayout: 'tiled',
        isRecording: true,
        sessionStartedAt: Date.now(),
        participants: [],
        chat: [],
        transcript: [],
        polls: [],
        questions: [],
        attendeeIds: [],
        peakParticipants: 0,
      };
      rooms.set(safeRoomId, room);
    }

    if (!activeDvrSessions.has(safeRoomId)) {
      room.sessionStartedAt = Date.now();
      room.strokes = [];
      room.activeSlideIndex = 0;
      room.chat = [];
      room.transcript = [];
      room.polls = [];
      room.questions = [];
      room.attendeeIds = [];
      room.peakParticipants = 0;
      activeDvrSessions.set(safeRoomId, {
        startTime: room.sessionStartedAt,
        events: [
          {
            t: 0,
            type: 'snapshot',
            data: { strokes: [], activeSlideIndex: 0 },
          },
        ],
      });
    }
    cancelFinalize(safeRoomId);

    if (room.participants.length >= MAX_PARTICIPANTS_PER_ROOM) {
      socket.emit('error_notice', { error: 'Room participant limit reached.' });
      return;
    }

    // A lecturer joining a room without a named lecturer or host becomes its host
    if (role === 'lecturer') {
      if (!room.hostUserId) room.hostUserId = userId;
      if (!room.lecturerName) room.lecturerName = userName;
      if (!room.lecturerId && raw.lecturerId) {
        room.lecturerId = sanitizeRoomOrEntityId(raw.lecturerId) || undefined;
      } else if (!room.lecturerId) {
        room.lecturerId = userId;
      }
    }

    socket.join(safeRoomId);
    joinedRooms.add(safeRoomId);

    const videoMode: VideoMode =
      raw.videoMode === 'low' || raw.videoMode === 'standard' || raw.videoMode === 'hd' ? raw.videoMode : 'off';
    const isLecturerUser = role === 'lecturer';
    const participant: RoomParticipant = {
      socketId: socket.id,
      id: userId,
      name: userName,
      role,
      avatarTag:
        sanitizeDisplayText(raw.avatarTag, 4) ||
        (socketUser.isGuest ? '' : sanitizeDisplayText(socketUser.avatarTag, 4)) ||
        deriveInitials(userName),
      isGuest: Boolean(socketUser.isGuest),
      videoMode,
      isMuted: raw.isMuted !== false,
      handRaised: false,
      joinedAt: Date.now(),
      canDraw: isLecturerUser,
      canSpeak: isLecturerUser,
    };
    room.participants = room.participants.filter((p) => p.socketId !== socket.id);
    room.participants.push(participant);
    if (!room.attendeeIds.includes(userId)) room.attendeeIds.push(userId);
    room.peakParticipants = Math.max(room.peakParticipants, room.participants.length);

    socket.emit('room_state_snapshot', {
      roomId: room.id,
      selfSocketId: socket.id,
      selfUserId: userId,
      title: room.title,
      courseCode: room.courseCode,
      courseId: room.courseId || null,
      lecturerName: room.lecturerName,
      hostUserId: room.hostUserId || null,
      lecturerId: room.lecturerId || null,
      stageLayout: room.stageLayout || 'tiled',
      strokes: room.strokes,
      activeSlideIndex: room.activeSlideIndex,
      totalSlides: room.totalSlides,
      isRecording: room.isRecording,
      sessionStartedAt: room.sessionStartedAt,
      participants: room.participants,
      chat: room.chat,
      transcript: room.transcript || [],
      polls: room.polls || [],
      questions: room.questions || [],
    });

    broadcastParticipants(room);
  });

  socket.on('leave_room', (payload: unknown) => {
    const raw = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId || !joinedRooms.has(safeRoomId)) return;
    leaveRoom(safeRoomId);
  });

  // WebRTC signaling relay (SDP offers/answers + ICE candidates), peer-to-peer within a room
  socket.on('webrtc_signal', (payload: unknown) => {
    if (!socketSignalLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    const target = typeof raw.to === 'string' ? raw.to : '';
    if (!safeRoomId || !joinedRooms.has(safeRoomId) || !target) return;

    const room = rooms.get(safeRoomId);
    if (!room || !room.participants.some((p) => p.socketId === target)) return;

    const signal = validateWebRtcSignal(raw.signal);
    if (!signal) return;

    io.to(target).emit('webrtc_signal', {
      roomId: safeRoomId,
      from: socket.id,
      signal,
    });
  });

  // Vector stroke delta streaming (validated, sanitized, rate-limited & persisted)
  socket.on('stroke_delta', (rawStroke: unknown) => {
    if (!socketTelemetryLimiter.allow(socket.id).allowed) {
      return;
    }
    if (!rawStroke || typeof rawStroke !== 'object') return;
    const rawObj = rawStroke as Record<string, unknown>;
    const effectiveRoomId = resolveJoinedRoomId(rawObj.roomId);
    if (!effectiveRoomId) return;

    const room = rooms.get(effectiveRoomId);
    const cleanStroke = validateAndSanitizeStroke(
      { ...rawObj, roomId: effectiveRoomId },
      {
        userId: socketUser.uid,
        userName:
          (room && findSelf(room)?.name) ||
          socketUser.name ||
          'Campus User',
      }
    );
    if (!cleanStroke) return;

    if (room) {
      if (!canUseChalkboard(room)) {
        return;
      }
      if (typeof cleanStroke.slideIndex === 'number' && cleanStroke.slideIndex >= room.totalSlides) {
        return;
      }
      room.strokes = room.strokes.filter((s) => s.id !== cleanStroke.id);
      room.strokes.push(cleanStroke);
      if (room.strokes.length > MAX_STROKES_PER_ROOM) {
        room.strokes.shift();
      }
      if (cleanStroke.isComplete !== false) {
        pushDvrEvent(cleanStroke.roomId, 'stroke', cleanStroke);
        persistRoom(room);
      }
    }

    socket.to(cleanStroke.roomId).emit('stroke_delta', cleanStroke);
  });

  // Undo: remove a single stroke (own strokes, or any stroke for lecturers)
  socket.on('remove_stroke', (payload: unknown) => {
    if (!socketTelemetryLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = resolveJoinedRoomId(raw.roomId);
    const strokeId = sanitizeRoomOrEntityId(raw.strokeId);
    if (!safeRoomId || !strokeId) return;

    const room = rooms.get(safeRoomId);
    if (!room) return;
    const stroke = room.strokes.find((s) => s.id === strokeId);
    if (!stroke) return;
    if (stroke.userId !== socketUser.uid && !canUseChalkboard(room)) return;

    room.strokes = room.strokes.filter((s) => s.id !== strokeId);
    pushDvrEvent(safeRoomId, 'remove', { strokeId });
    persistRoom(room);
    socket.to(safeRoomId).emit('stroke_removed', { strokeId });
  });

  // Laser pointer broadcast (validated & membership-checked)
  socket.on('laser_pointer', (rawLaser: unknown) => {
    if (!socketTelemetryLimiter.allow(socket.id).allowed) {
      return;
    }
    if (!rawLaser || typeof rawLaser !== 'object') return;
    const rawObj = rawLaser as Record<string, unknown>;
    const effectiveRoomId = resolveJoinedRoomId(rawObj.roomId);
    if (!effectiveRoomId) return;

    const room = rooms.get(effectiveRoomId);
    const cleanLaser = validateAndSanitizeLaser(
      { ...rawObj, roomId: effectiveRoomId },
      {
        userId: socketUser.uid,
        userName: (room && findSelf(room)?.name) || socketUser.name || 'Campus User',
      }
    );
    if (!cleanLaser) return;

    socket.to(cleanLaser.roomId).emit('laser_pointer', cleanLaser);
  });

  // Clear canvas action (RBAC + membership enforced + Firestore synced)
  socket.on('clear_canvas', (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;

    const raw = payload as Record<string, unknown>;
    const safeRoomId = resolveJoinedRoomId(raw.roomId);
    if (!safeRoomId) return;

    const room = rooms.get(safeRoomId);
    if (room && !canUseChalkboard(room)) {
      return;
    }

    if (room) {
      room.strokes = [];
      pushDvrEvent(safeRoomId, 'clear', { clearedBy: socketUser.uid });
      persistRoom(room);
    }
    socket.to(safeRoomId).emit('clear_canvas', { userId: socketUser.uid });
  });

  // Board page navigation. When a lecturer is present only authorized board users may page.
  // Navigating to index === totalSlides appends a fresh page.
  socket.on('change_slide', (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;

    const raw = payload as Record<string, unknown>;
    const safeRoomId = resolveJoinedRoomId(raw.roomId);
    if (!safeRoomId) return;

    const slideIndex = Number(raw.slideIndex);
    if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= MAX_TOTAL_SLIDES) {
      return;
    }

    const room = rooms.get(safeRoomId);
    if (!room) return;
    if (hasLecturerPresent(room) && !canUseChalkboard(room)) {
      socket.emit('change_slide', {
        slideIndex: room.activeSlideIndex,
        totalSlides: room.totalSlides,
      });
      return;
    }
    if (slideIndex > room.totalSlides) return;
    if (slideIndex === room.totalSlides) {
      room.totalSlides += 1;
    }
    room.activeSlideIndex = slideIndex;
    pushDvrEvent(safeRoomId, 'slide_change', { slideIndex });
    persistRoom(room);
    socket.to(safeRoomId).emit('change_slide', { slideIndex, totalSlides: room.totalSlides });
    socket.emit('change_slide', { slideIndex, totalSlides: room.totalSlides });
  });

  // In-call chat
  socket.on('chat_message', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId || !joinedRooms.has(safeRoomId)) return;
    if (!socketChatLimiter.allow(socket.id).allowed) {
      socket.emit('error_notice', { error: 'You are sending messages too quickly.' });
      return;
    }
    const text = sanitizeMultilineText(raw.text, 1000);
    if (!text) return;

    const room = rooms.get(safeRoomId);
    if (!room) return;
    const self = findSelf(room);
    const message: ChatMessageRecord = {
      id: `msg_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      roomId: safeRoomId,
      userId: socketUser.uid,
      senderName: self?.name || socketUser.name || 'Participant',
      senderRole: self?.role || 'student',
      text,
      timestamp: Date.now(),
    };
    room.chat.push(message);
    if (room.chat.length > MAX_CHAT_PER_ROOM) room.chat.shift();
    pushDvrEvent(safeRoomId, 'chat', message);
    io.to(safeRoomId).emit('chat_message', message);
  });

  // Participant status: mic muted / hand raised
  socket.on('update_status', (payload: unknown) => {
    if (!socketStatusLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId) || Array.from(joinedRooms)[0];
    if (!safeRoomId) return;
    const room = rooms.get(safeRoomId);
    const self = room ? findSelf(room) : undefined;
    if (!room || !self) return;
    if (typeof raw.isMuted === 'boolean') {
      if (!raw.isMuted && self.role !== 'lecturer' && !self.canSpeak) {
        self.isMuted = true;
      } else {
        self.isMuted = raw.isMuted;
      }
    }
    if (typeof raw.handRaised === 'boolean') self.handRaised = raw.handRaised;
    broadcastParticipants(room);
  });

  // Lecturers can lower a student's raised hand
  socket.on('lower_hand', (payload: unknown) => {
    if (!socketStatusLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId) || Array.from(joinedRooms)[0];
    if (!safeRoomId) return;
    const room = rooms.get(safeRoomId);
    if (!room) return;
    const self = findSelf(room);
    const isLecturer =
      socketUser.role === 'lecturer' ||
      self?.role === 'lecturer' ||
      (Boolean(self?.name) && room.lecturerName?.toLowerCase() === self?.name?.toLowerCase()) ||
      room.participants[0]?.socketId === socket.id ||
      !hasLecturerPresent(room);
    if (!isLecturer) return;
    const target = room.participants.find(
      (p) =>
        p.socketId === raw.socketId ||
        p.id === raw.socketId ||
        (raw.userId && (p.id === raw.userId || p.socketId === raw.userId))
    );
    if (target) {
      target.handRaised = false;
    }
    io.to(room.id).emit('hand_lowered', {
      socketId: target?.socketId || raw.socketId,
      userId: target?.id || raw.userId || raw.socketId,
    });
    broadcastParticipants(room);
  });

  // Lecturers can grant/revoke participant permissions (chalkboard draw, microphone speak)
  socket.on('grant_permission', (payload: unknown) => {
    if (!socketStatusLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId) || Array.from(joinedRooms)[0];
    if (!safeRoomId) return;
    const room = rooms.get(safeRoomId);
    if (!room) return;
    const self = findSelf(room);
    const isLecturer =
      socketUser.role === 'lecturer' ||
      self?.role === 'lecturer' ||
      (Boolean(self?.name) && room.lecturerName?.toLowerCase() === self?.name?.toLowerCase()) ||
      room.participants[0]?.socketId === socket.id ||
      !hasLecturerPresent(room);
    if (!isLecturer) return;
    const target = room.participants.find(
      (p) => p.socketId === raw.socketId || p.id === raw.userId
    );
    if (!target) return;
    if (typeof raw.canDraw === 'boolean') target.canDraw = raw.canDraw;
    if (typeof raw.canSpeak === 'boolean') {
      target.canSpeak = raw.canSpeak;
      if (!raw.canSpeak) target.isMuted = true;
    }
    broadcastParticipants(room);
  });

  // Lecturers can change and synchronize stage layout (e.g. open chalkboard for everyone)
  socket.on('change_stage_layout', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId) || Array.from(joinedRooms)[0];
    if (!safeRoomId) return;
    const room = rooms.get(safeRoomId);
    if (!room) return;
    const self = findSelf(room);
    const isLecturer =
      socketUser.role === 'lecturer' ||
      self?.role === 'lecturer' ||
      (Boolean(self?.name) && room.lecturerName?.toLowerCase() === self?.name?.toLowerCase()) ||
      room.participants[0]?.socketId === socket.id ||
      !hasLecturerPresent(room);
    if (!isLecturer) return;
    if (typeof raw.stageLayout === 'string') {
      room.stageLayout = raw.stageLayout;
      io.to(room.id).emit('stage_layout_changed', { stageLayout: raw.stageLayout });
      if (safeRoomId !== room.id) {
        io.to(safeRoomId).emit('stage_layout_changed', { stageLayout: raw.stageLayout });
      }
    }
  });

  // QoS Latency Ping/Pong
  socket.on('ping_qos', (payload: unknown) => {
    if (!socketTelemetryLimiter.allow(socket.id).allowed) return;
    const raw =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const clientTime =
      typeof raw.clientTime === 'number' && Number.isFinite(raw.clientTime)
        ? raw.clientTime
        : Date.now();
    socket.emit('pong_qos', { clientTime, serverTime: Date.now() });
  });

  // Measured client network statistics feeding /api/benchmarks
  socket.on('qos_report', (payload: unknown) => {
    if (!socketQosLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const num = (v: unknown, max: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
    };
    const audioKbps = num(raw.audioKbps, 10_000) ?? 0;
    const videoKbps = num(raw.videoKbps, 50_000) ?? 0;
    const telemetryKbps = num(raw.telemetryKbps, 10_000) ?? 0;
    const videoMode: VideoMode =
      raw.videoMode === 'low' || raw.videoMode === 'standard' ? raw.videoMode : 'off';
    qosSamples.push({
      at: Date.now(),
      rttMs: num(raw.rttMs, 60_000),
      packetLoss: num(raw.packetLoss, 100),
      audioKbps,
      videoKbps,
      telemetryKbps,
      totalKbps: audioKbps + videoKbps + telemetryKbps,
      videoMode,
      peers: num(raw.peers, MAX_PARTICIPANTS_PER_ROOM) ?? 0,
    });
    if (qosSamples.length > MAX_QOS_SAMPLES) qosSamples.shift();
    scheduleQosPersist();
  });

  // Participant camera mode change
  socket.on('update_video_mode', (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;

    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId || !joinedRooms.has(safeRoomId)) return;

    const mode = raw.mode;
    if (mode !== 'off' && mode !== 'low' && mode !== 'standard') return;

    const room = rooms.get(safeRoomId);
    const self = room ? findSelf(room) : undefined;
    if (!room || !self) return;
    self.videoMode = mode;
    broadcastParticipants(room);
  });

  // Google Meet Reactions
  socket.on('studio_reaction', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
      socket.to(rId).emit('studio_reaction', payload);
    }
  });

  // Live Speech Transcript / Captions Stream (accumulated from 00:00 for Catch Me Up AI)
  socket.on('caption_stream', (payload: unknown) => {
    if (!socketTelemetryLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = resolveJoinedRoomId(raw.roomId);
    if (!safeRoomId) return;

    const text = sanitizeMultilineText(raw.text, 600);
    if (!text) return;

    const room = rooms.get(safeRoomId);
    if (!room) return;
    const self = findSelf(room);
    const now = Date.now();
    const dvr = activeDvrSessions.get(safeRoomId);
    const startTime = dvr?.startTime ?? room.sessionStartedAt;
    const entry: TranscriptEntry = {
      id:
        sanitizeRoomOrEntityId(raw.id) ||
        `tr_${now.toString(36)}_${crypto.randomBytes(2).toString('hex')}`,
      roomId: safeRoomId,
      speakerId: socketUser.uid,
      speakerName:
        sanitizeDisplayText(raw.speaker || raw.speakerName, 48) ||
        self?.name ||
        socketUser.name ||
        'Speaker',
      speakerRole:
        raw.speakerRole === 'lecturer' || self?.role === 'lecturer' ? 'lecturer' : 'student',
      text,
      timestamp: now,
      offsetMs: Math.max(0, now - startTime),
    };

    if (!Array.isArray(room.transcript)) room.transcript = [];
    room.transcript.push(entry);
    if (room.transcript.length > MAX_TRANSCRIPT_PER_ROOM) {
      room.transcript.shift();
    }
    pushDvrEvent(safeRoomId, 'transcript', entry);
    io.to(safeRoomId).emit('caption_stream', {
      ...entry,
      speaker: entry.speakerName,
    });
  });

  // Google Meet Polls
  socket.on('create_poll', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const poll = payload as Record<string, unknown>;
    const safeRoomId = resolveJoinedRoomId(poll.roomId);
    if (!safeRoomId) return;
    const room = rooms.get(safeRoomId);
    if (room) {
      if (!Array.isArray(room.polls)) room.polls = [];
      room.polls = [poll as unknown as StudioPoll, ...room.polls.filter((p) => p.id !== poll.id)].slice(0, 20);
      pushDvrEvent(safeRoomId, 'poll', poll);
      io.to(safeRoomId).emit('poll_update', room.polls);
    } else {
      io.to(safeRoomId).emit('poll_update', [poll]);
    }
  });

  socket.on('vote_poll', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    for (const rId of joinedRooms) {
      const room = rooms.get(rId);
      if (room && Array.isArray(room.polls)) {
        const pollId = String(raw.pollId || '');
        const optionId = String(raw.optionId || '');
        const voterId = String(raw.userId || socketUser.uid);
        room.polls = room.polls.map((p) => {
          if (p.id !== pollId) return p;
          const prevVote = p.voters?.[voterId];
          const options = (p.options || []).map((o) => {
            if (o.id === optionId) return { ...o, votes: o.votes + 1 };
            if (o.id === prevVote) return { ...o, votes: Math.max(0, o.votes - 1) };
            return o;
          });
          return {
            ...p,
            options,
            voters: { ...(p.voters || {}), [voterId]: optionId },
          };
        });
      }
      io.to(rId).emit('poll_voted', payload);
    }
  });

  socket.on('close_poll', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    for (const rId of joinedRooms) {
      const room = rooms.get(rId);
      if (room && Array.isArray(room.polls)) {
        const pollId = String(raw.pollId || '');
        room.polls = room.polls.map((p) => (p.id === pollId ? { ...p, isOpen: false } : p));
      }
      io.to(rId).emit('poll_closed', payload);
    }
  });

  // Google Meet Q&A
  socket.on('ask_question', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const q = payload as Record<string, unknown>;
    const safeRoomId = resolveJoinedRoomId(q.roomId);
    if (!safeRoomId) return;
    const room = rooms.get(safeRoomId);
    if (room) {
      if (!Array.isArray(room.questions)) room.questions = [];
      room.questions = [q as unknown as StudioQuestion, ...room.questions.filter((item) => item.id !== q.id)].slice(0, 50);
      pushDvrEvent(safeRoomId, 'question', q);
      io.to(safeRoomId).emit('question_update', room.questions);
    } else {
      io.to(safeRoomId).emit('question_update', [q]);
    }
  });

  socket.on('upvote_question', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    for (const rId of joinedRooms) {
      const room = rooms.get(rId);
      if (room && Array.isArray(room.questions)) {
        const questionId = String(raw.questionId || '');
        const voterId = String(raw.userId || socketUser.uid);
        room.questions = room.questions.map((q) => {
          if (q.id !== questionId) return q;
          const upvotes = Array.isArray(q.upvotes) ? q.upvotes : [];
          const nextUpvotes = upvotes.includes(voterId)
            ? upvotes.filter((u) => u !== voterId)
            : [...upvotes, voterId];
          return { ...q, upvotes: nextUpvotes };
        });
      }
      io.to(rId).emit('question_voted', payload);
    }
  });

  socket.on('answer_question', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    for (const rId of joinedRooms) {
      const room = rooms.get(rId);
      if (room && Array.isArray(room.questions)) {
        const questionId = String(raw.questionId || '');
        room.questions = room.questions.map((q) =>
          q.id === questionId ? { ...q, isAnswered: true } : q
        );
      }
      io.to(rId).emit('question_answered', payload);
    }
  });

  // Google Meet Breakout Rooms
  socket.on('create_breakouts', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
      io.to(rId).emit('breakout_update', payload);
    }
  });

  socket.on('broadcast_breakout', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
      io.to(rId).emit('breakout_message', payload);
    }
  });

  socket.on('close_breakouts', () => {
    for (const rId of joinedRooms) {
      io.to(rId).emit('breakout_update', null);
    }
  });

  // Google Meet Host Controls
  socket.on('update_host_controls', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    for (const rId of joinedRooms) {
      const room = rooms.get(rId);
      if (room) {
        if (typeof raw.useChalkboardAllowed === 'boolean') {
          room.useChalkboardAllowed = raw.useChalkboardAllowed;
        }
        if (typeof raw.turnMicAllowed === 'boolean') {
          room.turnMicAllowed = raw.turnMicAllowed;
        }
      }
      io.to(rId).emit('host_controls_update', payload);
    }
  });

  socket.on('mute_all', () => {
    for (const rId of joinedRooms) {
      io.to(rId).emit('mute_all_peers');
    }
  });

  socket.on('lower_all_hands', () => {
    for (const rId of joinedRooms) {
      const room = rooms.get(rId);
      if (room) {
        room.participants.forEach((p) => {
          p.handRaised = false;
        });
        io.to(rId).emit('hand_lowered', { all: true });
        broadcastParticipants(room);
      }
    }
  });

  socket.on('end_session', async (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) {
      socket.emit('error_notice', { error: 'Rate limit exceeded for end_session' });
      return;
    }
    const raw = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId) || resolveJoinedRoomId(raw.roomId);
    if (!safeRoomId) return;

    const room = rooms.get(safeRoomId);
    if (!room) return;

    const self = findSelf(room);
    const userId = socketUser.uid || self?.id;
    const isAuthorized =
      socketUser.role === 'lecturer' ||
      self?.role === 'lecturer' ||
      (Boolean(room.hostUserId) && (userId === room.hostUserId || socketUser.uid === room.hostUserId)) ||
      (Boolean(room.lecturerId) && (userId === room.lecturerId || socketUser.uid === room.lecturerId)) ||
      safeRoomId === TRIAL_ROOM_ID;

    if (!isAuthorized) {
      socket.emit('error_notice', { error: 'Only the lecturer can end the studio session.' });
      return;
    }

    await endAndFinalizeRoom(safeRoomId, socketUser.name || self?.name || room.lecturerName);
  });

  socket.on('disconnect', () => {
    for (const roomId of Array.from(joinedRooms)) {
      leaveRoom(roomId);
    }
    joinedRooms.clear();
  });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`[Chalk Server] Hardened server running on http://localhost:${PORT}`);
});
