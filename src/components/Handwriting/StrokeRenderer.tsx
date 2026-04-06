import React, { useMemo } from 'react';
import getStroke from 'perfect-freehand';
import type { Stroke } from '../../types';

interface Props {
  stroke: Stroke;
}

function getSvgPathFromStroke(points: number[][]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.01} ${y + 0.01}`;
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q ${x0} ${y0} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

export const StrokeRenderer: React.FC<Props> = React.memo(({ stroke }) => {
  const path = useMemo(() => {
    const outlinePoints = getStroke(stroke.points, {
      size: stroke.size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    return getSvgPathFromStroke(outlinePoints);
  }, [stroke]);

  return (
    <path
      d={path}
      fill={stroke.color}
      stroke="none"
    />
  );
});

StrokeRenderer.displayName = 'StrokeRenderer';
