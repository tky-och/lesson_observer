import React, { useState } from 'react';
import type { SessionMetadata } from '../../types';

interface Props {
  metadata: SessionMetadata;
  onSave: (updated: SessionMetadata) => void;
  onClose: () => void;
}

/**
 * 授業情報（タイトル・観察者・教科・学年/クラス・授業者）を
 * メモ画面からも編集できるようにするためのモーダル。
 */
export const MetadataEditor: React.FC<Props> = ({ metadata, onSave, onClose }) => {
  const [form, setForm] = useState<SessionMetadata>(metadata);

  const update = <K extends keyof SessionMetadata>(key: K, value: SessionMetadata[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">📝 授業情報の編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="例: 20260410理科3A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                観察者
              </label>
              <input
                type="text"
                value={form.observer}
                onChange={(e) => update('observer', e.target.value)}
                placeholder="例: 山田太郎"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                授業者
              </label>
              <input
                type="text"
                value={form.teacher}
                onChange={(e) => update('teacher', e.target.value)}
                placeholder="例: 佐藤先生"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                教科
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                placeholder="例: 理科"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                学年・クラス
              </label>
              <input
                type="text"
                value={form.grade}
                onChange={(e) => update('grade', e.target.value)}
                placeholder="例: 3年A組"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
