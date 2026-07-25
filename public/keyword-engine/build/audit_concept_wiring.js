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

const root = path.resolve(arg('--root', path.join(__dirname, '..')));
const helperPath = path.resolve(arg('--helper', path.join(root, 'assets/assessment_keyword_bridge_helper.js')));
const populationPath = path.resolve(arg('--population', path.join(root, 'audit/concept_wiring_after.v1.json')));
const outputJson = arg('--output-json', '');
const outputCsv = arg('--output-csv', '');
const label = arg('--label', path.basename(helperPath));

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function norm(value) {
  return String(value || '').toLowerCase()
    .replace(/Ⅰ/g, '1').replace(/Ⅱ/g, '2').replace(/Ⅲ/g, '3')
    .replace(/[^0-9a-z가-힣]+/g, '');
}
function pct(n, d) { return d ? Number((n * 100 / d).toFixed(2)) : 0; }
function csvCell(value) {
  const text = Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CANON = {
  '물리': '물리학', '미적분1': '미적분', '공통수학1': '공통수학', '공통수학2': '공통수학',
  '통합과학1': '통합과학', '통합과학2': '통합과학', '통합사회1': '통합사회', '통합사회2': '통합사회',
  '공통국어1': '공통국어', '공통국어2': '공통국어', '과학탐구실험1': '과학탐구실험', '과학탐구실험2': '과학탐구실험'
};
function nameForms(subject) {
  const raw = String(subject || '').trim();
  const canonical = CANON[raw] || raw;
  const values = [raw, canonical, raw.replace(/[0-9Ⅰ-Ⅲ]+$/g, ''), canonical.replace(/[0-9Ⅰ-Ⅲ]+$/g, '')];
  return [...new Set(values.map(norm).filter(v => v.length >= 2))].sort((a, b) => b.length - a.length);
}
function nameRanges(text, subject) {
  const ranges = [];
  for (const form of nameForms(subject)) {
    let from = 0;
    while (from <= text.length) {
      const at = text.indexOf(form, from);
      if (at < 0) break;
      ranges.push([at, at + form.length]);
      from = at + 1;
    }
  }
  return ranges;
}
function classifyGuide(guide, terms, subject) {
  const text = norm(guide);
  const ranges = nameRanges(text, subject);
  let present = false;
  let outside = false;
  for (const term of terms || []) {
    const q = norm(term);
    if (!q) continue;
    let i = text.indexOf(q);
    while (i >= 0) {
      present = true;
      if (!ranges.some(([s, e]) => s <= i && i + q.length <= e)) { outside = true; break; }
      i = text.indexOf(q, i + 1);
    }
    if (outside) break;
  }
  return outside ? 'clean' : (present ? 'name_only' : 'record_only');
}

function literalPattern(value) {
  const tokens = String(value || '').trim().split(/[^0-9A-Za-z가-힣]+/).filter(Boolean);
  if (!tokens.length) return '';
  const escaped = tokens.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return escaped.join('[\\s·,._\\-/()]*');
}
function findRawRanges(text, value) {
  const pattern = literalPattern(value);
  if (!pattern) return [];
  const re = new RegExp(pattern, 'gi');
  const ranges = [];
  let match;
  while ((match = re.exec(String(text || ''))) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
    if (!match[0].length) re.lastIndex += 1;
  }
  return ranges;
}
function safeNameRanges(text, subject) {
  const raw = String(subject || '').trim();
  const canonical = CANON[raw] || raw;
  const forms = [...new Set([raw, canonical, raw.replace(/[0-9Ⅰ-Ⅲ]+$/g, ''), canonical.replace(/[0-9Ⅰ-Ⅲ]+$/g, '')].filter(v => norm(v).length >= 2))];
  return forms.flatMap(form => findRawRanges(text, form));
}
function classifyGuideBoundarySafe(title, description, terms, subject) {
  const text = `${title || ''}␞${description || ''}`;
  const ranges = safeNameRanges(text, subject);
  let present = false;
  let outside = false;
  for (const term of terms || []) {
    for (const [start, end] of findRawRanges(text, term)) {
      present = true;
      if (!ranges.some(([s, e]) => s <= start && end <= e)) { outside = true; break; }
    }
    if (outside) break;
  }
  return outside ? 'clean' : (present ? 'name_only' : 'record_only');
}

function hasOverlap(list) {
  const vals = (list || []).map(norm).filter(Boolean);
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      if (vals[i] === vals[j] || vals[i].includes(vals[j]) || vals[j].includes(vals[i])) return true;
    }
  }
  return false;
}
function isLevelII(subject, raw) {
  if (!['물리', '화학', '생명과학', '지구과학'].includes(subject)) return false;
  return /(Ⅱ|II|(?:물리학|물리|화학|생명과학|지구과학)\s*2(?:\D|$))/.test(String(raw || ''));
}

