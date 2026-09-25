// 화면 코드를 고쳤는데 학생 화면은 옛 코드를 받는 일 — 실제로 겪었다.
//
// 배포도 됐고 검사도 다 통과했는데, 「대학에서는 이렇게 이어져요」가 안 나왔다. 까닭은 캐시였다.
// index.html 이 `mini_worker_generate_bridge_v32.js?v=v269_major_pick` 을 달고 있었고,
// Cloudflare 는 그 주소(물음표 뒤까지 포함해서)로 옛 파일을 기억하고 있었다.
//
// 사람이 기억해서 올리는 것으로는 또 잊는다. 그래서 **두 곳이 같은지 검사가 본다.**
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const bridge = await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8");
const html = await readFile(here("../index.html"), "utf8");
const stamp = JSON.parse(await readFile(here("../screen_build.json"), "utf8"));

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const marked = /^\/\/ SCREEN_VERSION: (\S+)/m.exec(bridge)?.[1] || "";
check(Boolean(marked), "I1 화면 코드 맨 위에 SCREEN_VERSION 이 적혀 있다", marked);

// 파일마다 제 토큰을 쓴다. 우리가 볼 것은 **화면 코드 태그에 달린 토큰 하나**다.
const tag = /mini_worker_generate_bridge_v32\.js\?v=([A-Za-z0-9_.-]+)/.exec(html)?.[1] || "";
check(Boolean(tag), "I1 index.html 이 화면 코드에 ?v= 를 달고 있다", tag);
check(tag === marked,
  "I1 그 토큰이 화면 코드의 SCREEN_VERSION 과 같다 — 다르면 학생이 옛 화면을 받는다",
  `html=${tag} / js=${marked}`);

// 화면 코드와 index.html 이 같은 파일 이름을 가리키는지도 본다. 이름이 틀리면 404 가 나고,
// 그건 화면이 통째로 안 뜨는 일이라 바로 눈에 띈다 — 그래도 한 번 더 본다.
check(html.includes("mini_worker_generate_bridge_v32.js?v="), "I1 화면 코드가 index.html 에 걸려 있다");

// **여기가 진짜 막는 자리다.**
//
// "index.html 과 화면 코드가 같은 판을 가리키는가"를 보는 검사는 이미 있었다. 그런데 그 검사는
// 버그가 났을 때 **통과했다.** 둘 다 v269 라고 적혀 있었기 때문이다 — 내용만 바뀌고 이름은 그대로였다.
// 그래서 내용의 지문을 함께 본다. 화면 코드를 한 글자라도 고치면 지문이 달라지고 여기서 멈춘다.
const sha = createHash("sha256").update(bridge.replace(/\r\n/g, "\n"), "utf8").digest("hex").slice(0, 16);
check(stamp.sha256 === sha,
  "I2 화면 코드를 고쳤으면 ?v= 를 올리고 지문을 다시 찍어야 한다 (node tools/stamp_screen_build.mjs --write)",
  `적힌 지문=${stamp.sha256} / 지금=${sha}`);
check(stamp.version === tag, "I2 찍어 둔 판 이름이 index.html 과 같다", `${stamp.version} / ${tag}`);

// **화면 코드 하나만 보면 또 놓친다 — 2026-09-25 에 그랬다.**
// decision_flow_v1.js 에 「읽은 작품」 칸을 보이고 숨기는 코드를 넣었는데 그 파일의 ?v= 를 안 올렸다.
// 배포는 됐어도 학생 브라우저는 옛 파일을 쓰고, 새 칸은 나타나지 않는다. 이 검사는 통과했다 —
// 화면 코드(bridge) 하나만 보고 있었기 때문이다. 그래서 **?v= 를 달고 부르는 우리 파일 전부**를 본다.
const TOKEN = /(?:src=|from )["\'][.\/]*((?:assets)\/[^"\'?]+)\?v=([A-Za-z0-9_.-]+)["\']/g;
const seen = [];
for (const [, path, token] of html.matchAll(TOKEN)) {
  const body = await readFile(here(`../${path}`), "utf8");
  const one = createHash("sha256").update(body.replace(/\r\n/g, "\n"), "utf8").digest("hex").slice(0, 16);
  const was = stamp.files?.[path];
  check(Boolean(was), `I3 ${path} 의 지문이 찍혀 있다`, "node tools/stamp_screen_build.mjs --write");
  check(was?.sha256 === one,
    `I3 ${path} 을 고쳤으면 ?v= 를 올리고 다시 찍어야 한다 — 안 올리면 학생이 옛 파일을 받는다`,
    `적힌 지문=${was?.sha256} / 지금=${one}`);
  check(was?.version === token, `I3 ${path} 의 찍어 둔 토큰이 index.html 과 같다`, `${was?.version} / ${token}`);
  seen.push(path);
}
check(seen.length >= 10, "I3 ?v= 를 달고 부르는 파일을 전부 본다", `${seen.length}개`);

console.log(`\n${passed} checks passed`);
