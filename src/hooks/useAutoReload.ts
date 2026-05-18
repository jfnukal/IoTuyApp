// src/hooks/useAutoReload.ts
// Automatický reload dashboardu — tři úrovně obrany:
//  1. Naplánovaný reload každý den v 5:00 ráno
//  2. Page-visibility reload — po probuzení z >60 min. nečinnosti
//  3. Periodický heartbeat reload každé 4 hodiny (záchranná síť)

import { useEffect, useRef } from 'react';

const RELOAD_HOUR   = 5;      // hodina denního reloadu (5:00)
const RELOAD_MINUTE = 0;
const IDLE_THRESHOLD_MS = 60 * 60 * 1000;   // 60 minut skryté záložky → reload při návratu
const HEARTBEAT_MS      =  4 * 60 * 60 * 1000; // 4 hodiny → bezpodmínečný reload

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

  // ── 1. Denní reload v 5:00 ───────────────────────────────────────
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function scheduleDailyReload() {
      const delay = msUntilNext(RELOAD_HOUR, RELOAD_MINUTE);
      const hm = `${String(RELOAD_HOUR).padStart(2,'0')}:${String(RELOAD_MINUTE).padStart(2,'0')}`;
      console.log(`[AutoReload] Denní reload naplánován za ${Math.round(delay/60000)} minut (${hm}).`);
      timeout = setTimeout(() => {
        console.log('[AutoReload] 🌅 Denní reload v 5:00');
        window.location.reload();
      }, delay);
    }

    scheduleDailyReload();
    return () => clearTimeout(timeout);
  }, []);

  // ── 2. Page Visibility — reload po dlouhé nečinnosti ────────────
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else {
        const hiddenAt = hiddenAtRef.current;
        if (hiddenAt !== null) {
          const elapsed = Date.now() - hiddenAt;
          if (elapsed >= IDLE_THRESHOLD_MS) {
            console.log(`[AutoReload] 👁 Probuzení po ${Math.round(elapsed/60000)} minutách → reload`);
            window.location.reload();
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
      console.log('[AutoReload] 💓 Heartbeat reload (4h)');
      window.location.reload();
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, []);
}
