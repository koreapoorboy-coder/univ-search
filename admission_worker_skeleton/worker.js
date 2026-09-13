import { acceptLiveInputCandidate, handleSimpleLiveIntakeRequest, parseStrictIJson } from './simple_live_intake_v1.mjs';
import { COLLECTION, STAGE, finalizeStageOutput, normalizeStudentData, resolveCollectionKind, resolveReportStage, stageLengthRule, stageOutputKeys, stagePromptLines, stageSchemaProperties, stageSectionGuide, stageSections } from './report_stages_v1.mjs';
import { DOC, UPLOAD_LIMITS, analysisPromptLines, analysisSchema, careerAxisPromptLines, checkUpload, matchAxes, priorWorkPromptLines, sanitizeAnalysis, sharesGround } from './upload_analysis_v1.mjs';
import { pickReportShape, shapePromptLines } from './report_shape_v1.mjs';
import { crossSubjectPromptLines, pickCrossSubject } from './cross_subject_v1.mjs';
import { resolveReportScope, SCOPE } from './report_scope_v1.mjs';

const SERVICE_NAME = 'admission-keyword-worker';

const DEFAULT_SEED_BASE =
  'https://cdn.jsdelivr.net/gh/koreapoorboy-coder/univ-search@main/public/keyword-engine/seed';

const REQUIRED_INPUTS = ['keyword', 'grade', 'track', 'major'];
const OPTIONAL_INPUTS = ['activityLevel', 'style'];
const OUTPUT_SECTIONS = [
  'reason',
  'steps',
  'flow',
  'recommendedApproach',
  'extension',
  'subjectLinks',
  'warnings',
];

const SEED_FILES = {
  keywordClusterBridge: 'keyword_cluster_bridge.json',
  admissionPatternRules: 'admission_pattern_rules.json',
  admissionGradeModifiers: 'admission_grade_level_modifiers.json',
  reasonBlocks: 'generation_reason_blocks.json',
  stepBlocks: 'generation_step_blocks.json',
  flowBlocks: 'generation_flow_blocks.json',
  extensionBlocks: 'generation_extension_blocks.json',
  warningBlocks: 'generation_warning_blocks.json',
  reportSeedIndex: 'seed-bank/index/report_seed_index.json',
  // Built by tools/build_engine_index.mjs from the 7,131-task corpus: what shape this kind of report takes.
  reportShapeIndex: 'engine-index/report_shape_index.v1.json',
  // Built by tools/build_axis_index.mjs: 465 종단 축 and the 1,684 keywords that reach them.
  axisIndex: 'engine-index/longitudinal_axis_index.v1.json',
  // Built by tools/build_cross_subject_index.mjs: which other subject this one honestly crosses into.
  crossSubjectIndex: 'engine-index/cross_subject_index.v1.json',
};

// Execution authority is intentionally non-serializable. Audit hashes and
// provenance labels remain descriptive only; they cannot mint this binding.
const runtimeOriginCapabilityByEnvelope = new WeakMap();

function mintRuntimeOriginCapability(trustedEnvelope, request) {
  if (!trustedEnvelope || typeof trustedEnvelope !== 'object' || !(request instanceof Request)) {
    const error = new Error('RUNTIME_ORIGIN_CAPABILITY_MINT_INPUT_INVALID');
    error.code = 'RUNTIME_ORIGIN_CAPABILITY_MINT_INPUT_INVALID';
    throw error;
  }
  runtimeOriginCapabilityByEnvelope.set(trustedEnvelope, request);
}

export function hasRuntimeOriginCapability(trustedEnvelope, request) {
  return Boolean(
    trustedEnvelope
    && typeof trustedEnvelope === 'object'
    && request instanceof Request
    && runtimeOriginCapabilityByEnvelope.get(trustedEnvelope) === request
  );
}

function buildRuntimeOriginAuditDiagnostics(trustedEnvelope, request) {
  const jsonRoundTrip = JSON.parse(JSON.stringify(trustedEnvelope));
  const spreadClone = { ...trustedEnvelope };
  const rewrittenSerializableClone = {
    ...jsonRoundTrip,
    execution_provenance: 'genuine_http_request',
    runtime_origin_capability: true,
  };
  const differentRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
  });
  return Object.freeze({
    exact_envelope_and_request: hasRuntimeOriginCapability(trustedEnvelope, request),
    json_round_trip_rejected: !hasRuntimeOriginCapability(jsonRoundTrip, request),
    spread_clone_rejected: !hasRuntimeOriginCapability(spreadClone, request),
    rewritten_labels_rejected: !hasRuntimeOriginCapability(rewrittenSerializableClone, request),
    cross_request_rejected: !hasRuntimeOriginCapability(trustedEnvelope, differentRequest),
  });
}

