import React, { useEffect, useMemo } from 'react';

interface Props {
  data: ArrayBuffer;
  className?: string;
  /**
   * 表示幅（CSS px）。指定すると画面幅に関係なくこの幅で表示する。
   * 未指定なら元の大きさで、画面からはみ出す場合は画面幅に縮める。
   */
  width?: number;
}

export const ImageViewer: React.FC<Props> = ({ data, className = '', width }) => {
  // 念のためコピーした上で Blob 化する（同一の ArrayBuffer を共有する別ビュー
  // 側が detach される事故を避ける）。生成した Object URL はアンマウント時に
  // 必ず revoke する。
  const url = useMemo(() => {
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data));
    const blob = new Blob([copy]);
    return URL.createObjectURL(blob);
  }, [data]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <img
      src={url}
      alt="資料画像"
      className={`${width ? '' : 'max-w-full'} h-auto ${className}`}
      style={{ pointerEvents: 'none', ...(width ? { width, maxWidth: 'none' } : {}) }}
    />
  );
};
