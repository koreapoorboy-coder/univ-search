const SERVICE_NAME = 'math-diagnosis-worker';
const VERSION = '2026.07.09-patch23-first-diagnosis-precision';
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

Patch22 핵심 계약:
- 1차 AI 분석 단계에서는 학생 자료를 읽고 자료유형·감지 키워드·수식·풀이 흔적만 구조화한다.
- 1차 AI 분석 단계에서 최종 단원 결론, 학생용 출력 문구, 10문항 세트를 마음대로 확정하지 않는다.
- 1차 AI 분석은 진단까지만 수행한다. 보강 문제 생성은 별도 2차 요청에서만 수행한다.
- 최종 확정 단원과 출력 유형은 엔진 매칭 결과(engine_diagnosis, engine_locked_context)가 우선이다.
- AI는 엔진이 확정한 단원·개념 밖의 예시 문제를 출력하지 않는다.

반드시 지킬 원칙:
- 먼저 첨부 자료의 목적을 분류한다. 문제풀이, 오답노트, 개념정리, 수업필기, 검수답안, 혼합, 판별불가 중에서 판단한다.
- 학생이 선택한 diagnosis_kind가 auto가 아니면 그 의도를 우선 반영한다. concept_review는 개념정리 진단, solve_diagnosis는 실제 풀이 과정 진단, verification_review는 프로그램이 준 10문항 재제출 답안 검수로 본다.
- 학생이 올린 자료가 개념정리 파일이면 문제풀이처럼 맞고 틀림만 보지 말고, 정의·조건·공식의 의미·예시·반례·비예시·이전 개념 연결·다음 단원 활용을 검수한다.
- 학생이 실제 문제 풀이 사진이나 오답 풀이를 올렸으면 정답 설명보다 '어느 줄에서 틀어졌는지', '오류 유형이 무엇인지', '필요한 개념이 무엇인지', '무엇을 다시 해야 하는지'를 우선 검수한다.
- 수학 개념 이해의 최종 기준은 '증명 가능성'이다. 학생이 정의를 외운 것이 아니라, 왜 성립하는지/언제 성립하지 않는지/비슷한 대상과 무엇이 다른지 증명할 수 있는지 본다.
- 공식만 나열되어 있으면 '암기형 정리'로 분류하고, 언제 쓰는지/왜 그렇게 되는지/어떤 조건에서 쓰는지/어떤 경우에는 쓰면 안 되는지/증명으로 확인할 수 있는지 부족한 부분을 concept_note_review에 적는다.
- 개념정리/인강필기 검수에서는 반드시 반례 또는 비예시 관점을 본다. 학생이 반례를 쓰지 않았으면 counterexample_review.missing_counterexample_task에 '다시 써야 할 반례 과제'를 구체적으로 적는다.
- 정리 결과는 복붙 느낌의 요약이 아니라 '정의 → 성립 조건 → 성립하지 않는 조건 → 대표 예시 증명 → 반례/비예시 증명 → 비교 설명 → 문제 적용 기준' 순서로 다시 쓰게 만든다.
- 예: 유리수/무리수 단원에서는 0.333...이 유리수임을 분수 변환으로 증명, √4가 무리수가 아님을 증명, √2가 무리수임을 모순법 구조로 설명, '무한소수는 모두 무리수'의 반례를 요구한다. 단, 대수의 거듭제곱근/유리수 지수 자료에는 이 예시를 사용하지 말고 거듭제곱근의 존재 조건, 주값, 짝수/홀수 근, 유리수 지수 변환 조건을 요구한다.
- 학생이 인강을 봤는지 단정하지 말고, 확인된 흔적과 부족한 증거를 분리한다.
- 보이는 풀이/필기/정리에서만 판단하고, 보이지 않는 내용은 missing_materials 또는 missing_evidence에 넣는다.
- 오답 번호, 단원명, problem_type_id 힌트가 있으면 engine_adapter.student_attempt에 연결한다.
- 검수 문항이 필요한 지점을 verification_need에 명확히 적는다.
- 한국 중고등 수학 교사용 표현으로 간결하되, 학생 관리에 쓸 수 있게 구체적으로 쓴다.
- 학생 화면에는 엔진 매칭 점수, 로드 단원 수, 내부 JSON, 시청 흔적 점수 같은 내부 데이터를 노출하지 않는다. 이런 항목은 교사용 상세로만 둔다.
- 학생용 상단 결과에 들어갈 문장은 일반 코칭 문장이 아니라 수학적으로 정확한 판정 기준과 단원명을 포함해야 한다.
- 유리수/무리수 자료에서만 '정수/정수 꼴 가능 여부', '순환소수의 분수 변환', '√4와 √2의 차이'를 핵심 문제점으로 검토한다. '제곱근'이라는 단어만 있다고 유리수/무리수 단원으로 고정하지 않는다.

자료 목적 분류 기준:
- problem_solving: 문제와 풀이 과정 중심
- wrong_answer_note: 오답 번호, 틀린 이유, 다시 푼 흔적 중심
- concept_summary: 개념 정의, 공식, 조건, 예시, 반례/비예시, 단원 정리 중심
- lecture_note: 수업/인강 필기, 판서, 선생님 설명 기록 중심. 단순 판서 복사인지, 반례·조건·자기 말 설명이 있는지 반드시 구분
- verification_answer: 검수 문항에 대한 재제출 답안 중심
- mixed: 위 성격이 2개 이상 섞임
- unknown: 화질 또는 정보 부족으로 판단 곤란

첨부 파일 수: ${(files || []).length}
입력 payload:
${JSON.stringify(payload, null, 2)}`;
}
function buildVerificationPrompt(payload) {
  return `이 요청은 1차 진단 이후 사용자가 별도로 실행한 2차 보강 문제 생성 요청이다. 1차 진단 결과와 엔진 매칭 결과를 바탕으로 학생에게 보여줄 확인 문제 세트를 생성하라.

