import React from 'react';
import { PEN_COLORS, PEN_SIZES } from '../../types';

interface Props {
  penColor: string;
  penSize: number;
  isErasing: boolean;
  isDrawingMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onToggleEraser: () => void;
  onToggleDrawingMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export const DrawingToolbar: React.FC<Props> = ({
  penColor,
  penSize,
  isErasing,
  isDrawingMode,
  canUndo,
  canRedo,
  onColorChange,
  onSizeChange,
  onToggleEraser,
  onToggleDrawingMode,
  onUndo,
  onRedo,
  onClear,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 border-b border-gray-200 flex-wrap">
      {/* Drawing mode toggle */}
      <button
        onClick={onToggleDrawingMode}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isDrawingMode
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        {isDrawingMode ? '✏️ 手書きON' : '✏️ 手書きOFF'}
      </button>

      {isDrawingMode && (
        <>
          <div className="w-px h-8 bg-gray-300" />

          {/* Colors */}
          {PEN_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onColorChange(color);
                if (isErasing) onToggleEraser();
              }}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                !isErasing && penColor === color
                  ? 'border-blue-500 scale-110'
                  : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}

          <div className="w-px h-8 bg-gray-300" />

          {/* Sizes */}
          {PEN_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => onSizeChange(s.value)}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                penSize === s.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}

          <div className="w-px h-8 bg-gray-300" />

          {/* Eraser */}
          <button
            onClick={onToggleEraser}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              isErasing
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🧹 消しゴム
          </button>

          {/* Undo/Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-2 py-1 rounded text-sm bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↩️
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-2 py-1 rounded text-sm bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↪️
          </button>

          {/* Clear */}
          <button
            onClick={onClear}
            className="px-2 py-1 rounded text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          >
            🗑️ 全消去
          </button>
        </>
      )}
    </div>
  );
};
