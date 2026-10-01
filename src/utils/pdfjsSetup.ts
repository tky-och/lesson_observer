import { pdfjs } from 'react-pdf';
// worker はバンドルに含めて同一オリジンから配信する（CDN に頼るとオフラインで PDF が開けない）
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// vite.config.ts の pdfjsAssets プラグインが dist/pdfjs/ に出力するデータ。
// 日本語 PDF（埋め込みなしフォント）の表示には CMap が必要。
const ASSETS = `${import.meta.env.BASE_URL}pdfjs/`;

export const pdfjsOptions = {
  cMapUrl: `${ASSETS}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${ASSETS}standard_fonts/`,
  wasmUrl: `${ASSETS}wasm/`,
  iccUrl: `${ASSETS}iccs/`,
};

export { pdfjs };
