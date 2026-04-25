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

export const AnnotationLayerView: React.FC<Props> = ({
  material,
  onUpdate,
  defaultPenColor,
  defaultPenSize,
}) => {
  const pageKey = material.currentPage || 1;
  const pageStrokes = material.annotations[pageKey] || [];

  const drawing = useDrawing(defaultPenColor, defaultPenSize);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [bgSize, setBgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

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

  // 背景要素（画像/PDF）の実寸を測ってオーバーレイに反映
  useEffect(() => {
    const el = backgroundRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setBgSize((prev) => {
          const w = Math.floor(r.width);
          const h = Math.floor(r.height);
          if (prev.w === w && prev.h === h) return prev;
          return { w, h };
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // 画像/PDF ロード後に再測定
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
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {/* Background + overlay wrapper. inline-block shrinks to content size. */}
        <div
          ref={backgroundRef}
          className="relative inline-block align-top"
          style={{ lineHeight: 0 }}
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
  );
};
