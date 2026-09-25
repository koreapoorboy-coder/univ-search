// 화면 코드의 **지문**을 찍어 둔다.
//
// 배포는 됐는데 학생 화면은 옛 코드를 받은 일이 있었다. index.html 의 ?v= 를 안 올려서
// Cloudflare 가 그 주소로 기억해 둔 옛 파일을 그대로 내보냈다.
//
// 그때 이미 "index.html 과 화면 코드가 같은 판을 가리키는가"를 보는 검사가 있었다. 그런데
// **그 검사는 통과했다.** 둘 다 v269 라고 적혀 있었기 때문이다 — 내용만 바뀌고 이름은 그대로였다.
// 그래서 내용의 지문을 함께 적어 둔다. 내용이 바뀌면 지문이 달라지고, 검사가 멈춘다.
//
//   node tools/stamp_screen_build.mjs          — 지금 지문과 적혀 있는 지문을 비교만 한다
//   node tools/stamp_screen_build.mjs --write  — 올린 판 이름과 지문을 다시 적는다
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const BRIDGE = here("../public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js");
const HTML = here("../public/keyword-engine/index.html");
const STAMP = here("../public/keyword-engine/screen_build.json");

const bridge = await readFile(BRIDGE, "utf8");
const html = await readFile(HTML, "utf8");
const sha = createHash("sha256").update(bridge.replace(/\r\n/g, "\n"), "utf8").digest("hex").slice(0, 16);
const asked = /mini_worker_generate_bridge_v32\.js\?v=([\w.-]+)/.exec(html)?.[1] || "";
const says = /const VERSION = "mini-worker-generate-bridge-([\w-]+)"/.exec(bridge)?.[1] || "";

let old = null;
try { old = JSON.parse(await readFile(STAMP, "utf8")); } catch (error) { old = null; }

console.log(`index.html 이 부르는 판 : ${asked}`);
console.log(`화면 코드가 말하는 판   : ${says}`);
console.log(`지금 내용의 지문        : ${sha}`);
console.log(`적혀 있던 지문          : ${old?.sha256 || "(없음)"}`);

// **화면 코드 하나만 보면 또 놓친다.** 2026-09-25 에 그랬다 — decision_flow_v1.js 에 「읽은 작품」 칸을
// 보이고 숨기는 코드를 넣었는데 그 파일의 ?v= 를 안 올렸다. 배포는 됐어도 학생 브라우저는 옛 파일을
// 쓰고, 새 칸은 나타나지 않는다. 그런데 검사는 통과했다 — 화면 코드(bridge) 하나만 보고 있었기 때문이다.
// 그래서 **index.html 이 ?v= 를 달고 부르는 우리 파일 전부**의 지문을 찍는다.
const TOKEN = /(?:src=|from )["\'][.\/]*((?:assets)\/[^"\'?]+)\?v=([A-Za-z0-9_.-]+)["\']/g;
const files = {};
for (const [, path, token] of html.matchAll(TOKEN)) {
  let body = null;
  try { body = await readFile(here(`../public/keyword-engine/${path}`), "utf8"); } catch { body = null; }
  if (body === null) { console.log(`  x 없는 파일을 부른다: ${path}`); process.exitCode = 1; continue; }
  files[path] = { version: token, sha256: createHash("sha256").update(body.replace(/\r\n/g, "\n"), "utf8").digest("hex").slice(0, 16) };
}
const stale = Object.entries(files).filter(([path, one]) => old?.files?.[path]
  && old.files[path].sha256 !== one.sha256 && old.files[path].version === one.version);
console.log(`\n?v= 를 달고 부르는 우리 파일 ${Object.keys(files).length}개`);
for (const [path, one] of Object.entries(files)) {
  const was = old?.files?.[path];
  const moved = was && was.sha256 !== one.sha256;
  const mark = !was ? "새로" : stale.some(([p]) => p === path) ? "고쳤는데 ?v= 그대로" : moved ? "고치고 올렸다" : "그대로";
  console.log(`  ${mark.padEnd(22)} ${path} (${one.version})`);
}

if (process.argv.includes("--write")) {
  await writeFile(STAMP, `${JSON.stringify({
    version: asked,
    sha256: sha,
    stamped_at: new Date().toISOString().slice(0, 10),
    files,
    note: "화면 코드를 고치면 index.html 의 ?v= 와 화면 코드의 VERSION 을 올리고 이 파일을 다시 찍는다. 안 올리면 학생이 옛 화면을 받는다.",
  }, null, 2)}\n`, "utf8");
  console.log("\n다시 찍었습니다.");
} else {
  for (const [path] of stale) console.log(`  x ${path} — 내용이 바뀌었는데 ?v= 가 그대로입니다.`);
  const same = old && old.sha256 === sha && old.version === asked && !stale.length;
  console.log(same ? "\n그대로입니다." : "\n달라졌습니다. ?v= 와 VERSION 을 올린 뒤 --write 로 다시 찍으세요.");
}
