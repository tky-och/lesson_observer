import React, { useRef, useCallback } from 'react';
import type { Stroke } from '../../types';
import { StrokeRenderer } from './StrokeRenderer';

interface Props {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  isDrawingMode: boolean;
  width?: number;
  height?: number;
  onStartStroke: (x: number, y: number, pressure: number) => void;
  onAddPoint: (x: number, y: number, pressure: number) => void;
  onEndStroke: () => void;
  className?: string;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export const DrawingCanvas: React.FC<Props> = ({
  strokes,
  currentStroke,
  isDrawingMode,
  width,
  height,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  className = '',
  svgRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);

  const getPointerPos = useCallback(
    (e: React.PointerEvent): { x: number; y: number; pressure: number } => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return { x: 0, y: 0, pressure: 0.5 };
      const rect = svg.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      const { x, y, pressure } = getPointerPos(e);
      onStartStroke(x, y, pressure);
    },
    [isDrawingMode, getPointerPos, onStartStroke]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y, pressure } = getPointerPos(e);
      onAddPoint(x, y, pressure);
    },
    [getPointerPos, onAddPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;
      onEndStroke();
    },
    [onEndStroke]
  );

  return (
    <div
      ref={containerRef}
      className={`${className} ${isDrawingMode ? 'drawing-active cursor-crosshair' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ touchAction: isDrawingMode ? 'none' : 'auto' }}
    >
      <svg
        ref={svgRef}
        width={width || '100%'}
        height={height || '100%'}
        className="bg-white"
        style={{ display: 'block' }}
      >
        {strokes.map((stroke) => (
          <StrokeRenderer key={stroke.id} stroke={stroke} />
        ))}
        {currentStroke && <StrokeRenderer stroke={currentStroke} />}
      </svg>
    </div>
  );
};
