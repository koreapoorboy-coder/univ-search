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

if (process.argv.includes("--write")) {
  await writeFile(STAMP, `${JSON.stringify({
    version: asked,
    sha256: sha,
    stamped_at: new Date().toISOString().slice(0, 10),
    note: "화면 코드를 고치면 index.html 의 ?v= 와 화면 코드의 VERSION 을 올리고 이 파일을 다시 찍는다. 안 올리면 학생이 옛 화면을 받는다.",
  }, null, 2)}\n`, "utf8");
  console.log("\n다시 찍었습니다.");
} else {
  const same = old && old.sha256 === sha && old.version === asked;
  console.log(same ? "\n그대로입니다." : "\n달라졌습니다. ?v= 와 VERSION 을 올린 뒤 --write 로 다시 찍으세요.");
}
