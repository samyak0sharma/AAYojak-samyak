import { describe, expect, it } from 'vitest';
import { generateOpaqueToken, hashOpaqueToken, parseDurationMs } from './auth.tokens.js';

describe('authentication token primitives', () => {
  it('generates opaque tokens that are not persisted in plaintext', () => {
    const token = generateOpaqueToken();
    expect(token).toHaveLength(43);
    expect(hashOpaqueToken(token)).not.toBe(token);
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
  });

  it('generates unique tokens', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('parses configured JWT/session durations', () => {
    expect(parseDurationMs('15m')).toBe(900_000);
    expect(parseDurationMs('30d')).toBe(2_592_000_000);
  });
});

