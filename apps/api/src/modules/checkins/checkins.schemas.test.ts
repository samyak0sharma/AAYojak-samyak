import { describe, expect, it } from 'vitest';
import { checkInSchema } from './checkins.schemas.js';

describe('check-in input', () => {
  it('accepts either an opaque QR payload or a manual ticket code', () => {
    expect(checkInSchema.parse({ payload: 'aayojak:v1:abcdefghijklmnopqrstuvwxyz123456' }).payload).toContain('aayojak:v1:');
    expect(checkInSchema.parse({ ticketCode: 'AYK-12345678' }).ticketCode).toBe('AYK-12345678');
  });

  it('rejects empty and oversized scanner input', () => {
    expect(checkInSchema.safeParse({}).success).toBe(false);
    expect(checkInSchema.safeParse({ payload: 'x'.repeat(501) }).success).toBe(false);
  });
});
