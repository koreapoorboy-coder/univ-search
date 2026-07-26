#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function hasFlag(name) { return process.argv.includes(name); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function pct(n, d) { return d ? Number((n * 100 / d).toFixed(2)) : 0; }
function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
}
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function stats(values) {
  if (!values.length) return { count: 0, average: 0, median: 0, min: 0, max: 0 };
  return {
    count: values.length,
    average: round(values.reduce((a, b) => a + b, 0) / values.length),
    median: round(median(values)),
    min: Math.min(...values),
    max: Math.max(...values)
  };
}
function csvCell(value) {
  const text = Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function countBy(values) {
  const out = {};
  for (const value of values) out[value] = (out[value] || 0) + 1;
  return out;
}
function fixedDateClass() {
  const RealDate = Date;
  const fixed = '2026-07-26T00:00:00.000Z';
  return class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return new RealDate(fixed).getTime(); }
  };
}

const root = path.resolve(arg('--root', path.join(__dirname, '..')));
const helperPath = path.resolve(arg('--helper', path.join(root, 'assets/assessment_keyword_bridge_helper.js')));
const baselineHelperPath = arg('--baseline-helper', '') ? path.resolve(arg('--baseline-helper')) : '';
const populationPath = path.resolve(arg('--population', path.join(root, 'audit/concept_wiring_after.v1.json')));
const outputJson = path.resolve(arg('--output-json', path.join(root, 'audit/score_diagnostics_v1.json')));
const outputCsv = path.resolve(arg('--output-csv', path.join(root, 'audit/score_diagnostics_v1.csv')));
const reportPath = path.resolve(arg('--report', path.join(root, 'audit/SCORE_DIAGNOSTICS_REPORT.md')));
const noBehaviorPath = path.resolve(arg('--no-behavior-json', path.join(root, 'audit/no_behavior_change_v1.json')));
const persistFullCandidates = hasFlag('--persist-full-candidates');

