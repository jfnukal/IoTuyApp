// src/components/DashboardV2/useV2Swipe.ts
// Detekuje swipe gesta a naviguje mezi V2 stránkami.
//
// Mapa gest (z pohledu prstu):
//   Na /v2:         swipe UP   → /v2/devices  (zařízení jsou "dole")
//   Na /v2:         swipe LEFT → /v2/more     (widgety jsou "vpravo")
//   Na /v2/devices: swipe DOWN → /v2          (zpět nahoru)
//   Na /v2/more:    swipe RIGHT → /v2         (zpět doleva)
//
// Kolize se scrollem:
//   Swipe dolů (navigate zpět) se triggeruje jen pokud je stránka scrollována na vršek (scrollY ~ 0).
//   Swipe nahoru (navigate na devices) se triggeruje jen pokud je stránka scrollována na spodek NEBO
//   pokud začal dotek v dolní třetině obrazovky (edge-swipe).
//   Horizontální swipe: vždy, pokud je gesto dostatečně horizontální.

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNavDir } from './navDirection';

const THRESHOLD = 70;      // min px pro uznání swipe
const RATIO = 1.8;         // swipe musí být alespoň 1.8× delší ve svém směru

export function useV2Swipe() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const startRef = useRef<{ x: number; y: number; scrollY: number } | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        scrollY: window.scrollY,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;

      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const dist = Math.max(absDx, absDy);

      if (dist < THRESHOLD) return;

      // -------- VERTIKÁLNÍ gesto --------
      if (absDy > absDx * RATIO) {
        if (dy < 0) {
          // SWIPE UP — jdi na /devices
          if (pathname === '/') {
            const atBottom =
              window.scrollY + window.innerHeight >= document.body.scrollHeight - 20;
            const edgeStart = start.y > window.innerHeight * 0.65;
            if (atBottom || edgeStart) {
              setNavDir('from-bottom');
              navigate('/devices');
            }
          }
        } else {
          // SWIPE DOWN — zpět na /
          if (pathname === '/devices' && start.scrollY < 30) {
            setNavDir('from-top');
            navigate('/');
          }
        }
        return;
      }

      // -------- HORIZONTÁLNÍ gesto --------
      if (absDx > absDy * RATIO) {
        if (dx < 0) {
          // SWIPE LEFT — jdi na /more
          if (pathname === '/') {
            setNavDir('from-right');
            navigate('/more');
          }
        } else {
          // SWIPE RIGHT — zpět na /
          if (pathname === '/more') {
            setNavDir('from-left');
            navigate('/');
          }
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pathname, navigate]);
}
