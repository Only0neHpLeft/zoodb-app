import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';

interface ScratchCardProps {
  width: number;
  height: number;
  children: ReactNode;
  disabled?: boolean;
  onReveal?: () => void;
  scratchText?: string;
}

export function ScratchCard({
  width,
  height,
  children,
  disabled = false,
  onReveal,
  scratchText = 'SCRATCH HERE',
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [revealed, setRevealed] = useState(false);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Silver metallic gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#D8D8D8');
    grad.addColorStop(0.3, '#C0C0C0');
    grad.addColorStop(0.5, '#E8E8E8');
    grad.addColorStop(0.7, '#B8B8B8');
    grad.addColorStop(1, '#D0D0D0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Sparkle dots
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text
    ctx.fillStyle = '#888888';
    ctx.font = `bold ${Math.min(14, height / 4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scratchText, width / 2, height / 2);
  }, [width, height, scratchText]);

  useEffect(() => {
    if (!disabled && !revealed) {
      drawOverlay();
    }
  }, [disabled, revealed, drawOverlay]);

  const getPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const checkReveal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    const total = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    if (transparent / total > 0.45) {
      setRevealed(true);
      onReveal?.();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = getPosition(e);
    scratch(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const { x, y } = getPosition(e);
    scratch(x, y);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    checkReveal();
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: 'crosshair',
          touchAction: 'none',
          borderRadius: 6,
          opacity: revealed ? 0 : 1,
          transition: 'opacity 500ms ease-out',
          pointerEvents: revealed ? 'none' : 'auto',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
