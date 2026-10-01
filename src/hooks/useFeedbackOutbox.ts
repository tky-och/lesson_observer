import { useEffect, useSyncExternalStore } from 'react';
import { flushOutbox, getOutboxCount, subscribeOutbox } from '../utils/feedbackOutbox';

/** 送信待ちフィードバックの件数を返し、起動時とオンライン復帰時に自動送信する */
export function useFeedbackOutbox(): number {
  const count = useSyncExternalStore(subscribeOutbox, getOutboxCount, () => 0);

  useEffect(() => {
    const flush = () => void flushOutbox();
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  return count;
}
