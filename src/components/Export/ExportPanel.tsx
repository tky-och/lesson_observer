import React, { useRef, useState } from 'react';
import type { Session } from '../../types';
import { exportJSON, exportMarkdown, exportText, exportZip } from '../../utils/exportUtils';
import { exportPdf } from '../../utils/pdfExport';
import { importSessionFromFile } from '../../utils/importUtils';

interface Props {
  session: Session;
  onClose: () => void;
  onImport?: (session: Session) => void;
}

export const ExportPanel: React.FC<Props> = ({ session, onClose, onImport }) => {
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (type: 'json' | 'markdown' | 'text' | 'zip' | 'pdf') => {
    setBusy(true);
    try {
      switch (type) {
        case 'json':
          exportJSON(session);
          break;
        case 'markdown':
          exportMarkdown(session);
          break;
        case 'text':
          exportText(session);
          break;
        case 'zip':
          await exportZip(session);
          break;
        case 'pdf':
          await exportPdf(session);
          break;
      }
    } catch (e) {
      alert(`エクスポートエラー: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!onImport) return;
    setBusy(true);
    try {
      const imported = await importSessionFromFile(file);
      onImport(imported);
      onClose();
    } catch (err) {
      alert(`インポートエラー: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">📤 エクスポート / インポート</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-500 mb-2">
            セッション「{session.metadata.title || '無題'}」のデータを書き出します。
          </p>

          <button
            onClick={() => handleExport('text')}
            disabled={busy}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📄 テキスト（.txt）</div>
            <div className="text-xs text-gray-500 mt-1">観察メモをプレーンテキストで保存</div>
          </button>

          <button
            onClick={() => handleExport('markdown')}
            disabled={busy}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📝 Markdown（.md）</div>
            <div className="text-xs text-gray-500 mt-1">メタ情報を含むMarkdown形式で保存</div>
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={busy}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📋 JSON（.json）</div>
            <div className="text-xs text-gray-500 mt-1">構造化データとして保存（資料ファイルは含まず）</div>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={busy}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📕 PDF（.pdf）</div>
            <div className="text-xs text-gray-500 mt-1">観察メモ・手書き・資料をまとめてPDF化</div>
          </button>

          <button
            onClick={() => handleExport('zip')}
            disabled={busy}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📦 一括（.zip）</div>
            <div className="text-xs text-gray-500 mt-1">JSON + Markdown + テキスト + 資料を一括保存</div>
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <p className="text-sm text-gray-500 mb-2">
            エクスポート済みのファイルを読み込みます。
          </p>
          <button
            onClick={handleImportClick}
            disabled={busy || !onImport}
            className="w-full px-4 py-3 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-left hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-sm">📥 ファイルからインポート</div>
            <div className="text-xs text-blue-600/80 mt-1">.json / .zip / .md / .txt に対応</div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip,.md,.txt,application/json,application/zip,text/markdown,text/plain"
            onChange={handleFileSelected}
            className="hidden"
          />
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
