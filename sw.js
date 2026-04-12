const CACHE_NAME = 'contact-app-v1';
const ASSETS = [
  '/',
  '/yellowpage.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jschardet/3.0.0/jschardet.min.js',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css'
];

// 설치 시 리소스 캐싱
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// 오프라인 시 캐시된 내용 반환
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
