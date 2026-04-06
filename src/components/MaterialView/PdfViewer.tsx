import React, { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  data: ArrayBuffer;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const PdfViewer: React.FC<Props> = ({ data, currentPage, onPageChange }) => {
  const [numPages, setNumPages] = useState(0);

  const fileData = useMemo(() => {
    return { data: new Uint8Array(data) };
  }, [data]);

  return (
    <div className="flex flex-col items-center">
      <Document
        file={fileData}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={<div className="p-8 text-gray-400">PDF読み込み中...</div>}
        error={<div className="p-8 text-red-500">PDFの読み込みに失敗しました</div>}
      >
        <Page
          pageNumber={currentPage}
          width={800}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>

      {numPages > 1 && (
        <div className="flex items-center gap-4 py-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            ◀ 前へ
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            次へ ▶
          </button>
        </div>
      )}
    </div>
  );
};
