// **바뀐 말을 눈으로 본다.** 유료 호출 없음(₩0).
// 「자료를 하나도 못 줬는데 화면이 아무 말도 안 한다」를 고쳤다. 고친 전/후를 같은 입력으로 나란히 찍는다.
//   node tools/show_material_notice_v1.mjs <나갈 파일.html>
import { writeFileSync } from 'node:fs';
import { materialNotice } from '../public/keyword-engine/assets/js/shared/material_notice_v1.js';
import { writingNotice } from '../public/keyword-engine/assets/js/shared/writing_task_v1.js';
const OLD = process.argv[3] || process.env.OLD_WRITING;
const { writingNotice: writingNoticeOld } = await import(`file://${OLD}`);

const SILENT = '<i style="color:#b91c1c">— 아무 말도 하지 않는다 —</i>';
const cases = [
  { what: '과학 실험 보고서 · 자료 0', task: { taskName: '용액의 pH 측정하기', taskDescription: '산과 염기의 pH를 측정한다' },
    gave: { papers: 0, books: 0, datasets: 0, tables: 0 } },
  { what: '과학 실험 보고서 · 논문 1 + 공개 자료 2 + 숫자 표 1', task: { taskName: '미세먼지 농도 비교하기', taskDescription: '지역별 미세먼지를 비교한다' },
    gave: { papers: 1, books: 0, datasets: 2, tables: 1 } },
  { what: '정보 자료 해석 보고서 · 책 1장만', task: { taskName: '데이터로 사회 문제 찾기', taskDescription: '공공 데이터를 분석한다' },
    gave: { papers: 0, books: 1, datasets: 0, tables: 0 } },
  { what: '국어 서평 · 자료 0 (이미 말하던 곳)', task: { taskName: '함께 읽고 싶은 책 서평 쓰기', taskDescription: '책을 읽고 서평을 쓴다' },
    gave: { papers: 0, books: 0 } },
  { what: '영어 에세이 · 논문 2', task: { taskName: 'Write an essay', taskDescription: '주제에 대해 에세이를 쓴다' },
    gave: { papers: 2, books: 0 } },
];
const rows = cases.map((one) => {
  const before = writingNoticeOld(one.task, one.gave) || SILENT;
  const after = writingNotice(one.task, one.gave) || materialNotice(one.gave);
  return { ...one, before, after, same: before === after };
});
const cell = (text) => `<td>${text}</td>`;
const html = `<!doctype html><meta charset="utf-8"><title>자료 안내 전/후</title>
<style>body{font:15px/1.7 system-ui,'Malgun Gothic';max-width:1100px;margin:32px auto;padding:0 16px;color:#111}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d4d4d8;padding:10px 12px;vertical-align:top}
th{background:#f4f4f5;text-align:left}td:first-child{white-space:nowrap;font-weight:600;background:#fafafa}
b{color:#1d4ed8}.same{color:#059669;font-weight:600}h1{font-size:22px}p{color:#3f3f46}</style>
<h1>「읽을 자료를 못 줬다」를 학생에게 말한다 — 화면 v296</h1>
<p>같은 과제·같은 자료 개수로 고치기 전 코드와 고친 코드를 나란히 돌렸다. 유료 호출 없음(₩0).</p>
<table><tr><th>상황</th><th>고치기 전</th><th>고친 뒤</th></tr>
${rows.map((r) => `<tr>${cell(r.what)}${cell(r.before)}${cell(r.after + (r.same ? ' <span class="same">(그대로)</span>' : ''))}</tr>`).join('\n')}
</table>
<p>위 세 줄이 새로 생긴 말이다. 아래 두 줄은 글쓰기 과제라서 이미 말하고 있었고, 말이 어긋나지 않게 <b>같은 문장을 한 파일에서 가져다 쓴다</b>.</p>`;
writeFileSync(process.argv[2], html, 'utf8');
for (const r of rows) console.log(`${r.same ? '=' : '+'} ${r.what}\n    전: ${r.before.replace(/<[^>]+>/g, '')}\n    후: ${r.after.replace(/<[^>]+>/g, '')}`);
