export type StrokeTool =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'laser'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'line';

export type NetworkProfile = 'fast4G' | 'unstable3G' | 'crisis2G';
export type VideoMode = 'off' | 'low' | 'standard';

export interface VectorPoint {
  x: number; // Normalized [0.0, 1.0]
  y: number; // Normalized [0.0, 1.0]
  pressure?: number;
}

export interface StrokeData {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  timestamp: number;
  tool: StrokeTool;
  color: string;
  width: number;
  points: VectorPoint[];
  slideIndex?: number;
}

export interface LaserPointer {
  roomId: string;
  userId: string;
  userName: string;
  x: number;
  y: number;
  active: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer';
  department: string;
  matricOrStaffId: string;
  avatarTag: string;
  isProfileComplete: boolean;
}

export interface CourseMember {
  id: string;
  name: string;
  avatarTag: string;
  role: 'student' | 'lecturer';
  matricOrStaffId: string;
}

export interface CourseModel {
  id: string;
  code: string;
  title: string;
  lecturerName: string;
  lecturerId: string;
  accentHex: string;
  hasLiveSession: boolean;
  liveRoomCode: string;
  enrolledCount: number;
  memberIds?: string[];
  members?: CourseMember[];
  scheduleTime: string;
  department: string;
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  authorName: string;
  authorRole: 'lecturer' | 'ta' | 'student';
  timestamp: string;
  content: string;
  isLiveNotice?: boolean;
}

export interface ClassworkAssignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string;
  description: string;
  isSubmitted: boolean;
  points: string;
  submissionNote?: string;
  submittedAt?: string;
}

export interface MeetParticipant {
  socketId: string;
  id: string;
  name: string;
  role: 'lecturer' | 'student';
  avatarTag: string;
  isGuest: boolean;
  videoMode: VideoMode;
  isMuted: boolean;
  handRaised: boolean;
  joinedAt: number;
  isSpeaking?: boolean;
  stream?: MediaStream | null;
}

// Backward-compatible alias for MeetPeer
export type MeetPeer = MeetParticipant;

export interface ChatMessage {
  id: string;
  roomId?: string;
  userId?: string;
  senderName: string;
  senderRole: 'lecturer' | 'student' | 'bot';
  text: string;
  timestamp: string | number;
  isTutorBot?: boolean;
}

export interface DvrChapter {
  timestampMs?: number;
  timeMs?: number;
  title?: string;
  label?: string;
  slideIndex: number;
}

export interface DvrReplayItem {
  id: string;
  roomId?: string;
  courseId?: string;
  courseCode: string;
  title: string;
  lecturerName: string;
  recordedAt: string;
  endedAt?: string;
  durationMs: number;
  totalEvents?: number;
  strokeCount?: number;
  chatCount?: number;
  participantCount?: number;
  attendeeIds?: string[];
  totalSizeKb: number;
  eventsSizeKb?: number;
  mp4EquivalentMb: number;
  savingsPercent: number;
  chapters: DvrChapter[];
  events: { t: number; type?: string; data?: any; stroke: StrokeData }[];
}

export interface CatchUpSegment {
  startMs: number;
  endMs: number;
  strokes: number;
  chats: number;
  slides: number[];
  contributors: string[];
  highlights: string[];
}

export interface CatchUpData {
  roomId: string;
  title: string;
  courseCode: string;
  lecturerName: string;
  isLive: boolean;
  sessionStartedAt: number;
  elapsedMs: number;
  participantCount: number;
  strokeCount: number;
  chatCount: number;
  activeSlideIndex: number;
  totalSlides: number;
  segments: CatchUpSegment[];
  slides: { slideIndex: number; strokeCount: number; contributors: string[] }[];
  lecturerMessages: ChatMessage[];
  recentMessages: ChatMessage[];
}

export interface QuizQuestionModel {
  id: string | number;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
}

export interface QuizModel {
  id: string;
  courseId: string;
  title: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  questions: QuizQuestionModel[];
  myBestScore: number | null;
  myAttempts: number;
  attemptCount?: number;
  averageScore?: number | null;
}

export interface BenchmarkMetrics {
  generatedAt: string;
  overall: {
    samples: number;
    avgRttMs: number | null;
    p95RttMs: number | null;
    avgPacketLoss: number | null;
    avgAudioKbps: number | null;
    avgVideoKbps: number | null;
    avgTelemetryKbps: number | null;
    avgTotalKbps: number | null;
  };
  byVideoMode: {
    off: { avgTotalKbps: number | null; avgAudioKbps: number | null; samples: number };
    low: { avgTotalKbps: number | null; avgAudioKbps: number | null; samples: number };
    standard: { avgTotalKbps: number | null; avgAudioKbps: number | null; samples: number };
  };
  recordings: {
    count: number;
    totalDurationMs: number;
    totalEventsKb: number;
    avgKbPerHour: number | null;
    avgBoardKbps: number | null;
  };
  live: {
    rooms: number;
    participants: number;
  };
}
