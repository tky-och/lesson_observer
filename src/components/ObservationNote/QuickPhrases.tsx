import React from 'react';
import type { QuickPhrase } from '../../types';

interface Props {
  phrases: QuickPhrase[];
  onInsertLabel: (label: string) => void;
}

export const QuickPhrases: React.FC<Props> = ({ phrases, onInsertLabel }) => {
  const sorted = [...phrases].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((phrase) => (
        <button
          key={phrase.id}
          onClick={() => onInsertLabel(phrase.text)}
          className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
          title={`この行のラベルを「${phrase.text}」に設定`}
        >
          🏷️ {phrase.text}
        </button>
      ))}
    </div>
  );
};
