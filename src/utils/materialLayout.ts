/**
 * 資料（PDF）を画面に並べるときの寸法。
 *
 * 資料への書き込み（注釈）は、資料の表示領域の左上を原点とした CSS px で保存する。
 * PDF は全ページをこの幅で縦に積み、その全体に 1 枚の手書きキャンバスを重ねるので、
 * 注釈の座標は「1 ページ目の上端」が基準になる。
 * PDF に書き出すとき（pdfExport.ts）も同じ寸法でページの位置を計算するので、
 * 画面の並べ方を変えるときはここを直すこと。
 */

/** PDF 1 ページの表示幅（CSS px） */
export const PDF_VIEW_WIDTH = 800;

/** PDF のページとページの間隔（CSS px） */
export const PDF_PAGE_GAP = 8;

/**
 * 表示幅 PDF_VIEW_WIDTH で並べたときのページの高さ（CSS px）。
 * react-pdf はキャンバスの CSS 高さを Math.floor で切り捨てるので、それに合わせる。
 *
 * @param pageWidth  scale 1 のビューポートの幅
 * @param pageHeight scale 1 のビューポートの高さ
 */
export function pdfPageViewHeight(pageWidth: number, pageHeight: number): number {
  return Math.floor((PDF_VIEW_WIDTH * pageHeight) / pageWidth);
}
