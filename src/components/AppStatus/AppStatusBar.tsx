import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useFeedbackOutbox } from '../../hooks/useFeedbackOutbox';

/** 新しい版があるかを確認する間隔（アプリを開きっぱなしにする iPad 向け） */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

interface Props {
  /** 更新で再読み込みする直前に呼ぶ（編集中のセッションを保存する） */
  onBeforeUpdate: () => Promise<void>;
}

/**
 * オフライン状態・アプリ更新・送信待ちフィードバックを知らせるバー。
 *
 * - Service Worker を登録し、一度開いたら電波なしでも起動できるようにする
 * - 新しい版が配信されたら「更新」ボタンを出す。押すと保存してから新しい版に
 *   切り替えて再読み込みする（古いキャッシュは Workbox が削除する）
 */
export const AppStatusBar: React.FC<Props> = ({ onBeforeUpdate }) => {
  const isOnline = useOnlineStatus();
  const pendingFeedback = useFeedbackOutbox();
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        if (!navigator.onLine || registration.installing) return;
        registration.update().catch(() => {
          /* オフライン等で確認できなくても次の機会に再確認する */
        });
      };
      setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      // ホーム画面から復帰したとき・オンラインに戻ったときにも確認する
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('online', check);
    },
    onRegisterError(error) {
      console.error('[pwa] service worker registration failed:', error);
    },
  });

  // 「オフラインで使えます」は数秒で消す
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await onBeforeUpdate();
    } catch (e) {
      console.error('[pwa] save before update failed:', e);
    }
    // 待機中の新しい Service Worker を有効化 → 自動で再読み込みされる
    await updateServiceWorker(true);
  };

  return (
    <>
      {!isOnline && (
        <div className="bg-gray-700 text-white px-4 py-1.5 text-xs flex items-center gap-2">
          <span>📴 オフラインで動作中</span>
          <span className="text-gray-300">記録・資料表示はそのまま使えます。データはこの端末に保存されます。</span>
          {pendingFeedback > 0 && (
            <span className="ml-auto text-gray-300">送信待ちのご意見: {pendingFeedback} 件</span>
          )}
        </div>
      )}

      {/* モーダル（z-50）より手前に出す */}
      {(needRefresh || offlineReady) && (
        <div className="fixed bottom-4 inset-x-4 z-[60] flex justify-center pointer-events-none">
          {needRefresh ? (
            <div className="pointer-events-auto bg-blue-600 text-white rounded-xl shadow-2xl px-4 py-3 text-sm flex items-center gap-3 flex-wrap max-w-2xl">
              <span className="flex-1 min-w-0">
                🔄 新しい版があります。更新すると記録を保存してから最新版に切り替わります。
              </span>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-60"
              >
                {updating ? '更新中…' : '今すぐ更新'}
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                disabled={updating}
                className="px-2 py-1.5 text-blue-100 hover:text-white text-sm"
                title="あとで（次回起動時にも再表示されます）"
              >
                あとで
              </button>
            </div>
          ) : (
            <div className="pointer-events-auto bg-green-50 border border-green-200 text-green-800 rounded-xl shadow-lg px-4 py-3 text-sm flex items-center gap-3 max-w-2xl">
              <span className="flex-1 min-w-0">
                ✅ オフラインで使える準備ができました（次回から電波なしでも起動できます）
              </span>
              <button onClick={() => setOfflineReady(false)} className="text-green-700 hover:text-green-900">
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
