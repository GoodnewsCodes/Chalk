import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ClassworkAssignment,
  CourseAnnouncement,
  CourseModel,
  StrokeData,
  UserProfile,
} from '../types/chalk';
import {
  DEFAULT_BOARD_STROKES,
  DEMO_COURSE_IDS,
  isDemoAccount,
} from '../data/mockCatalog';

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export const getEffectiveFirebaseConfig = (): FirebaseEnvConfig | null => {
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const envStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
  const envMessagingSenderId =
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const envAppId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();

  if (envApiKey && envAuthDomain && envProjectId && envAppId) {
    return {
      apiKey: envApiKey,
      authDomain: envAuthDomain,
      projectId: envProjectId,
      storageBucket: envStorageBucket || `${envProjectId}.appspot.com`,
      messagingSenderId: envMessagingSenderId || '',
      appId: envAppId,
    };
  }

  return null;
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export const initFirebaseServices = (): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
} | null => {
  const config = getEffectiveFirebaseConfig();
  if (!config) return null;

  try {
    if (!firebaseApp) {
      const existing = getApps();
      firebaseApp = existing.length > 0 ? existing[0] : initializeApp(config);
      firebaseAuth = getAuth(firebaseApp);
      try {
        firestoreDb = initializeFirestore(firebaseApp, {
          experimentalAutoDetectLongPolling: true,
        });
      } catch {
        firestoreDb = getFirestore(firebaseApp);
      }
      googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account',
      });
    }

    if (firebaseApp && firebaseAuth && firestoreDb && googleProvider) {
      return {
        app: firebaseApp,
        auth: firebaseAuth,
        db: firestoreDb,
        googleProvider,
      };
    }
  } catch (err) {
    console.error('[Chalk Firebase] Initialization error:', err);
  }

  return null;
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(getEffectiveFirebaseConfig());
};

const LOCAL_USER_PROFILES_KEY = 'chalk_firestore_users_cache_v1';
let firestoreReachable = true;

const readLocalUserProfileCache = (uid: string): UserProfile | null => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_PROFILES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, UserProfile>;
    return map[uid] || null;
  } catch {
    return null;
  }
};

const writeLocalUserProfileCache = (profile: UserProfile): void => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_PROFILES_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, UserProfile>) : {};
    map[profile.id] = profile;
    localStorage.setItem(LOCAL_USER_PROFILES_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
};

const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
};

const withFirestoreTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs = 2500
): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        resolve(null);
      }, timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const deriveInitials = (name: string): string => {
  const cleaned = name.trim();
  if (!cleaned) return 'CU';
  return (
    cleaned
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CU'
  );
};

const sanitizeRealUserProfile = (
  data: Partial<UserProfile>,
  fbUser?: FirebaseUser | null
): UserProfile => {
  const email = fbUser?.email || data.email || '';
  const fallbackName =
    fbUser?.displayName || email.split('@')[0] || 'Campus User';
  const rawName = (data.name || '').trim();
  const isLeakedDemoName =
    !isDemoAccount({ email }) &&
    (rawName === 'Alex Okafor' || rawName === 'Prof. Adeleke O.');
  const cleanName = isLeakedDemoName || !rawName ? fallbackName : rawName;

  const rawMatric = (data.matricOrStaffId || '').trim();
  const isLeakedDemoMatric =
    !isDemoAccount({ email }) &&
    (rawMatric === 'CSC/2022/1042' || rawMatric === 'STAFF/CS/2018' || rawMatric === 'CSC/2026/0198');

  const cleanMatric = isLeakedDemoMatric ? '' : rawMatric;

  return {
    id: fbUser?.uid || data.id || '',
    name: cleanName,
    email,
    role: data.role === 'lecturer' ? 'lecturer' : 'student',
    department: data.department || 'Computer Science & Engineering',
    matricOrStaffId: cleanMatric,
    avatarTag:
      isLeakedDemoName || !data.avatarTag || data.avatarTag === 'AO' || data.avatarTag === 'PA'
        ? deriveInitials(cleanName)
        : data.avatarTag,
    isProfileComplete: Boolean(data.isProfileComplete || Boolean(cleanMatric)),
    isDemo: false,
  };
};

