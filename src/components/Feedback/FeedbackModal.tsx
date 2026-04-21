import React, { useState } from 'react';

interface Props {
  onClose: () => void;
}

type Category = 'bug' | 'feature' | 'question' | 'other';

const CATEGORY_LABELS: Record<Category, string> = {
  bug: '🐞 不具合の報告',
  feature: '✨ 機能の要望',
  question: '❓ 質問',
  other: '💬 その他',
};

// GitHub Issues 用: owner/repo
const GITHUB_REPO = 'tky-och/lesson_observer';
// メール送信先（開発者の連絡先）。必要に応じて変更してください。
const FEEDBACK_EMAIL = '';

export const FeedbackModal: React.FC<Props> = ({ onClose }) => {
  const [category, setCategory] = useState<Category>('feature');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reporter, setReporter] = useState('');
  const [copied, setCopied] = useState(false);

  const buildBody = (): string => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const parts = [
      `### 内容`,
      body.trim() || '(記載なし)',
      '',
      reporter.trim() ? `### 報告者\n${reporter.trim()}` : '',
      '',
      '---',
      `- 種別: ${CATEGORY_LABELS[category]}`,
      `- 日時: ${new Date().toLocaleString('ja-JP')}`,
      `- UA: ${ua}`,
    ].filter(Boolean);
    return parts.join('\n');
  };

  const buildTitle = (): string => {
    const prefix = category === 'bug' ? '[Bug]' : category === 'feature' ? '[Feature]' : category === 'question' ? '[Question]' : '[Feedback]';
    return title.trim() ? `${prefix} ${title.trim()}` : `${prefix} 授業観察メモへのフィードバック`;
  };

  const openGitHubIssue = () => {
    const t = encodeURIComponent(buildTitle());
    const b = encodeURIComponent(buildBody());
    const labels = encodeURIComponent(
      category === 'bug' ? 'bug' : category === 'feature' ? 'enhancement' : category === 'question' ? 'question' : 'feedback'
    );
    const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${t}&body=${b}&labels=${labels}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMail = () => {
    if (!FEEDBACK_EMAIL) {
      alert('メール送信先が未設定です。GitHub での投稿をご利用ください。');
      return;
    }
    const t = encodeURIComponent(buildTitle());
    const b = encodeURIComponent(buildBody());
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${t}&body=${b}`;
  };

  const copyToClipboard = async () => {
    try {
      const text = `${buildTitle()}\n\n${buildBody()}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('クリップボードへのコピーに失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">💡 フィードバックを送る</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          <p className="text-gray-600 text-xs">
            現在開発中のアプリです。ご意見・不具合報告・機能要望などお気軽にお寄せください。
          </p>

          {/* カテゴリ */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              種別
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    category === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {CATEGORY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              タイトル（任意）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="短く要点を（例: 手書きが遅延する）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* 本文 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="具体的な内容・再現手順・期待する動作などをお書きください。"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
            />
          </div>

          {/* 報告者 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              お名前・連絡先（任意）
            </label>
            <input
              type="text"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              placeholder="例: 落 / ochi@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            送信方法を選択してください。GitHub に投稿いただけると一元管理できて助かりますが、難しい場合はクリップボードにコピーして他の手段でお知らせいただいても構いません。
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
          <button
            onClick={copyToClipboard}
            disabled={!body.trim()}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {copied ? '✅ コピーしました' : '📋 内容をコピー'}
          </button>
          {FEEDBACK_EMAIL && (
            <button
              onClick={openMail}
              disabled={!body.trim()}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
              ✉️ メールで送信
            </button>
          )}
          <button
            onClick={openGitHubIssue}
            disabled={!body.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            🚀 GitHub に投稿
          </button>
        </div>
      </div>
    </div>
  );
};
