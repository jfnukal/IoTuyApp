// src/components/Widgets/HandwritingNotes/CanvasDrawing.tsx
import React, { useRef, useState, useEffect } from 'react';
import type { CanvasSettings } from './types';
import { DEFAULT_CANVAS_SETTINGS } from './types';
import './CanvasDrawing.css';

interface CanvasDrawingProps {
  onSave: (imageData: string) => void;
  onCancel: () => void;
  settings?: Partial<CanvasSettings>;
}

const CanvasDrawing: React.FC<CanvasDrawingProps> = ({
  onSave,
  onCancel,
  settings: customSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [settings] = useState<CanvasSettings>({
    ...DEFAULT_CANVAS_SETTINGS,
    ...customSettings,
  });

  // Ukládáme si fyzické rozměry canvasu a poměr pixelů
  const [canvasState, setCanvasState] = useState({ width: 0, height: 0, dpr: 1 });

  // Pomocná funkce pro získání souřadnic
  const getCoordinates = (event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (window.TouchEvent && event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as MouseEvent).clientX;
      clientY = (event as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // 1. Inicializace velikosti s High DPI (Retina/Samsung fix) 🖼️
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        // Zjistíme dostupnou velikost okna
        const maxWidth = window.innerWidth - 32;
        const maxHeight = window.innerHeight * 0.7;

        const cssWidth = Math.min(settings.width, maxWidth);
        const cssHeight = Math.min(settings.height, maxHeight);
        
        // Zjistíme Device Pixel Ratio (na S24 to bude třeba 3 nebo 4)
        const dpr = window.devicePixelRatio || 1;

        setCanvasState({
          width: cssWidth,
          height: cssHeight,
          dpr: dpr
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.width, settings.height]);

  // 2. Nastavení Canvasu a překreslení pozadí po změně velikosti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasState.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ✨ MAGIE PRO JEMNÉ PÍSMO:
    // Nastavíme fyzickou velikost canvasu násobně větší
    canvas.width = canvasState.width * canvasState.dpr;
    canvas.height = canvasState.height * canvasState.dpr;

    // Ale CSS velikost necháme stejnou, aby se vešel na obrazovku
    canvas.style.width = `${canvasState.width}px`;
    canvas.style.height = `${canvasState.height}px`;

    // Škálování kontextu - od teď kreslíme v "logických" pixelech, ale vykreslí se to jemně
    ctx.scale(canvasState.dpr, canvasState.dpr);

    // --- Vykreslení pozadí ---
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvasState.width, canvasState.height);

    // Linky
    const lineSpacing = 40;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1; // Linky chceme tenké vždy
    
    for (let y = lineSpacing; y < canvasState.height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(canvasState.width - 20, y);
      ctx.stroke();
    }

    // Okraj
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, canvasState.height);
    ctx.stroke();

  }, [canvasState, settings]);

  // 3. Logika kreslení (Event Listenery) ✏️
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;

    const start = (e: MouseEvent | TouchEvent) => {
      // 🛑 STOP S-Pen gestům a scrollování
      if (e.cancelable) e.preventDefault();
      
      isDrawing = true;
      const { x, y } = getCoordinates(e);

      ctx.strokeStyle = settings.strokeColor;
      ctx.lineWidth = settings.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(x, y);
      
      // 🟢 OPRAVA TEČKY: Nakreslíme bod okamžitě při dotyku
      // Pokud uživatel jen ťukne, toto zajistí, že se udělá tečka
      ctx.lineTo(x, y); 
      ctx.stroke();
    };

    const move = (e: MouseEvent | TouchEvent) => {
      // 🛑 STOP scrollování při tažení
      if (e.cancelable) e.preventDefault();
      
      if (!isDrawing) return;
      
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // Trik pro hladší křivky: začneme novou cestu z aktuálního bodu
      // (zabraňuje efektu "dlouhého polygonu")
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const end = (e: MouseEvent | TouchEvent) => {
       if (e.cancelable) e.preventDefault();
       isDrawing = false;
       ctx.beginPath(); // Reset cesty
    };

    // Přidání listenerů s { passive: false } - NUTNÉ PRO S-PEN
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('touchstart', start, { passive: false });
    
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('touchmove', move, { passive: false });

    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchend', end);
    };
  }, [canvasState, settings]); // Re-bind když se změní velikost

  const clearCanvas = () => {
    // Vynutíme překreslení změnou state (hack, ale spolehlivý)
    setCanvasState(prev => ({ ...prev }));
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="canvas-drawing-container" ref={containerRef}>
      <div className="canvas-header-mobile">
        <h3>Nová poznámka</h3>
        <button className="btn-close-mobile" onClick={onCancel}>✕</button>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          style={{ 
            touchAction: 'none', 
            userSelect: 'none', 
            WebkitUserSelect: 'none',
            width: canvasState.width,   // Fixní velikost v CSS
            height: canvasState.height 
          }}
        />
      </div>

      <div className="canvas-controls">
        <button className="btn btn-secondary" onClick={clearCanvas}>
          🗑️ <span className="btn-text">Vymazat</span>
        </button>
        <button className="btn btn-outline desktop-only" onClick={onCancel}>
          ❌ Zrušit
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          ✅ Uložit
        </button>
      </div>
    </div>
  );
};

export default CanvasDrawing;
