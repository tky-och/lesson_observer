import { useEffect, useRef } from 'react';
import type { Session } from '../types';
import { useStorage } from './useStorage';

export function useAutoSave(session: Session | null, onSaved?: (s: Session) => void) {
  const { saveSession } = useStorage();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!session) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (sessionRef.current) {
        const saved = await saveSession(sessionRef.current);
        onSaved?.(saved);
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [session, saveSession, onSaved]);
}
