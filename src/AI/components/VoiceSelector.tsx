// src/AI/components/VoiceSelector.tsx
// Panel pro výběr a preview hlasu Gemini TTS.
// Renderováno přes createPortal — mimo ai-widget-container.

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { playGeminiVoiceNamed } from '../services/geminiTts';
import { VOICE_KEY, VOICE_DEFAULT } from '../services/geminiLiveService';

// ==================== DATA ====================

const SAMPLE_TEXT =
  'Krásný dobrý den, dneska je slunečno a budeme si hrát. ' +
  'Děti mají úkoly a převozník se těší, že voda bude bez vln.';

const VOICES: { name: string; char: string }[] = [
  { name: 'Zephyr',        char: 'Bright'          },
  { name: 'Puck',          char: 'Upbeat'          },
  { name: 'Charon',        char: 'Informative'     },
  { name: 'Kore',          char: 'Firm'            },
  { name: 'Fenrir',        char: 'Excitable'       },
  { name: 'Leda',          char: 'Youthful'        },
  { name: 'Orus',          char: 'Firm'            },
  { name: 'Aoede',         char: 'Breezy'          },
  { name: 'Callirrhoe',    char: 'Easy-going'      },
  { name: 'Autonoe',       char: 'Bright'          },
  { name: 'Enceladus',     char: 'Breathy'         },
  { name: 'Iapetus',       char: 'Clear'           },
  { name: 'Umbriel',       char: 'Easy-going'      },
  { name: 'Algieba',       char: 'Smooth'          },
  { name: 'Despina',       char: 'Smooth'          },
  { name: 'Erinome',       char: 'Clear'           },
  { name: 'Algenib',       char: 'Gravelly'        },
  { name: 'Rasalgethi',    char: 'Informative'     },
  { name: 'Laomedeia',     char: 'Upbeat'          },
  { name: 'Achernar',      char: 'Soft'            },
  { name: 'Alnilam',       char: 'Firm'            },
  { name: 'Schedar',       char: 'Even'            },
  { name: 'Gacrux',        char: 'Mature'          },
  { name: 'Pulcherrima',   char: 'Forward'         },
  { name: 'Achird',        char: 'Friendly'        },
  { name: 'Zubenelgenubi', char: 'Casual'          },
  { name: 'Vindemiatrix',  char: 'Gentle'          },
  { name: 'Sadachbia',     char: 'Lively'          },
  { name: 'Sadaltager',    char: 'Knowledgeable'   },
  { name: 'Sulafat',       char: 'Warm'            },
];

// ==================== COMPONENT ====================

export const VoiceSelector: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeVoice, setActiveVoice] = useState<string>(
    () => { try { return localStorage.getItem(VOICE_KEY) || VOICE_DEFAULT; } catch { return VOICE_DEFAULT; } }
  );
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const handlePlay = useCallback(async (voiceName: string) => {
    if (playingVoice) return; // zabraň paralelnímu přehrávání
    setPlayingVoice(voiceName);
    setError('');
    try {
      const ok = await playGeminiVoiceNamed(SAMPLE_TEXT, voiceName);
      if (!ok) setError(`Hlas "${voiceName}" selhal — zkontroluj API klíč.`);
    } catch (e) {
      setError(String(e));
    } finally {
      setPlayingVoice(null);
    }
  }, [playingVoice]);

  const handleSelect = useCallback((voiceName: string) => {
    try { localStorage.setItem(VOICE_KEY, voiceName); } catch { /* ignore */ }
    setActiveVoice(voiceName);
    handlePlay(voiceName);
  }, [handlePlay]);

  const panel = (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>

        {/* Hlavička */}
        <div style={s.header}>
          <div>
            <div style={s.title}>🎙️ Výběr hlasu</div>
            <div style={s.subtitle}>Klikni na hlas → přehraje ukázku · Vybraný hlas = fialový rámeček</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Ukázková věta */}
        <div style={s.sampleBox}>
          <span style={s.sampleLabel}>Ukázková věta: </span>
          <span style={s.sampleText}>{SAMPLE_TEXT}</span>
        </div>

        {/* Chybová hláška */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Grid hlasů */}
        <div style={s.grid}>
          {VOICES.map(v => {
            const isActive  = v.name === activeVoice;
            const isPlaying = v.name === playingVoice;
            return (
              <button
                key={v.name}
                style={{
                  ...s.card,
                  ...(isActive  ? s.cardActive  : {}),
                  ...(isPlaying ? s.cardPlaying : {}),
                  opacity: playingVoice && !isPlaying ? 0.55 : 1,
                }}
                onClick={() => handleSelect(v.name)}
                disabled={!!playingVoice && !isPlaying}
              >
                <div style={s.cardName}>{v.name}</div>
                <div style={s.cardChar}>{v.char}</div>
                <div style={s.cardIcon}>
                  {isPlaying ? '🔊' : isActive ? '✅' : '▶'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <span style={s.footerNote}>
            Aktivní hlas: <strong style={{ color: '#a78bfa' }}>{activeVoice}</strong>
            {' '}— platí od příštího zapnutí 🎙️
          </span>
        </div>

      </div>
    </div>
  );

  return createPortal(panel, document.body);
};

// ==================== STYLY ====================

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 9600,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 8px 16px',
    pointerEvents: 'auto',
    touchAction: 'auto',
  },
  panel: {
    width: '96vw',
    maxWidth: 760,
    maxHeight: '85vh',
    background: 'rgba(8,12,22,0.98)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  title: {
    color: '#e2e8f0',
    fontSize: '1rem',
    fontWeight: 700,
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.75rem',
    marginTop: 3,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)',
    color: '#94a3b8',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 700,
    flexShrink: 0,
    pointerEvents: 'auto',
  },
  sampleBox: {
    padding: '10px 18px',
    background: 'rgba(139,92,246,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  sampleLabel: {
    color: '#64748b',
    fontSize: '0.72rem',
    fontStyle: 'italic',
  },
  sampleText: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontStyle: 'italic',
  },
  errorBox: {
    padding: '8px 18px',
    color: '#f87171',
    fontSize: '0.8rem',
    background: 'rgba(239,68,68,0.1)',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 8,
    padding: '12px 12px',
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s ease',
    minHeight: 80,
    pointerEvents: 'auto',
  },
  cardActive: {
    border: '2px solid rgba(139,92,246,0.8)',
    background: 'rgba(139,92,246,0.15)',
    boxShadow: '0 0 12px rgba(139,92,246,0.3)',
  },
  cardPlaying: {
    border: '2px solid rgba(52,211,153,0.8)',
    background: 'rgba(52,211,153,0.1)',
    boxShadow: '0 0 12px rgba(52,211,153,0.3)',
  },
  cardName: {
    color: '#e2e8f0',
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  cardChar: {
    color: '#64748b',
    fontSize: '0.68rem',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '1rem',
    marginTop: 2,
  },
  footer: {
    padding: '10px 18px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  footerNote: {
    color: '#64748b',
    fontSize: '0.75rem',
  },
};
