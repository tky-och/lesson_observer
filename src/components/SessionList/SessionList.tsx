import React, { useState, useEffect, useCallback } from 'react';
import type { Session, SessionMetadata, AppSettings } from '../../types';
import { useStorage } from '../../hooks/useStorage';
import { formatDateTime } from '../../utils/timestampUtils';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  currentSessionId: string | null;
  onSelectSession: (session: Session) => void;
  onNewSession: (session: Session) => void;
  onClose: () => void;
  settings: AppSettings;
}

export const SessionList: React.FC<Props> = ({
  currentSessionId,
  onSelectSession,
  onNewSession,
  onClose,
  settings,
}) => {
  const { loadSessions, deleteSession, saveSession, selectDirectory, isFileSystemSupported, getDirectoryHandle } = useStorage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [hasFSHandle, setHasFSHandle] = useState(false);

  const [formData, setFormData] = useState<SessionMetadata>(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return {
      title: `${yyyy}${mm}${dd}`,
      observer: settings.observerName,
      subject: '',
      grade: '',
      teacher: '',
      classStartTime: null,
      classEndTime: null,
    };
  });

  const load = useCallback(async () => {
    setLoading(true);
    const list = await loadSessions();
    setSessions(list);
    setLoading(false);
  }, [loadSessions]);

  useEffect(() => {
    load();
    getDirectoryHandle().then((h) => setHasFSHandle(!!h));
  }, [load, getDirectoryHandle]);

  const handleCreate = async () => {
    const session: Session = {
      sessionId: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: { ...formData },
      textNotes: '',
      freehandStrokes: [],
      materials: [],
    };
    await saveSession(session);
    onNewSession(session);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('このセッションを削除しますか？')) return;
    await deleteSession(id);
    await load();
  };

  const handleSelectDirectory = async () => {
    const handle = await selectDirectory();
    setHasFSHandle(!!handle);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">セッション管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* File system setup */}
        {isFileSystemSupported && (
          <div className="px-4 pt-3">
            <button
              onClick={handleSelectDirectory}
              className={`w-full px-4 py-2 rounded-lg text-sm border transition-colors ${
                hasFSHandle
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              {hasFSHandle
                ? '💾 保存先フォルダを変更'
                : '📁 保存先フォルダを選択'}
            </button>
          </div>
        )}

        {!isFileSystemSupported && (
          <div className="px-4 pt-3">
            <div className="px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              ⚠️ このブラウザはフォルダ保存に非対応です。定期的にエクスポートしてバックアップを取ってください。
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* New session form */}
          {showNewForm ? (
            <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-medium mb-3">新規セッション</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="タイトル（例: 20260410理科3A）"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
                />
                <input
                  value={formData.observer}
                  onChange={(e) => setFormData({ ...formData, observer: e.target.value })}
                  placeholder="観察者名"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="教科"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="学年・クラス"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  placeholder="授業者名"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  作成
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full mb-4 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              ＋ 新規セッション
            </button>
          )}

          {/* Session list */}
          {loading ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              セッションがありません。新規セッションを作成してください。
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    session.sessionId === currentSessionId
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectSession(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {session.metadata.title || '無題のセッション'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(session.createdAt)}
                        {session.metadata.subject && ` | ${session.metadata.subject}`}
                        {session.metadata.grade && ` | ${session.metadata.grade}`}
                        {session.metadata.teacher && ` | ${session.metadata.teacher}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        メモ: {session.textNotes.length}文字
                        {session.freehandStrokes.length > 0 && ` | 手書き: ${session.freehandStrokes.length}ストローク`}
                        {session.materials.length > 0 && ` | 資料: ${session.materials.length}件`}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.sessionId);
                      }}
                      className="ml-2 text-gray-300 hover:text-red-500 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
