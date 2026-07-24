#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(process.argv[2] || process.cwd());
const failures = [];
function requireCheck(condition, message){ if(!condition) failures.push(message); }

global.window = global;
global.localStorage = {
  data: new Map(),
  getItem(key){ return this.data.has(key) ? this.data.get(key) : null; },
  setItem(key, value){ this.data.set(key, String(value)); },
  removeItem(key){ this.data.delete(key); }
};
global.sessionStorage = global.localStorage;
Object.defineProperty(global, "navigator", { value:{ sendBeacon(){ return true; } }, configurable:true });
global.fetch = async function(url){
  const target = String(url || "");
  if(/^https?:/i.test(target)) return { ok:true, status:200, json:async()=>({ok:true}) };
  const file = path.join(root, target.replace(/^\.\//, ""));
  if(!fs.existsSync(file)) return { ok:false, status:404, json:async()=>({}) };
  return { ok:true, status:200, json:async()=>JSON.parse(fs.readFileSync(file, "utf8")) };
};

function loadScript(relative){
  const file = path.join(root, relative);
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename:file });
}

(async function(){
  loadScript("assets/js/subject_alias.js");
  loadScript("assets/assessment_keyword_bridge_helper.js");
  await global.AssessmentKeywordBridge.ready();

  const guide = [
    "효소의 작용 탐구보고서 작성하기.",
    "효소 활성에 영향을 미치는 요인을 조사하고 효소 반응 속도를 측정하는 실험을 설계하여 결과를 분석한다."
  ].join(" ");

  const derived = await global.AssessmentKeywordBridge.resolve({
    subject:"생명과학",
    taskDescription:guide,
    career:"medical",
    taskType:"탐구보고서"
  });
  const derivedSeed = derived?.cross_axis?.seedMatch?.seed || {};
  requireCheck(derived?.input?.keywordSource === "derived_from_guide", "guide keyword source must be derived_from_guide");
  requireCheck((derived?.input?.derivedKeywords || []).includes("효소"), "derived keywords must include 효소");
  requireCheck((derived?.input?.derivedKeywords || []).includes("반응 속도"), "derived keywords must include 반응 속도");
  requireCheck(derived?.cross_axis?.seedMatch?.seedId === "NAT-030", `enzyme guide must select NAT-030, got ${derived?.cross_axis?.seedMatch?.seedId || "none"}`);
  requireCheck(/효소/.test(String(derivedSeed.label || "")), "selected seed must be enzyme-related");
  requireCheck(derived?.cross_axis?.seedMatch?.keywordSource === "derived_from_guide", "seed-match trace must preserve keywordSource");

  const direct = await global.AssessmentKeywordBridge.resolve({
    subject:"생명과학",
    taskDescription:guide,
    career:"medical",
    selectedKeyword:"효소",
    taskType:"탐구보고서"
  });
  requireCheck(direct?.input?.keywordSource === "student_selected", "direct keyword must preserve student_selected source");

  const noHit = await global.AssessmentKeywordBridge.resolve({
    subject:"생명과학",
    taskDescription:"자유롭게 생각을 정리한다",
    career:"medical",
    taskType:"탐구보고서"
  });
  requireCheck(noHit && noHit.connected === true, "no-vocabulary guide must continue through the existing fallback path");
  requireCheck(noHit?.input?.keywordSource === "", "no-vocabulary guide must not invent a keyword source");

  const result = {
    pass: failures.length === 0,
    enzymeGuide: {
      keyword: derived?.input?.keyword || "",
      keywordSource: derived?.input?.keywordSource || "",
      derivedKeywords: derived?.input?.derivedKeywords || [],
      seedId: derived?.cross_axis?.seedMatch?.seedId || "",
      seedLabel: derivedSeed.label || "",
      contentScore: derived?.cross_axis?.seedMatch?.contentScore || 0,
      candidateCount: derived?.cross_axis?.seedMatch?.subjectCandidateCount || 0,
      categoryMatchCount: derived?.cross_axis?.seedMatch?.categoryMatchCount || 0
    },
    directKeyword: {
      keywordSource: direct?.input?.keywordSource || "",
      seedId: direct?.cross_axis?.seedMatch?.seedId || ""
    },
    noVocabularyFallback: {
      keywordSource: noHit?.input?.keywordSource || "",
      seedId: noHit?.cross_axis?.seedMatch?.seedId || ""
    },
    failures
  };
  console.log(JSON.stringify(result, null, 2));
  if(failures.length) process.exit(1);
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
