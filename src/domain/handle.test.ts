import { describe, expect, it } from 'vitest';

import { canonicaliseHandle, classifyHandle, handlesMatch, isValidHandle } from './handle';

describe('classifyHandle', () => {
  it.each(['demo@wallet.com', 'a.b+tag@sub.example.co.uk'])('accepts email %s', (value) => {
    expect(classifyHandle(value)).toBe('email');
  });

  it.each(['+15555550100', '5555550100', '+1 (555) 555-0100', '555-555-0100'])(
    'accepts phone %s',
    (value) => {
      expect(classifyHandle(value)).toBe('phone');
    },
  );

  it.each(['', '   ', 'nope', 'a@b', '@example.com', 'user@', '12345', '+1234567890123456'])(
    'rejects %s',
    (value) => {
      expect(classifyHandle(value)).toBeNull();
      expect(isValidHandle(value)).toBe(false);
    },
  );
});

describe('canonicaliseHandle', () => {
  it('lowercases emails', () => {
    expect(canonicaliseHandle('  Demo@Wallet.COM ')).toBe('demo@wallet.com');
  });

  it('strips phone formatting', () => {
    expect(canonicaliseHandle('+1 (555) 555-0100')).toBe('+15555550100');
  });
});

describe('handlesMatch', () => {
  it('matches the same person written differently', () => {
    expect(handlesMatch('Demo@Wallet.com', 'demo@wallet.com')).toBe(true);
    expect(handlesMatch('+1 555-555-0100', '+15555550100')).toBe(true);
  });

  it('does not match different people', () => {
    expect(handlesMatch('demo@wallet.com', 'other@wallet.com')).toBe(false);
  });
});
