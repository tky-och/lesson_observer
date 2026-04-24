export function getClockTimestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatElapsed(startMs: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** タイムスタンプ挿入用の文字列。classStartTime があれば経過時刻、なければ時刻。
 *  classEndTime があれば終了時刻基準の経過時間を返す（授業終了後に挿入しても
 *  実時刻に戻らないようにするため）。 */
export function getTimestampForInsert(
  classStartTime: number | null,
  classEndTime: number | null = null
): string {
  if (classStartTime == null) return getClockTimestamp();
  const now = classEndTime ?? Date.now();
  return formatElapsed(classStartTime, now);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${formatDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatTimeOnly(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
