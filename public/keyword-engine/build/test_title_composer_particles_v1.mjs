// Title composer: a cut task sentence must not leave a dangling connector or particle
// ("…활용 방안을 통한:", "…방안을의").
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../assets/js/title_composer_v2.js", import.meta.url), "utf8"));
const { compose } = globalThis.MiniTitleComposerV2;
const title = (taskDescription, extra = {}) => compose({
  subject: "통합과학1",
  taskDescription,
  task_interpreter: { fallbackActive: true },
  subjectConcepts: ["효소"],
  conceptDetail: { evidenceScope: "guide", matchedTerms: ["효소"] },
  ...extra,
}).title;

let passed = 0;
const check = (ok, label, detail) => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}  [${detail}]`); passed++; };

const enzyme = title("효소가 실생활에 쓰이는 현상을 찾아 활용 방안을 통한 탐구보고서 작성하기");
check(!/통한\s*:/.test(enzyme) && !/[을를]의/.test(enzyme), "enzyme task title has no dangling '…통한:' or '…을의'", enzyme);

const objectParticle = title("효소의 활용 방안을 탐구하기");
check(!/[을를]의/.test(objectParticle) && !/[을를]\s*:/.test(objectParticle), "'…방안을 탐구하기' title has no '을의' or '을:'", objectParticle);

const plain = title("화학 반응 속도에 영향을 주는 요인 조사하기", { subjectConcepts: ["반응 속도"], conceptDetail: { evidenceScope: "guide", matchedTerms: ["반응 속도"] } });
check(plain.length >= 10 && plain.includes("화학 반응 속도"), "an ordinary task still yields a title with its object", plain);

console.log(`PASS title composer particles: ${passed}/${passed}`);
