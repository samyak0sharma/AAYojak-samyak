import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { isApiClientError } from '../api/client';
import { Container, PageMeta } from '../components/layout';
import { Button, Card, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Container className="auth-container"><PageMeta title={title} description={description} /><Card className="auth-card"><div className="auth-heading"><p className="eyebrow">आयजक · Aayojak</p><h1>{title}</h1><p>{description}</p></div>{children}</Card></Container>;
}

function messageFor(error: unknown) {
  if (isApiClientError(error)) return error.message;
  return error instanceof Error ? error.message : 'We could not complete that request.';
}

export function LoginPage() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? new URLSearchParams(location.search).get('redirect') ?? '/dashboard';
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); setLoading(true); try { await login({ email, password }); navigate(from, { replace: true }); } catch (authError) { setError(messageFor(authError)); } finally { setLoading(false); } };
  return <AuthFrame title="Welcome back" description="Sign in to keep your event plans moving."><form className="auth-form" onSubmit={submit}><Input label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} error={error} /><Input label="Password" type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><div className="auth-row"><Link to="/forgot-password">Forgot password?</Link></div><Button type="submit" loading={loading}>Sign in</Button><p className="auth-switch">New to Aayojak? <Link to="/signup">Create an account</Link></p></form></AuthFrame>;
}

export function SignupPage() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); setLoading(true); try { await register(form); navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, { replace: true }); } catch (authError) { setError(messageFor(authError)); } finally { setLoading(false); } };
  return <AuthFrame title="Create your Aayojak account" description="Save plans, follow organizers, and keep every ticket close."><form className="auth-form" onSubmit={submit}><div className="auth-fields-two"><Input label="First name" autoComplete="given-name" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /><Input label="Last name" autoComplete="family-name" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></div><Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={error} /><Input label="Password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} hint="Use at least 8 characters." /><Button type="submit" loading={loading}>Create account</Button><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></form></AuthFrame>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { await authApi.forgotPassword(email); setSent(true); } catch (authError) { setError(messageFor(authError)); } finally { setLoading(false); } };
  return <AuthFrame title="Reset your password" description="We will send next steps if the account can receive password recovery email.">{sent ? <div className="auth-success"><p>Check the inbox associated with that address for a secure reset link.</p><Link className="button button-outline" to="/login">Return to sign in</Link></div> : <form className="auth-form" onSubmit={submit}><Input label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} error={error} /><Button type="submit" loading={loading}>Send reset link</Button><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></form>}</AuthFrame>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const [token, setToken] = useState(params.get('token') ?? ''); const [password, setPassword] = useState(''); const [done, setDone] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { await authApi.resetPassword(token, password); setDone(true); } catch (authError) { setError(messageFor(authError)); } finally { setLoading(false); } };
  return <AuthFrame title="Choose a new password" description="Use the one-time link from your recovery email.">{done ? <div className="auth-success"><p>Your password was updated. You can sign in again now.</p><Link className="button button-primary" to="/login">Sign in</Link></div> : <form className="auth-form" onSubmit={submit}><Input label="Reset token" required value={token} onChange={(event) => setToken(event.target.value)} error={error} /><Input label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><Button type="submit" loading={loading}>Update password</Button></form>}</AuthFrame>;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams(); const [token, setToken] = useState(params.get('token') ?? ''); const [verified, setVerified] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { await authApi.verifyEmail(token); setVerified(true); } catch (authError) { setError(messageFor(authError)); } finally { setLoading(false); } };
  const resendEmail = params.get('email');
  return <AuthFrame title="Verify your email" description="A verified email keeps your Aayojak account and ticket updates secure.">{verified ? <div className="auth-success"><p>Your email is verified. Welcome to Aayojak.</p><Link className="button button-primary" to="/login">Continue to sign in</Link></div> : <form className="auth-form" onSubmit={submit}><Input label="Verification token" required value={token} onChange={(event) => setToken(event.target.value)} error={error} hint={resendEmail ? `Check ${resendEmail} for the token.` : undefined} /><Button type="submit" loading={loading}>Verify email</Button>{resendEmail ? <ResendVerification email={resendEmail} /> : null}<p className="auth-switch"><Link to="/login">Back to sign in</Link></p></form>}</AuthFrame>;
}

function ResendVerification({ email }: { email: string }) { const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false); const resend = async () => { setLoading(true); try { await authApi.resendVerification(email); setSent(true); } finally { setLoading(false); } }; return <div className="resend-row"><Button type="button" variant="ghost" size="sm" loading={loading} onClick={() => void resend()}>Resend verification</Button>{sent ? <span>Request accepted.</span> : null}</div>; }
