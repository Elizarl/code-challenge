import type { ApiErrorBody } from '@/api/schemas';
import { copy } from '@/messages/es';

import { readSession, type Session } from './session';

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  violations?: readonly unknown[],
): Response {
  const body: ApiErrorBody = {
    error: violations ? { code, message, violations } : { code, message },
  };
  return Response.json(body, { status });
}

export async function requireSession(): Promise<
  { ok: true; session: Session } | { ok: false; response: Response }
> {
  const session = await readSession();
  if (session === null) {
    return {
      ok: false,
      response: jsonError('UNAUTHORIZED', copy.api.noSession, 401),
    };
  }
  return { ok: true, session };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
