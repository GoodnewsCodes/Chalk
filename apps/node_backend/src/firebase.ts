import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { sanitizeDisplayText, sanitizeRoomOrEntityId } from './security';

export interface FirebaseUserPayload {
  uid: string;
  email?: string;
  name?: string;
  role: 'student' | 'lecturer';
  department?: string;
  matricOrStaffId?: string;
  avatarTag?: string;
  isProfileComplete?: boolean;
  provider?: string;
  isGuest?: boolean;
}

const MAX_CACHE_ENTRIES = 2000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_FIRESTORE_PATH = path.join(DATA_DIR, 'firestore_store.json');

export type CollectionName =
  | 'users'
  | 'rooms'
  | 'replays'
  | 'courses'
  | 'announcements'
  | 'assignments'
  | 'quizzes'
  | 'notes'
  | 'metrics';

const ALL_COLLECTIONS: CollectionName[] = [
  'users',
  'rooms',
  'replays',
  'courses',
  'announcements',
  'assignments',
  'quizzes',
  'notes',
  'metrics',
];

const firestoreDatabase: Record<
  CollectionName,
  Map<string, Record<string, unknown>>
> = {
  users: new Map(),
  rooms: new Map(),
  replays: new Map(),
  courses: new Map(),
  announcements: new Map(),
  assignments: new Map(),
  quizzes: new Map(),
  notes: new Map(),
  metrics: new Map(),
};

function loadPersistedSnapshot(): void {
  try {
    if (fs.existsSync(LOCAL_FIRESTORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_FIRESTORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<
        Record<CollectionName, Record<string, Record<string, unknown>>>
      >;
      for (const col of ALL_COLLECTIONS) {
        const entries = parsed[col];
        if (entries && typeof entries === 'object') {
          for (const [k, v] of Object.entries(entries)) {
            firestoreDatabase[col].set(k, v);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Chalk Firestore] Could not load persisted store snapshot:', err);
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function schedulePersistSnapshot(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
      }
      const serialized: Record<string, Record<string, Record<string, unknown>>> = {};
      for (const col of ALL_COLLECTIONS) {
        serialized[col] = Object.fromEntries(firestoreDatabase[col].entries());
      }
      fs.writeFileSync(
        LOCAL_FIRESTORE_PATH,
        JSON.stringify(serialized),
        { encoding: 'utf8', mode: 0o600 }
      );
    } catch (err) {
      console.error('[Chalk Firestore] Failed to write snapshot to disk:', err);
    }
  }, 400);
  persistTimer.unref?.();
}

loadPersistedSnapshot();

function setBoundedMapEntry(
  map: Map<string, Record<string, unknown>>,
  key: string,
  value: Record<string, unknown>
): void {
  if (!map.has(key) && map.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) {
      map.delete(oldestKey);
    }
  }
  map.set(key, value);
  schedulePersistSnapshot();
}

let isFirebaseAdminInitialized = false;

export function initFirebaseAdmin(): boolean {
  if (isFirebaseAdminInitialized) return true;
  if (admin.apps.length > 0) {
    isFirebaseAdminInitialized = true;
    return true;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        ...(projectId ? { projectId } : {}),
      });
      isFirebaseAdminInitialized = true;
      return true;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        ...(projectId ? { projectId } : {}),
      });
      isFirebaseAdminInitialized = true;
      return true;
    }
  } catch (err) {
    console.error('[Chalk Security] Failed to initialize Firebase Admin SDK:', err);
  }

  return false;
}

/**
 * Verifies a Firebase ID Token with strict security checks:
 * 1. Enforces token length & format limits.
 * 2. Verifies cryptographic signature & revocation via Firebase Admin SDK (`checkRevoked = true`).
 * 3. Enforces Google-only sign-in provider (`google.com`).
 * 4. Resolves authoritative campus profile from Firestore `users/{uid}`.
 */
