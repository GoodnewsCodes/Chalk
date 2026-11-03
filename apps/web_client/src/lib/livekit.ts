import { getCurrentFirebaseIdToken } from './firebase';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  name: string;
  role?: string;
  avatarTag?: string;
}

export interface LiveKitConfig {
  url: string;
  configured: boolean;
}

const BACKEND_BASE = 'http://localhost:4000';

/**
 * Fetch LiveKit server configuration
 */
export async function getLiveKitConfig(): Promise<LiveKitConfig> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/livekit/config`);
    if (!res.ok) {
      return { url: 'ws://127.0.0.1:7880', configured: false };
    }
    const data = await res.json();
    return {
      url: data.url || 'ws://127.0.0.1:7880',
      configured: Boolean(data.configured),
    };
  } catch {
    return { url: 'ws://127.0.0.1:7880', configured: false };
  }
}

/**
 * Request a cryptographically signed LiveKit AccessToken for real WebRTC conferencing
 */
export async function fetchLiveKitToken(params: {
  roomName: string;
  identity?: string;
  name?: string;
  role?: 'student' | 'lecturer';
  avatarTag?: string;
}): Promise<LiveKitTokenResponse | null> {
  try {
    const token = await getCurrentFirebaseIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE}/api/livekit/token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roomName: params.roomName,
        identity: params.identity,
        name: params.name,
        role: params.role || 'student',
        avatarTag: params.avatarTag,
      }),
    });

    if (!res.ok) {
      console.warn('[LiveKit Client] Failed to fetch LiveKit token:', res.statusText);
      return null;
    }

    const data = await res.json();
    if (!data?.token) return null;

    return {
      token: data.token,
      url: data.url || 'ws://127.0.0.1:7880',
      roomName: data.roomName || params.roomName,
      identity: data.identity,
      name: data.name || params.name || 'Campus User',
      role: data.role || params.role,
      avatarTag: data.avatarTag,
    };
  } catch (err) {
    console.warn('[LiveKit Client] LiveKit token generation error:', err);
    return null;
  }
}

