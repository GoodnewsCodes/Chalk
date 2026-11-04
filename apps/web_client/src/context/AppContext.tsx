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
  UserProfile,
  VideoMode,
} from '../types/chalk';
import {
  DEFAULT_BOARD_STROKES,
  INITIAL_ANNOUNCEMENT_COMMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_COURSES,
  INITIAL_POLLS,
  INITIAL_QUESTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_TOPICS,
} from '../data/mockCatalog';
import {
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

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ActiveRoomMeta {
  roomId: string;
  title: string;
  courseCode: string;
  courseId: string | null;
  lecturerName: string;
  isLive: boolean;
  participantCount: number;
}

export interface LiveRoomSummary {
  id: string;
  title: string;
  lecturerName: string;
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
const STORAGE_COURSES_KEY = 'chalk_firestore_cache_courses_v4';
const STORAGE_ANNOUNCEMENTS_KEY = 'chalk_firestore_cache_announcements_v4';
const STORAGE_ASSIGNMENTS_KEY = 'chalk_firestore_cache_assignments_v4';
const STORAGE_TOPICS_KEY = 'chalk_cache_topics_v5';
const STORAGE_SUBMISSIONS_KEY = 'chalk_cache_submissions_v5';
const STORAGE_COMMENTS_KEY = 'chalk_cache_comments_v5';
const STORAGE_POLLS_KEY = 'chalk_cache_polls_v5';
const STORAGE_QUESTIONS_KEY = 'chalk_cache_questions_v5';
const STORAGE_ATTENDANCE_KEY = 'chalk_cache_attendance_v5';
const STORAGE_HOST_SETTINGS_KEY = 'chalk_cache_host_settings_v5';
const BACKEND_API_BASE = 'http://localhost:4000';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'light';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const isDark =
    themePreference === 'system' ? systemDark : themePreference === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_THEME_KEY, themePreference);
  }, [isDark, themePreference]);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
  };

  const toggleTheme = () => {
    setThemePreferenceState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
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
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  });

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
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  };

  const refreshFirebaseConnection = () => {
    setFirebaseReady(isFirebaseConfigured());
    setFirebaseVersion((v) => v + 1);
  };

  // Courses, Announcements, Assignments & Live Rooms State
  const [courses, setCourses] = useState<CourseModel[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_COURSES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => c && typeof c.id === 'string' && !MOCK_COURSE_IDS.has(c.id));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_COURSES;
  });

  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ANNOUNCEMENTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (a) =>
              a &&
              typeof a.id === 'string' &&
              !MOCK_ANNOUNCEMENT_IDS.has(a.id) &&
              typeof a.courseId === 'string' &&
              !MOCK_COURSE_IDS.has(a.courseId)
          );
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ANNOUNCEMENTS;
  });

  const [assignments, setAssignments] = useState<ClassworkAssignment[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (a) =>
              a &&
              typeof a.id === 'string' &&
              !MOCK_ASSIGNMENT_IDS.has(a.id) &&
              typeof a.courseId === 'string' &&
              !MOCK_COURSE_IDS.has(a.courseId)
          );
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ASSIGNMENTS;
  });

  const [liveRooms, setLiveRooms] = useState<LiveRoomSummary[]>([]);

  // Topics State
  const [topics, setTopics] = useState<TopicModel[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_TOPICS_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return INITIAL_TOPICS;
  });

  // Student Submissions State
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return INITIAL_SUBMISSIONS;
  });

  // Announcement Comments State
  const [announcementComments, setAnnouncementComments] = useState<Record<string, CourseAnnouncementComment[]>>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_COMMENTS_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return INITIAL_ANNOUNCEMENT_COMMENTS;
  });

  // Google Studio Features State
  const [stageLayout, setStageLayout] = useState<'whiteboard' | 'tiled' | 'spotlight' | 'sidebar'>('tiled');
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isCaptionsOn, setIsCaptionsOn] = useState<boolean>(false);
  const [activeCaptions, setActiveCaptions] = useState<{ speaker: string; text: string }[]>([]);
  const [polls, setPolls] = useState<StudioPoll[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_POLLS_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return INITIAL_POLLS;
  });
  const [questions, setQuestions] = useState<StudioQuestion[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_QUESTIONS_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return INITIAL_QUESTIONS;
  });
  const [breakoutSession, setBreakoutSession] = useState<BreakoutSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ATTENDANCE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return INITIAL_ATTENDANCE;
  });
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

  useEffect(() => {
    localStorage.setItem(STORAGE_TOPICS_KEY, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(announcementComments));
  }, [announcementComments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_POLLS_KEY, JSON.stringify(polls));
  }, [polls]);

  useEffect(() => {
    localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ATTENDANCE_KEY, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HOST_SETTINGS_KEY, JSON.stringify(hostSettings));
  }, [hostSettings]);

  // Purge legacy cache versions from localStorage
  useEffect(() => {
    try {
      ['v1', 'v2', 'v3'].forEach((ver) => {
        localStorage.removeItem(`chalk_firestore_cache_courses_${ver}`);
        localStorage.removeItem(`chalk_firestore_cache_announcements_${ver}`);
        localStorage.removeItem(`chalk_firestore_cache_assignments_${ver}`);
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_COURSES_KEY, JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }, [assignments]);

  // Firebase auth sync
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
      if (fbProfile) {
        saveUserLocally(fbProfile);
        ensureFirestoreSeedData();
        if (!unsubCatalog) {
          unsubCatalog = subscribeToFirestoreCatalog({
            onCourses: (remoteCourses) => setCourses(remoteCourses),
            onAnnouncements: (remoteAnnouncements) =>
              setAnnouncements(remoteAnnouncements),
            onAssignments: (remoteAssignments) =>
              setAssignments(remoteAssignments),
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

  const checkBackendCatalogSupport = async (): Promise<boolean> => {
    if (backendApiSupportedRef.current !== null) {
      return backendApiSupportedRef.current;
    }
    try {
      const res = await fetch(`${BACKEND_API_BASE}/health`);
      if (!res.ok) {
        backendApiSupportedRef.current = false;
        return false;
      }
      const data = await res.json();
      const supported = Boolean(data?.capabilities?.firestoreCatalog);
      backendApiSupportedRef.current = supported;
      return supported;
    } catch {
      backendApiSupportedRef.current = false;
      return false;
    }
  };

  const resolveAuthTokenForBackend = async (
    userOverride?: UserProfile | null
  ): Promise<string> => {
    const fbToken = await getCurrentFirebaseIdToken();
    if (fbToken) return fbToken;
    const target = userOverride ?? currentUser;
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
    if (!currentUser) return;
    const [coursesRes, annRes, asgnRes] = await Promise.all([
      syncWithBackendApi('/api/courses', 'GET', undefined, currentUser),
      syncWithBackendApi('/api/announcements', 'GET', undefined, currentUser),
      syncWithBackendApi('/api/assignments', 'GET', undefined, currentUser),
    ]);
    if (Array.isArray(coursesRes?.courses)) {
      setCourses(
        coursesRes.courses.filter(
          (c: any) => c && typeof c.id === 'string' && !MOCK_COURSE_IDS.has(c.id)
        )
      );
    }
    if (Array.isArray(annRes?.announcements)) {
      setAnnouncements(
        annRes.announcements.filter(
          (a: any) =>
            a &&
            typeof a.id === 'string' &&
            !MOCK_ANNOUNCEMENT_IDS.has(a.id) &&
            typeof a.courseId === 'string' &&
            !MOCK_COURSE_IDS.has(a.courseId)
        )
      );
    }
    if (Array.isArray(asgnRes?.assignments)) {
      setAssignments(
        asgnRes.assignments.filter(
          (a: any) =>
            a &&
            typeof a.id === 'string' &&
            !MOCK_ASSIGNMENT_IDS.has(a.id) &&
            typeof a.courseId === 'string' &&
            !MOCK_COURSE_IDS.has(a.courseId)
        )
      );
    }
  }, [currentUser?.id]);

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  // Poll live rooms from backend
  useEffect(() => {
    let active = true;
    const fetchLiveRooms = async () => {
      try {
        const res = await fetch(`${BACKEND_API_BASE}/api/rooms`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data)) {
          setLiveRooms(data);
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
  }, []);

  // Classroom & Studio State
  const [activeRoomCode, setActiveRoomCodeState] = useState<string>('');
  const [activeRoomInfo, setActiveRoomInfo] = useState<ActiveRoomMeta>({
    roomId: '',
    title: '',
    courseCode: '',
    courseId: null,
    lecturerName: '',
    isLive: false,
    participantCount: 0,
  });

  const setActiveRoomCode = (code: string) => {
    const cleaned = code.trim();
    setActiveRoomCodeState(cleaned);
  };

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
      if (roomData.strokes && roomData.strokes.length > 0) {
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
    if (!activeRoomCode) {
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
        courseCode: matchedCourse?.code || 'CSC 401',
        courseId: matchedCourse?.id || null,
        lecturerName: matchedCourse?.lecturerName || '',
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
        setStrokes(snapshot.strokes.length ? snapshot.strokes : (snapshot.roomId === 'csc401-algo' ? DEFAULT_BOARD_STROKES : []));
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
      setActiveRoomInfo({
        roomId: snapshot.roomId || activeRoomCode,
        title: snapshot.title || `Room ${activeRoomCode}`,
        courseCode: snapshot.courseCode || 'CSC 401',
        courseId: snapshot.courseId || null,
        lecturerName: snapshot.lecturerName || 'Prof. Adeleke O.',
        isLive: Array.isArray(snapshot.participants) && snapshot.participants.length > 0,
        participantCount: Array.isArray(snapshot.participants) ? snapshot.participants.length : 1,
      });
    });

    socket.on('participants_update', ({ participants: updatedList, lecturerName }) => {
      if (Array.isArray(updatedList)) {
        setParticipants(updatedList);
        setActiveRoomInfo((prev) => ({
          ...prev,
          lecturerName: lecturerName || prev.lecturerName,
          isLive: updatedList.length > 0,
          participantCount: updatedList.length,
        }));

        // Initiate WebRTC connections to newly joined peers if we are connected
        const myId = socket.id;
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
    });

    socket.on('caption_stream', ({ speaker, text }: { speaker: string; text: string }) => {
      setActiveCaptions((prev) => [...prev.slice(-3), { speaker, text }]);
    });

    socket.on('mute_all_peers', () => {
      if (currentUser?.role !== 'lecturer' && !isMicMuted) {
        toggleMic();
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
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_status', {
        roomId: activeRoomCode,
        handRaised: next,
      });
    }
  }, [activeRoomCode, isHandRaised]);

  // Lower student hand (for lecturers)
  const lowerHand = useCallback(
    (socketId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('lower_hand', {
          roomId: activeRoomCode,
          socketId,
        });
      }
    },
    [activeRoomCode]
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

  // Stroke operations
  const commitStroke = (stroke: StrokeData) => {
    const tagged = { ...stroke, slideIndex: activeSlideIndex };
    setStrokes((prev) => {
      const updated = [...prev, tagged];
      persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => { });
      return updated;
    });
    setRedoStack([]);
    socketRef.current?.emit('stroke_delta', tagged);
  };

  const undoStroke = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [last, ...r]);
      const updated = prev.slice(0, -1);
      persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => { });
      if (socketRef.current?.connected && last.id) {
        socketRef.current.emit('remove_stroke', {
          roomId: activeRoomCode,
          strokeId: last.id,
        });
      }
      return updated;
    });
  };

  const redoStroke = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setStrokes((s) => {
        const updated = [...s, next];
        persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => { });
        socketRef.current?.emit('stroke_delta', next);
        return updated;
      });
      return rest;
    });
  };

  const clearCanvas = () => {
    setStrokes([]);
    setRedoStack([]);
    persistRoomStateToFirestore(activeRoomCode, { strokes: [] }).catch(() => { });
    socketRef.current?.emit('clear_canvas', {
      roomId: activeRoomCode,
      userId: currentUser?.id || 'usr_guest',
    });
  };

  const nextSlide = () => {
    const next = activeSlideIndex + 1;
    if (next < totalSlides) {
      setActiveSlideIndex(next);
      persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: next }).catch(() => { });
      socketRef.current?.emit('change_slide', {
        roomId: activeRoomCode,
        slideIndex: next,
      });
    }
  };

  const prevSlide = () => {
    const next = Math.max(0, activeSlideIndex - 1);
    setActiveSlideIndex(next);
    persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: next }).catch(() => { });
    socketRef.current?.emit('change_slide', {
      roomId: activeRoomCode,
      slideIndex: next,
    });
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setActiveSlideIndex(index);
      persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: index }).catch(() => { });
      socketRef.current?.emit('change_slide', {
        roomId: activeRoomCode,
        slideIndex: index,
      });
    }
  };

  const addSlide = useCallback(() => {
    const next = totalSlides;
    setTotalSlides((prev) => prev + 1);
    setActiveSlideIndex(next);
    persistRoomStateToFirestore(activeRoomCode, {
      activeSlideIndex: next,
    }).catch(() => { });
    socketRef.current?.emit('change_slide', {
      roomId: activeRoomCode,
      slideIndex: next,
      totalSlides: totalSlides + 1,
    });
  }, [activeRoomCode, totalSlides]);

  const grantParticipantPermission = useCallback(
    (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, ...permissions } : p))
      );
      if (socketRef.current?.connected) {
        socketRef.current.emit('grant_permission', {
          roomId: activeRoomCode,
          socketId,
          ...permissions,
        });
      }
    },
    [activeRoomCode]
  );

  const broadcastStageLayout = useCallback(
    (layout: 'whiteboard' | 'tiled' | 'spotlight' | 'sidebar', roomId?: string) => {
      setStageLayout(layout);
      const targetRoom = roomId || activeRoomCode;
      if (socketRef.current?.connected && targetRoom) {
        socketRef.current.emit('change_stage_layout', {
          roomId: targetRoom,
          stageLayout: layout,
        });
      }
    },
    [activeRoomCode]
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
    socketRef.current?.emit('laser_pointer', pointer);
  };

  // Course management helpers
  const joinCourseByCode = async (code: string): Promise<CourseModel | null> => {
    const normalized = code.trim().toLowerCase();
    const studentMember = currentUser
      ? {
        id: currentUser.id,
        name: currentUser.name,
        avatarTag: currentUser.avatarTag,
        role: currentUser.role,
        matricOrStaffId: currentUser.matricOrStaffId,
      }
      : {
        id: `guest_${Date.now()}`,
        name: guestName || 'Campus Student',
        avatarTag: 'GS',
        role: 'student' as const,
        matricOrStaffId: 'GUEST/STUDENT',
      };

    const existing = courses.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.code.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, '') ||
        c.liveRoomCode.toLowerCase() === normalized
    );

    if (existing) {
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id === existing.id) {
            const currentMembers = c.members || [];
            const alreadyMember = currentMembers.some((m) => m.id === studentMember.id);
            if (!alreadyMember) {
              const updatedMembers = [...currentMembers, studentMember];
              const currentMemberIds = c.memberIds || [];
              const updatedMemberIds = currentMemberIds.includes(studentMember.id)
                ? currentMemberIds
                : [...currentMemberIds, studentMember.id];
              return {
                ...c,
                members: updatedMembers,
                memberIds: updatedMemberIds,
                enrolledCount: Math.max(c.enrolledCount + 1, updatedMembers.length),
              };
            }
          }
          return c;
        })
      );
      syncWithBackendApi('/api/courses/join', 'POST', { code });
      return existing;
    }

    const res = await syncWithBackendApi('/api/courses/join', 'POST', { code });
    if (res?.course) {
      setCourses((prev) => [res.course, ...prev.filter((c) => c.id !== res.course.id)]);
      return res.course;
    }

    const fallback: CourseModel = {
      id: normalized.replace(/[^a-z0-9]/g, '') || `course_${Date.now()}`,
      code: code.toUpperCase().slice(0, 8),
      title: `Joined Cohort (${code.toUpperCase()})`,
      lecturerName: 'Course Lecturer',
      lecturerId: 'usr_lecturer_custom',
      accentHex: '#059669',
      hasLiveSession: true,
      liveRoomCode: normalized,
      enrolledCount: 1,
      scheduleTime: 'Live Session Ready',
      department: currentUser?.department || 'Computer Science & Engineering',
      members: [studentMember],
    };
    setCourses((prev) => [fallback, ...prev]);
    saveCourseToFirestore(fallback).catch(() => { });
    return fallback;
  };

  const createCourse = async ({
    code,
    title,
    scheduleTime,
    department,
  }: {
    code: string;
    title: string;
    scheduleTime: string;
    department: string;
  }): Promise<CourseModel> => {
    const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lecturerMember = {
      id: currentUser?.id || 'usr_lecturer_01',
      name: currentUser?.name || 'Prof. Lecturer',
      avatarTag: currentUser?.avatarTag || 'PL',
      role: 'lecturer' as const,
      matricOrStaffId: currentUser?.matricOrStaffId || 'STAFF/CS/2026',
    };

    const res = await syncWithBackendApi('/api/courses', 'POST', {
      code,
      title,
      scheduleTime,
      department,
    });
    if (res?.course) {
      setCourses((prev) => [res.course, ...prev]);
      return res.course;
    }

    const newCourse: CourseModel = {
      id: slug || `course_${Date.now()}`,
      code: code.toUpperCase(),
      title,
      lecturerName: currentUser?.name || 'Prof. Lecturer',
      lecturerId: currentUser?.id || 'usr_lecturer_01',
      accentHex: '#059669',
      hasLiveSession: true,
      liveRoomCode: `${slug || 'room'}-live`,
      enrolledCount: 1,
      scheduleTime: scheduleTime || 'Mon & Wed • 9:00 AM WAT',
      department: department || 'Computer Science & Engineering',
      members: [lecturerMember],
    };
    setCourses((prev) => [newCourse, ...prev]);
    saveCourseToFirestore(newCourse).catch(() => { });
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
    saveAnnouncementToFirestore(newAnn).catch(() => { });
    syncWithBackendApi('/api/announcements', 'POST', {
      courseId,
      content,
      isLiveNotice,
      attachments,
    });
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

    saveAssignmentSubmissionToFirestore(assignmentId, note || '', currentUser?.id).catch(() => { });
    syncWithBackendApi(`/api/assignments/${assignmentId}/submit`, 'POST', {
      attachments,
      answerText,
      note,
    });
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
    saveAssignmentSubmissionToFirestore(newAsg.id, '', currentUser?.id).catch(() => { });
    syncWithBackendApi('/api/assignments', 'POST', newAsg);
    return newAsg;
  };

  const deleteAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setSubmissions((prev) => prev.filter((s) => s.assignmentId !== assignmentId));
    syncWithBackendApi(`/api/assignments/${assignmentId}`, 'DELETE');
  };

  const updateCourseSettings = async (courseId: string, updates: Partial<CourseModel>) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c))
    );
    syncWithBackendApi(`/api/courses/${courseId}/settings`, 'PATCH', updates);
  };

  const archiveCourse = async (courseId: string) => {
    updateCourseSettings(courseId, { isArchived: true });
  };

  const restoreCourse = async (courseId: string) => {
    updateCourseSettings(courseId, { isArchived: false });
  };

  const deleteCoursePermanently = async (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setAssignments((prev) => prev.filter((a) => a.courseId !== courseId));
    setAnnouncements((prev) => prev.filter((a) => a.courseId !== courseId));
    setTopics((prev) => prev.filter((t) => t.courseId !== courseId));
    syncWithBackendApi(`/api/courses/${courseId}`, 'DELETE');
  };

  const muteStudent = async (courseId: string, studentId: string, isMuted: boolean) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId && c.members) {
          return {
            ...c,
            members: c.members.map((m) =>
              m.id === studentId ? { ...m, isMuted } : m
            ),
          };
        }
        return c;
      })
    );
  };

  const removeStudentFromCourse = async (courseId: string, studentId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId && c.members) {
          const updated = c.members.filter((m) => m.id !== studentId);
          return {
            ...c,
            members: updated,
            memberIds: (c.memberIds || []).filter((id) => id !== studentId),
            enrolledCount: Math.max(0, updated.length),
          };
        }
        return c;
      })
    );
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
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const members = [...(c.members || []), newMember];
          return {
            ...c,
            members,
            memberIds: [...(c.memberIds || []), fakeId],
            enrolledCount: members.length,
          };
        }
        return c;
      })
    );
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
    setHostSettings((prev) => {
      const updated = { ...prev, ...settings };
      socketRef.current?.emit('update_host_controls', updated);
      return updated;
    });
  };

  const muteAllParticipants = () => {
    socketRef.current?.emit('mute_all');
  };

  const lowerAllHands = () => {
    setParticipants((prev) => prev.map((p) => ({ ...p, handRaised: false })));
    socketRef.current?.emit('lower_all_hands');
  };

  const authenticateWithGoogle = async (): Promise<{
    user: UserProfile;
    isNewUser: boolean;
  }> => {
    const result = await signInWithFirebaseGoogle();
    saveUserLocally(result.user);
    const idToken = await getCurrentFirebaseIdToken();
    if (idToken) {
      await syncWithBackendApi(
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
    }
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
    const initials =
      avatarTag ||
      name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const stableId = `usr_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const nextUser: UserProfile = {
      id: currentUser && currentUser.email === email ? currentUser.id : stableId,
      name,
      email,
      role,
      department,
      matricOrStaffId:
        idCode || (role === 'lecturer' ? 'STAFF/CS/2018' : 'CSC/2022/1042'),
      avatarTag: initials || 'CH',
      isProfileComplete: completeImmediately,
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
      name: name || 'Campus Student',
      role,
      matricOrStaffId,
      department,
      avatarTag: avatarTag || 'CS',
      isProfileComplete: true,
    };
    saveUserLocally(updated);
    await Promise.all([
      saveUserProfileToFirestore(updated),
      syncWithBackendApi('/api/users/profile', 'POST', { ...updated }, updated),
    ]);
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
