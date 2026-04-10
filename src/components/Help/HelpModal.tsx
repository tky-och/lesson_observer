import React from 'react';

interface Props {
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">使い方ガイド</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* 基本の流れ */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              基本の流れ
            </h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>
                <strong>セッションを作成</strong> —
                ヘッダーの「📂 セッション」から新規作成します。タイトルには当日の日付が自動で入るので、教科やクラスを追記してください（例: <code>20260410理科3A</code>）。
              </li>
              <li>
                <strong>授業を観察しながらメモ</strong> —
                「📝 観察メモ」タブでテキストを入力します。
              </li>
              <li>
                <strong>手書きメモ・資料への書き込み</strong> —
                「✍️ 手書き」タブや資料タブで自由に描画できます。
              </li>
              <li>
                <strong>エクスポート</strong> —
                ヘッダーの「📤 エクスポート」からPDF・テキスト・JSON等で保存できます。
              </li>
            </ol>
          </section>

          {/* 観察メモ */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              📝 観察メモ
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>タイムスタンプ</strong> —
                「授業開始」ボタンで授業の開始時刻を設定すると、「タイムスタンプ」ボタンで経過時間付きのタイムスタンプ（例: <code>[10:35] [+05:12]</code>）が挿入されます。
              </li>
              <li>
                <strong>クイックフレーズ</strong> —
                「教師の発問」「生徒の反応」などのラベルをワンタップで挿入できます。タイムスタンプの直後に挿入すると、その行のラベルになります。
              </li>
              <li>
                クイックフレーズは「⚙️ 設定」から追加・編集・並べ替えが可能です。
              </li>
            </ul>
          </section>

          {/* 手書き */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              ✍️ 手書きメモ
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>ペンの色（黒・赤・青・緑）と太さ（細・中・太）を切り替えられます。</li>
              <li>消しゴムモードでストロークを消去できます。</li>
              <li>元に戻す / やり直しボタンで操作を取り消せます。</li>
              <li>「描画モード」をオフにするとスクロール操作に切り替わります。</li>
            </ul>
          </section>

          {/* 資料 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              資料の追加・閲覧
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                タブバーの「＋ 資料追加」から画像（PNG / JPEG）やPDFファイルを追加できます。
              </li>
              <li>追加した資料はタブとして表示されます。タブ名はダブルクリックで変更できます。</li>
              <li>PDF資料は全ページを連続スクロールで閲覧できます。</li>
              <li>
                資料の上から手書きアノテーション（書き込み）が可能です。ツールバーの「描画モード」をオンにして描画してください。
              </li>
            </ul>
          </section>

          {/* 分割表示 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              分割表示
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                各タブの右側にある「⇉」ボタンをクリックすると、そのタブが右ペインに表示され、2つのタブを左右に並べて使えます。
              </li>
              <li>例: 左に「📝 観察メモ」、右に「📄 配布資料」を表示しながら記録できます。</li>
              <li>タブバー右端の「⇤ 分割解除」または右ペイン上部の「✕」で元に戻せます。</li>
            </ul>
          </section>

          {/* エクスポート */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              📤 エクスポート・インポート
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>PDF</strong> — メモ・手書き・資料をまとめてPDFに出力します。</li>
              <li><strong>テキスト / Markdown</strong> — 観察メモをプレーンテキストまたはMarkdownで保存します。</li>
              <li><strong>JSON</strong> — セッション全体を構造化データとして保存します。</li>
              <li><strong>ZIP</strong> — JSON + 資料ファイルをまとめてアーカイブします。</li>
              <li>JSON / ZIP / Markdown / テキストファイルからのインポート（復元）にも対応しています。</li>
            </ul>
          </section>

          {/* データ保存 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              💾 データの保存
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>データはブラウザ内（IndexedDB）に自動保存されます。</li>
              <li>
                「📂 セッション」画面の「📁 保存先フォルダを選択」で、PC上のフォルダにも自動バックアップできます。
              </li>
              <li>
                大切なデータは定期的にエクスポート（ZIP / JSON）でバックアップすることをおすすめします。
              </li>
            </ul>
          </section>

          {/* ヒント */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-200 pb-1">
              ヒント
            </h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>画面のテーマ（ライト / ダーク）はお使いのデバイスのシステム設定に自動で合わせます。</li>
              <li>タブレットやiPadでの使用に最適化されています。Apple Pencil での手書きにも対応しています。</li>
              <li>オフラインでも動作します（初回読み込み後）。</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