export async function establishTrustedLiveAuthorityForGenerate(payload, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !payload.liveInputCandidate) {
    const error = new Error('LIVE_INPUT_CANDIDATE_REQUIRED');
    error.code = 'LIVE_INPUT_CANDIDATE_REQUIRED';
    throw error;
  }
  const accepted = await acceptLiveInputCandidate(payload.liveInputCandidate, options);
  const raw = accepted.envelope.raw_authority;
  const protectedFields = [
    ['schoolName', raw.school, 'LIVE_INPUT_SCHOOL_CONFLICT'],
    ['grade', raw.grade, 'LIVE_INPUT_GRADE_CONFLICT'],
    ['subjectGroup', raw.subject_group, 'LIVE_INPUT_SUBJECT_GROUP_CONFLICT'],
    ['subject', raw.subject, 'LIVE_INPUT_SUBJECT_CONFLICT'],
    ['taskDescription', raw.task_description, 'LIVE_INPUT_TASK_DESCRIPTION_CONFLICT']
  ];
  for (const [field, trustedValue, code] of protectedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== trustedValue) {
      const error = new Error(code);
      error.code = code;
      throw error;
    }
  }
  return Object.freeze({
    envelope: accepted.envelope,
    seal: accepted.seal,
    phase1Lineage: accepted.phase1_lineage,
    candidateVersion: payload.liveInputCandidate.candidate_version
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') {
        return withCors(new Response(null, { status: 204 }));
      }
      if (url.pathname === '/health') {
        return json({ ok: true, service: SERVICE_NAME, hasDB: Boolean(env.DB) });
      }
      if (url.pathname === '/config') {
        return json({
          ok: true,
          requiredInputs: REQUIRED_INPUTS,
          optionalInputs: OPTIONAL_INPUTS,
          outputSections: OUTPUT_SECTIONS,
          mode: env.ENGINE_MODE || 'development',
          stubAllowed: String(env.ALLOW_STUB ?? 'true'),
          seedBaseUrl: env.SEED_BASE_URL || DEFAULT_SEED_BASE,
          hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
          model: env.OPENAI_MODEL || 'gpt-4.1-mini',
        });
      }

      if (url.pathname === '/live-intake') {
        return withCors(await handleSimpleLiveIntakeRequest(request));
      }

      if (url.pathname === '/analyze-upload' && request.method === 'POST') {
        return withCors(await handleAnalyzeUpload(request, env));
      }

      if (url.pathname === '/collect' && request.method === 'POST') {
        if (!env.DB) {
          return json({ ok: false, error: 'D1 binding(DB)이 연결되지 않았습니다.' }, 500);
        }

        const collectRequest = await parseCollectRequest(request);
        const collectPayload = normalizeCollectPayload(collectRequest);
        if (!collectPayload.session_id) {
          return json({ ok: false, error: 'Missing session_id' }, 400);
        }

        await ensureEngineTables(env.DB);
        const saved = await insertEngineSession(env.DB, collectPayload);

        return json({
          ok: true,
          saved: true,
          session_id: collectPayload.session_id,
          row_id: saved?.meta?.last_row_id ?? null
        });
      }
      if (url.pathname === '/generate' && request.method === 'POST') {
        let payload;
        let liveAuthority;
        try {
          payload = parseStrictIJson(await request.text());
          liveAuthority = await establishTrustedLiveAuthorityForGenerate(payload);
          mintRuntimeOriginCapability(liveAuthority.envelope, request);
        } catch (error) {
          return json({ ok: false, error: error?.code || error?.message || 'LIVE_INPUT_AUTHORITY_REJECTED' }, 400);
        }
        const runtimeOriginVerified = hasRuntimeOriginCapability(liveAuthority.envelope, request);
        if (!runtimeOriginVerified) {
          return json({ ok: false, error: 'RUNTIME_ORIGIN_CAPABILITY_MISSING' }, 500);
        }
        if (env?.PHASE6_RUNTIME_ORIGIN_AUDIT_ONLY === true) {
          return json({
            ok: true,
            audit_only: true,
            runtime_origin_verified: runtimeOriginVerified,
            diagnostics: buildRuntimeOriginAuditDiagnostics(liveAuthority.envelope, request),
            gate_g_created: false,
            api_requests: 0,
            reports_generated: 0,
          });
        }
        const trustedPayload = {
          ...payload,
          schoolName: liveAuthority.envelope.raw_authority.school,
          grade: liveAuthority.envelope.raw_authority.grade,
          subjectGroup: liveAuthority.envelope.raw_authority.subject_group,
          subject: liveAuthority.envelope.raw_authority.subject,
          taskDescription: liveAuthority.envelope.raw_authority.task_description,
          liveAuthorityEnvelope: liveAuthority.envelope,
          liveAuthoritySeal: liveAuthority.seal,
          phase1Lineage: liveAuthority.phase1Lineage,
          reportGenerationContext: {
            ...(payload.reportGenerationContext || {}),
            liveInputAuthority: liveAuthority
          }
        };
        const input = resolveInput(trustedPayload);
        validateInput(input);
        // A 수행평가 graded on playing the drums or serving a shuttlecock has no report in it. Writing one
        // would cost a use and hand the student a page they cannot submit.
        const scope = resolveReportScope(input);
        if (scope.scope !== SCOPE.REPORT) {
          return json({ ok: false, error: 'NOT_A_REPORT_TASK', scope: scope.scope, message: scope.message }, 422);
        }
        input.collectionKind = resolveCollectionKind(input);
        // What the student already did, read from their upload in the separate step. Sanitised again here
        // because it travels back through the browser between the two calls.
        input.priorWork = trustedPayload?.priorWork ? sanitizeAnalysis(trustedPayload.priorWork) : null;
        // 논술·창작·발표 have nothing for the student to collect, so they keep the one-shot report.
        if (input.collectionKind === COLLECTION.NONE && input.reportStage !== STAGE.COMPLETE) {
          input.reportStage = STAGE.COMPLETE;
        }

        if (env.DB && input.reportStage === STAGE.DRAFT) {
          // Variety is a hint, never a gate: a lookup failure must not stop the report.
          try {
            input.recentCombinations = await recentReportCases(env.DB, input);
          } catch (error) {
            console.error('recent case lookup failed:', error?.message || error);
          }
        }

        const seedPack = await loadSeedPack(env);
        // What shape this kind of task actually takes, from real 평가계획 rather than one fixed outline.
        input.reportShape = pickReportShape(input, seedPack.reportShapeIndex);
        // Where this concept leads next, from our own 종단 축 rather than the model's guess.
        input.careerAxes = matchAxes([input.selectedKeyword, input.keyword, input.selectedConcept, input.subject, input.track], seedPack.axisIndex, 2);
        // 횡단 평가: which second subject this topic can really carry, named from our own bridge data.
        input.crossSubject = pickCrossSubject(input, seedPack.crossSubjectIndex);
    const seedMatch = matchSeed(input, seedPack);
        const prompt = buildPrompt(input, seedMatch, env);

        let result;
        let usage = null;
        let source = 'seed-fallback';

        if (env.OPENAI_API_KEY && String(env.ALLOW_STUB).toLowerCase() === 'false') {
          try {
            ({ result, usage } = await callOpenAIWithRetry(prompt, env, input));
            source = 'openai';
            if (env.DB && input.reportStage === STAGE.DRAFT && result?.combination) {
              try {
                await saveReportCase(env.DB, input, result.combination);
              } catch (error) {
                console.error('case save failed:', error?.message || error);
              }
            }
          } catch (error) {
            result = { ...buildSeedFallbackResult(input, seedMatch), diagnostic: String(error?.message || error).slice(0, 200) };
            source = 'seed-fallback-after-openai-error';
            console.error('OpenAI call failed after retry:', error?.message || error);
          }
        } else {
          result = buildSeedFallbackResult(input, seedMatch);
        }

        return json({
          ok: true,
          source,
          resolved: input,
          phase1Lineage: liveAuthority.phase1Lineage,
          matchedCluster: seedMatch.matchedCluster,
          gradeModifier: seedMatch.gradeModifier,
          patternRule: seedMatch.patternRule,
          promptPreview: prompt.slice(0, 4000),
          usage,
          result,
        });
      }
      if (url.pathname === '/log' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        console.log('log event', body);
        return json({ ok: true });
      }
      return json({ ok: false, error: 'Not found' }, 404);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: error?.message || 'Unknown error' }, 500);
    }
  },
};

function resolveInput(payload) {
  const selection = payload?.mini_payload?.selectionPayload || {};
  const reportContext = payload?.reportGenerationContext || payload?.mini_payload?.reportGenerationContext || {};
  return {
    keyword: String(payload?.keyword || '').trim(),
    grade: String(payload?.grade || '').trim(),
    track: String(payload?.track || '').trim(),
    major: String(payload?.major || '').trim(),
    activityLevel: String(payload?.activityLevel || '미입력').trim(),
    style: String(payload?.style || '미입력').trim(),
    schoolName: String(payload?.schoolName || '').trim(),
    subject: String(payload?.subject || selection.subject || '').trim(),
    subjectGroup: String(payload?.subjectGroup || '').trim(),
    taskDescription: String(payload?.taskDescription || '').trim().slice(0, 6000),
    selectedConcept: String(payload?.selectedConcept || selection.selectedConcept || '').trim(),
    selectedKeyword: String(payload?.selectedKeyword || selection.selectedKeyword || payload?.keyword || '').trim(),
    selectedFollowupAxis: String(payload?.selectedFollowupAxis || selection.selectedFollowupAxis || '').trim(),
    selectedBookTitle: String(payload?.selectedBookTitle || '').trim(),
    useBookInReport: payload?.useBookInReport === true,
    structureId: String(payload?.structureId || '').trim(),
    targetStructure: Array.isArray(payload?.targetStructure) ? payload.targetStructure.map(String).slice(0, 12) : [],
    reportChoices: payload?.report_choices && typeof payload.report_choices === 'object' ? payload.report_choices : {},
    performanceAssessment: payload?.performance_assessment && typeof payload.performance_assessment === 'object'
      ? payload.performance_assessment
      : (reportContext.performanceAssessment || {}),
    reportStage: resolveReportStage(payload),
    studentData: normalizeStudentData(payload?.studentData),
  };
}

