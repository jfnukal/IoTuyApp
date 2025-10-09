import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vyplňte všechna pole');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const firebaseError = err.code || '';
      if (firebaseError.includes('auth/invalid-credential')) {
        setError('Nesprávné přihlašovací údaje.');
      } else if (firebaseError.includes('auth/email-already-in-use')) {
        setError('Tento email je již registrován.');
      } else {
        setError('Došlo k chybě. Zkuste to prosím znovu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError('Došlo k chybě při přihlašování přes Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">IoTuyApp</h1>
          <p className="login-subtitle">Správa vašich chytrých zařízení</p>
        </div>

        <div className="login-toggle">
          <button
            type="button"
            onClick={() => setIsRegistering(false)}
            className={`toggle-btn ${!isRegistering ? 'active' : ''}`}
          >
            Přihlášení
          </button>
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            className={`toggle-btn ${isRegistering ? 'active' : ''}`}
          >
            Registrace
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="form-input"
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading
              ? 'Zpracovávám...'
              : isRegistering
              ? 'Vytvořit účet'
              : 'Přihlásit se'}
          </button>
        </form>

        <div className="separator">
          <div className="separator-line"></div>
          <span className="separator-text">nebo</span>
          <div className="separator-line"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="google-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Pokračovat s Google
        </button>
      </div>
    </div>
  );
};

export default Login;
