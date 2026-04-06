import React, { useRef, useCallback } from 'react';
import type { QuickPhrase } from '../../types';
import { TimestampButton } from './TimestampButton';
import { QuickPhrases } from './QuickPhrases';
import { PhotoAttach } from './PhotoAttach';

interface Props {
  value: string;
  onChange: (value: string) => void;
  photos: string[];
  onAddPhoto: (dataUrl: string) => void;
  onRemovePhoto: (index: number) => void;
  quickPhrases: QuickPhrase[];
}

export const TextEditor: React.FC<Props> = ({
  value,
  onChange,
  photos,
  onAddPhoto,
  onRemovePhoto,
  quickPhrases,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        onChange(value + text);
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + text + value.substring(end);
      onChange(newValue);
      // Restore cursor position after insert
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.focus();
      });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <TimestampButton onInsert={insertAtCursor} />
        <QuickPhrases phrases={quickPhrases} onInsert={insertAtCursor} />
      </div>

      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="授業の観察メモを入力してください...&#10;&#10;タイムスタンプボタンで時刻を挿入できます。"
        className="flex-1 w-full p-4 border border-gray-200 rounded-lg resize-y text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent min-h-[200px]"
      />

      {/* Photo attach */}
      <PhotoAttach
        photos={photos}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
      />
    </div>
  );
};
