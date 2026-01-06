// src/components/Widgets/Dishwasher/DishwasherFAB.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { firestoreService } from '../../../services/firestoreService';
import type { DishwasherState } from '../../../types';
import './DishwasherFAB.css';

const LONG_PRESS_DURATION = 500;
const UNDO_WINDOW = 5000;

const DishwasherFAB: React.FC = () => {
  const [state, setState] = useState<DishwasherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showUndoHint, setShowUndoHint] = useState(false);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const lastActionTime = useRef<number>(0);

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
        console.error('🍽️ Chyba při inicializaci:', error);
        setLoading(false);
      }
    };

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Formátování času
  const formatTime = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMins < 1) return 'právě teď';
    if (diffMins < 60) return `před ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `před ${diffHours} hod`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'včera';
    return `před ${diffDays} dny`;
  };

  // Potvrzení mytí
  const handleComplete = useCallback(async () => {
    if (!state || updating || isLongPress.current) return;

    const now = Date.now();
    const isUndo = (now - lastActionTime.current) < UNDO_WINDOW;

    setUpdating(true);
    try {
      if (isUndo) {
        await firestoreService.undoDishwasherDuty();
        setShowUndoHint(true);
        setTimeout(() => setShowUndoHint(false), 1500);
      } else {
        await firestoreService.completeDishwasherDuty();
        lastActionTime.current = now;
      }
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setUpdating(false);
    }
  }, [state, updating]);

  // Long press handlers
  const handlePressStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowPopup(true);
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

  // Zavření popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showPopup && !(e.target as HTMLElement).closest('.dishwasher-fab-container')) {
        setShowPopup(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showPopup]);

  if (loading) {
    return (
      <div className="dishwasher-fab-container">
        <button className="dishwasher-fab loading" disabled>⏳</button>
      </div>
    );
  }

  return (
    <div className="dishwasher-fab-container">
      {/* FAB tlačítko */}
      <button
        className={`dishwasher-fab ${updating ? 'updating' : ''}`}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressCancel}
        disabled={updating}
        title={`Na řadě: ${state?.nextPersonName}`}
      >
        <span className="fab-emoji">{state?.nextPersonEmoji || '🍽️'}</span>
        <span className="fab-name">{state?.nextPersonName || '?'}</span>
      </button>

      {/* Undo hint */}
      {showUndoHint && <div className="dishwasher-undo-hint">↩️ Vráceno!</div>}

      {/* Popup s historií */}
      {showPopup && (
        <div className="dishwasher-popup">
          <div className="popup-header">
            <span>🍽️ Kdo myje nádobí?</span>
            <button className="popup-close" onClick={() => setShowPopup(false)}>✕</button>
          </div>

          <div className="popup-current">
            <span className="current-emoji">{state?.nextPersonEmoji}</span>
            <div className="current-info">
              <span className="current-label">Na řadě:</span>
              <span className="current-name">{state?.nextPersonName}</span>
            </div>
          </div>

          {state?.lastCompletedAt && (
            <div className="popup-last">
              Naposledy: {state.lastCompletedByEmoji} {state.lastCompletedByName} ({formatTime(state.lastCompletedAt)})
            </div>
          )}

          {state?.history && state.history.length > 0 && (
            <div className="popup-history">
              <div className="history-title">📋 Historie</div>
              {state.history.slice(0, 5).map((item) => (
                <div key={item.id} className="history-item">
                  <span>{item.personEmoji}</span>
                  <span className="history-name">{item.personName}</span>
                  <span className="history-time">{formatTime(item.completedAt)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="popup-hint">💡 Klikni pro potvrzení mytí</div>
        </div>
      )}
    </div>
  );
};

export default DishwasherFAB;