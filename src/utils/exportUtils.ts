import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Session } from '../types';
import { formatDate } from './timestampUtils';

export function exportJSON(session: Session): void {
  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `${buildExportName(session)}.json`);
}

export function exportMarkdown(session: Session): void {
  const md = buildMarkdown(session);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${buildExportName(session)}.md`);
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

  // JSON
  folder.file('session.json', JSON.stringify(session, null, 2));

  // Markdown
  folder.file('observation.md', buildMarkdown(session));

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
  lines.push(`- **作成日時**: ${new Date(session.createdAt).toLocaleString('ja-JP')}`);
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
