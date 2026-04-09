import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import type { Stroke } from '../../types';

interface Props {
  strokes: Stroke[];
  /** 描画中のストロークを mutate で更新する ref（useDrawing から渡す） */
  currentStrokeRef: React.RefObject<Stroke | null>;
  isDrawingMode: boolean;
  width?: number;
  height?: number;
  onStartStroke: (x: number, y: number, pressure: number) => void;
  onAddPoint: (x: number, y: number, pressure: number) => void;
  onEndStroke: () => void;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

const STROKE_OPTIONS = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  last: false,
};

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  options: typeof STROKE_OPTIONS = STROKE_OPTIONS
) {
  const outline = getStroke(stroke.points, {
    ...options,
    size: stroke.size,
  });
  if (!outline || outline.length < 2) return;
  ctx.fillStyle = stroke.color;
  const path = new Path2D();
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    path.lineTo(outline[i][0], outline[i][1]);
  }
  path.closePath();
  ctx.fill(path);
}

/**
 * HTMLCanvas 版の手書きキャンバス。
 * - 確定済みストロークはオフスクリーンに焼き込み、描画中は drawImage(offscreen) + currentStroke のみ。
 * - 描画中は React state を一切更新せず、requestAnimationFrame ループで currentStrokeRef を読んで再描画。
 * - これによりストローク数や点数に関わらず1フレームのコストはほぼ一定。
 */
export const DrawingCanvas: React.FC<Props> = ({
  strokes,
  currentStrokeRef,
  isDrawingMode,
  width,
  height,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  className = '',
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [size, setSize] = useState<{ w: number; h: number }>({
    w: width ?? 0,
    h: height ?? 0,
  });
  // size を ref としても保持しておく（rAF ループが現在値を参照するため）
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return canvasRef?.current ?? internalCanvasRef.current;
  }, [canvasRef]);

  // ---------------------------------------------------------------
  // サイズ測定
  // ---------------------------------------------------------------
  useEffect(() => {
    if (width != null && height != null) {
      setSize({ w: width, h: height });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
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

  // ---------------------------------------------------------------
  // 描画ヘルパー
  // ---------------------------------------------------------------
  const redrawCommittedOffscreen = useCallback(() => {
    if (!committedCanvasRef.current) return;
    const off = committedCanvasRef.current;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);
    for (const s of strokes) drawStroke(ctx, s);
  }, [strokes]);

  const blitToMain = useCallback(() => {
    const canvas = getCanvas();
    const off = committedCanvasRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }, [getCanvas]);

  const drawCurrentOnTop = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cur = currentStrokeRef.current;
    if (cur && cur.points.length > 0) {
      drawStroke(ctx, cur);
    }
  }, [getCanvas, currentStrokeRef]);

  // ---------------------------------------------------------------
  // キャンバスのサイズ確定 + DPR（size 変更時）
  // ---------------------------------------------------------------
  useLayoutEffect(() => {
    const canvas = getCanvas();
    if (!canvas || size.w === 0 || size.h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    if (!committedCanvasRef.current) {
      committedCanvasRef.current = document.createElement('canvas');
    }
    const off = committedCanvasRef.current;
    off.width = Math.floor(size.w * dpr);
    off.height = Math.floor(size.h * dpr);
    const offCtx = off.getContext('2d');
    if (offCtx) {
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.scale(dpr, dpr);
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';
    }

    redrawCommittedOffscreen();
    blitToMain();
    drawCurrentOnTop();
  }, [size.w, size.h, redrawCommittedOffscreen, blitToMain, drawCurrentOnTop]);

  // strokes 配列が変わったら確定層を再構築
  useLayoutEffect(() => {
    redrawCommittedOffscreen();
    blitToMain();
    drawCurrentOnTop();
  }, [strokes, redrawCommittedOffscreen, blitToMain, drawCurrentOnTop]);

  // ---------------------------------------------------------------
  // rAF ループ：描画中のみ動く
  // ---------------------------------------------------------------
  const tick = useCallback(() => {
    if (!isDrawingRef.current) {
      rafRef.current = null;
      return;
    }
    blitToMain();
    drawCurrentOnTop();
    rafRef.current = requestAnimationFrame(tick);
  }, [blitToMain, drawCurrentOnTop]);

  // ---------------------------------------------------------------
  // ポインタ座標
  // ---------------------------------------------------------------
  const getPos = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = getCanvas();
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [getCanvas]
  );

  // ---------------------------------------------------------------
  // document レベルで move/up を聴く
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!isDrawingMode) return;

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e.clientX, e.clientY);
      onAddPoint(x, y, e.pressure || 0.5);
    };
    const onUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onEndStroke();
    };
    const onCancel = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onEndStroke();
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp, { passive: false });
    document.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        onEndStroke();
      }
    };
  }, [isDrawingMode, getPos, onAddPoint, onEndStroke]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = true;
      const { x, y } = getPos(e.clientX, e.clientY);
      onStartStroke(x, y, e.pressure || 0.5);
      // rAF ループ開始
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [isDrawingMode, getPos, onStartStroke, tick]
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
      <canvas
        ref={canvasRef ?? internalCanvasRef}
        className="block"
        style={{
          position: 'absolute',
          inset: 0,
          touchAction: isDrawingMode ? 'none' : 'auto',
        }}
      />
    </div>
  );
};
