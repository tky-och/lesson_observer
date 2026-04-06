import React from 'react';
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

  // Sync strokes from material on page change
  React.useEffect(() => {
    const strokes = material.annotations[pageKey] || [];
    drawing.setStrokes(strokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, material.id]);

  // Save annotations back when strokes change
  React.useEffect(() => {
    if (drawing.strokes !== pageStrokes) {
      const newAnnotations = {
        ...material.annotations,
        [pageKey]: drawing.strokes,
      };
      onUpdate({
        ...material,
        annotations: newAnnotations,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing.strokes]);

  const handlePageChange = (page: number) => {
    onUpdate({
      ...material,
      currentPage: page,
    });
  };

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
      <div className="flex-1 overflow-auto relative">
        {/* Background: Image or PDF */}
        <div className="relative inline-block">
          {material.type === 'image' ? (
            <ImageViewer data={material.data} />
          ) : (
            <PdfViewer
              data={material.data}
              currentPage={material.currentPage || 1}
              onPageChange={handlePageChange}
            />
          )}

          {/* Overlay drawing canvas */}
          <div className="absolute inset-0">
            <DrawingCanvas
              strokes={drawing.strokes}
              currentStroke={drawing.currentStroke}
              isDrawingMode={drawing.isDrawingMode}
              onStartStroke={drawing.startStroke}
              onAddPoint={drawing.addPoint}
              onEndStroke={drawing.endStroke}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
