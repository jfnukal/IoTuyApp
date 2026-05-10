// src/components/DashboardV2/MobileOrderPanel.tsx
// Drag-and-drop seznam pro přeuspořádání widgetů na mobilu.
// Používá Pointer Events — funguje na dotyku i myši bez knihoven.

import React, { useState, useRef, useCallback } from 'react';
import {
  MOBILE_WIDGET_LABELS,
  type MobileWidgetKey,
  saveMobileOrder,
  applyMobileOrder,
} from './mobileOrderConfig';

interface Props {
  order: MobileWidgetKey[];
  onChange: (order: MobileWidgetKey[]) => void;
}

export const MobileOrderPanel: React.FC<Props> = ({ order, onChange }) => {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt,   setDropAt]   = useState<number | null>(null); // "vlož před index"
  const containerRef = useRef<HTMLDivElement>(null);

  /** Vrátí "insert-before" index podle Y pozice kurzoru */
  const getDropAt = useCallback((clientY: number): number => {
    if (!containerRef.current) return 0;
    const items = containerRef.current.querySelectorAll<HTMLElement>('[data-mop-idx]');
    for (const item of Array.from(items)) {
      const { top, height } = item.getBoundingClientRect();
      if (clientY < top + height / 2) {
        return parseInt(item.dataset.mopIdx!, 10);
      }
    }
    return items.length; // za posledním prvkem
  }, []);

  const onHandleDown = useCallback((e: React.PointerEvent<HTMLSpanElement>, i: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragFrom(i);
    setDropAt(i);
  }, []);

  const onHandleMove = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (dragFrom === null) return;
    setDropAt(getDropAt(e.clientY));
  }, [dragFrom, getDropAt]);

  const onHandleUp = useCallback(() => {
    if (dragFrom !== null && dropAt !== null) {
      const insertAt = dropAt > dragFrom ? dropAt - 1 : dropAt;
      if (insertAt !== dragFrom) {
        const next = [...order];
        const [item] = next.splice(dragFrom, 1);
        next.splice(insertAt, 0, item);
        onChange(next);
        saveMobileOrder(next);
        applyMobileOrder(next);
      }
    }
    setDragFrom(null);
    setDropAt(null);
  }, [dragFrom, dropAt, order, onChange]);

  // Zobrazit indikátor čáry? Jen pokud přesun změní pořadí.
  const willChange =
    dragFrom !== null &&
    dropAt   !== null &&
    dropAt   !== dragFrom &&
    dropAt   !== dragFrom + 1;

  return (
    <div className="mop" ref={containerRef}>
      {order.map((key, i) => (
        <React.Fragment key={key}>
          {/* Čára nad tímto prvkem = drop zone */}
          {willChange && dropAt === i && <div className="mop-dropline" />}

          <div
            className={`mop-item${dragFrom === i ? ' mop-item--dragging' : ''}`}
            data-mop-idx={i}
          >
            <span
              className="mop-handle"
              title="Přetáhni pro přesunutí"
              onPointerDown={(e) => onHandleDown(e, i)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
            >
              ⠿
            </span>
            <span className="mop-label">{MOBILE_WIDGET_LABELS[key]}</span>
          </div>
        </React.Fragment>
      ))}

      {/* Čára za posledním prvkem */}
      {willChange && dropAt === order.length && (
        <div className="mop-dropline" />
      )}
    </div>
  );
};
