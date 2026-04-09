import getStroke from 'perfect-freehand';
import type { Session, Stroke } from '../types';
import { formatDateTime, formatTimeOnly } from './timestampUtils';

/**
 * セッションを PDF としてエクスポートする。
 *
 * 方針:
 *  - メタ情報 + 観察メモ本文は HTML DOM を組み立てて html2canvas で画像化し、
 *    jsPDF の addImage で必要ならページ分割して貼り付ける。
 *    → 日本語フォント埋め込み不要で、ブラウザに見えているそのままが PDF になる。
 *  - 手書きストロークは stroke データから offscreen canvas に直接描画して
 *    画像として別ページに貼り付ける（バウンディングボックスに合わせてフィット）。
 *  - 画像資料はそのまま PDF にページとして追加。PDF 資料は先頭ページを画像化して貼付。
 *
 * 重たい依存 (jsPDF / html2canvas) は動的 import にしてコード分割する。
 */
export async function exportPdf(session: Session): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  let isFirstPage = true;

  const addPageIfNeeded = () => {
    if (isFirstPage) {
      isFirstPage = false;
    } else {
      pdf.addPage();
    }
  };

  // 1) メタ情報 + 観察メモを HTML に組み立てる
  const textContainer = buildTextContainer(session);
  document.body.appendChild(textContainer);
  try {
    const textCanvas = await html2canvas(textContainer, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    addPageIfNeeded();
    addCanvasAcrossPages(pdf, textCanvas, margin, pageW, pageH, /*alreadyOnPage*/ true);
  } finally {
    document.body.removeChild(textContainer);
  }

  // 2) 手書きメモ
  if (session.freehandStrokes.length > 0) {
    const handCanvas = renderStrokesToCanvas(session.freehandStrokes);
    if (handCanvas) {
      addPageIfNeeded();
      // タイトル
      addSectionTitle(pdf, '手書きメモ', margin, pageW);
      fitCanvasToPage(pdf, handCanvas, margin, pageW, pageH, /*topOffset*/ margin + 36);
    }
  }

  // 3) 資料
  for (const mat of session.materials) {
    if (!mat.data || mat.data.byteLength === 0) continue;

    if (mat.type === 'image') {
      try {
        const dataUrl = arrayBufferToDataUrl(mat.data, 'image/png');
        const img = await loadImage(dataUrl);
        addPageIfNeeded();
        addSectionTitle(pdf, `資料: ${mat.name}`, margin, pageW);
        const imgCanvas = imageToCanvas(img);
        fitCanvasToPage(pdf, imgCanvas, margin, pageW, pageH, margin + 36);

        // ページごとのアノテーション
        const annots = mat.annotations[1] || [];
        if (annots.length > 0) {
          const annotCanvas = renderStrokesToCanvasWithBg(annots, imgCanvas);
          if (annotCanvas) {
            addPageIfNeeded();
            addSectionTitle(pdf, `資料 + アノテーション: ${mat.name}`, margin, pageW);
            fitCanvasToPage(pdf, annotCanvas, margin, pageW, pageH, margin + 36);
          }
        }
      } catch (e) {
        console.warn('failed to embed image material', mat.name, e);
      }
    } else if (mat.type === 'pdf') {
      // 先頭ページだけレンダリング
      try {
        const pdfPageCanvas = await renderPdfFirstPageToCanvas(mat.data);
        if (pdfPageCanvas) {
          addPageIfNeeded();
          addSectionTitle(pdf, `資料(PDF): ${mat.name}`, margin, pageW);
          fitCanvasToPage(pdf, pdfPageCanvas, margin, pageW, pageH, margin + 36);
        }
      } catch (e) {
        console.warn('failed to render pdf material', mat.name, e);
      }
    }
  }

  pdf.save(`${buildExportName(session)}.pdf`);
}

// ---------------------------------------------------------------------------
// HTML 組み立て
// ---------------------------------------------------------------------------

