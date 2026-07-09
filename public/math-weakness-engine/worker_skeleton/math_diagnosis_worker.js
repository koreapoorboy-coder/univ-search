const SERVICE_NAME = 'math-diagnosis-worker';
const VERSION = '2026.07.08-patch10-material-purpose-concept-review';
const DEFAULT_MODEL = 'gpt-5.5';
const DEFAULT_REASONING_EFFORT = 'xhigh';
const DEFAULT_MAX_OUTPUT_TOKENS = 25000;
const DEFAULT_MAX_FILE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_FILE_BYTES = 18 * 1024 * 1024;
const DEFAULT_MAX_FILES = 6;
const OPENAI_RESPONSES_PATH = '/responses';

export default {
  async fetch(request, env, ctx) {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return withCors(request, env, new Response(null, { status: 204 }));

      if (url.pathname === '/' && request.method === 'GET') {
        return json(request, env, {
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          message: 'Math diagnosis worker is running. Use /health, /config, or /api/math-diagnose/* endpoints.'
        }, 200, requestId, startedAt);
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return json(request, env, {
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
          mode: env.ENGINE_MODE || 'production',
          model: env.OPENAI_MODEL || DEFAULT_MODEL,
          reasoningEffort: env.OPENAI_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
          stubMode: isStubMode(env),
          cors: corsMode(env),
          maxFiles: numberEnv(env.MAX_FILES, DEFAULT_MAX_FILES),
          maxFileBytes: numberEnv(env.MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES),
          maxTotalFileBytes: numberEnv(env.MAX_TOTAL_FILE_BYTES, DEFAULT_MAX_TOTAL_FILE_BYTES)
        }, 200, requestId, startedAt);
      }

      if (url.pathname === '/config' && request.method === 'GET') {
        return json(request, env, {
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          model: env.OPENAI_MODEL || DEFAULT_MODEL,
          mode: env.ENGINE_MODE || 'production',
          stubMode: isStubMode(env),
          fallbackOnOpenAIError: boolEnv(env.FALLBACK_ON_OPENAI_ERROR, true),
          maxOutputTokens: numberEnv(env.OPENAI_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS),
          reasoningEffort: env.OPENAI_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
          endpoints: [
            'GET /health',
            'GET /config',
            'POST /api/math-diagnose/analyze',
            'POST /api/math-diagnose/generate-verification',
            'POST /api/math-diagnose/review-verification',
            'POST /api/math-diagnose/final-report'
          ]
        }, 200, requestId, startedAt);
      }

      if (url.pathname === '/api/math-diagnose/analyze' && request.method === 'POST') {
        const { payload, files } = await parseHybridRequest(request, env);
        const prompt = buildAnalyzePrompt(payload, files);
        const result = await runJsonTask({ env, task: 'analyze', prompt, files, schemaName: 'math_ai_extraction', schema: AI_EXTRACTION_SCHEMA, fallback: () => buildAnalyzeFallback(payload, 'analyze_fallback') });
        return json(request, env, attachMeta(result, requestId, 'analyze'), 200, requestId, startedAt);
      }

      if (url.pathname === '/api/math-diagnose/generate-verification' && request.method === 'POST') {
        const payload = await safeJson(request);
        const prompt = buildVerificationPrompt(payload);
        const result = await runJsonTask({ env, task: 'generate_verification', prompt, files: [], schemaName: 'math_verification_questions', schema: VERIFICATION_QUESTION_SCHEMA, fallback: () => buildVerificationFallback(payload) });
        return json(request, env, attachMeta(result, requestId, 'generate_verification'), 200, requestId, startedAt);
      }

      if (url.pathname === '/api/math-diagnose/review-verification' && request.method === 'POST') {
        const { payload, files } = await parseHybridRequest(request, env);
        const prompt = buildReviewPrompt(payload, files);
        const result = await runJsonTask({ env, task: 'review_verification', prompt, files, schemaName: 'math_verification_answer_review', schema: ANSWER_REVIEW_SCHEMA, fallback: () => buildAnswerReviewFallback(payload) });
        return json(request, env, attachMeta(result, requestId, 'review_verification'), 200, requestId, startedAt);
      }

      if (url.pathname === '/api/math-diagnose/final-report' && request.method === 'POST') {
        const payload = await safeJson(request);
        const prompt = buildFinalReportPrompt(payload);
        const result = await runJsonTask({ env, task: 'final_report', prompt, files: [], schemaName: 'math_final_report', schema: FINAL_REPORT_SCHEMA, fallback: () => buildFinalReportFallback(payload) });
        return json(request, env, attachMeta(result, requestId, 'final_report'), 200, requestId, startedAt);
      }

      return json(request, env, { ok: false, error: 'Not found', path: url.pathname }, 404, requestId, startedAt);
    } catch (error) {
      console.error(`[${requestId}]`, error);
      return json(request, env, {
        ok: false,
        error: error?.message || 'Unknown error',
        error_type: error?.name || 'Error'
      }, error?.status || 500, requestId, startedAt);
    }
  }
};

