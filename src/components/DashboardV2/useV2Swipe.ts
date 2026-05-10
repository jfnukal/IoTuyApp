// src/components/DashboardV2/useV2Swipe.ts
// Detekuje swipe gesta a naviguje mezi V2 stránkami.
//
// Mapa gest:
//   Na /:         swipe LEFT  → /more     (widgety jsou "vpravo")
//   Na /:         swipe UP    → /devices  (jen desktop/tablet — fixed layout)
//   Na /devices:  swipe DOWN  → /         (jen pokud jsme na vršku stránky)
//   Na /more:     swipe RIGHT → /         (zpět)
//
// Ochrana proti kolizi se scrollem:
//   - Dotyk uvnitř scrollovatelného prvku ignoruje VERTIKÁLNÍ navigaci.
//   - .v2-slot--calendar je vždy chráněn (i prázdný).
//   - Na mobilu (body scrolluje) je vertikální navigace zakázána úplně.
//   - Horizontální swipe vyžaduje velkou vzdálenost (100 px) + dominanci 3×.

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNavDir } from './navDirection';

const THRESHOLD_H = 100;  // min px horizontální swipe (bylo 60 → mnoho false triggerů)
const THRESHOLD_V = 120;  // min px vertikální swipe
const RATIO_H     = 3.0;  // horizontální musí dominovat 3× (bylo 1.8)
const RATIO_V     = 2.5;  // vertikální musí dominovat 2.5×

/** True pokud el nebo jeho předek scrolluje vertikálně */
function isInsideScrollable(el: EventTarget | null): boolean {
  let node = el as Element | null;
  while (node && node !== document.body) {
    // Kalendářový slot — vždy chraň, i když je prázdný
    if (node.classList?.contains('v2-slot--calendar')) return true;
    const oy = window.getComputedStyle(node).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 4) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useV2Swipe() {
  const navigate    = useNavigate();
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

      // ── VERTIKÁLNÍ gesto ──────────────────────────────────────────
      if (absDy >= THRESHOLD_V && absDy > absDx * RATIO_V) {
        // Uvnitř scrollovatelného prvku (kalendář apod.) → nenaviguj
        if (start.inScrollable) return;

        if (dy < 0 && pathname === '/') {
          // SWIPE UP → /devices
          // Na mobilu (body má scroll) → zakázáno, používej ⚙️ panel
          const bodyScrollable = document.body.scrollHeight > window.innerHeight + 40;
          if (!bodyScrollable) {
            setNavDir('from-bottom');
            navigate('/devices');
          }

        } else if (dy > 0 && pathname === '/devices') {
          // SWIPE DOWN → zpět na /
          if (start.scrollY < 30) {
            setNavDir('from-top');
            navigate('/');
          }
        }
        return;
      }

      // ── HORIZONTÁLNÍ gesto ────────────────────────────────────────
      // Vyšší práh (100 px) a dominance 3× → méně accidental triggerů
      if (absDx >= THRESHOLD_H && absDx > absDy * RATIO_H) {
        if (dx < 0 && pathname === '/') {
          setNavDir('from-right');
          navigate('/more');
        } else if (dx > 0 && pathname === '/more') {
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
