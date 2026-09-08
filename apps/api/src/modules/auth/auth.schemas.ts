import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .refine((value) => /[a-z]/.test(value), 'Password must include a lowercase letter.')
  .refine((value) => /[A-Z]/.test(value), 'Password must include an uppercase letter.')
  .refine((value) => /\d/.test(value), 'Password must include a number.')
  .refine((value) => /[^A-Za-z0-9]/.test(value), 'Password must include a special character.');

export const registerSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: passwordSchema,
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();

export const emailOnlySchema = z
  .object({
    email: z.string().trim().email().max(320),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(512),
    password: passwordSchema,
  })
  .strict();

export const tokenSchema = z
  .object({
    token: z.string().trim().min(20).max(512),
  })
  .strict();

export const oauthCallbackSchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
});

