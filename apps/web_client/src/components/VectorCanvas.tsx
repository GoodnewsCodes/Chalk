import React, { useEffect, useRef, useState } from 'react';
import { LaserPointer, StrokeData, StrokeTool, VectorPoint } from '../types/chalk';

interface VectorCanvasProps {
  strokes: StrokeData[];
  activeSlideIndex?: number;
  interactive?: boolean;
  currentTool?: StrokeTool;
  currentColor?: string;
  currentWidth?: number;
  roomId?: string;
  userId?: string;
  userName?: string;
  laser?: LaserPointer | null;
  onCommitStroke?: (stroke: StrokeData) => void;
  onEmitLaser?: (x: number, y: number, active: boolean) => void;
  className?: string;
  showWatermark?: boolean;
}

export const VectorCanvas: React.FC<VectorCanvasProps> = ({
  strokes,
  activeSlideIndex = 0,
  interactive = true,
  currentTool = 'pen',
  currentColor = '#69DB7C',
  currentWidth = 4,
  roomId = 'MTH 112',
  userId = 'usr_guest',
  userName = 'Prof. Adeleke O.',
  laser = null,
  onCommitStroke,
  onEmitLaser,
  className = '',
  showWatermark = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draftPoints, setDraftPoints] = useState<VectorPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  // Resize observer for sharp retina rendering
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const w = canvasSize.width;
    const h = canvasSize.height;

    // 1. Slate Blackboard Fill
    ctx.fillStyle = '#141E19';
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle Coordinate Dot Grid
    ctx.fillStyle = 'rgba(248, 249, 250, 0.08)';
    const spacing = 32;
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Slide Watermark & Reference Diagram Annotations
    if (showWatermark) {
      ctx.save();
      ctx.font = '500 11px "Google Sans Mono", "Roboto Mono", monospace';
      ctx.fillStyle = 'rgba(248, 249, 250, 0.28)';
      ctx.textAlign = 'right';
      ctx.fillText(`VECTOR CANVAS • SLIDE ${activeSlideIndex + 1}`, w - 18, 24);
      ctx.restore();
    }

    // Helpful labels when viewing default graph strokes on Slide 1
    const slideStrokes = strokes.filter(
      (s) => s.slideIndex === undefined || s.slideIndex === activeSlideIndex
    );

    const hasSeedGraph = slideStrokes.some((s) => s.id === 'seed_1');
    if (hasSeedGraph && activeSlideIndex === 0) {
      ctx.save();
      ctx.font = '600 13px "Google Sans Mono", "Roboto Mono", monospace';
      ctx.fillStyle = '#69DB7C';
      ctx.fillText('u (d=0)', w * 0.165, h * 0.37);
      ctx.fillStyle = '#81C995';
      ctx.fillText('v (d=4)', w * 0.465, h * 0.27);
      ctx.fillStyle = '#FDD663';
      ctx.fillText('t (d=6)', w * 0.745, h * 0.39);

      ctx.font = '500 11px "Google Sans Mono", "Roboto Mono", monospace';
      ctx.fillStyle = 'rgba(248, 249, 250, 0.75)';
      ctx.fillText('w(u,v) = 4', w * 0.31, h * 0.25);
      ctx.fillText('w(v,t) = 2', w * 0.61, h * 0.27);
      ctx.fillStyle = '#69DB7C';
      ctx.fillText('w(u,t) = 9 (relaxed -> 6)', w * 0.42, h * 0.46);

      ctx.font = '500 12px "Google Sans Mono", "Roboto Mono", monospace';
      ctx.fillStyle = '#F8F9FA';
      ctx.fillText(
        'Relax(u, v, w): if d[v] > d[u] + w(u,v) => d[v] = d[u] + w(u,v)',
        w * 0.17,
        h * 0.72
      );
      ctx.restore();
    }

    // 4. Draw committed strokes
    const drawSingleStroke = (stroke: StrokeData) => {
      const pts = stroke.points;
      if (!pts || pts.length === 0) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 0.32;
        ctx.lineWidth = stroke.width * 3.4;
      } else if (stroke.tool === 'eraser') {
        ctx.strokeStyle = '#141E19';
        ctx.lineWidth = stroke.width * 3.0;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      const startX = pts[0].x * w;
      const startY = pts[0].y * h;
      const endX = pts[pts.length - 1].x * w;
      const endY = pts[pts.length - 1].y * h;

      if (stroke.tool === 'rect') {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (stroke.tool === 'circle') {
        const rx = Math.abs(endX - startX) / 2;
        const ry = Math.abs(endY - startY) / 2;
        const cx = Math.min(startX, endX) + rx;
        const cy = Math.min(startY, endY) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else if (stroke.tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const angle = Math.atan2(endY - startY, endX - startX);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(angle - Math.PI / 6),
          endY - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(angle + Math.PI / 6),
          endY - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else {
        // Freehand pen / highlighter / eraser
        if (pts.length === 1) {
          ctx.fillStyle = stroke.tool === 'eraser' ? '#141E19' : stroke.color;
          ctx.beginPath();
          ctx.arc(startX, startY, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          for (let i = 1; i < pts.length; i++) {
            const prevX = pts[i - 1].x * w;
            const prevY = pts[i - 1].y * h;
            const currX = pts[i].x * w;
            const currY = pts[i].y * h;
            const midX = (prevX + currX) / 2;
            const midY = (prevY + currY) / 2;
            ctx.quadraticCurveTo(prevX, prevY, midX, midY);
          }
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    slideStrokes.forEach(drawSingleStroke);

    // 5. Draw active draft stroke
    if (isDrawing && draftPoints.length > 0 && currentTool !== 'laser') {
      drawSingleStroke({
        id: 'draft',
        roomId,
        userId,
        userName,
        timestamp: Date.now(),
        tool: currentTool,
        color: currentColor,
        width: currentWidth,
        points: draftPoints,
      });
    }

    // 6. Draw Laser Pointer
    if (laser && laser.active) {
      const lx = laser.x * w;
      const ly = laser.y * h;
      ctx.save();
      ctx.fillStyle = 'rgba(105, 219, 124, 0.25)';
      ctx.beginPath();
      ctx.arc(lx, ly, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '500 11px "Google Sans Mono", "Roboto Mono", monospace';
      ctx.fillStyle = '#69DB7C';
      ctx.fillText(laser.userName, lx + 12, ly + 4);
      ctx.restore();
    }
  }, [
    strokes,
    draftPoints,
    isDrawing,
    canvasSize,
    activeSlideIndex,
    currentTool,
    currentColor,
    currentWidth,
    laser,
    roomId,
    userId,
    userName,
    showWatermark,
  ]);

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>): VectorPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y, pressure: e.pressure || 0.5 };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormalizedPoint(e);

    if (currentTool === 'laser') {
      onEmitLaser?.(pt.x, pt.y, true);
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);
    setDraftPoints([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !isDrawing) return;
    const pt = getNormalizedPoint(e);

    if (currentTool === 'laser') {
      onEmitLaser?.(pt.x, pt.y, true);
      return;
    }

    setDraftPoints((prev) => [...prev, pt]);
  };

  const handlePointerUp = () => {
    if (!interactive || !isDrawing) return;
    setIsDrawing(false);

    if (currentTool === 'laser') {
      onEmitLaser?.(0, 0, false);
      return;
    }

    if (draftPoints.length > 0) {
      const committed: StrokeData = {
        id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        userId,
        userName,
        timestamp: Date.now(),
        tool: currentTool,
        color: currentColor,
        width: currentWidth,
        points: draftPoints,
        slideIndex: activeSlideIndex,
      };
      onCommitStroke?.(committed);
    }
    setDraftPoints([]);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`block w-full h-full touch-none ${interactive ? 'cursor-crosshair' : 'cursor-default'
          }`}
      />
    </div>
  );
};
