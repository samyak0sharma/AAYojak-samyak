import { createConnection, type Socket } from 'node:net';
import { connect as connectTls, type TLSSocket } from 'node:tls';
import { env } from '../../config/env.js';

export interface VerificationEmailInput { to: string; recipientName: string; token: string; expiresAt: Date; }
export interface PasswordResetEmailInput { to: string; recipientName: string; token: string; expiresAt: Date; }
export interface EmailDeliveryResult { provider: string; status: 'accepted' | 'not_configured'; }
export interface EmailService {
  sendVerificationEmail(input: VerificationEmailInput): Promise<EmailDeliveryResult>;
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailDeliveryResult>;
}

type MailSocket = Socket | TLSSocket;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function encodeHeader(value: string) { return /[^\x20-\x7e]/.test(value) ? `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=` : value; }
function dotStuff(value: string) { return value.replace(/^\./gm, '..').replace(/\r?\n/g, '\r\n'); }

class SmtpConnection {
  private socket: MailSocket | undefined;
  private buffered = '';
  private lines: string[] = [];
  private waiting: ((line: string) => void) | undefined;

  async open() {
    this.socket = await new Promise<MailSocket>((resolve, reject) => {
      const socket = env.SMTP_SECURE ? connectTls({ host: env.SMTP_HOST, port: env.SMTP_PORT, servername: env.SMTP_HOST }) : createConnection({ host: env.SMTP_HOST, port: env.SMTP_PORT });
      const onError = (error: Error) => reject(error);
      socket.once('error', onError);
      const connected = () => { socket.removeListener('error', onError); resolve(socket); };
      socket.once(env.SMTP_SECURE ? 'secureConnect' : 'connect', connected);
    });
    this.attach(this.socket); await this.expect(220);
  }

  private attach(socket: MailSocket) {
    socket.on('data', (chunk: Buffer | string) => {
      this.buffered += chunk.toString('utf8');
      let index = this.buffered.indexOf('\n');
      while (index >= 0) {
        const line = this.buffered.slice(0, index).replace(/\r$/, ''); this.buffered = this.buffered.slice(index + 1);
        if (this.waiting) { const resolve = this.waiting; this.waiting = undefined; resolve(line); } else this.lines.push(line);
        index = this.buffered.indexOf('\n');
      }
    });
  }

  private line() { if (this.lines.length) return Promise.resolve(this.lines.shift() as string); return new Promise<string>((resolve) => { this.waiting = resolve; }); }
  private async response() {
    const first = await this.line(); const code = Number(first.slice(0, 3));
    if (!Number.isInteger(code)) throw new Error('SMTP returned an invalid response.');
    if (first[3] === '-') { let next = first; while (next.slice(0, 3) !== String(code) || next[3] !== ' ') next = await this.line(); }
    return code;
  }
  private write(command: string) { if (!this.socket || this.socket.destroyed) throw new Error('SMTP connection is closed.'); this.socket.write(`${command}\r\n`); }
  private async expect(code: number) { const actual = await this.response(); if (actual !== code) throw new Error(`SMTP expected ${code} but received ${actual}.`); }

  async send(from: string, to: string, subject: string, html: string) {
    this.write(`EHLO ${env.SMTP_HOST}`); await this.expect(250);
    if (!env.SMTP_SECURE) {
      this.write('STARTTLS'); await this.expect(220);
      const current = this.socket; if (!current) throw new Error('SMTP connection is closed.');
      this.socket = await new Promise<TLSSocket>((resolve, reject) => { const secure = connectTls({ socket: current, servername: env.SMTP_HOST }); secure.once('error', reject); secure.once('secureConnect', () => resolve(secure)); });
      this.buffered = ''; this.lines = []; this.waiting = undefined; this.attach(this.socket);
      this.write(`EHLO ${env.SMTP_HOST}`); await this.expect(250);
    }
    this.write('AUTH LOGIN'); await this.expect(334); this.write(Buffer.from(env.SMTP_USER ?? '').toString('base64')); await this.expect(334); this.write(Buffer.from(env.SMTP_PASSWORD ?? '').toString('base64')); await this.expect(235);
    this.write(`MAIL FROM:<${from}>`); await this.expect(250); this.write(`RCPT TO:<${to}>`); await this.expect(250); this.write('DATA'); await this.expect(354);
    const body = [`From: ${encodeHeader(from)}`, `To: ${encodeHeader(to)}`, `Subject: ${encodeHeader(subject)}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', '', dotStuff(html), '.',].join('\r\n');
    const socket = this.socket; if (!socket) throw new Error('SMTP connection is closed.');
    socket.write(`${body}\r\n`); await this.expect(250); this.write('QUIT'); await this.expect(221); socket.end();
  }
}

function verificationHtml(input: VerificationEmailInput) { const link = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(input.token)}`; return `<p>Hello ${escapeHtml(input.recipientName)},</p><p>Verify your Aayojak account by opening <a href="${link}">this secure link</a>.</p><p>This link expires on ${input.expiresAt.toISOString()}.</p>`; }
function resetHtml(input: PasswordResetEmailInput) { const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(input.token)}`; return `<p>Hello ${escapeHtml(input.recipientName)},</p><p>Reset your Aayojak password by opening <a href="${link}">this secure link</a>.</p><p>This link expires on ${input.expiresAt.toISOString()}.</p>`; }

class SmtpEmailService implements EmailService {
  private async deliver(to: string, subject: string, html: string): Promise<EmailDeliveryResult> { const connection = new SmtpConnection(); await connection.open(); await connection.send(env.EMAIL_FROM, to, subject, html); return { provider: 'smtp', status: 'accepted' }; }
  sendVerificationEmail(input: VerificationEmailInput) { return this.deliver(input.to, 'Verify your Aayojak account', verificationHtml(input)); }
  sendPasswordResetEmail(input: PasswordResetEmailInput) { return this.deliver(input.to, 'Reset your Aayojak password', resetHtml(input)); }
}

class DevelopmentEmailService implements EmailService {
  async sendVerificationEmail(_input: VerificationEmailInput): Promise<EmailDeliveryResult> { console.warn('Email delivery is not configured; verification email was not sent.'); return { provider: 'console', status: 'not_configured' }; }
  async sendPasswordResetEmail(_input: PasswordResetEmailInput): Promise<EmailDeliveryResult> { console.warn('Email delivery is not configured; password reset email was not sent.'); return { provider: 'console', status: 'not_configured' }; }
}

export const emailService: EmailService = env.EMAIL_PROVIDER.toLowerCase() === 'console' ? new DevelopmentEmailService() : new SmtpEmailService();
