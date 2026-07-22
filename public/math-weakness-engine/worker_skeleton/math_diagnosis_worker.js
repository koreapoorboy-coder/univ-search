const SERVICE_NAME = 'math-diagnosis-worker';
// 배포할 때마다 올린다. /health, /config로 어느 코드가 실제로 떠 있는지 확인하는 유일한 수단이다.
const VERSION = '2026.07.22-two-stage-scope';
const DEFAULT_MODEL = 'claude-opus-4-8';
const DEFAULT_EFFORT = 'high';
// max_tokens는 응답 글자 수 한도가 아니라 thinking + 응답을 합친 출력 총량의 한도다.
// adaptive thinking이 effort high로 시험지 전체를 읽으면 생각만으로 16000을 거의 다
// 쓰고, structured output이 JSON을 다 못 맺은 채 잘린다(stop_reason: max_tokens).
// 이 값은 상한일 뿐 실제 생성한 토큰만 과금되므로 넉넉히 잡는 쪽이 안전하다.
// Opus 4.8의 출력 상한은 128K이고, 아래 호출은 이미 stream:true라 크게 잡아도 된다.
const DEFAULT_MAX_TOKENS = 64000;
// 시험지 전체 스캔본을 받으려면 base64 인라인으로는 못 올린다. base64는 33% 부풀고
// 1차 분석은 같은 파일을 두 호출에 각각 실어 보내므로, Claude의 요청당 32MB 한도에
// 금방 걸린다. Files API로 한 번만 올리고 file_id로 참조하면 그 한도를 벗어난다.
const DEFAULT_MAX_FILE_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_FILE_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;
// 이 크기를 넘는 파일만 Files API로 올린다. 작은 파일은 업로드 왕복이 더 느리다.
const DEFAULT_FILES_API_THRESHOLD_BYTES = 4 * 1024 * 1024;
const ANTHROPIC_MESSAGES_PATH = '/messages';
const ANTHROPIC_FILES_PATH = '/files';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_FILES_BETA = 'files-api-2025-04-14';

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
          hasApiKey: Boolean(env.ANTHROPIC_API_KEY),
          provider: 'anthropic',
          mode: env.ENGINE_MODE || 'production',
          model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          effort: env.ANTHROPIC_EFFORT || DEFAULT_EFFORT,
          stubMode: isStubMode(env),
          cors: corsMode(env),
          maxFiles: numberEnv(env.MAX_FILES, DEFAULT_MAX_FILES),
          maxFileBytes: numberEnv(env.MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES),
          maxTotalFileBytes: numberEnv(env.MAX_TOTAL_FILE_BYTES, DEFAULT_MAX_TOTAL_FILE_BYTES),
          useFilesApi: boolEnv(env.USE_FILES_API, true),
          filesApiThresholdBytes: numberEnv(env.FILES_API_THRESHOLD_BYTES, DEFAULT_FILES_API_THRESHOLD_BYTES)
        }, 200, requestId, startedAt);
      }

      if (url.pathname === '/config' && request.method === 'GET') {
        return json(request, env, {
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          provider: 'anthropic',
          model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          mode: env.ENGINE_MODE || 'production',
          stubMode: isStubMode(env),
          fallbackOnAIError: boolEnv(env.FALLBACK_ON_AI_ERROR, true),
          maxTokens: numberEnv(env.ANTHROPIC_MAX_TOKENS, DEFAULT_MAX_TOKENS),
          effort: env.ANTHROPIC_EFFORT || DEFAULT_EFFORT,
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
        const result = await runAnalyze({ env, payload, files });
        return json(request, env, attachMeta(result, requestId, 'analyze'), 200, requestId, startedAt);
      }

      if (url.pathname === '/api/math-diagnose/generate-verification' && request.method === 'POST') {
        const payload = await safeJson(request);
        const prompt = buildVerificationPrompt(payload);
        const result = await runJsonTask({ env, task: 'generate_verification', prompt, files: [], schemaName: 'math_verification_questions', schema: VERIFICATION_QUESTION_SCHEMA, fallback: () => buildVerificationFallback(payload), validate: assertTenQuestions });
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

// 1차 분석을 두 호출로 나눠 동시에 돌린다.
//  A. engine_adapter — 스키마가 작아 structured outputs가 다시 걸린다. problem_type_id와
//     observed_error_tags가 문법으로 보장되고, 이 둘이 선행 체인을 결정한다.
//  B. 화면 검토 문구 — 스키마가 커서 프롬프트 방식 유지.
// 한 호출로 91개 속성을 순차 생성하면 xhigh에서 5분을 넘긴다. 병렬로 돌리면
// 소요 시간이 둘 중 긴 쪽으로 줄고, B가 실패해도 A의 진단 본체는 남는다.
async function runAnalyze({ env, payload, files }) {
  const base = buildAnalyzePrompt(payload, files);
  const only = (what) => `${base}\n\n[이번 응답 범위]\n${what}`;
  // 파일 준비는 두 호출 앞에서 한 번만 한다. 여기서 하지 않으면 같은 스캔본을
  // 두 번 인코딩해 두 번 올리게 되고, 그게 종전 용량 한계의 실제 원인이었다.
  const prepared = await prepareFiles(env, files);
  try {
    const scope = scopeOf(payload);
    // 범위가 지정돼 있으면 2단계로 간다. 유효한 problem_type_id가 나오는 유일한 경로다.
    // 범위가 없는 옛 클라이언트 요청은 종전 단일 호출로 처리한다.
    const engineTask = scope.units.length
      ? runJsonTask({
          env, task: `analyze_engine_staged_${scope.mode}`, files: prepared, structured: true,
          prompt: '', schemaName: 'math_engine_adapter_staged', schema: null,
          run: () => runStagedEngineAdapter({ env, payload, files: prepared, scope }),
          fallback: () => pickKeys(buildAnalyzeFallback(payload, 'analyze_engine_staged_fallback'), ENGINE_ADAPTER_KEYS)
        })
      : runJsonTask({
          env, task: 'analyze_engine', files: prepared, structured: true,
          prompt: only('engine_adapter와 ok만 채운다. 화면용 검토 문구는 이번 응답에서 생성하지 않는다.'),
          schemaName: 'math_engine_adapter', schema: ENGINE_ADAPTER_SCHEMA,
          fallback: () => pickKeys(buildAnalyzeFallback(payload, 'analyze_engine_fallback'), ENGINE_ADAPTER_KEYS)
        });
    const [engine, review] = await Promise.all([
      engineTask,
      runJsonTask({
        env, task: 'analyze_review', files: prepared, structured: false,
        prompt: only('engine_adapter는 이번 응답에서 생성하지 않는다. 나머지 검토 항목만 채운다.'),
        schemaName: 'math_material_review', schema: REVIEW_SCHEMA,
        fallback: () => dropKeys(buildAnalyzeFallback(payload, 'analyze_review_fallback'), ENGINE_ADAPTER_KEYS)
      })
    ]);
    const merged = { ...stripRuntime(review), ...stripRuntime(engine) };
    const notes = [engine?._runtime?.note, review?._runtime?.note].filter(Boolean);
    if (notes.length) merged._runtime = { note: notes.join(' | '), worker_version: VERSION };
    return merged;
  } finally {
    await deleteUploadedFiles(env, prepared);
  }
}

// 문항유형 ID를 자유 문자열로 두면 모델이 지어내고, 엔진의 12,631개 중 하나도 맞지 않아
// 문항별 진단·선행 체인·연결 표가 통째로 꺼진다. 그래서 두 단계로 나눈다.
//   1단계 — 문항마다 단원을 고른다. 후보는 학기 범위(3~4개) 또는 전체(39개)뿐이라 enum이 작다.
//   2단계 — 단원이 정해진 뒤 그 단원의 유형 목록만 enum으로 걸어 확정한다.
// 문항마다 2회씩 부르지 않는다. 60문항이면 120회가 되어 시간·비용을 감당할 수 없다.
// 1단계는 전 문항을 한 번에, 2단계는 등장한 단원별로 한 번씩 묶어 병렬로 부른다.
const MAX_ENUM_TYPES = 600;

function scopeOf(payload) {
  const s = payload?.learning_context?.scope || {};
  const units = Array.isArray(s.candidate_units) ? s.candidate_units.filter(u => u && u.unit_id) : [];
  return {
    mode: s.mode === 'full' ? 'full' : 'semester',
    label: s.label || s.semester || '',
    units,
    dataBase: String(s.engine_data_base || '').replace(/\/$/, '')
  };
}

async function fetchUnitProblemTypes(scope, unitId) {
  if (!scope.dataBase) throw new Error('engine_data_base가 없어 유형 목록을 받을 수 없다');
  const idx = await (await fetch(`${scope.dataBase}/data/index.v1.json`, { cf: { cacheTtl: 3600 } })).json();
  const unit = (idx.units || []).find(u => u.unit_id === unitId);
  if (!unit?.problem_types) throw new Error(`${unitId}의 problem_types 경로가 없다`);
  const pack = await (await fetch(`${scope.dataBase}/${unit.problem_types}`, { cf: { cacheTtl: 3600 } })).json();
  return (pack.problem_types || []).map(p => ({ id: p.problem_type_id, name: p.type_name })).filter(p => p.id);
}

const UNIT_ASSIGN_SCHEMA = (unitIds) => ({
  type: 'object', additionalProperties: false, required: ['assignments'],
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['question_no', 'unit_id', 'is_correct'],
        properties: {
          question_no: { type: 'string' },
          unit_id: { type: 'string', enum: unitIds },
          is_correct: { type: 'boolean' }
        }
      }
    }
  }
});

