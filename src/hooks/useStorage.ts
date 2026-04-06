import { useCallback, useRef } from 'react';
import type { Session, AppSettings } from '../types';
import * as idb from './useIndexedDB';
import * as fs from './useFileSystemAccess';

/**
 * Unified storage hook: FSAA primary, IndexedDB always used for speed.
 */
export function useStorage() {
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const saveSession = useCallback(async (session: Session) => {
    const updated = { ...session, updatedAt: Date.now() };
    // Always save to IndexedDB immediately
    await idb.saveSession(updated);
    // Debounced save to filesystem
    const key = `session_${session.sessionId}`;
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.current.set(
      key,
      setTimeout(async () => {
        await fs.saveSessionToFS(updated);
        debounceTimers.current.delete(key);
      }, 2000)
    );
    return updated;
  }, []);

  const loadSessions = useCallback(async (): Promise<Session[]> => {
    // Load from IndexedDB (always available)
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
    await fs.saveSettingsToFS(settings);
  }, []);

  return {
    saveSession,
    loadSessions,
    loadSession,
    deleteSession,
    loadSettings,
    saveSettings: saveSettingsData,
    isFileSystemSupported: fs.isFileSystemAccessSupported(),
    selectDirectory: fs.selectDirectory,
    getDirectoryHandle: fs.getDirectoryHandle,
  };
}
