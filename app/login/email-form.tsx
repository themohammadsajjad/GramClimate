'use client';
import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react';

export default function EmailForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    if (mode === 'register' && password !== form.get('confirm')) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const body = { email: String(form.get('email')), password,
        ...(mode === 'register' ? { name: String(form.get('name')) } : {}) };
      const response = await fetch('/api/account/' + mode, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      window.location.assign('/');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not connect. Please try again.');
    } finally { setBusy(false); }
  }

  return <section className="email-auth" aria-label="Email account">
    <div className="auth-tabs" role="group" aria-label="Account action">
      <button type="button" aria-pressed={mode === 'login'} disabled={busy} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
      <button type="button" aria-pressed={mode === 'register'} disabled={busy} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
    </div>
    <form onSubmit={submit} key={mode}>
      <fieldset disabled={busy}>
        {mode === 'register' && <label>Full name<input name="name" autoComplete="name" required maxLength={80} placeholder="Your name"/></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/></label>
        <label>Password<div className="password-field"><input name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={128}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {mode === 'register' && <><p className="auth-help">Use at least 12 characters. Save your password in a password manager; email recovery is not configured yet.</p><label>Confirm password<input name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128}/></label></>}
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button type="submit" className="button primary login-button">{busy ? <LoaderCircle className="animate-spin" size={18}/> : <Mail size={18}/>} {busy ? 'Please wait…' : mode === 'register' ? 'Create my account' : 'Sign in with email'}</button>
      </fieldset>
    </form>
    {mode === 'login' && <button type="button" className="auth-forgot" onClick={() => setRecoveryInfo(!recoveryInfo)} aria-expanded={recoveryInfo}>Forgot password?</button>}
    {recoveryInfo && <p className="auth-help" role="status">Password reset emails are not available yet. Connecting an email delivery service is required before recovery can be enabled. ChatGPT sign-in opens a separate account; it does not reset your email account.</p>}
  </section>;
}
