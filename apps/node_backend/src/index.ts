import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import {
  ChatMessageRecord,
  DvrChapter,
  DvrEvent,
  DvrRecording,
  QosSample,
  QuizQuestion,
  RoomParticipant,
  RoomState,
  VideoMode,
} from './types';
import {
  FirebaseUserPayload,
  getFirestoreDocument,
  listFirestoreCollection,
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
    methods: ['GET', 'POST', 'OPTIONS'],
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

  persistRoom(room);
  rooms.delete(roomId);
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

/**
 * Builds a "Catch me up" recap from what actually happened in the live session:
 * board activity per time window, page changes, and messages.
 */
const buildCatchUp = (room: RoomState) => {
  const dvr = activeDvrSessions.get(room.id);
  const startTime = dvr?.startTime ?? room.sessionStartedAt;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - startTime);
  const windowMs =
    elapsedMs <= 15 * 60_000 ? 5 * 60_000 : elapsedMs <= 60 * 60_000 ? 10 * 60_000 : 15 * 60_000;

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
    const idx = Math.floor(t / windowMs);
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

  for (const ev of dvr?.events ?? []) {
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

  const slideStats = new Map<number, { strokeCount: number; contributors: string[] }>();
  for (const s of room.strokes) {
    const idx = typeof s.slideIndex === 'number' ? s.slideIndex : 0;
    const entry = slideStats.get(idx) || { strokeCount: 0, contributors: [] };
    entry.strokeCount += 1;
    if (s.userName && !entry.contributors.includes(s.userName)) {
      entry.contributors.push(s.userName);
    }
    slideStats.set(idx, entry);
  }

  return {
    roomId: room.id,
    title: room.title,
    courseCode: room.courseCode,
    lecturerName: room.lecturerName,
    isLive: room.participants.length > 0,
    sessionStartedAt: startTime,
    elapsedMs,
    participantCount: room.participants.length,
    strokeCount: room.strokes.length,
    chatCount: room.chat.length,
    activeSlideIndex: room.activeSlideIndex,
    totalSlides: room.totalSlides,
    segments: Array.from(segments.values()).sort((a, b) => a.startMs - b.startMs),
    slides: Array.from(slideStats.entries())
      .map(([slideIndex, v]) => ({ slideIndex, ...v }))
      .sort((a, b) => a.slideIndex - b.slideIndex),
    lecturerMessages: room.chat.filter((m) => m.senderRole === 'lecturer').slice(-5),
    recentMessages: room.chat.slice(-8),
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
  const isNewUser = !existingDoc || !existingDoc.isProfileComplete;

  const savedProfile = await saveUserToFirestore(verifiedUser.uid, {
    name: req.body?.name || verifiedUser.name,
    email: verifiedUser.email || req.body?.email,
    role: req.body?.role || verifiedUser.role,
    department: req.body?.department || verifiedUser.department,
    matricOrStaffId: req.body?.matricOrStaffId || verifiedUser.matricOrStaffId,
    avatarTag: req.body?.avatarTag || verifiedUser.avatarTag,
    isProfileComplete:
      typeof req.body?.isProfileComplete === 'boolean'
        ? req.body.isProfileComplete
        : Boolean(existingDoc?.isProfileComplete),
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
    if (!req.user || req.user.role !== 'lecturer') {
      res.status(403).json({ error: 'Only lecturers can create courses' });
      return;
    }
    const code = sanitizeDisplayText(req.body?.code, 16).toUpperCase();
    const title = sanitizeDisplayText(req.body?.title, 96);
    const scheduleTime =
      sanitizeDisplayText(req.body?.scheduleTime, 64) || 'Schedule to be announced';
    const department =
      sanitizeDisplayText(req.body?.department, 80) || req.user.department || 'General';

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

    const courseData = {
      id,
      code,
      title,
      lecturerName: req.user.name || 'Lecturer',
      lecturerId: req.user.uid,
      accentHex: '#059669',
      hasLiveSession: true,
      liveRoomCode,
      enrolledCount: 0,
      memberIds: [] as string[],
      members: [] as Record<string, unknown>[],
      scheduleTime,
      department,
    };

    const saved = await upsertFirestoreDocument('courses', id, courseData);
    res.status(201).json({ success: true, course: saved });
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
    const matched = allCourses.find(
      (c) =>
        String(c.id).toLowerCase() === rawCode.toLowerCase() ||
        String(c.code).toLowerCase().replace(/[^a-z0-9]/g, '') === normalized ||
        String(c.liveRoomCode).toLowerCase() === rawCode.toLowerCase()
    );

    if (!matched) {
      res.status(404).json({ error: 'No course matches that code' });
      return;
    }

    if (matched.lecturerId === req.user.uid) {
      res.json({ success: true, course: matched });
      return;
    }

    const memberIds = Array.isArray(matched.memberIds)
      ? (matched.memberIds as string[])
      : [];
    if (memberIds.includes(req.user.uid)) {
      res.json({ success: true, course: matched });
      return;
    }

    const members = Array.isArray(matched.members)
      ? (matched.members as Record<string, unknown>[])
      : [];
    const updated = await upsertFirestoreDocument('courses', String(matched.id), {
      ...matched,
      memberIds: [...memberIds, req.user.uid],
      members: [...members, toCourseMember(req.user)],
      enrolledCount: memberIds.length + 1,
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

app.get('/api/rooms/:roomId/catch-up', (req, res) => {
  const safeRoomId = sanitizeRoomOrEntityId(req.params.roomId);
  if (!safeRoomId) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }
  const room = rooms.get(safeRoomId);
  if (!room) {
    res.status(404).json({ error: 'This room has no live session right now' });
    return;
  }
  res.json(buildCatchUp(room));
});

app.get('/api/replays', requireFirebaseAuth, (_req, res) => {
  const replays = Array.from(savedRecordings.values())
    .sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''))
    .map(recordingSummary);
  res.json({ replays });
});

app.get('/api/replays/:recordingId', requireFirebaseAuth, (req, res) => {
  const safeId = sanitizeRoomOrEntityId(req.params.recordingId);
  const recording = safeId ? savedRecordings.get(safeId) : undefined;
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json({ replay: recording });
});

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

// Global Express Error Handler (prevents stack trace leakage)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message?.includes('CORS')) {
    res.status(403).json({ error: 'Forbidden: Origin not permitted' });
    return;
  }
  res.status(400).json({ error: 'Bad request payload' });
});

// --- Real-time Socket.io Meeting Signaling (Hardened + Firestore Synced) ---

const socketTelemetryLimiter = new SlidingWindowRateLimiter(60, 1_000); // 60 events/sec per socket
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
      const metaCourseId = sanitizeRoomOrEntityId(raw.courseId) || undefined;
      const persistedTotal = Number(persistedRoom?.totalSlides);
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
        courseCode:
          metaCourseCode ||
          (typeof persistedRoom?.courseCode === 'string' ? persistedRoom.courseCode : ''),
        courseId:
          metaCourseId ||
          (typeof persistedRoom?.courseId === 'string' ? persistedRoom.courseId : undefined),
        strokes: Array.isArray(persistedRoom?.strokes)
          ? (persistedRoom.strokes as RoomState['strokes'])
          : [],
        activeSlideIndex:
          typeof persistedRoom?.activeSlideIndex === 'number'
            ? persistedRoom.activeSlideIndex
            : 0,
        totalSlides:
          Number.isInteger(persistedTotal) && persistedTotal > 0 && persistedTotal <= MAX_TOTAL_SLIDES
            ? persistedTotal
            : DEFAULT_TOTAL_SLIDES,
        stageLayout: 'tiled',
        isRecording: true,
        sessionStartedAt: Date.now(),
        participants: [],
        chat: [],
        attendeeIds: [],
        peakParticipants: 0,
      };
      rooms.set(safeRoomId, room);
    }

    if (!activeDvrSessions.has(safeRoomId)) {
      room.sessionStartedAt = Date.now();
      room.chat = [];
      room.attendeeIds = [];
      room.peakParticipants = 0;
      activeDvrSessions.set(safeRoomId, {
        startTime: room.sessionStartedAt,
        events: [
          {
            t: 0,
            type: 'snapshot',
            data: { strokes: room.strokes, activeSlideIndex: room.activeSlideIndex },
          },
        ],
      });
    }
    cancelFinalize(safeRoomId);

    if (room.participants.length >= MAX_PARTICIPANTS_PER_ROOM) {
      socket.emit('error_notice', { error: 'Room participant limit reached.' });
      return;
    }

    // A lecturer joining a room without a named lecturer becomes its host
    if (role === 'lecturer' && !room.lecturerName) {
      room.lecturerName = userName;
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
      stageLayout: room.stageLayout || 'tiled',
      strokes: room.strokes,
      activeSlideIndex: room.activeSlideIndex,
      totalSlides: room.totalSlides,
      isRecording: room.isRecording,
      sessionStartedAt: room.sessionStartedAt,
      participants: room.participants,
      chat: room.chat,
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

    const cleanStroke = validateAndSanitizeStroke(rawStroke, {
      userId: socketUser.uid,
      userName:
        (() => {
          const room = rooms.get(String((rawStroke as Record<string, unknown>)?.roomId));
          return room ? findSelf(room)?.name : undefined;
        })() ||
        socketUser.name ||
        'Campus User',
    });
    if (!cleanStroke) return;

    if (!joinedRooms.has(cleanStroke.roomId)) return;

    const room = rooms.get(cleanStroke.roomId);
    if (room) {
      const self = findSelf(room);
      if (self && self.role !== 'lecturer' && !self.canDraw) {
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
      pushDvrEvent(cleanStroke.roomId, 'stroke', cleanStroke);
      persistRoom(room);
    }

    socket.to(cleanStroke.roomId).emit('stroke_delta', cleanStroke);
  });

  // Undo: remove a single stroke (own strokes, or any stroke for lecturers)
  socket.on('remove_stroke', (payload: unknown) => {
    if (!socketTelemetryLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;
    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    const strokeId = sanitizeRoomOrEntityId(raw.strokeId);
    if (!safeRoomId || !strokeId || !joinedRooms.has(safeRoomId)) return;

    const room = rooms.get(safeRoomId);
    if (!room) return;
    const stroke = room.strokes.find((s) => s.id === strokeId);
    if (!stroke) return;
    const isLecturer = !socketUser.isGuest && socketUser.role === 'lecturer';
    if (stroke.userId !== socketUser.uid && !isLecturer) return;

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

    const room = rooms.get(String((rawLaser as Record<string, unknown>)?.roomId));
    const cleanLaser = validateAndSanitizeLaser(rawLaser, {
      userId: socketUser.uid,
      userName: (room && findSelf(room)?.name) || socketUser.name || 'Campus User',
    });
    if (!cleanLaser) return;

    if (!joinedRooms.has(cleanLaser.roomId)) return;

    socket.to(cleanLaser.roomId).emit('laser_pointer', cleanLaser);
  });

  // Clear canvas action (RBAC + membership enforced + Firestore synced)
  socket.on('clear_canvas', (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;

    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId || !joinedRooms.has(safeRoomId)) return;

    if (socketUser.isGuest && safeRoomId !== TRIAL_ROOM_ID) {
      socket.emit('error_notice', {
        error: 'Guest users cannot wipe an active course board.',
      });
      return;
    }

    const room = rooms.get(safeRoomId);
    if (room) {
      room.strokes = [];
      pushDvrEvent(safeRoomId, 'clear', { clearedBy: socketUser.uid });
      persistRoom(room);
    }
    socket.to(safeRoomId).emit('clear_canvas', { userId: socketUser.uid });
  });

  // Board page navigation. When a lecturer is present only lecturers may page.
  // Navigating to index === totalSlides appends a fresh page.
  socket.on('change_slide', (payload: unknown) => {
    if (!socketControlLimiter.allow(socket.id).allowed) return;
    if (!payload || typeof payload !== 'object') return;

    const raw = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId || !joinedRooms.has(safeRoomId)) return;

    const slideIndex = Number(raw.slideIndex);
    if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= MAX_TOTAL_SLIDES) {
      return;
    }

    const room = rooms.get(safeRoomId);
    if (!room) return;
    const self = findSelf(room);
    if (hasLecturerPresent(room) && self?.role !== 'lecturer' && !self?.canDraw) {
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
    const safeRoomId = sanitizeRoomOrEntityId(raw.roomId);
    if (!safeRoomId || !joinedRooms.has(safeRoomId)) return;
    const room = rooms.get(safeRoomId);
    if (!room || findSelf(room)?.role !== 'lecturer') return;
    const target = room.participants.find((p) => p.socketId === raw.socketId);
    if (!target) return;
    target.handRaised = false;
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

  // Google Meet Polls
  socket.on('create_poll', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const poll = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(poll.roomId);
    if (!safeRoomId) return;
    io.to(safeRoomId).emit('poll_update', [poll]);
  });

  socket.on('vote_poll', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
      io.to(rId).emit('poll_voted', payload);
    }
  });

  socket.on('close_poll', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
      io.to(rId).emit('poll_closed', payload);
    }
  });

  // Google Meet Q&A
  socket.on('ask_question', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const q = payload as Record<string, unknown>;
    const safeRoomId = sanitizeRoomOrEntityId(q.roomId);
    if (!safeRoomId) return;
    io.to(safeRoomId).emit('question_update', [q]);
  });

  socket.on('upvote_question', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
      io.to(rId).emit('question_voted', payload);
    }
  });

  socket.on('answer_question', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    for (const rId of joinedRooms) {
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
    for (const rId of joinedRooms) {
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
        broadcastParticipants(room);
      }
    }
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
