import { useCallback } from 'react';
import type { Session, AppSettings } from '../types';
import * as idb from './useIndexedDB';
import * as fs from './useFileSystemAccess';

/**
 * 統合ストレージ。
 * - L1: IndexedDB（同期的に必ず書く）
 * - L2: File System Access API（指定済みなら debounce で書く）
 *
 * デバウンスタイマー / pending session はモジュールスコープに置いて
 * シングルトン化する。useStorage が複数箇所でインスタンス化されても
 * 同じ debounce バケットを共有する。
 */

const FS_DEBOUNCE_MS = 2000;

const fsTimers = new Map<string, ReturnType<typeof setTimeout>>();
const fsPending = new Map<string, Session>();

export type SaveResult = {
  session: Session;
  /** IndexedDB への書き込み結果。失敗すると例外になるのでここに来るのは true のみ */
  idbSaved: true;
  /**
   * File System への書き込み結果。
   * - 'pending'      : デバウンス予約済み
   * - 'saved'        : 書けた
   * - 'no-folder'    : 保存先未指定（ユーザーが選んでいない）
   * - 'permission-required' : 権限切れ。ユーザー操作で再度フォルダ選択が必要
   * - 'unsupported'  : ブラウザが対応していない
   * - 'error'        : 実際の書き込みに失敗（throw された）
   */
  fsStatus:
    | 'pending'
    | 'saved'
    | 'no-folder'
    | 'permission-required'
    | 'unsupported'
    | 'error';
  fsError?: unknown;
};

async function runFsSave(session: Session): Promise<SaveResult['fsStatus']> {
  try {
    return await fs.saveSessionToFS(session);
  } catch (e) {
    console.error('[fs save] failed:', e);
    return 'error';
  }
}

/** 1 セッション分の pending を即時 flush する */
export async function flushOnePendingFS(
  sessionId: string
): Promise<SaveResult['fsStatus'] | 'no-pending'> {
  const t = fsTimers.get(sessionId);
  if (t) {
    clearTimeout(t);
    fsTimers.delete(sessionId);
  }
  const pending = fsPending.get(sessionId);
  if (!pending) return 'no-pending';
  fsPending.delete(sessionId);
  return runFsSave(pending);
}

/** 全 pending を flush（タブを閉じる前 / セッション切替時など） */
export async function flushAllPendingFS(): Promise<void> {
  const ids = Array.from(fsTimers.keys());
  await Promise.all(ids.map((id) => flushOnePendingFS(id)));
}

/**
 * 内部実装。`flushFs: true` のときは pending を消化して同期的に FS まで書ききる。
 * それ以外は IndexedDB は即書き、FS はデバウンス（2 秒）で予約する。
 */
async function saveSessionImpl(
  session: Session,
  opts: { flushFs?: boolean } = {}
): Promise<SaveResult> {
  const updated: Session = { ...session, updatedAt: Date.now() };

  // 1) IndexedDB は即時書き
  await idb.saveSession(updated);

  // 2) FS の取り扱い
  if (!fs.isFileSystemAccessSupported()) {
    return { session: updated, idbSaved: true, fsStatus: 'unsupported' };
  }

  const sessionId = updated.sessionId;

  // 既存の予約をキャンセルして新しい snapshot を pending にセット
  const existing = fsTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    fsTimers.delete(sessionId);
  }
  fsPending.set(sessionId, updated);

  if (opts.flushFs) {
    fsPending.delete(sessionId);
    const status = await runFsSave(updated);
    return { session: updated, idbSaved: true, fsStatus: status };
  }

  fsTimers.set(
    sessionId,
    setTimeout(() => {
      flushOnePendingFS(sessionId).catch(() => {});
    }, FS_DEBOUNCE_MS)
  );

  return { session: updated, idbSaved: true, fsStatus: 'pending' };
}

export function useStorage() {
  /** 旧 API 互換: Session を返す。FS の状態は無視する。 */
  const saveSession = useCallback(async (session: Session) => {
    const r = await saveSessionImpl(session);
    return r.session;
  }, []);

  /** FS のステータスまで返す詳細版。手動保存ボタンから使う。 */
  const saveSessionDetailed = useCallback(
    (session: Session, opts?: { flushFs?: boolean }) => saveSessionImpl(session, opts),
    []
  );

  const loadSessions = useCallback(async (): Promise<Session[]> => {
    return idb.getAllSessions();
  }, []);

  const loadSession = useCallback(async (id: string): Promise<Session | undefined> => {
    return idb.getSession(id);
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await idb.deleteSession(id);
  }, []);

  const loadSettings = useCallback(async (): Promise<AppSettings> => {
    return idb.getSettings();
  }, []);

  const saveSettingsData = useCallback(async (settings: AppSettings) => {
    await idb.saveSettings(settings);
    try {
      await fs.saveSettingsToFS(settings);
    } catch (e) {
      console.error('[fs settings save] failed:', e);
    }
  }, []);

  return {
    saveSession,
    saveSessionDetailed,
    flushAllPendingFS,
    loadSessions,
    loadSession,
    deleteSession,
    loadSettings,
    saveSettings: saveSettingsData,
    isFileSystemSupported: fs.isFileSystemAccessSupported(),
    selectDirectory: fs.selectDirectory,
    getDirectoryHandle: fs.getDirectoryHandle,
    getDirectoryHandleStatus: fs.getDirectoryHandleStatus,
  };
}
