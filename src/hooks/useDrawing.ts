import { useState, useCallback, useRef } from 'react';
import type { Stroke } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface DrawingState {
  strokes: Stroke[];
  undoneStrokes: Stroke[];
  currentStroke: Stroke | null;
  penColor: string;
  penSize: number;
  isErasing: boolean;
  isDrawingMode: boolean;
}

export function useDrawing(initialColor = '#000000', initialSize = 4) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [penColor, setPenColor] = useState(initialColor);
  const [penSize, setPenSize] = useState(initialSize);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const currentStrokeRef = useRef<Stroke | null>(null);

  const startStroke = useCallback(
    (x: number, y: number, pressure: number = 0.5) => {
      const stroke: Stroke = {
        id: uuidv4(),
        points: [[x, y, pressure]],
        color: isErasing ? '#ffffff' : penColor,
        size: isErasing ? 20 : penSize,
        timestamp: Date.now(),
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    },
    [penColor, penSize, isErasing]
  );

  const addPoint = useCallback((x: number, y: number, pressure: number = 0.5) => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current = {
      ...currentStrokeRef.current,
      points: [...currentStrokeRef.current.points, [x, y, pressure]],
    };
    setCurrentStroke({ ...currentStrokeRef.current });
  }, []);

  const endStroke = useCallback(() => {
    if (currentStrokeRef.current) {
      setStrokes((prev) => [...prev, currentStrokeRef.current!]);
      setUndoneStrokes([]);
      currentStrokeRef.current = null;
      setCurrentStroke(null);
    }
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
    setCurrentStroke(null);
    currentStrokeRef.current = null;
  }, []);

  const setStrokesExternal = useCallback((newStrokes: Stroke[]) => {
    setStrokes(newStrokes);
    setUndoneStrokes([]);
  }, []);

  return {
    strokes,
    undoneStrokes,
    currentStroke,
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