중요한 출력 원칙:
- Patch22 진단-문제생성 분리 계약을 반드시 따른다.
- 1차 analyze 단계에서는 문제를 만들지 않는다. 이 generate-verification 엔드포인트에서만 10문항을 만든다.
- payload.generation_mode는 post_diagnosis_only 또는 그에 준하는 2차 생성 모드여야 한다.
- source_diagnosis_id, ai_extraction, engine_diagnosis, engine_locked_context를 하나의 run으로 묶어 사용한다. 이전 학생/이전 단원/이전 fallback 문제 세트를 재사용하지 않는다.
- engine_diagnosis.top_concepts, engine_diagnosis.top_units, engine_locked_context가 있으면 그것을 확정 단원/확정 개념으로 본다.
- AI 추출 결과의 예시·샘플·이전 fallback 문항은 엔진 확정 단원과 충돌하면 모두 폐기한다.
- 엔진이 확정한 단원이 거듭제곱근/유리수 지수이면 유리수·무리수/순환소수 10문항을 절대 출력하지 않는다.
- 엔진이 확정한 단원이 유리수·무리수이면 거듭제곱근 전용 문항을 출력하지 않는다.
- 엔진 매칭이 없거나 확정 단원이 비어 있을 때만 AI 추출 키워드로 일반형 문항을 만든다. 이때도 특정 샘플 세트를 기본값으로 고정하지 않는다.
- 목표는 정답 맞히기가 아니라 학생이 개념을 증명 가능한 수준으로 이해했는지 확인하는 것이다.
- 각 문항은 '주장 → 조건 확인 → 근거/계산 과정 → 반례/비예시 → 결론' 중 필요한 요소가 드러나게 만든다.
- 단순 O/X, 단순 정의 암기, 빈칸 짜맞추기 문항만 내지 않는다.
- 반드시 10문항을 생성한다. 단, 이 10문항은 1차 진단에서 확정된 단원·개념에만 묶인다. 학생에게 보여주는 상단 설명은 짧게 유지하고, 실제 이해 확인은 10문항으로 한다. 화면에는 내부 매칭 결과나 점수형 검수 데이터를 기본 노출하지 않고, 학생은 PDF 문제지로 풀 수 있게 한다.
- 학생 상단 진단에는 '핵심 개념', '다음 학년 핵심 단원', '서술형·융합형 문제' 같은 넓은 표현을 쓰지 말고, 실제 수학 개념명·판정 조건·연결 단원명을 쓴다.
- 유리수/무리수 단원이 감지되면 한 줄 진단에 '정수 a, b에 대해 a/b 꼴로 나타낼 수 있는가'라는 판정 기준을 반드시 포함한다.
- 유리수/무리수 단원이 감지되면 연결 단원은 '중2: 유리수와 순환소수', '중3: 제곱근과 실수', '고등: 방정식·부등식, 함수의 정의역'을 우선 사용한다.
- 10문항 안에는 성립 조건 증명, 성립하지 않는 조건 증명, 반례로 틀린 일반화 깨기, 겉모양이 비슷한 두 대상 비교 설명, 대표 문제 풀이 과정 증명을 모두 포함한다.
- answer_key에는 학생/교사가 확인할 수 있는 정답 또는 모범답안 기준을 반드시 넣는다. '정확해야 한다'처럼 추상적으로 쓰지 말고, 포함되어야 할 핵심어·조건·반례 예시·채점 기준을 적는다.
- 반례/비예시 문항은 가능한 경우 '가능한 모범답안 예시'를 answer_key에 포함한다. 단, 자료에서 특정 개념이 확정되지 않으면 '정답 기준' 형태로 적는다.
- 학생이 단순히 강의 내용을 베껴쓴 경우, 정의·성립 조건·성립하지 않는 조건·대표 예시 증명·반례 증명·비교 설명을 확인하는 문항을 낸다.
- 단, 아래 유리수/무리수 고정 구조는 엔진이 유리수/무리수 단원을 확정했을 때만 사용한다. 유리수/무리수 단원이 감지되면 반드시 유리수/무리수 10문항 구조로 낸다: 0.5 유리수 증명, -3 유리수 증명, 0.333... 유리수 증명, 0.121212... 유리수 증명, 0.333...이 무리수가 아닌 이유, √4가 무리수가 아닌 이유, √9가 무리수가 아닌 이유, √2가 무리수인 이유, '끝나지 않는 소수는 모두 무리수' 반례, √4와 √2 비교. 단, 대수 거듭제곱근/유리수 지수 자료이면 이 구조를 쓰지 않는다. 거듭제곱근의 정의, n의 짝홀성, 밑의 부호, 주값과 모든 해의 차이, a^(m/n) 변환 조건 중심으로 10문항을 생성한다.
- 문제풀이 자료이면 정답만 묻지 말고 오류 위치 찾기, 조건을 식으로 바꾸기, 풀이 중간 단계 근거 쓰기, 답의 범위·정의역·원래 조건 검산, 유사 유형 재풀이 문항을 포함한다.
- required_elements는 학생 답안에 꼭 들어가야 하는 증명 요소를 짧게 적는다.
- teacher_note는 출제 의도와 교사가 볼 통과 기준을 적는다.
- teacher_decision_rule은 학생에게 '10문항 중 몇 개를 통과해야 하는지'가 보이도록 명확히 쓴다.
- 유리수·무리수 예시 10문항은 엔진 확정 단원이 유리수·무리수일 때만 허용된다. 거듭제곱근/유리수 지수, 함수, 방정식 등 다른 단원에서 샘플 세트로 재사용하면 안 된다.

입력:
${JSON.stringify(payload, null, 2)}`;
}
function buildReviewPrompt(payload, files) {
  return `학생이 검수 문항에 작성한 답안을 재검수하라.

판정 기준:
- 정답 여부만 보지 말고 정의 연결, 풀이 과정, 핵심 근거, 예시 적용 가능성, 반례/비예시 구분 가능성을 본다.
- 증명형 답안에서는 주장, 조건 확인, 근거/계산 과정, 반례/비예시, 결론이 논리적으로 연결되는지 본다.
- 학생이 든 반례가 진짜 반례인지, 단순히 다른 예시를 반례라고 착각한 것인지 구분한다.
- A는 새로운 예시도 증명 가능한 수준, B는 핵심 구조는 있으나 일부 누락, C는 암기 수준, D는 재학습 필요로 판정한다.
- 학생에게 다시 시킬 과제를 final_instruction.redo_tasks에 구체적으로 적는다. 다시 할 과제는 반드시 증명형 문장으로 요구한다.

첨부 파일 수: ${(files || []).length}
입력:
${JSON.stringify(payload, null, 2)}`;
}
function buildFinalReportPrompt(payload) {
  return `AI 분석, 수학 엔진 진단, 검수 문항, 학생 답안 재검수 결과를 합쳐 학생용/학부모용/교사용 최종 리포트를 작성하라.

출력 원칙:
- 학생용은 무엇을 다시 해야 하는지 행동 중심으로 쓴다.
- 개념정리 보완이 필요한 학생에게는 '정의-성립 조건-성립하지 않는 조건-대표 예시 증명-반례 증명-비교 설명-문제 적용 기준' 순서로 다시 쓰게 안내한다.
- 학생을 평가할 때 '개념을 외웠다'가 아니라 '왜 그런지 증명할 수 있다/아직 증명하지 못한다'로 표현한다.
- 학부모용은 왜 다시 해야 하는지 쉬운 말로 쓴다. 특히 학년이 올라가서 융합 문제에서 흔들리지 않으려면 조건과 근거 설명이 필요하다고 안내한다.
- 교사용은 다음 수업에서 확인할 개념, 반례 질문, 재학습 순서, 구두 증명 질문을 쓴다.