// Each grade writes one level above itself (user decision, 2026-09-11): admissions reward work beyond the
// current grade, so 고1 aims at 고2~고3, 고2 at 고3~대학 1학년 and 고3 at university level.
const TARGET_LEVELS = {
  1: { label: '고2~고3 심화 수준', guide: '고2·고3 선택과목(생명과학·화학·물리 등)에서 다루는 개념과 분석까지 끌어와 깊게 쓴다. 대학 과정의 식이나 모델은 뜻을 먼저 설명할 수 있을 때만 쓴다.' },
  2: { label: '고3~대학 1학년 수준', guide: '고3 심화 과목과 대학 1학년 교양 수준의 개념, 정량 분석(평균, 편차, 그래프 해석)까지 쓴다.' },
  3: { label: '대학 교양~전공 기초 수준', guide: '대학 전공 기초의 개념과 분석 방법(모델, 식, 통계적 해석)을 뜻을 밝혀 쓴다.' },
};

function targetLevel(input) {
  const grade = Number(String(input.grade || '').match(/[123]/)?.[0] || 1);
  return TARGET_LEVELS[grade] || TARGET_LEVELS[1];
}

function pickReportPatterns(input, reportSeedIndex) {
  const seeds = Array.isArray(reportSeedIndex?.seeds) ? reportSeedIndex.seeds : [];
  // Topic terms decide relevance; subject and major only rank seeds that already match the topic.
  const topicTerms = [...new Set([input.keyword, input.selectedKeyword, input.selectedConcept, input.selectedFollowupAxis]
    .map(normalize)
    .filter((term) => term.length >= 2))];
  const subject = normalize(input.subject);
  const majorTerms = [input.track, input.major].map(normalize).filter(Boolean);
  const overlaps = (value, term) => value.includes(term) || term.includes(value);
  return seeds.map((seed) => {
    const triggerValues = [...toArray(seed.axisTriggers), ...toArray(seed.sourceKeywords)].map(normalize).filter(Boolean);
    const topicHits = topicTerms.filter((term) => triggerValues.some((value) => overlaps(value, term))).length;
    const subjectHit = Boolean(subject) && toArray(seed.bestForSubjects).map(normalize).some((value) => overlaps(value, subject));
    const majorHit = toArray(seed.bestForMajors).map(normalize).some((value) => majorTerms.some((term) => overlaps(value, term)));
    return { score: topicHits * 5 + (subjectHit ? 2 : 0) + (majorHit ? 1 : 0), topicHits, seed };
  }).filter(({ topicHits }) => topicHits > 0)
    .sort((a, b) => b.score - a.score || String(a.seed.seedId).localeCompare(String(b.seed.seedId)))
    .slice(0, 3)
    .map(({ seed }) => ({
      patternLevel: `${targetLevel(input).label}: 분석 방법까지 참고`,
      patternName: seed.seedName,
      studentFacingLabel: seed.studentFacingLabel,
      corePattern: seed.corePattern,
      problemFrame: seed.problemFrame,
      analysisMethod: seed.analysisMethod,
      avoid: seed.avoid,
    }));
}

// Only objective task evidence reaches the model: no client-generated titles, focus questions,
// scoring internals or worked calculation examples.
function buildAssessmentContext(input) {
  const assessment = input.performanceAssessment || {};
  const connection = assessment.assessmentKeywordConnection || {};
  const cross = connection.cross_axis || connection.crossAxis || {};
  const record = cross.taskMatch?.record || {};
  const constraints = cross.constraints || {};
  const seed = cross.seedMatch?.seed || {};
  const levels = seed.topic?.levels || {};
  const keep = (value) => typeof value === 'string' && value.trim() !== '';
  const strings = (value, limit) => toArray(value).filter(keep).map((value) => value.trim()).slice(0, limit);
  return {
    similarRealTask: record.title ? { title: String(record.title), description: String(record.description || '').slice(0, 300) } : null,
    reportMode: String(assessment.method?.reportMode || ''),
    rubricFocus: strings(constraints.rubricFocus || connection.assessment_route?.rubricFocus, 10),
    requiredOutputs: strings(constraints.requiredOutputs, 6),
    numericConstraints: strings(constraints.numericConstraints, 6),
    cautions: strings(constraints.avoidModes || seed.report?.avoid, 15),
    contentFocus: strings([levels.basic || seed.topic?.basic, levels.intermediate, levels.advanced], 3),
  };
}

// Per-section writing plan: what each section must contain and roughly how long it should be,
// so the model fills every section instead of writing one short essay.
function sectionWritingGuide(title) {
  const text = String(title || '');
  if (/연구 질문|탐구 질문|핵심 질문|문제 제기/.test(text)) return '물음표(?)로 끝나는 질문 1~2개, 이 사례를 고른 이유 2~3문장(수업이나 일상에서 생긴 궁금증으로 쓰고, "나는 ~한 경험이 있다"처럼 입력에 없는 개인 경험을 지어내지 않는다), 무엇을 비교·관찰할지. 250~400자';
  if (/참고|출처/.test(text)) return '참고할 자료의 종류만 목록으로 적고(교과서 단원 등, 지어낸 기관명·보고서명·사이트명 금지), "~에서 확인하였다", "~를 활용했다"처럼 실제로 한 것처럼 쓰지 않는다. 후속 탐구 1~2개와 이유. 150~300자';
  if (/후속|확장/.test(text)) return '이번 탐구의 한계를 보완할 다음 탐구 1~2개와 그 이유. 200~350자';
  if (/선행|이론|배경|개념|자료 검토|원리/.test(text)) return '핵심 개념의 뜻, 원리의 인과 관계, 조건(온도·pH 등)이 미치는 영향, 선택한 사례와의 연결을 세 문단으로. 근거 없는 구체 수치는 쓰지 않는다. 600~800자';
  if (/방법|설계|절차|변인/.test(text)) return '탐구 방식(문헌 조사인지 실험 계획인지), 준비물, 조작·통제·종속 변인, 번호를 붙인 절차, 기록·분석 방법, 안전 주의. 600~800자';
  if (/수집/.test(text)) return '어떤 자료를 어떤 기준으로 모을지 계획으로 쓴다. 실제로 하지 않은 조사를 "확인하였다", "수집하였다"로 쓰지 않는다. 350~500자';
  if (/결과|분석|해석/.test(text)) return '문헌으로 확실히 설명되는 경향과 예상 결과를 구분하고, 비교 기준에 따라 해석한다. 측정값이나 "~도 이상에서" 같은 구체 수치는 지어내지 않는다. 600~800자';
  if (/결론|고찰|정리/.test(text)) return '연구 질문에 대한 직접적인 답, 근거, 한계, 개선점, 탐구하며 생각이 바뀐 점. 450~600자';
  if (/느낀|성찰/.test(text)) return '탐구 전후로 판단이 어떻게 달라졌는지. 입력에 없는 개인 경험은 꾸미지 않는다. 250~400자';
  return '이 절의 역할에 맞는 내용을 두 문단 이상. 400~600자';
}

