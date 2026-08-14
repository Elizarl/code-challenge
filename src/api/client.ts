import type { Account, Contact, Receipt, WalletSnapshot } from '@/domain/models';
import { isRetryable, type TransferFailureCode } from '@/domain/transfer/failures';
import type { TransferViolation } from '@/domain/transfer/violations';

import type { CreateContactRequest, CreateTransferRequest } from './schemas';

export interface ApiFailure {
  readonly code: TransferFailureCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly violations: readonly TransferViolation[];
}

export type ApiResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly failure: ApiFailure };

const DEFAULT_TIMEOUT_MS = 8_000;
const TRANSFER_TIMEOUT_MS = 1_500;

function failure(code: TransferFailureCode, message: string, violations: TransferViolation[] = []) {
  return {
    ok: false as const,
    failure: { code, message, retryable: isRetryable(code), violations },
  };
}

function statusToCode(status: number): TransferFailureCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 409) return 'INSUFFICIENT_FUNDS';
  if (status === 422 || status === 400) return 'VALIDATION_FAILED';
  if (status === 504) return 'TIMEOUT';
  if (status === 502 || status === 503) return 'NETWORK_ERROR';
  return 'UNKNOWN_ERROR';
}

interface RequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly timeoutMs?: number;
  readonly headers?: Record<string, string>;
  readonly signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, signal } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort();
  };
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const envelope =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? (payload as { error: Record<string, unknown> }).error
          : {};

      const rawCode = typeof envelope['code'] === 'string' ? envelope['code'] : null;
      const code =
        rawCode !== null && isTransferFailureCode(rawCode)
          ? rawCode
          : statusToCode(response.status);

      const message =
        typeof envelope['message'] === 'string' ? envelope['message'] : 'Ocurrió un error.';

      const violations = Array.isArray(envelope['violations'])
        ? (envelope['violations'] as TransferViolation[])
        : [];

      return failure(code, message, violations);
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return failure('TIMEOUT', 'La operación tardó demasiado.');
    }
    if (error instanceof TypeError) {
      return failure('NETWORK_ERROR', 'No pudimos conectarnos al servidor.');
    }
    return failure('UNKNOWN_ERROR', 'Ocurrió un error inesperado.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

const FAILURE_CODES: readonly string[] = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'INSUFFICIENT_FUNDS',
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'UNKNOWN_ERROR',
];

function isTransferFailureCode(value: string): value is TransferFailureCode {
  return FAILURE_CODES.includes(value);
}

export function login(handle: string, signal?: AbortSignal) {
  return request<{ user: WalletSnapshot['user'] }>('/api/session', {
    method: 'POST',
    body: { handle },
    ...(signal ? { signal } : {}),
  });
}

export function logout() {
  return request<{ ok: boolean }>('/api/session', { method: 'DELETE' });
}

export function fetchWallet(
  options: { signal?: AbortSignal } = {},
): Promise<ApiResult<WalletSnapshot>> {
  return request<WalletSnapshot>('/api/wallet', {
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

export function fetchContacts(signal?: AbortSignal) {
  return request<{ contacts: Contact[] }>('/api/contacts', {
    ...(signal ? { signal } : {}),
  });
}

export function createContact(input: CreateContactRequest) {
  return request<{ contact: Contact }>('/api/contacts', { method: 'POST', body: input });
}

export interface CreateTransferResponse {
  readonly receipt: Receipt;
  readonly account: Account;
  readonly savedContactId: string | null;
  readonly contacts: readonly Contact[];
}

export function createTransfer(input: CreateTransferRequest, options: { idempotencyKey: string }) {
  return request<CreateTransferResponse>('/api/transactions', {
    method: 'POST',
    body: input,
    timeoutMs: TRANSFER_TIMEOUT_MS,
    headers: { 'idempotency-key': options.idempotencyKey },
  });
}
