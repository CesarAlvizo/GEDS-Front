import { randomBytes } from 'node:crypto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();

export function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { userId: Number(userId), expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function resolveSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function revokeSession(token) {
  if (token) sessions.delete(token);
}

export function readSessionCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith('geds_session='));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice('geds_session='.length)) : '';
}

export function sessionCookie(token, secure = false) {
  return `geds_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`;
}

export function expiredSessionCookie(secure = false) {
  return `geds_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}