// The model answers section by section; the site still receives one numbered report text.
// The input never carries the student's own experiences, so a first-person "I have experience of …" sentence is invented.
const INVENTED_EXPERIENCE_SENTENCE = /[^.?!\n]*(?<![가-힣])(?:나는|저는|내가|제가)[^.?!\n]{0,120}(?:경험이 있|경험을 했|경험했|본 적이 있)[^.?!\n]*[.?!]/g;

function removeInventedExperience(body) {
  return String(body || '').replace(INVENTED_EXPERIENCE_SENTENCE, '').trim();
}

function assembleReport(result, { keepExperience = false } = {}) {
  if (Array.isArray(result?.sections) && result.sections.length) {
    const report = result.sections
      .map((section, index) => `${index + 1}. ${String(section?.title || '').trim()}\n${keepExperience ? String(section?.body || '').trim() : removeInventedExperience(section?.body)}`)
      .join('\n\n');
    return { reportTitle: String(result.reportTitle || ''), report };
  }
  return result;
}

// Staged reports also carry what the site needs next: the data template (설계서), the student's tables and charts
// (최종), or the comparison table (문헌형). A student who wrote about a real experience keeps it.
function buildStageResult(stage, parsed, input) {
  const { parsed: finalized, extra } = finalizeStageOutput(stage, parsed, input);
  const studentText = [input.studentData?.reason, input.studentData?.observations, input.studentData?.reflection].join(' ');
  const assembled = assembleReport(finalized, { keepExperience: stage !== STAGE.DRAFT && /경험|본 적/.test(studentText) });
  if (stage === STAGE.COMPLETE) return assembled;
  return {
    ...assembled,
    reportStage: stage,
    sectionTitles: (finalized.sections || []).map((section) => String(section?.title || '').trim()),
    ...extra,
  };
}


// Reading a past 보고서 or a 생활기록부 is a separate action: a student may want the analysis on its own, and it
// is charged on its own. Only the derived structure is stored — never the transcription, never a name.
async function handleAnalyzeUpload(request, env) {
  if (!env.OPENAI_API_KEY) return json({ ok: false, error: "OPENAI_KEY_MISSING" }, 500);
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "UPLOAD_FORM_INVALID" }, 400);
  }
  const files = form.getAll("files").filter((file) => file && typeof file === "object" && "arrayBuffer" in file);
  const problem = checkUpload(files.map((file) => ({ name: file.name, type: file.type, size: file.size })));
  if (problem) return json({ ok: false, error: "UPLOAD_REJECTED", message: problem }, 400);

  let meta = {};
  try {
    meta = JSON.parse(String(form.get("payload") || "{}"));
  } catch {
    meta = {};
  }

  const started = Date.now();
  let read;
  try {
    let axisIndex = null;
    try {
      axisIndex = await loadSeedFile(env, SEED_FILES.axisIndex);
    } catch (error) {
      console.error("axis index unavailable:", error?.message || error);
    }
    meta.matchedAxes = matchAxes([meta?.selectedKeyword, meta?.keyword, meta?.selectedConcept, meta?.subject, meta?.career], axisIndex);
    read = await analyzeUploadWithModel(files, meta, env);
  } catch (error) {
    console.error("upload analysis failed:", error?.message || error);
    return json({ ok: false, error: "UPLOAD_ANALYSIS_FAILED", message: String(error?.message || error).slice(0, 300) }, 502);
  }

  if (env.DB) {
    try {
      await saveUploadAnalysis(env.DB, meta, read.analysis, files);
    } catch (error) {
      console.error("saving the upload analysis failed:", error?.message || error);
    }
  }

  return json({
    ok: true,
    analysis: read.analysis,
    axes: (meta.matchedAxes || []).map((axis) => ({ title: axis.title, subject: axis.subject, next: axis.next })),
    usage: { ...read.usage, seconds: Math.round((Date.now() - started) / 1000), files: files.length },
  });
}

async function analyzeUploadWithModel(files, meta, env) {
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const reasoningModel = /^(gpt-5|o\d)/.test(model);
  const content = [{ type: "input_text", text: analysisPromptLines(meta).join("\n") }];
  for (const file of files) {
    const type = String(file.type || "").toLowerCase();
    // A big file is streamed to the Files API as it is. Turning it into base64 here would cost a third more
    // memory again, and the Worker has 128MB in total.
    if (file.size > UPLOAD_LIMITS.inlineBytes) {
      const fileId = await uploadFileToOpenAI(file, env);
      content.push(type === "application/pdf" ? { type: "input_file", file_id: fileId } : { type: "input_image", file_id: fileId });
      continue;
    }
    const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
    content.push(type === "application/pdf"
      ? { type: "input_file", filename: file.name || "upload.pdf", file_data: `data:application/pdf;base64,${base64}` }
      : { type: "input_image", image_url: `data:${type};base64,${base64}` });
  }

  const properties = analysisSchema();
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      ...(reasoningModel ? { reasoning: { effort: env.OPENAI_REASONING_EFFORT || "medium" } } : { temperature: 0.2 }),
      max_output_tokens: reasoningModel ? 12000 : 6000,
      text: {
        format: {
          type: "json_schema",
          name: "student_upload_analysis",
          schema: { type: "object", additionalProperties: false, required: Object.keys(properties), properties },
        },
      },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || `OpenAI error ${res.status}`);
  // A file with almost no readable text sends the model in circles until it runs out of room. The student gets a
  // sentence they can act on, not a JSON parse error.
  if (body?.status === "incomplete") throw new Error("자료에서 읽을 내용을 찾지 못했어요. 글자가 선명하게 보이는 파일인지 확인하고 다시 올려 주세요.");
  const message = (body?.output || []).find((item) => item?.type === "message") || body?.output?.[0];
  const text = message?.content?.find((part) => part?.type === "output_text")?.text || message?.content?.[0]?.text || body?.output_text;
  if (!text) throw new Error("자료를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${error.message}; status=${body?.status || ""} ${body?.incomplete_details?.reason || ""}; tail=${text.slice(-120)}`);
  }
  return {
    analysis: sanitizeAnalysis(parsed),
    usage: {
      model: String(body?.model || model),
      input_tokens: Number(body?.usage?.input_tokens || 0),
      output_tokens: Number(body?.usage?.output_tokens || 0),
      reasoning_tokens: Number(body?.usage?.output_tokens_details?.reasoning_tokens || 0),
    },
  };
}

async function uploadFileToOpenAI(file, env) {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", file, file.name || "upload");
  const res = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });
  const body = await res.json();
  if (!res.ok || !body?.id) throw new Error(body?.error?.message || `파일을 올리지 못했습니다 (${res.status})`);
  return body.id;
}

// btoa works on binary strings only, and a whole PDF at once overflows the argument list.
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

async function ensureUploadTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS student_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_name TEXT NOT NULL,
      grade TEXT,
      doc_type TEXT NOT NULL,
      subject_guess TEXT,
      level TEXT,
      analysis TEXT NOT NULL,
      file_count INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function saveUploadAnalysis(db, meta, analysis, files) {
  await ensureUploadTable(db);
  await db.prepare(`
    INSERT INTO student_uploads (school_name, grade, doc_type, subject_guess, level, analysis, file_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    String(meta?.schoolName || "").slice(0, 80),
    String(meta?.grade || "").slice(0, 10),
    analysis.docType,
    analysis.subjectGuess,
    analysis.level,
    JSON.stringify(analysis),
    files.length,
  ).run();
}

// Class-level variety: each draft's case is remembered per school+task, and the recent ones are shown to the next
// student so the engine picks a different combination on its own. A student is never asked, and never blocked.
async function ensureReportCaseTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS report_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      school_name TEXT,
      task_key TEXT,
      case_tag TEXT,
      variable_tag TEXT,
      measure_tag TEXT
    )
  `).run();
}

