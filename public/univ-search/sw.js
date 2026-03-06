const CACHE_NAME = "univ-search-v3"; // ✅ 버전 올리기(필수)

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

  // ✅ 생기부 관련 JSON도 캐시에 포함(권장)
  "./school_record_detail.json",
  "./school_record_flags.json",
  "./school_record_reading.json",
  "./school_record_summary.json",
  "./school_record_raw.json",

  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// ✅ addAll은 파일 하나라도 404면 install 실패 가능 → 안전 precache로 변경
async function safePrecache() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    APP_SHELL.map(async (path) => {
      try {
        const req = new Request(path, { cache: "no-store" });
        const res = await fetch(req);

        // ✅ 200대만 캐시 (404/HTML 캐싱 방지)
        if (res && res.ok) {
          await cache.put(req, res.clone());
        }
      } catch (_e) {
        // 설치 실패 방지: 조용히 무시
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
      await Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isJson = url.pathname.endsWith(".json");

  event.respondWith(
    (async () => {
      try {
        // 네트워크 우선
        const res = await fetch(req);

        // ✅ 200대만 캐시
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, res.clone());
        }

        return res;
      } catch (_e) {
        // 네트워크 실패 시 캐시 사용
        const cached = await caches.match(req);
        if (cached) return cached;

        // ✅ JSON은 index.html로 fallback 금지 (json() 파싱 오류 방지)
        if (isJson) {
          return new Response("{}", {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }

        // 페이지는 index로 fallback
        return (await caches.match("./index.html")) || new Response("offline", { status: 503 });
      }
    })()
  );
});
