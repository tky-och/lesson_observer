import React from 'react';
import type { SessionMetadata } from '../../types';
import { formatDateTime } from '../../utils/timestampUtils';

interface Props {
  metadata: SessionMetadata | null;
  sessionCreatedAt: number | null;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenSessionList: () => void;
  isFileSystemSupported: boolean;
  hasFSHandle: boolean;
}

export const Header: React.FC<Props> = ({
  metadata,
  sessionCreatedAt,
  onOpenSettings,
  onOpenExport,
  onOpenSessionList,
  isFileSystemSupported,
  hasFSHandle,
}) => {
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
      </div>
    </header>
  );
};
