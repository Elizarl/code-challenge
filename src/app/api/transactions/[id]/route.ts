import type { TransactionId } from '@/domain/models';
import { copy } from '@/messages/es';
import { jsonError, jsonOk, requireSession } from '@/server/http';
import { findReceipt } from '@/server/store';

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/transactions/[id]'>,
): Promise<Response> {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const receipt = findReceipt(id as TransactionId);

  if (receipt === null) {
    return jsonError('NOT_FOUND', copy.api.receiptNotFound, 404);
  }

  return jsonOk({ receipt });
}
