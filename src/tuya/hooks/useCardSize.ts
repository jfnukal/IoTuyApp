// src/tuya/hooks/useCardSize.ts
import { useState, useEffect, type RefObject } from 'react';

export interface CardSize {
  width: number;
  height: number;
}

export interface CardDisplayRules {
  // Co zobrazit
  showHeader: boolean;
  showTitle: boolean;
  showSubtitle: boolean;
  showStatusDot: boolean;
  showStatusBadges: boolean;
  showTime: boolean;
  showWifiIndicator: boolean;
  showStats: boolean;
  showAllStats: boolean;
  showLabels: boolean;

  // Velikosti
  buttonSize: number;
  fontSize: 'xs' | 'sm' | 'md' | 'lg';

  // Layout
  layout: 'micro' | 'compact' | 'normal' | 'large';
  horizontalStats: boolean;
}

export function useCardSize(ref: RefObject<HTMLDivElement | null>): {
  size: CardSize;
  rules: CardDisplayRules;
} {
  const [size, setSize] = useState<CardSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;

      // Ignoruj malé změny (pod 8px) - zabrání blikání
      if (
        Math.abs(width - lastWidth) < 8 &&
        Math.abs(height - lastHeight) < 8
      ) {
        return;
      }

      // Debounce - počkej 100ms před aktualizací
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        lastWidth = width;
        lastHeight = height;
        setSize({ width, height });
      }, 100);
    });

    observer.observe(element);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [ref]);

  const rules = calculateDisplayRules(size);

  return { size, rules };
}

function calculateDisplayRules(size: CardSize): CardDisplayRules {
  const { width, height } = size;

  const effectiveSize = Math.min(height, width * 1.5);

  let layout: CardDisplayRules['layout'] = 'normal';
  if (effectiveSize < 110) layout = 'micro';
  else if (effectiveSize < 170) layout = 'compact';
  else if (effectiveSize >= 290 && width >= 200) layout = 'large';

  let fontSize: CardDisplayRules['fontSize'] = 'md';
  if (effectiveSize < 110) fontSize = 'xs';
  else if (effectiveSize < 170) fontSize = 'sm';
  else if (effectiveSize >= 290) fontSize = 'lg';

  const buttonSize = Math.max(25, Math.min(80, effectiveSize * 0.28));

  const isNarrow = width < 200;
  const isVeryNarrow = width < 150;

  // Horizontální layout: široká a nízká karta
  const horizontalStats = width >= 280 && height < 250 && height >= 120;

  // 🆕 V horizontálním layoutu jsou jiné prahy pro statistiky
  // (protože jsou vedle sebe, ne pod sebou)
  const showStats = horizontalStats
    ? width >= 280 && height >= 100 // Méně přísné pro horizontal
    : height >= 140 && width >= 160;

  const showAllStats = horizontalStats
    ? width >= 320 && height >= 120 // Méně přísné pro horizontal
    : height >= 200 && width >= 220;

  const showLabels = horizontalStats
    ? width >= 380 // Labely jen když je opravdu hodně místa
    : height >= 180 && width >= 200;

  return {
    showHeader: height >= 60,
    showTitle: height >= 80 && !isVeryNarrow,
    showSubtitle: height >= 130 && !isNarrow,
    showStatusDot: height >= 60,
    showStatusBadges: height >= 110 && !isVeryNarrow,
    showTime: height >= 110 && width >= 180,
    showWifiIndicator: height >= 240 && width >= 200,
    showStats,
    showAllStats,
    showLabels,
    buttonSize,
    fontSize,
    layout,
    horizontalStats,
  };
}
