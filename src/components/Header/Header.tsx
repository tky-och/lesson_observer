import React from 'react';
import type { SessionMetadata } from '../../types';
import { formatDateTime } from '../../utils/timestampUtils';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  metadata: SessionMetadata | null;
  sessionCreatedAt: number | null;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenSessionList: () => void;
  onOpenHelp: () => void;
  onOpenFeedback: () => void;
  onSaveNow: () => void;
  saveStatus: SaveStatus;
  isFileSystemSupported: boolean;
  hasFSHandle: boolean;
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: '💾 保存',
  dirty: '💾 保存',
  saving: '💾 保存中…',
  saved: '✅ 保存しました',
  error: '⚠️ 保存失敗',
};

export const Header: React.FC<Props> = ({
  metadata,
  sessionCreatedAt,
  onOpenSettings,
  onOpenExport,
  onOpenSessionList,
  onOpenHelp,
  onOpenFeedback,
  onSaveNow,
  saveStatus,
  isFileSystemSupported,
  hasFSHandle,
}) => {
  const saveButtonClasses =
    saveStatus === 'saved'
      ? 'px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg transition-colors'
      : saveStatus === 'error'
        ? 'px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors'
        : saveStatus === 'dirty'
          ? 'px-3 py-2 text-sm bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors'
          : 'px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors';

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">📋 授業観察メモ</h1>
        {metadata && (
          <div className="text-sm text-gray-500 truncate">
            {metadata.title || '無題のセッション'}
            {sessionCreatedAt && (
              <span className="ml-2 text-gray-400">
                {formatDateTime(sessionCreatedAt)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isFileSystemSupported && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              hasFSHandle
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {hasFSHandle ? '💾 フォルダ保存中' : '⚠️ 保存先未設定'}
          </span>
        )}
        <button
          onClick={onSaveNow}
          disabled={saveStatus === 'saving'}
          className={saveButtonClasses}
          title="現在のセッションを即時保存"
        >
          {SAVE_LABEL[saveStatus]}
        </button>
        <button
          onClick={onOpenSessionList}
          className="px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          📂 セッション
        </button>
        <button
          onClick={onOpenExport}
          className="px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          📤 エクスポート
        </button>
        <button
          onClick={onOpenSettings}
          className="px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ⚙️ 設定
        </button>
        <button
          onClick={onOpenHelp}
          className="px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ❓ 使い方
        </button>
        <button
          onClick={onOpenFeedback}
          className="px-3 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          title="ご意見・不具合報告・機能要望をお寄せください"
        >
          💡 ご意見
        </button>
      </div>
    </header>
  );
};
