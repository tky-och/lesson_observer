import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Stroke } from '../../types';
import { drawStroke } from '../../utils/strokeRender';

interface Props {
  strokes: Stroke[];
  /** 描画中のストロークを mutate で更新する ref（useDrawing から渡す） */
  currentStrokeRef: React.RefObject<Stroke | null>;
  isDrawingMode: boolean;
  width?: number;
  height?: number;
  /**
   * 表示倍率（親に CSS transform: scale がかかっている場合の倍率）。
   * この分だけキャンバスの解像度を上げ、拡大表示でも線がぼやけないようにする。
   */
  renderScale?: number;
  onStartStroke: (x: number, y: number, pressure: number, isPen: boolean) => void;
  onAddPoint: (x: number, y: number, pressure: number) => void;
  onEndStroke: () => void;
  /** 書きかけのストロークを捨てる */
  onCancelStroke?: () => void;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * 1 枚のキャンバスの最大ピクセル数。iOS Safari は 1 枚あたり約 1,677 万ピクセルが
 * 上限で、全キャンバスの合計メモリにも上限があるため、その半分に抑える。
 */
const MAX_CANVAS_PIXELS = 8 * 1024 * 1024;

/** キャンバスの 1 CSS px あたりの実ピクセル数 */
function pixelScaleFor(w: number, h: number, renderScale: number): number {
  const dpr = window.devicePixelRatio || 1;
  const want = dpr * Math.max(1, renderScale);
  const cap = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
  // 上限に当たっても、少なくとも従来どおり devicePixelRatio 倍は確保する
  return Math.min(want, Math.max(cap, dpr));
}

/** ペンの筆圧。Apple Pencil 以外は筆圧が取れないので 0.5 固定 */
function pressureOf(e: PointerEvent): number {
  if (e.pointerType === 'pen') return e.pressure > 0 ? e.pressure : 0.25;
  return e.pressure || 0.5;
}

/**
 * HTMLCanvas 版の手書きキャンバス。
 * - 確定済みストロークはオフスクリーンに焼き込み、描画中は drawImage(offscreen) + currentStroke のみ。
 * - 描画中は React state を一切更新せず、requestAnimationFrame ループで currentStrokeRef を読んで再描画。
 * - これによりストローク数や点数に関わらず1フレームのコストはほぼ一定。
 * - Apple Pencil は 1 フレームの間に複数の点を送ってくるので、getCoalescedEvents() で
 *   間の点もすべて拾う（拾わないと 60Hz に間引かれて線がカクカクする）。
 */
export const DrawingCanvas: React.FC<Props> = ({
  strokes,
  currentStrokeRef,
  isDrawingMode,
  width,
  height,
  renderScale = 1,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  onCancelStroke,
  className = '',
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  /** いま線を書いているポインタ。ほかの指・手のひらの動きは無視する */
  const activePointerRef = useRef<{ id: number; type: string } | null>(null);
  const rafRef = useRef<number | null>(null);

  // width/height が渡されたらそれを使い、なければ親要素の大きさを測る
  const [measured, setMeasured] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const size = width != null && height != null ? { w: width, h: height } : measured;
  const sizeRef = useRef(size);
  const strokesRef = useRef(strokes);
  // 下の再描画用 layout effect より先に宣言して、先に実行されるようにしておく
  useLayoutEffect(() => {
    sizeRef.current = size;
    strokesRef.current = strokes;
  });

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return canvasRef?.current ?? internalCanvasRef.current;
  }, [canvasRef]);

