import React, { useRef, useCallback, useEffect, useState } from 'react';
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

/**
 * 手書きキャンバス。
 * - ポインタキャプチャを使わずに document の pointermove/up をグローバルに聴く
 *   （UIロック防止／OSによる解除忘れを回避）
 * - SVG は親要素に対して 100% サイズ。描画座標は getBoundingClientRect + viewBox で一致
 */
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
  const internalSvgRef = useRef<SVGSVGElement>(null);
  const isDrawingRef = useRef(false);

  // 親のレイアウトサイズを測って viewBox とストローク座標を揃える
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: width ?? 0,
    h: height ?? 0,
  });

  useEffect(() => {
    if (width != null && height != null) {
      setSize({ w: width, h: height });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    // 初期サイズを即時反映
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setSize((prev) => {
            const nw = Math.floor(w);
            const nh = Math.floor(h);
            if (prev.w === nw && prev.h === nh) return prev;
            return { w: nw, h: nh };
          });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const getSvgEl = (): SVGSVGElement | null => {
    return (svgRef?.current ?? internalSvgRef.current) ?? null;
  };

  const getPointerPos = useCallback(
    (clientX: number, clientY: number, pressure: number) => {
      const svg = getSvgEl();
      if (!svg) return { x: 0, y: 0, pressure };
      const rect = svg.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        pressure: pressure || 0.5,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // document レベルの pointermove/up ハンドラ
  useEffect(() => {
    if (!isDrawingMode) return;

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y, pressure } = getPointerPos(e.clientX, e.clientY, e.pressure);
      onAddPoint(x, y, pressure);
    };

    const onUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;
      onEndStroke();
    };

    const onCancel = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      onEndStroke();
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp, { passive: false });
    document.addEventListener('pointercancel', onCancel);
    // 万一ブラウザがフォーカスを失ったら確実に解除
    window.addEventListener('blur', onCancel);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      // 描画中にモードが切り替わった場合も強制終了
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        onEndStroke();
      }
    };
  }, [isDrawingMode, getPointerPos, onAddPoint, onEndStroke]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = true;
      const { x, y, pressure } = getPointerPos(e.clientX, e.clientY, e.pressure);
      onStartStroke(x, y, pressure);
    },
    [isDrawingMode, getPointerPos, onStartStroke]
  );

  return (
    <div
      ref={containerRef}
      className={`${className} ${isDrawingMode ? 'drawing-active cursor-crosshair' : ''} relative w-full h-full`}
      onPointerDown={handlePointerDown}
      style={{
        touchAction: isDrawingMode ? 'none' : 'auto',
        WebkitUserSelect: isDrawingMode ? 'none' : 'auto',
        userSelect: isDrawingMode ? 'none' : 'auto',
      }}
    >
      <svg
        ref={svgRef ?? internalSvgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        preserveAspectRatio="none"
        className="bg-transparent block"
        style={{
          touchAction: isDrawingMode ? 'none' : 'auto',
          position: 'absolute',
          inset: 0,
        }}
      >
        {strokes.map((stroke) => (
          <StrokeRenderer key={stroke.id} stroke={stroke} />
        ))}
        {currentStroke && <StrokeRenderer stroke={currentStroke} />}
      </svg>
    </div>
  );
};
