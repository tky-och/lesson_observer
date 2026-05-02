import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MaterialTab } from '../../types';
import { DrawingCanvas } from '../Handwriting/DrawingCanvas';
import { DrawingToolbar } from '../Handwriting/DrawingToolbar';
import { useDrawing } from '../../hooks/useDrawing';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';

interface Props {
  material: MaterialTab;
  onUpdate: (updated: MaterialTab) => void;
  defaultPenColor: string;
  defaultPenSize: number;
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;
const ZOOM_STEP = 1.25; // 1 クリックで ×1.25 / ÷1.25

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export const AnnotationLayerView: React.FC<Props> = ({
  material,
  onUpdate,
  defaultPenColor,
  defaultPenSize,
}) => {
  const pageKey = material.currentPage || 1;
  const pageStrokes = material.annotations[pageKey] || [];

  const drawing = useDrawing(defaultPenColor, defaultPenSize);
  const scrollRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [bgSize, setBgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);

  // 直近 material から sync 済みの strokes 参照。これと drawing.strokes が
  // 一致している間は「ユーザーが描き加えていない」ことが分かるので保存しない。
  // これがないと、別ペインに同じ材料を開いたときにマウント直後の空 strokes が
  // material.annotations を上書きして既存の注釈を一瞬潰してしまう。
  const lastSyncedStrokesRef = useRef<typeof drawing.strokes | null>(null);
  const initializedRef = useRef(false);

  // Sync strokes from material on page change
  useEffect(() => {
    const strokes = material.annotations[pageKey] || [];
    lastSyncedStrokesRef.current = strokes;
    initializedRef.current = false; // 次回 drawing.strokes が同期完了するまで保存禁止
    drawing.setStrokes(strokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, material.id]);

  // Save annotations back when strokes change
  useEffect(() => {
    // sync 直後に drawing.strokes が同じ参照に揃ったことを検知して
    // 「以後の変更はユーザー由来」とマークする。
    if (drawing.strokes === lastSyncedStrokesRef.current) {
      initializedRef.current = true;
      return;
    }
    // sync が完了していないうちに保存しない（マウント直後の空配列で
    // material.annotations を破壊するのを防ぐ）。
    if (!initializedRef.current) return;
    if (drawing.strokes === pageStrokes) return;

    lastSyncedStrokesRef.current = drawing.strokes;
    const newAnnotations = {
      ...material.annotations,
      [pageKey]: drawing.strokes,
    };
    onUpdate({
      ...material,
      annotations: newAnnotations,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing.strokes]);

  // 背景要素（画像/PDF）の **未スケール時の** 実寸を測ってオーバーレイに反映。
  // ResizeObserver の contentRect は CSS transform の影響を受けない layout-box
  // を返すため、zoom 値が変わっても bgSize は安定する。
  useEffect(() => {
    const el = backgroundRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) {
        setBgSize((prev) => {
          if (prev.w === w && prev.h === h) return prev;
          return { w, h };
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const imgs = el.querySelectorAll('img, canvas');
    imgs.forEach((img) => {
      if (img instanceof HTMLImageElement && !img.complete) {
        img.addEventListener('load', update, { once: true });
      }
    });
    return () => ro.disconnect();
  }, [material.id, material.currentPage, material.type]);

  const handlePageChange = useCallback(
    (page: number) => {
      onUpdate({
        ...material,
        currentPage: page,
      });
    },
    [material, onUpdate]
  );

  // ---------------------------------------------------------------
  // ズーム操作: ボタン / Ctrl+Wheel / 2 本指ピンチ
  // ---------------------------------------------------------------
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z * ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z / ZOOM_STEP)), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  // Ctrl/⌘ + wheel で拡大縮小（デスクトップ）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.002); // なめらか
      setZoom((z) => clampZoom(z * factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // 2 本指ピンチ（モバイル）。1 本指のときは普通にスクロールさせる。
  // 描画モード中はキャンバスが pointer events を奪うため、ここでは
  // touch events をそのまま聞いている。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const state: { initialDistance: number; initialZoom: number } = {
      initialDistance: 0,
      initialZoom: 1,
    };
    let pinching = false;

    const distance = (a: Touch, b: Touch) =>
      Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinching = true;
        state.initialDistance = distance(e.touches[0], e.touches[1]);
        state.initialZoom = zoom;
        e.preventDefault();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinching && e.touches.length >= 2) {
        e.preventDefault();
        const d = distance(e.touches[0], e.touches[1]);
        if (state.initialDistance > 0) {
          const ratio = d / state.initialDistance;
          setZoom(clampZoom(state.initialZoom * ratio));
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinching = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [zoom]);

  return (
    <div className="flex flex-col h-full">
      <DrawingToolbar
        penColor={drawing.penColor}
        penSize={drawing.penSize}
        isErasing={drawing.isErasing}
        isDrawingMode={drawing.isDrawingMode}
        canUndo={drawing.strokes.length > 0}
        canRedo={drawing.undoneStrokes.length > 0}
        onColorChange={drawing.setPenColor}
        onSizeChange={drawing.setPenSize}
        onToggleEraser={() => drawing.setIsErasing(!drawing.isErasing)}
        onToggleDrawingMode={() => drawing.setIsDrawingMode(!drawing.isDrawingMode)}
        onUndo={drawing.undo}
        onRedo={drawing.redo}
        onClear={() => {
          if (window.confirm('このページのアノテーションをすべて消去しますか？')) {
            drawing.clearAll();
          }
        }}
      />

      {/* Zoom toolbar */}
      <div className="flex items-center gap-1 px-3 py-1 bg-white border-b border-gray-200 text-xs">
        <span className="text-gray-500 mr-1">表示:</span>
        <button
          onClick={zoomOut}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
          title="縮小（⌘/Ctrl + ホイール、または 2 本指ピンチ）"
          disabled={zoom <= ZOOM_MIN + 0.01}
        >
          −
        </button>
        <button
          onClick={zoomReset}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 min-w-[3.5rem] text-center"
          title="100% に戻す"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
          title="拡大"
          disabled={zoom >= ZOOM_MAX - 0.01}
        >
          ＋
        </button>
        <span className="ml-2 text-gray-400 hidden sm:inline">
          ピンチ / ⌘+ホイール / ボタン
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-gray-100 p-4"
      >
        {/* Sizer: 拡大後のレイアウトボックスをスクロール領域に確保する。
            transform: scale はレイアウトに反映されないので、ここで
            手動で width/height を拡張しないとスクロールできない。 */}
        <div
          style={{
            width: bgSize.w > 0 ? bgSize.w * zoom : undefined,
            height: bgSize.h > 0 ? bgSize.h * zoom : undefined,
          }}
        >
          {/* Scaled wrapper. transform-origin: top left で左上基点に拡大。 */}
          <div
            ref={backgroundRef}
            className="relative inline-block align-top"
            style={{
              lineHeight: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {material.type === 'image' ? (
              <ImageViewer data={material.data} />
            ) : (
              <PdfViewer
                data={material.data}
                currentPage={material.currentPage || 1}
                onPageChange={handlePageChange}
              />
            )}

            {/* Overlay drawing canvas — sized explicitly to match background */}
            {bgSize.w > 0 && bgSize.h > 0 && (
              <div
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: bgSize.w,
                  height: bgSize.h,
                }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    pointerEvents: drawing.isDrawingMode ? 'auto' : 'none',
                  }}
                >
                  <DrawingCanvas
                    strokes={drawing.strokes}
                    currentStrokeRef={drawing.currentStrokeRef}
                    isDrawingMode={drawing.isDrawingMode}
                    width={bgSize.w}
                    height={bgSize.h}
                    onStartStroke={drawing.startStroke}
                    onAddPoint={drawing.addPoint}
                    onEndStroke={drawing.endStroke}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
