import { saveAs } from 'file-saver';

/** 書き出すファイル（中身とファイル名） */
export interface ExportFile {
  blob: Blob;
  filename: string;
}

/**
 * - shared: 共有シートで渡した（「ファイルに保存」などを選んだ）
 * - cancelled: 共有シートを閉じた
 * - downloaded: 共有できない環境なので従来どおりダウンロードした
 * - needs-tap: ファイル作成に時間がかかり、タップの直後とみなされず共有シートを開けなかった。
 *   もう一度タップしてから shareOrDownload を呼び直す
 */
export type ShareResult = 'shared' | 'cancelled' | 'downloaded' | 'needs-tap';

/** この端末・ブラウザで、ファイルを共有シートに渡せそうか（iPadOS の Safari・PWA など） */
export function supportsFileShare(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}

/**
 * 共有シート（Web Share API）でファイルを渡す。
 * iPad では共有シートの「ファイルに保存」から OneDrive などのフォルダを選べる。
 * 共有に対応していない環境（Mac の Chrome など）では従来どおりダウンロードする。
 */
export async function shareOrDownload({ blob, filename }: ExportFile): Promise<ShareResult> {
  // "text/plain;charset=utf-8" のような引数つきの MIME は共有の判定で弾かれることがあるので外す
  const type = blob.type.split(';')[0] || 'application/octet-stream';
  const file = new File([blob], filename, { type });

  if (supportsFileShare() && navigator.canShare({ files: [file] })) {
    try {
      // title や text を一緒に渡すと、「ファイルに保存」で余計なテキストファイルまで保存されるので渡さない
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'AbortError') return 'cancelled';
      if (name === 'NotAllowedError') return 'needs-tap';
      console.warn('[shareFile] share failed, falling back to download', e);
    }
  }
  saveAs(blob, filename);
  return 'downloaded';
}
