import React, { useState } from 'react';

export default function AuthPanel({ onSignIn, onSignUp, onSignOut, user, onClose }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null); // { type: 'error'|'success', msg }
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
        onClose();
      } else {
        await onSignUp(email, password);
        setStatus({ type: 'success', msg: 'Check your email to confirm your account, then sign in.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: 14,
    border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
    background: 'var(--cream)', color: 'var(--ink)', outline: 'none',
    fontFamily: 'inherit',
  };

  if (user) {
    return (
      <div style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>
          Signed in as <strong>{user.email}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 14 }}>
          Your progress is syncing across all your devices.
        </div>
        <button onClick={onSignOut} style={{
          fontSize: 13, padding: '7px 16px', borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--border-strong)', background: 'var(--cream)',
          color: 'var(--ink-muted)', cursor: 'pointer', width: '100%',
        }}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['signin', 'signup'].map(m => (
          <button key={m} onClick={() => { setMode(m); setStatus(null); }} style={{
            flex: 1, padding: '6px 0', fontSize: 13, borderRadius: 'var(--radius-sm)',
            border: `0.5px solid ${mode === m ? 'var(--gold-border)' : 'var(--border-strong)'}`,
            background: mode === m ? 'var(--gold-light)' : 'var(--cream)',
            color: mode === m ? 'var(--gold)' : 'var(--ink-muted)',
            cursor: 'pointer', fontWeight: mode === m ? 500 : 400,
          }}>
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="email" placeholder="Email" value={email} required
          onChange={e => setEmail(e.target.value)} style={inputStyle}
        />
        <input
          type="password" placeholder="Password" value={password} required
          onChange={e => setPassword(e.target.value)} style={inputStyle}
        />

        {status && (
          <div style={{
            fontSize: 12, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
            background: status.type === 'error' ? '#fff5f5' : '#f0fdf4',
            color: status.type === 'error' ? '#c00' : '#15803d',
            border: `0.5px solid ${status.type === 'error' ? '#fcc' : '#bbf7d0'}`,
          }}>
            {status.msg}
          </div>
        )}

        <button type="submit" disabled={busy} style={{
          padding: '8px 0', fontSize: 14, fontWeight: 500, borderRadius: 'var(--radius-sm)',
          background: 'var(--gold-light)', border: '1px solid var(--gold-border)',
          color: 'var(--gold)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
        }}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 12, textAlign: 'center' }}>
        Progress is saved locally even without an account.
      </div>
    </div>
  );
}
