/* ========================================
   酒ログ - sw.js (Service Worker)
   アプリの更新管理とオフライン対応
   バージョンを変更することで、全ユーザーの更新を促せます
   ======================================== */

const CACHE_NAME = 'sake-log-cache-v1.5.2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './sakerog_icon.png',
  './changelog.json'
];

// インストール時にファイルをキャッシュ（キャッシュを無視して常にサーバーから取得）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching assets from network');
      return Promise.all(
        ASSETS.map((url) => {
          return fetch(url, { cache: 'reload' }).then((response) => {
            if (!response.ok) throw new Error(`Fetch failed: ${url}`);
            return cache.put(url, response);
          });
        })
      );
    })
  );
});

// キャッシュのクリーンアップ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW: Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ（ネットワークまたはキャッシュから取得）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 更新のためのメッセージ受信
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
