import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AttendanceRecord,
  BreakoutSession,
  ChatMessage,
  ClassworkAssignment,
  CourseAnnouncement,
  CourseAnnouncementComment,
  CourseModel,
  FloatingReaction,
  HostControlSettings,
  LaserPointer,
  StudioParticipant,
  StudioPoll,
  StudioQuestion,
  NetworkProfile,
  StrokeData,
  StrokeTool,
  StudentSubmission,
  TopicModel,
  TranscriptSegment,
  UserProfile,
  VideoMode,
} from '../types/chalk';
import {
  DEFAULT_BOARD_STROKES,
  DEMO_ANNOUNCEMENT_COMMENTS,
  DEMO_ANNOUNCEMENTS,
  DEMO_ASSIGNMENTS,
  DEMO_ATTENDANCE,
  DEMO_BOARD_STROKES,
  DEMO_COURSE_IDS,
  DEMO_COURSES,
  DEMO_LECTURER_USER,
  DEMO_POLLS,
  DEMO_QUESTIONS,
  DEMO_STUDENT_USER,
  DEMO_SUBMISSIONS,
  DEMO_TOPICS,
  INITIAL_ANNOUNCEMENT_COMMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_COURSES,
  INITIAL_POLLS,
  INITIAL_QUESTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_TOPICS,
  isDemoAccount,
} from '../data/mockCatalog';
import {
  deleteCourseFromFirestore,
  ensureFirestoreSeedData,
  getCurrentFirebaseIdToken,
  isFirebaseConfigured,
  persistRoomStateToFirestore,
  saveAnnouncementToFirestore,
  saveAssignmentSubmissionToFirestore,
  saveCourseToFirestore,
  saveUserProfileToFirestore,
  signInWithFirebaseGoogle,
  signOutFirebaseUser,
  subscribeToFirebaseAuth,
  subscribeToFirestoreCatalog,
  subscribeToFirestoreRoom,
  MOCK_COURSE_IDS,
  MOCK_ANNOUNCEMENT_IDS,
  MOCK_ASSIGNMENT_IDS,
} from '../lib/firebase';

export type ThemePreference = 'light' | 'dark';

export interface ActiveRoomMeta {
  roomId: string;
  title: string;
  courseCode: string;
  courseId: string | null;
  lecturerName: string;
  hostUserId?: string | null;
  lecturerId?: string | null;
  isLive: boolean;
  participantCount: number;
}

export interface LiveRoomSummary {
  id: string;
  title: string;
  lecturerName: string;
  hostUserId?: string | null;
  lecturerId?: string | null;
  courseCode: string;
  courseId: string | null;
  participantCount: number;
  lecturerPresent: boolean;
  strokeCount: number;
  isRecording: boolean;
  sessionStartedAt: number;
}

interface AppContextValue {
  // Theme
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;

  // Auth & Firebase Status
  currentUser: UserProfile | null;
  isDemoMode: boolean;
  switchDemoPersona: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
  firebaseReady: boolean;
  refreshFirebaseConnection: () => void;
  guestName: string;
  guestId: string;
  setGuestName: (name: string) => void;
  authenticateWithGoogle: () => Promise<{
    user: UserProfile;
    isNewUser: boolean;
  }>;
  signInWithGoogle: (params: {
    email: string;
    name: string;
    role?: 'student' | 'lecturer';
    idCode?: string;
    department?: string;
    avatarTag?: string;
    completeImmediately?: boolean;
  }) => void;
  completeProfileSetup: (params: {
    role: 'student' | 'lecturer';
    name: string;
    matricOrStaffId: string;
    department: string;
    avatarTag: string;
  }) => Promise<void>;
  logout: () => Promise<void>;

  // Courses & Hub
  courses: CourseModel[];
  announcements: CourseAnnouncement[];
  assignments: ClassworkAssignment[];
  topics: TopicModel[];
  submissions: StudentSubmission[];
  announcementComments: Record<string, CourseAnnouncementComment[]>;
  liveRooms: LiveRoomSummary[];
  refreshCourses: () => Promise<void>;
  addAnnouncement: (
    courseId: string,
    content: string,
    isLiveNotice?: boolean,
    attachments?: any[]
  ) => void;
  deleteAnnouncement: (announcementId: string) => Promise<void>;
  addAnnouncementComment: (announcementId: string, content: string) => Promise<void>;
  deleteAnnouncementComment: (announcementId: string, commentId: string) => Promise<void>;
  submitAssignment: (assignmentId: string, note: string) => void;
  submitWork: (
    assignmentId: string,
    attachments: any[],
    answerText?: string,
    note?: string
  ) => Promise<void>;
  unsubmitWork: (assignmentId: string) => Promise<void>;
  gradeSubmission: (
    submissionId: string,
    grade: number,
    privateFeedback?: string
  ) => Promise<void>;
  addPrivateComment: (submissionId: string, text: string) => Promise<void>;
  createAssignment: (params: {
    courseId: string;
    title: string;
    description: string;
    dueDate?: string;
    dueTime?: string;
    points?: string;
    type?: 'assignment' | 'quiz' | 'question' | 'material';
    topicId?: string;
    attachments?: any[];
    rubric?: any[];
    questionType?: 'short_answer' | 'multiple_choice';
    questionOptions?: string[];
  }) => Promise<ClassworkAssignment>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  createTopic: (courseId: string, name: string) => Promise<TopicModel>;
  deleteTopic: (topicId: string) => Promise<void>;
  joinCourseByCode: (code: string) => Promise<CourseModel | null>;
  createCourse: (params: {
    code: string;
    title: string;
    scheduleTime: string;
    department: string;
    section?: string;
    room?: string;
    subject?: string;
  }) => Promise<CourseModel>;
  updateCourseSettings: (courseId: string, updates: Partial<CourseModel>) => Promise<void>;
  archiveCourse: (courseId: string) => Promise<void>;
  restoreCourse: (courseId: string) => Promise<void>;
  deleteCoursePermanently: (courseId: string) => Promise<void>;
  muteStudent: (courseId: string, studentId: string, isMuted: boolean) => Promise<void>;
  removeStudentFromCourse: (courseId: string, studentId: string) => Promise<void>;
  inviteStudentToCourse: (courseId: string, emailOrName: string) => Promise<void>;

  // Live Studio & Real-time Telemetry
  activeRoomCode: string;
  setActiveRoomCode: (code: string) => void;
  activeRoomInfo: ActiveRoomMeta;
  endStudioSession: (roomId?: string) => Promise<void>;
  sessionEndedRoom: string | null;
  socketConnected: boolean;
  selfSocketId: string;
  participants: StudioParticipant[];
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;

  // Media Controls (Real Microphone & WebRTC Audio/Video)
  isMicMuted: boolean;
  toggleMic: () => Promise<void>;
  isHandRaised: boolean;
  toggleHandRaised: () => void;
  lowerHand: (socketId: string) => void;
  lowerAllHands: () => void;
  muteAllParticipants: () => void;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  speakingMap: Record<string, boolean>;

