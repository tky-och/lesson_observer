import React, { useRef, useCallback } from 'react';
import type { QuickPhrase, SessionMetadata } from '../../types';
import { TimestampButton } from './TimestampButton';
import { QuickPhrases } from './QuickPhrases';
import { PhotoAttach } from './PhotoAttach';
import { ClassStartControl } from './ClassStartControl';

interface Props {
  value: string;
  onChange: (value: string) => void;
  photos: string[];
  onAddPhoto: (dataUrl: string) => void;
  onRemovePhoto: (index: number) => void;
  quickPhrases: QuickPhrase[];
  metadata: SessionMetadata;
  onClassStartTimeChange: (t: number | null) => void;
  onClassEndTimeChange: (t: number | null) => void;
  onOpenMetadataEdit: () => void;
}

export const TextEditor: React.FC<Props> = ({
  value,
  onChange,
  photos,
  onAddPhoto,
  onRemovePhoto,
  quickPhrases,
  metadata,
  onClassStartTimeChange,
  onClassEndTimeChange,
  onOpenMetadataEdit,
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
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.focus();
      });
    },
    [value, onChange]
  );

  /**
   * 現在カーソルがある行の先頭に `[ラベル] ` を挿入する。
   * 先頭のタイムスタンプ（数字とコロンのみ）は保持し、
   * 既にラベルがあれば置換する。
   */
  const insertLabel = useCallback(
    (label: string) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const cursor = ta.selectionStart;
      const before = value.substring(0, cursor);
      const lineStart = before.lastIndexOf('\n') + 1;
      const afterFromLineStart = value.substring(lineStart);
      const nlIdx = afterFromLineStart.indexOf('\n');
      const lineEnd = nlIdx === -1 ? value.length : lineStart + nlIdx;
      const currentLine = value.substring(lineStart, lineEnd);

      // 1) 先頭のタイムスタンプ `[HH:MM(:SS)]` を検出（保持する）
      const tsRe = /^\[[0-9:]+\]\s?/;
      const tsMatch = currentLine.match(tsRe);
      const tsPart = tsMatch ? tsMatch[0] : '';
      const afterTs = currentLine.substring(tsPart.length);

      // 2) タイムスタンプの後に既存のラベル `[...]` があれば置換対象とする
      //    ただし数字＋コロンだけの場合はラベルではなくタイムスタンプなので対象外
      const labelRe = /^\[([^\]]+)\]\s?/;
      const labelMatch = afterTs.match(labelRe);
      const isReplaceable =
        !!labelMatch && !/^[0-9:]+$/.test(labelMatch[1]);

      const remainder = isReplaceable
        ? afterTs.substring(labelMatch![0].length)
        : afterTs;

      const newLine = `${tsPart}[${label}] ${remainder}`;

      const newValue =
        value.substring(0, lineStart) + newLine + value.substring(lineEnd);
      onChange(newValue);

      requestAnimationFrame(() => {
        const newCursor = lineStart + newLine.length;
        ta.selectionStart = ta.selectionEnd = newCursor;
        ta.focus();
      });
    },
    [value, onChange]
  );

  // メタ情報の一行サマリ
  const metaSummary = [
    metadata.title,
    metadata.subject,
    metadata.grade,
    metadata.teacher ? `授業者: ${metadata.teacher}` : '',
    metadata.observer ? `観察者: ${metadata.observer}` : '',
  ]
    .filter((s) => s && s.trim().length > 0)
    .join(' / ');

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* Metadata summary + edit button */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <div className="flex-1 min-w-0 text-xs text-gray-600 truncate">
          {metaSummary || <span className="text-gray-400">授業情報が未設定です</span>}
        </div>
        <button
          onClick={onOpenMetadataEdit}
          className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
          title="授業のタイトル・授業者・教科などを編集"
        >
          📝 授業情報を編集
        </button>
      </div>

      {/* Class start control */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
        <ClassStartControl
          classStartTime={metadata.classStartTime}
          classEndTime={metadata.classEndTime}
          onStartChange={onClassStartTimeChange}
          onEndChange={onClassEndTimeChange}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <TimestampButton
          onInsert={insertAtCursor}
          classStartTime={metadata.classStartTime}
          classEndTime={metadata.classEndTime}
        />
        <QuickPhrases phrases={quickPhrases} onInsertLabel={insertLabel} />
      </div>

      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="授業の観察メモを入力してください...&#10;&#10;・タイムスタンプ: 授業開始からの経過時刻を挿入（未設定なら現在時刻）&#10;・定型文ボタン: その行の先頭にラベルとして挿入"
        className="flex-1 w-full p-4 border border-gray-200 rounded-lg resize-y text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent min-h-[200px] font-mono"
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
