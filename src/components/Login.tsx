import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
      setError(err.message || 'Došlo k chybě při přihlašování');
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
      setError(err.message || 'Došlo k chybě při přihlašování přes Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '450px',
          padding: '50px 40px',
          textAlign: 'center',
        }}
      >
        {/* Logo/Název aplikace */}
        <div
          style={{
            marginBottom: '40px',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#2d3748',
              margin: '0 0 10px 0',
            }}
          >
            IoTuyApp
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#718096',
              margin: 0,
            }}
          >
            Správa vašich chytrých zařízení
          </p>
        </div>

        {/* Přepínač přihlášení/registrace */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f7fafc',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '30px',
          }}
        >
          <button
            type="button"
            onClick={() => setIsRegistering(false)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: !isRegistering ? 'white' : 'transparent',
              color: !isRegistering ? '#2d3748' : '#718096',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: !isRegistering ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Přihlášení
          </button>
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: isRegistering ? 'white' : 'transparent',
              color: isRegistering ? '#2d3748' : '#718096',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: isRegistering ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Registrace
          </button>
        </div>

        {/* Chybová hláška */}
        {error && (
          <div
            style={{
              backgroundColor: '#fed7d7',
              color: '#c53030',
              padding: '15px',
              borderRadius: '12px',
              marginBottom: '25px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {error}
          </div>
        )}

        {/* Formulář */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '25px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '14px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.com"
              required
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#667eea')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '14px',
              }}
            >
              Heslo
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#667eea')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading
                ? '#a0aec0'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px',
              transition: 'all 0.2s ease',
              transform: loading ? 'none' : 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading
              ? 'Zpracovávám...'
              : isRegistering
              ? 'Vytvořit účet'
              : 'Přihlásit se'}
          </button>
        </form>

        {/* Oddělovač */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '25px 0',
            color: '#718096',
            fontSize: '14px',
          }}
        >
          <div
            style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}
          ></div>
          <span style={{ padding: '0 15px' }}>nebo</span>
          <div
            style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}
          ></div>
        </div>

        {/* Google přihlášení */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: '#2d3748',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
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
