// src/components/DashboardV2/useV2Swipe.ts
// Detekuje swipe gesta a naviguje mezi V2 stránkami.
//
// Aktivní gesta:
//   Na /:     swipe LEFT  → /more   (widgety jsou "vpravo")
//   Na /more: swipe RIGHT → /       (zpět)
//
// Vertikální navigace (↑ zařízení, ↓ zpět) je záměrně ZAKÁZÁNA —
// kolize se scrollem způsobuje příliš mnoho accidental přechodů.
// Na /devices se naviguje přes ⚙️ panel → 📱 Zařízení.
//
// Horizontální swipe: min 100 px a musí dominovat 3× nad vertikálou.

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNavDir } from './navDirection';

const THRESHOLD_H = 100; // min px pro uznání horizontálního swipe
const RATIO_H     = 3.0; // horizontální složka musí být 3× větší než vertikální

export function useV2Swipe() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const startRef     = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
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

      // Horizontální swipe — dominuje 3× a je alespoň 100 px
      if (absDx >= THRESHOLD_H && absDx > absDy * RATIO_H) {
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
