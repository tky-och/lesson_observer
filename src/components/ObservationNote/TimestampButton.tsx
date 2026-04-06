import React from 'react';
import { getCurrentTimestamp } from '../../utils/timestampUtils';

interface Props {
  onInsert: (text: string) => void;
}

export const TimestampButton: React.FC<Props> = ({ onInsert }) => {
  return (
    <button
      onClick={() => onInsert(`[${getCurrentTimestamp()}] `)}
      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
      title="タイムスタンプを挿入"
    >
      🕐 タイムスタンプ
    </button>
  );
};