/**
 * Triggers Google OAuth sign-in popup via Firebase Auth and reads/creates the
 * user profile document in Cloud Firestore (`users/{uid}`).
 */
export const signInWithFirebaseGoogle = async (): Promise<{
  user: UserProfile;
  isNewUser: boolean;
}> => {
  const services = initFirebaseServices();
  if (!services) {
    throw new Error(
      'Firebase project credentials are not configured yet. Add VITE_FIREBASE_* keys to .env.local.'
    );
  }

  const { auth, db, googleProvider: provider } = services;
  const credential = await signInWithPopup(auth, provider);
  const fbUser = credential.user;

  const cachedLocal = readLocalUserProfileCache(fbUser.uid);

  const userRef = doc(db, 'users', fbUser.uid);
  const userSnap = await withFirestoreTimeout(getDoc(userRef), 1800);

  if (userSnap && userSnap.exists()) {
    const existingData = userSnap.data() as UserProfile;
    const mergedUser = sanitizeRealUserProfile(existingData, fbUser);
    writeLocalUserProfileCache(mergedUser);
    return {
      user: mergedUser,
      isNewUser: !mergedUser.isProfileComplete,
    };
  }

  if (cachedLocal && !isDemoAccount(cachedLocal)) {
    const mergedCached = sanitizeRealUserProfile(cachedLocal, fbUser);
    writeLocalUserProfileCache(mergedCached);
    return {
      user: mergedCached,
      isNewUser: !mergedCached.isProfileComplete,
    };
  }

  // First-time Google sign-up: create initial user doc in Firestore
  const displayName =
    fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus User';
  const email = fbUser.email || '';
  const isLecturerHint =
    email.toLowerCase().includes('prof') ||
    email.toLowerCase().includes('lecturer') ||
    email.toLowerCase().includes('staff');

  const initialProfile: UserProfile = {
    id: fbUser.uid,
    name: displayName,
    email,
    role: isLecturerHint ? 'lecturer' : 'student',
    department: 'Computer Science & Engineering',
    matricOrStaffId: '',
    avatarTag: deriveInitials(displayName),
    isProfileComplete: false,
    isDemo: false,
  };

  writeLocalUserProfileCache(initialProfile);

  await withFirestoreTimeout(
    setDoc(
      userRef,
      {
        ...initialProfile,
        photoURL: fbUser.photoURL || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    1500
  );

  return {
    user: initialProfile,
    isNewUser: true,
  };
};

/**
 * Persists or updates a UserProfile document in Cloud Firestore (`users/{uid}`).
 * Demo accounts are never persisted to real Firestore user profiles.
 */
export const saveUserProfileToFirestore = async (
  profile: UserProfile
): Promise<UserProfile> => {
  if (isDemoAccount(profile)) {
    return { ...profile, isDemo: true };
  }
  writeLocalUserProfileCache(profile);
  const services = initFirebaseServices();
  if (!services || !firestoreReachable) {
    return profile;
  }

  const userRef = doc(services.db, 'users', profile.id);
  await withFirestoreTimeout(
    setDoc(
      userRef,
      {
        ...profile,
        isDemo: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    1500
  );
  return profile;
};

/**
 * Fetches a UserProfile document from Cloud Firestore by UID.
 */
export const fetchUserProfileFromFirestore = async (
  uid: string,
  fbUser?: FirebaseUser | null
): Promise<UserProfile | null> => {
  const cachedLocal = readLocalUserProfileCache(uid);
  const services = initFirebaseServices();
  if (!services) {
    return cachedLocal ? sanitizeRealUserProfile(cachedLocal, fbUser) : null;
  }

  const userRef = doc(services.db, 'users', uid);
  const snap = await withFirestoreTimeout(getDoc(userRef), 1800);
  if (snap && snap.exists()) {
    const data = snap.data() as UserProfile;
    const sanitized = sanitizeRealUserProfile(data, fbUser);
    writeLocalUserProfileCache(sanitized);
    return sanitized;
  }

  if (cachedLocal && !isDemoAccount(cachedLocal)) {
    return sanitizeRealUserProfile(cachedLocal, fbUser);
  }

  if (fbUser) {
    const displayName =
      fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus User';
    const fallback: UserProfile = {
      id: fbUser.uid,
      name: displayName,
      email: fbUser.email || '',
      role: 'student',
      department: 'Computer Science & Engineering',
      matricOrStaffId: '',
      avatarTag: deriveInitials(displayName),
      isProfileComplete: false,
      isDemo: false,
    };
    writeLocalUserProfileCache(fallback);
    await withFirestoreTimeout(
      setDoc(
        userRef,
        {
          ...fallback,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      1500
    );
    return fallback;
  }

  return null;
};

/**
 * Subscribes to Firebase Auth state changes and resolves the corresponding Firestore UserProfile.
 */
export const subscribeToFirebaseAuth = (
  onUserChanged: (user: UserProfile | null) => void
): (() => void) => {
  const services = initFirebaseServices();
  if (!services) {
    return () => { };
  }

  return onAuthStateChanged(services.auth, async (fbUser) => {
    if (!fbUser) {
      onUserChanged(null);
      return;
    }
    try {
      const profile = await fetchUserProfileFromFirestore(fbUser.uid, fbUser);
      onUserChanged(profile);
    } catch (err) {
      console.error('[Chalk Firebase] Failed to fetch user profile:', err);
    }
  });
};

export const signOutFirebaseUser = async (): Promise<void> => {
  const services = initFirebaseServices();
  if (!services) return;
  await signOut(services.auth);
};

export const getCurrentFirebaseIdToken = async (): Promise<string | null> => {
  const services = initFirebaseServices();
  if (!services || !services.auth.currentUser) return null;
  try {
    return await services.auth.currentUser.getIdToken();
  } catch {
    return null;
  }
};

/**
 * Seeds default courses, announcements, and assignments into Cloud Firestore
 * if the collections are empty on first connect.
 */
export const MOCK_COURSE_IDS = new Set(['legacy_mock_01', ...DEMO_COURSE_IDS]);
export const MOCK_ANNOUNCEMENT_IDS = new Set(['legacy_ann_01']);
export const MOCK_ASSIGNMENT_IDS = new Set(['legacy_asg_01']);

/**
 * Purges any previously seeded mock courses, announcements, or assignments from Cloud Firestore.
 */
export const purgeFirestoreMockSeedData = async (): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !firestoreReachable || !services.auth.currentUser) return;

  const { db } = services;
  try {
    const batch = writeBatch(db);
    for (const id of MOCK_COURSE_IDS) {
      batch.delete(doc(db, 'courses', id));
    }
    for (const id of MOCK_ANNOUNCEMENT_IDS) {
      batch.delete(doc(db, 'announcements', id));
    }
    for (const id of MOCK_ASSIGNMENT_IDS) {
      batch.delete(doc(db, 'assignments', id));
    }
    await withFirestoreTimeout(batch.commit(), 3000);
  } catch {
    // ignore
  }
};

/**
 * Ensures no mock data resides in Cloud Firestore.
 */
export const ensureFirestoreSeedData = async (): Promise<void> => {
  await purgeFirestoreMockSeedData();
};

/**
 * Real-time Cloud Firestore listeners for Courses, Announcements, and Assignments.
 */
export const subscribeToFirestoreCatalog = (callbacks: {
  onCourses: (courses: CourseModel[]) => void;
  onAnnouncements: (announcements: CourseAnnouncement[]) => void;
  onAssignments: (assignments: ClassworkAssignment[]) => void;
}): (() => void) => {
  const services = initFirebaseServices();
  if (!services || !services.auth.currentUser) {
    return () => { };
  }

  const { db } = services;

  const unsubCourses = onSnapshot(
    collection(db, 'courses'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as CourseModel)
        .filter((c) => c && typeof c.id === 'string' && !MOCK_COURSE_IDS.has(c.id));
      callbacks.onCourses(list);
    },
    () => {
      // ignore snapshot permission/network errors without disabling future writes
    }
  );

  const unsubAnnouncements = onSnapshot(
    collection(db, 'announcements'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as CourseAnnouncement)
        .filter(
          (a) =>
            a &&
            typeof a.id === 'string' &&
            !MOCK_ANNOUNCEMENT_IDS.has(a.id) &&
            typeof a.courseId === 'string' &&
            !MOCK_COURSE_IDS.has(a.courseId)
        );
      callbacks.onAnnouncements(list);
    },
    () => {
      // ignore
    }
  );

  const unsubAssignments = onSnapshot(
    collection(db, 'assignments'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as ClassworkAssignment)
        .filter(
          (a) =>
            a &&
            typeof a.id === 'string' &&
            !MOCK_ASSIGNMENT_IDS.has(a.id) &&
            typeof a.courseId === 'string' &&
            !MOCK_COURSE_IDS.has(a.courseId)
        );
      callbacks.onAssignments(list);
    },
    () => {
      // ignore
    }
  );

  return () => {
    unsubCourses();
    unsubAnnouncements();
    unsubAssignments();
  };
};

export const saveCourseToFirestore = async (course: CourseModel): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !services.auth.currentUser) return;
  const payload = stripUndefined({
    ...course,
    updatedAt: new Date().toISOString(),
  });
  await withFirestoreTimeout(
    setDoc(doc(services.db, 'courses', course.id), payload, { merge: true }),
    2500
  );
};

