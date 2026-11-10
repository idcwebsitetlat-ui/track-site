/* Service worker: מאפשר התקנה כיישומון ופתיחה בלי רשת.
   קבצים מהאתר עצמו: קודם מהרשת (כדי שעדכונים יופיעו מיד), ואם אין רשת, מהעותק השמור.
   פניות לשרת (Apps Script) ולגופנים לא עוברות כאן בכלל. */
var CACHE = "track-v1";

self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true });
  }));
});
