import { copy } from '@/messages/es';
import { jsonError, jsonOk, requireSession } from '@/server/http';
import { delay } from '@/server/simulate';
import { getSnapshot } from '@/server/store';

const FAIL_HEADER = 'x-simulate-wallet-error';
const EMPTY_HEADER = 'x-simulate-wallet-empty';

export async function GET(request: Request): Promise<Response> {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  if (request.headers.get(FAIL_HEADER) !== null) {
    return jsonError('UNKNOWN_ERROR', copy.api.walletLoadFailed, 500);
  }

  await delay(300);

  const snapshot = getSnapshot(guard.session.userId);
  if (snapshot === null) {
    return jsonError('NOT_FOUND', copy.api.walletNotFound, 404);
  }

  if (request.headers.get(EMPTY_HEADER) !== null) {
    return jsonOk({ ...snapshot, movements: [] });
  }

  return jsonOk(snapshot);
}
