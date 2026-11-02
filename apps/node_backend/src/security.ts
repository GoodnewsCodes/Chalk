import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { LaserPointerEvent, StrokeDelta, StrokeTool, VectorPoint } from './types';
import { FirebaseUserPayload, verifyFirebaseIdToken } from './firebase';

// --- Security Constants & Bounds ---
export const MAX_ROOMS = 200;
export const MAX_PARTICIPANTS_PER_ROOM = 250;
export const MAX_STROKES_PER_ROOM = 2500;
export const MAX_POINTS_PER_STROKE = 400;
export const MAX_DVR_EVENTS_PER_ROOM = 5000;

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const VALID_TOOLS = new Set<StrokeTool>([
  'pen',
  'highlighter',
  'eraser',
  'laser',
  'rect',
  'circle',
  'arrow',
  'line',
]);
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9 _.-]{1,48}$/;

/**
 * Sanitizes plain-text display strings against XSS, control characters, and excessive length.
 */
export function sanitizeDisplayText(input: unknown, maxLength = 64): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '') // Strip control chars
    .replace(/[<>'"`&]/g, '') // Strip HTML/script injection chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and normalizes room/entity IDs and blocks prototype pollution keys.
 */
export function sanitizeRoomOrEntityId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || FORBIDDEN_KEYS.has(trimmed.toLowerCase())) {
    return null;
  }
  if (!SAFE_ID_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Validates normalized [0.0, 1.0] coordinate values.
 */
export function isValidCoordinate(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 1;
}

/**
 * Validates and sanitizes an incoming StrokeDelta payload.
 * Overwrites userId and userName with the server-verified socket identity to prevent spoofing.
 */
export function validateAndSanitizeStroke(
  raw: unknown,
  verifiedUser: { userId: string; userName: string }
): StrokeDelta | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  const roomId = sanitizeRoomOrEntityId(candidate.roomId);
  const strokeId = sanitizeRoomOrEntityId(candidate.id);
  if (!roomId || !strokeId) return null;

  const tool = candidate.tool as StrokeTool;
  if (!VALID_TOOLS.has(tool)) return null;

  const color =
    typeof candidate.color === 'string' && HEX_COLOR_REGEX.test(candidate.color)
      ? candidate.color
      : '#69DB7C';

  const rawWidth = Number(candidate.width);
  const width =
    Number.isFinite(rawWidth) && rawWidth >= 1 && rawWidth <= 32 ? rawWidth : 3.5;

  if (!Array.isArray(candidate.points) || candidate.points.length === 0) {
    return null;
  }

  const boundedPoints = candidate.points.slice(0, MAX_POINTS_PER_STROKE);
  const cleanPoints: VectorPoint[] = [];

  for (const pt of boundedPoints) {
    if (!pt || typeof pt !== 'object') return null;
    const p = pt as Record<string, unknown>;
    if (!isValidCoordinate(p.x) || !isValidCoordinate(p.y)) {
      return null;
    }
    const pressure =
      typeof p.pressure === 'number' &&
      Number.isFinite(p.pressure) &&
      p.pressure >= 0 &&
      p.pressure <= 1
        ? p.pressure
        : undefined;
    cleanPoints.push({ x: p.x, y: p.y, ...(pressure !== undefined ? { pressure } : {}) });
  }

  const rawSlide = Number(candidate.slideIndex);
  const slideIndex =
    Number.isInteger(rawSlide) && rawSlide >= 0 && rawSlide <= 50 ? rawSlide : 0;

  return {
    id: strokeId,
    roomId,
    userId: verifiedUser.userId,
    userName: verifiedUser.userName,
    timestamp: Date.now(),
    tool,
    color,
    width,
    points: cleanPoints,
    slideIndex,
    isComplete: Boolean(candidate.isComplete ?? true),
  };
}

/**
 * Sanitizes free-form multi-line text (chat, notes, quiz copy). Unlike
 * sanitizeDisplayText it keeps punctuation and newlines because the clients
 * always render it as escaped text, never as HTML.
 */
export function sanitizeMultilineText(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

export interface SanitizedSignal {
  description?: { type: 'offer' | 'answer' | 'pranswer' | 'rollback'; sdp: string };
  candidate?: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
    usernameFragment?: string | null;
  } | null;
}

const VALID_SDP_TYPES = new Set(['offer', 'answer', 'pranswer', 'rollback']);

/**
 * Validates a WebRTC signaling payload (SDP description or ICE candidate) before relaying it.
 */
export function validateWebRtcSignal(raw: unknown): SanitizedSignal | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  if (candidate.description && typeof candidate.description === 'object') {
    const desc = candidate.description as Record<string, unknown>;
    if (typeof desc.type !== 'string' || !VALID_SDP_TYPES.has(desc.type)) return null;
    const sdp = typeof desc.sdp === 'string' ? desc.sdp : '';
    if (sdp.length > 24_000) return null;
    return {
      description: {
        type: desc.type as 'offer' | 'answer' | 'pranswer' | 'rollback',
        sdp,
      },
    };
  }

  if ('candidate' in candidate) {
    const ice = candidate.candidate;
    if (ice === null) return { candidate: null };
    if (!ice || typeof ice !== 'object') return null;
    const c = ice as Record<string, unknown>;
    if (typeof c.candidate !== 'string' || c.candidate.length > 1024) return null;
    const sdpMid =
      typeof c.sdpMid === 'string' && c.sdpMid.length <= 64 ? c.sdpMid : null;
    const sdpMLineIndex =
      typeof c.sdpMLineIndex === 'number' &&
      Number.isInteger(c.sdpMLineIndex) &&
      c.sdpMLineIndex >= 0 &&
      c.sdpMLineIndex < 64
        ? c.sdpMLineIndex
        : null;
    const usernameFragment =
      typeof c.usernameFragment === 'string' && c.usernameFragment.length <= 256
        ? c.usernameFragment
        : null;
    return {
      candidate: { candidate: c.candidate, sdpMid, sdpMLineIndex, usernameFragment },
    };
  }

  return null;
}

