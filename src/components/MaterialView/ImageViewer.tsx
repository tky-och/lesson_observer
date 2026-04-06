import React, { useMemo } from 'react';

interface Props {
  data: ArrayBuffer;
  className?: string;
}

export const ImageViewer: React.FC<Props> = ({ data, className = '' }) => {
  const url = useMemo(() => {
    const blob = new Blob([data]);
    return URL.createObjectURL(blob);
  }, [data]);

  return (
    <img
      src={url}
      alt="資料画像"
      className={`max-w-full h-auto ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
};
