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
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Sloučíme nastavení, ale width/height budeme ignorovat ve prospěch dynamické velikosti
  const [settings] = useState<CanvasSettings>({
    ...DEFAULT_CANVAS_SETTINGS,
    ...customSettings,
  });

  // State pro aktuální velikost canvasu
  const [canvasSize, setCanvasSize] = useState({ width: settings.width, height: settings.height });

  // Funkce pro získání souřadnic (mys a dotyk)
  const getCoordinates = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Inicializace a nastavení velikosti podle okna (Responzivita)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Na mobilu chceme využít skoro celou šířku, ale nechat okraje
        const maxWidth = window.innerWidth - 32; // 16px padding z každé strany
        const maxHeight = window.innerHeight * 0.7; // 70% výšky obrazovky
        
        setCanvasSize({
          width: Math.min(settings.width, maxWidth),
          height: Math.min(settings.height, maxHeight)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.width, settings.height]);

  // Vykreslení mřížky a inicializace kontextu při změně velikosti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Nastavení rozměrů canvasu (opravuje rozmazání)
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Pozadí
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Linky
    const lineSpacing = 40;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let y = lineSpacing; y < canvasSize.height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(canvasSize.width - 20, y);
      ctx.stroke();
    }

    // Okrajová čára
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, canvasSize.height);
    ctx.stroke();

    // Reset stylu pro kreslení
    ctx.strokeStyle = settings.strokeColor;
    ctx.lineWidth = settings.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

  }, [canvasSize, settings]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Znovu nastavíme styl, kdyby se něco změnilo
    ctx.strokeStyle = settings.strokeColor;
    ctx.lineWidth = settings.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath(); // Důležité: uzavřít cestu
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Překreslení celého canvasu vyvoláním efektu změny velikosti
    // Nebo jednoduše:
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Znovu nakreslit linky (zkopírováno z useEffect - ideálně vyčlenit do funkce)
    const lineSpacing = 40;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let y = lineSpacing; y < canvas.height; y += lineSpacing) {
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(canvas.width - 20, y); ctx.stroke();
    }
    ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(60, canvas.height); ctx.stroke();
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
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          // Důležité: touch-action none v CSS nestačí vždy, preventDefault může být potřeba
          style={{ touchAction: 'none' }}
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
