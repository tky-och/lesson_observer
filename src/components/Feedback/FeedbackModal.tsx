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

// ---------------------------------------------------------------------------
// 送信先の設定
// ---------------------------------------------------------------------------
// サインイン不要でフィードバックを直接受け取るため、以下のいずれかを設定する:
//
//  1) Formspree (推奨): https://formspree.io/ で登録 (無料枠あり)
//       発行されたエンドポイント URL (例: https://formspree.io/f/abcdwxyz) を
//       下の FEEDBACK_ENDPOINT に貼り付ける
//
//  2) Formsubmit: https://formsubmit.co/ (登録不要だが初回メール認証が必要)
//       例: https://formsubmit.co/ajax/your@email.com
//
//  3) Google Apps Script: スプレッドシートに書き込む Web アプリをデプロイして
//       そのエンドポイント URL を貼り付ける
//
// 未設定の場合は GitHub Issues / コピー / mailto のフォールバック動作になる。
// ---------------------------------------------------------------------------
const FEEDBACK_ENDPOINT = ''; // 例: 'https://formspree.io/f/abcdwxyz'

// GitHub Issues フォールバック用 (サインインが必要)
const GITHUB_REPO = 'tky-och/lesson_observer';
// メール送信先 (設定すると mailto ボタンが有効化される)
const FEEDBACK_EMAIL = '';

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error';

export const FeedbackModal: React.FC<Props> = ({ onClose }) => {
  const [category, setCategory] = useState<Category>('feature');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reporter, setReporter] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
    const prefix =
      category === 'bug'
        ? '[Bug]'
        : category === 'feature'
          ? '[Feature]'
          : category === 'question'
            ? '[Question]'
            : '[Feedback]';
    return title.trim()
      ? `${prefix} ${title.trim()}`
      : `${prefix} 授業観察メモへのフィードバック`;
  };

  const submitDirectly = async () => {
    if (!FEEDBACK_ENDPOINT) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const payload = {
        category: CATEGORY_LABELS[category],
        title: buildTitle(),
        body: body.trim(),
        reporter: reporter.trim(),
        submittedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        _subject: buildTitle(), // Formspree/Formsubmit 用
      };
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`サーバーエラー (${res.status})`);
      }
      setStatus('success');
      // 成功後、内容をクリアする
      setBody('');
      setTitle('');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : '送信に失敗しました');
    }
  };

  const openGitHubIssue = () => {
    const t = encodeURIComponent(buildTitle());
    const b = encodeURIComponent(buildBody());
    const labels = encodeURIComponent(
      category === 'bug'
        ? 'bug'
        : category === 'feature'
          ? 'enhancement'
          : category === 'question'
            ? 'question'
            : 'feedback'
    );
    const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${t}&body=${b}&labels=${labels}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMail = () => {
    if (!FEEDBACK_EMAIL) return;
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

  const hasDirectEndpoint = FEEDBACK_ENDPOINT.length > 0;

  // 送信完了状態
  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-lg font-bold mb-2">送信しました</h2>
          <p className="text-sm text-gray-600 mb-4">
            フィードバックありがとうございます。内容を確認の上、改善に活用させていただきます。
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

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
            <label className="block text-xs font-medium text-gray-700 mb-1">種別</label>
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
              placeholder="例: 山田太郎 / yamada@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* エラー表示 */}
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
              送信に失敗しました: {errorMsg}
              <br />
              代替手段として「内容をコピー」をお試しください。
            </div>
          )}

          {!hasDirectEndpoint && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              送信方法を選択してください。GitHub にアカウントがない場合は「内容をコピー」でコピーして、別途メール等でお知らせください。
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
          <button
            onClick={copyToClipboard}
            disabled={!body.trim() || status === 'sending'}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {copied ? '✅ コピーしました' : '📋 内容をコピー'}
          </button>
          {FEEDBACK_EMAIL && (
            <button
              onClick={openMail}
              disabled={!body.trim() || status === 'sending'}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
              ✉️ メールで送信
            </button>
          )}
          {hasDirectEndpoint ? (
            <button
              onClick={submitDirectly}
              disabled={!body.trim() || status === 'sending'}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {status === 'sending' ? '送信中…' : '🚀 送信する'}
            </button>
          ) : (
            <button
              onClick={openGitHubIssue}
              disabled={!body.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
              title="GitHub アカウントが必要です"
            >
              🚀 GitHub に投稿
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
