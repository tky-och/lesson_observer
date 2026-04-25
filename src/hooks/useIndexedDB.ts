import { openDB, type IDBPDatabase } from 'idb';
import type { Session, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const DB_NAME = 'lesson-observer-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'sessionId' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('fsHandles')) {
        db.createObjectStore('fsHandles', { keyPath: 'key' });
      }
    },
  });
  return dbInstance;
}

/**
 * 旧バージョンで保存されたレコードに新しいフィールドが欠けている場合の補正。
 * 形が壊れた状態で App に渡らないようにここで吸収する。
 */
function normalizeSessionRead(raw: unknown): Session {
  const r = (raw ?? {}) as Partial<Session> & Record<string, unknown>;
  return {
    sessionId: (r.sessionId as string) ?? '',
    createdAt: (r.createdAt as number) ?? Date.now(),
    updatedAt: (r.updatedAt as number) ?? Date.now(),
    metadata: {
      title: r.metadata?.title ?? '',
      observer: r.metadata?.observer ?? '',
      subject: r.metadata?.subject ?? '',
      grade: r.metadata?.grade ?? '',
      teacher: r.metadata?.teacher ?? '',
      classStartTime:
        typeof r.metadata?.classStartTime === 'number'
          ? r.metadata.classStartTime
          : null,
      classEndTime:
        typeof r.metadata?.classEndTime === 'number'
          ? r.metadata.classEndTime
          : null,
    },
    textNotes: (r.textNotes as string) ?? '',
    freehandStrokes: Array.isArray(r.freehandStrokes) ? r.freehandStrokes : [],
    materials: Array.isArray(r.materials) ? r.materials : [],
    photos: Array.isArray(r.photos)
      ? (r.photos as unknown[]).filter((p): p is string => typeof p === 'string')
      : [],
  };
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
  const db = await getDB();
  const row = await db.get('sessions', sessionId);
  return row ? normalizeSessionRead(row) : undefined;
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  return sessions.map(normalizeSessionRead).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', sessionId);
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const row = await db.get('settings', 'appSettings');
  return row?.value ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'appSettings', value: settings });
}

export async function saveFSHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getDB();
  await db.put('fsHandles', { key: 'rootDir', handle });
}

export async function getFSHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB();
  const row = await db.get('fsHandles', 'rootDir');
  return row?.handle ?? null;
}
