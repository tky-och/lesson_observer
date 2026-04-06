import React from 'react';
import type { QuickPhrase } from '../../types';

interface Props {
  phrases: QuickPhrase[];
  onInsert: (text: string) => void;
}

export const QuickPhrases: React.FC<Props> = ({ phrases, onInsert }) => {
  const sorted = [...phrases].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((phrase) => (
        <button
          key={phrase.id}
          onClick={() => onInsert(phrase.text + ' ')}
          className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-sm hover:bg-gray-100 transition-colors"
        >
          {phrase.text}
        </button>
      ))}
    </div>
  );
};