const taskKeyOf = (input) => String(input.taskDescription || '').replace(/\s+/g, ' ').trim().slice(0, 200);

async function recentReportCases(db, input) {
  await ensureReportCaseTable(db);
  const rows = await db.prepare(`
    SELECT case_tag, variable_tag, measure_tag FROM report_cases
    WHERE school_name = ? AND task_key = ? AND created_at >= datetime('now', '-120 days')
    ORDER BY id DESC LIMIT 12
  `).bind(input.schoolName, taskKeyOf(input)).all();
  return (rows?.results || [])
    .map((row) => [row.case_tag, row.variable_tag, row.measure_tag].filter(Boolean).join(' | '))
    .filter(Boolean);
}

async function saveReportCase(db, input, combination) {
  if (!combination?.caseTag) return;
  await ensureReportCaseTable(db);
  await db.prepare('INSERT INTO report_cases (school_name, task_key, case_tag, variable_tag, measure_tag) VALUES (?, ?, ?, ?, ?)')
    .bind(input.schoolName, taskKeyOf(input), combination.caseTag, combination.variableTag || '', combination.measureTag || '')
    .run();
}

function validateInput(input) {
  for (const key of REQUIRED_INPUTS) {
    if (!input[key]) {
      throw new Error(`Missing required input: ${key}`);
    }
  }
}

async function loadSeedFile(env, file) {
  const base = env.SEED_BASE_URL || DEFAULT_SEED_BASE;
  const res = await fetch(`${base}/${file}`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`Failed to load seed file: ${file} (${res.status})`);
  return res.json();
}

async function loadSeedPack(env) {
  const base = env.SEED_BASE_URL || DEFAULT_SEED_BASE;
  const entries = await Promise.all(
    Object.entries(SEED_FILES).map(async ([key, file]) => {
      const url = `${base}/${file}`;
      const res = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (!res.ok) {
        throw new Error(`Failed to load seed file: ${file} (${res.status})`);
      }
      return [key, await res.json()];
    })
  );
  return Object.fromEntries(entries);
}

function matchSeed(input, seedPack) {
  const matchedCluster = findMatchedCluster(input, seedPack.keywordClusterBridge);
  const gradeModifier = findGradeModifier(input.grade, seedPack.admissionGradeModifiers);
  const patternRule = findPatternRule(input, matchedCluster, seedPack.admissionPatternRules);

  return { matchedCluster, gradeModifier, patternRule, seedPack };
}

function findMatchedCluster(input, bridge) {
  const keyword = normalize(input.keyword);
  const track = normalize(input.track);
  const major = normalize(input.major);

  const candidates = flattenAny(bridge);
  for (const item of candidates) {
    const hay = [
      item.keyword,
      ...(toArray(item.keywords)),
      item.cluster,
      item.track,
      item.major,
      ...(toArray(item.majors)),
      ...(toArray(item.aliases)),
    ]
      .filter(Boolean)
      .map(normalize);

    const keywordHit = hay.some((v) => v && (v.includes(keyword) || keyword.includes(v)));
    if (!keywordHit) continue;

    const trackFields = [item.track, ...(toArray(item.tracks))].filter(Boolean).map(normalize);
    const majorFields = [item.major, ...(toArray(item.majors))].filter(Boolean).map(normalize);

    const trackOk = !trackFields.length || trackFields.some((v) => v.includes(track) || track.includes(v));
    const majorOk = !majorFields.length || majorFields.some((v) => v.includes(major) || major.includes(v));

    if (trackOk || majorOk) {
      return item;
    }
  }

  return candidates.find((item) => {
    const keys = [item.keyword, ...(toArray(item.keywords))].filter(Boolean).map(normalize);
    return keys.some((v) => v && (v.includes(keyword) || keyword.includes(v)));
  }) || null;
}

function findGradeModifier(grade, gradeData) {
  const flattened = flattenAny(gradeData);
  return (
    flattened.find((item) => normalize(item.grade) === normalize(grade)) ||
    flattened.find((item) => normalize(item.key) === normalize(grade)) ||
    flattened.find((item) => normalize(item.level) === normalize(grade)) ||
    null
  );
}

function findPatternRule(input, matchedCluster, patternData) {
  const flattened = flattenAny(patternData);
  const keyword = normalize(input.keyword);
  const track = normalize(input.track);
  const major = normalize(input.major);
  const clusterName = normalize(
    matchedCluster?.cluster || matchedCluster?.clusterName || matchedCluster?.track || matchedCluster?.major || ''
  );

  return (
    flattened.find((item) => {
      const keys = [item.keyword, ...(toArray(item.keywords))].filter(Boolean).map(normalize);
      const clusters = [item.cluster, item.clusterName, ...(toArray(item.clusters))].filter(Boolean).map(normalize);
      const tracks = [item.track, ...(toArray(item.tracks))].filter(Boolean).map(normalize);
      const majors = [item.major, ...(toArray(item.majors))].filter(Boolean).map(normalize);

      const keywordHit = !keys.length || keys.some((v) => v.includes(keyword) || keyword.includes(v));
      const clusterHit = !clusters.length || clusters.some((v) => v.includes(clusterName) || clusterName.includes(v));
      const trackHit = !tracks.length || tracks.some((v) => v.includes(track) || track.includes(v));
      const majorHit = !majors.length || majors.some((v) => v.includes(major) || major.includes(v));
      return keywordHit && clusterHit && (trackHit || majorHit);
    }) || null
  );
}

