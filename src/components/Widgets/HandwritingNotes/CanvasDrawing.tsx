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
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [settings] = useState<CanvasSettings>({
    ...DEFAULT_CANVAS_SETTINGS,
    ...customSettings,
  });

// Inicializace canvasu
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Nastavení pozadí (papírová barva)
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, settings.width, settings.height);

  // 🆕 KRESLENÍ LINEK (jako notes)
  const lineSpacing = 40; // Vzdálenost mezi řádky
  ctx.strokeStyle = '#e0e0e0'; // Světle šedá
  ctx.lineWidth = 1;
  
  for (let y = lineSpacing; y < settings.height; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(20, y); // Začátek čáry (20px od kraje)
    ctx.lineTo(settings.width - 20, y); // Konec čáry
    ctx.stroke();
  }

  // Červená okrajová čára (jako notes)
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.lineTo(60, settings.height);
  ctx.stroke();

  // Nastavení stylu kreslení pera
  ctx.strokeStyle = settings.strokeColor;
  ctx.lineWidth = settings.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  setContext(ctx);
}, [settings]);


 // Začátek kreslení
 const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
  if (!context) return;

  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  
  // Správný přepočet s přihlédnutím k scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  context.beginPath();
  context.moveTo(x, y);
  setIsDrawing(true);
};

// Kreslení
const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
  if (!isDrawing || !context) return;

  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  
  // Správný přepočet s přihlédnutím k scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  context.lineTo(x, y);
  context.stroke();
};

  // Konec kreslení
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Vymazání canvasu
  const clearCanvas = () => {
    if (!context) return;
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, settings.width, settings.height);
  };

  // Uložení jako base64
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    onSave(imageData);
  };

  return (
    <div className="canvas-drawing-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={settings.width}
          height={settings.height}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="canvas-controls">
        <button className="btn btn-secondary" onClick={clearCanvas}>
          🗑️ Vymazat
        </button>
        <button className="btn btn-outline" onClick={onCancel}>
          ❌ Zrušit
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          ✅ Uložit a rozpoznat
        </button>
      </div>
    </div>
  );
};

export default CanvasDrawing;