const TYPE_ASSIGN_SCHEMA = (typeIds) => ({
  type: 'object', additionalProperties: false, required: ['attempts'],
  properties: {
    attempts: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['question_no', 'problem_type_id', 'is_correct', 'difficulty', 'observed_error_tags'],
        properties: {
          question_no: { type: 'string' },
          problem_type_id: { type: 'string', enum: typeIds },
          is_correct: { type: 'boolean' },
          difficulty: { type: 'string', enum: ['basic', 'core', 'advanced', 'high'] },
          observed_error_tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
});

async function runStagedEngineAdapter({ env, payload, files, scope }) {
  if (!scope.units.length) throw new Error('후보 단원이 비어 있다(시험 범위 미선택)');
  const unitIds = scope.units.map(u => u.unit_id);
  const unitMenu = scope.units.map(u => `${u.unit_id} = ${u.unit_name}`).join('\n');

  // 1단계: 문항 → 단원
  const stage1 = await callClaudeJson({
    env, files, structured: true, schemaName: 'unit_assignment',
    schema: UNIT_ASSIGN_SCHEMA(unitIds),
    prompt: `학생이 제출한 시험지/풀이를 읽고, 채점 대상 문항마다 어느 단원 문제인지 고르라.

[선택 가능한 단원 — 이 목록 밖은 고를 수 없다]
${unitMenu}

규칙:
- 문항 번호(question_no)는 자료에 적힌 번호를 그대로 문자열로 쓴다.
- is_correct는 학생이 그 문항을 맞혔는지다. 채점 표시나 풀이 결과로 판단한다.
- 자료에서 확인되는 문항만 넣는다. 없는 문항을 만들지 않는다.
- 범위: ${scope.label || '전체'}`
  });

  const assignments = (stage1?.assignments || []).filter(a => a.question_no && a.unit_id);
  if (!assignments.length) throw new Error('1단계에서 배정된 문항이 없다');

  // 2단계: 단원별로 묶어 병렬. 한 단원이 실패해도 나머지 단원 진단은 남는다.
  const byUnit = {};
  for (const a of assignments) (byUnit[a.unit_id] = byUnit[a.unit_id] || []).push(a);

  const results = await Promise.all(Object.keys(byUnit).map(async unitId => {
    const rows = byUnit[unitId];
    try {
      const types = await fetchUnitProblemTypes(scope, unitId);
      if (!types.length) throw new Error(`${unitId} 유형 목록이 비어 있다`);
      // enum이 지나치게 크면 문법 컴파일 한도에 걸린다. 그 단원은 유형 없이 넘긴다.
      if (types.length > MAX_ENUM_TYPES) throw new Error(`${unitId} 유형 ${types.length}개로 enum 한도(${MAX_ENUM_TYPES}) 초과`);
      const menu = types.map(t => `${t.id} = ${t.name}`).join('\n');
      const out = await callClaudeJson({
        env, files, structured: true, schemaName: `type_assignment_${unitId}`,
        schema: TYPE_ASSIGN_SCHEMA(types.map(t => t.id)),
        prompt: `아래 문항들은 「${unitId}」 단원으로 확정됐다. 각 문항이 이 단원의 어느 문항유형인지 고르라.

[대상 문항]
${rows.map(r => `${r.question_no}번 (정답 여부: ${r.is_correct ? '맞음' : '틀림'})`).join('\n')}

[이 단원의 문항유형 — 이 목록 밖은 고를 수 없다]
${menu}

규칙:
- 대상 문항 전부에 대해 한 줄씩 낸다.
- observed_error_tags는 틀린 문항에서 실제로 관찰된 오류만 쓴다. 맞은 문항은 빈 배열로 둔다.
- difficulty는 문항 난도다.`
      });
      return (out?.attempts || []).map(x => ({ ...x, unit_id: unitId }));
    } catch (err) {
      console.error(`stage2 failed (${unitId}):`, err?.message || err);
      // 유형은 못 정해도 단원·정오답은 살아 있다. 버리지 않고 그대로 넘긴다.
      return rows.map(r => ({ question_no: r.question_no, problem_type_id: '', is_correct: r.is_correct, difficulty: 'core', observed_error_tags: [], unit_id: unitId }));
    }
  }));

  const attempts = results.flat();
  const topUnit = Object.keys(byUnit).sort((a, b) => byUnit[b].length - byUnit[a].length)[0] || '';
  const matched = attempts.filter(a => a.problem_type_id).length;
  return {
    ok: true,
    engine_adapter: {
      student_attempt: {
        unit_id: topUnit,
        unit_name: (scope.units.find(u => u.unit_id === topUnit) || {}).unit_name || '',
        attempts
      },
      note_review_input: { student_note: { unit_id: topUnit, lesson_title: scope.label || '', note_text: payload?.submission?.text_inputs?.lecture_note_text || '' } },
      recommended_engine_actions: ['run_diagnoseWithGuidance', 'generate_verification_questions']
    },
    _staged: { mode: scope.mode, scope: scope.label, units: Object.keys(byUnit), questions: attempts.length, type_matched: matched }
  };
}

const ENGINE_ADAPTER_KEYS = ['ok', 'engine_adapter'];
function pickKeys(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && k in obj) out[k] = obj[k];
  if (obj && obj._runtime) out._runtime = obj._runtime;
  return out;
}
function dropKeys(obj, keys) {
  const out = { ...(obj || {}) };
  for (const k of keys) if (k !== 'ok') delete out[k];
  return out;
}
function stripRuntime(obj) {
  const out = { ...(obj || {}) };
  delete out._runtime;
  return out;
}

async function runJsonTask({ env, task, prompt, files, schemaName, schema, fallback, validate, structured = true, run = null }) {
  const stubMode = isStubMode(env);
  const allowFallback = boolEnv(env.ALLOW_STUB, false) || boolEnv(env.FALLBACK_ON_AI_ERROR, true);
  if (stubMode) return withRuntimeNote(fallback(), `stub_mode:${task}`);
  if (!env.ANTHROPIC_API_KEY) {
    if (boolEnv(env.ALLOW_STUB, false)) return withRuntimeNote(fallback(), 'missing_api_key_stub_fallback');
    throw httpError(500, 'ANTHROPIC_API_KEY is not configured. Set it as a Cloudflare Worker secret.');
  }
  try {
    // run이 주어지면 그 절차가 호출 전체를 책임진다(2단계 판정처럼 호출이 여러 번인 경우).
    const result = run ? await run() : await callClaudeJson({ env, prompt, files, schemaName, schema, structured });
    if (validate) validate(result);
    return result;
  } catch (error) {
    console.error(`Claude JSON task failed (${task}):`, error?.message || error);
    if (allowFallback) return withRuntimeNote(fallback(), `ai_error_fallback:${error?.message || error}`);
    throw error;
  }
}

async function callClaudeJson({ env, prompt, files, schemaName, schema, structured = true }) {
  // structured=false는 스키마가 커서 structured outputs의 문법 컴파일 한도를 넘는 경우다.
  // 그때는 스키마를 프롬프트로 지시하고 파싱 단계에서 검증한다(실패 시 기존 fallback 경로).
  const head = (structured || !schema) ? prompt : `${prompt}

[출력 형식]
아래 JSON Schema를 정확히 만족하는 JSON 객체 하나만 출력한다.
코드펜스(\`\`\`), 설명 문장, 앞뒤 텍스트를 절대 붙이지 않는다. 첫 글자는 {, 마지막 글자는 } 여야 한다.
${JSON.stringify(schema)}`;
  // files는 보통 prepareFiles()가 만든 배열이다. 원본 File 객체가 들어오는 단일 호출
  // 경로(답안 검토)에서는 여기서 변환하고, 그 경우에만 뒤처리도 여기서 책임진다.
  const ownsFiles = Array.isArray(files) && files.some(isFile);
  const prepared = ownsFiles ? await prepareFiles(env, files) : (files || []);
  try {
    return await requestClaudeJson({ env, head, prepared, schemaName, schema, structured });
  } finally {
    if (ownsFiles) await deleteUploadedFiles(env, prepared);
  }
}

async function requestClaudeJson({ env, head, prepared, schemaName, schema, structured }) {
  const content = [{ type: 'text', text: head }];
  for (const f of prepared) content.push(fileContentBlock(f.mime, f));
  const usesFileId = prepared.some(f => f.fileId);
  const body = {
    model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: numberEnv(env.ANTHROPIC_MAX_TOKENS, DEFAULT_MAX_TOKENS),
    thinking: { type: 'adaptive' },
    output_config: { effort: env.ANTHROPIC_EFFORT || DEFAULT_EFFORT },
    // 비스트리밍은 응답이 다 만들어질 때까지 아무것도 오지 않아 Anthropic 엣지가
    // HTTP 524로 연결을 끊는다. 워커<->Claude 구간만 스트리밍해 연결을 살려두고,
    // 여기서 전부 모아 브라우저에는 기존처럼 JSON 한 번에 돌려준다(클라이언트 무변경).
    stream: true,
    messages: [{ role: 'user', content }]
  };
  if (structured && schema) body.output_config.format = { type: 'json_schema', schema };
  const headers = {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json'
  };
  // file_id를 참조할 때는 messages 호출에도 같은 beta 헤더가 있어야 한다.
  if (usesFileId) headers['anthropic-beta'] = ANTHROPIC_FILES_BETA;
  const res = await fetch(`${anthropicBase(env)}${ANTHROPIC_MESSAGES_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw httpError(res.status, data?.error?.message || `Claude HTTP ${res.status}`);
  }
  const { text, stopReason, stopDetails, streamError } = await collectClaudeStream(res);
  if (streamError) throw httpError(502, `Claude stream error: ${streamError}`);
  if (stopReason === 'refusal') {
    throw httpError(502, `Claude declined this request (${stopDetails?.category || 'refusal'}).`);
  }
  if (stopReason === 'max_tokens') {
    // 어느 값에서 잘렸는지 같이 보내야 "올리라"는 말이 실행 가능한 지시가 된다.
    throw httpError(502, `Claude hit max_tokens (${numberEnv(env.ANTHROPIC_MAX_TOKENS, DEFAULT_MAX_TOKENS)}) before finishing ${schemaName}. thinking+출력 합계가 이 한도를 넘었다. ANTHROPIC_MAX_TOKENS를 올리거나 ANTHROPIC_EFFORT를 낮춰라.`);
  }
  if (!text) throw httpError(502, 'Claude response has no text output');
  try { return parseJsonLoose(text); }
  catch (err) {
    // 원문을 못 보면 원인(잘림 / 형식 / 앞뒤 군더더기)을 구분할 수 없어 추측 수정만 반복된다.
    // 앞뒤 일부와 길이, stop_reason을 실어 보내 한 번의 실패로 원인이 드러나게 한다.
    const head = text.slice(0, 220).replace(/\s+/g, ' ');
    const tail = text.slice(-120).replace(/\s+/g, ' ');
    throw httpError(502, `Claude output was not valid JSON (${schemaName}) · len=${text.length} stop=${stopReason || 'none'} · head="${head}" · tail="${tail}"`);
  }
}

// SSE를 읽어 text 블록만 이어 붙인다. adaptive thinking이 켜져 있어 thinking_delta가
// 먼저 흐르므로, content_block_start에서 type이 text인 index만 골라 담는다.
async function collectClaudeStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const textBlocks = new Set();
  let buf = '', text = '', stopReason = null, stopDetails = null, streamError = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let ev;
      try { ev = JSON.parse(payload); } catch { continue; }
      if (ev.type === 'content_block_start') {
        if (ev.content_block && ev.content_block.type === 'text') textBlocks.add(ev.index);
      } else if (ev.type === 'content_block_delta') {
        if (ev.delta && ev.delta.type === 'text_delta' && textBlocks.has(ev.index)) text += ev.delta.text || '';
      } else if (ev.type === 'message_delta') {
        if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
        if (ev.delta && ev.delta.stop_details) stopDetails = ev.delta.stop_details;
      } else if (ev.type === 'error') {
        streamError = (ev.error && ev.error.message) || 'unknown stream error';
      }
    }
  }
  return { text, stopReason, stopDetails, streamError };
}

// structured outputs가 없을 때는 코드펜스나 앞뒤 설명이 섞일 수 있다.
// structured 응답에는 영향이 없다(이미 순수 JSON이라 첫 분기에서 끝난다).
function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  const attempts = [];
  attempts.push(raw);

  // 닫는 펜스가 있는 경우와, 길이 제한으로 펜스가 닫히지 않은 경우 둘 다 받는다.
  const closed = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (closed) attempts.push(closed[1].trim());
  const open = raw.match(/```(?:json)?\s*([\s\S]*)$/);
  if (open) attempts.push(open[1].trim());

  // 앞뒤에 설명이 붙은 경우 가장 바깥 중괄호만 잘라낸다.
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) attempts.push(raw.slice(a, b + 1));

  for (const candidate of attempts) {
    if (!candidate || candidate[0] !== '{') continue;
    try { return JSON.parse(candidate); } catch (_) {}
    // 후행 쉼표는 모델이 자주 남기는 형태라 한 번 더 시도한다.
    try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')); } catch (_) {}
  }
  throw new SyntaxError('no parsable JSON object found');
}

