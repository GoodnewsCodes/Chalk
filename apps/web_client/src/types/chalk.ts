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
export type VideoMode = 'off' | 'low' | 'standard' | 'hd';

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
  isMuted?: boolean;
}

export interface GradeCategory {
  id: string;
  name: string;
  weight: number;
}

export interface CourseGradingSystem {
  calculationType: 'none' | 'total_points' | 'weighted';
  showToStudents: boolean;
  categories: GradeCategory[];
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
  // Google Classroom extended properties
  section?: string;
  room?: string;
  subject?: string;
  bannerImage?: string;
  themeColor?: string;
  isArchived?: boolean;
  streamPermissions?: 'all' | 'students_comment_only' | 'teachers_only';
  classworkStreamDisplay?: 'condensed' | 'detailed' | 'hidden';
  gradingSystem?: CourseGradingSystem;
  studioSettings?: {
    studioUrl: string;
    isVisibleToStudents: boolean;
  };
}

export interface CourseAnnouncementComment {
  id: string;
  announcementId: string;
  authorId: string;
  authorName: string;
  authorRole: 'lecturer' | 'student';
  avatarTag: string;
  content: string;
  timestamp: string;
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  authorName: string;
  authorRole: 'lecturer' | 'ta' | 'student';
  timestamp: string;
  content: string;
  isLiveNotice?: boolean;
  attachments?: ClassworkAttachment[];
  commentsCount?: number;
}

export interface TopicModel {
  id: string;
  courseId: string;
  name: string;
  order: number;
}

export interface RubricCriterion {
  title: string;
  points: number;
  description?: string;
}

export interface ClassworkRubric {
  id: string;
  criteria: RubricCriterion[];
}

export interface ClassworkAttachment {
  id: string;
  title: string;
  type: 'file' | 'link' | 'youtube' | 'drive' | 'board';
  url: string;
  size?: string;
}

export interface ClassworkAssignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  description: string;
  isSubmitted: boolean;
  points: string;
  submissionNote?: string;
  submittedAt?: string;
  // Google Classroom classwork types
  type?: 'assignment' | 'quiz' | 'question' | 'material';
  topicId?: string;
  attachments?: ClassworkAttachment[];
  rubric?: ClassworkRubric[];
  questionType?: 'short_answer' | 'multiple_choice';
  questionOptions?: string[];
  allowStudentComments?: boolean;
  allowStudentEdit?: boolean;
  targetStudentIds?: string[];
  gradingCategoryId?: string;
}

export interface StudentSubmissionAttachment {
  name: string;
  url: string;
  type: 'file' | 'link' | 'board';
  size?: string;
}

export interface PrivateComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'lecturer' | 'student';
  avatarTag: string;
  text: string;
  timestamp: string;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  matricOrStaffId?: string;
  status: 'assigned' | 'turned_in' | 'graded' | 'missing' | 'returned';
  submittedAt?: string;
  grade?: number;
  maxPoints: number;
  attachments: StudentSubmissionAttachment[];
  privateComments: PrivateComment[];
  answerText?: string;
}

// Studio Subsystems
export interface StudioPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface StudioPoll {
  id: string;
  roomId: string;
  question: string;
  options: StudioPollOption[];
  voters: Record<string, string>; // userId -> optionId
  isOpen: boolean;
  showResults: boolean;
  createdAt: number;
  createdBy: string;
}

export interface StudioQuestion {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  upvotes: string[];
  isAnswered: boolean;
  timestamp: number;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  participantIds: string[];
}

export interface BreakoutSession {
  isActive: boolean;
  timerSeconds?: number;
  startedAt?: number;
  rooms: BreakoutRoom[];
  broadcastMessage?: string;
}

export interface AttendanceRecord {
  participantId: string;
  name: string;
  email?: string;
  role: 'lecturer' | 'student';
  joinTime: number;
  leaveTime?: number;
  durationMinutes: number;
}

export interface HostControlSettings {
  hostManagement: boolean;
  quickAccess: boolean;
  shareScreenAllowed: boolean;
  sendChatAllowed: boolean;
  sendReactionsAllowed: boolean;
  turnMicAllowed: boolean;
  turnVideoAllowed: boolean;
  useChalkboardAllowed: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  senderName: string;
}

export interface StudioParticipant {
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
  canDraw?: boolean;
  canSpeak?: boolean;
}

// Backward-compatible alias for StudioPeer
export type StudioPeer = StudioParticipant;

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
  timeMs?: number; // compat alias
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
    hd?: { avgTotalKbps: number | null; avgAudioKbps: number | null; samples: number };
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
