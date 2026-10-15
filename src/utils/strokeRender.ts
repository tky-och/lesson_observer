import getStroke, { type StrokeOptions } from 'perfect-freehand';
import type { Stroke } from '../types';

/**
 * 指・マウスで書いたストローク（と、pen フラグのない従来のストローク）用。
 * 既存の記録の見た目が変わらないよう、従来の値のままにしている。
 */
const SIMULATED_OPTIONS: StrokeOptions = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
};

/**
 * Apple Pencil など、実際の筆圧が取れるペンで書いたストローク用。
 * - 筆圧は端末の値をそのまま使う（速度からの擬似筆圧はかけない）
 * - streamline を弱めて、細かい字の折れや点が丸めつぶされないようにする
 * - thinning を弱めて、筆圧が軽いときに線が細くなりすぎないようにする
 */
const PEN_OPTIONS: StrokeOptions = {
  thinning: 0.3,
  smoothing: 0.5,
  streamline: 0.25,
  simulatePressure: false,
};

/**
 * ストロークの輪郭を Path2D にする。
 * 輪郭点を直線でつなぐと角が目立つので、隣り合う点の中点を通る
 * 二次ベジエ曲線でつなぐ（perfect-freehand 推奨の描き方）。
 *
 * @param last 書き終わったストロークなら true（終端を丸く閉じる）
 */
export function strokeToPath(stroke: Stroke, last = true): Path2D | null {
  const outline = getStroke(stroke.points, {
    ...(stroke.pen ? PEN_OPTIONS : SIMULATED_OPTIONS),
    size: stroke.size,
    last,
  });
  const n = outline.length;
  if (n < 2) return null;
  const path = new Path2D();
  path.moveTo((outline[0][0] + outline[1][0]) / 2, (outline[0][1] + outline[1][1]) / 2);
  for (let i = 1; i <= n; i++) {
    const [x0, y0] = outline[i % n];
    const [x1, y1] = outline[(i + 1) % n];
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  path.closePath();
  return path;
}

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, last = true): void {
  const path = strokeToPath(stroke, last);
  if (!path) return;
  ctx.fillStyle = stroke.color;
  ctx.fill(path);
}