// Claude returns an array of content blocks. With adaptive thinking on, thinking
// blocks come first, so match on type instead of taking content[0].
function extractOutputText(data) {
  for (const block of data?.content || []) {
    if (block?.type === 'text' && typeof block.text === 'string') return block.text;
  }
  return '';
}

// The 10-question count used to be enforced by minItems/maxItems on
// VERIFICATION_QUESTION_SCHEMA. Claude's structured outputs ignore array-length
// constraints, so the count is checked here instead. Throwing routes the request
// into the normal fallback path rather than shipping a short set to the student.
function assertTenQuestions(result) {
  const count = Array.isArray(result?.questions) ? result.questions.length : 0;
  if (count !== 10) throw httpError(502, `Verification set must have exactly 10 questions, got ${count}.`);
}

function anthropicBase(env) {
  return String(env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/$/, '');
}

// 파일 하나를 Claude가 읽을 수 있는 content 블록으로 바꾼다.
// file_id가 있으면 그걸 참조하고, 없으면 종전대로 base64를 싣는다.
function fileContentBlock(mime, { fileId, base64, text }) {
  if (fileId) {
    // 블록 타입은 파일의 MIME과 맞아야 한다. 이미지를 document로 넣으면 거부된다.
    return mime.startsWith('image/')
      ? { type: 'image', source: { type: 'file', file_id: fileId } }
      : { type: 'document', source: { type: 'file', file_id: fileId } };
  }
  if (mime.startsWith('image/')) return { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } };
  if (mime === 'application/pdf') return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  if (mime === 'text/plain') return { type: 'document', source: { type: 'text', media_type: 'text/plain', data: text } };
  throw httpError(415, `${mime} cannot be sent to Claude. Allowed: images, application/pdf, text/plain.`);
}