function buildPrompt(input, seedMatch, env) {
  const { matchedCluster, gradeModifier, patternRule, seedPack } = seedMatch;
  const reportPatterns = pickReportPatterns(input, seedPack.reportSeedIndex);
  const stage = input.reportStage || STAGE.COMPLETE;
  const level = targetLevel(input);
  const hasStudentVoice = [input.studentData?.reason, input.studentData?.observations, input.studentData?.reflection].some(Boolean);
  const requestedSections = stageSections(stage, input) || (input.targetStructure.length
    ? input.targetStructure
    : ['연구 질문', '이론적 배경 및 자료 검토', '탐구 방법', '탐구 결과 및 분석', '결론', '참고문헌 및 후속 탐구']);
  const domainGuardrails = /효소/.test(`${input.taskDescription} ${input.selectedConcept} ${input.selectedKeyword}`)
    ? [
        '효소의 기질 특이성과 반응 활성을 막연한 정확성이라는 말로 바꾸지 않는다.',
        '온도 상승은 활성화 에너지 자체를 바꾸지 않고, 활성화 에너지 이상의 에너지를 가진 입자의 비율과 충돌 빈도를 높인다. 최적 온도를 넘으면 효소 단백질이 변성되어 활성이 떨어진다.',
        'Km이 언제나 최적 pH에서 최소가 된다고 단정하지 않는다.',
        '입력에 실제 실험값이 없으면 특정 효소의 Km, Vmax 수치를 제시하지 않는다.',
        '세탁·얼룩 사례라면 뜨거운 물의 영향을 효소 변성만으로 설명하지 말고, 얼룩 속 단백질이 열로 응고해 섬유에 달라붙을 가능성도 함께 검토한다.',
        '입력에 실제 실험값이 없으면 특정 효소의 최적 온도·pH 같은 수치를 사실처럼 제시하지 않는다.',
        '실생활 사례는 하나만 골라 탐구 전체에 일관되게 연결한다. 소화, 발효 식품, 과일 갈변, 육류 연화, 상처 치료·진단, 세척 등 서로 다른 분야가 모두 가능하므로 가장 먼저 떠오르는 사례에 머무르지 않는다.',
      ]
    : [];
  const prompt = [
    '너는 고등학생이 학교에 제출할 수 있는 완성형 수행평가 탐구보고서를 작성하는 전문 편집자다.',
    '반드시 자연스러운 한국어로 쓰고, 학생이 직접 탐구하고 이해한 문체를 사용한다.',
    `이 보고서의 목표 수준은 ${level.label}이다. ${input.grade || '고등학교'} 학생이 한 단계 위 수준까지 파고든 보고서로 쓴다. ${level.guide}`,
    `출력은 JSON만 반환하며 ${stageOutputKeys(stage, input)} 키만 사용한다. sections에는 요청한 절을 순서대로 {title, body} 하나씩 담는다.`,
    '각 절의 body는 요약, 작성 안내, 개요가 아니라 그 절의 완성된 본문이어야 하며, 절끼리 이어 읽으면 하나의 완성 보고서가 된다.',
    '각 절은 제목만 채우지 말고 구체적인 교과 원리, 탐구 절차, 비교 기준, 해석과 한계를 충분히 설명한다.',
    '교과서 개념에서 출발해 목표 수준의 개념과 분석으로 깊게 들어가되, 문장은 분명하게 쓴다.',
    '전문 용어와 영어 표현을 과시하듯 나열하지 말고 꼭 필요한 용어만 먼저 쉬운 말로 설명한다.',
    '실생활 사례는 여러 개를 얕게 나열하지 말고 연구 질문에 맞는 대표 사례 하나를 선택하여 처음부터 결론까지 유지한다.',
    '사례는 누구나 가장 먼저 떠올리는 것(예: 세탁 세제)을 기본값으로 삼지 않는다. 같은 안내문을 받은 다른 학생과 겹치기 쉬우므로, careerTrack과 subject, selectedConcept에 자연스럽게 이어지는 사례를 고르고 대상과 조건까지 구체적으로 좁힌다.',
    '개인 경험, 관찰, 실험 수행을 입력에서 확인할 수 없으면 학생이 실제로 했다고 꾸며 쓰지 않는다.',
    ...(hasStudentVoice ? [] : ['입력에는 학생의 개인 경험이 없으므로, "나는 평소에 ~해 본 경험이 있다"처럼 학생 개인의 경험·습관을 쓰지 않는다. 주제를 고른 이유는 "수업에서 ~를 배우며 궁금해졌다", "일상에서 흔히 쓰이는 ~"처럼 일반적인 궁금증으로만 쓴다.']),
    '같은 문장이나 수행평가 문구를 여러 절에 반복하지 않는다.',
    '입력에 실험 측정값이 없으면 측정값이나 관찰 결과를 지어내지 않는다. 대신 문헌 근거와 재현 가능한 실험 설계, 예상되는 해석 기준을 명확히 구분한다.',
    '참고문헌은 입력에 제공되었거나 생성 데이터에서 정확히 확인된 자료만 서지사항으로 적는다.',
    '확인되지 않은 저자, 책 제목, 연도, 기관 데이터베이스명, URL을 절대 만들지 않는다. 확인된 서지가 없으면 통합과학1 교과서의 관련 단원처럼 자료 종류만 정직하게 적는다.',
    '연결 도서를 사용하지 않기로 한 경우 도서명과 독서 내용을 절대 넣지 않는다.',
    '학과명은 탐구 동기나 확장 가능성에서만 절제해 사용하고 본론을 장식하는 단어로 반복하지 않는다.',
    stage === STAGE.COMPLETE
      ? '분량은 공백 포함 2800~4200자다. 2800자보다 짧게 끝내지 않으며, 연구 질문과 참고문헌을 뺀 각 절은 두 문단 이상, 400자 이상으로 쓴다. 절마다 서로 다른 역할을 수행한다.'
      : stageLengthRule(stage),
    '',
    '[학생 입력 및 수행평가 계약]',
    JSON.stringify({
      school: input.schoolName,
      grade: input.grade,
      subject: input.subject,
      subjectGroup: input.subjectGroup,
      taskDescription: input.taskDescription,
      selectedConcept: input.selectedConcept,
      selectedKeyword: input.selectedKeyword || input.keyword,
      selectedFollowupAxis: input.selectedFollowupAxis,
      targetLevel: level.label,
      careerTrack: input.track,
      majorInterest: input.major,
      connectedBook: input.useBookInReport ? input.selectedBookTitle : '사용하지 않음',
      structureId: input.structureId,
      requiredSections: requestedSections,
      reportChoices: input.reportChoices,
      assessmentContext: buildAssessmentContext(input),
    }, null, 2),
    '',
    '[교과·생성 데이터 매칭 결과]',
    JSON.stringify({
      matchedCluster,
      gradeModifier,
      patternRule,
      reportPatterns,
      domainGuardrails,
    }, null, 2),
    '',
    '[작성 지침]',
    `- reportTitle: 20~35자 안팎의 자연스러운 명사구. 수행평가 문장을 잘라 붙이지 말고, 선택한 사례와 탐구 대상이 드러나게 쓴다.`,
    '- assessmentContext.rubricFocus는 채점 요소다. 이 단어들을 보고서의 주제나 핵심 개념으로 쓰지 않는다.',
    '- assessmentContext.cautions는 틀리기 쉬운 부분이다. 문장을 그대로 옮기지 말고 내용으로 지킨다.',
    '- sections: 아래 절을 이 순서대로 하나씩 쓴다. title에는 절 제목만, body에는 본문만 쓰고 #, ## 같은 Markdown 기호나 절 번호는 넣지 않는다. 각 절의 내용과 분량은 다음 계획을 따른다.',
    ...requestedSections.map((title, index) => `  ${index + 1}. ${title}: ${stageSectionGuide(title, stage, input.collectionKind) || sectionWritingGuide(title)}`),
    '- 연구 질문 절은 물음표(?)로 끝나는 짧은 질문 1~2개로 쓰고, 비교 조건과 관찰 대상을 분명히 한다. "~을 탐구한다"처럼 서술문으로 쓰지 않는다.',
    '- 이론적 배경은 핵심 용어 정의에 그치지 말고 원리와 인과 관계를 설명한다.',
    '- 탐구 방법은 준비물·변인 통제·절차·기록 방법·안전 주의를 재현 가능하게 쓴다.',
    '- 결과 및 분석은 입력에 실제 데이터가 있는 경우에만 그 값을 분석한다. 데이터가 없으면 문헌에서 확실히 설명되는 경향, 예상 결과, 실제 측정 후 적용할 분석법을 서로 구분해 쓴다.',
    '- reportPatterns는 다른 주제의 우수 보고서에서 뽑은 사고 흐름 예시다. 그 보고서의 주제, 사례, 수치, 고유명사는 가져오지 않는다.',
    '- reportPatterns의 분석 방법은 목표 수준에 맞게 뜻을 먼저 설명한 뒤 활용한다.',
    '',
    ...priorWorkPromptLines(input.priorWork, sharesGround(input.priorWork, input)),
    ...shapePromptLines(input.reportShape),
    ...crossSubjectPromptLines(input.crossSubject, stage),
    ...careerAxisPromptLines(input.careerAxes),
    '',
    '[깊이 기준]',
    '- 원리는 구체적인 물질과 반응 수준까지 설명한다. 예: 어떤 효소가 어떤 결합을 끊는지, 대상(얼룩, 음식 등)이 어떤 성분으로 되어 있는지, 조건이 효소와 대상 각각에 어떤 영향을 주는지.',
    '- 결과는 한 가지 원인으로 끝내지 않는다. 다른 가능한 설명을 최소 1개 검토하고, 데이터가 어느 쪽을 더 지지하는지 따진다.',
    '- 반복 측정 사이의 차이와 측정 방법의 한계가 결론의 신뢰도에 주는 영향을 쓴다.',
    '- 선택한 계열(careerTrack)의 관점으로 탐구를 한 단계 확장한다. 학과명을 나열하지 말고, 그 분야에서 이 결과가 어떤 문제나 기술과 연결되는지 쓴다.',
    '- 교과서나 일반 과학 지식으로 확립된 사실(예: 단백질은 가열하면 응고한다)은 자신 있게 쓴다. 특정 수치, 논문 결과, 기업·제품명, 출처는 지어내지 않는다.',
    '- 결론은 연구 질문에 직접 답하고 근거, 한계, 개선점을 함께 제시한다.',
    '- 확인하지 않은 내용을 확인하였다, 관찰하였다, 증명하였다라고 쓰지 않는다.',
    '- 입력에 근거 자료가 없으면 온도·pH·시간·비율 같은 구체적 수치를 문헌 사실처럼 쓰지 않고 "적당한 온도", "너무 높은 온도"처럼 쓴다. 실험 계획에서 학생이 스스로 정하는 조건값(예: 두 가지 물 온도)은 계획으로 밝히고 쓸 수 있다.',
    '- 메타 표현(보고서를 작성한다, 형태가 드러나도록 한다), 빈칸, 학생 입력 필요, 임의의 복수 산출물 나열을 쓰지 않는다.',
    ...(stage === STAGE.COMPLETE ? [] : ['', ...stagePromptLines(stage, input)]),
  ];

  return prompt.join('\n');
}

