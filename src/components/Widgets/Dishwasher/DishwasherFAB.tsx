// src/components/Widgets/Dishwasher/DishwasherFAB.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { firestoreService } from '../../../services/firestoreService';
import type { DishwasherState } from '../../../types';
import './DishwasherFAB.css';

const LONG_PRESS_DURATION = 500;
const UNDO_WINDOW = 5000;

const DishwasherWidget: React.FC = () => {
  const [state, setState] = useState<DishwasherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [justDone, setJustDone] = useState(false);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const lastActionTime = useRef<number>(0);
  const undoTimer = useRef<NodeJS.Timeout | null>(null);

  // Subscribe + init
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const init = async () => {
      try {
        await firestoreService.getDishwasherState();
        unsubscribe = firestoreService.subscribeToDishwasher((newState) => {
          setState(newState);
          setLoading(false);
        });
      } catch (error) {
        console.error('Chyba při inicializaci myčky:', error);
        setLoading(false);
      }
    };
    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Formátování času
  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const formatDateTime = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  // Potvrzení mytí
  const handleComplete = useCallback(async () => {
    if (!state || updating || isLongPress.current) return;
    const now = Date.now();
    const isUndo = (now - lastActionTime.current) < UNDO_WINDOW && showUndo;

    setUpdating(true);
    try {
      if (isUndo) {
        await firestoreService.undoDishwasherDuty();
        setShowUndo(false);
        setJustDone(false);
        if (undoTimer.current) clearTimeout(undoTimer.current);
      } else {
        await firestoreService.completeDishwasherDuty();
        lastActionTime.current = now;
        setJustDone(true);
        setShowUndo(true);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => {
          setShowUndo(false);
          setJustDone(false);
        }, UNDO_WINDOW);
      }
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setUpdating(false);
    }
  }, [state, updating, showUndo]);

  // Long press handlers (pro budoucí rozšíření)
  const handlePressStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) {
      handleComplete();
    }
    setTimeout(() => { isLongPress.current = false; }, 100);
  }, [handleComplete]);

  const handlePressCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPress.current = false;
  }, []);

  if (loading) {
    return (
      <div className="dishwasher-widget loading-state">
        <div className="dw-loading">⏳ Načítám...</div>
      </div>
    );
  }

  return (
    <div className="dishwasher-widget">
      {/* LEVÁ SEKCE – Kdo myje */}
      <div className="dw-left">
        <div className="dw-label">🍽️ Myčka nádobí</div>

        <button
          className={`dw-main-btn ${updating ? 'updating' : ''} ${justDone ? 'done' : ''}`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          disabled={updating}
        >
          <span className="dw-person-emoji">{state?.nextPersonEmoji || '🍽️'}</span>
          <span className="dw-person-name">{state?.nextPersonName?.replace(/\s*nádobí!?/i, '').trim() || '?'}</span>
          {justDone
            ? <span className="dw-btn-label">✅ Hotovo! • ↩️ zpět</span>
            : <span className="dw-btn-label">Klikni = hotovo</span>
          }
        </button>

        {/* Naposledy */}
        {state?.lastCompletedAt && (
          <div className="dw-last-info">
            Naposledy: {state.lastCompletedByEmoji} {state.lastCompletedByName.replace(/\s*nádobí!?/i, '').trim()}
            <span className="dw-last-time">{formatDateTime(state.lastCompletedAt)}</span>
          </div>
        )}
      </div>

      {/* PRAVÁ SEKCE – Historie */}
      <div className="dw-right">
        <div className="dw-history-title">📋 Historie</div>
        <div className="dw-history-list">
          {state?.history && state.history.length > 0 ? (
            state.history.slice(0, 14).map((item) => (
              <div key={item.id} className="dw-history-item">
                <span className="dw-hist-emoji">{item.personEmoji}</span>
                <span className="dw-hist-separator"></span>
                <span className="dw-hist-name">{item.personName.replace(/\s*nádobí!?/i, '').trim()}</span>
                <span className="dw-hist-time">{formatDate(item.completedAt)}</span>
              </div>
            ))
          ) : (
            <div className="dw-history-empty">Žádná historie</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DishwasherWidget;