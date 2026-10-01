// ---------------------------------------------------------------------------
// フィードバックの送信と、オフライン時の送信待ち（アウトボックス）
// ---------------------------------------------------------------------------
// オフラインで「送信」された場合や通信に失敗した場合は、この端末の
// localStorage に一時保存し、オンライン復帰時（online イベント・アプリ起動時）
// にまとめて送信する。送信に成功したものは端末から削除する。
// ---------------------------------------------------------------------------

// 送信先 (Formspree)。差し替え方法は FeedbackModal.tsx のコメントを参照。
export const FEEDBACK_ENDPOINT = 'https://formspree.io/f/mgorldra';

const STORAGE_KEY = 'lesson_observer.feedbackOutbox';
const CHANGE_EVENT = 'feedback-outbox-change';

export type FeedbackPayload = Record<string, string>;

interface QueuedFeedback {
  id: string;
  queuedAt: string;
  payload: FeedbackPayload;
}

function readQueue(): QueuedFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedFeedback[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedFeedback[]) {
  try {
    if (queue.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[feedback] outbox write failed:', e);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getOutboxCount(): number {
  return readQueue().length;
}

/** outbox 件数の変化を購読する（同一タブ内の変更 + 他タブの storage イベント） */
export function subscribeOutbox(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function queueFeedback(payload: FeedbackPayload) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeQueue([...readQueue(), { id, queuedAt: new Date().toISOString(), payload }]);
}

/** 通信できなかった（オフライン・DNS 失敗など）ことを表すエラー */
export class NetworkError extends Error {}

/** 1 件送信する。通信自体に失敗したら NetworkError、サーバーが拒否したら Error を投げる */
export async function postFeedback(payload: FeedbackPayload): Promise<void> {
  let res: Response;
  try {
    res = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : 'network error');
  }
  if (!res.ok) {
    // 5xx / 429 は一時的な障害として再送対象にする
    if (res.status >= 500 || res.status === 429) {
      throw new NetworkError(`サーバーエラー (${res.status})`);
    }
    throw new Error(`サーバーエラー (${res.status})`);
  }
}

let flushing = false;

/** 送信待ちをすべて送る。オフライン中・送信中は何もしない */
export async function flushOutbox(): Promise<void> {
  if (flushing || !navigator.onLine || readQueue().length === 0) return;
  flushing = true;
  try {
    for (const item of readQueue()) {
      try {
        await postFeedback(item.payload);
      } catch (e) {
        if (e instanceof NetworkError) break; // まだ繋がらない → 次の機会に再送
        console.error('[feedback] dropped (rejected by server):', e);
      }
      // 成功、またはサーバーに拒否された（再送しても通らない）ものは取り除く
      writeQueue(readQueue().filter((q) => q.id !== item.id));
    }
  } finally {
    flushing = false;
  }
}
