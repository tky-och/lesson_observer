import React, { useRef, useCallback } from 'react';

interface Props {
  photos: string[];
  onAddPhoto: (dataUrl: string) => void;
  onRemovePhoto: (index: number) => void;
}

export const PhotoAttach: React.FC<Props> = ({ photos, onAddPhoto, onRemovePhoto }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onAddPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [onAddPhoto]
  );

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 transition-colors"
        >
          📷 撮影
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm hover:bg-purple-100 transition-colors"
        >
          🖼️ ファイル選択
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative group">
              <img
                src={photo}
                alt={`写真${i + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => onRemovePhoto(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
