import React, { useEffect, useMemo } from 'react';

interface Props {
  data: ArrayBuffer;
  className?: string;
}

export const ImageViewer: React.FC<Props> = ({ data, className = '' }) => {
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
      className={`max-w-full h-auto ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
};