async function parseHybridRequest(request, env) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const payloadRaw = String(form.get('payload') || '{}');
    let payload;
    try { payload = JSON.parse(payloadRaw); } catch { throw httpError(400, 'payload must be valid JSON'); }
    const files = [];
    for (const [key, value] of form.entries()) {
      if (isFile(value)) files.push(value);
    }
    validateFiles(files, env);
    return { payload, files };
  }
  return { payload: await safeJson(request), files: [] };
}

async function safeJson(request) {
  try { return await request.json(); }
  catch { throw httpError(400, 'Request body must be JSON'); }
}

function isFile(value) {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && typeof value.name === 'string';
}

function validateFiles(files, env) {
  const maxFiles = numberEnv(env.MAX_FILES, DEFAULT_MAX_FILES);
  const maxFileBytes = numberEnv(env.MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES);
  const maxTotalBytes = numberEnv(env.MAX_TOTAL_FILE_BYTES, DEFAULT_MAX_TOTAL_FILE_BYTES);
  const allowed = String(env.ALLOWED_FILE_TYPES || 'application/pdf,image/png,image/jpeg,image/webp,image/gif,text/plain')
    .split(',').map(v => v.trim()).filter(Boolean);
  if (files.length > maxFiles) throw httpError(413, `Too many files. Max ${maxFiles} files allowed.`);
  let total = 0;
  for (const file of files) {
    const mime = file.type || 'application/octet-stream';
    total += file.size || 0;
    if ((file.size || 0) > maxFileBytes) throw httpError(413, `${file.name} is too large. Max file size is ${maxFileBytes} bytes.`);
    if (!allowed.some(type => mime === type || (type.endsWith('/*') && mime.startsWith(type.slice(0, -1))))) {
      throw httpError(415, `${mime} is not allowed. Allowed: ${allowed.join(', ')}`);
    }
  }
  if (total > maxTotalBytes) throw httpError(413, `Total upload size is too large. Max total size is ${maxTotalBytes} bytes.`);
}

async function runJsonTask({ env, task, prompt, files, schemaName, schema, fallback }) {
  const stubMode = isStubMode(env);
  const allowFallback = boolEnv(env.ALLOW_STUB, false) || boolEnv(env.FALLBACK_ON_OPENAI_ERROR, true);
  if (stubMode) return withRuntimeNote(fallback(), `stub_mode:${task}`);
  if (!env.OPENAI_API_KEY) {
    if (boolEnv(env.ALLOW_STUB, false)) return withRuntimeNote(fallback(), 'missing_openai_key_stub_fallback');
    throw httpError(500, 'OPENAI_API_KEY is not configured. Set it as a Cloudflare Worker secret.');
  }
  try {
    return await callOpenAIJson({ env, prompt, files, schemaName, schema });
  } catch (error) {
    console.error(`OpenAI JSON task failed (${task}):`, error?.message || error);
    if (allowFallback) return withRuntimeNote(fallback(), `openai_error_fallback:${error?.message || error}`);
    throw error;
  }
}

async function callOpenAIJson({ env, prompt, files, schemaName, schema }) {
  const content = [{ type: 'input_text', text: prompt }];
  for (const file of files || []) {
    const mime = file.type || 'application/octet-stream';
    const base64 = await fileToBase64(file);
    if (mime.startsWith('image/')) {
      content.push({ type: 'input_image', image_url: `data:${mime};base64,${base64}` });
    } else {
      content.push({ type: 'input_file', filename: file.name || 'upload.pdf', file_data: `data:${mime};base64,${base64}` });
    }
  }
  const body = {
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    reasoning: { effort: env.OPENAI_REASONING_EFFORT || DEFAULT_REASONING_EFFORT },
    input: [{ role: 'user', content }],
    text: { format: { type: 'json_schema', name: schemaName, schema, strict: true } },
    max_output_tokens: numberEnv(env.OPENAI_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS),
    store: false,
    metadata: { service: SERVICE_NAME, schema: schemaName, version: VERSION }
  };
  const baseUrl = String(env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${baseUrl}${OPENAI_RESPONSES_PATH}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status, data?.error?.message || `OpenAI HTTP ${res.status}`);
  const text = data.output_text || extractOutputText(data);
  if (!text) throw httpError(502, 'OpenAI response has no output text');
  try { return JSON.parse(text); }
  catch { throw httpError(502, 'OpenAI output was not valid JSON'); }
}