export async function verifyFirebaseIdToken(
  token: string
): Promise<FirebaseUserPayload | null> {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 4096) {
    return null;
  }

  const adminReady = initFirebaseAdmin();

  if (adminReady) {
    try {
      const decoded = await admin.auth().verifyIdToken(trimmed, true);

      const signInProvider = decoded.firebase?.sign_in_provider;
      if (signInProvider && signInProvider !== 'google.com') {
        console.warn(
          `[Chalk Security] Rejected non-Google auth provider (${signInProvider}) for uid=${decoded.uid}`
        );
        return null;
      }

      if (decoded.email_verified === false) {
        console.warn(
          `[Chalk Security] Rejected unverified email for uid=${decoded.uid}`
        );
        return null;
      }

      let role: 'student' | 'lecturer' =
        decoded.role === 'lecturer' ? 'lecturer' : 'student';
      let displayName = sanitizeDisplayText(
        decoded.name || decoded.email || 'Campus User',
        64
      );
      let department = 'Computer Science & Engineering';
      let matricOrStaffId = role === 'lecturer' ? 'STAFF/CS/2018' : 'CSC/2022/1042';
      let avatarTag =
        displayName
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'AO';
      let isProfileComplete = false;

      try {
        const userDoc = await admin
          .firestore()
          .collection('users')
          .doc(decoded.uid)
          .get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data?.role === 'lecturer' || data?.role === 'student') {
            role = data.role;
          }
          if (typeof data?.name === 'string' && data.name.trim()) {
            displayName = sanitizeDisplayText(data.name, 64);
          }
          if (typeof data?.department === 'string' && data.department.trim()) {
            department = sanitizeDisplayText(data.department, 80);
          }
          if (
            typeof data?.matricOrStaffId === 'string' &&
            data.matricOrStaffId.trim()
          ) {
            matricOrStaffId = sanitizeDisplayText(data.matricOrStaffId, 40);
          }
          if (typeof data?.avatarTag === 'string' && data.avatarTag.trim()) {
            avatarTag = sanitizeDisplayText(data.avatarTag, 4);
          }
          isProfileComplete = Boolean(data?.isProfileComplete);
        }
      } catch {
        // Fallback to local cache if Firestore read fails
        const cached = firestoreDatabase.users.get(decoded.uid);
        if (cached) {
          isProfileComplete = Boolean(cached.isProfileComplete);
        }
      }

      return {
        uid: decoded.uid,
        email: decoded.email,
        name: displayName,
        role,
        department,
        matricOrStaffId,
        avatarTag,
        isProfileComplete,
        provider: 'google.com',
        isGuest: false,
      };
    } catch {
      console.warn('[Chalk Security] Firebase ID token verification failed.');
      return null;
    }
  }

  // Scoped local development token support (disabled in production)
  const isProd = process.env.NODE_ENV === 'production';

  // Support real Firebase client Google ID Tokens (JWTs) in local dev when Admin Service Account JSON is not set
  if (!isProd && trimmed.split('.').length === 3) {
    try {
      const [, payloadB64] = trimmed.split('.');
      const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const jwtPayload = JSON.parse(decodedJson) as {
        user_id?: string;
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        iss?: string;
        exp?: number;
        firebase?: { sign_in_provider?: string };
      };

      const uid = sanitizeRoomOrEntityId(jwtPayload.user_id || jwtPayload.sub || '');
      const nowSec = Math.floor(Date.now() / 1000);
      const isGoogleIssuer =
        typeof jwtPayload.iss === 'string' &&
        jwtPayload.iss.startsWith('https://securetoken.google.com/');
      const provider = jwtPayload.firebase?.sign_in_provider;

      if (
        uid &&
        isGoogleIssuer &&
        (!jwtPayload.exp || jwtPayload.exp > nowSec - 60) &&
        (!provider || provider === 'google.com')
      ) {
        const cachedUser = firestoreDatabase.users.get(uid);
        const role: 'student' | 'lecturer' =
          cachedUser?.role === 'lecturer' ? 'lecturer' : 'student';
        const displayName = sanitizeDisplayText(
          cachedUser?.name || jwtPayload.name || jwtPayload.email || 'Campus User',
          64
        );

        return {
          uid,
          email:
            typeof cachedUser?.email === 'string'
              ? cachedUser.email
              : jwtPayload.email || '',
          name: displayName,
          role,
          department:
            typeof cachedUser?.department === 'string'
              ? cachedUser.department
              : 'Computer Science & Engineering',
          matricOrStaffId:
            typeof cachedUser?.matricOrStaffId === 'string'
              ? cachedUser.matricOrStaffId
              : role === 'lecturer'
              ? 'STAFF/CS/2018'
              : 'CSC/2022/1042',
          avatarTag:
            typeof cachedUser?.avatarTag === 'string'
              ? cachedUser.avatarTag
              : displayName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'AO',
          isProfileComplete: Boolean(cachedUser?.isProfileComplete ?? false),
          provider: 'google.com',
          isGuest: false,
        };
      }
    } catch {
      // Fall through
    }
  }

  if (!isProd && /^mock_firebase_token_[a-zA-Z0-9_-]{3,48}$/.test(trimmed)) {
    const suffix = trimmed.replace('mock_firebase_token_', '');
    const uid = suffix.startsWith('usr_') ? suffix : `usr_${suffix}`;
    const cachedUser = firestoreDatabase.users.get(uid);
    const role: 'student' | 'lecturer' =
      cachedUser?.role === 'lecturer' ? 'lecturer' : 'student';

    return {
      uid,
      email:
        typeof cachedUser?.email === 'string'
          ? cachedUser.email
          : `${suffix}@unilag.edu.ng`,
      name:
        typeof cachedUser?.name === 'string'
          ? sanitizeDisplayText(cachedUser.name, 64)
          : 'Verified Campus User',
      role,
      department:
        typeof cachedUser?.department === 'string'
          ? cachedUser.department
          : 'Computer Science & Engineering',
      matricOrStaffId:
        typeof cachedUser?.matricOrStaffId === 'string'
          ? cachedUser.matricOrStaffId
          : role === 'lecturer'
          ? 'STAFF/CS/2018'
          : 'CSC/2022/1042',
      avatarTag:
        typeof cachedUser?.avatarTag === 'string' ? cachedUser.avatarTag : 'AO',
      isProfileComplete: Boolean(cachedUser?.isProfileComplete ?? true),
      provider: 'google.com',
      isGuest: false,
    };
  }

  return null;
}

