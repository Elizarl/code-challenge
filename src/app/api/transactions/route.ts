import { createTransferRequestSchema } from '@/api/schemas';
import type { ContactId } from '@/domain/models';
import { failureStatus, type TransferFailureCode } from '@/domain/transfer/failures';
import { type TransferDraft, validateTransfer } from '@/domain/transfer/rules';
import { copy } from '@/messages/es';
import { jsonError, jsonOk, readJson, requireSession } from '@/server/http';
import { delay, resolveOutcome, simulatedLatencyMs } from '@/server/simulate';
import { executeTransfer, findUser, getAccount, listContacts, saveContact } from '@/server/store';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

export async function POST(request: Request): Promise<Response> {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  const parsed = createTransferRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError('BAD_REQUEST', copy.api.badRequest, 400);
  }

  const { userId } = guard.session;
  const account = getAccount(userId);
  const user = findUser(userId);

  if (account === null || user === null) {
    return jsonError('NOT_FOUND', copy.api.walletNotFound, 404);
  }

  const draft: TransferDraft = {
    amountInput: parsed.data.amountInput,
    recipient: {
      contactId: parsed.data.recipient.contactId as ContactId | null,
      name: parsed.data.recipient.name,
      handle: parsed.data.recipient.handle,
    },
    note: parsed.data.note,
  };

  const validation = validateTransfer(draft, {
    availableBalance: account.balance,
    ownHandles: [user.email, user.phone, guard.session.handle],
  });

  if (!validation.ok) {
    const failure: TransferFailureCode = validation.violations.some(
      (violation) => violation.code === 'AMOUNT_EXCEEDS_BALANCE',
    )
      ? 'INSUFFICIENT_FUNDS'
      : 'VALIDATION_FAILED';

    return jsonError(
      failure,
      copy.api.rulesRejected,
      failureStatus(failure),
      validation.violations,
    );
  }

  const outcome = resolveOutcome(request);
  await delay(simulatedLatencyMs(outcome));

  if (outcome !== 'SUCCESS') {
    return jsonError(outcome, copy.api.transferFailed, failureStatus(outcome));
  }

  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER) ?? undefined;
  const result = executeTransfer(userId, validation.command, idempotencyKey);

  if (result === null) {
    return jsonError(
      'INSUFFICIENT_FUNDS',
      copy.api.balanceChanged,
      failureStatus('INSUFFICIENT_FUNDS'),
    );
  }

  let savedContactId: string | null = validation.command.recipient.contactId;
  if (parsed.data.saveRecipient && validation.command.recipient.contactId === null) {
    try {
      const contact = saveContact(userId, {
        name: validation.command.recipient.name,
        handle: validation.command.recipient.handle,
      });
      savedContactId = contact.id;
    } catch {
      savedContactId = null;
    }
  }

  return jsonOk(
    {
      receipt: result.receipt,
      account: result.account,
      savedContactId,
      contacts: listContacts(userId),
    },
    201,
  );
}
