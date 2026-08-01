import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PasswordField from '../components/PasswordField.jsx';
import { scorePassword } from '../utils/passwordStrength.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const strength = scorePassword(password);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    if (!accessToken) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (strength.score < 2) {
      setError('Choose a stronger password — at least 8 characters, mixing letters, numbers, and symbols.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate('/login'), 2000);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">PC</span>
          <div>
            <h1>Reset your password</h1>
            <p>Choose a new password for your account.</p>
          </div>
        </div>

        {!ready && !done && (
          <div className="alert alert-error">
            This link is invalid or has expired. Request a new one from the sign-in page.
          </div>
        )}

        {done ? (
          <div className="alert alert-info">Password updated. Redirecting to sign in…</div>
        ) : ready && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label htmlFor="password">New password</label>
              <PasswordField
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {password && (
                <div className="strength-meter">
                  <div className="strength-bar">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className={`strength-segment${i <= strength.score ? ' filled' : ''}`} style={{ '--segment-color': strength.color }} />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <PasswordField
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 
