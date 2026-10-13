import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://aayojak:aayojak@localhost:5432/aayojak?schema=public'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:4000/api/auth/google/callback'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  PAYMENT_PROVIDER: z.enum(['none', 'khalti', 'esewa']).default('none'),
  KHALTI_SECRET_KEY: z.string().optional(),
  KHALTI_BASE_URL: z.string().url().default('https://dev.khalti.com/api/v2'),
  KHALTI_REFUND_BASE_URL: z.string().url().default('https://dev.khalti.com/api/merchant-transaction'),
  ESEWA_SECRET_KEY: z.string().optional(),
  ESEWA_BASE_URL: z.string().url().default('https://rc-epay.esewa.com.np/api/epay/main/v2/form'),
  ESEWA_STATUS_URL: z.string().url().default('https://uat.esewa.com.np/api/epay/transaction/status/'),
  ESEWA_PRODUCT_CODE: z.string().default('EPAYTEST'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return;
  if (value.EMAIL_PROVIDER.toLowerCase() === 'console') context.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_PROVIDER'], message: 'Console email delivery is not allowed in production.' });
  if (value.EMAIL_PROVIDER.toLowerCase() === 'smtp' && (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASSWORD)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_HOST'], message: 'SMTP host, user, and password are required in production.' });
  if (value.PAYMENT_PROVIDER === 'khalti' && !value.KHALTI_SECRET_KEY) context.addIssue({ code: z.ZodIssueCode.custom, path: ['KHALTI_SECRET_KEY'], message: 'Khalti secret is required when Khalti payments are enabled.' });
  if (value.PAYMENT_PROVIDER === 'khalti' && /dev\.khalti\.com/.test(value.KHALTI_BASE_URL)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['KHALTI_BASE_URL'], message: 'Production Khalti must use the production endpoint.' });
  if (value.PAYMENT_PROVIDER === 'khalti' && /dev\.khalti\.com/.test(value.KHALTI_REFUND_BASE_URL)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['KHALTI_REFUND_BASE_URL'], message: 'Production Khalti refunds must use the production endpoint.' });
  if (value.PAYMENT_PROVIDER === 'esewa' && (!value.ESEWA_SECRET_KEY || !value.ESEWA_PRODUCT_CODE)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ESEWA_SECRET_KEY'], message: 'eSewa credentials are required when eSewa payments are enabled.' });
  if (value.PAYMENT_PROVIDER === 'esewa' && /uat|rc-/.test(`${value.ESEWA_BASE_URL}${value.ESEWA_STATUS_URL}`)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ESEWA_BASE_URL'], message: 'Production eSewa must use the production endpoints.' });
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error('Invalid Aayojak API environment configuration.', parsedEnvironment.error.flatten().fieldErrors);
  throw new Error('Invalid API environment configuration.');
}

export const env = parsedEnvironment.data;
