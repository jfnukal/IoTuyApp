// src/components/AppErrorBoundary.tsx
// Záchytná síť pro celou aplikaci. Bez ní každá chyba při vykreslování shodí
// celou stránku a zůstane jen bílá obrazovka — typicky když se hned po
// probuzení tabletu (ještě bez Wi-Fi) nestáhne kus aplikace (lazy stránka).
// Místo toho ukážeme hlášku a aplikace se sama obnoví, jakmile to půjde.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { bezpecnyReload } from '../utils/bezpecnyReload';

interface Props {
  children: ReactNode;
}

interface State {
  chyba: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { chyba: null };

  static getDerivedStateFromError(chyba: Error): State {
    return { chyba };
  }

  componentDidCatch(chyba: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Aplikace spadla:', chyba, info.componentStack);
    bezpecnyReload(`pád aplikace: ${chyba.message}`, { poChybe: true });
  }

  render() {
    if (!this.state.chyba) return this.props.children;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 24,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'rgba(255, 255, 255, 0.9)',
          fontFamily: 'sans-serif',
          fontSize: '1.2rem',
        }}
      >
        <p style={{ margin: 0, color: 'inherit' }}>
          Něco se pokazilo. Aplikace se za chvilku sama načte znovu.
        </p>
        <button
          type="button"
          onClick={() => bezpecnyReload('tlačítko Zkusit znovu', { hned: true })}
          style={{
            padding: '14px 32px',
            border: 0,
            borderRadius: 12,
            background: '#fff',
            color: '#5b4bc4',
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          Zkusit znovu
        </button>
      </div>
    );
  }
}
