import type { Session, AppSettings } from '../types';
import { saveFSHandle, getFSHandle } from './useIndexedDB';

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

let cachedHandle: FileSystemDirectoryHandle | null = null;

export async function selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    cachedHandle = handle;
    await saveFSHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (cachedHandle) {
    try {
      await (cachedHandle as any).requestPermission({ mode: 'readwrite' });
      return cachedHandle;
    } catch {
      cachedHandle = null;
    }
  }
  const stored = await getFSHandle();
  if (stored) {
    try {
      const perm = await (stored as any).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        cachedHandle = stored;
        return stored;
      }
    } catch {
      // permission denied
    }
  }
  return null;
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

export async function saveSessionToFS(session: Session): Promise<void> {
  const root = await getDirectoryHandle();
  if (!root) return;
  const sessionsDir = await getOrCreateSubDir(root, 'sessions');

  const fileName = buildSessionFileName(session) + '.json';

  // Save session JSON (without material binary data for the main JSON)
  const sessionForJson = {
    ...session,
    materials: session.materials.map(m => ({
      ...m,
      data: null, // Binary data saved separately
    })),
  };

  const fileHandle = await sessionsDir.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(JSON.stringify(sessionForJson, null, 2));
  await writable.close();

  // Save materials in a subfolder
  if (session.materials.length > 0) {
    const matDirName = buildSessionFileName(session) + '_materials';
    const matDir = await getOrCreateSubDir(sessionsDir, matDirName);
    for (const mat of session.materials) {
      if (mat.data) {
        const ext = mat.type === 'pdf' ? '.pdf' : '.png';
        const safeName = mat.name.replace(/[/\\:*?"<>|]/g, '_');
        const matFileHandle = await matDir.getFileHandle(safeName + ext, { create: true });
        const matWritable = await (matFileHandle as any).createWritable();
        await matWritable.write(mat.data);
        await matWritable.close();
      }
    }
  }
}

export async function loadSessionsFromFS(): Promise<Session[]> {
  const root = await getDirectoryHandle();
  if (!root) return [];

  const sessions: Session[] = [];
  try {
    const sessionsDir = await root.getDirectoryHandle('sessions');
    for await (const entry of (sessionsDir as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        try {
          const file = await entry.getFile();
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

export async function saveSettingsToFS(settings: AppSettings): Promise<void> {
  const root = await getDirectoryHandle();
  if (!root) return;
  const fileHandle = await root.getFileHandle('settings.json', { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(JSON.stringify(settings, null, 2));
  await writable.close();
}
