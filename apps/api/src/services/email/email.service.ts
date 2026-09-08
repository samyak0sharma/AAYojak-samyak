import { env } from '../../config/env.js';

export interface VerificationEmailInput {
  to: string;
  recipientName: string;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetEmailInput {
  to: string;
  recipientName: string;
  token: string;
  expiresAt: Date;
}

export interface EmailDeliveryResult {
  provider: string;
  status: 'accepted' | 'not_configured';
}

export interface EmailService {
  sendVerificationEmail(input: VerificationEmailInput): Promise<EmailDeliveryResult>;
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailDeliveryResult>;
}

class DevelopmentEmailService implements EmailService {
  async sendVerificationEmail(_input: VerificationEmailInput): Promise<EmailDeliveryResult> {
    console.warn('Email delivery is not configured; verification email was not sent.');
    return { provider: 'console', status: 'not_configured' };
  }

  async sendPasswordResetEmail(_input: PasswordResetEmailInput): Promise<EmailDeliveryResult> {
    console.warn('Email delivery is not configured; password reset email was not sent.');
    return { provider: 'console', status: 'not_configured' };
  }
}

class UnavailableEmailService implements EmailService {
  async sendVerificationEmail(_input: VerificationEmailInput): Promise<EmailDeliveryResult> {
    console.error(`Configured email provider "${env.EMAIL_PROVIDER}" has no Phase 4 adapter.`);
    return { provider: env.EMAIL_PROVIDER, status: 'not_configured' };
  }

  async sendPasswordResetEmail(_input: PasswordResetEmailInput): Promise<EmailDeliveryResult> {
    console.error(`Configured email provider "${env.EMAIL_PROVIDER}" has no Phase 4 adapter.`);
    return { provider: env.EMAIL_PROVIDER, status: 'not_configured' };
  }
}

export const emailService: EmailService =
  env.EMAIL_PROVIDER.toLowerCase() === 'console'
    ? new DevelopmentEmailService()
    : new UnavailableEmailService();