// 큰 파일만 Files API로 올려 file_id를 받아 둔다. 두 번의 병렬 분석 호출이 같은
// file_id를 참조하므로 인코딩도 전송도 한 번으로 끝난다.
// 업로드가 실패하면 base64 경로로 되돌린다 — 진단이 통째로 죽는 것보다 낫다.
async function prepareFiles(env, files) {
  const threshold = numberEnv(env.FILES_API_THRESHOLD_BYTES, DEFAULT_FILES_API_THRESHOLD_BYTES);
  const useFilesApi = boolEnv(env.USE_FILES_API, true);
  const out = [];
  for (const file of files || []) {
    const mime = file.type || 'application/octet-stream';
    const size = file.size || 0;
    if (useFilesApi && size > threshold && mime !== 'text/plain') {
      try {
        out.push({ mime, fileId: await uploadToFilesApi(env, file, mime) });
        continue;
      } catch (err) {
        console.error('Files API upload failed, falling back to base64:', err?.message || err);
      }
    }
    if (mime === 'text/plain') out.push({ mime, text: await file.text() });
    else out.push({ mime, base64: await fileToBase64(file) });
  }
  return out;
}

async function uploadToFilesApi(env, file, mime) {
  const form = new FormData();
  form.append('file', file, file.name || 'upload');
  const res = await fetch(`${anthropicBase(env)}${ANTHROPIC_FILES_PATH}`, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': ANTHROPIC_FILES_BETA
    },
    body: form
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Files API HTTP ${res.status} (${mime})`);
  }
  const data = await res.json();
  if (!data?.id) throw new Error('Files API response has no id');
  return data.id;
}

// 업로드한 파일은 지우지 않으면 조직 저장소에 계속 쌓인다. 진단이 끝나면 정리한다.
// 삭제 실패는 진단 결과에 영향을 주지 않으므로 로그만 남긴다.
async function deleteUploadedFiles(env, prepared) {
  const ids = (prepared || []).map(p => p.fileId).filter(Boolean);
  await Promise.all(ids.map(async id => {
    try {
      await fetch(`${anthropicBase(env)}${ANTHROPIC_FILES_PATH}/${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-beta': ANTHROPIC_FILES_BETA
        }
      });
    } catch (err) {
      console.error('Files API delete failed:', id, err?.message || err);
    }
  }));
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


