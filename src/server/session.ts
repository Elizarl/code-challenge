import { cookies } from 'next/headers';

import type { UserId } from '@/domain/models';

export const SESSION_COOKIE = 'wallet_session';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export interface Session {
  readonly userId: UserId;
  readonly handle: string;
  readonly issuedAt: string;
}

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
}

export function decodeSession(raw: string | undefined): Session | null {
  if (raw === undefined || raw === '') return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));

    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;

    if (
      typeof candidate['userId'] !== 'string' ||
      typeof candidate['handle'] !== 'string' ||
      typeof candidate['issuedAt'] !== 'string'
    ) {
      return null;
    }

    return {
      userId: candidate['userId'] as UserId,
      handle: candidate['handle'],
      issuedAt: candidate['issuedAt'],
    };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function writeSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
