import type { TransferFailureCode } from '@/domain/transfer/failures';

export const SIMULATE_HEADER = 'x-simulate-outcome';

export type SimulatedOutcome = 'SUCCESS' | TransferFailureCode;

const OUTCOMES: readonly SimulatedOutcome[] = [
  'SUCCESS',
  'NETWORK_ERROR',
  'TIMEOUT',
  'INSUFFICIENT_FUNDS',
  'UNKNOWN_ERROR',
];

const WEIGHTS: Readonly<Record<SimulatedOutcome, number>> = {
  SUCCESS: 60,
  NETWORK_ERROR: 10,
  TIMEOUT: 10,
  INSUFFICIENT_FUNDS: 10,
  UNKNOWN_ERROR: 10,
  VALIDATION_FAILED: 0,
  UNAUTHORIZED: 0,
};

export function isSimulatedOutcome(value: string): value is SimulatedOutcome {
  return (OUTCOMES as readonly string[]).includes(value);
}

export function requestedOutcome(request: Request): SimulatedOutcome | null {
  const header = request.headers.get(SIMULATE_HEADER);
  if (header === null) return null;
  const value = header.trim().toUpperCase();
  return isSimulatedOutcome(value) ? value : null;
}

export function randomOutcome(random: () => number = Math.random): SimulatedOutcome {
  const total = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let ticket = random() * total;

  for (const outcome of OUTCOMES) {
    ticket -= WEIGHTS[outcome];
    if (ticket < 0) return outcome;
  }
  return 'SUCCESS';
}

export function resolveOutcome(request: Request, random: () => number = Math.random) {
  return requestedOutcome(request) ?? randomOutcome(random);
}

export function simulatedLatencyMs(outcome: SimulatedOutcome): number {
  if (process.env.NODE_ENV === 'test') return 0;
  return outcome === 'TIMEOUT' ? 2_000 : 400;
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0 || process.env.NODE_ENV === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