// AI 판독이 실패했을 때 돌려주는 결과다. 이름 그대로 "실패"이므로, 자료 내용에 대해
// 아는 것이 하나도 없다. 파일을 못 읽었으니 단원도 개념도 오개념도 알 수 없다.
//
// 예전에는 파일명·단원명에서 키워드를 긁어 단원을 확정하고 개념 4개와 오개념과
// severity까지 지어냈다. 중2 '지수법칙'이 고2 '거듭제곱근'으로 판정돼, 순환소수·
// 일차부등식 시험지에 거듭제곱근 진단이 붙어 나갔다. 근거는 파일명 글자 하나였다.
//
// 추측을 지우고 스키마만 남긴다. 값은 교사·학생이 실제로 입력한 것만 싣고, 나머지는
// 비운다. 틀린 진단을 그럴듯하게 보여주는 것보다 비어 있는 편이 낫다.
function buildAnalyzeFallback(payload, reason = 'fallback') {
  const ctx = payload?.learning_context || {};
  const diagnosisKind = payload?.analysis_options?.diagnosis_kind || 'auto';
  const noteText = payload?.submission?.text_inputs?.lecture_note_text || '';
  const manifest = payload?.submission?.file_manifest || [];
  const wrongs = ctx.wrong_question_numbers || [];
  const known = ctx.known_problem_type_ids || [];
  const failure = `AI 판독 실패: ${reason}`;

  // 자료 유형은 교사가 고른 진단 목적이나 파일 역할이 있을 때만 쓴다. 그건 입력값이지
  // 추측이 아니다. 둘 다 없으면 unknown으로 두고 라우팅도 insufficient로 둔다.
  const declared = { concept_review: 'concept_summary', solve_diagnosis: 'problem_solving', verification_review: 'verification_answer' }[diagnosisKind] || '';
  const roleType = {
    concept_summary_image: 'concept_summary', wrong_answer_note_image: 'wrong_answer_note',
    lecture_note_image: 'lecture_note', solution_image: 'problem_solving',
    verification_answer_image: 'verification_answer'
  };
  const primaryType = declared || roleType[manifest[0]?.file_role] || 'unknown';
  const routing = primaryType === 'concept_summary' || primaryType === 'lecture_note' ? 'concept_review'
    : primaryType === 'problem_solving' || primaryType === 'wrong_answer_note' ? 'solve_diagnosis'
    : primaryType === 'verification_answer' ? 'verification_review' : 'insufficient';
  const detected = (manifest.length ? manifest : [{ filename: 'text_input' }]).map(f => ({
    filename: f.filename || 'text_input',
    material_type: roleType[f.file_role] || primaryType,
    evidence: declared || f.file_role ? '교사가 지정한 자료 역할' : '판독 실패 — 자료 유형 미확인',
    confidence: 0
  }));

  return {
    ok: true,
    file_purpose_review: {
      primary_material_type: primaryType,
      detected_materials: detected,
      routing_decision: routing,
      teacher_note: `${failure} 자료를 읽지 못했으므로 단원·개념 판정을 하지 않았습니다. 아래 항목이 비어 있는 것은 정상입니다.`
    },
    extraction_summary: {
      source_quality: 'unreadable',
      student_did_work_evidence: 'not_enough_evidence',
      confidence: 0,
      missing_materials: [failure, '자료 내용 전체 — 재시도하거나 파일 수를 줄여 다시 올려 주세요.']
    },
    student_material_review: {
      lecture_note_review: {
        watch_evidence: 'not_enough_evidence', understanding_level: 'D',
        confirmed_concepts: [], missing_evidence: [failure],
        risk_flags: ['fallback_mode'],
        teacher_observation: '판독 실패로 강의 노트 검수를 수행하지 못했습니다.'
      },
      concept_note_review: {
        summary_type: 'not_present', conceptual_accuracy: 'not_enough_evidence',
        connected_understanding_level: 'D', strengths: [], missing_links: [failure], misuse_risks: [],
        next_rewrite_task: '',
        counterexample_review: { counterexample_present: 'unknown', student_counterexample_quality: 'not_present', missing_counterexample_task: '', teacher_note: '판독 실패로 반례 검수를 수행하지 못했습니다.' },
        boundary_condition_review: { required_conditions: [], condition_misuse_risk: '', forbidden_generalization: '' },
        concept_rewrite_template: { required_order: [], student_rewrite_prompt: '', example_requirement: '', counterexample_requirement: '' }
      },
      solution_review: {
        process_evidence: 'not_visible',
        main_error_candidates: [], calculation_error_candidates: [], concept_error_candidates: [],
        quoted_student_steps: []
      }
    },
    // 단원·개념·오개념 후보는 전부 비운다. 문항 후보만 교사가 입력한 오답 번호와
    // 유형 ID에서 만든다 — 이건 추측이 아니라 받아 적은 값이다.
    math_signal: {
      unit_candidates: [],
      problem_type_candidates: wrongs.map((q, i) => ({ question_no: q, problem_type_id: known[i] || '', problem_type_hint: known[i] || 'unknown', confidence: known[i] ? 0.7 : 0, evidence: 'user_input' })),
      concept_candidates: [],
      misconception_candidates: []
    },
    engine_adapter: {
      student_attempt: { attempts: wrongs.map((q, i) => ({ question_no: q, problem_type_id: known[i] || '', is_correct: false, correct: false, difficulty: 'core', observed_error_tags: ['ai_bridge_fallback'] })) },
      // note_text에 파일명을 채워 넣던 것을 멈춘다. 학생이 실제로 친 글만 넘긴다.
      note_review_input: { student_note: { unit_id: ctx.unit_id || '', lesson_title: ctx.lesson_title || ctx.unit_name || '', note_text: noteText } },
      recommended_engine_actions: []
    },
    verification_need: { needed: false, reason: `${failure} 판독 결과가 없어 보강 문제를 생성할 근거가 없습니다.`, focus_concepts: [], must_check_actions: [] }
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
  // 단원 전용 문항 세트는 엔진이 단원을 확정했을 때만 쓴다. 확정 전에는 text가
  // payload 전체(파일명·교사 메모 등)라, 키워드 하나에 걸려 엉뚱한 단원의 10문항이
  // 나간다. 중2 '지수법칙'이 고2 거듭제곱근 세트를 부르던 것과 같은 사고다.
  // 근거가 없으면 아래 개념형 일반 세트로 내려보낸다.
  const isPowerRoot = engineLock.locked && /거듭제곱근|n제곱근|세제곱근|네제곱근|짝수\s*제곱근|홀수\s*제곱근|유리수\s*지수|분수\s*지수|a\^\(1\/n\)|1\/n\)|root/i.test(text);
  const isIrrational = engineLock.locked && !isPowerRoot && /유리수|무리수|순환소수|비순환|분수\s*꼴|유한소수|무한소수|정수\s*\/\s*정수|0\.333|0\.121212|π/.test(text);
  if (isPowerRoot) return buildPowerRootFallback(focus, '엔진 확정 단원 기반 거듭제곱근·유리수 지수 10문항');
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
    return { set_id:`fallback_proof_vq_${Date.now()}`, target_concepts:[...new Set(focus.concat(['유리수와 무리수의 증명형 판정']))], source_diagnosis: '엔진 확정 단원 기반 유리수·무리수 10문항', questions, teacher_decision_rule:'10문항 중 7문항 이상 통과하면 부분 이해 이상으로 본다. Q5, Q9, Q10 중 2개 이상 틀리면 개념 경계가 약한 것으로 판정한다.', redo_policy:'틀린 문항은 같은 구조로 다른 수를 넣어 다시 증명하게 한다. 정답만 쓰면 통과하지 않는다.' };
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
  return { report_id:`fallback_report_${Date.now()}`, report_type:'full_cycle', student_summary:{ status:`${name}의 임시 진단 결과입니다.`, what_is_understood:[], what_is_missing:['정밀 AI 분석 또는 교사 확인 필요'], next_action:['검수 문항 답안을 정의-조건-반례-증명 과정-결론 중심으로 다시 작성'] }, teacher_summary:{ diagnosis:'fallback 리포트입니다. Worker/Claude 연결 후 정밀 분석하세요.', evidence:['입력 payload 기반'], instruction_plan:['검수 문항 재작성','오답 문항 풀이 과정 확인'], watch_points:['개념어 암기와 증명 가능성 구분','반례/비예시를 만들 수 있는지 확인','비슷한 예시를 조건으로 비교할 수 있는지 확인'] }, parent_summary:{ plain_message:'학생이 학습한 흔적은 자료로 확인해야 하며, 현재는 정밀 분석 전 임시 결과입니다.', home_support:['정답보다 왜 그런지 조건과 근거를 말로 설명하게 해주세요.'] }, next_plan:{ redo_tasks:['검수 문항 답안 재작성','개념정리를 정의-성립 조건-비성립 조건-증명 예시-반례 순서로 재작성'], verification_required_again:true, recommended_due_date_hint:'다음 수업 전' } };
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
          "additionalProperties": false,
          "required": ["unit_id", "unit_name", "attempts"],
          "properties": {
            "unit_id": { "type": "string" },
            "unit_name": { "type": "string" },
            "attempts": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": ["question_no", "problem_type_id", "is_correct", "difficulty", "observed_error_tags"],
                "properties": {
                  "question_no": { "type": "string" },
                  "problem_type_id": { "type": "string" },
                  "is_correct": { "type": "boolean" },
                  "difficulty": { "type": "string", "enum": ["basic", "core", "advanced", "high"] },
                  "observed_error_tags": { "type": "array", "items": { "type": "string" } }
                }
              }
            }
          }
        },
        "note_review_input": {
          "type": "object",
          "additionalProperties": false,
          "required": ["student_note"],
          "properties": {
            "student_note": {
              "type": "object",
              "additionalProperties": false,
              "required": ["unit_id", "lesson_title", "note_text"],
              "properties": {
                "unit_id": { "type": "string" },
                "lesson_title": { "type": "string" },
                "note_text": { "type": "string" }
              }
            }
          }
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
// AI_EXTRACTION_SCHEMA에서 파생시킨다. 원본을 고치면 두 갈래가 함께 따라오도록 하기 위함이다.
// A는 문법 컴파일 한도 안에 들어와 structured outputs를 쓸 수 있고, B는 나머지 전부라 여전히 프롬프트 방식이다.
const ENGINE_ADAPTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: AI_EXTRACTION_SCHEMA.required.filter(k => ENGINE_ADAPTER_KEYS.includes(k)),
  properties: Object.fromEntries(
    Object.entries(AI_EXTRACTION_SCHEMA.properties).filter(([k]) => ENGINE_ADAPTER_KEYS.includes(k))
  )
};

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: AI_EXTRACTION_SCHEMA.required.filter(k => k === 'ok' || !ENGINE_ADAPTER_KEYS.includes(k)),
  properties: Object.fromEntries(
    Object.entries(AI_EXTRACTION_SCHEMA.properties).filter(([k]) => k === 'ok' || !ENGINE_ADAPTER_KEYS.includes(k))
  )
};