/**
 * Validates and sanitizes an incoming LaserPointerEvent payload.
 */
export function validateAndSanitizeLaser(
  raw: unknown,
  verifiedUser: { userId: string; userName: string }
): LaserPointerEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  const roomId = sanitizeRoomOrEntityId(candidate.roomId);
  if (!roomId) return null;

  if (!isValidCoordinate(candidate.x) || !isValidCoordinate(candidate.y)) {
    return null;
  }

  return {
    roomId,
    userId: verifiedUser.userId,
    userName: verifiedUser.userName,
    x: candidate.x,
    y: candidate.y,
    active: Boolean(candidate.active),
  };
}

/**
 * Strict HTTP Security Headers Middleware (Helmet-equivalent defense-in-depth).
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  );
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
}

/**
 * Sliding-Window Rate Limiter for HTTP Endpoints & Socket.io Events.
 */
export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodic cleanup of expired buckets to prevent memory growth
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.buckets.entries()) {
        if (now > entry.resetAt) {
          this.buckets.delete(key);
        }
      }
    }, Math.max(30_000, windowMs));
    timer.unref?.();
  }

  public allow(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || now > existing.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetMs: this.windowMs,
      };
    }

    if (existing.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, existing.resetAt - now),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - existing.count,
      resetMs: Math.max(0, existing.resetAt - now),
    };
  }
}

export function createExpressRateLimiter(maxRequests: number, windowMs: number) {
  const limiter = new SlidingWindowRateLimiter(maxRequests, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const result = limiter.allow(clientIp);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(result.resetMs / 1000)));
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
      });
      return;
    }

    next();
  };
}

/**
 * Express Bearer Token Authentication Middleware using Firebase Admin verification.
 */
export interface AuthenticatedRequest extends Request {
  user?: FirebaseUserPayload;
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Missing or malformed Authorization Bearer token.',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    res.status(401).json({
      error: 'Invalid, expired, or non-Google Firebase ID token.',
    });
    return;
  }

  req.user = verified;
  next();
}

/**
 * Verifies Socket.io handshake authentication.
 * Allows verified Firebase Google users or explicitly scoped read/trial guest sessions.
 */
export async function authenticateSocketConnection(
  socket: Socket
): Promise<FirebaseUserPayload> {
  const token =
    typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token.trim()
      : typeof socket.handshake.headers.authorization === 'string' &&
        socket.handshake.headers.authorization.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.slice(7).trim()
      : '';

  if (token) {
    const verified = await verifyFirebaseIdToken(token);
    if (verified) {
      return verified;
    }
  }

  // Scoped guest identity for "Try a Live Class" trial sessions (never granted lecturer role)
  const rawGuestName = sanitizeDisplayText(
    socket.handshake.auth?.guestName,
    32
  );
  return {
    uid: `guest_${socket.id.slice(0, 12)}`,
    name: rawGuestName || 'Guest Student',
    role: 'student',
    isGuest: true,
  };
}

