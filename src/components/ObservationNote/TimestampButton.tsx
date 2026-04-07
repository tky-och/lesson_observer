import React, { useEffect, useState } from 'react';
import { getTimestampForInsert, formatElapsed, getClockTimestamp } from '../../utils/timestampUtils';

interface Props {
  onInsert: (text: string) => void;
  classStartTime: number | null;
}

export const TimestampButton: React.FC<Props> = ({ onInsert, classStartTime }) => {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const update = () => {
      setPreview(
        classStartTime == null ? getClockTimestamp() : formatElapsed(classStartTime)
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [classStartTime]);

  return (
    <button
      onClick={() => onInsert(`[${getTimestampForInsert(classStartTime)}] `)}
      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
      title={classStartTime != null ? '授業開始からの経過時刻を挿入' : '現在時刻を挿入'}
    >
      🕐 {preview}
    </button>
  );
};
