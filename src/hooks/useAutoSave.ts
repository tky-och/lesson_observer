import { useEffect, useRef, useCallback } from 'react';
import type { Session } from '../types';
import { useStorage } from './useStorage';

/**
 * セッションを自動保存するフック。
 *
 * - 編集ごとに 2 秒のデバウンスで `saveSession` を呼ぶ。
 * - **重要**: 以下のタイミングでは pending な編集を必ず flush して、データ
 *   が消えるのを防ぐ。
 *     1. セッション切替（sessionId が変わった時）
 *     2. タブ非表示 / `pagehide` / unmount
 *
 * 旧実装は cleanup で `clearTimeout` するだけだったため、編集後 2 秒以内に
 * セッションを切り替えたりタブを閉じたりすると IndexedDB にも届かず消失
 * していた。
 */
export function useAutoSave(session: Session | null, onSaved?: (s: Session) => void) {
  const { saveSession } = useStorage();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** 現在 debounce 中の保存対象（最新の編集を反映するスナップショット） */
  const pendingRef = useRef<Session | null>(null);
  const onSavedRef = useRef<typeof onSaved>(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const target = pendingRef.current;
    if (!target) return;
    pendingRef.current = null;
    try {
      const saved = await saveSession(target);
      onSavedRef.current?.(saved);
    } catch (e) {
      console.error('[autosave] flush failed:', e);
    }
  }, [saveSession]);

  // 編集監視 — sessionId が変わったときは旧セッションを先に flush してから
  // 新セッションのデバウンスを開始する。
  useEffect(() => {
    if (!session) return;

    const prev = pendingRef.current;
    if (prev && prev.sessionId !== session.sessionId) {
      // 旧セッションの未保存分を fire-and-forget で IDB に書き出す
      const old = prev;
      pendingRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      saveSession(old)
        .then((s) => onSavedRef.current?.(s))
        .catch((e) => console.error('[autosave] switch flush failed:', e));
    }

    pendingRef.current = session;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flush();
    }, 2000);
  }, [session, saveSession, flush]);

  // unmount で flush
  useEffect(() => {
    return () => {
      // fire-and-forget — IDB トランザクションは tab close 直前でも完走する
      void flush();
    };
  }, [flush]);

  // タブ非表示 / pagehide で flush（モバイル含めてここが最終ラインになる）
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    };
    const onPageHide = () => {
      void flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flush]);
}
