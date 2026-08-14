export type TransferFailureCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INSUFFICIENT_FUNDS'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_ERROR';

export interface TransferFailure {
  readonly code: TransferFailureCode;
  readonly retryable: boolean;
}

export function isRetryable(code: TransferFailureCode): boolean {
  switch (code) {
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
    case 'UNKNOWN_ERROR':
      return true;
    case 'INSUFFICIENT_FUNDS':
    case 'VALIDATION_FAILED':
    case 'UNAUTHORIZED':
      return false;
  }
}

export function transferFailure(code: TransferFailureCode): TransferFailure {
  return { code, retryable: isRetryable(code) };
}

export function failureStatus(code: TransferFailureCode): number {
  switch (code) {
    case 'VALIDATION_FAILED':
      return 422;
    case 'INSUFFICIENT_FUNDS':
      return 409;
    case 'UNAUTHORIZED':
      return 401;
    case 'TIMEOUT':
      return 504;
    case 'NETWORK_ERROR':
      return 502;
    case 'UNKNOWN_ERROR':
      return 500;
  }
}