function extractOutputText(data) {
  const out = data?.output || [];
  for (const item of out) {
    for (const c of item.content || []) {
      if (typeof c.text === 'string') return c.text;
      if (typeof c.output_text === 'string') return c.output_text;
    }
  }
  return '';
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function buildAnalyzePrompt(payload, files) {
  return `너는 수학 취약유형 진단 AI Bridge다. 학생 자료를 읽고 JSON schema에 맞춰 구조화하라.

반드시 지킬 원칙:
- 먼저 첨부 자료의 목적을 분류한다. 문제풀이, 오답노트, 개념정리, 수업필기, 검수답안, 혼합, 판별불가 중에서 판단한다.
- 학생이 올린 자료가 개념정리 파일이면 문제풀이처럼 맞고 틀림만 보지 말고, 정의·조건·공식의 의미·예시·이전 개념 연결·다음 단원 활용을 검수한다.
- 공식만 나열되어 있으면 '암기형 정리'로 분류하고, 언제 쓰는지/왜 그렇게 되는지/어떤 조건에서 쓰는지 부족한 부분을 concept_note_review에 적는다.
- 학생이 인강을 봤는지 단정하지 말고, 확인된 흔적과 부족한 증거를 분리한다.
- 보이는 풀이/필기/정리에서만 판단하고, 보이지 않는 내용은 missing_materials 또는 missing_evidence에 넣는다.
- 오답 번호, 단원명, problem_type_id 힌트가 있으면 engine_adapter.student_attempt에 연결한다.
- 검수 문항이 필요한 지점을 verification_need에 명확히 적는다.
- 한국 중고등 수학 교사용 표현으로 간결하되, 학생 관리에 쓸 수 있게 구체적으로 쓴다.

자료 목적 분류 기준:
- problem_solving: 문제와 풀이 과정 중심
- wrong_answer_note: 오답 번호, 틀린 이유, 다시 푼 흔적 중심
- concept_summary: 개념 정의, 공식, 조건, 예시, 단원 정리 중심
- lecture_note: 수업/인강 필기, 판서, 선생님 설명 기록 중심
- verification_answer: 검수 문항에 대한 재제출 답안 중심
- mixed: 위 성격이 2개 이상 섞임
- unknown: 화질 또는 정보 부족으로 판단 곤란

첨부 파일 수: ${(files || []).length}
입력 payload:
${JSON.stringify(payload, null, 2)}`;
}
function buildVerificationPrompt(payload) {
  return `1차 진단 결과를 바탕으로 학생에게 풀릴 검수 문항 세트를 생성하라.

요구사항:
- 문항은 정의 확인, 구분 확인, 과정 확인, 자기 설명, 직접 예시 생성 중 필요한 것만 조합한다.
- 각 문항에는 required_elements와 teacher_note를 반드시 구체화한다.
- 정답만 맞히는 문항이 아니라, 학생이 왜 그렇게 생각했는지 드러나야 한다.

입력:
${JSON.stringify(payload, null, 2)}`;
}
function buildReviewPrompt(payload, files) {
  return `학생이 검수 문항에 작성한 답안을 재검수하라.

판정 기준:
- 정답 여부만 보지 말고 정의 연결, 풀이 과정, 핵심 근거, 예시 적용 가능성을 본다.
- A는 이해 완료, B는 부분 이해, C는 암기 수준, D는 재학습 필요로 판정한다.
- 학생에게 다시 시킬 과제를 final_instruction.redo_tasks에 구체적으로 적는다.

첨부 파일 수: ${(files || []).length}
입력:
${JSON.stringify(payload, null, 2)}`;
}
function buildFinalReportPrompt(payload) {
  return `AI 분석, 수학 엔진 진단, 검수 문항, 학생 답안 재검수 결과를 합쳐 학생용/학부모용/교사용 최종 리포트를 작성하라.

출력 원칙:
- 학생용은 무엇을 다시 해야 하는지 행동 중심으로 쓴다.
- 학부모용은 왜 다시 해야 하는지 쉬운 말로 쓴다.
- 교사용은 다음 수업에서 확인할 개념과 재학습 순서를 쓴다.

입력:
${JSON.stringify(payload, null, 2)}`;
}

function buildAnalyzeFallback(payload, reason = 'fallback') {
  const ctx = payload?.learning_context || {};
  const noteText = payload?.submission?.text_inputs?.lecture_note_text || '';
  const solutionText = payload?.submission?.text_inputs?.student_solution_text || '';
  const manifest = payload?.submission?.file_manifest || [];
  const wrongs = ctx.wrong_question_numbers || [];
  const known = ctx.known_problem_type_ids || [];
  const combinedText = `${noteText}
${solutionText}`;
  const hasNote = noteText.trim().length > 20;
  const hasProcess = /\=|따라서|왜냐하면|풀이|과정|x\s*=/.test(solutionText);
  const conceptWords = /정의|개념|공식|성질|조건|예시|유리수 지수|로그|지수법칙|그래프|원리/.test(combinedText);
  const primaryType = conceptWords && !hasProcess ? 'concept_summary' : hasProcess ? 'problem_solving' : hasNote ? 'lecture_note' : (manifest[0]?.file_role === 'exam_pdf' ? 'problem_solving' : 'unknown');
  const routing = primaryType === 'concept_summary' || primaryType === 'lecture_note' ? 'concept_review' : primaryType === 'problem_solving' ? 'solve_diagnosis' : 'insufficient';
  const detected = (manifest.length ? manifest : [{ filename:'text_input', file_role: primaryType }]).map((f) => ({
    filename: f.filename || 'text_input',
    material_type: f.file_role === 'concept_summary_image' ? 'concept_summary' : f.file_role === 'wrong_answer_note_image' ? 'wrong_answer_note' : f.file_role === 'lecture_note_image' ? 'lecture_note' : f.file_role === 'solution_image' ? 'problem_solving' : f.file_role === 'verification_answer_image' ? 'verification_answer' : primaryType,
    evidence: `${reason}: 파일명/입력 텍스트 기반 임시 판별`,
    confidence: primaryType === 'unknown' ? 0.25 : 0.45
  }));
  const conceptLevel = conceptWords ? (/(왜|이유|조건|예시|반례|연결|그래프|정의에서)/.test(combinedText) ? 'B' : 'C') : 'D';
  const conceptualAccuracy = !conceptWords ? 'not_enough_evidence' : conceptLevel === 'B' ? 'partially_correct' : 'memorized_only';
  return {
    ok: true,
    file_purpose_review: {
      primary_material_type: primaryType,
      detected_materials: detected,
      routing_decision: routing,
      teacher_note: primaryType === 'concept_summary' ? '개념정리 자료로 보고 정의·조건·예시·연결 설명을 우선 검수해야 합니다.' : '정밀 AI 분석 전 임시 파일 목적 판별입니다.'
    },
    extraction_summary: { source_quality: 'partially_clear', student_did_work_evidence: hasNote || hasProcess ? 'some' : 'weak', confidence: 0.45, missing_materials: [`${reason}: 정밀 AI 분석 전 임시 결과`] },
    student_material_review: {
      lecture_note_review: { watch_evidence: hasNote ? 'possibly_watched' : 'not_enough_evidence', understanding_level: hasNote ? conceptLevel : 'D', confirmed_concepts: [ctx.unit_name].filter(Boolean), missing_evidence: ['자기 말 설명 또는 풀이 과정 추가 확인 필요'], risk_flags: ['fallback_mode'], teacher_observation: '정밀 검수 전 임시 판단입니다.' },
      concept_note_review: { summary_type: conceptWords ? (hasProcess ? 'mixed' : 'formula_list') : 'not_present', conceptual_accuracy: conceptualAccuracy, connected_understanding_level: conceptLevel, strengths: conceptWords ? ['핵심 용어 또는 공식 정리 흔적이 있음'] : [], missing_links: ['정의와 조건을 자기 말로 설명하는 증거 부족', '이전 개념과 다음 단원 활용 연결 부족'], misuse_risks: ['공식 암기 후 적용 조건을 놓칠 가능성'], next_rewrite_task: '개념을 정의-조건-예시-왜 필요한가-대표 문제 적용 순서로 다시 정리' },
      solution_review: { process_evidence: hasProcess ? 'partial_process' : 'not_visible', main_error_candidates: ['정밀 분석 필요'], calculation_error_candidates: [], concept_error_candidates: [], quoted_student_steps: [] }
    },
    math_signal: { unit_candidates: [{ unit_id: ctx.unit_id || '', unit_name: ctx.unit_name || '', confidence: 0.5 }], problem_type_candidates: wrongs.map((q,i) => ({ question_no:q, problem_type_id: known[i] || '', problem_type_hint: known[i] || 'unknown', confidence: known[i] ? 0.7 : 0.2, evidence:'user_input' })), concept_candidates: [{ concept_id:'', concept_name: ctx.unit_name || '핵심 개념', evidence:'user_context_or_concept_note' }], misconception_candidates: [{ misconception:'풀이 과정 또는 개념 설명 확인 필요', why_it_matters:'필기/풀이/개념정리만으로 이해 여부를 확정할 수 없음', severity:'medium' }] },
    engine_adapter: { student_attempt: { attempts: wrongs.map((q,i) => ({ question_no:q, problem_type_id: known[i] || '', is_correct:false, correct:false, difficulty:'core', observed_error_tags:['ai_bridge_fallback'] })) }, note_review_input: { student_note: { unit_id: ctx.unit_id || '', lesson_title: ctx.lesson_title || ctx.unit_name || '', note_text: noteText } }, recommended_engine_actions: ['classify_material_purpose','run_diagnoseWithGuidance','run_reviewStudentNote','generate_verification_questions'] },
    verification_need: { needed: true, reason: primaryType === 'concept_summary' ? '개념정리의 이해 수준 검수 필요' : '정밀 이해 확인 필요', focus_concepts:[ctx.unit_name || '핵심 개념'], must_check_actions:['정의 설명','조건 설명','예시 생성','풀이 과정 작성','자기 말 설명'] }
  };
}
function buildVerificationFallback(payload) {
  const focus = payload?.ai_extraction?.verification_need?.focus_concepts || payload?.verification_need?.focus_concepts || ['핵심 개념'];
  const concept = focus[0] || '핵심 개념';
  return { set_id:`fallback_vq_${Date.now()}`, target_concepts:focus, source_diagnosis:'AI fallback 검수 문항', questions:[{ question_id:'VQ1', question_type:'definition', prompt:`${concept}의 뜻을 자기 말로 설명하고 예시를 1개 쓰세요.`, student_answer_format:'서술형', required_elements:['정의','예시','이유'], answer_key:'정의와 예시가 정확해야 한다.', rubric:[{score:3,condition:'정의와 예시 정확'},{score:1,condition:'용어만 반복'}], minimum_pass_score:2, teacher_note:'암기와 이해를 구분' },{ question_id:'VQ2', question_type:'process', prompt:'대표 문제 하나를 풀이 과정 전체로 다시 쓰세요. 중간 식과 판단 이유를 생략하지 마세요.', student_answer_format:'단계별 풀이', required_elements:['시작식','중간 과정','판단 이유','결론'], answer_key:'과정이 생략되지 않고 개념 판단 기준이 드러나야 한다.', rubric:[{score:4,condition:'과정과 이유 정확'},{score:1,condition:'정답만 있음'}], minimum_pass_score:3, teacher_note:'과정 누락 확인' }], teacher_decision_rule:'과정 문항을 통과하지 못하면 재학습 처리', redo_policy:'틀린 문항은 같은 구조의 다른 예시로 다시 작성' };
}
function buildAnswerReviewFallback(payload) {
  const txt = payload?.student_answer_text || payload?.student_upload?.submission?.text_inputs?.verification_answer_text || '';
  const hasReason = /왜냐하면|이유|정의|때문|조건|분수|근거/.test(txt);
  const hasProcess = /=|따라서|과정|풀이|단계|계산/.test(txt);
  const score = (hasReason?4:0)+(hasProcess?4:0)+(txt.length>80?2:0);
  const level = score>=8?'A':score>=6?'B':score>=3?'C':'D';
  return { review_id:`fallback_review_${Date.now()}`, overall_result:{ level, score, decision: score>=8?'understood':score>=6?'partial_understanding':score>=3?'memorized_only':'needs_relearning', summary:'fallback 재검수 결과입니다.' }, question_reviews:[], final_instruction:{ student_message: score>=6?'방향은 맞지만 더 명확한 설명이 필요합니다.':'풀이 과정과 이유를 다시 작성해야 합니다.', teacher_action:'구두 확인 후 재작성 지시', redo_tasks:['정의-과정-결론 3단계로 다시 작성'], parent_message:'학생 답안에서 과정과 이유 설명을 추가 확인해야 합니다.' } };
}
function buildFinalReportFallback(payload) {
  const name = payload?.student_upload?.student_profile?.student_name || '학생';
  return { report_id:`fallback_report_${Date.now()}`, report_type:'full_cycle', student_summary:{ status:`${name}의 임시 진단 결과입니다.`, what_is_understood:[], what_is_missing:['정밀 AI 분석 또는 교사 확인 필요'], next_action:['검수 문항 답안을 과정 중심으로 다시 작성'] }, teacher_summary:{ diagnosis:'fallback 리포트입니다. Worker/OpenAI 연결 후 정밀 분석하세요.', evidence:['입력 payload 기반'], instruction_plan:['검수 문항 재작성','오답 문항 풀이 과정 확인'], watch_points:['개념어 암기와 실제 이해 구분'] }, parent_summary:{ plain_message:'학생이 학습한 흔적은 자료로 확인해야 하며, 현재는 정밀 분석 전 임시 결과입니다.', home_support:['정답보다 풀이 과정과 이유를 말로 설명하게 해주세요.'] }, next_plan:{ redo_tasks:['검수 문항 답안 재작성'], verification_required_again:true, recommended_due_date_hint:'다음 수업 전' } };
}

function attachMeta(result, requestId, task) {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    result._meta = { ...(result._meta || {}), request_id: requestId, task, worker_version: VERSION };
  }
  return result;
}
function withRuntimeNote(result, note) {
  if (result && typeof result === 'object' && !Array.isArray(result)) result._runtime = { ...(result._runtime || {}), note, worker_version: VERSION };
  return result;
}
function json(request, env, data, status = 200, requestId = '', startedAt = Date.now()) {
  const body = { ...data, request_id: data.request_id || requestId, elapsed_ms: Date.now() - startedAt };
  return withCors(request, env, new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
}
function withCors(request, env, res) {
  const h = new Headers(res.headers);
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = resolveAllowedOrigin(origin, env);
  h.set('Access-Control-Allow-Origin', allowedOrigin);
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  h.set('Access-Control-Expose-Headers', 'Content-Type');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
function resolveAllowedOrigin(origin, env) {
  const raw = String(env.CORS_ALLOWED_ORIGINS || '').trim();
  if (!raw) return '*';
  const allowed = raw.split(',').map(v => v.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) return origin;
  if (allowed.includes('*')) return '*';
  return allowed[0] || '*';
}
function corsMode(env) { return String(env.CORS_ALLOWED_ORIGINS || '').trim() ? 'allowlist' : 'open-dev'; }
function boolEnv(value, fallback=false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1','true','yes','on'].includes(String(value).toLowerCase());
}
function numberEnv(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function isStubMode(env) {
  return String(env.ENGINE_MODE || '').toLowerCase() === 'stub' || boolEnv(env.STUB_ONLY, false);
}
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const AI_EXTRACTION_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "required": [
    "ok",
    "file_purpose_review",
    "extraction_summary",
    "student_material_review",
    "math_signal",
    "engine_adapter",
    "verification_need"
  ],
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "file_purpose_review": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "primary_material_type",
        "detected_materials",
        "routing_decision",
        "teacher_note"
      ],
      "properties": {
        "primary_material_type": {
          "type": "string",
          "enum": [
            "problem_solving",
            "wrong_answer_note",
            "concept_summary",
            "lecture_note",
            "verification_answer",
            "mixed",
            "unknown"
          ]
        },
        "detected_materials": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "filename",
              "material_type",
              "evidence",
              "confidence"
            ],
            "properties": {
              "filename": {
                "type": "string"
              },
              "material_type": {
                "type": "string",
                "enum": [
                  "problem_solving",
                  "wrong_answer_note",
                  "concept_summary",
                  "lecture_note",
                  "verification_answer",
                  "mixed",
                  "unknown"
                ]
              },
              "evidence": {
                "type": "string"
              },
              "confidence": {
                "type": "number"
              }
            }
          }
        },
        "routing_decision": {
          "type": "string",
          "enum": [
            "solve_diagnosis",
            "concept_review",
            "mixed_diagnosis",
            "verification_review",
            "insufficient"
          ]
        },
        "teacher_note": {
          "type": "string"
        }
      }
    },
    "extraction_summary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "source_quality",
        "student_did_work_evidence",
        "confidence",
        "missing_materials"
      ],
      "properties": {
        "source_quality": {
          "type": "string",
          "enum": [
            "clear",
            "partially_clear",
            "hard_to_read",
            "insufficient"
          ]
        },
        "student_did_work_evidence": {
          "type": "string",
          "enum": [
            "strong",
            "some",
            "weak",
            "none"
          ]
        },
        "confidence": {
          "type": "number"
        },
        "missing_materials": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "student_material_review": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "lecture_note_review",
        "concept_note_review",
        "solution_review"
      ],
      "properties": {
        "lecture_note_review": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "watch_evidence",
            "understanding_level",
            "confirmed_concepts",
            "missing_evidence",
            "risk_flags",
            "teacher_observation"
          ],
          "properties": {
            "watch_evidence": {
              "type": "string",
              "enum": [
                "likely_watched",
                "possibly_watched",
                "copied_terms_only",
                "not_enough_evidence"
              ]
            },
            "understanding_level": {
              "type": "string",
              "enum": [
                "A",
                "B",
                "C",
                "D"
              ]
            },
            "confirmed_concepts": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "missing_evidence": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "risk_flags": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "teacher_observation": {
              "type": "string"
            }
          }
        },
        "concept_note_review": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "summary_type",
            "conceptual_accuracy",
            "connected_understanding_level",
            "strengths",
            "missing_links",
            "misuse_risks",
            "next_rewrite_task"
          ],
          "properties": {
            "summary_type": {
              "type": "string",
              "enum": [
                "concept_definition",
                "formula_list",
                "worked_examples",
                "mixed",
                "not_present"
              ]
            },
            "conceptual_accuracy": {
              "type": "string",
              "enum": [
                "accurate",
                "partially_correct",
                "memorized_only",
                "incorrect",
                "not_enough_evidence"
              ]
            },
            "connected_understanding_level": {
              "type": "string",
              "enum": [
                "A",
                "B",
                "C",
                "D"
              ]
            },
            "strengths": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "missing_links": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "misuse_risks": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "next_rewrite_task": {
              "type": "string"
            }
          }
        },
        "solution_review": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "process_evidence",
            "main_error_candidates",
            "calculation_error_candidates",
            "concept_error_candidates",
            "quoted_student_steps"
          ],
          "properties": {
            "process_evidence": {
              "type": "string",
              "enum": [
                "full_process",
                "partial_process",
                "answer_only",
                "not_visible"
              ]
            },
            "main_error_candidates": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "calculation_error_candidates": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "concept_error_candidates": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "quoted_student_steps": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      }
    },
    "math_signal": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "unit_candidates",
        "problem_type_candidates",
        "concept_candidates",
        "misconception_candidates"
      ],
      "properties": {
        "unit_candidates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "unit_id",
              "unit_name",
              "confidence"
            ],
            "properties": {
              "unit_id": {
                "type": "string"
              },
              "unit_name": {
                "type": "string"
              },
              "confidence": {
                "type": "number"
              }
            }
          }
        },
        "problem_type_candidates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "question_no",
              "problem_type_id",
              "problem_type_hint",
              "confidence",
              "evidence"
            ],
            "properties": {
              "question_no": {
                "type": "string"
              },
              "problem_type_id": {
                "type": "string"
              },
              "problem_type_hint": {
                "type": "string"
              },
              "confidence": {
                "type": "number"
              },
              "evidence": {
                "type": "string"
              }
            }
          }
        },
        "concept_candidates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "concept_id",
              "concept_name",
              "evidence"
            ],
            "properties": {
              "concept_id": {
                "type": "string"
              },
              "concept_name": {
                "type": "string"
              },
              "evidence": {
                "type": "string"
              }
            }
          }
        },
        "misconception_candidates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "misconception",
              "why_it_matters",
              "severity"
            ],
            "properties": {
              "misconception": {
                "type": "string"
              },
              "why_it_matters": {
                "type": "string"
              },
              "severity": {
                "type": "string",
                "enum": [
                  "low",
                  "medium",
                  "high"
                ]
              }
            }
          }
        }
      }
    },
    "engine_adapter": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "student_attempt",
        "note_review_input",
        "recommended_engine_actions"
      ],
      "properties": {
        "student_attempt": {
          "type": "object",
          "additionalProperties": true
        },
        "note_review_input": {
          "type": "object",
          "additionalProperties": true
        },
        "recommended_engine_actions": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "verification_need": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "needed",
        "reason",
        "focus_concepts",
        "must_check_actions"
      ],
      "properties": {
        "needed": {
          "type": "boolean"
        },
        "reason": {
          "type": "string"
        },
        "focus_concepts": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "must_check_actions": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
};
const VERIFICATION_QUESTION_SCHEMA = { type:'object', additionalProperties:false, required:['set_id','target_concepts','source_diagnosis','questions','teacher_decision_rule','redo_policy'], properties:{ set_id:{type:'string'}, target_concepts:{type:'array',items:{type:'string'}}, source_diagnosis:{type:'string'}, questions:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','question_type','prompt','student_answer_format','required_elements','answer_key','rubric','minimum_pass_score','teacher_note'],properties:{question_id:{type:'string'},question_type:{type:'string',enum:['definition','classification','process','proof_explanation','error_correction','self_explanation','example_generation']},prompt:{type:'string'},student_answer_format:{type:'string'},required_elements:{type:'array',items:{type:'string'}},answer_key:{type:'string'},rubric:{type:'array',items:{type:'object',additionalProperties:false,required:['score','condition'],properties:{score:{type:'number'},condition:{type:'string'}}}},minimum_pass_score:{type:'number'},teacher_note:{type:'string'}}}}, teacher_decision_rule:{type:'string'}, redo_policy:{type:'string'} } };
const ANSWER_REVIEW_SCHEMA = { type:'object',additionalProperties:false,required:['review_id','overall_result','question_reviews','final_instruction'],properties:{ review_id:{type:'string'}, overall_result:{type:'object',additionalProperties:false,required:['level','score','decision','summary'],properties:{level:{type:'string',enum:['A','B','C','D']},score:{type:'number'},decision:{type:'string',enum:['understood','partial_understanding','memorized_only','needs_relearning']},summary:{type:'string'}}}, question_reviews:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','status','score','confirmed_understanding','missing_elements','misconceptions','feedback'],properties:{question_id:{type:'string'},status:{type:'string',enum:['correct','partial','incorrect','unanswered']},score:{type:'number'},confirmed_understanding:{type:'array',items:{type:'string'}},missing_elements:{type:'array',items:{type:'string'}},misconceptions:{type:'array',items:{type:'string'}},feedback:{type:'string'}}}}, final_instruction:{type:'object',additionalProperties:false,required:['student_message','teacher_action','redo_tasks','parent_message'],properties:{student_message:{type:'string'},teacher_action:{type:'string'},redo_tasks:{type:'array',items:{type:'string'}},parent_message:{type:'string'}}} } };
const FINAL_REPORT_SCHEMA = { type:'object',additionalProperties:false,required:['report_id','report_type','student_summary','teacher_summary','parent_summary','next_plan'],properties:{ report_id:{type:'string'}, report_type:{type:'string',enum:['initial_diagnosis','after_verification_review','full_cycle']}, student_summary:{type:'object',additionalProperties:false,required:['status','what_is_understood','what_is_missing','next_action'],properties:{status:{type:'string'},what_is_understood:{type:'array',items:{type:'string'}},what_is_missing:{type:'array',items:{type:'string'}},next_action:{type:'array',items:{type:'string'}}}}, teacher_summary:{type:'object',additionalProperties:false,required:['diagnosis','evidence','instruction_plan','watch_points'],properties:{diagnosis:{type:'string'},evidence:{type:'array',items:{type:'string'}},instruction_plan:{type:'array',items:{type:'string'}},watch_points:{type:'array',items:{type:'string'}}}}, parent_summary:{type:'object',additionalProperties:false,required:['plain_message','home_support'],properties:{plain_message:{type:'string'},home_support:{type:'array',items:{type:'string'}}}}, next_plan:{type:'object',additionalProperties:false,required:['redo_tasks','verification_required_again','recommended_due_date_hint'],properties:{redo_tasks:{type:'array',items:{type:'string'}},verification_required_again:{type:'boolean'},recommended_due_date_hint:{type:'string'}}} } };
