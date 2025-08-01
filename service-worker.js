const CACHE_NAME = 'pomodoro-planner-v26'; // 캐시 버전 관리 (파일 변경 시 버전 변경)
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap', // 외부 폰트
    'https://www.soundjay.com/buttons/beep-07a.mp3', // 알람 소리
    // PWA 아이콘 경로 (필수: manifest.json에 정의된 경로와 일치해야 함)
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png'
    // 중요: 만약 스타일시트나 별도의 JavaScript 파일이 있다면 여기에 추가해야 합니다.
    // 현재 index.html에 <style>과 <script>가 내장되어 있다면 아래 파일들은 필요 없습니다.
    // 예: '/style.css', '/script.js' 
];

// 설치 이벤트: 캐시할 파일들을 미리 다운로드하여 캐시에 저장
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => { 
                console.log('[Service Worker] Installation complete, skipping waiting.');
                return self.skipWaiting(); 
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache files during install:', error);
            })
    );
});

// 활성화 이벤트: 이전 버전의 캐시를 삭제하여 새로운 캐시로 업데이트
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => { 
            console.log('[Service Worker] Activation complete, claiming clients.');
            return self.clients.claim(); 
        })
        .catch(error => {
            console.error('[Service Worker] Failed to activate:', error);
        })
    );
});

// 가져오기 (fetch) 이벤트: 네트워크 요청을 가로채어 캐시에서 응답하거나 네트워크에서 가져옴
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 캐시에 요청된 리소스가 있다면 캐시된 응답을 반환
                if (response) {
                    return response;
                }
                // 캐시에 없다면 네트워크에서 가져와서 캐시에 저장 후 반환
                return fetch(event.request)
                    .then(networkResponse => { // .then() 체이닝 시작
                        // 네트워크 응답이 유효하고 HTTP 200이면 캐시에 저장
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return networkResponse;
                    })
                    .catch(error => { // .catch() 체이닝
                        console.warn('[Service Worker] Fetch failed:', event.request.url, error);
                        // 오프라인일 때 또는 캐시/네트워크 모두 실패했을 때 대체 페이지 제공 (선택 사항)
                        // 예: 특정 URL 요청 실패 시 오프라인 페이지 반환
                        // if (event.request.mode === 'navigate') {
                        //      return caches.match('/offline.html');
                        // }
                        // 현재는 그냥 에러를 반환
                        throw error;
                    });
            })
    );
});

// 푸시 알림 (선택 사항) - 뽀모도로 알림을 위한 기본적인 예시
// 이 부분은 서버에서 푸시 알림을 보낼 때 작동합니다.
// 브라우저 자체의 Notification API와는 별개입니다.
self.addEventListener('push', event => {
    console.log('[Service Worker] Push received.');
    const data = event.data ? event.data.json() : { title: '뽀모도로 알림', body: '시간이 종료되었습니다.' };

    const title = data.title;
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png', // 알림 아이콘
        badge: '/icons/icon-72x72.png' // Android에서 사용되는 배지 아이콘 (작은 아이콘)
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 알림 클릭 이벤트 (선택 사항)
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click received.');
    event.notification.close(); // 알림 닫기

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // 이미 열려있는 앱 창이 있으면 그 창으로 포커스
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // 열려있는 창이 없으면 새 창을 열고 앱으로 이동
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});