  // Vector Canvas & Slide Deck
  strokes: StrokeData[];
  currentTool: StrokeTool;
  setCurrentTool: (tool: StrokeTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentWidth: number;
  setCurrentWidth: (width: number) => void;
  activeSlideIndex: number;
  totalSlides: number;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  addSlide: () => void;
  laser: LaserPointer | null;
  emitLaser: (x: number, y: number, active: boolean) => void;
  streamStroke: (stroke: StrokeData) => void;
  commitStroke: (stroke: StrokeData) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoStroke: () => void;
  redoStroke: () => void;
  clearCanvas: () => void;

  // QoS & Anti-Lag Shield
  networkProfile: NetworkProfile;
  setNetworkProfile: (profile: NetworkProfile) => void;
  videoMode: VideoMode;
  setVideoMode: (mode: VideoMode) => void;
  circuitBreakerMessage: string | null;
  dismissCircuitBreaker: () => void;
  currentBitrateKbps: number;
  rttMs: number;
  packetLoss: number;
  chalkDataUsedMb: number;
  zoomDataUsedMb: number;
  savingsPercentage: number;

  // Google Studio Extended Features
  stageLayout: 'whiteboard' | 'tiled' | 'spotlight' | 'sidebar';
  setStageLayout: (layout: 'whiteboard' | 'tiled' | 'spotlight' | 'sidebar') => void;
  broadcastStageLayout: (layout: 'whiteboard' | 'tiled' | 'spotlight' | 'sidebar', roomId?: string) => void;
  grantParticipantPermission: (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => void;
  floatingReactions: FloatingReaction[];
  sendReaction: (emoji: string) => void;
  isCaptionsOn: boolean;
  toggleCaptions: () => void;
  activeCaptions: { speaker: string; text: string }[];
  transcriptLog: TranscriptSegment[];
  sessionStartedAt: number;
  polls: StudioPoll[];
  createPoll: (question: string, options: string[], showResults: boolean) => void;
  votePoll: (pollId: string, optionId: string) => void;
  closePoll: (pollId: string) => void;
  questions: StudioQuestion[];
  askQuestion: (text: string) => void;
  upvoteQuestion: (questionId: string) => void;
  markQuestionAnswered: (questionId: string) => void;
  breakoutSession: BreakoutSession | null;
  createBreakouts: (roomCount: number, timerMinutes: number) => void;
  broadcastBreakout: (message: string) => void;
  closeBreakouts: () => void;
  attendanceRecords: AttendanceRecord[];
  exportAttendanceReport: () => void;
  hostSettings: HostControlSettings;
  updateHostSettings: (settings: Partial<HostControlSettings>) => void;

  // Pre-join Green Room Lobby
  prejoinCam: boolean;
  setPrejoinCam: (val: boolean) => void;
  prejoinMic: boolean;
  setPrejoinMic: (val: boolean) => void;
  prejoinBlur: 'off' | 'slight' | 'strong' | 'classroom';
  setPrejoinBlur: (val: 'off' | 'slight' | 'strong' | 'classroom') => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_USER_KEY = 'chalk_web_user_v2';
const STORAGE_THEME_KEY = 'chalk_web_theme_pref_v2';
const STORAGE_COURSES_KEY = 'chalk_real_courses_v5';
const STORAGE_ANNOUNCEMENTS_KEY = 'chalk_real_announcements_v5';
const STORAGE_ASSIGNMENTS_KEY = 'chalk_real_assignments_v5';
const STORAGE_TOPICS_KEY = 'chalk_real_topics_v5';
const STORAGE_SUBMISSIONS_KEY = 'chalk_real_submissions_v5';
const STORAGE_COMMENTS_KEY = 'chalk_real_comments_v5';
const STORAGE_POLLS_KEY = 'chalk_real_polls_v5';
const STORAGE_QUESTIONS_KEY = 'chalk_real_questions_v5';
const STORAGE_ATTENDANCE_KEY = 'chalk_real_attendance_v5';
const STORAGE_HOST_SETTINGS_KEY = 'chalk_cache_host_settings_v5';
const STORAGE_DELETED_COURSES_KEY = 'chalk_deleted_course_ids_v1';

const STORAGE_DEMO_COURSES_KEY = 'chalk_demo_courses_v1';
const STORAGE_DEMO_ANNOUNCEMENTS_KEY = 'chalk_demo_announcements_v1';
const STORAGE_DEMO_ASSIGNMENTS_KEY = 'chalk_demo_assignments_v1';
const STORAGE_DEMO_TOPICS_KEY = 'chalk_demo_topics_v1';
const STORAGE_DEMO_SUBMISSIONS_KEY = 'chalk_demo_submissions_v1';
const STORAGE_DEMO_COMMENTS_KEY = 'chalk_demo_comments_v1';
const STORAGE_DEMO_POLLS_KEY = 'chalk_demo_polls_v1';
const STORAGE_DEMO_QUESTIONS_KEY = 'chalk_demo_questions_v1';
const STORAGE_DEMO_ATTENDANCE_KEY = 'chalk_demo_attendance_v1';
const BACKEND_API_BASE = 'http://localhost:4000';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State (Bi-modal: light / dark)
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const isDark = themePreference === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_THEME_KEY, themePreference);
  }, [isDark, themePreference]);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
  };

  const toggleTheme = () => {
    setThemePreferenceState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Firebase & Auth State
  const [firebaseVersion, setFirebaseVersion] = useState<number>(0);
  const [firebaseReady, setFirebaseReady] = useState<boolean>(() =>
    isFirebaseConfigured()
  );
  const [authLoading, setAuthLoading] = useState<boolean>(() =>
    isFirebaseConfigured()
  );

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
        if (isDemoAccount(parsed)) {
          return parsed.role === 'lecturer'
            ? { ...DEMO_LECTURER_USER }
            : { ...DEMO_STUDENT_USER };
        }
        // Heal any real account that previously had leaked demo IDs or names
        const isLeakedMatric =
          parsed.matricOrStaffId === 'CSC/2022/1042' ||
          parsed.matricOrStaffId === 'STAFF/CS/2018' ||
          parsed.matricOrStaffId === 'CSC/2026/0198';
        const isLeakedName =
          parsed.name === 'Alex Okafor' || parsed.name === 'Prof. Adeleke O.';
        const cleanName = isLeakedName
          ? (parsed.email || 'Campus User').split('@')[0]
          : parsed.name;
        const cleanMatric = isLeakedMatric ? '' : (parsed.matricOrStaffId || '').trim();
        return {
          ...parsed,
          name: cleanName,
          matricOrStaffId: cleanMatric,
          avatarTag:
            isLeakedName || parsed.avatarTag === 'AO' || parsed.avatarTag === 'PA'
              ? cleanName.slice(0, 2).toUpperCase() || 'CU'
              : parsed.avatarTag,
          isProfileComplete: Boolean(parsed.isProfileComplete || Boolean(cleanMatric)),
          isDemo: false,
        };
      }
    } catch {
      // ignore
    }
    return null;
  });

  const isDemoMode = isDemoAccount(currentUser);

  const [guestName, setGuestName] = useState<string>('Guest Student');
  const [guestId] = useState<string>(() => {
    try {
      let id = sessionStorage.getItem('chalk_guest_id');
      if (!id) {
        id = `guest_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('chalk_guest_id', id);
      }
      return id;
    } catch {
      return `guest_${Date.now()}`;
    }
  });
  const isAuthenticated = Boolean(currentUser && currentUser.isProfileComplete);

  const saveUserLocally = (user: UserProfile | null) => {
    if (user) {
      const cleanMatric = (user.matricOrStaffId || '').trim();
      const isComplete = isDemoAccount(user)
        ? true
        : Boolean(user.isProfileComplete || Boolean(cleanMatric));
      const normalizedUser: UserProfile = isDemoAccount(user)
        ? { ...user, isProfileComplete: true, isDemo: true }
        : { ...user, isProfileComplete: isComplete, isDemo: false };
      setCurrentUser(normalizedUser);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(normalizedUser));
    } else {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  };

  const switchDemoPersona = useCallback(() => {
    if (!isDemoAccount(currentUser)) return;
    if (currentUser?.role === 'lecturer') {
      saveUserLocally({ ...DEMO_STUDENT_USER });
    } else {
      saveUserLocally({ ...DEMO_LECTURER_USER });
    }
  }, [currentUser]);

  const refreshFirebaseConnection = () => {
    setFirebaseReady(isFirebaseConfigured());
    setFirebaseVersion((v) => v + 1);
  };

  const loadScopedArray = <T,>(
    demoMode: boolean,
    demoKey: string,
    realKey: string,
    demoFallback: T[],
    realFallback: T[],
    filterReal?: (item: T) => boolean
  ): T[] => {
    try {
      const key = demoMode ? demoKey : realKey;
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          if (demoMode) {
            return parsed.length > 0 ? parsed : demoFallback;
          }
          return filterReal ? parsed.filter(filterReal) : parsed;
        }
      }
    } catch {
      // ignore
    }
    return demoMode ? demoFallback : realFallback;
  };

  // Courses, Announcements, Assignments & Live Rooms State
  const deletedCourseIdsRef = useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem(STORAGE_DELETED_COURSES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return new Set(parsed.map((id) => String(id).toLowerCase()));
          }
        }
      } catch {
        // ignore
      }
      return new Set<string>();
    })()
  );

  const persistDeletedCourseIds = () => {
    try {
      localStorage.setItem(
        STORAGE_DELETED_COURSES_KEY,
        JSON.stringify(Array.from(deletedCourseIdsRef.current))
      );
    } catch {
      // ignore
    }
  };

  const [courses, setCourses] = useState<CourseModel[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_COURSES_KEY,
      STORAGE_COURSES_KEY,
      DEMO_COURSES,
      INITIAL_COURSES,
      (c) =>
        Boolean(
          c &&
          typeof c.id === 'string' &&
          !MOCK_COURSE_IDS.has(c.id) &&
          !DEMO_COURSE_IDS.has(c.id) &&
          !deletedCourseIdsRef.current.has(c.id.toLowerCase())
        )
    )
  );

  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_ANNOUNCEMENTS_KEY,
      STORAGE_ANNOUNCEMENTS_KEY,
      DEMO_ANNOUNCEMENTS,
      INITIAL_ANNOUNCEMENTS,
      (a) =>
        Boolean(
          a &&
          typeof a.id === 'string' &&
          !MOCK_ANNOUNCEMENT_IDS.has(a.id) &&
          typeof a.courseId === 'string' &&
          !MOCK_COURSE_IDS.has(a.courseId) &&
          !DEMO_COURSE_IDS.has(a.courseId)
        )
    )
  );

  const [assignments, setAssignments] = useState<ClassworkAssignment[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_ASSIGNMENTS_KEY,
      STORAGE_ASSIGNMENTS_KEY,
      DEMO_ASSIGNMENTS,
      INITIAL_ASSIGNMENTS,
      (a) =>
        Boolean(
          a &&
          typeof a.id === 'string' &&
          !MOCK_ASSIGNMENT_IDS.has(a.id) &&
          typeof a.courseId === 'string' &&
          !MOCK_COURSE_IDS.has(a.courseId) &&
          !DEMO_COURSE_IDS.has(a.courseId)
        )
    )
  );

  const [liveRooms, setLiveRooms] = useState<LiveRoomSummary[]>([]);

  // Topics State
  const [topics, setTopics] = useState<TopicModel[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_TOPICS_KEY,
      STORAGE_TOPICS_KEY,
      DEMO_TOPICS,
      INITIAL_TOPICS,
      (t) => Boolean(t && !DEMO_COURSE_IDS.has(t.courseId))
    )
  );

  // Student Submissions State
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_SUBMISSIONS_KEY,
      STORAGE_SUBMISSIONS_KEY,
      DEMO_SUBMISSIONS,
      INITIAL_SUBMISSIONS,
      (s) => Boolean(s && !DEMO_COURSE_IDS.has(s.courseId))
    )
  );

  // Announcement Comments State
  const [announcementComments, setAnnouncementComments] = useState<Record<string, CourseAnnouncementComment[]>>(() => {
    const demo = isDemoAccount(currentUser);
    try {
      const cached = localStorage.getItem(demo ? STORAGE_DEMO_COMMENTS_KEY : STORAGE_COMMENTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return demo && Object.keys(parsed).length === 0 ? DEMO_ANNOUNCEMENT_COMMENTS : parsed;
        }
      }
    } catch { }
    return demo ? DEMO_ANNOUNCEMENT_COMMENTS : INITIAL_ANNOUNCEMENT_COMMENTS;
  });

  // Google Studio Features State
  const [stageLayout, setStageLayout] = useState<'whiteboard' | 'tiled' | 'spotlight' | 'sidebar'>('tiled');
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isCaptionsOn, setIsCaptionsOn] = useState<boolean>(false);
  const [activeCaptions, setActiveCaptions] = useState<{ speaker: string; text: string }[]>([]);
  const [transcriptLog, setTranscriptLog] = useState<TranscriptSegment[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(() => Date.now());
  const [polls, setPolls] = useState<StudioPoll[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_POLLS_KEY,
      STORAGE_POLLS_KEY,
      DEMO_POLLS,
      INITIAL_POLLS
    )
  );
  const [questions, setQuestions] = useState<StudioQuestion[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_QUESTIONS_KEY,
      STORAGE_QUESTIONS_KEY,
      DEMO_QUESTIONS,
      INITIAL_QUESTIONS
    )
  );
  const [breakoutSession, setBreakoutSession] = useState<BreakoutSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadScopedArray(
      isDemoAccount(currentUser),
      STORAGE_DEMO_ATTENDANCE_KEY,
      STORAGE_ATTENDANCE_KEY,
      DEMO_ATTENDANCE,
      INITIAL_ATTENDANCE
    )
  );
  const [hostSettings, setHostSettings] = useState<HostControlSettings>(() => {
    const defaults: HostControlSettings = {
      hostManagement: true,
      quickAccess: true,
      shareScreenAllowed: true,
      sendChatAllowed: true,
      sendReactionsAllowed: true,
      turnMicAllowed: false,
      turnVideoAllowed: true,
      useChalkboardAllowed: false,
    };
    try {
      const cached = localStorage.getItem(STORAGE_HOST_SETTINGS_KEY);
      if (cached) return { ...defaults, ...JSON.parse(cached) };
    } catch { }
    return defaults;
  });

  // Pre-join Green Room Lobby State
  const [prejoinCam, setPrejoinCam] = useState<boolean>(true);
  const [prejoinMic, setPrejoinMic] = useState<boolean>(true);
  const [prejoinBlur, setPrejoinBlur] = useState<'off' | 'slight' | 'strong' | 'classroom'>('off');

  // Swap datasets cleanly whenever switching between Demo Mode and a Real Account
  const prevDemoModeRef = useRef<boolean>(isDemoMode);
  useEffect(() => {
    if (prevDemoModeRef.current === isDemoMode) return;
    prevDemoModeRef.current = isDemoMode;

    setCourses(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_COURSES_KEY,
        STORAGE_COURSES_KEY,
        DEMO_COURSES,
        INITIAL_COURSES,
        (c) => Boolean(c && typeof c.id === 'string' && !MOCK_COURSE_IDS.has(c.id) && !DEMO_COURSE_IDS.has(c.id))
      )
    );
    setAnnouncements(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_ANNOUNCEMENTS_KEY,
        STORAGE_ANNOUNCEMENTS_KEY,
        DEMO_ANNOUNCEMENTS,
        INITIAL_ANNOUNCEMENTS,
        (a) =>
          Boolean(
            a &&
            typeof a.id === 'string' &&
            !MOCK_ANNOUNCEMENT_IDS.has(a.id) &&
            typeof a.courseId === 'string' &&
            !MOCK_COURSE_IDS.has(a.courseId) &&
            !DEMO_COURSE_IDS.has(a.courseId)
          )
      )
    );
    setAssignments(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_ASSIGNMENTS_KEY,
        STORAGE_ASSIGNMENTS_KEY,
        DEMO_ASSIGNMENTS,
        INITIAL_ASSIGNMENTS,
        (a) =>
          Boolean(
            a &&
            typeof a.id === 'string' &&
            !MOCK_ASSIGNMENT_IDS.has(a.id) &&
            typeof a.courseId === 'string' &&
            !MOCK_COURSE_IDS.has(a.courseId) &&
            !DEMO_COURSE_IDS.has(a.courseId)
          )
      )
    );
    setTopics(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_TOPICS_KEY,
        STORAGE_TOPICS_KEY,
        DEMO_TOPICS,
        INITIAL_TOPICS,
        (t) => Boolean(t && !DEMO_COURSE_IDS.has(t.courseId))
      )
    );
    setSubmissions(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_SUBMISSIONS_KEY,
        STORAGE_SUBMISSIONS_KEY,
        DEMO_SUBMISSIONS,
        INITIAL_SUBMISSIONS,
        (s) => Boolean(s && !DEMO_COURSE_IDS.has(s.courseId))
      )
    );
    try {
      const cachedComments = localStorage.getItem(
        isDemoMode ? STORAGE_DEMO_COMMENTS_KEY : STORAGE_COMMENTS_KEY
      );
      if (cachedComments) {
        const parsed = JSON.parse(cachedComments);
        setAnnouncementComments(
          isDemoMode && Object.keys(parsed).length === 0 ? DEMO_ANNOUNCEMENT_COMMENTS : parsed
        );
      } else {
        setAnnouncementComments(isDemoMode ? DEMO_ANNOUNCEMENT_COMMENTS : INITIAL_ANNOUNCEMENT_COMMENTS);
      }
    } catch {
      setAnnouncementComments(isDemoMode ? DEMO_ANNOUNCEMENT_COMMENTS : INITIAL_ANNOUNCEMENT_COMMENTS);
    }
    setPolls(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_POLLS_KEY,
        STORAGE_POLLS_KEY,
        DEMO_POLLS,
        INITIAL_POLLS
      )
    );
    setQuestions(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_QUESTIONS_KEY,
        STORAGE_QUESTIONS_KEY,
        DEMO_QUESTIONS,
        INITIAL_QUESTIONS
      )
    );
    setAttendanceRecords(
      loadScopedArray(
        isDemoMode,
        STORAGE_DEMO_ATTENDANCE_KEY,
        STORAGE_ATTENDANCE_KEY,
        DEMO_ATTENDANCE,
        INITIAL_ATTENDANCE
      )
    );
  }, [isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_TOPICS_KEY : STORAGE_TOPICS_KEY,
      JSON.stringify(topics)
    );
  }, [topics, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_SUBMISSIONS_KEY : STORAGE_SUBMISSIONS_KEY,
      JSON.stringify(submissions)
    );
  }, [submissions, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_COMMENTS_KEY : STORAGE_COMMENTS_KEY,
      JSON.stringify(announcementComments)
    );
  }, [announcementComments, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_POLLS_KEY : STORAGE_POLLS_KEY,
      JSON.stringify(polls)
    );
  }, [polls, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_QUESTIONS_KEY : STORAGE_QUESTIONS_KEY,
      JSON.stringify(questions)
    );
  }, [questions, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_ATTENDANCE_KEY : STORAGE_ATTENDANCE_KEY,
      JSON.stringify(attendanceRecords)
    );
  }, [attendanceRecords, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HOST_SETTINGS_KEY, JSON.stringify(hostSettings));
  }, [hostSettings]);

  // Purge legacy cache versions from localStorage
  useEffect(() => {
    try {
      ['v1', 'v2', 'v3', 'v4'].forEach((ver) => {
        localStorage.removeItem(`chalk_firestore_cache_courses_${ver}`);
        localStorage.removeItem(`chalk_firestore_cache_announcements_${ver}`);
        localStorage.removeItem(`chalk_firestore_cache_assignments_${ver}`);
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_COURSES_KEY : STORAGE_COURSES_KEY,
      JSON.stringify(courses)
    );
  }, [courses, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_ANNOUNCEMENTS_KEY : STORAGE_ANNOUNCEMENTS_KEY,
      JSON.stringify(announcements)
    );
  }, [announcements, isDemoMode]);

  useEffect(() => {
    localStorage.setItem(
      isDemoMode ? STORAGE_DEMO_ASSIGNMENTS_KEY : STORAGE_ASSIGNMENTS_KEY,
      JSON.stringify(assignments)
    );
  }, [assignments, isDemoMode]);

  // Firebase auth sync (only when not actively in Demo Mode)
  useEffect(() => {
    const configured = isFirebaseConfigured();
    setFirebaseReady(configured);

    if (!configured) {
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    let unsubCatalog: (() => void) | null = null;

    const unsubAuth = subscribeToFirebaseAuth((fbProfile) => {
      // Do not overwrite an active Demo Mode session with a lingering Firebase Auth session
      const rawStored = localStorage.getItem(STORAGE_USER_KEY);
      if (rawStored) {
        try {
          const storedUser = JSON.parse(rawStored) as UserProfile;
          if (isDemoAccount(storedUser)) {
            setAuthLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (fbProfile) {
        saveUserLocally(fbProfile);
        ensureFirestoreSeedData();
        if (!unsubCatalog) {
          unsubCatalog = subscribeToFirestoreCatalog({
            onCourses: (remoteCourses) =>
              setCourses((prev) => {
                const map = new Map<string, CourseModel>();
                for (const c of prev) {
                  if (
                    !DEMO_COURSE_IDS.has(c.id) &&
                    !MOCK_COURSE_IDS.has(c.id) &&
                    !deletedCourseIdsRef.current.has(c.id.toLowerCase())
                  ) {
                    map.set(c.id, c);
                  }
                }
                for (const c of remoteCourses) {
                  if (
                    !DEMO_COURSE_IDS.has(c.id) &&
                    !MOCK_COURSE_IDS.has(c.id) &&
                    !deletedCourseIdsRef.current.has(c.id.toLowerCase())
                  ) {
                    map.set(c.id, c);
                  }
                }
                return Array.from(map.values());
              }),
            onAnnouncements: (remoteAnnouncements) =>
              setAnnouncements((prev) => {
                const map = new Map<string, CourseAnnouncement>();
                for (const a of prev) {
                  if (!DEMO_COURSE_IDS.has(a.courseId)) map.set(a.id, a);
                }
                for (const a of remoteAnnouncements) {
                  if (!DEMO_COURSE_IDS.has(a.courseId)) map.set(a.id, a);
                }
                return Array.from(map.values());
              }),
            onAssignments: (remoteAssignments) =>
              setAssignments((prev) => {
                const map = new Map<string, ClassworkAssignment>();
                for (const a of prev) {
                  if (!DEMO_COURSE_IDS.has(a.courseId)) map.set(a.id, a);
                }
                for (const a of remoteAssignments) {
                  if (!DEMO_COURSE_IDS.has(a.courseId)) map.set(a.id, a);
                }
                return Array.from(map.values());
              }),
          });
        }
      } else if (unsubCatalog) {
        unsubCatalog();
        unsubCatalog = null;
      }
      setAuthLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubCatalog) unsubCatalog();
    };
  }, [firebaseVersion]);

  // Backend REST client
  const backendApiSupportedRef = useRef<boolean | null>(null);
  const coursesRef = useRef<CourseModel[]>(courses);
  coursesRef.current = courses;

  const checkBackendCatalogSupport = async (): Promise<boolean> => {
    if (backendApiSupportedRef.current === true) {
      return true;
    }
    try {
      const res = await fetch(`${BACKEND_API_BASE}/health`);
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      const supported = Boolean(data?.capabilities?.firestoreCatalog);
      if (supported) {
        backendApiSupportedRef.current = true;
      }
      return supported;
    } catch {
      return false;
    }
  };

  const resolveAuthTokenForBackend = async (
    userOverride?: UserProfile | null
  ): Promise<string> => {
    const target = userOverride ?? currentUser;
    if (isDemoAccount(target)) {
      return `mock_firebase_token_${target!.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    }
    const fbToken = await getCurrentFirebaseIdToken();
    if (fbToken) return fbToken;
    if (target?.id) {
      return `mock_firebase_token_${target.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    }
    return '';
  };

  const syncWithBackendApi = async (
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    userOverride?: UserProfile | null
  ) => {
    try {
      const target = userOverride ?? currentUser;
      // Do not write demo catalog mutations to the real backend store
      if (
        isDemoAccount(target) &&
        method !== 'GET' &&
        (path.startsWith('/api/courses') ||
          path.startsWith('/api/announcements') ||
          path.startsWith('/api/assignments') ||
          path.startsWith('/api/users') ||
          path.startsWith('/api/auth'))
      ) {
        return null;
      }

      const isSupported = await checkBackendCatalogSupport();
      if (!isSupported) return null;

      const token = await resolveAuthTokenForBackend(userOverride);
      if (!token) return null;
      const res = await fetch(`${BACKEND_API_BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const refreshCourses = useCallback(async () => {
    if (!currentUser || isDemoAccount(currentUser)) return;
    const [coursesRes, annRes, asgnRes] = await Promise.all([
      syncWithBackendApi('/api/courses', 'GET', undefined, currentUser),
      syncWithBackendApi('/api/announcements', 'GET', undefined, currentUser),
      syncWithBackendApi('/api/assignments', 'GET', undefined, currentUser),
    ]);
    if (Array.isArray(coursesRes?.courses)) {
      const remoteCourses = coursesRes.courses.filter(
        (c: any) =>
          c &&
          typeof c.id === 'string' &&
          !MOCK_COURSE_IDS.has(c.id) &&
          !DEMO_COURSE_IDS.has(c.id) &&
          !deletedCourseIdsRef.current.has(c.id.toLowerCase())
      );
      setCourses((prev) => {
        // Merge remote courses with any locally created real courses not yet synced
        const map = new Map<string, CourseModel>();
        for (const c of prev) {
          if (
            !DEMO_COURSE_IDS.has(c.id) &&
            !MOCK_COURSE_IDS.has(c.id) &&
            !deletedCourseIdsRef.current.has(c.id.toLowerCase())
          ) {
            map.set(c.id, c);
          }
        }
        for (const c of remoteCourses) {
          map.set(c.id, c);
        }
        return Array.from(map.values());
      });

      // Backfill any locally created real courses that are missing from the backend database
      const remoteIds = new Set(remoteCourses.map((c: any) => String(c.id).toLowerCase()));
      const unsyncedLocal = coursesRef.current.filter(
        (c) =>
          c &&
          c.id &&
          !DEMO_COURSE_IDS.has(c.id) &&
          !MOCK_COURSE_IDS.has(c.id) &&
          !remoteIds.has(c.id.toLowerCase()) &&
          (currentUser.role === 'lecturer' ||
            c.lecturerId?.toLowerCase() === currentUser.id.toLowerCase())
      );
      for (const localCourse of unsyncedLocal) {
        syncWithBackendApi(
          '/api/courses',
          'POST',
          {
            ...localCourse,
            role: 'lecturer',
          },
          currentUser
        ).catch(() => { });
        saveCourseToFirestore(localCourse).catch(() => { });
      }
    }
    if (Array.isArray(annRes?.announcements)) {
      const remoteAnns = annRes.announcements.filter(
        (a: any) =>
          a &&
          typeof a.id === 'string' &&
          !MOCK_ANNOUNCEMENT_IDS.has(a.id) &&
          typeof a.courseId === 'string' &&
          !MOCK_COURSE_IDS.has(a.courseId) &&
          !DEMO_COURSE_IDS.has(a.courseId)
      );
      setAnnouncements((prev) => {
        const map = new Map<string, CourseAnnouncement>();
        for (const a of prev) {
          if (!DEMO_COURSE_IDS.has(a.courseId)) map.set(a.id, a);
        }
        for (const a of remoteAnns) {
          map.set(a.id, a);
        }
        return Array.from(map.values());
      });
    }
    if (Array.isArray(asgnRes?.assignments)) {
      const remoteAsgs = asgnRes.assignments.filter(
        (a: any) =>
          a &&
          typeof a.id === 'string' &&
          !MOCK_ASSIGNMENT_IDS.has(a.id) &&
          typeof a.courseId === 'string' &&
          !MOCK_COURSE_IDS.has(a.courseId) &&
          !DEMO_COURSE_IDS.has(a.courseId)
      );
      setAssignments((prev) => {
        const map = new Map<string, ClassworkAssignment>();
        for (const a of prev) {
          if (!DEMO_COURSE_IDS.has(a.courseId)) map.set(a.id, a);
        }
        for (const a of remoteAsgs) {
          map.set(a.id, a);
        }
        return Array.from(map.values());
      });
    }
  }, [currentUser?.id, isDemoMode]);

  useEffect(() => {
    refreshCourses();
    if (!currentUser || isDemoAccount(currentUser)) return;
    const interval = setInterval(() => {
      refreshCourses();
    }, 8_000);
    return () => clearInterval(interval);
  }, [refreshCourses, currentUser]);

  // Poll live rooms from backend
  useEffect(() => {
    let active = true;
    const fetchLiveRooms = async () => {
      try {
        const res = await fetch(`${BACKEND_API_BASE}/api/rooms`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data)) {
          setLiveRooms(
            isDemoMode
              ? data
              : data.filter((r: any) => {
                  if (!r) return false;
                  const rId = String(r.id || '').toLowerCase();
                  const cId = String(r.courseId || '').toLowerCase();
                  return (
                    rId !== 'csc401-algo' &&
                    rId !== 'csc412-compilers' &&
                    rId !== 'mth304-linear' &&
                    rId !== 'live-studio' &&
                    !DEMO_COURSE_IDS.has(cId)
                  );
                })
          );
        }
      } catch {
        // ignore
      }
    };
    fetchLiveRooms();
    const interval = setInterval(fetchLiveRooms, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isDemoMode]);

  // Classroom & Studio State
  const [activeRoomCode, setActiveRoomCodeState] = useState<string>('');
  const [sessionEndedRoom, setSessionEndedRoom] = useState<string | null>(null);
  const [activeRoomInfo, setActiveRoomInfo] = useState<ActiveRoomMeta>({
    roomId: '',
    title: '',
    courseCode: '',
    courseId: null,
    lecturerName: '',
    hostUserId: null,
    lecturerId: null,
    isLive: false,
    participantCount: 0,
  });

  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [selfSocketId, setSelfSocketId] = useState<string>('');
  const [participants, setParticipants] = useState<StudioParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // WebRTC Audio / Video & In-call state
  const [isMicMuted, setIsMicMuted] = useState<boolean>(true);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [videoMode, setVideoModeState] = useState<VideoMode>('off');
  const [circuitBreakerMessage, setCircuitBreakerMessage] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});

  // Drawing & Vector Canvas
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [redoStack, setRedoStack] = useState<StrokeData[]>([]);
  const [currentTool, setCurrentTool] = useState<StrokeTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#69DB7C');
  const [currentWidth, setCurrentWidth] = useState<number>(3.5);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [totalSlides, setTotalSlides] = useState<number>(1);
  const [laser, setLaser] = useState<LaserPointer | null>(null);

  const setActiveRoomCode = (code: string) => {
    const cleaned = code.trim();
    setActiveRoomCodeState(cleaned);
    setSessionEndedRoom(null);
    setStrokes([]);
    setRedoStack([]);
    setActiveSlideIndex(0);
    setChatMessages([]);
    setTranscriptLog([]);
    setPolls([]);
    setQuestions([]);
    setLaser(null);
  };

  // Telemetry & QoS
  const [networkProfile, setNetworkProfileState] = useState<NetworkProfile>('fast4G');
  const [currentBitrateKbps, setCurrentBitrateKbps] = useState<number>(24.2);
  const [rttMs, setRttMs] = useState<number>(34);
  const [packetLoss, setPacketLoss] = useState<number>(0.2);
  const [chalkDataUsedMb, setChalkDataUsedMb] = useState<number>(1.84);
  const [zoomDataUsedMb, setZoomDataUsedMb] = useState<number>(82.4);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Sync with Firestore room if available
  useEffect(() => {
    if (!firebaseReady || !activeRoomCode || !currentUser?.id) return;

    const unsubRoom = subscribeToFirestoreRoom(activeRoomCode, (roomData) => {
      if (Array.isArray(roomData.strokes)) {
        setStrokes(roomData.strokes);
      }
      if (typeof roomData.activeSlideIndex === 'number') {
        setActiveSlideIndex(roomData.activeSlideIndex);
      }
    });

    return () => unsubRoom();
  }, [activeRoomCode, firebaseReady, currentUser?.id]);

  // WebRTC Signal Helper
  const sendSignal = useCallback(
    (toSocketId: string, signal: unknown) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('webrtc_signal', {
          roomId: activeRoomCode,
          to: toSocketId,
          signal,
        });
      }
    },
    [activeRoomCode]
  );

  // Setup Peer Connection
  const getOrCreatePeerConnection = useCallback(
    (targetSocketId: string): RTCPeerConnection => {
      const existing = peerConnectionsRef.current.get(targetSocketId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionsRef.current.set(targetSocketId, pc);

      // Attach current local tracks if any
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(targetSocketId, { candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(targetSocketId, stream);
          return next;
        });

        // Connect remote audio to an in-memory Audio element so user hears it
        if (event.track.kind === 'audio') {
          const audio = new Audio();
          audio.srcObject = stream;
          audio.autoplay = true;
          audio.play().catch(() => { });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          pc.close();
          peerConnectionsRef.current.delete(targetSocketId);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(targetSocketId);
            return next;
          });
        }
      };

      return pc;
    },
    [sendSignal]
  );

    // Initialize Socket.io connection for Live Studio
  useEffect(() => {
    const isRealUser = Boolean(currentUser && !isDemoAccount(currentUser));
    const uidLower = (currentUser?.id || '').toLowerCase();
    const hasRoleCourse = courses.some((c) => {
      if (c.isArchived || !currentUser) return false;
      if (currentUser.role === 'lecturer') {
        return (
          (c.lecturerId || '').toLowerCase() === uidLower ||
          (Boolean(currentUser.name) &&
            c.lecturerName.toLowerCase() === currentUser.name.toLowerCase()) ||
          Boolean(
            c.members?.some(
              (m) => (m.id || '').toLowerCase() === uidLower && m.role === 'lecturer'
            )
          )
        );
      }
      return (
        Boolean(c.memberIds?.some((id) => id.toLowerCase() === uidLower)) ||
        Boolean(
          c.members?.some(
            (m) =>
              (m.id || '').toLowerCase() === uidLower ||
              (Boolean(m.matricOrStaffId) &&
                Boolean(currentUser.matricOrStaffId) &&
                m.matricOrStaffId === currentUser.matricOrStaffId)
          )
        )
      );
    });

    if (!activeRoomCode || (isRealUser && !hasRoleCourse)) {
      setSocketConnected(false);
      setParticipants([]);
      return;
    }

    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 4000,
      auth: async (cb) => {
        const fbToken = await getCurrentFirebaseIdToken();
        const fallbackToken = currentUser
          ? `mock_firebase_token_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
          : '';
        cb({
          token: fbToken || fallbackToken,
          guestName: guestName || 'Guest Student',
          guestId: currentUser?.id || guestId,
        });
      },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setSelfSocketId(socket.id || '');

      const matchedCourse = courses.find(
        (c) =>
          c.liveRoomCode.toLowerCase() === activeRoomCode.toLowerCase() ||
          c.id.toLowerCase() === activeRoomCode.toLowerCase()
      );

      socket.emit('join_room', {
        roomId: activeRoomCode,
        title: matchedCourse?.title || `Room ${activeRoomCode}`,
        courseCode: matchedCourse?.code || (isDemoAccount(currentUser) ? 'CSC 401' : activeRoomCode.toUpperCase().slice(0, 10)),
        courseId: matchedCourse?.id || null,
        lecturerName: matchedCourse?.lecturerName || (currentUser?.role === 'lecturer' ? currentUser.name : ''),
        lecturerId: matchedCourse?.lecturerId || (currentUser?.role === 'lecturer' ? currentUser.id : undefined),
        userName: currentUser?.name || guestName || 'Guest Student',
        role: currentUser?.role || 'student',
        avatarTag: currentUser?.avatarTag || (guestName ? guestName.slice(0, 2).toUpperCase() : 'GS'),
        isMuted: isMicMuted,
        videoMode,
      });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      // Clean up peer connections on disconnect
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemoteStreams(new Map());
    });

    socket.on('room_state_snapshot', (snapshot) => {
      if (snapshot.selfSocketId) {
        setSelfSocketId(snapshot.selfSocketId);
      }
      if (
        snapshot.stageLayout === 'whiteboard' ||
        snapshot.stageLayout === 'tiled' ||
        snapshot.stageLayout === 'spotlight' ||
        snapshot.stageLayout === 'sidebar'
      ) {
        setStageLayout(snapshot.stageLayout);
      }
      if (Array.isArray(snapshot.strokes)) {
        setStrokes(
          snapshot.strokes.length
            ? snapshot.strokes
            : snapshot.roomId === 'csc401-algo' && (isDemoAccount(currentUser) || !currentUser)
            ? DEMO_BOARD_STROKES
            : []
        );
      }
      if (typeof snapshot.activeSlideIndex === 'number') {
        setActiveSlideIndex(snapshot.activeSlideIndex);
      }
      if (typeof snapshot.totalSlides === 'number') {
        setTotalSlides(snapshot.totalSlides);
      }
      if (Array.isArray(snapshot.participants)) {
        setParticipants(snapshot.participants);
      }
      if (Array.isArray(snapshot.chat)) {
        setChatMessages(snapshot.chat);
      }
      if (typeof snapshot.sessionStartedAt === 'number' && snapshot.sessionStartedAt > 0) {
        setSessionStartedAt(snapshot.sessionStartedAt);
      }
      if (Array.isArray(snapshot.transcript)) {
        setTranscriptLog(snapshot.transcript);
      }
      if (Array.isArray(snapshot.polls) && snapshot.polls.length > 0) {
        setPolls(snapshot.polls);
      }
      if (Array.isArray(snapshot.questions) && snapshot.questions.length > 0) {
        setQuestions(snapshot.questions);
      }
      setActiveRoomInfo({
        roomId: snapshot.roomId || activeRoomCode,
        title: snapshot.title || `Room ${activeRoomCode}`,
        courseCode: snapshot.courseCode || (isDemoAccount(currentUser) ? 'CSC 401' : ''),
        courseId: snapshot.courseId || null,
        lecturerName:
          snapshot.lecturerName ||
          (isDemoAccount(currentUser) ? 'Prof. Adeleke O.' : currentUser?.role === 'lecturer' ? currentUser.name : 'Instructor'),
        hostUserId: snapshot.hostUserId || null,
        lecturerId: snapshot.lecturerId || null,
        isLive: Array.isArray(snapshot.participants) && snapshot.participants.length > 0,
        participantCount: Array.isArray(snapshot.participants) ? snapshot.participants.length : 1,
      });
    });

    socket.on('participants_update', ({ participants: updatedList, lecturerName, hostUserId, lecturerId }) => {
      if (Array.isArray(updatedList)) {
        setParticipants(updatedList);
        const myId = socket.id;
        const myUid = currentUser?.id || guestId;
        const myPeer = updatedList.find(
          (p: StudioParticipant) =>
            (myId && p.socketId === myId) || (myUid && p.id === myUid)
        );
        if (myPeer && !myPeer.handRaised) {
          setIsHandRaised(false);
        }
        setLaser((prev) => {
          if (!prev) return null;
          const laserOwner = updatedList.find(
            (p: StudioParticipant) =>
              p.id === prev.userId || p.socketId === prev.userId || p.name === prev.userName
          );
          if (
            laserOwner &&
            laserOwner.role !== 'lecturer' &&
            !laserOwner.canDraw &&
            !hostSettingsRef.current.useChalkboardAllowed
          ) {
            return null;
          }
          return prev;
        });
        setActiveRoomInfo((prev) => ({
          ...prev,
          lecturerName: lecturerName || prev.lecturerName,
          hostUserId: hostUserId !== undefined ? hostUserId : prev.hostUserId,
          lecturerId: lecturerId !== undefined ? lecturerId : prev.lecturerId,
          isLive: updatedList.length > 0,
          participantCount: updatedList.length,
        }));

        // Initiate WebRTC connections to newly joined peers if we are connected
        updatedList.forEach(async (peer) => {
          if (peer.socketId && peer.socketId !== myId) {
            // Polite peer offer: the peer with greater socket ID initiates offer
            if (myId && myId > peer.socketId && !peerConnectionsRef.current.has(peer.socketId)) {
              const pc = getOrCreatePeerConnection(peer.socketId);
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal(peer.socketId, { description: pc.localDescription?.toJSON() });
              } catch (err) {
                console.warn('[Chalk WebRTC] Error creating offer:', err);
              }
            }
          }
        });
      }
    });

    socket.on('peer_left', ({ socketId }) => {
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('webrtc_signal', async ({ from, signal }) => {
      if (!from || !signal) return;
      const pc = getOrCreatePeerConnection(from);

      try {
        if (signal.description) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.description));
          if (signal.description.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(from, { description: pc.localDescription?.toJSON() });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn('[Chalk WebRTC] Error handling signal:', err);
      }
    });

    socket.on('stroke_delta', (stroke: StrokeData) => {
      setStrokes((prev) => {
        const filtered = prev.filter((s) => s.id !== stroke.id);
        return [...filtered, stroke];
      });
    });

    socket.on('stroke_removed', ({ strokeId }: { strokeId: string }) => {
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    });

    socket.on('clear_canvas', () => {
      setStrokes([]);
      setRedoStack([]);
    });

    socket.on('change_slide', ({ slideIndex, totalSlides: remoteTotal }) => {
      if (typeof slideIndex === 'number') {
        setActiveSlideIndex(slideIndex);
      }
      if (typeof remoteTotal === 'number') {
        setTotalSlides(remoteTotal);
      }
    });

    socket.on('laser_pointer', (incomingLaser: LaserPointer) => {
      setLaser(incomingLaser.active ? incomingLaser : null);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('studio_reaction', (reaction: FloatingReaction) => {
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    });

    socket.on('poll_update', (incomingPolls: StudioPoll[]) => {
      if (Array.isArray(incomingPolls)) {
        setPolls(incomingPolls);
      }
    });

    socket.on('question_update', (incomingQuestions: StudioQuestion[]) => {
      if (Array.isArray(incomingQuestions)) {
        setQuestions(incomingQuestions);
      }
    });

    socket.on('breakout_update', (session: BreakoutSession | null) => {
      setBreakoutSession(session);
    });

    socket.on('stage_layout_changed', ({ stageLayout: remoteLayout }: { stageLayout: 'whiteboard' | 'tiled' | 'spotlight' | 'sidebar' }) => {
      if (remoteLayout) {
        setStageLayout(remoteLayout);
      }
    });

    socket.on('host_controls_update', (incomingControls: HostControlSettings) => {
      setHostSettings((prev) => ({ ...prev, ...incomingControls }));
      if (incomingControls.useChalkboardAllowed === false) {
        setLaser(null);
      }
    });

    socket.on('caption_stream', (payload: any) => {
      if (!payload || !payload.text) return;
      const speaker = payload.speakerName || payload.speaker || 'Speaker';
      const text = String(payload.text).trim();
      if (!text) return;
      setActiveCaptions((prev) => [...prev.slice(-3), { speaker, text }]);
      const entry: TranscriptSegment = {
        id: payload.id || `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        roomId: payload.roomId || activeRoomCode,
        speakerId: payload.speakerId || '',
        speakerName: speaker,
        speakerRole: payload.speakerRole === 'lecturer' ? 'lecturer' : 'student',
        text,
        timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
        offsetMs:
          typeof payload.offsetMs === 'number'
            ? payload.offsetMs
            : Math.max(0, Date.now() - sessionStartedAt),
      };
      setTranscriptLog((prev) => {
        if (prev.some((item) => item.id === entry.id)) return prev;
        return [...prev.slice(-199), entry];
      });
    });

    socket.on('mute_all_peers', () => {
      if (currentUser?.role !== 'lecturer' && !isMicMuted) {
        toggleMic();
      }
    });

    socket.on('hand_lowered', (payload: { socketId?: string; userId?: string; all?: boolean }) => {
      if (!payload) return;
      if (payload.all) {
        setParticipants((prev) => prev.map((p) => ({ ...p, handRaised: false })));
        setIsHandRaised(false);
        return;
      }
      const targetSocketId = payload.socketId;
      const targetUserId = payload.userId;
      setParticipants((prev) =>
        prev.map((p) =>
          (targetSocketId && (p.socketId === targetSocketId || p.id === targetSocketId)) ||
          (targetUserId && (p.id === targetUserId || p.socketId === targetUserId))
            ? { ...p, handRaised: false }
            : p
        )
      );
      const mySocketId = socket.id;
      const myUid = currentUser?.id || guestId;
      if (
        (targetSocketId && (targetSocketId === mySocketId || targetSocketId === myUid)) ||
        (targetUserId && (targetUserId === myUid || targetUserId === mySocketId))
      ) {
        setIsHandRaised(false);
      }
    });

    socket.on('session_ended', ({ roomId, endedBy }) => {
      console.log(`[Chalk Studio] Session ended for room "${roomId}" by ${endedBy || 'lecturer'}`);
      const targetRoom = roomId || activeRoomCode;
      setActiveRoomInfo((prev) => ({
        ...prev,
        isLive: false,
        participantCount: 0,
      }));
      setParticipants([]);
      setStrokes([]);
      setRedoStack([]);
      setActiveSlideIndex(0);
      setChatMessages([]);
      setTranscriptLog([]);
      setPolls([]);
      setQuestions([]);
      setLaser(null);
      setLiveRooms((prev) => prev.filter((r) => r.id.toLowerCase() !== targetRoom.toLowerCase()));
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemoteStreams(new Map());
      setSessionEndedRoom(targetRoom);
    });

    socket.on('rooms_update', (incomingRooms: LiveRoomSummary[]) => {
      if (Array.isArray(incomingRooms)) {
        setLiveRooms(incomingRooms);
      }
    });

    return () => {
      if (activeRoomCode) {
        socket.emit('leave_room', { roomId: activeRoomCode });
      }
      socket.disconnect();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [activeRoomCode, getOrCreatePeerConnection, sendSignal]);

  // Keep room membership role/identity synced if user profile or persona changes while in a room
  useEffect(() => {
    if (!activeRoomCode || !socketRef.current?.connected) return;
    const matchedCourse = courses.find(
      (c) =>
        c.liveRoomCode.toLowerCase() === activeRoomCode.toLowerCase() ||
        c.id.toLowerCase() === activeRoomCode.toLowerCase()
    );
    socketRef.current.emit('join_room', {
      roomId: activeRoomCode,
      title: matchedCourse?.title || `Room ${activeRoomCode}`,
      courseCode:
        matchedCourse?.code ||
        (isDemoAccount(currentUser) ? 'CSC 401' : activeRoomCode.toUpperCase().slice(0, 10)),
      courseId: matchedCourse?.id || null,
      lecturerName:
        matchedCourse?.lecturerName ||
        (currentUser?.role === 'lecturer' ? currentUser.name : ''),
      lecturerId:
        matchedCourse?.lecturerId ||
        (currentUser?.role === 'lecturer' ? currentUser.id : undefined),
      userName: currentUser?.name || guestName || 'Guest Student',
      role: currentUser?.role || 'student',
      avatarTag:
        currentUser?.avatarTag ||
        (guestName ? guestName.slice(0, 2).toUpperCase() : 'GS'),
      isMuted: isMicMuted,
      videoMode,
    });
  }, [activeRoomCode, currentUser?.id, currentUser?.role, currentUser?.name]);

  // Audio setup & voice activity detection
  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Add audio tracks to all existing peer connections
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicMuted;
        peerConnectionsRef.current.forEach((pc) => {
          pc.addTrack(audioTrack, stream);
        });
      }

      // Voice activity detector
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const pcmData = new Uint8Array(analyser.frequencyBinCount);
        const checkSpeech = () => {
          if (!analyserRef.current || isMicMuted) {
            setSpeakingMap((prev) => (prev[selfSocketId] ? { ...prev, [selfSocketId]: false } : prev));
            return;
          }
          analyserRef.current.getByteFrequencyData(pcmData);
          const sum = pcmData.reduce((a, b) => a + b, 0);
          const avgVolume = sum / pcmData.length;
          const isSpeakingNow = avgVolume > 18;

          setSpeakingMap((prev) => {
            if (prev[selfSocketId] !== isSpeakingNow) {
              return { ...prev, [selfSocketId]: isSpeakingNow };
            }
            return prev;
          });
        };

        const interval = setInterval(checkSpeech, 300);
        return () => clearInterval(interval);
      } catch {
        // Voice analyser fallback
      }
    } catch (err) {
      console.warn('[Chalk Audio] Could not access microphone:', err);
    }
  }, [isMicMuted, selfSocketId]);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    const isMeLecturer = currentUser?.role === 'lecturer';
    const myParticipant = participants.find((p) => p.socketId === selfSocketId || p.id === currentUser?.id);
    const hasMicAccess = isMeLecturer || hostSettings.turnMicAllowed || Boolean(myParticipant?.canSpeak);

    if (isMicMuted && !hasMicAccess) {
      alert('Microphone access is restricted by the lecturer. Raise your hand to request to speak.');
      return;
    }

    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);

    if (!localStreamRef.current && !nextMuted) {
      await startAudio();
    } else if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('update_status', {
        roomId: activeRoomCode,
        isMuted: nextMuted,
      });
    }
  }, [activeRoomCode, currentUser?.id, currentUser?.role, hostSettings.turnMicAllowed, isMicMuted, participants, selfSocketId, startAudio]);

  // Toggle Hand Raise
  const toggleHandRaised = useCallback(() => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    const myUid = currentUser?.id || guestId;
    setParticipants((prev) =>
      prev.map((p) =>
        p.socketId === selfSocketId || (myUid && p.id === myUid)
          ? { ...p, handRaised: next }
          : p
      )
    );
    const payload = {
      roomId: activeRoomCode,
      socketId: selfSocketId,
      userId: myUid,
      handRaised: next,
    };
    socketRef.current?.emit('update_status', payload);
    try {
      window.dispatchEvent(
        new CustomEvent('chalk:board:tx', {
          detail: { event: 'update_status', payload, reliable: true },
        })
      );
    } catch { }
    try {
      boardChannelRef.current?.postMessage({ event: 'update_status', payload });
    } catch { }
  }, [activeRoomCode, currentUser?.id, guestId, isHandRaised, selfSocketId]);

  // Lower student hand (for lecturers)
  const lowerHand = useCallback(
    (socketId: string) => {
      const targetPeer = participants.find(
        (p) => p.socketId === socketId || p.id === socketId
      );
      const targetUserId = targetPeer?.id || socketId;
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === socketId ||
          p.id === socketId ||
          (targetUserId && (p.id === targetUserId || p.socketId === targetUserId))
            ? { ...p, handRaised: false }
            : p
        )
      );
      const myUid = currentUser?.id || guestId;
      if (
        socketId === selfSocketId ||
        socketId === myUid ||
        targetUserId === selfSocketId ||
        targetUserId === myUid
      ) {
        setIsHandRaised(false);
      }
      const payload = {
        roomId: activeRoomCode,
        socketId: targetPeer?.socketId || socketId,
        userId: targetUserId,
      };
      socketRef.current?.emit('lower_hand', payload);
      try {
        window.dispatchEvent(
          new CustomEvent('chalk:board:tx', {
            detail: { event: 'lower_hand', payload, reliable: true },
          })
        );
      } catch { }
      try {
        boardChannelRef.current?.postMessage({ event: 'lower_hand', payload });
      } catch { }
    },
    [activeRoomCode, currentUser?.id, guestId, participants, selfSocketId]
  );

  // Send In-call Chat Message
  const sendChatMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !socketRef.current?.connected) return;
      socketRef.current.emit('chat_message', {
        roomId: activeRoomCode,
        text: trimmed,
      });
    },
    [activeRoomCode]
  );

  // Video Mode Change & Secondary Camera Streaming
  const setVideoMode = useCallback(
    async (mode: VideoMode) => {
      if (networkProfile === 'crisis2G' && mode !== 'off') {
        setCircuitBreakerMessage(
          'Anti-Lag Shield active: Camera stream suspended under 2G edge conditions. Voice & Vector Blackboard remain prioritized.'
        );
        return;
      }

      setVideoModeState(mode);

      if (socketRef.current?.connected) {
        socketRef.current.emit('update_video_mode', {
          roomId: activeRoomCode,
          mode,
        });
      }

      if (mode === 'off') {
        // Stop any local video track
        localStreamRef.current?.getVideoTracks().forEach((t) => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
        setLocalStream(localStreamRef.current ? new MediaStream(localStreamRef.current) : null);
      } else {
        // Request low/standard resolution camera
        try {
          const videoConstraints =
            mode === 'low'
              ? { width: 320, height: 180, frameRate: 15 }
              : { width: 640, height: 480, frameRate: 24 };

          const camStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });

          const newVideoTrack = camStream.getVideoTracks()[0];
          if (newVideoTrack) {
            if (localStreamRef.current) {
              localStreamRef.current.addTrack(newVideoTrack);
            } else {
              localStreamRef.current = camStream;
            }
            setLocalStream(new MediaStream(localStreamRef.current));

            // Replace or add track to peer connections
            peerConnectionsRef.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (sender) {
                sender.replaceTrack(newVideoTrack);
              } else if (localStreamRef.current) {
                pc.addTrack(newVideoTrack, localStreamRef.current);
              }
            });
          }
        } catch (err) {
          console.warn('[Chalk Video] Camera request denied or unavailable:', err);
        }
      }
    },
    [activeRoomCode, networkProfile]
  );

  // Network Simulation & Circuit Breaker
  const setNetworkProfile = (profile: NetworkProfile) => {
    setNetworkProfileState(profile);
    if (profile === 'crisis2G' && videoMode !== 'off') {
      setVideoMode('off');
      setCircuitBreakerMessage(
        'Anti-Lag Shield triggered: 2G packet loss detected (14.2%). Secondary camera paused to protect Opus voice and blackboard strokes.'
      );
    }
  };

  const dismissCircuitBreaker = () => setCircuitBreakerMessage(null);

  // Telemetry Ping/Pong & Periodic Reporting
  useEffect(() => {
    const interval = setInterval(() => {
      let baseBitrate = 24.0;
      if (videoMode === 'low') baseBitrate += 120.0;
      if (videoMode === 'standard') baseBitrate += 750.0;
      if (videoMode === 'hd') baseBitrate += 1500.0;

      const jitter = (Math.random() - 0.5) * 3.2;
      const nextBitrate = Math.max(14.5, baseBitrate + jitter);
      setCurrentBitrateKbps(nextBitrate);

      let curRtt = 32;
      let curLoss = 0.2;
      if (networkProfile === 'fast4G') {
        curRtt = Math.round(28 + Math.random() * 12);
        curLoss = Number((Math.random() * 0.4).toFixed(1));
      } else if (networkProfile === 'unstable3G') {
        curRtt = Math.round(85 + Math.random() * 35);
        curLoss = Number((1.8 + Math.random() * 2.2).toFixed(1));
      } else {
        curRtt = Math.round(165 + Math.random() * 55);
        curLoss = Number((11.5 + Math.random() * 4.5).toFixed(1));
      }

      setRttMs(curRtt);
      setPacketLoss(curLoss);
      setChalkDataUsedMb((prev) => prev + nextBitrate / 8000 / 2);
      setZoomDataUsedMb((prev) => prev + 1200 / 8000 / 2);

      // Report telemetry to server
      if (socketRef.current?.connected) {
        socketRef.current.emit('qos_report', {
          rttMs: curRtt,
          packetLoss: curLoss,
          audioKbps: 24.0,
          videoKbps: videoMode === 'low' ? 120.0 : videoMode === 'hd' ? 1500.0 : videoMode === 'standard' ? 750.0 : 0,
          telemetryKbps: 3.5,
          videoMode,
          peers: participants.length,
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [networkProfile, participants.length, videoMode]);

  // Multi-transport Chalkboard Broadcast Helper (Socket.io + LiveKit WebRTC DataChannel + BroadcastChannel)
  const boardChannelRef = useRef<BroadcastChannel | null>(null);
  const strokesRef = useRef<StrokeData[]>(strokes);
  strokesRef.current = strokes;
  const activeSlideIndexRef = useRef<number>(activeSlideIndex);
  activeSlideIndexRef.current = activeSlideIndex;
  const totalSlidesRef = useRef<number>(totalSlides);
  totalSlidesRef.current = totalSlides;
  const stageLayoutRef = useRef(stageLayout);
  stageLayoutRef.current = stageLayout;
  const hostSettingsRef = useRef(hostSettings);
  hostSettingsRef.current = hostSettings;

  const emitChalkboardPacket = useCallback(
    (event: string, payload: any, reliable = true) => {
      socketRef.current?.emit(event, payload);
      try {
        window.dispatchEvent(
          new CustomEvent('chalk:board:tx', {
            detail: { event, payload, reliable },
          })
        );
      } catch {
        // ignore
      }
      try {
        boardChannelRef.current?.postMessage({ event, payload });
      } catch {
        // ignore
      }
    },
    []
  );

  // Listen to LiveKit DataChannel & BroadcastChannel chalkboard events
  useEffect(() => {
    if (!activeRoomCode) return;

    const handleIncomingBoardEvent = (event: string, payload: any) => {
      if (!payload) return;
      switch (event) {
        case 'stroke_delta': {
          const stroke = payload as StrokeData;
          if (!stroke || !stroke.id) return;
          setStrokes((prev) => {
            const filtered = prev.filter((s) => s.id !== stroke.id);
            return [...filtered, stroke];
          });
          break;
        }
        case 'remove_stroke':
        case 'stroke_removed': {
          const strokeId = payload.strokeId;
          if (strokeId) {
            setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
          }
          break;
        }
        case 'clear_canvas': {
          setStrokes([]);
          setRedoStack([]);
          break;
        }
        case 'change_slide': {
          if (typeof payload.slideIndex === 'number') {
            setActiveSlideIndex(payload.slideIndex);
          }
          if (typeof payload.totalSlides === 'number') {
            setTotalSlides(payload.totalSlides);
          }
          break;
        }
        case 'laser_pointer': {
          const incomingLaser = payload as LaserPointer;
          setLaser(incomingLaser.active ? incomingLaser : null);
          break;
        }
        case 'change_stage_layout':
        case 'stage_layout_changed': {
          if (payload.stageLayout) {
            setStageLayout(payload.stageLayout);
          }
          break;
        }
        case 'grant_permission': {
          setParticipants((prev) =>
            prev.map((p) =>
              p.socketId === payload.socketId ||
              (payload.userId && p.id === payload.userId)
                ? {
                    ...p,
                    ...(typeof payload.canDraw === 'boolean'
                      ? { canDraw: payload.canDraw }
                      : {}),
                    ...(typeof payload.canSpeak === 'boolean'
                      ? { canSpeak: payload.canSpeak }
                      : {}),
                  }
                : p
            )
          );
          if (payload.canDraw === false) {
            setLaser(null);
          }
          break;
        }
        case 'update_status': {
          if (typeof payload.handRaised === 'boolean') {
            setParticipants((prev) =>
              prev.map((p) =>
                (payload.socketId && (p.socketId === payload.socketId || p.id === payload.socketId)) ||
                (payload.userId && (p.id === payload.userId || p.socketId === payload.userId))
                  ? { ...p, handRaised: payload.handRaised }
                  : p
              )
            );
          }
          break;
        }
        case 'lower_hand':
        case 'hand_lowered': {
          if (payload.all) {
            setParticipants((prev) => prev.map((p) => ({ ...p, handRaised: false })));
            setIsHandRaised(false);
          } else {
            const targetSocketId = payload.socketId;
            const targetUserId = payload.userId;
            setParticipants((prev) =>
              prev.map((p) =>
                (targetSocketId && (p.socketId === targetSocketId || p.id === targetSocketId)) ||
                (targetUserId && (p.id === targetUserId || p.socketId === targetUserId))
                  ? { ...p, handRaised: false }
                  : p
              )
            );
            const myUid = currentUser?.id || guestId;
            if (
              (targetSocketId && (targetSocketId === selfSocketId || targetSocketId === myUid)) ||
              (targetUserId && (targetUserId === myUid || targetUserId === selfSocketId))
            ) {
              setIsHandRaised(false);
            }
          }
          break;
        }
        case 'lower_all_hands': {
          setParticipants((prev) => prev.map((p) => ({ ...p, handRaised: false })));
          setIsHandRaised(false);
          break;
        }
        case 'update_host_controls':
        case 'host_controls_update': {
          setHostSettings((prev) => ({ ...prev, ...payload }));
          if (payload.useChalkboardAllowed === false) {
            setLaser(null);
          }
          break;
        }
        case 'caption_stream': {
          if (payload?.text) {
            const speaker = payload.speakerName || payload.speaker || 'Speaker';
            const text = String(payload.text).trim();
            if (text) {
              setActiveCaptions((prev) => [...prev.slice(-3), { speaker, text }]);
              const entry: TranscriptSegment = {
                id: payload.id || `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                roomId: payload.roomId || activeRoomCode,
                speakerId: payload.speakerId || '',
                speakerName: speaker,
                speakerRole: payload.speakerRole === 'lecturer' ? 'lecturer' : 'student',
                text,
                timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
                offsetMs:
                  typeof payload.offsetMs === 'number'
                    ? payload.offsetMs
                    : Math.max(0, Date.now() - sessionStartedAt),
              };
              setTranscriptLog((prev) => {
                if (prev.some((item) => item.id === entry.id)) return prev;
                return [...prev.slice(-199), entry];
              });
            }
          }
          break;
        }
        case 'board_snapshot': {
          if (Array.isArray(payload.strokes)) {
            setStrokes(payload.strokes);
          }
          if (typeof payload.activeSlideIndex === 'number') {
            setActiveSlideIndex(payload.activeSlideIndex);
          }
          if (typeof payload.totalSlides === 'number') {
            setTotalSlides(payload.totalSlides);
          }
          if (payload.stageLayout) {
            setStageLayout(payload.stageLayout);
          }
          if (payload.hostSettings) {
            setHostSettings((prev) => ({ ...prev, ...payload.hostSettings }));
          }
          break;
        }
        case 'request_board_snapshot': {
          const isHost = currentUser?.role === 'lecturer';
          const isHostOrHasBoard = isHost || strokesRef.current.length > 0;
          if (isHostOrHasBoard) {
            const snapPayload = {
              roomId: activeRoomCode,
              strokes: strokesRef.current,
              activeSlideIndex: activeSlideIndexRef.current,
              totalSlides: totalSlidesRef.current,
              ...(isHost ? { stageLayout: stageLayoutRef.current } : {}),
              hostSettings: hostSettingsRef.current,
            };
            try {
              window.dispatchEvent(
                new CustomEvent('chalk:board:tx', {
                  detail: {
                    event: 'board_snapshot',
                    payload: snapPayload,
                    reliable: true,
                  },
                })
              );
            } catch { }
            try {
              boardChannelRef.current?.postMessage({
                event: 'board_snapshot',
                payload: snapPayload,
              });
            } catch { }
          }
          break;
        }
      }
    };

    const onWindowRx = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.event) {
        handleIncomingBoardEvent(detail.event, detail.payload);
      }
    };
    window.addEventListener('chalk:board:rx', onWindowRx);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(`chalk_room_${activeRoomCode.toLowerCase()}`);
        boardChannelRef.current = bc;
        bc.onmessage = (ev) => {
          if (ev.data?.event) {
            handleIncomingBoardEvent(ev.data.event, ev.data.payload);
          }
        };
        bc.postMessage({
          event: 'request_board_snapshot',
          payload: { roomId: activeRoomCode },
        });
      } catch {
        // ignore if BroadcastChannel unsupported
      }
    }

    return () => {
      window.removeEventListener('chalk:board:rx', onWindowRx);
      if (bc) {
        bc.close();
        boardChannelRef.current = null;
      }
    };
  }, [activeRoomCode, currentUser?.role]);

  // Stroke operations
  const streamStroke = useCallback(
    (stroke: StrokeData) => {
      const targetRoom = activeRoomCode || stroke.roomId;
      if (!targetRoom) return;
      const tagged: StrokeData = {
        ...stroke,
        roomId: targetRoom,
        userId: currentUser?.id || stroke.userId || guestId,
        userName: currentUser?.name || guestName || stroke.userName || 'Participant',
        slideIndex: activeSlideIndex,
        isComplete: false,
      };
      emitChalkboardPacket('stroke_delta', tagged, false);
    },
    [activeRoomCode, activeSlideIndex, currentUser?.id, currentUser?.name, emitChalkboardPacket, guestId, guestName]
  );

  const commitStroke = (stroke: StrokeData) => {
    const targetRoom = activeRoomCode || stroke.roomId;
    const tagged: StrokeData = {
      ...stroke,
      roomId: targetRoom,
      userId: currentUser?.id || stroke.userId || guestId,
      userName: currentUser?.name || guestName || stroke.userName || 'Participant',
      slideIndex: activeSlideIndex,
      isComplete: true,
    };
    setStrokes((prev) => {
      const filtered = prev.filter((s) => s.id !== tagged.id);
      const updated = [...filtered, tagged];
      persistRoomStateToFirestore(targetRoom, { strokes: updated }).catch(() => { });
      return updated;
    });
    setRedoStack([]);
    emitChalkboardPacket('stroke_delta', tagged, true);
  };

  const undoStroke = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [last, ...r]);
      const updated = prev.slice(0, -1);
      persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => { });
      if (last.id) {
        emitChalkboardPacket(
          'remove_stroke',
          {
            roomId: activeRoomCode,
            strokeId: last.id,
          },
          true
        );
      }
      return updated;
    });
  };

  const redoStroke = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      const tagged = { ...next, roomId: activeRoomCode || next.roomId, isComplete: true };
      setStrokes((s) => {
        const filtered = s.filter((st) => st.id !== tagged.id);
        const updated = [...filtered, tagged];
        persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => { });
        emitChalkboardPacket('stroke_delta', tagged, true);
        return updated;
      });
      return rest;
    });
  };

  const clearCanvas = () => {
    setStrokes([]);
    setRedoStack([]);
    persistRoomStateToFirestore(activeRoomCode, { strokes: [] }).catch(() => { });
    emitChalkboardPacket(
      'clear_canvas',
      {
        roomId: activeRoomCode,
        userId: currentUser?.id || 'usr_guest',
      },
      true
    );
  };

  const nextSlide = () => {
    const next = activeSlideIndex + 1;
    if (next < totalSlides) {
      setActiveSlideIndex(next);
      persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: next }).catch(() => { });
      emitChalkboardPacket(
        'change_slide',
        {
          roomId: activeRoomCode,
          slideIndex: next,
          totalSlides,
        },
        true
      );
    }
  };

  const prevSlide = () => {
    const next = Math.max(0, activeSlideIndex - 1);
    setActiveSlideIndex(next);
    persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: next }).catch(() => { });
    emitChalkboardPacket(
      'change_slide',
      {
        roomId: activeRoomCode,
        slideIndex: next,
        totalSlides,
      },
      true
    );
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setActiveSlideIndex(index);
      persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: index }).catch(() => { });
      emitChalkboardPacket(
        'change_slide',
        {
          roomId: activeRoomCode,
          slideIndex: index,
          totalSlides,
        },
        true
      );
    }
  };

  const addSlide = useCallback(() => {
    const next = totalSlides;
    const nextTotal = totalSlides + 1;
    setTotalSlides(nextTotal);
    setActiveSlideIndex(next);
    persistRoomStateToFirestore(activeRoomCode, {
      activeSlideIndex: next,
    }).catch(() => { });
    emitChalkboardPacket(
      'change_slide',
      {
        roomId: activeRoomCode,
        slideIndex: next,
        totalSlides: nextTotal,
      },
      true
    );
  }, [activeRoomCode, emitChalkboardPacket, totalSlides]);

  const grantParticipantPermission = useCallback(
    (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => {
      const targetPeer = participants.find(
        (p) => p.socketId === socketId || p.id === socketId
      );
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === socketId || p.id === socketId ? { ...p, ...permissions } : p
        )
      );
      if (permissions.canDraw === false) {
        setLaser(null);
        emitChalkboardPacket(
          'laser_pointer',
          {
            roomId: activeRoomCode,
            userId: targetPeer?.id || socketId,
            userName: targetPeer?.name || 'Student',
            x: 0,
            y: 0,
            active: false,
          },
          true
        );
      }
      emitChalkboardPacket(
        'grant_permission',
        {
          roomId: activeRoomCode,
          socketId,
          userId: targetPeer?.id || socketId,
          ...permissions,
        },
        true
      );
    },
    [activeRoomCode, emitChalkboardPacket, participants]
  );

  const broadcastStageLayout = useCallback(
    (layout: 'whiteboard' | 'tiled' | 'spotlight' | 'sidebar', roomId?: string) => {
      setStageLayout(layout);
      const targetRoom = roomId || activeRoomCode;
      if (targetRoom) {
        emitChalkboardPacket(
          'change_stage_layout',
          {
            roomId: targetRoom,
            stageLayout: layout,
          },
          true
        );
      }
    },
    [activeRoomCode, emitChalkboardPacket]
  );

  const emitLaser = (x: number, y: number, active: boolean) => {
    const pointer: LaserPointer = {
      roomId: activeRoomCode,
      userId: currentUser?.id || 'usr_guest',
      userName: currentUser?.name || guestName || 'Campus User',
      x,
      y,
      active,
    };
    setLaser(active ? pointer : null);
    emitChalkboardPacket('laser_pointer', pointer, !active);
  };

  // Course management helpers
  const joinCourseByCode = async (code: string): Promise<CourseModel | null> => {
    const rawTrimmed = code.trim();
    if (!rawTrimmed) return null;
    const normalized = rawTrimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    const studentMember = currentUser
      ? {
        id: currentUser.id,
        name: currentUser.name,
        avatarTag: currentUser.avatarTag,
        role: 'student' as const,
        matricOrStaffId: currentUser.matricOrStaffId,
      }
      : {
        id: `guest_${Date.now()}`,
        name: guestName || 'Campus Student',
        avatarTag: 'GS',
        role: 'student' as const,
        matricOrStaffId: 'GUEST/STUDENT',
      };

    const enrichCourseWithStudent = (target: CourseModel): CourseModel => {
      const currentMembers = target.members || [];
      const studentIdLower = studentMember.id.toLowerCase();
      const alreadyMember = currentMembers.some(
        (m) => (m.id || '').toLowerCase() === studentIdLower && m.role === 'student'
      );
      const currentMemberIds = target.memberIds || [];
      const alreadyInIds = currentMemberIds.some(
        (id) => id.toLowerCase() === studentIdLower
      );
      const updatedMembers = alreadyMember
        ? currentMembers
        : [...currentMembers, studentMember];
      const updatedMemberIds = alreadyInIds
        ? currentMemberIds
        : [...currentMemberIds, studentMember.id];
      const studentCount = updatedMembers.filter((m) => m.role === 'student').length;
      return {
        ...target,
        members: updatedMembers,
        memberIds: updatedMemberIds,
        enrolledCount: Math.max(target.enrolledCount || 0, updatedMemberIds.length, studentCount),
      };
    };

    if (!isDemoMode) {
      const res = await syncWithBackendApi('/api/courses/join', 'POST', {
        code: rawTrimmed,
        studentId: studentMember.id,
        studentName: studentMember.name,
        avatarTag: studentMember.avatarTag,
        matricOrStaffId: studentMember.matricOrStaffId,
        role: 'student',
      });
      if (res?.course) {
        const joinedCourse = enrichCourseWithStudent(res.course as CourseModel);
        setCourses((prev) => [
          joinedCourse,
          ...prev.filter((c) => c.id !== joinedCourse.id),
        ]);
        saveCourseToFirestore(joinedCourse).catch(() => { });
        return joinedCourse;
      }
    }

    const existing =
      courses.find(
        (c) =>
          !c.isArchived &&
          (c.id.toLowerCase() === rawTrimmed.toLowerCase() ||
            c.liveRoomCode.toLowerCase() === rawTrimmed.toLowerCase())
      ) ||
      courses.find(
        (c) =>
          !c.isArchived &&
          c.code.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
      );

    if (existing) {
      const updatedCourse = enrichCourseWithStudent(existing);
      setCourses((prev) =>
        prev.map((c) => (c.id === existing.id ? updatedCourse : c))
      );
      if (!isDemoMode) {
        saveCourseToFirestore(updatedCourse).catch(() => { });
        syncWithBackendApi(`/api/courses/${updatedCourse.id}/settings`, 'PATCH', {
          memberIds: updatedCourse.memberIds,
          members: updatedCourse.members,
          enrolledCount: updatedCourse.enrolledCount,
        }).catch(() => { });
      }
      return updatedCourse;
    }

    return null;
  };

  const createCourse = async ({
    code,
    title,
    scheduleTime,
    department,
    section,
    room,
    subject,
  }: {
    code: string;
    title: string;
    scheduleTime: string;
    department: string;
    section?: string;
    room?: string;
    subject?: string;
  }): Promise<CourseModel> => {
    const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedId = `${slug || 'course'}-${Math.random().toString(36).slice(2, 6)}`;
    const generatedRoomCode = `${slug || 'room'}-${Math.random().toString(36).slice(2, 8)}`;
    const lecturerMember = {
      id: currentUser?.id || 'usr_lecturer_01',
      name: currentUser?.name || 'Lecturer',
      avatarTag: currentUser?.avatarTag || 'LC',
      role: 'lecturer' as const,
      matricOrStaffId: currentUser?.matricOrStaffId || '',
    };

    const newCourse: CourseModel = {
      id: generatedId,
      code: code.toUpperCase(),
      title,
      lecturerName: currentUser?.name || 'Lecturer',
      lecturerId: currentUser?.id || 'usr_lecturer_01',
      accentHex: '#059669',
      hasLiveSession: true,
      liveRoomCode: generatedRoomCode,
      enrolledCount: 0,
      memberIds: [],
      scheduleTime: scheduleTime || 'Schedule TBA',
      department: department || currentUser?.department || 'General',
      ...(section ? { section } : {}),
      ...(room ? { room } : {}),
      ...(subject ? { subject } : {}),
      members: [lecturerMember],
    };

    if (!isDemoMode) {
      const res = await syncWithBackendApi('/api/courses', 'POST', {
        ...newCourse,
        role: 'lecturer',
      });
      if (res?.course) {
        const enriched: CourseModel = {
          ...newCourse,
          ...res.course,
          lecturerId: currentUser?.id || res.course.lecturerId || newCourse.lecturerId,
          lecturerName: currentUser?.name || res.course.lecturerName || newCourse.lecturerName,
          members:
            Array.isArray(res.course.members) && res.course.members.length > 0
              ? res.course.members
              : [lecturerMember],
          ...(section ? { section } : {}),
          ...(room ? { room } : {}),
          ...(subject ? { subject } : {}),
        };
        setCourses((prev) => [
          enriched,
          ...prev.filter((c) => c.id !== enriched.id),
        ]);
        saveCourseToFirestore(enriched).catch(() => { });
        return enriched;
      }
    }

    setCourses((prev) => [newCourse, ...prev.filter((c) => c.id !== newCourse.id)]);
    if (!isDemoMode) {
      saveCourseToFirestore(newCourse).catch(() => { });
    }
    return newCourse;
  };

  const addAnnouncement = (
    courseId: string,
    content: string,
    isLiveNotice = false,
    attachments: any[] = []
  ) => {
    const newAnn: CourseAnnouncement = {
      id: `ann_${Date.now()}`,
      courseId,
      authorName: currentUser?.name || 'Campus User',
      authorRole: currentUser?.role || 'student',
      timestamp: 'Just now',
      content,
      isLiveNotice,
      attachments,
      commentsCount: 0,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    if (!isDemoMode) {
      saveAnnouncementToFirestore(newAnn).catch(() => { });
      syncWithBackendApi('/api/announcements', 'POST', {
        courseId,
        content,
        isLiveNotice,
        attachments,
      });
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    setAnnouncementComments((prev) => {
      const copy = { ...prev };
      delete copy[announcementId];
      return copy;
    });
    syncWithBackendApi(`/api/announcements/${announcementId}`, 'DELETE');
  };

  const addAnnouncementComment = async (announcementId: string, content: string) => {
    const comment: CourseAnnouncementComment = {
      id: `com_${Date.now()}`,
      announcementId,
      authorId: currentUser?.id || 'usr_guest',
      authorName: currentUser?.name || guestName || 'Campus User',
      authorRole: currentUser?.role || 'student',
      avatarTag: currentUser?.avatarTag || 'CU',
      content,
      timestamp: 'Just now',
    };
    setAnnouncementComments((prev) => ({
      ...prev,
      [announcementId]: [...(prev[announcementId] || []), comment],
    }));
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === announcementId ? { ...a, commentsCount: (a.commentsCount || 0) + 1 } : a
      )
    );
    syncWithBackendApi(`/api/announcements/${announcementId}/comments`, 'POST', { content });
  };

  const deleteAnnouncementComment = async (announcementId: string, commentId: string) => {
    setAnnouncementComments((prev) => ({
      ...prev,
      [announcementId]: (prev[announcementId] || []).filter((c) => c.id !== commentId),
    }));
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === announcementId ? { ...a, commentsCount: Math.max(0, (a.commentsCount || 1) - 1) } : a
      )
    );
    syncWithBackendApi(`/api/announcements/${announcementId}/comments/${commentId}`, 'DELETE');
  };

  const createTopic = async (courseId: string, name: string): Promise<TopicModel> => {
    const newTopic: TopicModel = {
      id: `top_${Date.now()}`,
      courseId,
      name,
      order: topics.filter((t) => t.courseId === courseId).length,
    };
    setTopics((prev) => [...prev, newTopic]);
    syncWithBackendApi('/api/topics', 'POST', newTopic);
    return newTopic;
  };

  const deleteTopic = async (topicId: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    setAssignments((prev) =>
      prev.map((a) => (a.topicId === topicId ? { ...a, topicId: undefined } : a))
    );
    syncWithBackendApi(`/api/topics/${topicId}`, 'DELETE');
  };

  const submitAssignment = (assignmentId: string, note: string) => {
    submitWork(assignmentId, [], undefined, note);
  };

  const submitWork = async (
    assignmentId: string,
    attachments: any[] = [],
    answerText?: string,
    note?: string
  ) => {
    const targetAsg = assignments.find((a) => a.id === assignmentId);
    const maxPts = parseInt(targetAsg?.points || '100', 10) || 100;
    const existingSub = submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === currentUser?.id
    );

    const updatedSub: StudentSubmission = {
      id: existingSub?.id || `sub_${Date.now()}`,
      assignmentId,
      courseId: targetAsg?.courseId || '',
      studentId: currentUser?.id || 'usr_guest',
      studentName: currentUser?.name || guestName || 'Campus Student',
      studentAvatar: currentUser?.avatarTag || 'CS',
      matricOrStaffId: currentUser?.matricOrStaffId || '',
      status: 'turned_in',
      submittedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      maxPoints: maxPts,
      attachments: attachments.length ? attachments : existingSub?.attachments || [],
      privateComments: existingSub?.privateComments || [],
      answerText: answerText || existingSub?.answerText,
    };

    setSubmissions((prev) => [
      ...prev.filter(
        (s) =>
          s.id !== updatedSub.id &&
          !(s.assignmentId === assignmentId && s.studentId === currentUser?.id)
      ),
      updatedSub,
    ]);

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
            ...a,
            isSubmitted: true,
            submissionNote: note || 'Submitted work.',
            submittedAt: updatedSub.submittedAt,
          }
          : a
      )
    );

    if (!isDemoMode) {
      saveAssignmentSubmissionToFirestore(assignmentId, note || '', currentUser?.id).catch(() => { });
      syncWithBackendApi(`/api/assignments/${assignmentId}/submit`, 'POST', {
        attachments,
        answerText,
        note,
      });
    }
  };

  const unsubmitWork = async (assignmentId: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.assignmentId === assignmentId && s.studentId === currentUser?.id
          ? { ...s, status: 'assigned' }
          : s
      )
    );
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, isSubmitted: false } : a))
    );
    syncWithBackendApi(`/api/assignments/${assignmentId}/unsubmit`, 'POST');
  };

  const gradeSubmission = async (
    submissionId: string,
    grade: number,
    privateFeedback?: string
  ) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === submissionId) {
          const comments = [...s.privateComments];
          if (privateFeedback?.trim()) {
            comments.push({
              id: `pcom_${Date.now()}`,
              authorId: currentUser?.id || 'usr_lecturer',
              authorName: currentUser?.name || 'Prof. Lecturer',
              authorRole: 'lecturer',
              avatarTag: currentUser?.avatarTag || 'PL',
              text: privateFeedback.trim(),
              timestamp: 'Just now',
            });
          }
          return {
            ...s,
            grade,
            status: 'graded',
            privateComments: comments,
          };
        }
        return s;
      })
    );
    syncWithBackendApi(`/api/submissions/${submissionId}/grade`, 'POST', {
      grade,
      privateFeedback,
    });
  };

  const addPrivateComment = async (submissionId: string, text: string) => {
    const comment = {
      id: `pcom_${Date.now()}`,
      authorId: currentUser?.id || 'usr_user',
      authorName: currentUser?.name || 'Campus User',
      authorRole: currentUser?.role || 'student',
      avatarTag: currentUser?.avatarTag || 'CU',
      text,
      timestamp: 'Just now',
    };
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? { ...s, privateComments: [...s.privateComments, comment] }
          : s
      )
    );
    syncWithBackendApi(`/api/submissions/${submissionId}/comments`, 'POST', { text });
  };

  const createAssignment = async ({
    courseId,
    title,
    description,
    dueDate,
    dueTime,
    points,
    type = 'assignment',
    topicId,
    attachments = [],
    rubric = [],
    questionType,
    questionOptions,
  }: {
    courseId: string;
    title: string;
    description: string;
    dueDate?: string;
    dueTime?: string;
    points?: string;
    type?: 'assignment' | 'quiz' | 'question' | 'material';
    topicId?: string;
    attachments?: any[];
    rubric?: any[];
    questionType?: 'short_answer' | 'multiple_choice';
    questionOptions?: string[];
  }): Promise<ClassworkAssignment> => {
    const newAsg: ClassworkAssignment = {
      id: `asg_${Date.now()}`,
      courseId,
      title,
      description,
      dueDate: dueDate || 'No due date',
      dueTime,
      points: points || (type === 'material' ? 'Ungraded' : '100 points'),
      isSubmitted: false,
      type,
      topicId,
      attachments,
      rubric,
      questionType,
      questionOptions,
    };
    setAssignments((prev) => [newAsg, ...prev]);
    if (!isDemoMode) {
      saveAssignmentSubmissionToFirestore(newAsg.id, '', currentUser?.id).catch(() => { });
      syncWithBackendApi('/api/assignments', 'POST', newAsg);
    }
    return newAsg;
  };

  const deleteAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setSubmissions((prev) => prev.filter((s) => s.assignmentId !== assignmentId));
    syncWithBackendApi(`/api/assignments/${assignmentId}`, 'DELETE');
  };

  const updateCourseSettings = async (courseId: string, updates: Partial<CourseModel>) => {
    let updatedDoc: CourseModel | null = null;
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          updatedDoc = { ...c, ...updates };
          return updatedDoc;
        }
        return c;
      })
    );
    if (!isDemoMode) {
      if (updatedDoc) {
        saveCourseToFirestore(updatedDoc).catch(() => { });
      }
      syncWithBackendApi(`/api/courses/${courseId}/settings`, 'PATCH', updates);
    }
  };

  const archiveCourse = async (courseId: string) => {
    updateCourseSettings(courseId, { isArchived: true });
  };

  const restoreCourse = async (courseId: string) => {
    updateCourseSettings(courseId, { isArchived: false });
  };

  const deleteCoursePermanently = async (courseId: string) => {
    const idLower = courseId.toLowerCase();
    deletedCourseIdsRef.current.add(idLower);
    persistDeletedCourseIds();

    const targetCourse = courses.find((c) => c.id.toLowerCase() === idLower);
    if (
      targetCourse &&
      activeRoomCode &&
      activeRoomCode.toLowerCase() === targetCourse.liveRoomCode.toLowerCase()
    ) {
      setActiveRoomCodeState('');
    }

    setCourses((prev) => prev.filter((c) => c.id.toLowerCase() !== idLower));
    setAssignments((prev) => prev.filter((a) => a.courseId.toLowerCase() !== idLower));
    setAnnouncements((prev) => prev.filter((a) => a.courseId.toLowerCase() !== idLower));
    setTopics((prev) => prev.filter((t) => t.courseId.toLowerCase() !== idLower));
    setSubmissions((prev) => prev.filter((s) => s.courseId.toLowerCase() !== idLower));
    if (!isDemoMode) {
      await Promise.all([
        deleteCourseFromFirestore(courseId).catch(() => { }),
        syncWithBackendApi(`/api/courses/${courseId}`, 'DELETE'),
      ]);
    }
  };

  const muteStudent = async (courseId: string, studentId: string, isMuted: boolean) => {
    let updatedDoc: CourseModel | null = null;
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId && c.members) {
          updatedDoc = {
            ...c,
            members: c.members.map((m) =>
              m.id === studentId ? { ...m, isMuted } : m
            ),
          };
          return updatedDoc;
        }
        return c;
      })
    );
    if (!isDemoMode && updatedDoc) {
      const docToSave = updatedDoc as CourseModel;
      saveCourseToFirestore(docToSave).catch(() => { });
      syncWithBackendApi(`/api/courses/${courseId}/settings`, 'PATCH', {
        members: docToSave.members,
      });
    }
  };

  const removeStudentFromCourse = async (courseId: string, studentId: string) => {
    let updatedDoc: CourseModel | null = null;
    const studentIdLower = studentId.toLowerCase();
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId && c.members) {
          const updated = c.members.filter(
            (m) => (m.id || '').toLowerCase() !== studentIdLower
          );
          const updatedIds = (c.memberIds || []).filter(
            (id) => id.toLowerCase() !== studentIdLower
          );
          const studentCount = updated.filter((m) => m.role === 'student').length;
          updatedDoc = {
            ...c,
            members: updated,
            memberIds: updatedIds,
            enrolledCount: Math.max(0, studentCount),
          };
          return updatedDoc;
        }
        return c;
      })
    );
    if (!isDemoMode && updatedDoc) {
      const docToSave = updatedDoc as CourseModel;
      saveCourseToFirestore(docToSave).catch(() => { });
      syncWithBackendApi(`/api/courses/${courseId}/settings`, 'PATCH', {
        members: docToSave.members,
        memberIds: docToSave.memberIds,
        enrolledCount: docToSave.enrolledCount,
      });
    }
  };

  const inviteStudentToCourse = async (courseId: string, emailOrName: string) => {
    const fakeId = `usr_${Math.random().toString(36).substring(2, 8)}`;
    const initials = emailOrName.substring(0, 2).toUpperCase();
    const newMember = {
      id: fakeId,
      name: emailOrName,
      avatarTag: initials,
      role: 'student' as const,
      matricOrStaffId: `INV/${Date.now().toString().slice(-4)}`,
    };
    let updatedDoc: CourseModel | null = null;
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const members = [...(c.members || []), newMember];
          const memberIds = [...(c.memberIds || []), fakeId];
          const studentCount = members.filter((m) => m.role === 'student').length;
          updatedDoc = {
            ...c,
            members,
            memberIds,
            enrolledCount: Math.max(memberIds.length, studentCount),
          };
          return updatedDoc;
        }
        return c;
      })
    );
    if (!isDemoMode && updatedDoc) {
      const docToSave = updatedDoc as CourseModel;
      saveCourseToFirestore(docToSave).catch(() => { });
      syncWithBackendApi(`/api/courses/${courseId}/settings`, 'PATCH', {
        members: docToSave.members,
        memberIds: docToSave.memberIds,
        enrolledCount: docToSave.enrolledCount,
      });
    }
  };

  // Google Studio features
  const sendReaction = (emoji: string) => {
    const reaction: FloatingReaction = {
      id: `rx_${Date.now()}_${Math.random()}`,
      emoji,
      x: 20 + Math.random() * 60,
      senderName: currentUser?.name || guestName || 'Peer',
    };
    setFloatingReactions((prev) => [...prev, reaction]);
    socketRef.current?.emit('studio_reaction', reaction);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 3500);
  };

  const toggleCaptions = () => {
    setIsCaptionsOn((prev) => !prev);
  };

  // Continuous Web Speech API live transcription when in a Studio room (mic unmuted or captions active)
  useEffect(() => {
    if (!activeRoomCode || (isMicMuted && !isCaptionsOn)) return;
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    let stopped = false;
    let recognition: any = null;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    const startRecognition = () => {
      if (stopped) return;
      try {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const res = event.results[i];
            if (res.isFinal && res[0]?.transcript) {
              const spokenText = String(res[0].transcript).trim();
              if (!spokenText) continue;
              const now = Date.now();
              const speakerName = currentUser?.name || guestName || 'Speaker';
              const speakerRole: 'lecturer' | 'student' =
                currentUser?.role === 'lecturer' ? 'lecturer' : 'student';
              const entry: TranscriptSegment = {
                id: `tr_${now}_${Math.random().toString(36).slice(2, 6)}`,
                roomId: activeRoomCode,
                speakerId: currentUser?.id || guestId,
                speakerName,
                speakerRole,
                text: spokenText,
                timestamp: now,
                offsetMs: Math.max(0, now - sessionStartedAt),
              };
              setActiveCaptions((prev) => [...prev.slice(-3), { speaker: speakerName, text: spokenText }]);
              setTranscriptLog((prev) => {
                if (prev.some((item) => item.id === entry.id)) return prev;
                return [...prev.slice(-199), entry];
              });
              emitChalkboardPacket(
                'caption_stream',
                {
                  ...entry,
                  speaker: speakerName,
                },
                true
              );
            }
          }
        };

        recognition.onend = () => {
          if (!stopped) {
            restartTimer = setTimeout(() => startRecognition(), 400);
          }
        };

        recognition.onerror = () => {
          // Gracefully ignore permission/no-speech errors
        };

        recognition.start();
      } catch {
        // Ignore if already started or unsupported
      }
    };

    startRecognition();

    return () => {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      try {
        recognition?.stop?.();
      } catch {
        // ignore
      }
    };
  }, [
    activeRoomCode,
    currentUser?.id,
    currentUser?.name,
    currentUser?.role,
    emitChalkboardPacket,
    guestId,
    guestName,
    isCaptionsOn,
    isMicMuted,
    sessionStartedAt,
  ]);

  const createPoll = (question: string, options: string[], showResults: boolean) => {
    const newPoll: StudioPoll = {
      id: `poll_${Date.now()}`,
      roomId: activeRoomCode,
      question,
      options: options.map((opt, i) => ({ id: `opt_${i}`, text: opt, votes: 0 })),
      voters: {},
      isOpen: true,
      showResults,
      createdAt: Date.now(),
      createdBy: currentUser?.name || 'Host',
    };
    setPolls((prev) => [newPoll, ...prev]);
    socketRef.current?.emit('create_poll', newPoll);
  };

  const votePoll = (pollId: string, optionId: string) => {
    const userId = currentUser?.id || guestName || 'anon';
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id === pollId) {
          const currentVote = p.voters[userId];
          const updatedOptions = p.options.map((opt) => {
            if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
            if (opt.id === currentVote) return { ...opt, votes: Math.max(0, opt.votes - 1) };
            return opt;
          });
          return {
            ...p,
            options: updatedOptions,
            voters: { ...p.voters, [userId]: optionId },
          };
        }
        return p;
      })
    );
    socketRef.current?.emit('vote_poll', { pollId, optionId, userId });
  };

  const closePoll = (pollId: string) => {
    setPolls((prev) =>
      prev.map((p) => (p.id === pollId ? { ...p, isOpen: false } : p))
    );
    socketRef.current?.emit('close_poll', { pollId });
  };

  const askQuestion = (text: string) => {
    const newQ: StudioQuestion = {
      id: `q_${Date.now()}`,
      roomId: activeRoomCode,
      authorId: currentUser?.id || 'guest',
      authorName: currentUser?.name || guestName || 'Participant',
      authorAvatar: currentUser?.avatarTag || 'P',
      text,
      upvotes: [],
      isAnswered: false,
      timestamp: Date.now(),
    };
    setQuestions((prev) => [newQ, ...prev]);
    socketRef.current?.emit('ask_question', newQ);
  };

  const upvoteQuestion = (questionId: string) => {
    const userId = currentUser?.id || guestName || 'anon';
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const hasVoted = q.upvotes.includes(userId);
          const upvotes = hasVoted
            ? q.upvotes.filter((u) => u !== userId)
            : [...q.upvotes, userId];
          return { ...q, upvotes };
        }
        return q;
      })
    );
    socketRef.current?.emit('upvote_question', { questionId, userId });
  };

  const markQuestionAnswered = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, isAnswered: true } : q))
    );
    socketRef.current?.emit('answer_question', { questionId });
  };

  const createBreakouts = (roomCount: number, timerMinutes: number) => {
    const nonHostParticipants = participants.filter((p) => p.role !== 'lecturer');
    const rooms = Array.from({ length: roomCount }).map((_, i) => ({
      id: `room_${i + 1}`,
      name: `Breakout Room ${i + 1}`,
      participantIds: [] as string[],
    }));
    nonHostParticipants.forEach((p, idx) => {
      rooms[idx % roomCount].participantIds.push(p.id);
    });

    const session: BreakoutSession = {
      isActive: true,
      timerSeconds: timerMinutes * 60,
      startedAt: Date.now(),
      rooms,
    };
    setBreakoutSession(session);
    socketRef.current?.emit('create_breakouts', session);
  };

  const broadcastBreakout = (message: string) => {
    if (breakoutSession) {
      setBreakoutSession({ ...breakoutSession, broadcastMessage: message });
    }
    socketRef.current?.emit('broadcast_breakout', { message });
  };

  const closeBreakouts = () => {
    setBreakoutSession(null);
    socketRef.current?.emit('close_breakouts');
  };

  const exportAttendanceReport = () => {
    const lines = [
      'Name,Email,Role,Join Time,Duration (Mins)',
      ...attendanceRecords.map(
        (r) =>
          `"${r.name}","${r.email || 'N/A'}","${r.role}","${new Date(r.joinTime).toLocaleTimeString()}","${r.durationMinutes}"`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${activeRoomCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateHostSettings = (settings: Partial<HostControlSettings>) => {
    if (settings.useChalkboardAllowed === false) {
      setLaser(null);
      emitChalkboardPacket(
        'laser_pointer',
        {
          roomId: activeRoomCode,
          userId: currentUser?.id || 'host',
          userName: currentUser?.name || 'Host',
          x: 0,
          y: 0,
          active: false,
        },
        true
      );
    }
    setHostSettings((prev) => {
      const updated = { ...prev, ...settings };
      emitChalkboardPacket('update_host_controls', updated, true);
      return updated;
    });
  };

  const muteAllParticipants = () => {
    socketRef.current?.emit('mute_all');
  };

  const lowerAllHands = () => {
    setParticipants((prev) => prev.map((p) => ({ ...p, handRaised: false })));
    setIsHandRaised(false);
    emitChalkboardPacket('lower_all_hands', { roomId: activeRoomCode, all: true }, true);
  };

  const endStudioSession = useCallback(async (targetRoomId?: string) => {
    const rId = targetRoomId || activeRoomCode;
    if (!rId) return;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('end_session', { roomId: rId });
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const idToken = await getCurrentFirebaseIdToken();
      if (idToken) headers.Authorization = `Bearer ${idToken}`;
      await fetch(`${BACKEND_API_BASE}/api/rooms/${encodeURIComponent(rId)}/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomId: rId, endedBy: currentUser?.name || 'Lecturer' }),
      });
    } catch (err) {
      console.warn('[Chalk Studio] Failed to call POST /api/rooms/:id/end:', err);
    }

    setActiveRoomInfo((prev) => ({
      ...prev,
      isLive: false,
      participantCount: 0,
    }));
    setStrokes([]);
    setRedoStack([]);
    setActiveSlideIndex(0);
    setChatMessages([]);
    setTranscriptLog([]);
    setPolls([]);
    setQuestions([]);
    setLaser(null);
    setLiveRooms((prev) => prev.filter((r) => r.id.toLowerCase() !== rId.toLowerCase()));
    setSessionEndedRoom(rId);
  }, [activeRoomCode, currentUser?.name]);

  const authenticateWithGoogle = async (): Promise<{
    user: UserProfile;
    isNewUser: boolean;
  }> => {
    const result = await signInWithFirebaseGoogle();
    const idToken = await getCurrentFirebaseIdToken();
    if (idToken) {
      const verifyRes = await syncWithBackendApi(
        '/api/auth/verify',
        'POST',
        {
          idToken,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          department: result.user.department,
          matricOrStaffId: result.user.matricOrStaffId,
          avatarTag: result.user.avatarTag,
          isProfileComplete: result.user.isProfileComplete,
        },
        result.user
      );

      if (verifyRes && verifyRes.user) {
        const backendUser = verifyRes.user as UserProfile;
        const cleanMatric = (backendUser.matricOrStaffId || '').trim();
        const isComplete = Boolean(
          backendUser.isProfileComplete || Boolean(cleanMatric)
        );
        const resolvedUser: UserProfile = {
          ...result.user,
          ...backendUser,
          matricOrStaffId: cleanMatric || result.user.matricOrStaffId,
          isProfileComplete: isComplete,
        };
        saveUserLocally(resolvedUser);
        saveUserProfileToFirestore(resolvedUser).catch(() => {});
        return {
          user: resolvedUser,
          isNewUser:
            verifyRes.isNewUser !== undefined
              ? Boolean(verifyRes.isNewUser)
              : !isComplete,
        };
      }
    }
    saveUserLocally(result.user);
    return result;
  };

  const signInWithGoogle = ({
    email,
    name,
    role = 'student',
    idCode,
    department = 'Computer Science & Engineering',
    avatarTag,
    completeImmediately = false,
  }: {
    email: string;
    name: string;
    role?: 'student' | 'lecturer';
    idCode?: string;
    department?: string;
    avatarTag?: string;
    completeImmediately?: boolean;
  }) => {
    const stableId = `usr_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const isDemo = isDemoAccount({ email, id: stableId });

    if (isDemo) {
      // Ensure any real Firebase session is signed out so Demo Mode stays completely isolated
      signOutFirebaseUser().catch(() => { });
      const demoUser =
        role === 'lecturer' || email.toLowerCase().includes('adeleke')
          ? { ...DEMO_LECTURER_USER }
          : { ...DEMO_STUDENT_USER };
      saveUserLocally(demoUser);
      return;
    }

    const initials =
      avatarTag ||
      name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const nextUser: UserProfile = {
      id: currentUser && currentUser.email === email ? currentUser.id : stableId,
      name,
      email,
      role,
      department,
      matricOrStaffId: idCode || '',
      avatarTag: initials || 'CU',
      isProfileComplete: completeImmediately,
      isDemo: false,
    };
    saveUserLocally(nextUser);
    saveUserProfileToFirestore(nextUser).catch(() => { });
    resolveAuthTokenForBackend(nextUser).then((idToken) => {
      if (idToken) {
        syncWithBackendApi(
          '/api/auth/verify',
          'POST',
          { idToken, ...nextUser },
          nextUser
        );
      }
    });
  };

  const completeProfileSetup = async ({
    role,
    name,
    matricOrStaffId,
    department,
    avatarTag,
  }: {
    role: 'student' | 'lecturer';
    name: string;
    matricOrStaffId: string;
    department: string;
    avatarTag: string;
  }) => {
    const updated: UserProfile = {
      id: currentUser?.id || `usr_${Date.now()}`,
      email: currentUser?.email || 'user@campus.edu.ng',
      name: name || 'Campus User',
      role,
      matricOrStaffId: matricOrStaffId.trim(),
      department,
      avatarTag: avatarTag || 'CU',
      isProfileComplete: true,
      isDemo: Boolean(currentUser && isDemoAccount(currentUser)),
    };
    saveUserLocally(updated);
    if (!updated.isDemo) {
      await Promise.all([
        saveUserProfileToFirestore(updated),
        syncWithBackendApi('/api/users/profile', 'POST', { ...updated }, updated),
      ]);
    }
  };

  const logout = async () => {
    saveUserLocally(null);
    await signOutFirebaseUser();
  };

  const savingsPercentage = Math.max(
    80,
    Math.min(99.2, (1 - currentBitrateKbps / 1200) * 100)
  );

  return (
    <AppContext.Provider
      value={{
        isDark,
        themePreference,
        setThemePreference,
        toggleTheme,
        currentUser,
        isDemoMode,
        switchDemoPersona,
        isAuthenticated,
        authLoading,
        firebaseReady,
        refreshFirebaseConnection,
        guestName,
        guestId,
        setGuestName,
        authenticateWithGoogle,
        signInWithGoogle,
        completeProfileSetup,
        logout,
        courses,
        announcements,
        assignments,
        topics,
        submissions,
        announcementComments,
        liveRooms,
        refreshCourses,
        addAnnouncement,
        deleteAnnouncement,
        addAnnouncementComment,
        deleteAnnouncementComment,
        submitAssignment,
        submitWork,
        unsubmitWork,
        gradeSubmission,
        addPrivateComment,
        createAssignment,
        deleteAssignment,
        createTopic,
        deleteTopic,
        joinCourseByCode,
        createCourse,
        updateCourseSettings,
        archiveCourse,
        restoreCourse,
        deleteCoursePermanently,
        muteStudent,
        removeStudentFromCourse,
        inviteStudentToCourse,
        activeRoomCode,
        setActiveRoomCode,
        activeRoomInfo,
        endStudioSession,
        sessionEndedRoom,
        socketConnected,
        selfSocketId,
        participants,
        chatMessages,
        sendChatMessage,
        isMicMuted,
        toggleMic,
        isHandRaised,
        toggleHandRaised,
        lowerHand,
        lowerAllHands,
        muteAllParticipants,
        localStream,
        remoteStreams,
        speakingMap,
        strokes,
        currentTool,
        setCurrentTool,
        currentColor,
        setCurrentColor,
        currentWidth,
        setCurrentWidth,
        activeSlideIndex,
        totalSlides,
        nextSlide,
        prevSlide,
        goToSlide,
        addSlide,
        laser,
        emitLaser,
        streamStroke,
        commitStroke,
        canUndo: strokes.length > 0,
        canRedo: redoStack.length > 0,
        undoStroke,
        redoStroke,
        clearCanvas,
        networkProfile,
        setNetworkProfile,
        videoMode,
        setVideoMode,
        circuitBreakerMessage,
        dismissCircuitBreaker,
        currentBitrateKbps,
        rttMs,
        packetLoss,
        chalkDataUsedMb,
        zoomDataUsedMb,
        savingsPercentage,
        stageLayout,
        setStageLayout,
        broadcastStageLayout,
        grantParticipantPermission,
        floatingReactions,
        sendReaction,
        isCaptionsOn,
        toggleCaptions,
        activeCaptions,
        transcriptLog,
        sessionStartedAt,
        polls,
        createPoll,
        votePoll,
        closePoll,
        questions,
        askQuestion,
        upvoteQuestion,
        markQuestionAnswered,
        breakoutSession,
        createBreakouts,
        broadcastBreakout,
        closeBreakouts,
        attendanceRecords,
        exportAttendanceReport,
        hostSettings,
        updateHostSettings,
        prejoinCam,
        setPrejoinCam,
        prejoinMic,
        setPrejoinMic,
        prejoinBlur,
        setPrejoinBlur,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
};
