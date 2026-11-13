
// Network first, so a new GitHub Pages deploy shows up straight away;
// falls back to the saved copy when offline.

var C = 'chatima-2-v2';

var FILES = [
    './',
    'index.html',
    'app.js',
    'firestore-sync.js',
    'firestore-sync-extra.js',
    'firebase-config.js',
    'firebase-init.js',
    'manifest.webmanifest',
    'icon-192.png',
    'icon-512.png'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(C).then(function (c) {
            return c.addAll(FILES);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (k) {
            return Promise.all(
                k.filter(function (n) {
                    return n !== C;
                }).map(function (n) {
                    return caches.delete(n);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    var u = new URL(e.request.url);

    if (e.request.method !== 'GET' || u.origin !== self.location.origin) {
        return;
    }

    e.respondWith(
        fetch(e.request).then(function (res) {
            var cp = res.clone();
            caches.open(C).then(function (c) {
                c.put(e.request, cp);
            });
            return res;
        }).catch(function () {
            return caches.match(e.request).then(function (r) {
                return r || caches.match('index.html');
            });
        })
    );
});