export const deleteCourseFromFirestore = async (courseId: string): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !services.auth.currentUser) return;
  await withFirestoreTimeout(
    deleteDoc(doc(services.db, 'courses', courseId)),
    2500
  );
};

export const saveAnnouncementToFirestore = async (
  announcement: CourseAnnouncement
): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !services.auth.currentUser) return;
  const payload = stripUndefined({
    ...announcement,
    createdAtIso: new Date().toISOString(),
  });
  await withFirestoreTimeout(
    setDoc(doc(services.db, 'announcements', announcement.id), payload, {
      merge: true,
    }),
    2500
  );
};

export const saveAssignmentSubmissionToFirestore = async (
  assignmentId: string,
  note: string,
  userId?: string
): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !firestoreReachable || !services.auth.currentUser) return;
  await withFirestoreTimeout(
    updateDoc(doc(services.db, 'assignments', assignmentId), {
      isSubmitted: true,
      dueDate: 'Submitted • Pending Review',
      submissionNote: note || 'Uploaded solution archive.',
      submittedBy: userId || 'campus_user',
      submittedAt: new Date().toISOString(),
    }),
    1500
  );
};

/**
 * Syncs live room strokes and slide state with Cloud Firestore (`rooms/{roomId}`).
 */
export const subscribeToFirestoreRoom = (
  roomId: string,
  onRoomUpdate: (data: { strokes?: StrokeData[]; activeSlideIndex?: number }) => void
): (() => void) => {
  const services = initFirebaseServices();
  if (!services || !roomId || !firestoreReachable || !services.auth.currentUser) {
    return () => { };
  }

  const roomKey = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const roomRef = doc(services.db, 'rooms', roomKey);

  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onRoomUpdate(
          snap.data() as { strokes?: StrokeData[]; activeSlideIndex?: number }
        );
      } else {
        withFirestoreTimeout(
          setDoc(
            roomRef,
            {
              roomId,
              strokes: DEFAULT_BOARD_STROKES,
              activeSlideIndex: 0,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ),
          1500
        );
      }
    },
    () => {
      firestoreReachable = false;
    }
  );
};

export const persistRoomStateToFirestore = async (
  roomId: string,
  data: { strokes?: StrokeData[]; activeSlideIndex?: number }
): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !roomId || !firestoreReachable || !services.auth.currentUser) {
    return;
  }

  const roomKey = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const roomRef = doc(services.db, 'rooms', roomKey);
  await withFirestoreTimeout(
    setDoc(
      roomRef,
      {
        roomId,
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    1500
  );
};