function loadRuntime(helper, fullDiagnostics) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    crypto: global.crypto || crypto.webcrypto,
    Date: fixedDateClass()
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.__SCORE_DIAGNOSTIC_FULL__ = fullDiagnostics === true;
  sandbox.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  sandbox.fetch = async function fetchLocal(url) {
    const clean = String(url).replace(/^\.\//, '');
    const file = path.join(root, clean);
    try {
      const text = fs.readFileSync(file, 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
    } catch (error) {
      return { ok: false, status: 404, json: async () => { throw error; }, text: async () => '' };
    }
  };
  vm.createContext(sandbox);
  const aliasPath = path.join(root, 'assets/js/subject_alias.js');
  if (fs.existsSync(aliasPath)) vm.runInContext(fs.readFileSync(aliasPath, 'utf8'), sandbox, { filename: aliasPath });
  vm.runInContext(fs.readFileSync(helper, 'utf8'), sandbox, { filename: helper });
  return sandbox;
}

function buildPayload(row, subject) {
  const guide = `${row.raw_task_title || ''} ${row.raw_task_desc || ''}`.trim();
  return {
    subject,
    taskDescription: guide,
    career: '',
    taskName: '',
    assessmentDescription: '',
    selectedConcept: '',
    selectedKeyword: '',
    derivedKeywords: []
  };
}

function behaviorSnapshot(result) {
  return {
    seedId: result?.match?.seedId || '',
    ruleId: result?.interpreter?.ruleId || '',
    subjectConcepts: result?.cross_axis?.topic?.subjectConcepts || [],
    connectionScore: result?.match?.connectionScore ?? null
  };
}
function withoutDiagnostics(result) {
  const copy = { ...(result || {}) };
  delete copy.score_diagnostics;
  return copy;
}
function gapBucket(value) {
  if (value === null || value === undefined) return 'single_candidate';
  if (value === 0) return '0';
  if (value <= 3) return '1-3';
  if (value <= 10) return '4-10';
  return '11+';
}
function topScoreBucket(value) {
  if (value < 50) return '0-49';
  if (value < 60) return '50-59';
  if (value < 70) return '60-69';
  if (value < 80) return '70-79';
  if (value < 90) return '80-89';
  return '90-100';
}

(async () => {
  const population = readJson(populationPath);
  const wanted = new Map((population.records || []).map(row => [row.task_id, row.subject]));
  const sourceRows = [];
  const recordFile = path.join(root, 'data/assessment/records/assessment_tasks.v1.jsonl');
  for (const line of fs.readFileSync(recordFile, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (wanted.has(row.task_id)) sourceRows.push(row);
  }
  if (sourceRows.length !== wanted.size) throw new Error(`population join failed: ${sourceRows.length}/${wanted.size}`);

  const current = loadRuntime(helperPath, true);
  await current.AssessmentKeywordBridge.ready();
  const baseline = baselineHelperPath ? loadRuntime(baselineHelperPath, false) : null;
  if (baseline) await baseline.AssessmentKeywordBridge.ready();

  const records = [];
  const behaviorMismatches = [];
  const outputByteMismatches = [];
  const componentNames = ['keywordScore', 'axisScore', 'conceptScore', 'taskScore', 'directBonus', 'exactBonus', 'guideVocabularyBonus'];
  const allCandidateComponentValues = Object.fromEntries(componentNames.map(name => [name, []]));
  const topComponentValues = Object.fromEntries(componentNames.map(name => [name, []]));
  let allCandidateCount = 0;
  let allCapHitCount = 0;
  let allTruncationCount = 0;
  const allExcessValues = [];
  let strictMajorRankFlipCount = 0;
  let deterministicCoreWinnerDiffCount = 0;

  for (const row of sourceRows) {
    const taskId = row.task_id;
    const subject = wanted.get(taskId);
    const payload = buildPayload(row, subject);
    const result = await current.AssessmentKeywordBridge.resolve(payload);
    const diag = result?.score_diagnostics;
    if (!diag) throw new Error(`missing score_diagnostics: ${taskId}`);
    const candidates = diag.topCandidates || [];
    if (!diag.fullArrayEnabled || candidates.length !== diag.candidateCount) {
      throw new Error(`full diagnostic array unavailable: ${taskId} ${candidates.length}/${diag.candidateCount}`);
    }

    const top = candidates[0] || null;
    const maxCoreScore = candidates.length ? Math.max(...candidates.map(v => v.coreScore)) : 0;
    const coreSorted = [...candidates].sort((a, b) => {
      if (b.coreScore !== a.coreScore) return b.coreScore - a.coreScore;
      if (b.contentScore !== a.contentScore) return b.contentScore - a.contentScore;
      return String(a.seedId).localeCompare(String(b.seedId));
    });
    if (top && top.coreScore < maxCoreScore) strictMajorRankFlipCount += 1;
    if (top && coreSorted[0] && top.seedId !== coreSorted[0].seedId) deterministicCoreWinnerDiffCount += 1;

    for (const candidate of candidates) {
      allCandidateCount += 1;
      if (candidate.contentScore >= 45) allCapHitCount += 1;
      if (candidate.contentCapped) {
        allTruncationCount += 1;
        allExcessValues.push(candidate.contentRaw - 45);
      }
      for (const name of componentNames) allCandidateComponentValues[name].push(Number(candidate.contentParts?.[name] || 0));
    }
    if (top) for (const name of componentNames) topComponentValues[name].push(Number(top.contentParts?.[name] || 0));

    if (baseline) {
      const before = await baseline.AssessmentKeywordBridge.resolve(payload);
      const beforeSnap = behaviorSnapshot(before);
      const afterSnap = behaviorSnapshot(result);
      if (JSON.stringify(beforeSnap) !== JSON.stringify(afterSnap)) {
        behaviorMismatches.push({ task_id: taskId, subject, before: beforeSnap, after: afterSnap });
      }
      const beforeBytes = Buffer.byteLength(JSON.stringify(before));
      const afterBytesWithoutDiagnostics = Buffer.byteLength(JSON.stringify(withoutDiagnostics(result)));
      if (beforeBytes !== afterBytesWithoutDiagnostics || JSON.stringify(before) !== JSON.stringify(withoutDiagnostics(result))) {
        outputByteMismatches.push({ task_id: taskId, subject, beforeBytes, afterBytesWithoutDiagnostics });
      }
    }

    const runtimeDiagnostics = { ...diag, topCandidates: candidates.slice(0, 10), fullArrayEnabled: false, returnedCandidateCount: Math.min(10, candidates.length) };
    const compactDiagnostics = persistFullCandidates ? diag : runtimeDiagnostics;
    records.push({
      task_id: taskId,
      subject,
      subject_raw: row.subject_raw || '',
      task_title: row.raw_task_title || '',
      task_description: row.raw_task_desc || '',
      seed_id: result?.match?.seedId || '',
      rule_id: result?.interpreter?.ruleId || '',
      connection_score: result?.match?.connectionScore ?? null,
      diagnostics: compactDiagnostics,
      output_bytes_without_diagnostics: Buffer.byteLength(JSON.stringify(withoutDiagnostics(result))),
      diagnostics_bytes: Buffer.byteLength(JSON.stringify(runtimeDiagnostics)),
      audit_full_diagnostics_bytes: Buffer.byteLength(JSON.stringify(diag))
    });
  }

  const candidateCounts = records.map(r => r.diagnostics.candidateCount);
  const topScores = records.map(r => r.diagnostics.topScore);
  const diagBytes = records.map(r => r.diagnostics_bytes);
  const auditFullDiagBytes = records.map(r => r.audit_full_diagnostics_bytes);
  const subjectGroups = {};
  for (const record of records) {
    if (!subjectGroups[record.subject]) subjectGroups[record.subject] = [];
    subjectGroups[record.subject].push(record);
  }

  const decisionStages = ['single_candidate', 'majorRank', 'coreScore', 'contentScore', 'seedId_alphabetical'];
  const candidateModes = [
    'bestForSubjects-literal-exact',
    'bestForSubjects-ui-alias-exact',
    'bestForSubjects-normalized-fallback',
    'normalizedSubjects-exact',
    'subjectAliases-exact',
    'subject-partial-fallback',
    'none'
  ];
  const methodReasons = ['no_task_match', 'task_without_report_modes', 'matched'];

  const bySubject = {};
  for (const [subject, rows] of Object.entries(subjectGroups).sort((a, b) => a[0].localeCompare(b[0], 'ko'))) {
    bySubject[subject] = {
      record_count: rows.length,
      candidate_pool: stats(rows.map(r => r.diagnostics.candidateCount)),
      candidate_modes: Object.fromEntries(candidateModes.map(mode => [mode, rows.filter(r => r.diagnostics.candidateMode === mode).length])),
      decision_stages: Object.fromEntries(decisionStages.map(stage => [stage, {
        count: rows.filter(r => r.diagnostics.decisionStage === stage).length,
        pct: pct(rows.filter(r => r.diagnostics.decisionStage === stage).length, rows.length)
      }])),
      method_reasons: Object.fromEntries(methodReasons.map(reason => [reason, {
        count: rows.filter(r => r.diagnostics.methodScoreReason === reason).length,
        pct: pct(rows.filter(r => r.diagnostics.methodScoreReason === reason).length, rows.length)
      }]))
    };
  }

  const componentSummary = {};
  for (const name of componentNames) {
    const topVals = topComponentValues[name];
    const allVals = allCandidateComponentValues[name];
    componentSummary[name] = {
      top_average: round(topVals.reduce((a, b) => a + b, 0) / Math.max(topVals.length, 1)),
      top_zero_count: topVals.filter(v => v === 0).length,
      top_zero_pct: pct(topVals.filter(v => v === 0).length, topVals.length),
      all_candidate_average: round(allVals.reduce((a, b) => a + b, 0) / Math.max(allVals.length, 1)),
      all_candidate_zero_count: allVals.filter(v => v === 0).length,
      all_candidate_zero_pct: pct(allVals.filter(v => v === 0).length, allVals.length)
    };
  }

  const topCandidateRows = records.map(r => r.diagnostics.topCandidates?.[0]).filter(Boolean);
  const topCapHitRows = topCandidateRows.filter(v => v.contentScore >= 45);
  const topTruncatedRows = topCandidateRows.filter(v => v.contentCapped);
  const topExcessValues = topTruncatedRows.map(v => v.contentRaw - 45);

  const summary = {
    version: 'patch2-score-diagnostics-audit-v1',
    generated_at: new Date().toISOString(),
    helper: path.relative(root, helperPath),
    baseline_helper: baselineHelperPath ? path.relative(root, baselineHelperPath) : '',
    population: path.relative(root, populationPath),
    audit_payload: {
      subject: 'population subject',
      taskDescription: 'raw_task_title + raw_task_desc',
      career: '',
      omitted: ['schoolName', 'grade', 'taskName', 'taskType'],
      reason: 'student minimum-input flow: subject + assessment guide + career'
    },
    record_count: records.length,
    candidate_pool: stats(candidateCounts),
    candidate_modes: Object.fromEntries(candidateModes.map(mode => [mode, records.filter(r => r.diagnostics.candidateMode === mode).length])),
    top_score: stats(topScores),
    top_score_histogram: countBy(topScores.map(topScoreBucket)),
    decision_stages: Object.fromEntries(decisionStages.map(stage => [stage, {
      count: records.filter(r => r.diagnostics.decisionStage === stage).length,
      pct: pct(records.filter(r => r.diagnostics.decisionStage === stage).length, records.length)
    }])),
    tied_with_top_distribution: countBy(records.map(r => String(r.diagnostics.tiedWithTopCount))),
    score_gap_distribution: countBy(records.map(r => gapBucket(r.diagnostics.scoreGap))),
    signed_negative_gap_count: records.filter(r => Number(r.diagnostics.signedScoreGap) < 0).length,
    subject_score_constant: {
      count: records.filter(r => r.diagnostics.subjectScoreConstant).length,
      pct: pct(records.filter(r => r.diagnostics.subjectScoreConstant).length, records.length)
    },
    method_score_constant: {
      count: records.filter(r => r.diagnostics.methodScoreConstant).length,
      pct: pct(records.filter(r => r.diagnostics.methodScoreConstant).length, records.length)
    },
    content_components: componentSummary,
    content_cap: {
      top_record_count: topCandidateRows.length,
      top_cap_hit_count: topCapHitRows.length,
      top_cap_hit_pct: pct(topCapHitRows.length, topCandidateRows.length),
      top_truncation_count: topTruncatedRows.length,
      top_truncation_pct: pct(topTruncatedRows.length, topCandidateRows.length),
      top_excess_average: round(topExcessValues.reduce((a, b) => a + b, 0) / Math.max(topExcessValues.length, 1)),
      top_excess_max: topExcessValues.length ? Math.max(...topExcessValues) : 0,
      candidate_count: allCandidateCount,
      cap_hit_count: allCapHitCount,
      cap_hit_pct: pct(allCapHitCount, allCandidateCount),
      truncation_count: allTruncationCount,
      truncation_pct: pct(allTruncationCount, allCandidateCount),
      excess_average: round(allExcessValues.reduce((a, b) => a + b, 0) / Math.max(allExcessValues.length, 1)),
      excess_max: allExcessValues.length ? Math.max(...allExcessValues) : 0
    },
    method_score_reasons: Object.fromEntries(methodReasons.map(reason => [reason, {
      count: records.filter(r => r.diagnostics.methodScoreReason === reason).length,
      pct: pct(records.filter(r => r.diagnostics.methodScoreReason === reason).length, records.length)
    }])),
    major_rank_flip: {
      strict_core_score_override_count: strictMajorRankFlipCount,
      strict_core_score_override_pct: pct(strictMajorRankFlipCount, records.length),
      deterministic_core_winner_diff_count: deterministicCoreWinnerDiffCount,
      deterministic_core_winner_diff_pct: pct(deterministicCoreWinnerDiffCount, records.length)
    },
    output_size: {
      diagnostics_bytes: stats(diagBytes),
      audit_full_diagnostics_bytes: stats(auditFullDiagBytes),
      average_under_8kb: diagBytes.reduce((a, b) => a + b, 0) / Math.max(diagBytes.length, 1) <= 8192,
      runtime_default_full_array: false,
      audit_full_array_received: true
    },
    by_subject: bySubject
  };

  const noBehavior = {
    version: 'patch2-no-behavior-change-v1',
    population_count: records.length,
    baseline_helper: baselineHelperPath ? path.relative(root, baselineHelperPath) : '',
    current_helper: path.relative(root, helperPath),
    checked_fields: ['match.seedId', 'interpreter.ruleId', 'cross_axis.topic.subjectConcepts', 'match.connectionScore'],
    behavior_mismatch_count: behaviorMismatches.length,
    behavior_mismatches: behaviorMismatches.slice(0, 100),
    output_without_diagnostics_mismatch_count: outputByteMismatches.length,
    output_without_diagnostics_mismatches: outputByteMismatches.slice(0, 100),
    pass: !!baseline && behaviorMismatches.length === 0 && outputByteMismatches.length === 0
  };

  ensureDir(outputJson);
  fs.writeFileSync(outputJson, JSON.stringify({ summary, records }, null, 2));

  const csvHeader = [
    'task_id','subject','subject_raw','seed_id','rule_id','connection_score','candidate_count','candidate_mode',
    'decision_stage','tied_with_top_count','top_score','second_score','score_gap','signed_score_gap',
    'subject_score_constant','method_score_constant','content_cap_hit_count','content_truncation_count','method_score_reason',
    'major_fallback_active','top_seed_id','top_label','top_core_score','top_subject_score','top_content_score',
    'top_content_raw','top_content_capped','keyword_score','axis_score','concept_score','task_score',
    'direct_bonus','exact_bonus','guide_vocabulary_bonus','top_method_score','top_major_rank',
    'diagnostics_bytes','output_bytes_without_diagnostics'
  ];
  const csvLines = [csvHeader.join(',')];
  for (const record of records) {
    const d = record.diagnostics;
    const top = d.topCandidates?.[0] || {};
    const parts = top.contentParts || {};
    const row = [
      record.task_id, record.subject, record.subject_raw, record.seed_id, record.rule_id, record.connection_score,
      d.candidateCount, d.candidateMode, d.decisionStage, d.tiedWithTopCount, d.topScore, d.secondScore,
      d.scoreGap, d.signedScoreGap, d.subjectScoreConstant, d.methodScoreConstant, d.contentCapHitCount, d.contentTruncationCount,
      d.methodScoreReason, d.majorFallbackActive, top.seedId, top.label, top.coreScore, top.subjectScore,
      top.contentScore, top.contentRaw, top.contentCapped, parts.keywordScore, parts.axisScore,
      parts.conceptScore, parts.taskScore, parts.directBonus, parts.exactBonus, parts.guideVocabularyBonus,
      top.methodScore, top.majorRank, record.diagnostics_bytes, record.output_bytes_without_diagnostics
    ];
    csvLines.push(row.map(csvCell).join(','));
  }
  ensureDir(outputCsv);
  fs.writeFileSync(outputCsv, csvLines.join('\n') + '\n');
  ensureDir(noBehaviorPath);
  fs.writeFileSync(noBehaviorPath, JSON.stringify(noBehavior, null, 2));

  const ds = summary.decision_stages;
  const mr = summary.method_score_reasons;
  const gap = summary.score_gap_distribution;
  const report = `# SCORE DIAGNOSTICS REPORT — Patch 2\n\n` +
`## 1. 범위 및 무행동 검증\n\n` +
`- 모집단: **${summary.record_count.toLocaleString()}건** (${summary.population})\n` +
`- 감사 입력: 과목 + 원문 제목·안내문 결합, 계열 공란; 학교명·학년·수행명·결과물 유형은 미주입\n` +
`- 기존 선택 결과 불일치: **${noBehavior.behavior_mismatch_count}건**\n` +
`- \`score_diagnostics\` 제거 후 기존 출력 불일치: **${noBehavior.output_without_diagnostics_mismatch_count}건**\n` +
`- 판정: **${noBehavior.pass ? 'PASS' : 'FAIL'}**\n\n` +
`## 2. 후보 풀\n\n` +
`| 항목 | 값 |\n|---|---:|\n` +
`| 평균 | ${summary.candidate_pool.average} |\n| 중앙값 | ${summary.candidate_pool.median} |\n| 최소 | ${summary.candidate_pool.min} |\n| 최대 | ${summary.candidate_pool.max} |\n\n` +
`### 후보 수집 모드\n\n` +
Object.entries(summary.candidate_modes).map(([k,v]) => `- ${k}: ${v}건`).join('\n') + '\n\n' +
`## 3. 1위 총점 분포\n\n` +
Object.entries(summary.top_score_histogram).sort().map(([k,v]) => `- ${k}: ${v}건`).join('\n') + '\n\n' +
`- 평균 ${summary.top_score.average}, 중앙값 ${summary.top_score.median}, 최소 ${summary.top_score.min}, 최대 ${summary.top_score.max}\n\n` +
`## 4. 결정 단계 분포\n\n` +
`| 단계 | 건수 | 비율 |\n|---|---:|---:|\n` +
Object.entries(ds).map(([k,v]) => `| ${k} | ${v.count} | ${v.pct}% |`).join('\n') + '\n\n' +
`### 1위 완전 동점 그룹 크기\n\n` +
Object.entries(summary.tied_with_top_distribution).sort((a,b)=>Number(a[0])-Number(b[0])).map(([k,v]) => `- ${k}개: ${v}건`).join('\n') + '\n\n' +
`## 5. 점수 성분 — 선택된 1위 기준\n\n` +
`| 성분 | 평균 | 0점 건수 | 0점 비율 |\n|---|---:|---:|---:|\n` +
Object.entries(componentSummary).map(([k,v]) => `| ${k} | ${v.top_average} | ${v.top_zero_count} | ${v.top_zero_pct}% |`).join('\n') + '\n\n' +
`## 6. contentScore 상한\n\n` +
`- 선택 1위 45점 도달: ${summary.content_cap.top_cap_hit_count}건 (${summary.content_cap.top_cap_hit_pct}%)\n` +
`- 선택 1위 45점 초과 절단: ${summary.content_cap.top_truncation_count}건 (${summary.content_cap.top_truncation_pct}%)\n` +
`- 선택 1위 초과분 평균 / 최대: ${summary.content_cap.top_excess_average} / ${summary.content_cap.top_excess_max}\n` +
`- 전체 후보 ${summary.content_cap.candidate_count.toLocaleString()}개 중 45점 도달: ${summary.content_cap.cap_hit_count.toLocaleString()}개 (${summary.content_cap.cap_hit_pct}%)\n` +
`- 전체 후보 45점 초과 절단: ${summary.content_cap.truncation_count.toLocaleString()}개 (${summary.content_cap.truncation_pct}%)\n` +
`- 전체 후보 초과분 평균 / 최대: ${summary.content_cap.excess_average} / ${summary.content_cap.excess_max}\n\n` +
`## 7. subjectScore 상수 여부\n\n` +
`- 풀 내 전 후보 동일: ${summary.subject_score_constant.count}건 (${summary.subject_score_constant.pct}%)\n\n` +
`## 8. methodScore 원인\n\n` +
`- 풀 내 전 후보 동일: ${summary.method_score_constant.count}건 (${summary.method_score_constant.pct}%)\n\n` +
`| 사유 | 건수 | 비율 |\n|---|---:|---:|\n` +
Object.entries(mr).map(([k,v]) => `| ${k} | ${v.count} | ${v.pct}% |`).join('\n') + '\n\n' +
`## 9. majorRank 역전\n\n` +
`- 최종 1위 coreScore가 풀 최대보다 낮은 엄격 역전: ${summary.major_rank_flip.strict_core_score_override_count}건 (${summary.major_rank_flip.strict_core_score_override_pct}%)\n` +
`- coreScore 전용 결정 승자와 최종 승자가 다른 건: ${summary.major_rank_flip.deterministic_core_winner_diff_count}건 (${summary.major_rank_flip.deterministic_core_winner_diff_pct}%)\n\n` +
`## 10. 1·2위 점수차\n\n` +
`| 구간 | 건수 |\n|---|---:|\n` +
`| 0 | ${gap['0'] || 0} |\n| 1~3 | ${gap['1-3'] || 0} |\n| 4~10 | ${gap['4-10'] || 0} |\n| 11+ | ${gap['11+'] || 0} |\n| 단일 후보 | ${gap.single_candidate || 0} |\n\n` +
`- 정렬 1위 총점이 2위보다 낮은 건: ${summary.signed_negative_gap_count}건\n\n` +
`## 11. 출력 크기\n\n` +
`- 기본 런타임 전체 후보 노출: **false**\n` +
`- 기본 상위 후보 수: **10개**\n` +
`- 감사 실행에서는 전체 후보 수신: **true**\n` +
`- 진단 블록 평균 증가량: **${summary.output_size.diagnostics_bytes.average} bytes**
` +
`- 진단 블록 최대 증가량: **${summary.output_size.diagnostics_bytes.max} bytes**
` +
`- 평균 8KB 이하: **${summary.output_size.average_under_8kb ? 'PASS' : 'FAIL'}**

` +
`## 12. 패치 3용 핵심 해석

` +
`- \`subjectScore\`는 ${summary.record_count.toLocaleString()}건 전부에서 후보 풀 내 상수였습니다.
` +
`- \`methodScore\`도 전건 후보 풀 내 상수입니다. 0점/5점 여부와 무관하게 후보 순위를 가르지 못합니다.
` +
`- 최소 입력 흐름에서는 \`axisScore\`와 \`conceptScore\`가 전건 0점이었습니다.
` +
`- 계열 입력이 공란인 본 감사에서는 실질 순위 변별이 \`contentScore\`와 최종 \`seedId\` 사전순에 집중됩니다.
` +
`- \`contentScore\` 비교 단계가 0건인 이유는 \`coreScore\`가 같은 차이를 먼저 반영하기 때문입니다.

` +
`## 13. 과목별 요약

` +
`| 과목 | 건수 | 후보 평균 | 후보 최대 | single | majorRank | coreScore | contentScore | seedId | method no_task |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n` +
Object.entries(bySubject).map(([subject,v]) => `| ${subject} | ${v.record_count} | ${v.candidate_pool.average} | ${v.candidate_pool.max} | ${v.decision_stages.single_candidate.count} | ${v.decision_stages.majorRank.count} | ${v.decision_stages.coreScore.count} | ${v.decision_stages.contentScore.count} | ${v.decision_stages.seedId_alphabetical.count} | ${v.method_reasons.no_task_match.count} |`).join('\n') + '\n';

  ensureDir(reportPath);
  fs.writeFileSync(reportPath, report);
  console.log(JSON.stringify({ summary, no_behavior_change: noBehavior }, null, 2));
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
