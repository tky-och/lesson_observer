import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // pdf.js は受け取った TypedArray の underlying ArrayBuffer を Worker に
  // 転送（transfer）してしまい、転送後は元の buffer が detach されて使えなく
  // なる。同じ MaterialTab を分割表示の左右両方に開いた場合、片方の Document
  // が転送した直後にもう一方の Document が同じ buffer を読みに行って
  // クラッシュする（"detached ArrayBuffer"）。
  // そのため、各インスタンスごとに buffer を必ずコピーして渡す。
  const fileData = useMemo(() => {
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data));
    return { data: copy };
  }, [data]);

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  // currentPage が変わったら該当ページまでスクロール
  useEffect(() => {
    if (currentPage > 0 && pageRefs.current.has(currentPage)) {
      pageRefs.current.get(currentPage)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);

  // スクロール位置から現在のページを更新
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    const containerTop = container.getBoundingClientRect().top;
    let closestPage = 1;
    let closestDist = Infinity;
    for (const [pageNum, el] of pageRefs.current.entries()) {
      const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
      if (dist < closestDist) {
        closestDist = dist;
        closestPage = pageNum;
      }
    }
    if (closestPage !== currentPage) {
      onPageChange(closestPage);
    }
  }, [numPages, currentPage, onPageChange]);

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el);
    } else {
      pageRefs.current.delete(pageNum);
    }
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full"
      >
        <Document
          file={fileData}
          onLoadSuccess={onLoadSuccess}
          loading={<div className="p-8 text-gray-400">PDF読み込み中...</div>}
          error={<div className="p-8 text-red-500">PDFの読み込みに失敗しました</div>}
        >
          {numPages > 0 &&
            Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => setPageRef(pageNum, el)}
                className="mb-2 relative"
              >
                <Page
                  pageNumber={pageNum}
                  width={800}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                {/* ページ番号ラベル */}
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {pageNum} / {numPages}
                </div>
              </div>
            ))}
        </Document>
      </div>
    </div>
  );
};
