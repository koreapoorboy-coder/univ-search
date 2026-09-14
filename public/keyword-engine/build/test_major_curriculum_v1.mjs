// 대학 전공 과목 ↔ 고교 개념. The fault this exists to prevent is "전기전자 지망이니까 저항 실험" — a link made
// from a department's name and whatever it brings to mind. A link only counts here when two real things share a
// word: a university's published course, and one of our 162 고교 개념.
//
// Korean compounds make that harder than it sounds. 면역학 contains 역학, 유기화학 contains 기화, and neither is
// about the course. Most of what is checked below is the engine refusing those.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { curriculumPromptLines, linkCurriculum, matchConceptsForCourse, subjectsBehindMajor } from "../../../admission_worker_skeleton/major_curriculum_v1.mjs";

const index = JSON.parse(readFileSync(new URL("../seed/engine-index/concept_term_index.v1.json", import.meta.url), "utf8"));

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const hit = (course) => matchConceptsForCourse(course, index, 2).map((item) => `${item.subject}/${item.concept}`).join(" | ");

// M1: the index carries what the matching needs.
check(Object.keys(index.concepts).length === 162, "M1 all 162 concepts are indexed", String(Object.keys(index.concepts).length));
check(Object.keys(index.terms).length > 3000, "M1 the words that make them up are indexed", String(Object.keys(index.terms).length));
check(Object.keys(index.subjectTerms).length >= 20, "M1 subject names are indexed separately", String(Object.keys(index.subjectTerms).length));
check(Object.values(index.concepts).every((c) => c.subject && c.concept && c.terms.length), "M1 every concept knows its subject and its words");

// M2: the links that have a right answer.
check(/전자기/.test(hit("전자기학")), "M2 전자기학 lands on 전자기 유도", hit("전자기학"));
check(/물리|전자기/.test(hit("전자회로")), "M2 전자회로 lands on the physics of electricity", hit("전자회로"));
check(/열과 에너지|에너지와 열/.test(hit("열역학")), "M2 열역학 lands on heat and energy", hit("열역학"));
check(/유전/.test(hit("유전학")), "M2 유전학 lands on genes", hit("유전학"));
check(/면역/.test(hit("면역학")), "M2 면역학 lands on immunity", hit("면역학"));
check(/확률과 통계/.test(hit("경영통계")), "M2 경영통계 reaches 확률과 통계 through the subject's own name", hit("경영통계"));
check(/확률과 통계/.test(hit("응용통계학")), "M2 so does 응용통계학, where the word sits in the middle", hit("응용통계학"));
check(/탄소/.test(hit("유기화학")), "M2 유기화학 lands on carbon compounds", hit("유기화학"));

// M3: the coincidences. Korean compounds are full of them, and a wrong link is worse than none.
check(!/역학과 에너지|시공간/.test(hit("면역학")), "M3 면역학 is not about 역학 — the back of the word loses to the front", hit("면역학"));
check(!/화학 반응과 열/.test(hit("유기화학")), "M3 유기화학 is not about 기화", hit("유기화학"));
check(hit("인지심리학") === "", "M3 인지심리학 does not land on 인지질", hit("인지심리학"));
check(hit("발달심리학") === "", "M3 발달심리학 does not land on 생활 공간 변화 on the strength of 발달", hit("발달심리학"));
check(hit("해부학") === "" && hit("간호윤리") === "", "M3 a course with no concept behind it gets nothing, not a guess");
check(matchConceptsForCourse("", index).length === 0 && matchConceptsForCourse("경영통계", null).length === 0, "M3 empty input and no index both return nothing");

// M4: a whole curriculum, with the two columns kept apart.
{
  const curriculum = JSON.parse(readFileSync(new URL("../data/majors/curriculum/경영학과.json", import.meta.url), "utf8"));
  check(curriculum.sources.length >= 2, "M4 the curriculum carries where it came from", String(curriculum.sources.length));
  const linked = linkCurriculum(curriculum, index);
  check(linked.courseCount >= 25 && linked.years.length === 4, "M4 every year and course survives the link", `${linked.years.length}년 ${linked.courseCount}과목`);
  check(linked.linkedCount > 0 && linked.linkedCount < linked.courseCount,
    "M4 some courses link and some do not — a curriculum that linked everything would be guessing", `${linked.linkedCount}/${linked.courseCount}`);
  check(linked.years.flatMap((y) => y.courses).every((c) => c.judged === true), "M4 every high-school link is marked as our reading, not a cited fact");
  const behind = subjectsBehindMajor(linked);
  check(behind.some((s) => s.subject === "확률과 통계") && behind.some((s) => s.subject === "정보"),
    "M4 경영학 comes out leaning on 확률과 통계 and 정보, counted rather than guessed", behind.map((s) => `${s.subject} ${s.count}`).join(","));
  const lines = curriculumPromptLines(linked).join("\n");
  check(/응용통계학/.test(lines) && /위에 선다/.test(lines), "M4 the prompt names the real course and what it stands on");
  check(/대학이 공개한 교육과정이다/.test(lines), "M4 and says where the list came from");
  check(/학과 이름을 본문에 반복하지 않는다/.test(lines), "M4 the major is a lens, not a word to repeat");
  check(/닿지 않으면 전공 이야기를 꺼내지 않고/.test(lines), "M4 and a course that links to nothing stays out of the report");
  check(curriculumPromptLines(null).length === 0, "M4 no curriculum, no lines");
}

console.log(`PASS major curriculum: ${passed}/${passed}`);
