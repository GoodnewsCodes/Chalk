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
  ClassworkAssignment,
  CourseAnnouncement,
  CourseModel,
  LaserPointer,
  MeetParticipant,
  NetworkProfile,
  StrokeData,
  StrokeTool,
  UserProfile,
  VideoMode,
  ChatMessage,
} from '../types/chalk';
import {
  DEFAULT_BOARD_STROKES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_COURSES,
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
  liveRooms: LiveRoomSummary[];
  refreshCourses: () => Promise<void>;
  addAnnouncement: (courseId: string, content: string, isLiveNotice?: boolean) => void;
  submitAssignment: (assignmentId: string, note: string) => void;
  joinCourseByCode: (code: string) => Promise<CourseModel | null>;
  createCourse: (params: {
    code: string;
    title: string;
    scheduleTime: string;
    department: string;
  }) => Promise<CourseModel>;

  // Live Meeting & Real-time Telemetry
  activeRoomCode: string;
  setActiveRoomCode: (code: string) => void;
  activeRoomInfo: ActiveRoomMeta;
  socketConnected: boolean;
  selfSocketId: string;
  participants: MeetParticipant[];
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;

  // Media Controls (Real Microphone & WebRTC Audio/Video)
  isMicMuted: boolean;
  toggleMic: () => Promise<void>;
  isHandRaised: boolean;
  toggleHandRaised: () => void;
  lowerHand: (socketId: string) => void;
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
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_USER_KEY = 'chalk_web_user_v2';
const STORAGE_THEME_KEY = 'chalk_web_theme_pref_v2';
const STORAGE_COURSES_KEY = 'chalk_firestore_cache_courses_v1';
const STORAGE_ANNOUNCEMENTS_KEY = 'chalk_firestore_cache_announcements_v1';
const STORAGE_ASSIGNMENTS_KEY = 'chalk_firestore_cache_assignments_v1';
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
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return INITIAL_COURSES;
  });

  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ANNOUNCEMENTS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return INITIAL_ANNOUNCEMENTS;
  });

  const [assignments, setAssignments] = useState<ClassworkAssignment[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return INITIAL_ASSIGNMENTS;
  });

  const [liveRooms, setLiveRooms] = useState<LiveRoomSummary[]>([]);

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
    method: 'GET' | 'POST',
    body?: Record<string, unknown>,
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
    if (Array.isArray(coursesRes?.courses) && coursesRes.courses.length > 0) {
      setCourses(coursesRes.courses);
    }
    if (Array.isArray(annRes?.announcements) && annRes.announcements.length > 0) {
      setAnnouncements(annRes.announcements);
    }
    if (Array.isArray(asgnRes?.assignments) && asgnRes.assignments.length > 0) {
      setAssignments(asgnRes.assignments);
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

  // Classroom & Meeting State
  const [activeRoomCode, setActiveRoomCodeState] = useState<string>('csc401-algo');
  const [activeRoomInfo, setActiveRoomInfo] = useState<ActiveRoomMeta>({
    roomId: 'csc401-algo',
    title: 'Algorithms & Data Structures (Crisis Remote Cohort)',
    courseCode: 'CSC 401',
    courseId: 'csc401',
    lecturerName: 'Prof. Adeleke O.',
    isLive: false,
    participantCount: 0,
  });

  const setActiveRoomCode = (code: string) => {
    const cleaned = code.trim();
    if (cleaned) {
      setActiveRoomCodeState(cleaned);
    }
  };

  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [selfSocketId, setSelfSocketId] = useState<string>('');
  const [participants, setParticipants] = useState<MeetParticipant[]>([]);
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
  const [strokes, setStrokes] = useState<StrokeData[]>(DEFAULT_BOARD_STROKES);
  const [redoStack, setRedoStack] = useState<StrokeData[]>([]);
  const [currentTool, setCurrentTool] = useState<StrokeTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#69DB7C');
  const [currentWidth, setCurrentWidth] = useState<number>(3.5);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [totalSlides, setTotalSlides] = useState<number>(5);
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
          audio.play().catch(() => {});
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

  // Initialize Socket.io connection for Live Meeting
  useEffect(() => {
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
      if (Array.isArray(snapshot.strokes)) {
        setStrokes(snapshot.strokes.length ? snapshot.strokes : DEFAULT_BOARD_STROKES);
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

    return () => {
      socket.emit('leave_room', { roomId: activeRoomCode });
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
  }, [activeRoomCode, isMicMuted, startAudio]);

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
      if (videoMode === 'low') baseBitrate += 72.0;
      if (videoMode === 'standard') baseBitrate += 260.0;

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
          videoKbps: videoMode === 'low' ? 72.0 : videoMode === 'standard' ? 260.0 : 0,
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
      persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => {});
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
      persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => {});
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
        persistRoomStateToFirestore(activeRoomCode, { strokes: updated }).catch(() => {});
        socketRef.current?.emit('stroke_delta', next);
        return updated;
      });
      return rest;
    });
  };

  const clearCanvas = () => {
    setStrokes([]);
    setRedoStack([]);
    persistRoomStateToFirestore(activeRoomCode, { strokes: [] }).catch(() => {});
    socketRef.current?.emit('clear_canvas', {
      roomId: activeRoomCode,
      userId: currentUser?.id || 'usr_guest',
    });
  };

  const nextSlide = () => {
    const next = activeSlideIndex + 1;
    if (next < totalSlides) {
      setActiveSlideIndex(next);
      persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: next }).catch(() => {});
      socketRef.current?.emit('change_slide', {
        roomId: activeRoomCode,
        slideIndex: next,
      });
    }
  };

  const prevSlide = () => {
    const next = Math.max(0, activeSlideIndex - 1);
    setActiveSlideIndex(next);
    persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: next }).catch(() => {});
    socketRef.current?.emit('change_slide', {
      roomId: activeRoomCode,
      slideIndex: next,
    });
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setActiveSlideIndex(index);
      persistRoomStateToFirestore(activeRoomCode, { activeSlideIndex: index }).catch(() => {});
      socketRef.current?.emit('change_slide', {
        roomId: activeRoomCode,
        slideIndex: index,
      });
    }
  };

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
    const existing = courses.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.code.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, '') ||
        c.liveRoomCode.toLowerCase() === normalized
    );
    if (existing) return existing;

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
    };
    setCourses((prev) => [fallback, ...prev]);
    saveCourseToFirestore(fallback).catch(() => {});
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
    };
    setCourses((prev) => [newCourse, ...prev]);
    saveCourseToFirestore(newCourse).catch(() => {});
    return newCourse;
  };

  const addAnnouncement = (courseId: string, content: string, isLiveNotice = false) => {
    const newAnn: CourseAnnouncement = {
      id: `ann_${Date.now()}`,
      courseId,
      authorName: currentUser?.name || 'Campus User',
      authorRole: currentUser?.role || 'student',
      timestamp: 'Just now',
      content,
      isLiveNotice,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    saveAnnouncementToFirestore(newAnn).catch(() => {});
    syncWithBackendApi('/api/announcements', 'POST', {
      courseId,
      content,
      isLiveNotice,
    });
  };

  const submitAssignment = (assignmentId: string, note: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              isSubmitted: true,
              dueDate: 'Submitted • Pending Review',
              submissionNote: note || 'Uploaded solution archive.',
            }
          : a
      )
    );
    saveAssignmentSubmissionToFirestore(assignmentId, note, currentUser?.id).catch(() => {});
    syncWithBackendApi(`/api/assignments/${assignmentId}/submit`, 'POST', { note });
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
      id: currentUser?.id || stableId,
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
    saveUserProfileToFirestore(nextUser).catch(() => {});
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
        setGuestName,
        authenticateWithGoogle,
        signInWithGoogle,
        completeProfileSetup,
        logout,
        courses,
        announcements,
        assignments,
        liveRooms,
        refreshCourses,
        addAnnouncement,
        submitAssignment,
        joinCourseByCode,
        createCourse,
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
