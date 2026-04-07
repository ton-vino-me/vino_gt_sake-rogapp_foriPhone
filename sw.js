/* ========================================
   酒ログ - sw.js (Service Worker)
   アプリの更新管理とオフライン対応
   バージョンを変更することで、全ユーザーの更新を促せます
   ======================================== */

const CACHE_NAME = 'sake-log-cache-v1.0.1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './sakerog_icon.png'
];

// インストール時にファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // 新しいSWをすぐに有効化
});

// 古いキャッシュを削除
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
    })
  );
  self.clients.claim();
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