// One retry: a single transient model or parsing error should not cost the student a failed report.
async function callOpenAIWithRetry(prompt, env, input) {
  try {
    return await callOpenAI(prompt, env, input);
  } catch (error) {
    console.error('OpenAI call failed, retrying once:', error?.message || error);
    return callOpenAI(prompt, env, input);
  }
}

async function callOpenAI(prompt, env, input = {}) {
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const stage = input.reportStage || STAGE.COMPLETE;
  const stageProperties = stageSchemaProperties(stage, input);
  // Reasoning models (gpt-5 family, o-series) reject temperature and spend part of the output budget on reasoning.
  const reasoningModel = /^(gpt-5|o\d)/.test(model);
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      ...(reasoningModel ? { reasoning: { effort: env.OPENAI_REASONING_EFFORT || 'medium' } } : { temperature: 0.4 }),
      max_output_tokens: reasoningModel ? 20000 : 8000,
      text: {
        format: {
          type: 'json_schema',
          name: 'admission_engine_output',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['reportTitle', 'sections'].concat(Object.keys(stageProperties)),
            properties: {
              reportTitle: { type: 'string', minLength: 8 },
              sections: {
                type: 'array',
                minItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['title', 'body'],
                  properties: {
                    title: { type: 'string' },
                    body: { type: 'string', minLength: 150 },
                  },
                },
              },
              ...stageProperties,
            },
          },
        },
      },
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `OpenAI error ${res.status}`);
  }

  // A reasoning model puts a reasoning item before the message; read the message's output text.
  const message = (body?.output || []).find((item) => item?.type === 'message') || body?.output?.[0];
  const content = message?.content?.find((part) => part?.type === 'output_text')?.text || message?.content?.[0]?.text || body?.output_text;
  if (!content) {
    throw new Error('OpenAI response did not include output text');
  }
  // A cut-off answer (status "incomplete") fails to parse; keep the reason and the tail for the diagnostic.
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`${error.message}; status=${body?.status || ''} ${body?.incomplete_details?.reason || ''}; tail=${content.slice(-120)}`);
  }
  return {
    result: buildStageResult(stage, parsed, input),
    usage: {
      model: String(body?.model || model),
      input_tokens: Number(body?.usage?.input_tokens || 0),
      output_tokens: Number(body?.usage?.output_tokens || 0),
      reasoning_tokens: Number(body?.usage?.output_tokens_details?.reasoning_tokens || 0),
    },
  };
}

function buildSeedFallbackResult(input, seedMatch) {
  const { matchedCluster, gradeModifier, patternRule, seedPack } = seedMatch;
  const reasonBits = pickBlocks(seedPack.reasonBlocks, input, 3);
  const stepBits = pickBlocks(seedPack.stepBlocks, input, 5);
  const flowBits = pickBlocks(seedPack.flowBlocks, input, 5);
  const extBits = pickBlocks(seedPack.extensionBlocks, input, 2);
  const warnBits = pickBlocks(seedPack.warningBlocks, input, 3);

  const subjectLinks = unique([
    ...toArray(matchedCluster?.subjects),
    ...toArray(patternRule?.subjects),
    ...inferSubjects(input),
  ]).slice(0, 5);

  return {
    reason: compactJoin([
      `${input.keyword}는 ${input.track} 계열과 연결하기 좋고, ${input.grade} 수준에서 탐구 흐름을 잡기 쉬운 주제입니다.`,
      reasonBits[0],
      gradeModifier?.summary || gradeModifier?.description || reasonBits[1],
    ]),
    steps: unique([
      ...stepBits,
      '자료를 바탕으로 자신의 전공 관심과 연결해 해석한다.',
    ]).slice(0, 5),
    flow: unique([
      ...flowBits,
      patternRule?.flow,
      patternRule?.structure,
    ]).filter(Boolean).slice(0, 5),
    recommendedApproach: compactJoin([
      `${input.grade}에서는 ${input.style === '미입력' ? '비교·분석 중심' : input.style + ' 중심'}으로 접근하는 것이 가장 안정적입니다.`,
      matchedCluster?.recommendedApproach || patternRule?.recommendedApproach,
    ]),
    extension: compactJoin([
      extBits[0] || `${input.major}와 연결되는 실제 사례를 한 단계 더 붙이면 결과의 완성도가 높아집니다.`,
      extBits[1],
    ]),
    subjectLinks,
    warnings: unique([
      ...warnBits,
      `${input.grade} 수준을 넘는 과도한 대학 전공 이론은 피한다.`,
    ]).slice(0, 4),
  };
}

