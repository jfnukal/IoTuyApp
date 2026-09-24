// src/hooks/useAutoReload.ts
// Automatický reload dashboardu — tři úrovně obrany:
//  1. Naplánovaný reload každý den v 5:00 ráno
//  2. Page-visibility reload — po probuzení z >60 min. nečinnosti
//  3. Periodický heartbeat reload každé 4 hodiny (záchranná síť)
//
// Všechny tři jdou přes bezpecnyReload: stránka se obnoví, až svítí displej
// a server opravdu odpovídá. Dřív tu bylo rovnou location.reload() — v 5:00
// při zhasnutém displeji a hned po rozsvícení, kdy tablet ještě neměl Wi-Fi.
// Načtení spadlo a ráno svítila bílá obrazovka.

import { useEffect, useRef } from 'react';
import { bezpecnyReload } from '../utils/bezpecnyReload';

const RELOAD_HOUR   = 5;      // hodina denního reloadu (5:00)
const RELOAD_MINUTE = 0;
const IDLE_THRESHOLD_MS = 60 * 60 * 1000;   // 60 minut skryté záložky → reload při návratu
const HEARTBEAT_MS      =  4 * 60 * 60 * 1000; // 4 hodiny → záchranný reload
const ACTIVITY_GRACE_MS = 10 * 60 * 1000;   // heartbeat reload přeskočit, pokud uživatel byl aktivní v posledních 10 min

/** Vrátí počet ms do dalšího výskytu HH:MM. */
function msUntilNext(hour: number, minute: number): number {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // zítra
  return next.getTime() - now.getTime();
}

export function useAutoReload() {
  const hiddenAtRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ── Sledování aktivity uživatele (dotyk / klávesa) ───────────────
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('pointerdown', bump, { passive: true });
    window.addEventListener('keydown', bump);
    return () => {
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
    };
  }, []);

  // ── 1. Denní reload v 5:00 ───────────────────────────────────────
  // Když tablet v 5:00 spí, bezpecnyReload počká, až se displej rozsvítí.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function scheduleDailyReload() {
      const delay = msUntilNext(RELOAD_HOUR, RELOAD_MINUTE);
      const hm = `${String(RELOAD_HOUR).padStart(2,'0')}:${String(RELOAD_MINUTE).padStart(2,'0')}`;
      console.log(`[AutoReload] Denní reload naplánován za ${Math.round(delay/60000)} minut (${hm}).`);
      timeout = setTimeout(() => {
        bezpecnyReload('🌅 denní reload v 5:00');
      }, delay);
    }

    scheduleDailyReload();
    return () => clearTimeout(timeout);
  }, []);

  // ── 2. Page Visibility — reload po dlouhé nečinnosti ────────────
  useEffect(() => {
    // Stránka mohla naběhnout už se zhasnutým displejem — pak událost
    // „skryto" nepřijde a bez tohohle by se po probuzení nic neobnovilo
    if (document.hidden) hiddenAtRef.current = Date.now();

    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else {
        const hiddenAt = hiddenAtRef.current;
        if (hiddenAt !== null) {
          const elapsed = Date.now() - hiddenAt;
          if (elapsed >= IDLE_THRESHOLD_MS) {
            bezpecnyReload(`👁 probuzení po ${Math.round(elapsed/60000)} minutách`);
          } else {
            console.log(`[AutoReload] 👁 Probuzení po ${Math.round(elapsed/60000)} minutách — OK, reload nepotřeba`);
          }
          hiddenAtRef.current = null;
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ── 3. Heartbeat — záchranný interval každé 4 hodiny ─────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // Nereloaduj někomu appku pod rukama — když byl uživatel nedávno aktivní,
      // reload se zkusí zase při dalším ticku heartbeatu
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs < ACTIVITY_GRACE_MS) {
        console.log(`[AutoReload] 💓 Heartbeat odložen — uživatel byl aktivní před ${Math.round(idleMs / 60000)} min`);
        return;
      }
      bezpecnyReload('💓 heartbeat reload (4h)');
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, []);
}
