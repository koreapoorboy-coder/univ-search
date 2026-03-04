const CACHE_NAME = "univ-search-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./regular.html",
  "./rolling.html",
  "./rolling_school.html",
  "./rolling_total.html",
  "./assets/style.css",
  "./assets/regular.js",
  "./assets/rolling_school.js",
  "./assets/rolling_total.js",
  "./data/rolling_school_data.json",
  "./data/rolling_total_data.json",
  "./univ_search_data.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const cloned = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
