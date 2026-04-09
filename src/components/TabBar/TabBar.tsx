import React, { useState, useRef, useCallback } from 'react';
import type { MaterialTab } from '../../types';

interface Props {
  activeTab: string; // 'observation' | 'handwriting' | material id
  secondaryTab: string | null;
  materials: MaterialTab[];
  onTabChange: (tabId: string) => void;
  onOpenInSecondary: (tabId: string) => void;
  onCloseSecondary: () => void;
  onAddMaterial: (file: File) => void;
  onRenameMaterial: (id: string, name: string) => void;
  onDeleteMaterial: (id: string) => void;
}

export const TabBar: React.FC<Props> = ({
  activeTab,
  secondaryTab,
  materials,
  onTabChange,
  onOpenInSecondary,
  onCloseSecondary,
  onAddMaterial,
  onRenameMaterial,
  onDeleteMaterial,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onAddMaterial(file);
      e.target.value = '';
    },
    [onAddMaterial]
  );

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const finishEditing = () => {
    if (editingId && editName.trim()) {
      onRenameMaterial(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('この資料タブを削除しますか？')) {
      onDeleteMaterial(id);
    }
  };

  return (
    <div className="flex items-center bg-gray-50 border-b border-gray-200 overflow-x-auto">
      {/* Observation tab (always first) */}
      <div
        className={`flex items-center border-b-2 transition-colors ${
          activeTab === 'observation'
            ? 'border-blue-600 bg-white'
            : secondaryTab === 'observation'
              ? 'border-blue-300 bg-blue-50'
              : 'border-transparent hover:bg-gray-100'
        }`}
      >
        <button
          onClick={() => onTabChange('observation')}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === 'observation' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 観察メモ
          {secondaryTab === 'observation' && (
            <span className="ml-1 text-[10px] text-blue-500">[右]</span>
          )}
        </button>
        <button
          onClick={() => onOpenInSecondary('observation')}
          className="px-1 py-1 text-gray-400 hover:text-blue-600 text-xs"
          title="右側に並べて表示"
        >
          ⇉
        </button>
      </div>

      {/* Handwriting tab (always second) */}
      <div
        className={`flex items-center border-b-2 transition-colors ${
          activeTab === 'handwriting'
            ? 'border-blue-600 bg-white'
            : secondaryTab === 'handwriting'
              ? 'border-blue-300 bg-blue-50'
              : 'border-transparent hover:bg-gray-100'
        }`}
      >
        <button
          onClick={() => onTabChange('handwriting')}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === 'handwriting' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ✍️ 手書き
          {secondaryTab === 'handwriting' && (
            <span className="ml-1 text-[10px] text-blue-500">[右]</span>
          )}
        </button>
        <button
          onClick={() => onOpenInSecondary('handwriting')}
          className="px-1 py-1 text-gray-400 hover:text-blue-600 text-xs"
          title="右側に並べて表示"
        >
          ⇉
        </button>
      </div>

      {/* Material tabs */}
      {materials.map((mat) => (
        <div
          key={mat.id}
          className={`flex items-center border-b-2 transition-colors ${
            activeTab === mat.id
              ? 'border-blue-600 bg-white'
              : secondaryTab === mat.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-transparent hover:bg-gray-100'
          }`}
        >
          <button
            onClick={() => onTabChange(mat.id)}
            onDoubleClick={() => startEditing(mat.id, mat.name)}
            className={`px-4 py-3 text-sm whitespace-nowrap ${
              activeTab === mat.id ? 'text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            {editingId === mat.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishEditing();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-24 px-1 py-0 border border-blue-300 rounded text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {mat.type === 'pdf' ? '📄' : '🖼️'} {mat.name}
                {secondaryTab === mat.id && (
                  <span className="ml-1 text-[10px] text-blue-500">[右]</span>
                )}
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInSecondary(mat.id);
            }}
            className="px-1 py-1 text-gray-400 hover:text-blue-600 text-xs"
            title="右側に並べて表示"
          >
            ⇉
          </button>
          <button
            onClick={(e) => handleDeleteClick(e, mat.id)}
            className="px-1 py-1 text-gray-400 hover:text-red-500 text-xs"
            title="タブを削除"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add tab button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-3 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
        title="資料を追加"
      >
        ＋ 資料追加
      </button>

      {/* Spacer + close split button */}
      <div className="flex-1" />
      {secondaryTab && (
        <button
          onClick={onCloseSecondary}
          className="px-3 py-3 text-sm text-gray-500 hover:text-red-600 hover:bg-gray-100 transition-colors whitespace-nowrap border-l border-gray-200"
          title="分割表示を解除"
        >
          ⇤ 分割解除
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
