import { redirect } from 'next/navigation';

import { readSession, type Session } from './session';

export async function requireSessionOrRedirect(next?: string): Promise<Session> {
  const session = await readSession();
  if (session === null) {
    redirect(next === undefined ? '/login' : `/login?next=${encodeURIComponent(next)}`);
  }
  return session;
}
