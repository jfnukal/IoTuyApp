// src/components/DashboardV2/useV2Swipe.ts
// Detekuje swipe gesta a naviguje mezi V2 stránkami.
//
// Mapa gest (z pohledu prstu):
//   Na /:         swipe LEFT → /more     (widgety jsou "vpravo")
//   Na /:         swipe UP   → /devices  (jen na desktop/tablet s fixed layoutem)
//   Na /devices:  swipe DOWN → /         (jen pokud jsme scrollováni na vršek)
//   Na /more:     swipe RIGHT → /        (zpět)
//
// Kolize se scrollem:
//   - Gesta uvnitř scrollovatelných prvků (kalendář, seznam...) jsou ignorována.
//   - Kalendářový slot je vždy chráněn (i když je prázdný).
//   - Vertikální navigace na mobilu (body scrolluje) je zakázána —
//     na mobilu se na /devices naviguje pouze tlačítkem.
//   - Horizontální swipe je méně konfliktní s vertikálním scrollem → zůstává.

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNavDir } from './navDirection';

const THRESHOLD_H = 60;    // min px pro uznání horizontálního swipe
const THRESHOLD_V = 120;   // min px pro vertikální swipe (vyšší = méně chyb)
const RATIO       = 2.5;   // swipe musí být 2.5× delší ve svém směru (bylo 1.8)

/**
 * Vrátí true pokud el nebo jeho předek scrolluje vertikálně.
 * Explicitně chrání kalendářový slot i jiné widgety s overflow-y.
 */
function isInsideScrollable(el: EventTarget | null): boolean {
  let node = el as Element | null;
  while (node && node !== document.body) {
    // Kalendářový slot — vždy ignoruj vertikální swipe (prázdný i plný)
    if (node.classList?.contains('v2-slot--calendar')) return true;
    // Libovolný scrollovatelný kontejner
    const oy = window.getComputedStyle(node).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 4) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useV2Swipe() {
  const navigate   = useNavigate();
  const { pathname } = useLocation();
  const startRef = useRef<{
    x: number;
    y: number;
    scrollY: number;
    inScrollable: boolean;
  } | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startRef.current = {
        x:            e.touches[0].clientX,
        y:            e.touches[0].clientY,
        scrollY:      window.scrollY,
        inScrollable: isInsideScrollable(e.target),
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;

      const dx    = e.changedTouches[0].clientX - start.x;
      const dy    = e.changedTouches[0].clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // -------- VERTIKÁLNÍ gesto --------
      if (absDy > absDx * RATIO && absDy >= THRESHOLD_V) {
        // Uvnitř scrollovatelného prvku → nenaviguj
        if (start.inScrollable) return;

        if (dy < 0 && pathname === '/') {
          // SWIPE UP → /devices
          // Na mobilu (body je scrollovatelný) — vertikální navigace zakázána
          // (příliš snadno se splétá se scrollem, na mobilu jdi přes tlačítko)
          const bodyIsScrollable = document.body.scrollHeight > window.innerHeight + 40;
          if (bodyIsScrollable) return;

          // Desktop / tablet fixed layout — naviguj
          setNavDir('from-bottom');
          navigate('/devices');

        } else if (dy > 0 && pathname === '/devices') {
          // SWIPE DOWN → zpět na /
          // Jen pokud jsme scrollováni na vršek stránky
          if (start.scrollY < 30) {
            setNavDir('from-top');
            navigate('/');
          }
        }
        return;
      }

      // -------- HORIZONTÁLNÍ gesto --------
      if (absDx > absDy * RATIO && absDx >= THRESHOLD_H) {
        if (dx < 0 && pathname === '/') {
          // SWIPE LEFT → /more
          setNavDir('from-right');
          navigate('/more');
        } else if (dx > 0 && pathname === '/more') {
          // SWIPE RIGHT → zpět na /
          setNavDir('from-left');
          navigate('/');
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [pathname, navigate]);
}
