import { createContactRequestSchema } from '@/api/schemas';
import { isValidHandle } from '@/domain/handle';
import { copy } from '@/messages/es';
import { jsonError, jsonOk, readJson, requireSession } from '@/server/http';
import { delay } from '@/server/simulate';
import { listContacts, saveContact } from '@/server/store';

export async function GET(): Promise<Response> {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  await delay(200);
  return jsonOk({ contacts: listContacts(guard.session.userId) });
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  const parsed = createContactRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError('BAD_REQUEST', copy.api.invalidContact, 400);
  }

  if (!isValidHandle(parsed.data.handle)) {
    return jsonError('INVALID_HANDLE', copy.api.handleInvalid, 400);
  }

  await delay(200);
  const contact = saveContact(guard.session.userId, parsed.data);
  return jsonOk({ contact }, 201);
}