function pickBlocks(seed, input, count) {
  const flat = flattenAny(seed);
  const keyword = normalize(input.keyword);
  const track = normalize(input.track);
  const major = normalize(input.major);

  const scored = flat
    .map((item) => ({ item, score: scoreBlock(item, keyword, track, major) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0 || !hasAnyMeta(x.item));

  const selected = (scored.length ? scored : flat.map((item) => ({ item, score: 0 })))
    .slice(0, count)
    .map(({ item }) => extractBlockText(item))
    .filter(Boolean);

  return unique(selected);
}

function scoreBlock(item, keyword, track, major) {
  let score = 0;
  const keys = [item.keyword, ...(toArray(item.keywords))].filter(Boolean).map(normalize);
  const tracks = [item.track, ...(toArray(item.tracks))].filter(Boolean).map(normalize);
  const majors = [item.major, ...(toArray(item.majors))].filter(Boolean).map(normalize);

  if (!keys.length && !tracks.length && !majors.length) score += 1;
  if (keys.some((v) => v.includes(keyword) || keyword.includes(v))) score += 5;
  if (tracks.some((v) => v.includes(track) || track.includes(v))) score += 3;
  if (majors.some((v) => v.includes(major) || major.includes(v))) score += 2;
  return score;
}

function hasAnyMeta(item) {
  return Boolean(item?.keyword || item?.keywords || item?.track || item?.tracks || item?.major || item?.majors);
}

function extractBlockText(item) {
  if (typeof item === 'string') return item;
  return (
    item?.text ||
    item?.block ||
    item?.content ||
    item?.value ||
    item?.description ||
    item?.message ||
    item?.summary ||
    null
  );
}

function inferSubjects(input) {
  const keyword = normalize(input.keyword);
  const major = normalize(input.major);
  const track = normalize(input.track);

  const results = [];
  if (keyword.includes('배터리') || keyword.includes('이차전지') || keyword.includes('반도체')) {
    results.push('물리', '화학', '정보');
  }
  if (keyword.includes('유전자') || keyword.includes('의학') || keyword.includes('간호')) {
    results.push('생명과학', '화학', '생활과 윤리');
  }
  if (keyword.includes('언어') || keyword.includes('다문화')) {
    results.push('국어', '사회', '영어');
  }
  if (major.includes('공학') || track.includes('이공')) {
    results.push('수학', '물리');
  }
  return unique(results);
}

function flattenAny(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.flatMap(flattenAny);
  if (typeof data === 'object') {
    const values = Object.values(data);
    if (values.every((v) => typeof v !== 'object' || v === null)) return [data];
    return [data, ...values.flatMap(flattenAny)];
  }
  return [data];
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function compactJoin(items) {
  return items.filter(Boolean).join(' ');
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function json(data, status = 200) {
  return withCors(
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  );
}

function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}


async function parseCollectRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const payloadRaw = String(form.get('payload') || '{}');
    let payload = {};
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      payload = {};
    }

    return {
      payload,
      files: [
        ...extractFiles(form, 'past_report_files', 'past_report'),
        ...extractFiles(form, 'record_files', 'student_record'),
      ],
    };
  }

  const payload = await request.json().catch(() => ({}));
  return { payload, files: [] };
}

function extractFiles(form, key, uploadType) {
  return form
    .getAll(key)
    .filter((file) => file && typeof file === 'object' && 'name' in file)
    .map((file) => ({
      upload_type: uploadType,
      filename: file.name || '',
      mime_type: file.type || '',
      file_size: Number(file.size || 0),
    }));
}

function normalizeCollectPayload(requestData) {
  const payload = requestData?.payload || {};
  const student = payload.student_input || {};

  const sourceSummary = payload.source_materials || {};
  const uploadFiles = Array.isArray(requestData?.files) ? requestData.files : [];
  const sourceFiles = Array.isArray(sourceSummary.files) ? sourceSummary.files : [];
  const mergedFiles = [...sourceFiles, ...uploadFiles];

  return {
    session_id:
      clean(payload.session_id) ||
      clean(student.session_id) ||
      `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    collected_at: clean(payload.collected_at) || new Date().toISOString(),
    school_name: clean(student.school_name || payload.school_name),
    grade: clean(student.grade || payload.grade),
    subject: clean(student.subject || payload.subject),

    activity_type: clean(student.activity_area || payload.activity_type),
    output_type: clean(student.output_goal || payload.output_type),
    length_pref: clean(student.length_level || payload.length_pref),
    work_mode: clean(student.work_style || payload.work_mode),

    task_name: clean(student.task_name || payload.task_name),
    task_type: clean(student.task_type || payload.task_type),
    usage_purpose: clean(student.usage_purpose || payload.usage_purpose),
    task_description: clean(student.task_description || payload.task_description),

    career: clean(student.career || payload.career),
    link_track: clean(student.linked_track || payload.link_track),
    concept: clean(student.selected_concept || payload.concept),
    keyword: clean(student.selected_keyword || payload.keyword),
    selected_book: clean(student.selected_book_title || payload.selected_book),

    report_mode: clean(student.report_mode || payload.report_mode),
    report_view: clean(student.report_view || payload.report_view),
    report_line: clean(student.report_line || payload.report_line),

    extra_notes: clean(student.student_seed || payload.extra_notes),
    teacher_notes: clean(student.teacher_focus || payload.teacher_notes),

    constraint_flags_json: JSON.stringify(payload.constraint_flags || {}),
    upload_summary_json: JSON.stringify({
      files: mergedFiles,
      source_goals: sourceSummary.source_goals || [],
      source_goal_labels: sourceSummary.source_goal_labels || [],
    }),
    mini_payload_json: JSON.stringify(payload.mini_payload || {}),
    raw_payload_json: JSON.stringify(payload || {}),
  };
}

async function ensureEngineTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS engine_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      school_name TEXT,
      grade TEXT,
      subject TEXT,

      activity_type TEXT,
      output_type TEXT,
      length_pref TEXT,
      work_mode TEXT,

      task_name TEXT,
      task_type TEXT,
      usage_purpose TEXT,
      task_description TEXT,

      career TEXT,
      link_track TEXT,
      concept TEXT,
      keyword TEXT,
      selected_book TEXT,

      report_mode TEXT,
      report_view TEXT,
      report_line TEXT,

      extra_notes TEXT,
      teacher_notes TEXT,

      constraint_flags_json TEXT,
      upload_summary_json TEXT,
      mini_payload_json TEXT,
      raw_payload_json TEXT
    )
  `).run();
}

async function insertEngineSession(db, row) {
  return db.prepare(`
    INSERT INTO engine_sessions (
      session_id,
      created_at,
      school_name,
      grade,
      subject,
      activity_type,
      output_type,
      length_pref,
      work_mode,
      task_name,
      task_type,
      usage_purpose,
      task_description,
      career,
      link_track,
      concept,
      keyword,
      selected_book,
      report_mode,
      report_view,
      report_line,
      extra_notes,
      teacher_notes,
      constraint_flags_json,
      upload_summary_json,
      mini_payload_json,
      raw_payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    row.session_id,
    row.collected_at,
    row.school_name,
    row.grade,
    row.subject,
    row.activity_type,
    row.output_type,
    row.length_pref,
    row.work_mode,
    row.task_name,
    row.task_type,
    row.usage_purpose,
    row.task_description,
    row.career,
    row.link_track,
    row.concept,
    row.keyword,
    row.selected_book,
    row.report_mode,
    row.report_view,
    row.report_line,
    row.extra_notes,
    row.teacher_notes,
    row.constraint_flags_json,
    row.upload_summary_json,
    row.mini_payload_json,
    row.raw_payload_json
  ).run();
}

function clean(value) {
  return String(value || '').trim();
}
