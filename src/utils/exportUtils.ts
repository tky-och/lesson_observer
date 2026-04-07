import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Session } from '../types';
import { formatDate, formatDateTime, formatTimeOnly } from './timestampUtils';

export function exportJSON(session: Session): void {
  // Strip non-serializable ArrayBuffer material data from JSON-only export
  const safe = {
    ...session,
    materials: session.materials.map((m) => ({
      ...m,
      data: null as null,
      _dataOmitted: true,
    })),
  };
  const json = JSON.stringify(safe, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `${buildExportName(session)}.json`);
}

export function exportMarkdown(session: Session): void {
  const md = buildMarkdown(session);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${buildExportName(session)}.md`);
}

export function exportText(session: Session): void {
  const txt = buildPlainText(session);
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${buildExportName(session)}.txt`);
}

export async function exportImage(canvas: HTMLCanvasElement, session: Session): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (blob) {
    saveAs(blob, `${buildExportName(session)}_handwriting.png`);
  }
}

export async function exportZip(session: Session, canvasEl?: HTMLCanvasElement | null): Promise<void> {
  const zip = new JSZip();
  const folderName = buildExportName(session);
  const folder = zip.folder(folderName)!;

  // JSON — keep materials data for round-trip import
  folder.file('session.json', JSON.stringify(serializeSessionFull(session), null, 2));

  // Markdown
  folder.file('observation.md', buildMarkdown(session));

  // Plain text
  folder.file('observation.txt', buildPlainText(session));

  // Handwriting PNG
  if (canvasEl) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvasEl.toBlob(resolve, 'image/png')
    );
    if (blob) {
      folder.file('handwriting.png', blob);
    }
  }

  // Materials
  for (const mat of session.materials) {
    if (mat.data) {
      const ext = mat.type === 'pdf' ? '.pdf' : '.png';
      const safeName = mat.name.replace(/[/\\:*?"<>|]/g, '_');
      folder.file(`materials/${safeName}${ext}`, mat.data);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${folderName}.zip`);
}

/**
 * Serialize a full session including material binary data as base64.
 * Used for ZIP's session.json so import can reconstitute materials.
 */
function serializeSessionFull(session: Session) {
  return {
    ...session,
    materials: session.materials.map((m) => ({
      ...m,
      data: m.data ? arrayBufferToBase64(m.data) : null,
      _dataEncoding: 'base64' as const,
    })),
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function buildExportName(session: Session): string {
  const parts = [formatDate(session.createdAt).replace(/\//g, '-')];
  if (session.metadata.grade) parts.push(session.metadata.grade);
  if (session.metadata.subject) parts.push(session.metadata.subject);
  return parts.join('_').replace(/[/\\:*?"<>|]/g, '_');
}

function buildMarkdown(session: Session): string {
  const lines: string[] = [];
  lines.push('# 授業観察記録');
  lines.push('');
  lines.push('## メタ情報');
  lines.push(`- **タイトル**: ${session.metadata.title || '未設定'}`);
  lines.push(`- **観察者**: ${session.metadata.observer || '未設定'}`);
  lines.push(`- **教科**: ${session.metadata.subject || '未設定'}`);
  lines.push(`- **学年・クラス**: ${session.metadata.grade || '未設定'}`);
  lines.push(`- **授業者**: ${session.metadata.teacher || '未設定'}`);
  lines.push(`- **作成日時**: ${formatDateTime(session.createdAt)}`);
  if (session.metadata.classStartTime != null) {
    lines.push(`- **授業開始時刻**: ${formatTimeOnly(session.metadata.classStartTime)}`);
  }
  lines.push('');
  lines.push('## 観察メモ');
  lines.push('');
  lines.push(session.textNotes || '（記録なし）');
  lines.push('');
  if (session.freehandStrokes.length > 0) {
    lines.push('## 手書きメモ');
    lines.push(`（ストローク数: ${session.freehandStrokes.length}）`);
    lines.push('');
  }
  if (session.materials.length > 0) {
    lines.push('## 資料');
    for (const mat of session.materials) {
      const annotCount = Object.values(mat.annotations).flat().length;
      lines.push(`- ${mat.name} (${mat.type}) — アノテーション: ${annotCount}ストローク`);
    }
  }
  return lines.join('\n');
}

function buildPlainText(session: Session): string {
  const lines: string[] = [];
  lines.push('授業観察記録');
  lines.push('='.repeat(40));
  lines.push(`タイトル: ${session.metadata.title || '未設定'}`);
  lines.push(`観察者:   ${session.metadata.observer || '未設定'}`);
  lines.push(`教科:     ${session.metadata.subject || '未設定'}`);
  lines.push(`学年:     ${session.metadata.grade || '未設定'}`);
  lines.push(`授業者:   ${session.metadata.teacher || '未設定'}`);
  lines.push(`作成日時: ${formatDateTime(session.createdAt)}`);
  if (session.metadata.classStartTime != null) {
    lines.push(`授業開始: ${formatTimeOnly(session.metadata.classStartTime)}`);
  }
  lines.push('-'.repeat(40));
  lines.push('');
  lines.push(session.textNotes || '（記録なし）');
  lines.push('');
  if (session.freehandStrokes.length > 0) {
    lines.push('-'.repeat(40));
    lines.push(`手書きメモ: ${session.freehandStrokes.length} ストローク`);
  }
  if (session.materials.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('資料:');
    for (const mat of session.materials) {
      const annotCount = Object.values(mat.annotations).flat().length;
      lines.push(`  - ${mat.name} (${mat.type}) アノテーション: ${annotCount}`);
    }
  }
  return lines.join('\n');
}
