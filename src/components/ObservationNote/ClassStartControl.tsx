import React, { useEffect, useState } from 'react';
import { formatElapsed, formatTimeOnly } from '../../utils/timestampUtils';

interface Props {
  classStartTime: number | null;
  onChange: (time: number | null) => void;
}

export const ClassStartControl: React.FC<Props> = ({ classStartTime, onChange }) => {
  const [elapsed, setElapsed] = useState('00:00');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState('');

  useEffect(() => {
    if (classStartTime == null) {
      setElapsed('');
      return;
    }
    const update = () => setElapsed(formatElapsed(classStartTime));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [classStartTime]);

  const handleStart = () => {
    onChange(Date.now());
  };

  const handleReset = () => {
    if (window.confirm('授業開始時刻をリセットしますか？タイムスタンプは実時刻に戻ります。')) {
      onChange(null);
    }
  };

  const openPicker = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setPickerValue(`${hh}:${mm}`);
    setShowPicker(true);
  };

  const applyPicker = () => {
    if (!pickerValue) return;
    const [hh, mm] = pickerValue.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    onChange(d.getTime());
    setShowPicker(false);
  };

  if (classStartTime == null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">授業開始:</span>
        <button
          onClick={handleStart}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
        >
          ▶ 今すぐ開始
        </button>
        {!showPicker ? (
          <button
            onClick={openPicker}
            className="px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition-colors"
          >
            時刻指定
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="time"
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <button
              onClick={applyPicker}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
            >
              OK
            </button>
            <button
              onClick={() => setShowPicker(false)}
              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">
        授業開始 {formatTimeOnly(classStartTime)}
      </span>
      <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">
        経過 {elapsed}
      </span>
      <button
        onClick={handleReset}
        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
      >
        リセット
      </button>
    </div>
  );
};
