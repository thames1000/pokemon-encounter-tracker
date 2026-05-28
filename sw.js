// Service worker — caches the app shell, and shiny sprites on demand so the
// counter keeps working offline mid-hunt.
const CACHE = "shiny-counter-v1";
const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/pokemon_names.json",
  "./default_hunt_log.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Sprites: cache-first, store on first view so they're available offline later.
  if (url.pathname.includes("/shinies/")) {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (resp) {
            if (resp && resp.status === 200) cache.put(req, resp.clone());
            return resp;
          }).catch(function () { return hit; });
        });
      })
    );
    return;
  }

  // App shell: cache-first with network fallback.
  event.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (resp) {
        if (resp && resp.status === 200 && url.origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return resp;
      }).catch(function () {
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
