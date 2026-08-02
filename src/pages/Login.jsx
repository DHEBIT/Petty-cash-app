import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { scorePassword } from '../utils/passwordStrength.js';
import AuthFooter from '../components/AuthFooter.jsx';

export default function Login() {
  const { session, profile } = useAuth();
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/'} replace />;
  }

  const strength = scorePassword(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'forgot') {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      setBusy(false);
      if (error) { setError(error.message); return; }
      setInfo('If an account exists for that email, a reset link has been sent.');
      return;
    }

    if (mode === 'signup') {
      if (strength.score < 2) {
        setError('Choose a stronger password — at least 8 characters, mixing letters, numbers, and symbols.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        setInfo('Account created. Check your inbox for a confirmation link before signing in.');
        setMode('signin');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">PC</span>
          <div>
            <h1>Petty Cash Ledger</h1>
            <p>The company's expense request and approval system.</p>
          </div>
        </div>

        {mode === 'forgot' ? (
          <button className="auth-back" onClick={() => { setMode('signin'); setError(''); setInfo(''); }}>
            ← Back to sign in
          </button>
        ) : (
          <div className="auth-tabs">
            <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setInfo(''); }}>Sign in</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setInfo(''); }}>Create account</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'forgot' && (
            <>
              <p style={{ marginBottom: 14 }}>Enter your email and we'll send you a link to reset your password.</p>
              <div className="field">
                <label htmlFor="email">Work email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordField
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 8 : 6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              {mode === 'signup' && password && (
                <div className="strength-meter">
                  <div className="strength-bar">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`strength-segment${i <= strength.score ? ' filled' : ''}`}
                        style={{ '--segment-color': strength.color }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <PasswordField
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {mode === 'signin' && (
            <div className="auth-link-row">
              <button type="button" className="auth-link" onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-info">{info}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {mode !== 'forgot' && (
          <p className="auth-footnote">
            {mode === 'signin'
              ? "Don't have an account? Use the Create account tab above."
              : 'Your account starts with standard employee access. Finance permissions are granted separately.'}
          </p>
        )}
      </div>
      <AuthFooter />
    </div>
  );
}