function buildTextContainer(session: Session): HTMLDivElement {
  const div = document.createElement('div');
  // 画面外に配置して視認されないようにする
  div.style.position = 'fixed';
  div.style.left = '-10000px';
  div.style.top = '0';
  div.style.width = '760px';
  div.style.padding = '24px';
  div.style.background = '#ffffff';
  div.style.color = '#111827';
  div.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif';
  div.style.fontSize = '13px';
  div.style.lineHeight = '1.7';
  div.style.boxSizing = 'border-box';

  const m = session.metadata;
  const meta: Array<[string, string]> = [
    ['タイトル', m.title || '未設定'],
    ['観察者', m.observer || '未設定'],
    ['教科', m.subject || '未設定'],
    ['学年・クラス', m.grade || '未設定'],
    ['授業者', m.teacher || '未設定'],
    ['作成日時', formatDateTime(session.createdAt)],
  ];
  if (m.classStartTime != null) {
    meta.push(['授業開始時刻', formatTimeOnly(m.classStartTime)]);
  }

  const metaRows = meta
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:4px 10px 4px 0; color:#6b7280; white-space:nowrap; vertical-align:top;">${escapeHtml(
            k
          )}</td>
          <td style="padding:4px 0; vertical-align:top;">${escapeHtml(v)}</td>
        </tr>`
    )
    .join('');

  const notesHtml = escapeHtml(session.textNotes || '（記録なし）').replace(/\n/g, '<br/>');

  div.innerHTML = `
    <h1 style="font-size:20px; font-weight:700; margin:0 0 12px 0;">授業観察記録</h1>
    <table style="border-collapse:collapse; margin:0 0 16px 0; font-size:12px;">${metaRows}</table>
    <h2 style="font-size:14px; font-weight:700; margin:12px 0 8px 0; border-bottom:1px solid #e5e7eb; padding-bottom:4px;">観察メモ</h2>
    <div style="white-space:pre-wrap; word-wrap:break-word;">${notesHtml}</div>
  `;
  return div;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// 手書き描画
// ---------------------------------------------------------------------------

const STROKE_OPTIONS = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  last: true,
};

function drawStrokeSync(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const outline = getStroke(stroke.points, { ...STROKE_OPTIONS, size: stroke.size });
  if (!outline || outline.length < 2) return;
  ctx.fillStyle = stroke.color;
  const path = new Path2D();
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) path.lineTo(outline[i][0], outline[i][1]);
  path.closePath();
  ctx.fill(path);
}

function computeBBox(strokes: Stroke[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s.points) {
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  return { minX, minY, maxX, maxY };
}

function renderStrokesToCanvas(strokes: Stroke[]): HTMLCanvasElement | null {
  if (strokes.length === 0) return null;
  const bbox = computeBBox(strokes);
  const pad = 24;
  const w = Math.max(100, Math.ceil(bbox.maxX - bbox.minX + pad * 2));
  const h = Math.max(100, Math.ceil(bbox.maxY - bbox.minY + pad * 2));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.translate(-bbox.minX + pad, -bbox.minY + pad);
  for (const s of strokes) drawStrokeSync(ctx, s);
  return canvas;
}

/** 背景 canvas の上にストロークを重ねて画像化する */
function renderStrokesToCanvasWithBg(
  strokes: Stroke[],
  bgCanvas: HTMLCanvasElement
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = bgCanvas.width;
  canvas.height = bgCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bgCanvas, 0, 0);
  for (const s of strokes) drawStrokeSync(ctx, s);
  return canvas;
}

// ---------------------------------------------------------------------------
// 画像 / PDF 資料
// ---------------------------------------------------------------------------

function arrayBufferToDataUrl(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(img, 0, 0);
  return canvas;
}

async function renderPdfFirstPageToCanvas(data: ArrayBuffer): Promise<HTMLCanvasElement | null> {
  // react-pdf 経由で pdfjs にアクセス
  const { pdfjs } = await import('react-pdf');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

// ---------------------------------------------------------------------------
// PDF に canvas を載せるヘルパー
// ---------------------------------------------------------------------------

function addSectionTitle(
  pdf: import('jspdf').jsPDF,
  title: string,
  margin: number,
  pageW: number
) {
  pdf.setFontSize(12);
  pdf.setTextColor(80, 80, 80);
  // 英字だけ（日本語は画像化するので、ここはラベル英字にしない代わりに空のままでもOK）
  // ただし jsPDF 標準フォントは日本語非対応のため、タイトルは英字に寄せる
  const safe = title.replace(/[^\x20-\x7E]/g, '');
  if (safe.length > 0) pdf.text(safe, margin, margin + 16);
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, margin + 24, pageW - margin, margin + 24);
}

/** 画像をページ内に収まるように縮小して貼付 */
function fitCanvasToPage(
  pdf: import('jspdf').jsPDF,
  canvas: HTMLCanvasElement,
  margin: number,
  pageW: number,
  pageH: number,
  topOffset: number
) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - topOffset - margin;
  const ratio = Math.min(usableW / canvas.width, usableH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  const x = margin + (usableW - w) / 2;
  const y = topOffset;
  const dataUrl = canvas.toDataURL('image/png');
  pdf.addImage(dataUrl, 'PNG', x, y, w, h);
}

/** 幅に合わせて、縦方向はページをまたいで貼付 */
function addCanvasAcrossPages(
  pdf: import('jspdf').jsPDF,
  canvas: HTMLCanvasElement,
  margin: number,
  pageW: number,
  pageH: number,
  alreadyOnPage: boolean
) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;
  const scale = usableW / canvas.width;
  const scaledH = canvas.height * scale;

  if (scaledH <= usableH) {
    if (!alreadyOnPage) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, scaledH);
    return;
  }

  const srcPerPage = usableH / scale;
  let srcY = 0;
  let pageIdx = 0;
  while (srcY < canvas.height) {
    const remain = Math.min(srcPerPage, canvas.height - srcY);
    const pc = document.createElement('canvas');
    pc.width = canvas.width;
    pc.height = Math.ceil(remain);
    const ctx = pc.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pc.width, pc.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, remain, 0, 0, canvas.width, remain);
    if (pageIdx > 0 || !alreadyOnPage) pdf.addPage();
    pdf.addImage(pc.toDataURL('image/png'), 'PNG', margin, margin, usableW, remain * scale);
    srcY += srcPerPage;
    pageIdx++;
  }
}

// ---------------------------------------------------------------------------
// ファイル名
// ---------------------------------------------------------------------------

function buildExportName(session: Session): string {
  const d = new Date(session.createdAt);
  const parts = [
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  ];
  if (session.metadata.grade) parts.push(session.metadata.grade);
  if (session.metadata.subject) parts.push(session.metadata.subject);
  return parts.join('_').replace(/[/\\:*?"<>|]/g, '_');
}

