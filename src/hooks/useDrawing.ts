import { useState, useCallback, useRef } from 'react';
import type { Stroke } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 手書き状態フック。
 * 描画中の "currentStroke" は React state ではなく ref に保持し、
 * pointermove ごとに配列を mutate（push）するだけで再レンダリングを起こさない。
 * → DrawingCanvas は requestAnimationFrame ループで ref を読みつつ
 *   imperative に再描画する。確定（endStroke）時のみ React state を更新。
 */
export function useDrawing(initialColor = '#000000', initialSize = 4) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState(initialColor);
  const [penSize, setPenSize] = useState(initialSize);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const currentStrokeRef = useRef<Stroke | null>(null);

  const startStroke = useCallback(
    (x: number, y: number, pressure: number = 0.5) => {
      currentStrokeRef.current = {
        id: uuidv4(),
        points: [[x, y, pressure]],
        color: isErasing ? '#ffffff' : penColor,
        size: isErasing ? 20 : penSize,
        timestamp: Date.now(),
      };
    },
    [penColor, penSize, isErasing]
  );

  // mutate in place — 一切の再レンダリングを起こさない
  const addPoint = useCallback((x: number, y: number, pressure: number = 0.5) => {
    const cur = currentStrokeRef.current;
    if (!cur) return;
    cur.points.push([x, y, pressure]);
  }, []);

  const endStroke = useCallback(() => {
    const finished = currentStrokeRef.current;
    if (!finished) return;
    currentStrokeRef.current = null;
    setStrokes((prev) => [...prev, finished]);
    setUndoneStrokes([]);
  }, []);

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoneStrokes((u) => [...u, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setUndoneStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const clearAll = useCallback(() => {
    setStrokes([]);
    setUndoneStrokes([]);
    currentStrokeRef.current = null;
  }, []);

  const setStrokesExternal = useCallback((newStrokes: Stroke[]) => {
    setStrokes(newStrokes);
    setUndoneStrokes([]);
  }, []);

  return {
    strokes,
    undoneStrokes,
    currentStrokeRef,
    penColor,
    penSize,
    isErasing,
    isDrawingMode,
    setPenColor,
    setPenSize,
    setIsErasing,
    setIsDrawingMode,
    startStroke,
    addPoint,
    endStroke,
    undo,
    redo,
    clearAll,
    setStrokes: setStrokesExternal,
  };
}