const VERIFICATION_QUESTION_SCHEMA = { type:'object', additionalProperties:false, required:['set_id','target_concepts','source_diagnosis','questions','teacher_decision_rule','redo_policy'], properties:{ set_id:{type:'string'}, target_concepts:{type:'array',items:{type:'string'}}, source_diagnosis:{type:'string'}, questions:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','question_type','prompt','student_answer_format','required_elements','answer_key','rubric','minimum_pass_score','teacher_note'],properties:{question_id:{type:'string'},question_type:{type:'string',enum:['definition','classification','process','proof_explanation','error_correction','self_explanation','example_generation','counterexample_generation','non_example_classification']},prompt:{type:'string'},student_answer_format:{type:'string'},required_elements:{type:'array',items:{type:'string'}},answer_key:{type:'string'},rubric:{type:'array',items:{type:'object',additionalProperties:false,required:['score','condition'],properties:{score:{type:'number'},condition:{type:'string'}}}},minimum_pass_score:{type:'number'},teacher_note:{type:'string'}}}}, teacher_decision_rule:{type:'string'}, redo_policy:{type:'string'} } };
const ANSWER_REVIEW_SCHEMA = { type:'object',additionalProperties:false,required:['review_id','overall_result','question_reviews','final_instruction'],properties:{ review_id:{type:'string'}, overall_result:{type:'object',additionalProperties:false,required:['level','score','decision','summary'],properties:{level:{type:'string',enum:['A','B','C','D']},score:{type:'number'},decision:{type:'string',enum:['understood','partial_understanding','memorized_only','needs_relearning']},summary:{type:'string'}}}, question_reviews:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','status','score','confirmed_understanding','missing_elements','misconceptions','feedback'],properties:{question_id:{type:'string'},status:{type:'string',enum:['correct','partial','incorrect','unanswered']},score:{type:'number'},confirmed_understanding:{type:'array',items:{type:'string'}},missing_elements:{type:'array',items:{type:'string'}},misconceptions:{type:'array',items:{type:'string'}},feedback:{type:'string'}}}}, final_instruction:{type:'object',additionalProperties:false,required:['student_message','teacher_action','redo_tasks','parent_message'],properties:{student_message:{type:'string'},teacher_action:{type:'string'},redo_tasks:{type:'array',items:{type:'string'}},parent_message:{type:'string'}}} } };
const FINAL_REPORT_SCHEMA = { type:'object',additionalProperties:false,required:['report_id','report_type','student_summary','teacher_summary','parent_summary','next_plan'],properties:{ report_id:{type:'string'}, report_type:{type:'string',enum:['initial_diagnosis','after_verification_review','full_cycle']}, student_summary:{type:'object',additionalProperties:false,required:['status','what_is_understood','what_is_missing','next_action'],properties:{status:{type:'string'},what_is_understood:{type:'array',items:{type:'string'}},what_is_missing:{type:'array',items:{type:'string'}},next_action:{type:'array',items:{type:'string'}}}}, teacher_summary:{type:'object',additionalProperties:false,required:['diagnosis','evidence','instruction_plan','watch_points'],properties:{diagnosis:{type:'string'},evidence:{type:'array',items:{type:'string'}},instruction_plan:{type:'array',items:{type:'string'}},watch_points:{type:'array',items:{type:'string'}}}}, parent_summary:{type:'object',additionalProperties:false,required:['plain_message','home_support'],properties:{plain_message:{type:'string'},home_support:{type:'array',items:{type:'string'}}}}, next_plan:{type:'object',additionalProperties:false,required:['redo_tasks','verification_required_again','recommended_due_date_hint'],properties:{redo_tasks:{type:'array',items:{type:'string'}},verification_required_again:{type:'boolean'},recommended_due_date_hint:{type:'string'}}} } };
