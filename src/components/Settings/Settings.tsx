import React, { useState } from 'react';
import type { AppSettings } from '../../types';
import { PEN_COLORS, PEN_SIZES } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export const Settings: React.FC<Props> = ({ settings, onSave, onClose }) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [newPhrase, setNewPhrase] = useState('');

  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;
    const maxOrder = local.quickPhrases.length > 0
      ? Math.max(...local.quickPhrases.map((p) => p.sortOrder))
      : -1;
    setLocal({
      ...local,
      quickPhrases: [
        ...local.quickPhrases,
        { id: uuidv4(), text: newPhrase.trim(), sortOrder: maxOrder + 1 },
      ],
    });
    setNewPhrase('');
  };

  const handleDeletePhrase = (id: string) => {
    setLocal({
      ...local,
      quickPhrases: local.quickPhrases.filter((p) => p.id !== id),
    });
  };

  const handleEditPhrase = (id: string, text: string) => {
    setLocal({
      ...local,
      quickPhrases: local.quickPhrases.map((p) =>
        p.id === id ? { ...p, text } : p
      ),
    });
  };

  const handleMovePhrase = (id: string, direction: 'up' | 'down') => {
    const sorted = [...local.quickPhrases].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const temp = sorted[idx].sortOrder;
    sorted[idx] = { ...sorted[idx], sortOrder: sorted[swapIdx].sortOrder };
    sorted[swapIdx] = { ...sorted[swapIdx], sortOrder: temp };
    setLocal({ ...local, quickPhrases: sorted });
  };

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">⚙️ 設定</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Observer name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">観察者名（デフォルト）</label>
            <input
              value={local.observerName}
              onChange={(e) => setLocal({ ...local, observerName: e.target.value })}
              placeholder="例: 田中太郎"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Default pen color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">デフォルトペン色</label>
            <div className="flex gap-2">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setLocal({ ...local, defaultPenColor: color })}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${
                    local.defaultPenColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Default pen size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">デフォルトペン太さ</label>
            <div className="flex gap-2">
              {PEN_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setLocal({ ...local, defaultPenSize: s.value })}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    local.defaultPenSize === s.value
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick phrases */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">定型文</label>
            <div className="space-y-2 mb-3">
              {[...local.quickPhrases]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((phrase) => (
                  <div key={phrase.id} className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMovePhrase(phrase.id, 'up')}
                        className="text-xs text-gray-400 hover:text-gray-700 leading-none"
                      >▲</button>
                      <button
                        onClick={() => handleMovePhrase(phrase.id, 'down')}
                        className="text-xs text-gray-400 hover:text-gray-700 leading-none"
                      >▼</button>
                    </div>
                    <input
                      value={phrase.text}
                      onChange={(e) => handleEditPhrase(phrase.id, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                    <button
                      onClick={() => handleDeletePhrase(phrase.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >✕</button>
                  </div>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPhrase(); }}
                placeholder="新しい定型文"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddPhrase}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >追加</button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
          >キャンセル</button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >保存</button>
        </div>
      </div>
    </div>
  );
};
