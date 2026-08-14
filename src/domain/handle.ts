export type HandleKind = 'email' | 'phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const PHONE_PATTERN = /^\+?\d{7,15}$/;

export function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export function classifyHandle(raw: string): HandleKind | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (EMAIL_PATTERN.test(trimmed)) return 'email';
  if (PHONE_PATTERN.test(normalisePhone(trimmed))) return 'phone';
  return null;
}

export function isValidHandle(raw: string): boolean {
  return classifyHandle(raw) !== null;
}

export function canonicaliseHandle(raw: string): string {
  const trimmed = raw.trim();
  return classifyHandle(trimmed) === 'phone' ? normalisePhone(trimmed) : trimmed.toLowerCase();
}

export function handlesMatch(a: string, b: string): boolean {
  return canonicaliseHandle(a) === canonicaliseHandle(b);
}