/**
 * Syncs Room & Canvas Telemetry to Cloud Firestore (`rooms/{roomId}`).
 */
export async function syncRoomToFirestore(
  roomId: string,
  roomData: Record<string, unknown>
): Promise<boolean> {
  const safeRoomId = sanitizeRoomOrEntityId(roomId);
  if (!safeRoomId) return false;

  const payload = {
    ...roomData,
    lastSyncedAt: new Date().toISOString(),
  };

  setBoundedMapEntry(firestoreDatabase.rooms, safeRoomId, payload);

  if (initFirebaseAdmin()) {
    try {
      await admin
        .firestore()
        .collection('rooms')
        .doc(safeRoomId)
        .set(payload, { merge: true });
    } catch (error) {
      console.error(`[Chalk Security] Firestore sync error for room ${safeRoomId}:`, error);
      return false;
    }
  }

  return true;
}

/**
 * Saves a verified user profile to Cloud Firestore (`users/{uid}`).
 */
export async function saveUserToFirestore(
  uid: string,
  userData: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const safeUid = sanitizeRoomOrEntityId(uid);
  if (!safeUid) return null;

  const existing = firestoreDatabase.users.get(safeUid) || {};

  const sanitizedPayload: Record<string, unknown> = {
    id: safeUid,
    name: sanitizeDisplayText(userData.name ?? existing.name ?? 'Campus User', 64),
    email:
      typeof userData.email === 'string'
        ? userData.email.trim().slice(0, 120)
        : typeof existing.email === 'string'
        ? existing.email
        : '',
    role:
      userData.role === 'lecturer'
        ? 'lecturer'
        : userData.role === 'student'
        ? 'student'
        : existing.role === 'lecturer'
        ? 'lecturer'
        : 'student',
    department: sanitizeDisplayText(
      userData.department ?? existing.department ?? 'Computer Science & Engineering',
      80
    ),
    matricOrStaffId: sanitizeDisplayText(
      userData.matricOrStaffId ?? existing.matricOrStaffId ?? 'CSC/2022/1042',
      40
    ),
    avatarTag: sanitizeDisplayText(
      userData.avatarTag ?? existing.avatarTag ?? 'AO',
      4
    ),
    isProfileComplete: Boolean(
      userData.isProfileComplete ?? existing.isProfileComplete ?? false
    ),
    provider: 'google.com',
    updatedAt: new Date().toISOString(),
  };

  setBoundedMapEntry(firestoreDatabase.users, safeUid, sanitizedPayload);

  if (initFirebaseAdmin()) {
    try {
      await admin
        .firestore()
        .collection('users')
        .doc(safeUid)
        .set(sanitizedPayload, { merge: true });
    } catch (error) {
      console.error(`[Chalk Security] Firestore save error for user ${safeUid}:`, error);
    }
  }

  return sanitizedPayload;
}

export async function listFirestoreCollection(
  col: CollectionName
): Promise<Record<string, unknown>[]> {
  if (initFirebaseAdmin()) {
    try {
      const snap = await admin.firestore().collection(col).limit(200).get();
      if (!snap.empty) {
        const docs = snap.docs.map((d) => d.data() as Record<string, unknown>);
        for (const item of docs) {
          if (typeof item.id === 'string') {
            setBoundedMapEntry(firestoreDatabase[col], item.id, item);
          }
        }
        return docs;
      }
    } catch {
      // Fallback to local persisted store
    }
  }
  return Array.from(firestoreDatabase[col].values());
}

export async function upsertFirestoreDocument(
  col: CollectionName,
  id: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const safeId = sanitizeRoomOrEntityId(id);
  if (!safeId) return null;

  const existing = firestoreDatabase[col].get(safeId) || {};
  const merged: Record<string, unknown> = {
    ...existing,
    ...data,
    id: safeId,
    updatedAt: new Date().toISOString(),
  };

  setBoundedMapEntry(firestoreDatabase[col], safeId, merged);

  if (initFirebaseAdmin()) {
    try {
      await admin
        .firestore()
        .collection(col)
        .doc(safeId)
        .set(merged, { merge: true });
    } catch (err) {
      console.error(`[Chalk Firestore] Failed to upsert ${col}/${safeId}:`, err);
    }
  }

  return merged;
}

export function getFirestoreDocument(
  collection: CollectionName,
  id: string
): Record<string, unknown> | undefined {
  const safeId = sanitizeRoomOrEntityId(id);
  if (!safeId) return undefined;
  return firestoreDatabase[collection].get(safeId);
}
