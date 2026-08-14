import { loginRequestSchema } from '@/api/schemas';
import { isValidHandle } from '@/domain/handle';
import { copy } from '@/messages/es';
import { jsonError, jsonOk, readJson } from '@/server/http';
import { clearSession, writeSession } from '@/server/session';
import { delay } from '@/server/simulate';
import { findUser, getDemoUserId } from '@/server/store';

const SIMULATED_ERROR_MARKER = 'error';

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const parsed = loginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('BAD_REQUEST', copy.api.handleRequired, 400);
  }

  const { handle } = parsed.data;

  await delay(600);

  if (!isValidHandle(handle)) {
    return jsonError('INVALID_HANDLE', copy.api.handleInvalid, 400);
  }

  if (handle.toLowerCase().includes(SIMULATED_ERROR_MARKER)) {
    return jsonError('LOGIN_FAILED', copy.api.loginFailed, 500);
  }

  const userId = getDemoUserId();
  const user = findUser(userId);
  if (user === null) {
    return jsonError('UNKNOWN_ERROR', copy.api.userNotFound, 500);
  }

  await writeSession({ userId, handle, issuedAt: new Date().toISOString() });

  return jsonOk({ user });
}

export async function DELETE(): Promise<Response> {
  await clearSession();
  return jsonOk({ ok: true });
}
