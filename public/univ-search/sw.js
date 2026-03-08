const CACHE_NAME = "univ-search-v20260308-1";

// 자주 바뀌는 JS/JSON은 precache에서 제외해서 구버전 고착을 줄임
const APP_SHELL = [
  "./",
  "./index.html",
  "./regular.html",
  "./rolling.html",
  "./rolling_school.html",
  "./rolling_total.html",
  "./assets/style.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

async function safePrecache() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    APP_SHELL.map(async (path) => {
      try {
        const req = new Request(path, { cache: "no-store" });
        const res = await fetch(req, { cache: "no-store" });
        if (res && res.ok) {
          await cache.put(req, res.clone());
        }
      } catch (_e) {
        // 설치 실패 방지
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(safePrecache());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const pathname = url.pathname;

  const isPage = req.mode === "navigate";
  const isJson = pathname.endsWith(".json");
  const isJs = pathname.endsWith(".js");
  const isCss = pathname.endsWith(".css");
  const isManifest = pathname.endsWith(".webmanifest");
  const isIcon = /\/icons\/.*\.(png|jpg|jpeg|webp|svg)$/i.test(pathname);
  const isDataLike = isJson || isJs || isCss || isManifest || isIcon;

  event.respondWith(
    (async () => {
      try {
        // JS/JSON/CSS/manifest/icon은 항상 네트워크를 먼저 보고,
        // 브라우저 HTTP 캐시 영향도 줄이기 위해 no-store 사용
        const fetchOptions = isDataLike ? { cache: "no-store" } : undefined;
        const res = await fetch(req, fetchOptions);

        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, res.clone());
        }

        return res;
      } catch (_e) {
        const cached = await caches.match(req, { ignoreSearch: false });
        if (cached) return cached;

        if (isJson) {
          return new Response("{}", {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }

        if (isJs) {
          return new Response("/* offline */", {
            status: 503,
            headers: { "Content-Type": "application/javascript; charset=utf-8" }
          });
        }

        if (isPage) {
          return (await caches.match("./index.html")) || new Response("offline", { status: 503 });
        }

        return new Response("offline", { status: 503 });
      }
    })()
  );
});
