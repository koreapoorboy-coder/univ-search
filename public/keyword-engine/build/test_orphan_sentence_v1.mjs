// 문장을 지우면 **거기에 매달린 다음 문장**도 함께 정리해야 한다.
//
// 운영 검사 2026-09-22. 틀린 숫자가 든 문장이 지워진 뒤에 이런 문장이 남았다.
//   물리 결론: 「또한 이론값과의 차이가 네 조건에서 약 0.10 m/s²로 거의 일정하여…」
//   정보 분석: 「선택 정렬보다 일관되게 작은 배수가 관찰되었고, 증가 곡선이 완만했다.」
// 둘 다 앞 문장이 있어야 뜻이 서는 문장이다. 학생이 그대로 내면 글이 끊겨 보인다.
import assert from "node:assert/strict";
import { dropLeadingConnective, removeUnsupportedNumbers } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// O1: 절의 첫 문장이 이음말로 시작하면 그 말만 뗀다 — 문장은 살린다.
check(dropLeadingConnective("또한 이론값과의 차이가 거의 일정했다.") === "이론값과의 차이가 거의 일정했다.",
  "O1 절이 「또한」으로 시작하면 그 말만 뗀다");
check(dropLeadingConnective("그리고, 표본이 작았다.") === "표본이 작았다.", "O1 쉼표가 붙어도 뗀다");
check(dropLeadingConnective("이론값과의 차이가 거의 일정했다.") === "이론값과의 차이가 거의 일정했다.",
  "O1 멀쩡한 문장은 건드리지 않는다");
check(dropLeadingConnective("따라서 가설은 지지되었다.") === "따라서 가설은 지지되었다.",
  "O1 「따라서」로 시작하는 결론은 정상이라 그대로 둔다");

// O2: 앞 문장이 지워지면, 거기에 매달린 문장도 함께 지운다.
{
  const allowed = new Set(["12.4", "11.9"]);
  const body = "합병 정렬의 평균은 1000에서 3000으로 갈 때 3.39배 늘었다. 선택 정렬보다 일관되게 작은 배수가 관찰되었다. 측정값은 12.4와 11.9였다.";
  const out = removeUnsupportedNumbers(body, allowed);
  check(!out.body.includes("3.39"), "O2 학생 자료에 없는 숫자가 든 문장은 지워진다", out.body);
  check(!out.body.includes("선택 정렬보다"), "O2 그 문장에 매달린 다음 문장도 함께 지워진다", out.body);
  check(out.body.includes("12.4"), "O2 자기 힘으로 서는 문장은 남는다", out.body);
}

// O3: 앞 문장이 남아 있으면 비교 문장도 남는다 — 무턱대고 지우지 않는다.
{
  const allowed = new Set(["12.4", "11.9"]);
  const body = "측정값은 12.4와 11.9였다. 예상보다 차이가 작았다.";
  const out = removeUnsupportedNumbers(body, allowed);
  check(out.body.includes("예상보다"), "O3 앞 문장이 살아 있으면 비교 문장도 살아 있다", out.body);
}

console.log(`PASS orphan sentence: ${passed}/${passed}`);