  // ---------------------------------------------------------------
  // サイズ測定
  // ---------------------------------------------------------------
  useEffect(() => {
    if (width != null && height != null) return;
    const el = containerRef.current;
    if (!el) return;
    // ResizeObserver は observe 直後にも 1 回呼ばれるので、初回の測定もここで行われる
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setMeasured((prev) => {
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
    const off = committedCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s);
  }, []);

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
      drawStroke(ctx, cur, false);
    }
  }, [getCanvas, currentStrokeRef]);

  // ---------------------------------------------------------------
  // キャンバスの解像度確定（size・表示倍率の変更時のみ）
  // ---------------------------------------------------------------
  useLayoutEffect(() => {
    const canvas = getCanvas();
    if (!canvas || size.w === 0 || size.h === 0) return;

    const scale = pixelScaleFor(size.w, size.h, renderScale);
    if (!committedCanvasRef.current) {
      committedCanvasRef.current = document.createElement('canvas');
    }
    for (const c of [canvas, committedCanvasRef.current]) {
      c.width = Math.round(size.w * scale);
      c.height = Math.round(size.h * scale);
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;

    redrawCommittedOffscreen();
    blitToMain();
    drawCurrentOnTop();
  }, [size.w, size.h, renderScale, getCanvas, redrawCommittedOffscreen, blitToMain, drawCurrentOnTop]);

  // strokes 配列が変わったら確定層を再構築
  useLayoutEffect(() => {
    redrawCommittedOffscreen();
    blitToMain();
    drawCurrentOnTop();
  }, [strokes, redrawCommittedOffscreen, blitToMain, drawCurrentOnTop]);

  // ---------------------------------------------------------------
  // rAF ループ：描画中のみ動く
  // ---------------------------------------------------------------
  const startLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const loop = () => {
      if (!isDrawingRef.current) {
        rafRef.current = null;
        return;
      }
      blitToMain();
      drawCurrentOnTop();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [blitToMain, drawCurrentOnTop]);

  // ---------------------------------------------------------------
  // ポインタ座標
  // ---------------------------------------------------------------
  /**
   * 画面上のポインタ座標をキャンバス内部座標（CSS transform 前）に変換する関数を返す。
   * 親要素に `transform: scale(zoom)` がかかっていても、`canvas.style.width`
   * が指す論理幅と `getBoundingClientRect().width`（拡大後の表示幅）の比から
   * 動的に補正する。getBoundingClientRect はイベントごとに 1 回だけ呼ぶ。
   */
  const getMapper = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return () => ({ x: 0, y: 0 });
    const rect = canvas.getBoundingClientRect();
    const cssWidth = parseFloat(canvas.style.width) || rect.width;
    const cssHeight = parseFloat(canvas.style.height) || rect.height;
    const scaleX = rect.width === 0 ? 1 : cssWidth / rect.width;
    const scaleY = rect.height === 0 ? 1 : cssHeight / rect.height;
    return (clientX: number, clientY: number) => ({
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    });
  }, [getCanvas]);

  const stopLoop = useCallback(() => {
    isDrawingRef.current = false;
    activePointerRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------
  // document レベルで move/up を聴く
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!isDrawingMode) return;

    const isActive = (e: PointerEvent) =>
      isDrawingRef.current && activePointerRef.current?.id === e.pointerId;

    const onMove = (e: PointerEvent) => {
      if (!isActive(e)) return;
      e.preventDefault();
      const map = getMapper();
      // Safari 以外の古いブラウザ向けに getCoalescedEvents が無い場合も考慮する
      const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      for (const ev of coalesced.length > 0 ? coalesced : [e]) {
        const { x, y } = map(ev.clientX, ev.clientY);
        onAddPoint(x, y, pressureOf(ev));
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!isActive(e)) return;
      e.preventDefault();
      stopLoop();
      onEndStroke();
    };
    const onCancel = (e: PointerEvent) => {
      if (!isActive(e)) return;
      stopLoop();
      onEndStroke();
    };
    const onBlur = () => {
      if (!isDrawingRef.current) return;
      stopLoop();
      onEndStroke();
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp, { passive: false });
    document.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
      if (isDrawingRef.current) {
        stopLoop();
        onEndStroke();
      } else {
        stopLoop();
      }
    };
  }, [isDrawingMode, getMapper, onAddPoint, onEndStroke, stopLoop]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingMode) return;
      e.preventDefault();
      e.stopPropagation();
      const active = activePointerRef.current;
      if (isDrawingRef.current && active) {
        // 書いている最中に別の指・手のひらが触れても無視する。
        // ただし指（手のひら）で線が始まった後にペンが来たら、手のひらの線を捨ててペンを優先する。
        if (!(e.pointerType === 'pen' && active.type !== 'pen')) return;
        onCancelStroke?.();
      }
      isDrawingRef.current = true;
      activePointerRef.current = { id: e.pointerId, type: e.pointerType };
      const { x, y } = getMapper()(e.clientX, e.clientY);
      onStartStroke(x, y, pressureOf(e.nativeEvent), e.pointerType === 'pen');
      startLoop();
    },
    [isDrawingMode, getMapper, onStartStroke, onCancelStroke, startLoop]
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
