// **검문소마다 검사가 있나.** ₩0.
//
// 2026-09-27~28 이틀에 찾은 흠 열넷이 **전부 검문소에서 나왔다** — 학생 글을 지우거나 남기는 장치들이다.
// 지우는 쪽으로 틀리면 학생이 쓴 분석이 사라지고, 남기는 쪽으로 틀리면 지어낸 말이 제출된다. 둘 다 크다.
// 그런데 어떤 검문소에 검사가 붙어 있고 어떤 것에 없는지 아무도 세어 보지 않았다.
//
// 검문소는 이름으로 알아본다 — remove…·drop…·soften…·filter…·scrub…·generalize…·tidy… 로 시작하는
// 내보낸 함수. 검사는 build/ 의 test_*.mjs 에서 그 이름을 부르는지로 본다.
//
//   node tools/audit_guard_tests_v1.mjs        — 검사 없는 검문소
//   node tools/audit_guard_tests_v1.mjs --all  — 전부, 검사 개수와 함께
import { readdirSync, readFileSync } from 'node:fs';

const here = (name) => new URL(name, import.meta.url);
const WORKER = here('../admission_worker_skeleton/');
const TESTS = here('../public/keyword-engine/build/');
const ALL = process.argv.includes('--all');

// 이 낱말로 시작하면 「학생 글을 손대는 장치」로 본다.
const 검문소이름 = /^(remove|drop|soften|filter|scrub|generalize|tidy|strip|sanitize)/;

const 파일 = readdirSync(WORKER).filter((one) => /\.mjs$/.test(one) && !/^live_|^immutable_/.test(one));
const 검문소 = [];
for (const file of 파일) {
  const text = readFileSync(new URL(file, WORKER), 'utf8');
  for (const m of text.matchAll(/^export function ([a-zA-Z_][\w]*)/gm)) {
    if (검문소이름.test(m[1])) 검문소.push({ file, name: m[1] });
  }
}

const 검사글 = readdirSync(TESTS).filter((one) => /^test_.*\.mjs$/.test(one))
  .map((one) => ({ file: one, text: readFileSync(new URL(one, TESTS), 'utf8') }));

const 줄 = 검문소.map((one) => {
  const 부른곳 = 검사글.filter((t) => new RegExp(`\\b${one.name}\\s*\\(`).test(t.text)).map((t) => t.file);
  return { ...one, 부른곳 };
});
const 없는것 = 줄.filter((one) => !one.부른곳.length);

console.log(`학생 글을 손대는 장치 ${줄.length}개 · 검사가 없는 것 ${없는것.length}개\n`);
for (const one of 없는것) console.log(`  ✗ ${one.file} · ${one.name}`);
if (ALL) {
  console.log('\n【검사가 있는 것】');
  for (const one of 줄.filter((x) => x.부른곳.length).sort((a, b) => b.부른곳.length - a.부른곳.length)) {
    console.log(`  ${String(one.부른곳.length).padStart(2)}개 파일 · ${one.name}  (${one.부른곳.map((f) => f.replace(/^test_|\.mjs$/g, '')).join(', ')})`);
  }
}
process.exitCode = 없는것.length ? 1 : 0;
