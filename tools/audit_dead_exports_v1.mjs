// **내보냈는데 아무도 안 쓰는 함수를 찾는다.** ₩0.
//
// 2026-09-23 에 `guideBlock` 이 이 파일에 import 되어 있는데 **아무도 부르지 않는** 상태로 있었다.
// 그래서 화면의 「논문 길잡이」가 한 번도 뜨지 않았다. 코드는 멀쩡해 보이고 검사도 통과한다 —
// 아무도 안 부르니 아무 일도 안 일어난다. 이런 것은 세어 봐야 보인다.
//
// 세는 법: 내보낸 이름이 **자기 파일 밖에서** 쓰이는지 본다. 안 쓰이면
//   · 정말 죽은 것이거나
//   · 검사에서만 쓰는 것이거나(그건 괜찮다 — 검사도 쓰는 것이다)
//   · 앞으로 쓸 것을 미리 내보낸 것이다.
// 그래서 **죽었다고 단정하지 않는다.** 「검사에서도 안 쓰이고, 다른 파일에서도 안 쓰이는 것」만 내놓는다.
//
//   node tools/audit_dead_exports_v1.mjs        — 아무도 안 쓰는 것
//   node tools/audit_dead_exports_v1.mjs --test — 검사에서만 쓰는 것도 함께
import { readdirSync, readFileSync } from 'node:fs';

const here = (name) => new URL(name, import.meta.url);
const WORKER = here('../admission_worker_skeleton/');
const TESTS = here('../public/keyword-engine/build/');
const TOOLS = here('./');
const 검사도 = process.argv.includes('--test');

const 소스 = readdirSync(WORKER).filter((one) => /\.(mjs|js)$/.test(one) && !/^live_|^immutable_/.test(one))
  .map((one) => ({ file: one, text: readFileSync(new URL(one, WORKER), 'utf8'), where: '워커' }));
const 검사 = readdirSync(TESTS).filter((one) => /^test_.*\.mjs$/.test(one))
  .map((one) => ({ file: one, text: readFileSync(new URL(one, TESTS), 'utf8'), where: '검사' }));
const 도구 = readdirSync(TOOLS).filter((one) => /\.mjs$/.test(one))
  .map((one) => ({ file: one, text: readFileSync(new URL(one, TOOLS), 'utf8'), where: '도구' }));

const 쓰였나 = (name, 목록, 빼는파일) => 목록.some((one) => one.file !== 빼는파일
  && new RegExp(`\\b${name}\\b`).test(one.text));

// **자기 파일 안에서 쓰는 것도 쓰는 것이다.** 이걸 빼먹어서 wantsComparison 처럼 같은 파일에서 부르는
// 함수를 「죽었다」고 잡았다(2026-09-28 첫 시도). 정의한 줄 말고 한 번이라도 더 나오면 쓰는 것이다.
const 자기파일에서 = (name, text) => (text.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length > 1;

const 안쓰임 = [];
const 검사만 = [];
for (const { file, text } of 소스) {
  for (const m of text.matchAll(/^export (?:async )?function ([a-zA-Z_][\w]*)/gm)) {
    const name = m[1];
    const 워커에서 = 쓰였나(name, 소스, file);
    const 검사에서 = 쓰였나(name, 검사, null);
    const 도구에서 = 쓰였나(name, 도구, null);
    if (워커에서 || 자기파일에서(name, text)) continue;   // 다른 파일이 쓰거나 자기 파일에서 쓴다 — 살아 있다
    if (검사에서 || 도구에서) { 검사만.push({ file, name, 검사에서, 도구에서 }); continue; }
    안쓰임.push({ file, name });
  }
}

console.log(`아무도 안 쓰는 내보낸 함수 ${안쓰임.length}개`);
for (const one of 안쓰임) console.log(`  ✗ ${one.file} · ${one.name}`);
if (검사도) {
  console.log(`\n워커에서는 안 쓰고 검사·도구에서만 쓰는 것 ${검사만.length}개 (그 자체로는 흠이 아니다)`);
  for (const one of 검사만) console.log(`  · ${one.file} · ${one.name}  (${[one.검사에서 && '검사', one.도구에서 && '도구'].filter(Boolean).join('·')})`);
}
process.exitCode = 안쓰임.length ? 1 : 0;
