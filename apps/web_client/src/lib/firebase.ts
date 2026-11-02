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
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_COURSES,
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

const withFirestoreTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs = 1800
): Promise<T | null> => {
  if (!firestoreReachable) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        firestoreReachable = false;
        resolve(null);
      }, timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } catch {
    firestoreReachable = false;
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const deriveInitials = (name: string): string => {
  const cleaned = name.trim();
  if (!cleaned) return 'AO';
  return (
    cleaned
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AO'
  );
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
    const mergedUser: UserProfile = {
      ...existingData,
      id: fbUser.uid,
      email: fbUser.email || existingData.email || '',
      name: existingData.name || fbUser.displayName || 'Campus User',
    };
    writeLocalUserProfileCache(mergedUser);
    return {
      user: mergedUser,
      isNewUser: !mergedUser.isProfileComplete,
    };
  }

  if (cachedLocal) {
    const mergedCached: UserProfile = {
      ...cachedLocal,
      id: fbUser.uid,
      email: fbUser.email || cachedLocal.email || '',
      name: cachedLocal.name || fbUser.displayName || 'Campus User',
    };
    writeLocalUserProfileCache(mergedCached);
    return {
      user: mergedCached,
      isNewUser: !mergedCached.isProfileComplete,
    };
  }

  // First-time Google sign-up: create initial user doc in Firestore
  const displayName =
    fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus Student';
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
    matricOrStaffId: isLecturerHint ? 'STAFF/CS/2018' : 'CSC/2022/1042',
    avatarTag: deriveInitials(displayName),
    isProfileComplete: false,
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
 */
export const saveUserProfileToFirestore = async (
  profile: UserProfile
): Promise<UserProfile> => {
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
  if (!services) return cachedLocal;

  const userRef = doc(services.db, 'users', uid);
  const snap = await withFirestoreTimeout(getDoc(userRef), 1800);
  if (snap && snap.exists()) {
    const data = snap.data() as UserProfile;
    writeLocalUserProfileCache(data);
    return data;
  }

  if (cachedLocal) {
    return cachedLocal;
  }

  if (fbUser) {
    const displayName =
      fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus Student';
    const fallback: UserProfile = {
      id: fbUser.uid,
      name: displayName,
      email: fbUser.email || '',
      role: 'student',
      department: 'Computer Science & Engineering',
      matricOrStaffId: 'CSC/2022/1042',
      avatarTag: deriveInitials(displayName),
      isProfileComplete: false,
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
export const ensureFirestoreSeedData = async (): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !firestoreReachable || !services.auth.currentUser) return;

  const { db } = services;
  try {
    const coursesSnap = await withFirestoreTimeout(
      getDocs(collection(db, 'courses')),
      1800
    );
    if (coursesSnap && coursesSnap.empty) {
      const batch = writeBatch(db);
      for (const course of INITIAL_COURSES) {
        batch.set(doc(db, 'courses', course.id), course);
      }
      for (const ann of INITIAL_ANNOUNCEMENTS) {
        batch.set(doc(db, 'announcements', ann.id), ann);
      }
      for (const assign of INITIAL_ASSIGNMENTS) {
        batch.set(doc(db, 'assignments', assign.id), assign);
      }
      await withFirestoreTimeout(batch.commit(), 1800);
    }
  } catch {
    firestoreReachable = false;
  }
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
  if (!services || !firestoreReachable || !services.auth.currentUser) {
    return () => { };
  }

  const { db } = services;

  const unsubCourses = onSnapshot(
    collection(db, 'courses'),
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as CourseModel);
        callbacks.onCourses(list);
      }
    },
    () => {
      firestoreReachable = false;
    }
  );

  const unsubAnnouncements = onSnapshot(
    collection(db, 'announcements'),
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as CourseAnnouncement);
        callbacks.onAnnouncements(list);
      }
    },
    () => {
      firestoreReachable = false;
    }
  );

  const unsubAssignments = onSnapshot(
    collection(db, 'assignments'),
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as ClassworkAssignment);
        callbacks.onAssignments(list);
      }
    },
    () => {
      firestoreReachable = false;
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
  if (!services || !firestoreReachable || !services.auth.currentUser) return;
  await withFirestoreTimeout(
    setDoc(
      doc(services.db, 'courses', course.id),
      {
        ...course,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    1500
  );
};

export const saveAnnouncementToFirestore = async (
  announcement: CourseAnnouncement
): Promise<void> => {
  const services = initFirebaseServices();
  if (!services || !firestoreReachable || !services.auth.currentUser) return;
  await withFirestoreTimeout(
    setDoc(
      doc(services.db, 'announcements', announcement.id),
      {
        ...announcement,
        createdAtIso: new Date().toISOString(),
      },
      { merge: true }
    ),
    1500
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