function loadRuntime() {
  const sandbox = { console, setTimeout, clearTimeout, crypto: global.crypto || crypto.webcrypto };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
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
  vm.runInContext(fs.readFileSync(helperPath, 'utf8'), sandbox, { filename: helperPath });
  return sandbox;
}

(async () => {
  const population = readJson(populationPath);
  const wanted = new Map((population.records || []).map(row => [row.task_id, row.subject]));
  const recordFile = path.join(root, 'data/assessment/records/assessment_tasks.v1.jsonl');
  const sourceRows = [];
  for (const line of fs.readFileSync(recordFile, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (wanted.has(row.task_id)) sourceRows.push(row);
  }
  if (sourceRows.length !== wanted.size) throw new Error(`population join failed: ${sourceRows.length}/${wanted.size}`);

  const runtime = loadRuntime();
  await runtime.AssessmentKeywordBridge.ready();
  const records = [];
  for (const row of sourceRows) {
    const subject = wanted.get(row.task_id);
    const task = {
      title: row.raw_task_title || '',
      description: row.raw_task_desc || '',
      rubricAxis: row.raw_rubric_elements || []
    };
    const payload = {
      subject,
      taskName: row.raw_task_title || '',
      taskDescription: row.raw_task_desc || '',
      assessmentDescription: '',
      selectedConcept: '',
      derivedKeywords: []
    };
    const result = runtime.AssessmentKeywordBridge.inferSubjectConcepts(subject, task, subject, payload);
    const detail = result.detail || {};
    const covered = detail.source !== 'subject_fallback';
    const guide = `${row.raw_task_title || ''} ${row.raw_task_desc || ''}`.trim();
    const evidenceClassLegacy = covered ? classifyGuide(guide, detail.matchedTerms || [], subject) : 'fallback';
    let evidenceClassSafe = covered ? classifyGuideBoundarySafe(row.raw_task_title || '', row.raw_task_desc || '', detail.matchedTerms || [], subject) : 'fallback';
    // Runtime evidence scope is more precise than a guide-only re-scan when the same term also appears in the subject label.
    if (covered && detail.evidenceScope === 'record') evidenceClassSafe = 'record_only';
    records.push({
      task_id: row.task_id,
      subject,
      subject_raw: row.subject_raw || '',
      level: isLevelII(subject, row.subject_raw) ? 'II' : 'I_or_other',
      guide,
      source: detail.source || '',
      covered,
      evidence_class: evidenceClassSafe,
      evidence_class_legacy: evidenceClassLegacy,
      evidence_scope: detail.evidenceScope || '',
      subject_concepts: result.list || [],
      concept_detail: detail,
      title_overlap: hasOverlap(result.list || []),
      comma_display: (result.list || []).some(v => String(v).includes(',')),
      fallback_derived: detail.fallbackDerived === true,
      fallback_sources: detail.fallbackSourceSubjects || []
    });
  }

  const covered = records.filter(r => r.covered);
  const count = records.length;
  const summary = {
    label,
    helper: path.relative(root, helperPath),
    population: path.relative(root, populationPath),
    record_count: count,
    joined_count: sourceRows.length,
    covered_count: covered.length,
    coverage_pct: pct(covered.length, count),
    clean_count: records.filter(r => r.evidence_class === 'clean').length,
    clean_pct: pct(records.filter(r => r.evidence_class === 'clean').length, count),
    clean_pct_of_covered: pct(records.filter(r => r.evidence_class === 'clean').length, covered.length),
    name_only_count: records.filter(r => r.evidence_class === 'name_only').length,
    record_only_count: records.filter(r => r.evidence_class === 'record_only').length,
    legacy_clean_count: records.filter(r => r.evidence_class_legacy === 'clean').length,
    legacy_clean_pct: pct(records.filter(r => r.evidence_class_legacy === 'clean').length, count),
    legacy_name_only_count: records.filter(r => r.evidence_class_legacy === 'name_only').length,
    legacy_record_only_count: records.filter(r => r.evidence_class_legacy === 'record_only').length,
    title_overlap_count: records.filter(r => r.title_overlap).length,
    comma_display_count: records.filter(r => r.comma_display).length,
    fallback_derived_count: records.filter(r => r.fallback_derived).length,
    level_II_count: records.filter(r => r.level === 'II').length,
    level_I_or_other_count: records.filter(r => r.level !== 'II').length,
    source_distribution: Object.fromEntries([...new Set(records.map(r => r.source))].sort().map(k => [k, records.filter(r => r.source === k).length])),
    evidence_scope_distribution: Object.fromEntries([...new Set(records.map(r => r.evidence_scope || 'legacy_unknown'))].sort().map(k => [k, records.filter(r => (r.evidence_scope || 'legacy_unknown') === k).length]))
  };
  const bySubject = [...new Set(records.map(r => r.subject))].sort().map(subject => {
    const rows = records.filter(r => r.subject === subject);
    const cov = rows.filter(r => r.covered);
    return {
      subject,
      record_count: rows.length,
      covered_count: cov.length,
      coverage_pct: pct(cov.length, rows.length),
      clean_count: rows.filter(r => r.evidence_class === 'clean').length,
      clean_pct: pct(rows.filter(r => r.evidence_class === 'clean').length, rows.length),
      name_only_count: rows.filter(r => r.evidence_class === 'name_only').length,
      record_only_count: rows.filter(r => r.evidence_class === 'record_only').length,
      title_overlap_count: rows.filter(r => r.title_overlap).length,
      comma_display_count: rows.filter(r => r.comma_display).length,
      fallback_derived_count: rows.filter(r => r.fallback_derived).length,
      level_II_count: rows.filter(r => r.level === 'II').length
    };
  });
  const output = {
    meta: {
      audit_version: 'patch11-concept-wiring-reproducible-v1',
      generated_at: new Date().toISOString(),
      population_rule: 'Reuse task_id and dropdown subject from audit/concept_wiring_after.v1.json; join assessment_tasks.v1.jsonl exactly; pass raw title/description as guide and raw rubric elements as matched record evidence.',
      classifier_rule: 'Primary clean/name_only/record_only uses boundary-safe raw-text matching; legacy_* reproduces Appendix A normalization for continuity. covered means source != subject_fallback.'
    },
    summary,
    by_subject: bySubject,
    records
  };

  if (outputJson) {
    fs.mkdirSync(path.dirname(path.resolve(outputJson)), { recursive: true });
    fs.writeFileSync(path.resolve(outputJson), JSON.stringify(output, null, 2), 'utf8');
  }
  if (outputCsv) {
    fs.mkdirSync(path.dirname(path.resolve(outputCsv)), { recursive: true });
    const headers = ['task_id','subject','subject_raw','level','source','covered','evidence_class','evidence_class_legacy','evidence_scope','subject_concepts','matched_terms','concept_name','concept_display_name','title_overlap','comma_display','fallback_derived','fallback_sources'];
    const lines = [headers.join(',')];
    for (const row of records) {
      const d = row.concept_detail || {};
      const values = [row.task_id,row.subject,row.subject_raw,row.level,row.source,row.covered,row.evidence_class,row.evidence_class_legacy,row.evidence_scope,row.subject_concepts,d.matchedTerms||[],d.conceptName||'',d.conceptDisplayName||'',row.title_overlap,row.comma_display,row.fallback_derived,row.fallback_sources];
      lines.push(values.map(csvCell).join(','));
    }
    fs.writeFileSync(path.resolve(outputCsv), lines.join('\n') + '\n', 'utf8');
  }
  console.log(JSON.stringify(summary, null, 2));
})().catch(error => { console.error(error.stack || error); process.exit(1); });
