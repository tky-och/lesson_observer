import type { Session, AppSettings } from '../types';
import { saveFSHandle, getFSHandle } from './useIndexedDB';

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

let cachedHandle: FileSystemDirectoryHandle | null = null;

/**
 * 保存先フォルダの状態。auto-save / manual-save の結果を UI に伝えるために
 * `saveSessionToFS` が返す。
 */
export type FSWriteStatus =
  | 'saved'
  | 'unsupported' // ブラウザが File System Access 非対応
  | 'no-folder' // ユーザーがフォルダを選択していない
  | 'permission-required'; // フォルダはあるが権限が落ちていて再選択が必要

/**
 * 権限を厳格にチェックして、書き込み可能な handle のみ返す。
 *
 * `requestPermission` はユーザー操作（クリック等）の中でしか promotion でき
 * ないため、auto-save の setTimeout 内で呼ばれた場合は granted にならない
 * ことがある。その場合 null を返し、呼び出し側が UI に通知できるようにする。
 */
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const tryHandle = async (h: FileSystemDirectoryHandle | null) => {
    if (!h) return null;
    try {
      const query = await (h as unknown as {
        queryPermission: (d: { mode: string }) => Promise<PermissionState>;
      }).queryPermission({ mode: 'readwrite' });
      if (query === 'granted') return h;
      if (query === 'prompt') {
        const req = await (h as unknown as {
          requestPermission: (d: { mode: string }) => Promise<PermissionState>;
        }).requestPermission({ mode: 'readwrite' });
        if (req === 'granted') return h;
      }
      return null;
    } catch {
      return null;
    }
  };

  if (cachedHandle) {
    const ok = await tryHandle(cachedHandle);
    if (ok) return ok;
    cachedHandle = null; // 失効した cache は捨てる
  }

  const stored = await getFSHandle();
  const ok = await tryHandle(stored);
  if (ok) {
    cachedHandle = ok;
    return ok;
  }
  return null;
}

/** UI で「保存先未設定 / 権限切れ」を区別したいときの軽い問い合わせ。 */
export async function getDirectoryHandleStatus(): Promise<
  'granted' | 'permission-required' | 'none'
> {
  if (!isFileSystemAccessSupported()) return 'none';
  const stored = cachedHandle ?? (await getFSHandle());
  if (!stored) return 'none';
  try {
    const query = await (stored as unknown as {
      queryPermission: (d: { mode: string }) => Promise<PermissionState>;
    }).queryPermission({ mode: 'readwrite' });
    if (query === 'granted') return 'granted';
    return 'permission-required';
  } catch {
    return 'permission-required';
  }
}

export async function selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await (
      window as unknown as {
        showDirectoryPicker: (
          o?: { mode?: string }
        ) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker({ mode: 'readwrite' });
    cachedHandle = handle;
    await saveFSHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

async function getOrCreateSubDir(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

function buildSessionFileName(session: Session): string {
  const d = new Date(session.createdAt);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parts = [dateStr];
  if (session.metadata.grade) parts.push(session.metadata.grade);
  if (session.metadata.subject) parts.push(session.metadata.subject);
  return parts.join('_').replace(/[/\\:*?"<>|]/g, '_');
}

/**
 * セッションをファイルシステムに保存。
 *
 * - 'no-folder' / 'permission-required' / 'unsupported' は **失敗ではなく
 *   skip** として返す（呼び出し元で UI バッジを切り替える）。
 * - 実際の write エラー（容量不足や権限剥奪）は throw する。呼び出し側で
 *   catch して `saveStatus = 'error'` に倒す。
 */
export async function saveSessionToFS(session: Session): Promise<FSWriteStatus> {
  if (!isFileSystemAccessSupported()) return 'unsupported';

  const root = await getDirectoryHandle();
  if (!root) {
    const stored = await getFSHandle();
    return stored ? 'permission-required' : 'no-folder';
  }

  const sessionsDir = await getOrCreateSubDir(root, 'sessions');
  const fileName = buildSessionFileName(session) + '.json';

  // Save session JSON (without material binary data for the main JSON)
  const sessionForJson = {
    ...session,
    materials: session.materials.map((m) => ({
      ...m,
      data: null, // Binary data saved separately
    })),
  };

  const fileHandle = await sessionsDir.getFileHandle(fileName, { create: true });
  const writable = await (
    fileHandle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }
  ).createWritable();
  await writable.write(JSON.stringify(sessionForJson, null, 2));
  await writable.close();

  // Save materials in a subfolder
  if (session.materials.length > 0) {
    const matDirName = buildSessionFileName(session) + '_materials';
    const matDir = await getOrCreateSubDir(sessionsDir, matDirName);
    for (const mat of session.materials) {
      if (mat.data && mat.data.byteLength > 0) {
        const ext = mat.type === 'pdf' ? '.pdf' : '.png';
        const safeName = mat.name.replace(/[/\\:*?"<>|]/g, '_');
        const matFileHandle = await matDir.getFileHandle(safeName + ext, { create: true });
        const matWritable = await (
          matFileHandle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }
        ).createWritable();
        await matWritable.write(mat.data);
        await matWritable.close();
      }
    }
  }
  return 'saved';
}

export async function loadSessionsFromFS(): Promise<Session[]> {
  const root = await getDirectoryHandle();
  if (!root) return [];

  const sessions: Session[] = [];
  try {
    const sessionsDir = await root.getDirectoryHandle('sessions');
    for await (const entry of (sessionsDir as unknown as AsyncIterable<FileSystemHandle>)) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        try {
          const file = await (entry as unknown as { getFile: () => Promise<File> }).getFile();
          const text = await file.text();
          const session = JSON.parse(text) as Session;
          sessions.push(session);
        } catch {
          // skip corrupted files
        }
      }
    }
  } catch {
    // sessions dir doesn't exist yet
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveSettingsToFS(settings: AppSettings): Promise<FSWriteStatus> {
  if (!isFileSystemAccessSupported()) return 'unsupported';
  const root = await getDirectoryHandle();
  if (!root) {
    const stored = await getFSHandle();
    return stored ? 'permission-required' : 'no-folder';
  }
  const fileHandle = await root.getFileHandle('settings.json', { create: true });
  const writable = await (
    fileHandle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }
  ).createWritable();
  await writable.write(JSON.stringify(settings, null, 2));
  await writable.close();
  return 'saved';
}
