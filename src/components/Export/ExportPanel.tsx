import React, { useState } from 'react';
import type { Session } from '../../types';
import { exportJSON, exportMarkdown, exportZip } from '../../utils/exportUtils';

interface Props {
  session: Session;
  onClose: () => void;
}

export const ExportPanel: React.FC<Props> = ({ session, onClose }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: 'json' | 'markdown' | 'zip') => {
    setExporting(true);
    try {
      switch (type) {
        case 'json':
          exportJSON(session);
          break;
        case 'markdown':
          exportMarkdown(session);
          break;
        case 'zip':
          await exportZip(session);
          break;
      }
    } catch (e) {
      alert(`エクスポートエラー: ${e}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">📤 エクスポート</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            セッション「{session.metadata.title || '無題'}」のデータをエクスポートします。
          </p>

          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📋 JSON エクスポート</div>
            <div className="text-xs text-gray-500 mt-1">全データを構造化JSONとしてダウンロード</div>
          </button>

          <button
            onClick={() => handleExport('markdown')}
            disabled={exporting}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📝 Markdown エクスポート</div>
            <div className="text-xs text-gray-500 mt-1">テキスト記録をMarkdown形式でダウンロード</div>
          </button>

          <button
            onClick={() => handleExport('zip')}
            disabled={exporting}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📦 一括エクスポート（ZIP）</div>
            <div className="text-xs text-gray-500 mt-1">JSON + Markdown + 資料を一括ダウンロード</div>
          </button>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
          >閉じる</button>
        </div>
      </div>
    </div>
  );
};
