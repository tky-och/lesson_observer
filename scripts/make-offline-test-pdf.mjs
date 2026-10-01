// オフライン確認用の PDF を作る（docs/OFFLINE.md 参照）。
// フォントを埋め込まない日本語 PDF なので、表示には PDF.js の CMap
// （dist/pdfjs/cmaps/）が必要。オフラインで文字が出れば CMap もキャッシュ済み。
//
//   node scripts/make-offline-test-pdf.mjs   → カレントディレクトリに offline-test.pdf を出力
import { writeFileSync } from 'node:fs';

const text = 'オフライン表示テスト 授業観察';
const hex = Buffer.from(text, 'utf16le').swap16().toString('hex').toUpperCase();
const content = `BT /F1 32 Tf 50 700 Td <${hex}> Tj ET`;
const objs = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  '<< /Type /Font /Subtype /Type0 /BaseFont /KozMinPr6N-Regular /Encoding /UniJIS-UCS2-H /DescendantFonts [6 0 R] >>',
  '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /KozMinPr6N-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 6 >> /FontDescriptor 7 0 R >>',
  '<< /Type /FontDescriptor /FontName /KozMinPr6N-Regular /Flags 6 /FontBBox [0 -141 1000 859] /ItalicAngle 0 /Ascent 859 /Descent -141 /CapHeight 700 /StemV 80 >>',
];

let out = '%PDF-1.4\n';
const offsets = objs.map((o, i) => {
  const off = out.length;
  out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  return off;
});
const xref = out.length;
out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

writeFileSync('offline-test.pdf', out, 'latin1');
console.log('wrote offline-test.pdf');
