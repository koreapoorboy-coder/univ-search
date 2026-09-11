import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");

const checks = [
  [worker.includes("reportSeedIndex: 'seed-bank/index/report_seed_index.json'"), "report example seed index is not loaded"],
  [worker.includes("function pickReportPatterns"), "report example patterns are not selected"],
  [worker.includes("공백 포함 2800~4200자"), "student report length instruction is missing"],
  [worker.includes("required: ['reportTitle', 'sections']"), "sectioned complete-report schema is not required"],
  [worker.includes("body: { type: 'string', minLength: 150 }"), "section body schema minimum is missing"],
  [worker.includes("function assembleReport"), "model sections are not assembled into one report text"],
  [worker.includes("function sectionWritingGuide"), "per-section writing plan is missing"],
  [worker.includes("같은 문장이나 수행평가 문구를 여러 절에 반복하지 않는다"), "repetition guard is missing"],
  [worker.includes("측정값이나 관찰 결과를 지어내지 않는다"), "fabricated-result guard is missing"],
  [worker.includes("여러 개를 얕게 나열하지 말고"), "single real-life case depth rule is missing"],
  [worker.includes("Km이 언제나 최적 pH에서 최소가 된다고 단정하지 않는다"), "enzyme misconception guard is missing"],
  [worker.includes("온도 상승은 활성화 에너지 자체를 바꾸지 않고"), "temperature and activation-energy correction is missing"],
  [worker.includes("확인되지 않은 저자, 책 제목, 연도"), "bibliography hallucination guard is missing"],
  [worker.includes("개인 경험, 관찰, 실험 수행을 입력에서 확인할 수 없으면"), "fabricated student experience guard is missing"],
  [worker.includes('"~에서 확인하였다", "~를 활용했다"처럼 실제로 한 것처럼 쓰지 않는다'), "references section still allows claimed source use"],
  [worker.includes("connectedBook: input.useBookInReport ? input.selectedBookTitle : '사용하지 않음'"), "book opt-out is not bound to the prompt"],
  [bridge.includes("rawData?.result?.reportTitle"), "worker report title is not rendered"],
  [bridge.includes("value.result?.report"), "worker report body is not extracted"],
  [bridge.includes('.replace(/^\\s*#{1,6}\\s*/gm, "")'), "markdown heading cleanup is missing"],
  [bridge.includes('data?.localFallback || /^seed-fallback'), "seed fallback is still eligible for complete-report display"],
  [bridge.includes('error.code = "COMPLETE_REPORT_GENERATION_FAILED"'), "fallback failure is not surfaced to the student"],
  [bridge.includes("acceptsStructuredWorkerReport"), "structured worker report is not accepted directly"],
];

for (const [passed, message] of checks) assert.equal(passed, true, message);
console.log(`PASS complete report worker contract: ${checks.length}/${checks.length}`);