입력:
${JSON.stringify(payload, null, 2)}`;
}


function collectFallbackSignalText(payload = {}, manifest = [], combinedText = '') {
  const ctx = payload.learning_context || {};
  const profile = payload.student_profile || {};
  const textInputs = payload.submission?.text_inputs || {};
  const fileText = (manifest || []).map(f => [f.filename, f.file_role, f.page_or_question_hint, f.student_note].filter(Boolean).join(' ')).join('\n');
  const teacherFocus = Array.isArray(ctx.teacher_focus) ? ctx.teacher_focus.join(' ') : String(ctx.teacher_focus || '');
  return [
    combinedText,
    fileText,
    ctx.course,
    ctx.unit_id,
    ctx.unit_name,
    ctx.lesson_title,
    ctx.exam_title,
    teacherFocus,
    profile.teacher_memo,
    textInputs.student_self_reflection
  ].filter(Boolean).join('\n');
}

function inferFallbackMathTopic(signalText = '') {
  const text = String(signalText || '');
  if (/거듭제곱근|거듭제곱과\s*거듭제곱근|거듭제곱|n제곱근|세제곱근|네제곱근|제곱근\s*중\s*실수|짝수\s*제곱근|홀수\s*제곱근|유리수\s*지수|분수\s*지수|지수법칙|a\^\(1\/n\)|root/i.test(text)) return 'power_root';
  if (/유리수|무리수|순환소수|비순환|분수\s*꼴|유한소수|무한소수|정수\s*\/\s*정수|0\.333|0\.121212|π/.test(text)) return 'rational_irrational';
  return 'generic';
}

function fallbackTopicProfile(topic, ctx = {}) {
  const currentUnit = ctx.unit_name || '';
  if (topic === 'power_root') {
    return {
      unitCandidates: [{ unit_id: ctx.unit_id || 'h2_algebra_exp_log_power_root', unit_name: currentUnit || '대수: 거듭제곱과 거듭제곱근', confidence: 0.72 }],
      conceptCandidates: [
        { concept_id:'power_root_real_count', concept_name:'거듭제곱근의 실수해 개수 판정', evidence:'파일명/단원명/자료 키워드에서 거듭제곱근 유형 감지' },
        { concept_id:'even_odd_root_condition', concept_name:'짝수·홀수 거듭제곱근의 존재 조건', evidence:'n제곱근, 세제곱근, 네제곱근 유형 감지' },
        { concept_id:'principal_root_vs_all_solutions', concept_name:'주값과 방정식의 모든 해 구분', evidence:'제곱근·네제곱근 보기형 문항에서 필요한 판정 기준' },
        { concept_id:'rational_exponent_conversion', concept_name:'거듭제곱근과 유리수 지수 변환 조건', evidence:'대수 지수법칙 연결 개념' }
      ],
      missingLinks: [
        'n이 짝수인지 홀수인지에 따라 실수 거듭제곱근의 존재 여부와 개수를 먼저 나누는 과정 부족',
        '√ 기호의 주값과 x^n=a 방정식의 모든 실수해를 구분하는 설명 부족',
        '밑이 음수일 때 짝수근/홀수근이 어떻게 달라지는지 조건 판정 부족',
        '근호식 또는 유리수 지수로 바꾼 뒤 원래 식에 대입해 검산하는 과정 부족'
      ],
      misuseRisks: [
        '거듭제곱근 기호가 보이면 무조건 두 값이 나온다고 일반화할 위험',
        '음수의 짝수 거듭제곱근을 실수 범위에서 존재한다고 판단할 위험',
        '√a와 x²=a의 해를 같은 것으로 처리할 위험',
        '분수 지수 변환에서 밑의 부호와 분모의 짝홀성을 확인하지 않을 위험'
      ],
      mainErrorCandidates: [
        '거듭제곱근 문항에서 n의 짝수/홀수 여부와 밑의 부호를 먼저 분리해 판단했는지 확인 필요',
        '제곱근 기호의 주값과 방정식 x^n=a의 모든 실수해를 구분하는 단계 확인 필요',
        '근호식·유리수 지수 계산 후 원래 식에 다시 대입해 값과 부호를 검산하는 단계 확인 필요'
      ],
      calculationErrorCandidates: ['근호를 지수로 바꾸는 과정, 지수법칙 적용, 원래 식 대입 검산에서 계산 생략 가능성'],
      conceptErrorCandidates: ['짝수근/홀수근, 양수/0/음수, 주값/모든 해 판정 기준 혼동 가능성'],
      misconceptions: [
        { misconception:'거듭제곱근의 개수를 n만 보고 판단하고 밑의 부호를 늦게 확인함', why_it_matters:'음수의 짝수근은 실수 범위에서 존재하지 않으므로 답의 개수가 달라진다.', severity:'high' },
        { misconception:'√ 기호와 x^n=a의 모든 해를 같은 것으로 처리함', why_it_matters:'주값과 모든 해를 혼동하면 보기형 문제에서 오답이 생긴다.', severity:'high' },
        { misconception:'유리수 지수 변환에서 정의 조건을 확인하지 않음', why_it_matters:'지수함수와 로그함수에서 정의역과 식 변형 오류로 연결된다.', severity:'medium' }
      ],
      verificationFocus: ['거듭제곱근의 실수해 개수 판정', '짝수·홀수 거듭제곱근 조건', '주값과 모든 해 구분', '유리수 지수 변환 조건'],
      verificationReason: '거듭제곱근 풀이에서 조건 판정과 검산 과정을 확인해야 함'
    };
  }
  if (topic === 'rational_irrational') {
    return {
      unitCandidates: [{ unit_id: ctx.unit_id || 'm3_real_numbers_and_operations', unit_name: currentUnit || '중3: 제곱근과 실수 / 유리수와 무리수', confidence: 0.68 }],
      conceptCandidates: [
        { concept_id:'rational_number_criterion', concept_name:'유리수와 무리수의 분수 꼴 판정', evidence:'유리수·무리수 키워드 감지' },
        { concept_id:'repeating_decimal_fraction', concept_name:'순환소수의 분수 변환', evidence:'순환소수 키워드 감지' },
        { concept_id:'root_value_classification', concept_name:'제곱근 값에 따른 유리수·무리수 구분', evidence:'제곱근/루트 키워드 감지' }
      ],
      missingLinks: [
        '유리수·무리수의 판정 기준을 정수/정수 꼴 가능 여부로 설명하는 증거 부족',
        '순환소수를 분수로 바꾸어 유리수임을 보이는 과정 부족',
        '루트가 있는 수가 항상 무리수라는 일반화를 반례로 깨는 설명 부족',
        '중2 유리수와 순환소수 → 중3 제곱근과 실수 → 고등 함수의 정의역 연결 이해 부족'
      ],
      misuseRisks: [
        '끝나지 않는 소수를 모두 무리수로 판단할 가능성',
        '루트가 있으면 모두 무리수라고 판단할 가능성',
        '분수 꼴 가능 여부를 확인하지 않고 소수 모양만 보고 판정할 가능성'
      ],
      mainErrorCandidates: [
        '유리수·무리수 판정에서 정수/정수 꼴 가능 여부를 먼저 확인했는지 확인 필요',
        '순환소수와 비순환소수를 구분하고 분수 변환을 했는지 확인 필요',
        '루트 기호가 아니라 실제 값으로 판정했는지 확인 필요'
      ],
      calculationErrorCandidates: ['순환소수를 x로 놓고 10x 또는 100x를 빼는 과정 확인 필요'],
      conceptErrorCandidates: ['끝나지 않는 소수=무리수, 루트가 있으면 무리수라는 일반화 가능성'],
      misconceptions: [
        { misconception:'끝나지 않는 소수를 모두 무리수로 판단함', why_it_matters:'순환소수는 분수로 바꿀 수 있어 유리수이다.', severity:'high' },
        { misconception:'루트 기호만 보고 무리수로 판단함', why_it_matters:'√4, √9는 유리수이므로 실제 값을 확인해야 한다.', severity:'high' }
      ],
      verificationFocus: ['유리수와 무리수의 분수 꼴 판정', '순환소수의 분수 변환', '제곱근 값에 따른 유리수·무리수 구분'],
      verificationReason: '유리수·무리수 판정 기준과 반례 확인 필요'
    };
  }
  return {
    unitCandidates: [{ unit_id: ctx.unit_id || '', unit_name: currentUnit || '', confidence: currentUnit ? 0.5 : 0.2 }].filter(x => x.unit_name || x.unit_id),
    conceptCandidates: [{ concept_id:'', concept_name: currentUnit || '자료 기반 핵심 개념', evidence:'user_context_or_fallback' }],
    missingLinks: ['정의·성립 조건·비성립 조건·대표 예시·반례를 이용한 증명 과정 추가 확인 필요'],
    misuseRisks: ['조건 없이 공식을 외워 적용 대상을 잘못 고를 가능성'],
    mainErrorCandidates: ['문제 조건을 식으로 바꾸는 단계, 계산 전개, 답 검산 중 어느 단계에서 틀어졌는지 확인 필요'],
    calculationErrorCandidates: [],
    conceptErrorCandidates: ['자료 기반 핵심 개념 적용 조건 확인 필요'],
    misconceptions: [{ misconception:'풀이 과정 또는 개념 설명 확인 필요', why_it_matters:'필기/풀이/개념정리만으로 이해 여부를 확정할 수 없음', severity:'medium' }],
    verificationFocus: [currentUnit || '자료 기반 핵심 개념'],
    verificationReason: '정밀 이해 확인 필요'
  };
}

function buildAnalyzeFallback(payload, reason = 'fallback') {
  const ctx = payload?.learning_context || {};
  const diagnosisKind = payload?.analysis_options?.diagnosis_kind || 'auto';
  const noteText = payload?.submission?.text_inputs?.lecture_note_text || '';
  const solutionText = payload?.submission?.text_inputs?.student_solution_text || '';
  const manifest = payload?.submission?.file_manifest || [];
  const wrongs = ctx.wrong_question_numbers || [];
  const known = ctx.known_problem_type_ids || [];
  const combinedText = `${noteText}\n${solutionText}`;
  const signalText = collectFallbackSignalText(payload, manifest, combinedText);
  const topic = inferFallbackMathTopic(signalText);
  const profile = fallbackTopicProfile(topic, ctx);
  const hasNote = noteText.trim().length > 20;
  const hasProcess = /\=|따라서|왜냐하면|풀이|과정|x\s*=/.test(solutionText) || topic !== 'generic';
  const conceptWords = /정의|개념|공식|성질|조건|예시|반례|비예시|증명|가정|모순|유리수|무리수|순환소수|루트|제곱근|거듭제곱근|n제곱근|유리수 지수|분수 지수|로그|지수법칙|그래프|원리/.test(signalText);
  let primaryType = conceptWords && !hasProcess ? 'concept_summary' : hasProcess ? 'problem_solving' : hasNote ? 'lecture_note' : (manifest[0]?.file_role === 'exam_pdf' ? 'problem_solving' : 'unknown');
  if (diagnosisKind === 'concept_review') primaryType = 'concept_summary';
  if (diagnosisKind === 'solve_diagnosis') primaryType = 'problem_solving';
  if (diagnosisKind === 'verification_review') primaryType = 'verification_answer';
  const routing = primaryType === 'concept_summary' || primaryType === 'lecture_note' ? 'concept_review' : primaryType === 'problem_solving' || primaryType === 'wrong_answer_note' ? 'solve_diagnosis' : primaryType === 'verification_answer' ? 'verification_review' : 'insufficient';
  const topicEvidence = topic === 'power_root' ? '거듭제곱근/유리수 지수 키워드 감지' : topic === 'rational_irrational' ? '유리수·무리수/순환소수 키워드 감지' : `${reason}: 파일명/입력 텍스트 기반 임시 판별`;
  const detected = (manifest.length ? manifest : [{ filename:'text_input', file_role: primaryType }]).map((f) => ({
    filename: f.filename || 'text_input',
    material_type: f.file_role === 'concept_summary_image' ? 'concept_summary' : f.file_role === 'wrong_answer_note_image' ? 'wrong_answer_note' : f.file_role === 'lecture_note_image' ? 'lecture_note' : f.file_role === 'solution_image' ? 'problem_solving' : f.file_role === 'verification_answer_image' ? 'verification_answer' : primaryType,
    evidence: topicEvidence,
    confidence: primaryType === 'unknown' ? 0.25 : (topic === 'generic' ? 0.45 : 0.72)
  }));
  const conceptLevel = conceptWords ? (/(증명|가정|모순|왜|이유|조건|예시|반례|비예시|쓰면 안|아닌 경우|연결|그래프|정의에서|따라서)/.test(signalText) ? 'B' : 'C') : 'D';
  const conceptualAccuracy = !conceptWords ? 'not_enough_evidence' : conceptLevel === 'B' ? 'partially_correct' : 'memorized_only';
  return {
    ok: true,
    file_purpose_review: {
      primary_material_type: primaryType,
      detected_materials: detected,
      routing_decision: routing,
      teacher_note: topic === 'power_root' ? 'fallback 상태에서도 파일명/단원명에서 거듭제곱근 풀이 자료로 감지했습니다. 1차 진단은 조건 판정·주값/해 구분·검산 중심으로 보여줍니다.' : primaryType === 'concept_summary' ? '개념정리 자료로 보고 정의·조건·예시·연결 설명을 우선 검수해야 합니다.' : '정밀 AI 분석 전 임시 파일 목적 판별입니다.'
    },
    extraction_summary: { source_quality: 'partially_clear', student_did_work_evidence: hasNote || hasProcess ? 'some' : 'weak', confidence: topic === 'generic' ? 0.45 : 0.72, missing_materials: [`${reason}: 정밀 AI 분석 전 임시 결과`, topic === 'generic' ? '단원명을 입력하거나 파일명에 단원명이 드러나면 1차 진단이 더 구체화됩니다.' : '실제 학생 풀이의 어느 줄에서 틀어졌는지는 정밀 AI 분석 또는 교사 확인이 필요합니다.'].filter(Boolean) },
    student_material_review: {
      lecture_note_review: { watch_evidence: hasNote ? 'possibly_watched' : 'not_enough_evidence', understanding_level: hasNote ? conceptLevel : 'D', confirmed_concepts: profile.verificationFocus.filter(Boolean), missing_evidence: profile.missingLinks, risk_flags: topic === 'generic' ? ['fallback_mode'] : ['fallback_mode', `${topic}_detected_from_filename_or_context`], teacher_observation: topic === 'generic' ? '정밀 검수 전 임시 판단입니다.' : '정밀 AI 분석이 실패해도 파일명/단원명 기반으로 학생용 1차 진단을 단원 맞춤형으로 표시합니다.' },
      concept_note_review: { summary_type: conceptWords ? (hasProcess ? 'mixed' : 'formula_list') : 'not_present', conceptual_accuracy: conceptualAccuracy, connected_understanding_level: conceptLevel, strengths: conceptWords ? ['핵심 용어 또는 공식 정리/풀이 흔적이 있음'] : [], missing_links: profile.missingLinks, misuse_risks: profile.misuseRisks, next_rewrite_task: topic === 'power_root' ? '오답 문항을 n의 짝홀성-밑의 부호-주값/모든 해-원래 식 검산 순서로 다시 정리' : '개념을 정의-성립 조건-성립하지 않는 조건-대표 예시 증명-반례 증명-비교 설명-대표 문제 적용 순서로 다시 정리', counterexample_review: { counterexample_present: /반례|비예시|아닌 경우|틀린 경우|안 되는 경우/.test(signalText) ? 'present' : 'missing', student_counterexample_quality: /반례|비예시|아닌 경우|틀린 경우|안 되는 경우/.test(signalText) ? 'needs_teacher_check' : 'not_present', missing_counterexample_task: topic === 'power_root' ? '음수의 짝수 거듭제곱근, √16과 x²=16의 차이, ∛(-8)처럼 조건이 달라지는 반례/비예시를 각각 1개씩 증명하기' : '이 개념이 성립하지 않는 경우 또는 쓰면 안 되는 조건을 반례 1개와 이유로 증명하기', teacher_note: '개념정리 검수에서는 반례와 증명 가능 여부를 암기형 정리와 이해형 정리를 가르는 기준으로 본다.' }, boundary_condition_review: { required_conditions: topic === 'power_root' ? ['n의 짝수/홀수 여부', '밑의 부호', '주값인지 모든 해인지', '실수 범위에서 존재 여부', '원래 식 대입 검산'] : ['정의가 성립하는 조건', '왜 성립하는지 보이는 증명 근거', '공식을 적용할 수 있는 조건', '적용하면 안 되는 경우'], condition_misuse_risk: profile.misuseRisks[0] || '조건 없이 공식을 외우면 문제에서 적용 대상을 잘못 고를 수 있음', forbidden_generalization: topic === 'power_root' ? '거듭제곱근은 항상 n개 또는 항상 두 개라고 일반화하지 않기' : '한 예시에서 성립한 규칙을 모든 경우로 일반화하지 않게 확인 필요' }, concept_rewrite_template: { required_order: topic === 'power_root' ? ['문제 문장 표시', 'n의 짝홀성', '밑의 부호', '주값/모든 해 구분', '계산 전개', '원래 식 검산', '결론'] : ['정의', '성립 조건', '성립하지 않는 조건', '대표 예시 증명', '반례/비예시 증명', '비교 설명', '문제 적용 기준'], student_rewrite_prompt: topic === 'power_root' ? '각 문항을 n의 짝홀성, 밑의 부호, 주값/모든 해, 검산 순서로 다시 쓰세요.' : '강의 내용을 그대로 옮기지 말고, 이 개념이 왜 성립하고 언제 성립하지 않는지를 증명형 문장으로 다시 정리하세요.', example_requirement: '대표 예시는 계산 또는 그래프/조건 판단이 보이게 1개 이상 작성', counterexample_requirement: topic === 'power_root' ? '음수의 짝수근 또는 주값/모든 해가 달라지는 비예시를 조건 위반 이유와 함께 작성' : '반례 또는 비예시는 왜 이 개념을 적용하면 안 되는지 조건 위반 이유까지 증명형으로 작성' } },
      solution_review: { process_evidence: hasProcess ? 'partial_process' : 'not_visible', main_error_candidates: profile.mainErrorCandidates, calculation_error_candidates: profile.calculationErrorCandidates, concept_error_candidates: profile.conceptErrorCandidates, quoted_student_steps: [] }
    },
    math_signal: { unit_candidates: profile.unitCandidates, problem_type_candidates: wrongs.map((q,i) => ({ question_no:q, problem_type_id: known[i] || '', problem_type_hint: known[i] || 'unknown', confidence: known[i] ? 0.7 : 0.2, evidence:'user_input' })), concept_candidates: profile.conceptCandidates, misconception_candidates: profile.misconceptions },
    engine_adapter: { student_attempt: { attempts: wrongs.map((q,i) => ({ question_no:q, problem_type_id: known[i] || '', is_correct:false, correct:false, difficulty:'core', observed_error_tags:['ai_bridge_fallback', topic].filter(Boolean) })) }, note_review_input: { student_note: { unit_id: ctx.unit_id || profile.unitCandidates?.[0]?.unit_id || '', lesson_title: ctx.lesson_title || ctx.unit_name || profile.unitCandidates?.[0]?.unit_name || '', note_text: noteText || signalText } }, recommended_engine_actions: ['classify_material_purpose','run_diagnoseWithGuidance','run_reviewStudentNote','generate_verification_questions'] },
    verification_need: { needed: true, reason: profile.verificationReason, focus_concepts: profile.verificationFocus, must_check_actions: topic === 'power_root' ? ['n의 짝수/홀수 판정','밑의 부호 판정','주값과 모든 해 구분','근호식·유리수 지수 계산','원래 식 검산'] : ['정의 설명','성립 조건 증명','성립하지 않는 조건 증명','대표 예시 증명','반례 생성','비예시 구분','비교 설명','풀이 과정 작성'] }
  };
}
function makeProofQuestion(id, type, prompt, format, required, answer, pass = 3, note = '') {
  return {
    question_id: id,
    question_type: type,
    prompt,
    student_answer_format: format,
    required_elements: required,
    answer_key: answer,
    rubric: [
      { score: pass + 1, condition: '조건과 근거, 결론이 모두 정확함' },
      { score: pass, condition: '핵심 방향은 맞지만 설명 일부가 부족함' },
      { score: 1, condition: '정답만 쓰거나 암기 문장만 있음' }
    ],
    minimum_pass_score: pass,
    teacher_note: note
  };
}

function collectEngineLockedContext(payload = {}) {
  const ed = payload.engine_diagnosis || payload.engineDiagnosis || null;
  const explicit = payload.engine_locked_context || payload?.ai_extraction?._engine_context || null;
  const conceptObjs = Array.isArray(ed?.top_concepts) ? ed.top_concepts : Array.isArray(explicit?.top_concepts) ? explicit.top_concepts : [];
  const unitObjs = Array.isArray(ed?.top_units) ? ed.top_units : Array.isArray(explicit?.top_units) ? explicit.top_units : [];
  const concepts = conceptObjs.map(x => x?.concept_name || x?.name || x?.concept_id || x).filter(Boolean).map(String);
  const units = unitObjs.map(x => x?.unit_name || x?.name || x?.unit_id || x).filter(Boolean).map(String);
  const summary = ed?.summary || explicit?.summary || {};
  const locked = concepts.length > 0 || units.length > 0;
  const focus = Array.from(new Set([...concepts, ...units])).filter(Boolean);
  return { locked, concepts, units, summary, focus, source: locked ? 'engine_diagnosis' : 'ai_extraction', text: JSON.stringify({ concepts, units, summary }) };
}

function buildPowerRootFallback(focus, reason = 'AI fallback 거듭제곱근 10문항') {
  const questions = [
    makeProofQuestion('Q1','proof_explanation','거듭제곱근의 정의를 쓰고, √[n]{a}가 의미하는 조건을 설명하세요.','정의 → 방정식 x^n=a 연결 → 조건 확인 → 결론',['x^n=a','n제곱하여 a가 되는 수','실수 범위 조건','결론'],'√[n]{a}는 n제곱해서 a가 되는 수를 뜻한다. 즉 x=√[n]{a}라면 x^n=a를 만족해야 한다. 단, 실수 범위에서는 n의 짝홀성과 a의 부호에 따라 존재 여부가 달라진다.',3,'거듭제곱근을 기호 암기가 아니라 x^n=a 조건으로 이해하는지 확인한다.'),
    makeProofQuestion('Q2','classification','n이 짝수일 때 a<0이면 실수 n제곱근이 존재하지 않는 이유를 설명하세요.','짝수 제곱의 부호 → 음수가 될 수 없음 → 결론',['짝수 제곱','항상 0 이상','a<0','실수해 없음'],'실수 x에 대해 x^{2k}는 항상 0 이상이다. 따라서 x^{2k}=a에서 a<0이면 이를 만족하는 실수 x가 없다. 그러므로 짝수 거듭제곱근은 음수에 대해 실수 범위에서 존재하지 않는다.',3,'짝수 거듭제곱근의 존재 조건을 확인한다.'),
    makeProofQuestion('Q3','classification','n이 홀수일 때 음수의 실수 n제곱근이 존재하는 이유를 예로 설명하세요.','홀수 제곱의 부호 유지 → 예시 → 결론',['홀수 제곱','음수 가능','∛(-8)=-2','결론'],'홀수 제곱은 음수의 부호를 유지할 수 있다. 예를 들어 (-2)^3=-8이므로 ∛(-8)=-2이다. 따라서 홀수 거듭제곱근은 음수에서도 실수값을 가질 수 있다.',3,'짝수와 홀수 거듭제곱근의 차이를 확인한다.'),
    makeProofQuestion('Q4','process','√[4]{16}의 값을 구하고, 그 이유를 증명하세요.','후보값 확인 → 4제곱 → 주값 결론',['2^4=16','주값','양수','결론'],'2^4=16이므로 16의 네제곱근 중 주값은 2이다. √[4]{16}은 주값을 나타내므로 √[4]{16}=2이다.',3,'짝수 거듭제곱근에서 주값 기호를 구분하는지 확인한다.'),
    makeProofQuestion('Q5','proof_explanation','x^2=16의 해와 √16의 값을 비교하여 설명하세요.','방정식의 해 → 기호의 주값 → 비교 결론',['x=±4','√16=4','방정식과 기호 구분','결론'],'x^2=16의 해는 x=4 또는 x=-4이다. 하지만 √16은 제곱근 중 주값을 나타내므로 4이다. 따라서 방정식의 모든 해와 √ 기호의 값은 구분해야 한다.',3,'모든 해와 주값을 혼동하는지 확인한다.'),
    makeProofQuestion('Q6','error_correction','√(a^2)=a라고 항상 쓰면 안 되는 이유를 반례로 설명하세요.','틀린 일반화 → 반례 → 절댓값 결론',['a=-3 반례','√9=3','a와 다름','√(a^2)=|a|'],'반례로 a=-3을 넣으면 √(a^2)=√9=3이지만 a=-3이다. 따라서 √(a^2)=a가 항상 성립하지 않는다. 실수 a에 대해 √(a^2)=|a|이다.',4,'제곱근과 절댓값 연결을 확인한다.'),
    makeProofQuestion('Q7','process','27^(2/3)을 거듭제곱근을 이용해 계산하고 과정을 쓰세요.','분수 지수 변환 → 세제곱근 → 제곱',['27^(1/3)=3','3^2=9','분수 지수 의미','결론'],'27^(2/3)=(27^(1/3))^2이다. 27^(1/3)=3이므로 27^(2/3)=3^2=9이다.',3,'유리수 지수와 거듭제곱근의 연결을 확인한다.'),
    makeProofQuestion('Q8','classification','(-8)^(1/3)과 (-8)^(1/2)이 실수 범위에서 어떻게 다른지 설명하세요.','홀수근/짝수근 비교 → 실수 존재 여부',['(-8)^(1/3)=-2','(-8)^(1/2) 실수 아님','홀수/짝수 차이','결론'],'(-8)^(1/3)은 ∛(-8)이므로 -2이다. 하지만 (-8)^(1/2)은 √(-8)을 뜻하므로 실수 범위에서는 정의되지 않는다. 차이는 분모 3은 홀수, 분모 2는 짝수라는 점이다.',4,'음수 밑과 분수 지수에서 정의역 조건을 확인한다.'),
    makeProofQuestion('Q9','counterexample_generation','“거듭제곱근 기호가 있으면 항상 두 값이 나온다”가 틀렸음을 반례로 보이세요.','틀린 문장 → 반례 → 이유 → 결론',['∛8=2','하나의 실수값','또는 √16=4 주값','문장 반박'],'반례는 ∛8=2이다. 세제곱근은 홀수근이므로 실수 범위에서 하나의 값을 가진다. 또한 √16은 주값 기호라 4를 뜻한다. 따라서 거듭제곱근 기호가 있다고 항상 두 값이 나오는 것은 아니다.',3,'겉모양으로 일반화하지 않는지 확인한다.'),
    makeProofQuestion('Q10','proof_explanation','거듭제곱근이 지수함수와 로그함수 단원에 왜 연결되는지 설명하세요.','분수 지수 → 지수법칙 → 정의역 조건 → 연결 단원',['a^(m/n)','거듭제곱근','밑의 조건','지수함수와 로그함수'],'거듭제곱근은 a^(m/n) 같은 유리수 지수를 해석하는 기준이다. 이때 밑 a의 부호와 n의 짝홀성에 따라 실수 범위에서 정의 여부가 달라진다. 그래서 지수함수와 로그함수에서 지수법칙을 적용하기 전에 정의역과 조건을 확인해야 한다.',2,'왜 이 내용을 대수에서 배우는지 연결성을 확인한다.')
  ];
  return { set_id:`fallback_power_root_vq_${Date.now()}`, target_concepts:[...new Set((focus || []).concat(['거듭제곱근과 유리수 지수의 조건 판정']))], source_diagnosis:reason, questions, teacher_decision_rule:'10문항 중 7문항 이상 통과하면 부분 이해 이상으로 본다. Q2, Q5, Q6, Q8 중 2개 이상 틀리면 거듭제곱근의 조건 판정이 약한 것으로 본다.', redo_policy:'틀린 문항은 n의 짝홀성, 밑의 부호, 주값 여부, 유리수 지수 변환 조건을 표시해서 다시 증명한다.' };
}

function buildVerificationFallback(payload) {
  const engineLock = collectEngineLockedContext(payload);
  const contextUnit = engineLock.focus[0] || payload?.ai_extraction?.math_signal?.unit_candidates?.[0]?.unit_name || payload?.student_upload?.learning_context?.unit_name || payload?.learning_context?.unit_name || '핵심 개념';
  const aiFocus = (payload?.ai_extraction?.verification_need?.focus_concepts || payload?.verification_need?.focus_concepts || [contextUnit]).filter(Boolean);
  const focus = (engineLock.locked ? engineLock.focus : aiFocus).filter(Boolean);
  const concept = focus[0] || contextUnit || '핵심 개념';
  const text = engineLock.locked ? engineLock.text : JSON.stringify(payload);
  const isSolve = payload?.ai_extraction?.file_purpose_review?.routing_decision === 'solve_diagnosis' || payload?.ai_extraction?.file_purpose_review?.primary_material_type === 'problem_solving' || payload?.student_upload?.analysis_options?.diagnosis_kind === 'solve_diagnosis';
  if (isSolve) {
    const questions = [
      makeProofQuestion('Q1','error_correction','학생 풀이에서 처음으로 판단이 필요한 줄을 찾고, 그 줄이 왜 중요한지 설명하세요.','오류 위치 후보 → 이유 → 확인할 조건',['오류 위치 또는 확인 위치','그 줄이 중요한 이유','확인해야 할 조건'],'풀이가 틀어지는 지점은 보통 조건을 식으로 바꾸는 줄, 식 변형이 시작되는 줄, 답을 결정하는 줄이다. 해당 줄을 쓰고 왜 확인해야 하는지 설명해야 한다.',3,'풀이 진단은 어느 줄에서 틀어졌는지 찾는 것이 핵심이다.'),
      makeProofQuestion('Q2','process','문제의 조건을 식 또는 그림/그래프 조건으로 다시 정리하세요.','조건 나열 → 식/그래프 변환 → 빠진 조건 확인',['문제 조건','식 또는 그래프 조건','범위 조건','빠진 조건 확인'],'문제 문장을 그대로 반복하지 말고 수식, 범위, 그래프 조건으로 바꾸어야 한다.',3,'조건 해석과 식 세우기 능력을 본다.'),
      makeProofQuestion('Q3','process','풀이의 시작식을 다시 세우고, 왜 그 식으로 시작하는지 설명하세요.','시작식 → 사용 개념 → 이유',['시작식','사용 개념','왜 그 식인지','결론 방향'],'시작식은 문제 조건에서 나와야 하며, 사용한 개념의 조건이 맞아야 한다.',3,'공식 대입 전 조건 확인을 본다.'),
      makeProofQuestion('Q4','process','중간 계산을 한 줄씩 생략하지 말고 다시 전개하세요.','식 변형 단계별 작성',['이전 식','다음 식','변형 이유','계산 확인'],'계산은 결과만 쓰지 말고 이전 식에서 다음 식으로 왜 바뀌는지 보여야 한다.',3,'계산 실수와 식 변형 오류를 구분한다.'),
      makeProofQuestion('Q5','classification','구한 답이 문제의 조건을 만족하는지 원래 조건에 대입해 확인하세요.','답 대입 → 조건 만족 여부 → 결론',['구한 답','원래 조건 대입','조건 만족 여부','최종 결론'],'답을 구한 뒤 원래 조건에 대입해 맞는지 확인해야 한다.',3,'검산과 조건 확인 습관을 본다.'),
      makeProofQuestion('Q6','proof_explanation','이 풀이에서 필요한 핵심 개념 1개를 쓰고, 그 개념을 써도 되는 조건을 설명하세요.','개념명 → 사용 조건 → 적용 이유',['핵심 개념','사용 조건','문제에서 조건 충족','결론'],'개념명만 쓰지 말고 왜 이 문제에 적용 가능한지 설명해야 한다.',3,'개념 연결 진단이다.'),
      makeProofQuestion('Q7','error_correction','틀린 풀이가 있다면 바른 풀이로 고치고, 달라진 부분을 설명하세요.','틀린 부분 → 수정 → 이유',['틀린 줄','바른 식','수정 이유','결론'],'단순히 답만 고치지 말고 틀린 줄과 수정 이유를 써야 한다.',3,'오류 수정 능력을 본다.'),
      makeProofQuestion('Q8','example_generation','같은 개념을 쓰는 유사 문제를 하나 만들고 풀이 전략만 쓰세요.','유사 조건 → 풀이 전략',['유사 문제 조건','사용 개념','풀이 시작 방법','주의 조건'],'완전한 새 문제를 만들지 못해도 같은 개념을 쓰는 조건과 전략을 설명해야 한다.',2,'전이 가능성을 확인한다.'),
      makeProofQuestion('Q9','self_explanation','다음에 같은 유형을 풀 때 반드시 확인할 체크리스트 3개를 쓰세요.','조건·식·검산 체크리스트',['조건 확인','식 세우기','범위/검산','자기 말 기준'],'체크리스트는 실제 풀이 행동으로 이어져야 한다.',2,'학생의 자기 점검 기준을 본다.'),
      makeProofQuestion('Q10','proof_explanation','이 풀이 오류가 연결되는 단원명을 쓰고, 왜 그 단원과 연결되는지 설명하세요.','오류 → 연결 단원 → 이유',['현재 오류','정확한 연결 단원명','연결 이유','다시 할 학습'],'막연한 상위 단원이 아니라 실제 단원명과 이유를 써야 한다.',2,'현재 오류와 학습 경로를 연결한다.')
    ];
    return { set_id:`fallback_solution_vq_${Date.now()}`, target_concepts:focus, source_diagnosis:'AI fallback 풀이 과정 진단 10문항', questions, teacher_decision_rule:'10문항 중 7문항 이상 통과하면 풀이 과정 보완 가능으로 본다. Q1~Q5 중 2개 이상 틀리면 조건 해석 또는 풀이 전개를 다시 학습한다.', redo_policy:'틀린 문항은 원래 풀이 사진의 해당 줄을 표시하고 조건-식-근거-검산 순서로 다시 작성한다.' };
  }
  const isPowerRoot = /거듭제곱근|n제곱근|세제곱근|네제곱근|짝수\s*제곱근|홀수\s*제곱근|유리수\s*지수|분수\s*지수|지수법칙|a\^\(1\/n\)|1\/n\)|root/i.test(text);
  const isIrrational = !isPowerRoot && /유리수|무리수|순환소수|비순환|분수\s*꼴|유한소수|무한소수|정수\s*\/\s*정수|0\.333|0\.121212|π/.test(text);
  if (isPowerRoot) return buildPowerRootFallback(focus, engineLock.locked ? '엔진 확정 단원 기반 거듭제곱근·유리수 지수 10문항' : 'AI fallback 거듭제곱근·유리수 지수 10문항');
  if (isIrrational) {
    const questions = [
      makeProofQuestion('Q1','proof_explanation','0.5가 유리수임을 증명하세요.','분수 변환 → 정수/정수 꼴 확인 → 결론',['0.5=5/10=1/2','분자와 분모가 정수','분모가 0이 아님','유리수 결론'],'0.5=5/10=1/2이다. 1과 2는 정수이고 2는 0이 아니다. 따라서 0.5는 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',3,'유한소수가 유리수임을 분수 변환으로 확인한다.'),
      makeProofQuestion('Q2','proof_explanation','-3이 유리수임을 증명하세요.','정수 → 분수 꼴 → 결론',['-3=-3/1','분자와 분모가 정수','분모가 0이 아님','유리수 결론'],'-3=-3/1이다. -3과 1은 정수이고 1은 0이 아니다. 따라서 -3은 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',3,'정수도 유리수에 포함됨을 확인한다.'),
      makeProofQuestion('Q3','process','0.333...이 유리수임을 x를 이용해 증명하세요.','x로 놓기 → 10x 만들기 → 빼기 → 분수 결론',['x=0.333...','10x=3.333...','9x=3','x=1/3','유리수 결론'],'x=0.333...이라고 하자. 10x=3.333...이므로 10x-x=3, 9x=3, x=1/3이다. 따라서 0.333...은 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',3,'순환소수의 분수 변환 과정을 확인한다.'),
      makeProofQuestion('Q4','process','0.121212...가 유리수임을 x를 이용해 증명하세요.','x로 놓기 → 100x 만들기 → 빼기 → 분수 결론',['x=0.121212...','100x=12.121212...','99x=12','x=4/33','유리수 결론'],'x=0.121212...라고 하자. 100x=12.121212...이므로 100x-x=12, 99x=12, x=12/99=4/33이다. 따라서 0.121212...는 유리수이다.',3,'반복 자리수에 맞게 10, 100 등을 선택하는지 확인한다.'),
      makeProofQuestion('Q5','proof_explanation','0.333...은 끝나지 않는데 왜 무리수가 아닌지 설명하세요.','끝나지 않음 → 반복됨 → 분수 꼴 → 유리수 결론',['끝나지 않는 소수','3이 반복됨','순환소수','1/3로 표현 가능','무리수가 아님'],'0.333...은 끝나지 않지만 3이 반복되는 순환소수이다. 또한 0.333...=1/3로 나타낼 수 있다. 따라서 무리수가 아니라 유리수이다.',3,'끝나지 않는다=무리수라는 오개념을 확인한다.'),
      makeProofQuestion('Q6','non_example_classification','√4가 무리수가 아닌 이유를 증명하세요.','루트 값 계산 → 분수 꼴 → 결론',['√4=2','2=2/1','정수/정수 꼴','유리수','무리수가 아님'],'√4=2이고, 2=2/1로 나타낼 수 있다. 따라서 √4는 루트가 있지만 정수/정수 꼴로 나타낼 수 있으므로 유리수이고 무리수가 아니다.',3,'루트 기호가 아니라 실제 값으로 판정하는지 확인한다.'),
      makeProofQuestion('Q7','non_example_classification','√9가 무리수가 아닌 이유를 증명하세요.','루트 값 계산 → 분수 꼴 → 결론',['√9=3','3=3/1','정수/정수 꼴','유리수','무리수가 아님'],'√9=3이고, 3=3/1로 나타낼 수 있다. 따라서 √9는 루트가 있지만 유리수이고 무리수가 아니다.',3,'완전제곱수의 제곱근은 유리수임을 확인한다.'),
      makeProofQuestion('Q8','proof_explanation','√2가 무리수인 이유를 설명하세요. 가능하면 “유리수라고 가정하면 모순”의 구조를 사용하세요.','가정 → 제곱 → 짝수성 → 모순 → 결론',['√2=a/b 가정','a²=2b²','a와 b가 모두 짝수','서로소 가정과 모순','무리수 결론'],'√2=a/b(a,b는 서로소)라고 가정한다. 제곱하면 a²=2b²이므로 a는 짝수이다. a=2k를 대입하면 b도 짝수이다. 그러면 a,b가 둘 다 짝수라 서로소라는 가정과 모순이다. 따라서 √2는 유리수가 아니며 무리수이다.',4,'무리수의 의미를 모순법 구조로 확인한다.'),
      makeProofQuestion('Q9','counterexample_generation','“끝나지 않는 소수는 모두 무리수이다”가 틀렸음을 반례로 증명하세요.','틀린 문장 → 반례 → 이유 → 결론',['0.333... 또는 0.121212...','끝나지 않음','반복됨','분수 꼴 가능','문장 반박'],'반례는 0.333...이다. 이 수는 끝나지 않는 소수이지만 3이 반복되고 1/3로 나타낼 수 있다. 따라서 끝나지 않는 소수라고 해서 모두 무리수는 아니다.',3,'반례를 만들 수 있어야 개념 경계를 이해한 것으로 본다.'),
      makeProofQuestion('Q10','proof_explanation','√4와 √2는 둘 다 루트가 있는데 왜 하나는 유리수이고 하나는 무리수인지 비교하세요.','공통점 → 차이 조건 → 각각 판정 → 결론',['둘 다 루트가 있음','√4=2','√2는 분수 꼴 불가능','루트 여부가 아니라 분수 꼴 가능 여부','판정 결론'],'√4와 √2는 둘 다 루트가 있다. 그러나 √4=2이고 2=2/1로 나타낼 수 있으므로 유리수이다. 반면 √2는 정수/정수 꼴로 정확히 나타낼 수 없으므로 무리수이다. 즉 루트가 있는지가 아니라 분수 꼴 가능 여부가 기준이다.',3,'겉모양이 비슷한 수를 조건으로 비교하는지 확인한다.')
    ];
    return { set_id:`fallback_proof_vq_${Date.now()}`, target_concepts:[...new Set(focus.concat(['유리수와 무리수의 증명형 판정']))], source_diagnosis: engineLock.locked ? '엔진 확정 단원 기반 유리수·무리수 10문항' : 'AI fallback 10문항 증명형 검수', questions, teacher_decision_rule:'10문항 중 7문항 이상 통과하면 부분 이해 이상으로 본다. Q5, Q9, Q10 중 2개 이상 틀리면 개념 경계가 약한 것으로 판정한다.', redo_policy:'틀린 문항은 같은 구조로 다른 수를 넣어 다시 증명하게 한다. 정답만 쓰면 통과하지 않는다.' };
  }
  const q = (id, type, prompt, required, answer, pass = 3, note = '') => makeProofQuestion(id, type, prompt, '주장 → 조건 확인 → 근거/계산 → 결론', required, answer, pass, note);
  const questions = [
    q('Q1','proof_explanation',`${concept}의 정의를 쓰고, 이 정의가 성립하기 위한 조건을 설명하세요.`,['정의','성립 조건','조건의 의미','결론'],'정의만 반복하지 말고, 그 개념이 성립하기 위해 반드시 필요한 조건을 함께 써야 한다.'),
    q('Q2','proof_explanation',`${concept}이/가 성립하는 대표 예시 1개를 만들고, 그 예시가 조건을 만족함을 증명하세요.`,['대표 예시','조건 확인','근거','결론'],'예시가 단순히 맞는 답이 아니라, 왜 조건을 만족하는지 설명해야 한다.'),
    q('Q3','non_example_classification',`${concept}을/를 적용하면 안 되는 비예시 1개를 만들고, 어떤 조건이 깨졌는지 설명하세요.`,['비예시','깨진 조건','적용 불가 이유','결론'],'비예시는 그 개념을 적용하면 안 되는 경우여야 하며, 조건 위반 이유가 있어야 한다.'),
    q('Q4','counterexample_generation',`${concept}에 대한 틀린 일반화 문장을 하나 만들고, 반례로 반박하세요.`,['틀린 문장','반례','반례가 되는 이유','결론'],'반례는 틀린 문장을 실제로 깨뜨리는 예시여야 한다.'),
    q('Q5','proof_explanation',`겉모양은 비슷하지만 ${concept} 적용 여부가 달라지는 두 예시를 비교하세요.`,['비교 예시 2개','공통점','차이 조건','판정 결론'],'비슷해 보이는 두 예시를 조건 차이로 구분해야 한다.'),
    q('Q6','process',`${concept}이/가 쓰이는 대표 문제의 풀이 과정을 쓰고, 각 단계에서 왜 그 조건을 쓰는지 설명하세요.`,['풀이 단계','조건 사용 이유','계산 과정','결론'],'계산 결과만 아니라 조건을 왜 쓰는지 보여야 한다.'),
    q('Q7','error_correction',`${concept}을/를 잘못 적용한 풀이를 하나 가정하고, 어디가 왜 틀렸는지 고치세요.`,['오류 위치','틀린 이유','바른 조건','수정 결론'],'오류 수정은 개념 적용 조건을 알고 있는지 확인하는 문항이다.'),
    q('Q8','example_generation',`${concept}을/를 확인할 수 있는 새 예시를 직접 만들고, 답까지 증명하세요.`,['새 예시','조건 확인','답 또는 결론','근거'],'새 예시에 적용할 수 있어야 이해로 본다.'),
    q('Q9','classification',`${concept}을/를 쓸 수 있는 경우와 쓸 수 없는 경우를 각각 1개씩 쓰고 비교하세요.`,['사용 가능 예시','사용 불가 예시','조건 차이','비교 결론'],'적용 조건과 비적용 조건을 나란히 비교해야 한다.'),
    q('Q10','self_explanation',`이 개념이 연결되는 정확한 단원명을 쓰고, 그 단원에서 왜 필요한지 한 문단으로 설명하세요.`,['현재 개념','정확한 연결 단원명','필요한 이유','자기 말 설명'],'막연한 다음 단원이 아니라 실제 연결 단원명을 써야 한다.',2,'학생 동기와 개념 연결성을 확인한다.')
  ];
  return { set_id:`fallback_proof_vq_${Date.now()}`, target_concepts:focus, source_diagnosis:'AI fallback 10문항 증명형 검수', questions, teacher_decision_rule:'10문항 중 7문항 이상 통과하면 부분 이해 이상으로 본다. 반례·비예시·비교 설명 문항 중 2개 이상 틀리면 암기형으로 본다.', redo_policy:'틀린 문항은 주장-조건-근거-반례/비예시-결론 순서로 다시 작성한다.' };
}
function buildAnswerReviewFallback(payload) {
  const txt = payload?.student_answer_text || payload?.student_upload?.submission?.text_inputs?.verification_answer_text || '';
  const hasReason = /왜냐하면|이유|정의|때문|조건|분수|근거|반례|비예시|안 되는 경우|성립|무리수|유리수/.test(txt);
  const hasProcess = /=|따라서|과정|풀이|단계|계산|가정|모순|제곱/.test(txt);
  const hasProofShape = /주장|가정|조건|근거|반례|결론|따라서/.test(txt);
  const score = (hasReason?4:0)+(hasProcess?4:0)+(hasProofShape?2:0)+(txt.length>80?1:0);
  const level = score>=8?'A':score>=6?'B':score>=3?'C':'D';
  return { review_id:`fallback_review_${Date.now()}`, overall_result:{ level, score, decision: score>=8?'understood':score>=6?'partial_understanding':score>=3?'memorized_only':'needs_relearning', summary:'fallback 증명형 재검수 결과입니다.' }, question_reviews:[], final_instruction:{ student_message: score>=6?'방향은 맞지만 조건과 결론을 더 명확히 쓰세요.':'정답만 쓰지 말고 주장-근거-반례-결론 구조로 다시 작성해야 합니다.', teacher_action:'구두 확인 후 재작성 지시', redo_tasks:['정의-성립 조건-성립하지 않는 조건-대표 예시 증명-반례 증명-결론 순서로 다시 작성'], parent_message:'학생 답안에서 과정과 이유 설명을 추가 확인해야 합니다.' } };
}
function buildFinalReportFallback(payload) {
  const name = payload?.student_upload?.student_profile?.student_name || '학생';
  return { report_id:`fallback_report_${Date.now()}`, report_type:'full_cycle', student_summary:{ status:`${name}의 임시 진단 결과입니다.`, what_is_understood:[], what_is_missing:['정밀 AI 분석 또는 교사 확인 필요'], next_action:['검수 문항 답안을 정의-조건-반례-증명 과정-결론 중심으로 다시 작성'] }, teacher_summary:{ diagnosis:'fallback 리포트입니다. Worker/OpenAI 연결 후 정밀 분석하세요.', evidence:['입력 payload 기반'], instruction_plan:['검수 문항 재작성','오답 문항 풀이 과정 확인'], watch_points:['개념어 암기와 증명 가능성 구분','반례/비예시를 만들 수 있는지 확인','비슷한 예시를 조건으로 비교할 수 있는지 확인'] }, parent_summary:{ plain_message:'학생이 학습한 흔적은 자료로 확인해야 하며, 현재는 정밀 분석 전 임시 결과입니다.', home_support:['정답보다 왜 그런지 조건과 근거를 말로 설명하게 해주세요.'] }, next_plan:{ redo_tasks:['검수 문항 답안 재작성','개념정리를 정의-성립 조건-비성립 조건-증명 예시-반례 순서로 재작성'], verification_required_again:true, recommended_due_date_hint:'다음 수업 전' } };
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
            "next_rewrite_task",
            "counterexample_review",
            "boundary_condition_review",
            "concept_rewrite_template"
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
            },
            "counterexample_review": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "counterexample_present",
                "student_counterexample_quality",
                "missing_counterexample_task",
                "teacher_note"
              ],
              "properties": {
                "counterexample_present": {
                  "type": "string",
                  "enum": [
                    "present",
                    "weak",
                    "missing",
                    "not_applicable"
                  ]
                },
                "student_counterexample_quality": {
                  "type": "string",
                  "enum": [
                    "accurate",
                    "partially_correct",
                    "misidentified_example",
                    "not_present",
                    "needs_teacher_check"
                  ]
                },
                "missing_counterexample_task": {
                  "type": "string"
                },
                "teacher_note": {
                  "type": "string"
                }
              }
            },
            "boundary_condition_review": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "required_conditions",
                "condition_misuse_risk",
                "forbidden_generalization"
              ],
              "properties": {
                "required_conditions": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "condition_misuse_risk": {
                  "type": "string"
                },
                "forbidden_generalization": {
                  "type": "string"
                }
              }
            },
            "concept_rewrite_template": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "required_order",
                "student_rewrite_prompt",
                "example_requirement",
                "counterexample_requirement"
              ],
              "properties": {
                "required_order": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "student_rewrite_prompt": {
                  "type": "string"
                },
                "example_requirement": {
                  "type": "string"
                },
                "counterexample_requirement": {
                  "type": "string"
                }
              }
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
const VERIFICATION_QUESTION_SCHEMA = { type:'object', additionalProperties:false, required:['set_id','target_concepts','source_diagnosis','questions','teacher_decision_rule','redo_policy'], properties:{ set_id:{type:'string'}, target_concepts:{type:'array',items:{type:'string'}}, source_diagnosis:{type:'string'}, questions:{type:'array',minItems:10,maxItems:10,items:{type:'object',additionalProperties:false,required:['question_id','question_type','prompt','student_answer_format','required_elements','answer_key','rubric','minimum_pass_score','teacher_note'],properties:{question_id:{type:'string'},question_type:{type:'string',enum:['definition','classification','process','proof_explanation','error_correction','self_explanation','example_generation','counterexample_generation','non_example_classification']},prompt:{type:'string'},student_answer_format:{type:'string'},required_elements:{type:'array',items:{type:'string'}},answer_key:{type:'string'},rubric:{type:'array',items:{type:'object',additionalProperties:false,required:['score','condition'],properties:{score:{type:'number'},condition:{type:'string'}}}},minimum_pass_score:{type:'number'},teacher_note:{type:'string'}}}}, teacher_decision_rule:{type:'string'}, redo_policy:{type:'string'} } };
const ANSWER_REVIEW_SCHEMA = { type:'object',additionalProperties:false,required:['review_id','overall_result','question_reviews','final_instruction'],properties:{ review_id:{type:'string'}, overall_result:{type:'object',additionalProperties:false,required:['level','score','decision','summary'],properties:{level:{type:'string',enum:['A','B','C','D']},score:{type:'number'},decision:{type:'string',enum:['understood','partial_understanding','memorized_only','needs_relearning']},summary:{type:'string'}}}, question_reviews:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','status','score','confirmed_understanding','missing_elements','misconceptions','feedback'],properties:{question_id:{type:'string'},status:{type:'string',enum:['correct','partial','incorrect','unanswered']},score:{type:'number'},confirmed_understanding:{type:'array',items:{type:'string'}},missing_elements:{type:'array',items:{type:'string'}},misconceptions:{type:'array',items:{type:'string'}},feedback:{type:'string'}}}}, final_instruction:{type:'object',additionalProperties:false,required:['student_message','teacher_action','redo_tasks','parent_message'],properties:{student_message:{type:'string'},teacher_action:{type:'string'},redo_tasks:{type:'array',items:{type:'string'}},parent_message:{type:'string'}}} } };
const FINAL_REPORT_SCHEMA = { type:'object',additionalProperties:false,required:['report_id','report_type','student_summary','teacher_summary','parent_summary','next_plan'],properties:{ report_id:{type:'string'}, report_type:{type:'string',enum:['initial_diagnosis','after_verification_review','full_cycle']}, student_summary:{type:'object',additionalProperties:false,required:['status','what_is_understood','what_is_missing','next_action'],properties:{status:{type:'string'},what_is_understood:{type:'array',items:{type:'string'}},what_is_missing:{type:'array',items:{type:'string'}},next_action:{type:'array',items:{type:'string'}}}}, teacher_summary:{type:'object',additionalProperties:false,required:['diagnosis','evidence','instruction_plan','watch_points'],properties:{diagnosis:{type:'string'},evidence:{type:'array',items:{type:'string'}},instruction_plan:{type:'array',items:{type:'string'}},watch_points:{type:'array',items:{type:'string'}}}}, parent_summary:{type:'object',additionalProperties:false,required:['plain_message','home_support'],properties:{plain_message:{type:'string'},home_support:{type:'array',items:{type:'string'}}}}, next_plan:{type:'object',additionalProperties:false,required:['redo_tasks','verification_required_again','recommended_due_date_hint'],properties:{redo_tasks:{type:'array',items:{type:'string'}},verification_required_again:{type:'boolean'},recommended_due_date_hint:{type:'string'}}} } };
