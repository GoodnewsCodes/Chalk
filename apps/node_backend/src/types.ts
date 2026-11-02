export interface VectorPoint {
  x: number; // Normalized [0.0, 1.0]
  y: number; // Normalized [0.0, 1.0]
  pressure?: number;
}

export type StrokeTool = 'pen' | 'highlighter' | 'eraser' | 'laser' | 'rect' | 'circle' | 'arrow' | 'line';

export type VideoMode = 'off' | 'low' | 'standard';

export interface StrokeDelta {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  timestamp: number; // Relative or epoch ms
  tool: StrokeTool;
  color: string;
  width: number;
  points: VectorPoint[];
  slideIndex?: number;
  isComplete?: boolean;
}

export interface LaserPointerEvent {
  roomId: string;
  userId: string;
  userName: string;
  x: number; // Normalized [0.0, 1.0]
  y: number; // Normalized [0.0, 1.0]
  active: boolean;
}

export interface ChatMessageRecord {
  id: string;
  roomId: string;
  userId: string;
  senderName: string;
  senderRole: 'lecturer' | 'student';
  text: string;
  timestamp: number; // epoch ms
}

/**
 * A live connection inside a meeting. Keyed by socketId because every socket is
 * a distinct WebRTC peer (the same user may join from two tabs/devices).
 */
export interface RoomParticipant {
  socketId: string;
  id: string; // user id
  name: string;
  role: 'lecturer' | 'student';
  avatarTag: string;
  isGuest: boolean;
  videoMode: VideoMode;
  isMuted: boolean;
  handRaised: boolean;
  joinedAt: number;
}

export interface RoomState {
  id: string;
  title: string;
  lecturerName: string;
  courseCode: string;
  courseId?: string;
  strokes: StrokeDelta[];
  activeSlideIndex: number;
  totalSlides: number;
  isRecording: boolean;
  sessionStartedAt: number;
  participants: RoomParticipant[];
  chat: ChatMessageRecord[];
  /** Every user id that took part in the current session (for replay access). */
  attendeeIds: string[];
  peakParticipants: number;
}

export interface DvrEvent {
  t: number; // Offset in ms from recording start
  type: 'snapshot' | 'stroke' | 'remove' | 'clear' | 'slide_change' | 'chat';
  data: any;
}

export interface DvrChapter {
  timestampMs: number;
  timeMs?: number;
  title: string;
  label?: string;
  slideIndex: number;
}

export interface DvrRecording {
  id: string;
  roomId: string;
  courseId?: string;
  courseCode: string;
  title: string;
  lecturerName: string;
  recordedAt?: string; // ISO start time
  endedAt?: string; // ISO end time
  durationMs: number;
  totalEvents: number;
  strokeCount?: number;
  chatCount?: number;
  participantCount?: number;
  attendeeIds?: string[];
  audioSizeKb?: number;
  eventsSizeKb: number;
  totalSizeKb?: number;
  zoomEquivalentSizeKb?: number;
  savingsPercentage?: number;
  chapters: DvrChapter[];
  events: DvrEvent[];
}

export interface AiSummaryResponse {
  lectureId: string;
  topic: string;
  catchUpBullets: string[];
  keyFormulas: string[];
  smartChapters: { timestamp: string; title: string; timestampMs: number }[];
  quizQuestions: {
    id: number | string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface QosSample {
  at: number;
  rttMs: number | null;
  packetLoss: number | null; // percent
  audioKbps: number; // in + out
  videoKbps: number; // in + out
  telemetryKbps: number; // websocket in + out
  totalKbps: number;
  videoMode: VideoMode;
  peers: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
