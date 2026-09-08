import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.schemas.js';

describe('authentication request validation', () => {
  it('accepts a strong registration password', () => {
    const result = registerSchema.safeParse({
      email: 'person@example.com',
      password: 'StrongPass!123',
      firstName: 'Asha',
      lastName: 'Rai',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak passwords and malformed login bodies', () => {
    expect(
      registerSchema.safeParse({
        email: 'person@example.com',
        password: 'password',
        firstName: 'Asha',
        lastName: 'Rai',
      }).success,
    ).toBe(false);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success).toBe(false);
  });
});

