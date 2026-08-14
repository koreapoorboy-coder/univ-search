const SERVICE_NAME = 'math-diagnosis-worker';
// 배포할 때마다 올린다. /health, /config로 어느 코드가 실제로 떠 있는지 확인하는 유일한 수단이다.
const VERSION = '2026.08.14-qnorm-v1';
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
          qnorm_selfcheck: qnormV1SelfCheck().pass ? 'pass' : 'fail',  // 표시용(차단은 해시 계산경로). 검수 2026-08-14.
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

      // 관측축 누적 저장 (B: D1). /record upsert(POST), /profile 조회(POST·GET). 둘 다 쓰기키 검증.
      // /health 는 무인증 — 주소창(GET)으로 라우트 등록·바인딩 여부 즉시 확인용.
      if (url.pathname === '/api/axis-store/health' && request.method === 'GET') {
        return json(request, env, { ok: true, store: 'axis', route: 'registered', has_db: !!env.AXIS_DB, has_key: !!env.RECORD_WRITE_KEY, version: VERSION }, 200, requestId, startedAt);
      }
      if (url.pathname === '/api/axis-store/record' && request.method === 'POST') {
        const res = await axisRecord(request, env);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
      }
      if (url.pathname === '/api/axis-store/profile' && (request.method === 'POST' || request.method === 'GET')) {
        const res = await axisProfile(request, env, url);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
      }

      // 문항 등록 통로 (user_items: D1). 교사 전용·X-Write-Key. /structure=AI 구조화 초안, 나머지=CRUD.
      if (url.pathname === '/api/user-items/health' && request.method === 'GET') {
        return json(request, env, { ok: true, store: 'user_items', route: 'registered', has_db: !!env.AXIS_DB, has_key: !!env.RECORD_WRITE_KEY, version: VERSION }, 200, requestId, startedAt);
      }
      if (url.pathname === '/api/user-items/structure' && request.method === 'POST') {
        const res = await itemStructure(request, env);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
      }
      if (url.pathname === '/api/user-items/add' && request.method === 'POST') {
        const res = await itemAdd(request, env);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
      }
      if (url.pathname === '/api/user-items/list' && (request.method === 'POST' || request.method === 'GET')) {
        const res = await itemList(request, env, url);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
      }
      if (url.pathname === '/api/user-items/delete' && request.method === 'POST') {
        const res = await itemDelete(request, env);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
      }
      // 해시 backfill (content_hash/dedup_key 채움). 교사 전용·X-Write-Key. self-check 차단 내장.
      if (url.pathname === '/api/user-items/backfill-hashes' && request.method === 'POST') {
        const res = await itemBackfillHashes(request, env);
        return json(request, env, res, res.status || (res.ok ? 200 : 400), requestId, startedAt);
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

// ── 관측축 누적 저장 (B: D1) ──────────────────────────────────────────────
// 쓰기키(RECORD_WRITE_KEY) 검증: /record·/profile 둘 다(읽기도 보호 — 순번 학생코드 추측 방지).
// 클라이언트 노출 가능한 공유키라 진짜 인증은 아니나 사고성 오염·무단조회 1차 차단.
function axisAuth(request, env) {
  const key = env.RECORD_WRITE_KEY;
  if (!key) return { ok: false, code: 'not_configured', error: 'RECORD_WRITE_KEY 미설정(서버 미구성)', status: 503 };
  if ((request.headers.get('X-Write-Key') || '') !== key) return { ok: false, code: 'unauthorized', error: '쓰기키 불일치', status: 401 };
  return null;
}
function axisJson(v){ return v == null ? null : JSON.stringify(v); }
function axisParse(v){ try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }

async function axisRecord(request, env) {
  const bad = axisAuth(request, env); if (bad) return bad;
  if (!env.AXIS_DB) return { ok: false, code: 'no_binding', error: 'AXIS_DB(D1) 바인딩 없음', status: 503 };
  const r = await safeJson(request);
  if (!r || !r.id || !r.student_code) return { ok: false, code: 'bad_record', error: 'id·student_code 필수', status: 400 };
  // 차단1 저장가드(2026-08-11, 확인3·수정2): 풀이 부재 파일만 skip. store.js가 recommended_engine_actions와
  // 무관하게 독립 POST하므로 서버가 최종 판별한다. 판별 = attempts가 전부 'UNKNOWN'(진단가드가 주입하는 값 —
  // 전부-빈칸 제출의 'BLANK_UNKNOWN'과 다르다 → 빈칸 제출은 저장한다), 또는 attempts·관측축이 둘 다 비어 진단 가치 0.
  // ★단일 판별(all_unknown/empty)로 통일 — guard_applied 배선은 클라 skip과 겹쳐 죽은 코드라 제거했다. fail-open: 애매하면 저장.
  // ok:true(skipped)라 클라가 재시도 큐에 안 넣는다. 정상 전부정답은 CORRECT_COMPLETE라 통과.
  let _atts = Array.isArray(r.attempts) ? r.attempts : [];
  if (typeof r.attempts === 'string') { try { const p = JSON.parse(r.attempts); if (Array.isArray(p)) _atts = p; } catch (e) {} }
  const _axes = Array.isArray(r.observed_axes) ? r.observed_axes : [];
  const _allUnknown = _atts.length > 0 && _atts.every(a => a && a.response_status === 'UNKNOWN');
  const _emptyNoValue = _atts.length === 0 && _axes.length === 0;
  if (_allUnknown || _emptyNoValue) {
    const why = _allUnknown ? 'all_unknown' : 'empty';
    console.log(`[axis-guard] skip no_work record id=${r.id} student=${r.student_code} (${why})`);
    return { ok: true, skipped: why, id: r.id };
  }
  await env.AXIS_DB.prepare(
    `INSERT INTO axis_records (id, student_code, date, exam_label, scope_units, observed_axes, attempts, axis_map_version, schema_version, created_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
     ON CONFLICT(id) DO UPDATE SET student_code=excluded.student_code, date=excluded.date, exam_label=excluded.exam_label,
       scope_units=excluded.scope_units, observed_axes=excluded.observed_axes, attempts=excluded.attempts,
       axis_map_version=excluded.axis_map_version, schema_version=excluded.schema_version`
  ).bind(r.id, r.student_code, r.date || '', r.exam_label || '', axisJson(r.scope_units), axisJson(r.observed_axes), axisJson(r.attempts), r.axis_map_version || '', r.schema_version || 1, new Date().toISOString()).run();
  return { ok: true, id: r.id };
}
async function axisProfile(request, env, url) {
  const bad = axisAuth(request, env); if (bad) return bad;
  if (!env.AXIS_DB) return { ok: false, code: 'no_binding', error: 'AXIS_DB(D1) 바인딩 없음', status: 503 };
  let code = null;
  if (request.method === 'GET') { code = url && url.searchParams.get('student_code'); }
  else { const body = await safeJson(request).catch(() => ({})); code = body && body.student_code; }
  if (code) {
    const rows = ((await env.AXIS_DB.prepare('SELECT * FROM axis_records WHERE student_code=?1 ORDER BY date').bind(code).all()).results) || [];
    const records = rows.map(x => ({ id: x.id, student_code: x.student_code, date: x.date, exam_label: x.exam_label, scope_units: axisParse(x.scope_units), observed_axes: axisParse(x.observed_axes), attempts: axisParse(x.attempts), axis_map_version: x.axis_map_version, schema_version: x.schema_version, created_at: x.created_at }));
    return { ok: true, student_code: code, records };
  }
  const rows = ((await env.AXIS_DB.prepare('SELECT student_code, COUNT(*) AS exam_count FROM axis_records GROUP BY student_code ORDER BY student_code').all()).results) || [];
  return { ok: true, students: rows };
}

// ── 문항 등록 통로 (user_items: 같은 D1 AXIS_DB, user_items 테이블) ─────────────
// 신규 문항은 매일 늘고 사용자가 git을 못 쓰므로 정적 파일이 아니라 D1에 쓴다.
// /structure = AI 구조화 초안(원문→본문/정답/해설/유형후보). add/list/delete = CRUD. 전부 X-Write-Key.

// 단원 유형 목록을 concept_ids까지 포함해 받는다(드롭다운·개념 자동상속용).
async function fetchUnitTypesForItem(dataBase, unitId) {
  const base = String(dataBase || '').replace(/\/$/, '');
  if (!base) throw new Error('engine_data_base가 없다');
  const idx = await (await fetch(`${base}/data/index.v1.json`, { cf: { cacheTtl: 3600 } })).json();
  const unit = (idx.units || []).find(u => u.unit_id === unitId);
  if (!unit || !unit.problem_types) throw new Error(`${unitId}의 problem_types 경로가 없다`);
  const pack = await (await fetch(`${base}/${unit.problem_types}`, { cf: { cacheTtl: 3600 } })).json();
  const types = (pack.problem_types || [])
    .map(p => ({ problem_type_id: p.problem_type_id, type_name: p.type_name, concept_ids: Array.isArray(p.concept_ids) ? p.concept_ids : [] }))
    .filter(t => t.problem_type_id);
  return { unit_name: unit.unit_name || unitId, types };
}

const ITEM_STRUCTURE_SCHEMA = (typeIds) => ({
  type: 'object', additionalProperties: false,
  required: ['question_text', 'answer', 'explanation', 'difficulty', 'problem_type_id', 'error_tags'],
  properties: {
    question_text: { type: 'string' },
    answer: { type: 'string' },
    explanation: { type: 'string' },
    difficulty: { type: 'string', enum: ['basic', 'core', 'advanced', 'high'] },
    problem_type_id: { type: 'string', enum: [...typeIds, NO_MATCH] },
    error_tags: { type: 'array', items: { type: 'string' } }
  }
});

// 원문 텍스트를 구조화하고, 이 단원 유형 중 가장 맞는 problem_type_id를 고른다(진단 staged와 같은 방식).
async function itemStructure(request, env) {
  const bad = axisAuth(request, env); if (bad) return bad;
  const b = await safeJson(request);
  const rawText = String(b && b.raw_text || '').trim();
  const unitId = String(b && b.unit_id || '').trim();
  const dataBase = String(b && b.engine_data_base || '').trim();
  if (!rawText || !unitId || !dataBase) return { ok: false, code: 'bad_input', error: 'raw_text·unit_id·engine_data_base 필수', status: 400 };
  let unitInfo;
  try { unitInfo = await fetchUnitTypesForItem(dataBase, unitId); }
  catch (e) { return { ok: false, code: 'types_load_failed', error: e && e.message || String(e), status: 502 }; }
  if (!unitInfo.types.length) return { ok: false, code: 'no_types', error: `${unitId} 유형 목록이 비어 있음`, status: 502 };
  const typeIds = unitInfo.types.map(t => t.problem_type_id);
  const menu = unitInfo.types.map(t => `${t.problem_type_id} = ${t.type_name}`).join('\n');
  const usageSink = [];
  let draft;
  try {
    draft = await callClaudeJson({
      env, files: [], structured: true, schemaName: 'item_structure', label: 'item_structure', usageSink,
      schema: ITEM_STRUCTURE_SCHEMA(typeIds),
      prompt: `아래는 교사가 PDF에서 복사한 수학 문항 원문이다. 이 문항은 「${unitId}」 단원이다. 원문을 구조화하라.

[원문]
${rawText}

[이 단원 문항유형 목록 · 이 목록 밖은 고를 수 없다]
${menu}

규칙:
- question_text: 문제 본문을 정확히 옮긴다. 수식은 평문으로: 1/3, 루트2, x^2, <=, ×, (123-1)/99. LaTeX·백슬래시 금지.
- answer: 정답. 원문에 있으면 그대로, 없으면 빈 문자열("").
- explanation: 해설. 원문에 있으면 옮기고, 없으면 "".
- difficulty: 문항 난도.
- problem_type_id: 위 목록에서 이 문항에 가장 맞는 유형 하나. 맞는 게 없으면 "${NO_MATCH}".
- error_tags: 이 문항에서 학생이 틀리기 쉬운 오류를 한국어로 0~3개(없으면 빈 배열).`
    });
  } catch (e) {
    return { ok: false, code: 'ai_error', error: e && e.message || String(e), status: 502, _usage: summarizeUsage(usageSink, env) };
  }
  const picked = unitInfo.types.find(t => t.problem_type_id === draft.problem_type_id) || null;
  return {
    ok: true, unit_id: unitId, unit_name: unitInfo.unit_name,
    draft: {
      question_text: draft.question_text || '', answer: draft.answer || '', explanation: draft.explanation || '',
      difficulty: draft.difficulty || 'core',
      problem_type_id: (draft.problem_type_id && draft.problem_type_id !== NO_MATCH) ? draft.problem_type_id : '',
      type_name: picked ? picked.type_name : '',
      concept_ids: picked ? picked.concept_ids : [],
      error_tags: Array.isArray(draft.error_tags) ? draft.error_tags : []
    },
    types: unitInfo.types,   // 클라이언트 드롭다운·concept 자동상속용
    _usage: summarizeUsage(usageSink, env)
  };
}

async function itemAdd(request, env) {
  const bad = axisAuth(request, env); if (bad) return bad;
  if (!env.AXIS_DB) return { ok: false, code: 'no_binding', error: 'AXIS_DB(D1) 바인딩 없음', status: 503 };
  const b = await safeJson(request);
  const qt = String(b && b.question_text || '').trim();
  if (!qt) return { ok: false, code: 'bad_item', error: 'question_text 필수', status: 400 };
  const id = (b && b.id) || crypto.randomUUID();
  const now = new Date().toISOString();
  // 검수 결정 B: 유형 미매칭이면 조용히 approved로 두지 않고 pending으로 보류한다(방치 방지·나중 일괄 승격).
  // 유형이 있으면 approved. 클라이언트가 status를 명시하면 존중하되, 유형 없으면 강제 pending.
  const hasType = String((b && b.problem_type_id) || '').trim().length > 0;
  const status = hasType ? ((b && b.status) || 'approved') : 'pending';
  // ── v3.1 신규 컬럼 (차단2, 2026-08-14) ────────────────────────────────
  // ★배포 게이트: 이 INSERT는 스키마 v3.1(source_text 등 7컬럼)이 D1에 적용된 뒤에만 동작.
  //   스키마 미적용 상태로 배포하면 "no such column" 으로 단건 등록이 죽는다. 순서: 스키마 실행 → 워커 배포.
  // ★source_text: AI 구조화 이전 원문(교사 붙여넣기). 빈값이면 null 유지 — question_text 자동복사 절대 금지(차단2 핵심).
  const srcText = (b && typeof b.source_text === 'string') ? b.source_text.trim() : '';
  const source_text = srcText || null;
  const orgId = (String((b && b.org_id) || '').trim()) || 'SCSTUDY';   // 기관 통합: 기본 SCSTUDY(출처표시·매칭 미참조)
  const provenance = axisJson({ ingest: 'admin', extraction: source_text ? `worker-${VERSION}` : 'manual', at: now });
  // ★content_hash·dedup_key·dedup_key_norm_version = null. qnorm.v1 미구현(매칭/bulk에서 canonical 정의) →
  //   그때 코드경로 backfill(WHERE content_hash IS NULL OR dedup_key_norm_version != 현재). 백로그11.
  await env.AXIS_DB.prepare(
    `INSERT INTO user_items (id, created_at, updated_at, status, unit_id, unit_name, problem_type_id, type_name, concept_ids, question_text, answer, explanation, difficulty, error_tags, source_note, source_text, provenance, org_id, bulk_batch_id, content_hash, dedup_key, dedup_key_norm_version)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)
     ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, status=excluded.status, unit_id=excluded.unit_id, unit_name=excluded.unit_name,
       problem_type_id=excluded.problem_type_id, type_name=excluded.type_name, concept_ids=excluded.concept_ids, question_text=excluded.question_text,
       answer=excluded.answer, explanation=excluded.explanation, difficulty=excluded.difficulty, error_tags=excluded.error_tags, source_note=excluded.source_note,
       source_text=COALESCE(excluded.source_text, user_items.source_text), provenance=excluded.provenance, org_id=COALESCE(excluded.org_id, user_items.org_id),
       content_hash=NULL, dedup_key=NULL, dedup_key_norm_version=NULL`
    // ★편집(ON CONFLICT) 시: source_text·org_id 는 빈값이면 기존 보존(COALESCE, 비소급 유실 방지).
    //   content_hash/dedup_key/norm_version 은 NULL 재설정 = question_text 변경 시 코드경로가 재계산하도록(stale 해시 방지).
    //   bulk_batch_id 는 미변경(단건 편집이 배치출처를 바꾸지 않음).
  ).bind(id, now, now, status, (b && b.unit_id) || '', (b && b.unit_name) || '', (b && b.problem_type_id) || '', (b && b.type_name) || '',
    axisJson((b && b.concept_ids) || []), qt, (b && b.answer) || '', (b && b.explanation) || '', (b && b.difficulty) || 'core', axisJson((b && b.error_tags) || []), (b && b.source_note) || '',
    source_text, provenance, orgId, null, null, null, null).run();
  return { ok: true, id };
}

async function itemList(request, env, url) {
  const bad = axisAuth(request, env); if (bad) return bad;
  if (!env.AXIS_DB) return { ok: false, code: 'no_binding', error: 'AXIS_DB(D1) 바인딩 없음', status: 503 };
  let unitId = null, status = null, limit = 200;
  if (request.method === 'GET') { unitId = url.searchParams.get('unit_id'); status = url.searchParams.get('status'); }
  else { const b = await safeJson(request).catch(() => ({})); unitId = b && b.unit_id; status = b && b.status; if (b && b.limit) limit = Math.min(1000, Number(b.limit) || 200); }
  let sql = 'SELECT * FROM user_items'; const cond = [], args = [];
  if (unitId) { cond.push(`unit_id=?${args.length + 1}`); args.push(unitId); }
  if (status) { cond.push(`status=?${args.length + 1}`); args.push(status); }
  if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
  const rows = ((await env.AXIS_DB.prepare(sql).bind(...args).all()).results) || [];
  const items = rows.map(x => ({ ...x, concept_ids: axisParse(x.concept_ids), error_tags: axisParse(x.error_tags) }));
  // 상태별 카운트를 항상 실어 보낸다(pending 방치 방지 — 화면에 상시 표시).
  const countRows = ((await env.AXIS_DB.prepare('SELECT status, COUNT(*) AS c FROM user_items GROUP BY status').all()).results) || [];
  const counts = { approved: 0, pending: 0, archived: 0 };
  countRows.forEach(r => { counts[r.status || 'unknown'] = r.c; });
  const total = countRows.reduce((s, r) => s + (r.c || 0), 0);
  return { ok: true, items, count: items.length, total, counts };
}

async function itemDelete(request, env) {
  const bad = axisAuth(request, env); if (bad) return bad;
  if (!env.AXIS_DB) return { ok: false, code: 'no_binding', error: 'AXIS_DB(D1) 바인딩 없음', status: 503 };
  const b = await safeJson(request);
  if (!b || !b.id) return { ok: false, code: 'bad_input', error: 'id 필수', status: 400 };
  if (b.hard === true) { await env.AXIS_DB.prepare('DELETE FROM user_items WHERE id=?1').bind(b.id).run(); return { ok: true, id: b.id, deleted: 'hard' }; }
  await env.AXIS_DB.prepare('UPDATE user_items SET status=?1, updated_at=?2 WHERE id=?3').bind('archived', new Date().toISOString(), b.id).run();
  return { ok: true, id: b.id, deleted: 'soft' };
}

// ── qnorm.v1 canonical (매칭·해시 정본) ─────────────────────────────────────────
// ★아래 [CANONICAL CORE]의 qnormV1 함수·QNORM_V1_TESTVEC 값은 js/qnorm.v1.js CORE와 동일(2026-08-14 UTF-8 검증필).
//   (js쪽엔 벡터 인라인 주석이 더 있음 — 값은 동일.) 검증법: 두 파일의 함수체인·벡터값 대조.
//   paste-deploy라 import 불가 → 인라인 사본. 변경 시 양쪽 동시 + 버전 올림(qnorm.v2). 드리프트는 계산경로 self-check로 차단.
// ==== [CANONICAL CORE] BEGIN ====
var QNORM_VERSION = 'qnorm.v1';

function qnormV1(s) {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/\^/g, '')
    .replace(/[×·]/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/[.,·、。]/g, '')
    .toLowerCase();
}

var QNORM_V1_TESTVEC = [
  ['2 cm³',       '2cm3'],
  ['2 cm^3',      '2cm3'],
  ['x²+1',        'x2+1'],
  ['x^2+1',       'x2+1'],
  ['a  b\tc',     'abc'],
  ['1, 2. 3',     '123'],
  ['3×4',         '3*4'],
  ['x⁶',          'x6'],
  ['ＡＢＣ１２３', 'abc123'],
  [null,          ''],
  ['',            '']
];

function qnormV1SelfCheck() {
  for (var i = 0; i < QNORM_V1_TESTVEC.length; i++) {
    var inp = QNORM_V1_TESTVEC[i][0], exp = QNORM_V1_TESTVEC[i][1], got = qnormV1(inp);
    if (got !== exp) return { pass: false, index: i, input: String(inp), expected: exp, got: got };
  }
  return { pass: true };
}
// ==== [CANONICAL CORE] END ====

// 인스턴스당 1회 캐시. 해시 계산경로가 호출 → 불일치면 차단(저장 금지). 표시는 /health(qnorm_selfcheck).
let _QNORM_SELFCHECK = null;
function qnormSelfCheckCached() {
  if (_QNORM_SELFCHECK === null) _QNORM_SELFCHECK = qnormV1SelfCheck();
  return _QNORM_SELFCHECK;
}

// 해시 구성 정본 = user_items.schema.v3.1.sql 상단. content_hash=멱등(UNIQUE) / dedup_key=탐지(NON-UNIQUE).
const QNORM_SEP = '';  // unit separator — 필드 경계(본문 미출현). 스키마 문서의 '|'는 논리 구분자.
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// ★빈 본문(qnorm 결과 '')은 해시 계산 안 함 → null(빈문자열 해시 다행 UNIQUE 충돌 방지, 검수 2026-08-14).
async function computeItemHashes(row) {
  const qn = qnormV1(row && row.question_text);
  if (qn === '') return { dedup_key: null, content_hash: null, empty: true };
  const dedup_key = await sha256Hex(qn + QNORM_SEP + String((row && row.unit_id) || ''));
  const content_hash = await sha256Hex([
    qn, String((row && row.unit_id) || ''), String((row && row.problem_type_id) || ''),
    String((row && row.answer) || ''), String((row && row.explanation) || ''), String((row && row.difficulty) || '')
  ].join(QNORM_SEP));
  return { dedup_key, content_hash, empty: false };
}

// ── backfill: 기존 행 content_hash/dedup_key 채움. 멱등(재실행 안전). ★검수 §5-4 체크포인트 대상 ──
async function itemBackfillHashes(request, env) {
  const bad = axisAuth(request, env); if (bad) return bad;
  if (!env.AXIS_DB) return { ok: false, code: 'no_binding', error: 'AXIS_DB(D1) 바인딩 없음', status: 503 };
  // ★계산경로 self-check 차단: 드리프트면 해시 계산·저장 금지(경보 아닌 차단).
  const sc = qnormSelfCheckCached();
  if (!sc.pass) return { ok: false, code: 'qnorm_selfcheck_fail', error: 'qnorm.v1 self-check 실패 — 저장 차단', detail: sc, status: 500 };
  const bd = await safeJson(request).catch(() => ({}));
  const limit = Math.min(1000, Number(bd && bd.limit) || 500);
  const rows = ((await env.AXIS_DB.prepare(
    `SELECT id, question_text, unit_id, problem_type_id, answer, explanation, difficulty
       FROM user_items
      WHERE content_hash IS NULL OR dedup_key_norm_version IS NULL OR dedup_key_norm_version != ?1
      LIMIT ${limit}`
  ).bind(QNORM_VERSION).all()).results) || [];
  const updated = [], skipped_empty = [], conflicts = [];
  for (const row of rows) {
    const h = await computeItemHashes(row);
    if (h.empty) { skipped_empty.push(row.id); continue; }
    try {
      await env.AXIS_DB.prepare(
        `UPDATE user_items SET content_hash=?1, dedup_key=?2, dedup_key_norm_version=?3, updated_at=?4 WHERE id=?5`
      ).bind(h.content_hash, h.dedup_key, QNORM_VERSION, new Date().toISOString(), row.id).run();
      updated.push({ id: row.id, content_hash: h.content_hash, dedup_key: h.dedup_key });
    } catch (e) {
      // content_hash UNIQUE 위반 = 동일내용 기존행 존재. 실패시키지 말고 목록보고(검수 지시).
      conflicts.push({ id: row.id, content_hash: h.content_hash, error: (e && e.message) || String(e) });
    }
  }
  return { ok: true, norm_version: QNORM_VERSION, candidates: rows.length, updated, skipped_empty, conflicts };
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
    const usageSink = [];   // 호출별 토큰 집계(비용 실측). 아래 두 경로가 여기에 쌓는다.
    // 범위가 지정돼 있으면 2단계로 간다. 유효한 problem_type_id가 나오는 유일한 경로다.
    // 범위가 없는 옛 클라이언트 요청은 종전 단일 호출로 처리한다.
    const engineTask = scope.units.length
      ? runJsonTask({
          env, task: `analyze_engine_staged_${scope.mode}`, files: prepared, structured: true, usageSink,
          prompt: '', schemaName: 'math_engine_adapter_staged', schema: null,
          run: () => runStagedEngineAdapter({ env, payload, files: prepared, scope, usageSink }),
          fallback: () => pickKeys(buildAnalyzeFallback(payload, 'analyze_engine_staged_fallback'), ENGINE_ADAPTER_KEYS)
        })
      : runJsonTask({
          env, task: 'analyze_engine', files: prepared, structured: true, usageSink,
          prompt: only('engine_adapter와 ok만 채운다. 화면용 검토 문구는 이번 응답에서 생성하지 않는다.'),
          schemaName: 'math_engine_adapter', schema: ENGINE_ADAPTER_SCHEMA,
          fallback: () => pickKeys(buildAnalyzeFallback(payload, 'analyze_engine_fallback'), ENGINE_ADAPTER_KEYS)
        });
    const reviewPrompt = only('engine_adapter는 이번 응답에서 생성하지 않는다. 나머지 검토 항목만 채운다.');
    const [engine, review] = await Promise.all([
      engineTask,
      runJsonTask({
        env, task: 'analyze_review', files: prepared, structured: false, usageSink,
        prompt: reviewPrompt, schemaName: 'math_material_review', schema: REVIEW_SCHEMA,
        // review-hardening: structured=true 우선 시도 → grammar 컴파일/파싱 실패 시 기존 structured=false로 폴백.
        // 실패 attempt는 생성 前 400이라 토큰 거의 0(비용 안전). 회귀 불가(최악=현행).
        run: () => callReviewWithFallback({ env, prompt: reviewPrompt, files: prepared, schema: REVIEW_SCHEMA, usageSink }),
        fallback: () => dropKeys(buildAnalyzeFallback(payload, 'analyze_review_fallback'), ENGINE_ADAPTER_KEYS)
      })
    ]);
    const merged = { ...stripRuntime(review), ...stripRuntime(engine) };
    const guardNote = applyNoWorkGuard(merged);   // 차단1: 풀이 부재 파일이면 정오답 판정 무력화 + D1오염(run_diagnoseWithGuidance) 차단
    const notes = [engine?._runtime?.note, review?._runtime?.note, guardNote].filter(Boolean);
    const usageSummary = summarizeUsage(usageSink, env);
    merged._runtime = { ...(notes.length ? { note: notes.join(' | ') } : {}), worker_version: VERSION, usage: usageSummary };
    return merged;
  } finally {
    await deleteUploadedFiles(env, prepared);
  }
}

// 차단1(2026-08-11, ISSUE_diagnosis_false_correct): 학생 풀이가 없는 파일(문제지 등)인데 stage-1이
// 문항을 CORRECT_COMPLETE로 오분류하면 is_correct=true가 D1까지 흘러 "전부 정답·오류 0"으로 오염된다.
// engine_adapter와 review는 병렬 독립 2콜이라 review의 "풀이 없음" 판정이 engine을 못 막았다.
// 병합 후 파일레벨 신호로 정오답을 무력화하고 run_diagnoseWithGuidance를 떼어 저장 경로를 끊는다.
// ★파일레벨로만 판별한다: 개별 문항의 빈 student_work/answer로 막으면 정상 CORRECT_COMPLETE(설계상
//   work·answer가 빈값 — 프롬프트 600행)까지 오탐한다. 파일 전체 "풀이 부재"가 맞는 기준.
function applyNoWorkGuard(merged) {
  const ev = merged?.extraction_summary?.student_did_work_evidence;   // strong|some|weak|none
  const routing = merged?.file_purpose_review?.routing_decision;      // solve_diagnosis|mixed_diagnosis|concept_review|verification_review|insufficient
  const proc = merged?.solution_review?.process_evidence;             // full_process|partial_process|answer_only|not_visible
  // 수정2(2026-08-11): 'some'+not_visible 구멍 차단. 정상 정답 파일은 full/partial/answer_only이고
  // not_visible = 아무 필기도 없는 파일이므로, strong이 아닌 한 not_visible이면 풀이 부재로 본다.
  const noWork = ev === 'none'
    || (routing && routing !== 'solve_diagnosis' && routing !== 'mixed_diagnosis')
    || (ev !== 'strong' && proc === 'not_visible');
  if (!noWork) return '';
  const reason = ev === 'none' ? 'evidence=none'
    : (routing && routing !== 'solve_diagnosis' && routing !== 'mixed_diagnosis') ? 'routing=' + routing
    : 'proc=not_visible';
  const ea = merged?.engine_adapter;
  const atts = ea?.student_attempt?.attempts;
  let n = 0;
  if (Array.isArray(atts)) for (const a of atts) { a.response_status = 'UNKNOWN'; a.is_correct = null; a.observed_error_tags = []; n++; }
  if (ea && Array.isArray(ea.recommended_engine_actions)) {
    ea.recommended_engine_actions = ea.recommended_engine_actions.filter(x => x !== 'run_diagnoseWithGuidance');
  }
  // 수정1(2026-08-11): _staged는 가드 전에 계산돼 최상위에 붙는다. states를 재계산하고 기계판독 표식을
  //   남겨, "attempts는 UNKNOWN인데 _staged.states는 CORRECT_COMPLETE:20"인 새 모순을 없앤다.
  if (merged._staged && typeof merged._staged === 'object') {
    const st = {};
    for (const a of (atts || [])) st[a.response_status || 'UNKNOWN'] = (st[a.response_status || 'UNKNOWN'] || 0) + 1;
    merged._staged.states = st;
    merged._staged.guard_applied = true;
    merged._staged.guard_reason = reason;
  }
  console.log(`[axis-guard] no_work file (${reason}) → ${n}문항 정오답 무력화·저장차단`);
  return `guard:no_work(${reason}) → ${n}문항 정오답 무력화·저장차단`;
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

// 재태깅 관측 어휘(fine error_tags)를 유형별 후보로 주입하는 오버레이. 경로는 index.v1.json의
// 단원 엔트리 fine_error_tags_overlay에서 온다(하드코딩 맵 제거 → 단원 추가는 데이터만, Worker 재배포 불요).
// 프로덕션 problem_types는 무변경. 오버레이 없는 단원은 후보 없이 종전대로 동작(가산적·무해·fail-open).
async function fetchFineErrorTagOverlay(scope, overlayPath) {
  if (!overlayPath || !scope.dataBase) return {};
  try {
    const res = await fetch(`${scope.dataBase}/${overlayPath}`, { cf: { cacheTtl: 3600 } });
    if (!res.ok) return {};
    const pack = await res.json();
    return pack.pt_fine_error_tags || {};
  } catch (err) {
    console.warn(`fine overlay load failed (${overlayPath}):`, err?.message || err);
    return {};
  }
}

async function fetchUnitProblemTypes(scope, unitId) {
  if (!scope.dataBase) throw new Error('engine_data_base가 없어 유형 목록을 받을 수 없다');
  const idx = await (await fetch(`${scope.dataBase}/data/index.v1.json`, { cf: { cacheTtl: 3600 } })).json();
  const unit = (idx.units || []).find(u => u.unit_id === unitId);
  if (!unit?.problem_types) throw new Error(`${unitId}의 problem_types 경로가 없다`);
  const pack = await (await fetch(`${scope.dataBase}/${unit.problem_types}`, { cf: { cacheTtl: 3600 } })).json();
  const fineByPt = await fetchFineErrorTagOverlay(scope, unit.fine_error_tags_overlay);
  // category는 여기서 원본 description으로 파싱해 부착한다. 이 map이 description을 솎아내던 탓에
  // assignTypesForUnit의 deriveCategory(t)가 undefined를 읽어 전건 파싱 실패 → 단일단계 폴백했다(catstage-a2 버그).
  return (pack.problem_types || [])
    .map(p => ({ id: p.problem_type_id, name: p.type_name, fine_error_tags: fineByPt[p.problem_type_id] || [], description: p.description || '', category: deriveCategory(p) }))
    .filter(p => p.id);
}

// 문항 상태는 맞음/틀림 두 값으로는 부족하다. 풀다 만 것과 빈칸이 "틀림"에 뭉개지면
// 시도율과 정확도를 나눌 수 없고, 빈칸을 세지 못하면 전체 문항 수도 서지 않는다.
// 엔진(responseStatusOf)이 이미 아는 다섯 값을 그대로 쓴다.
const RESPONSE_STATES = ['CORRECT_COMPLETE', 'WRONG_COMPLETE', 'PARTIAL_STOP', 'ANSWER_ONLY', 'BLANK_UNKNOWN'];

const RESPONSE_STATE_RULE = `[문항 상태 — 아래 다섯 중 하나로 정확히 분류한다]
- CORRECT_COMPLETE : 풀이가 끝까지 있고 답이 맞다.
- WRONG_COMPLETE   : 풀이가 끝까지 있으나 답이 틀리다.
- PARTIAL_STOP     : 풀이를 시작했으나 중간에서 멈췄고 최종 답이 없다.
- ANSWER_ONLY      : 답은 적혀 있으나 풀이 과정이 없다(정답 여부와 무관).
- BLANK_UNKNOWN    : 문항은 시험지에 있으나 풀이도 답도 없다.
빈칸 문항도 반드시 목록에 넣는다. 빈칸을 빠뜨리면 전체 문항 수가 틀어진다.
채점 표시가 없으면 풀이 결과로 정오답을 판단한다.`;

const UNIT_ASSIGN_SCHEMA = (unitIds) => ({
  type: 'object', additionalProperties: false, required: ['assignments'],
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['question_no', 'unit_id', 'response_status'],
        properties: {
          question_no: { type: 'string' },
          unit_id: { type: 'string', enum: unitIds },
          response_status: { type: 'string', enum: RESPONSE_STATES }
        }
      }
    }
  }
});

// 조각으로 나눠 물을 때, 그 조각에 정답 유형이 없을 수도 있다. 강제로 하나를 고르게 하면
// 조각마다 엉뚱한 유형이 하나씩 나와 합칠 때 오염된다. "여기엔 없다"를 고를 수 있어야 한다.
const NO_MATCH = '__NO_MATCH__';

const TYPE_ASSIGN_SCHEMA = (typeIds, allowNoMatch = false) => ({
  type: 'object', additionalProperties: false, required: ['attempts'],
  properties: {
    attempts: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        // question_text는 required로 강제한다. optional로 두면 모델이 전사를 건너뛴다(관측됨).
        // required면 문법이 모든 문항에서 문자열 생성을 강제 → 프롬프트의 전사 지시가 실효.
        required: allowNoMatch
          ? ['question_no', 'problem_type_id', 'response_status', 'difficulty', 'observed_error_tags', 'question_text', 'confidence']
          : ['question_no', 'problem_type_id', 'response_status', 'difficulty', 'observed_error_tags', 'question_text'],
        properties: {
          question_no: { type: 'string' },
          problem_type_id: { type: 'string', enum: allowNoMatch ? [...typeIds, NO_MATCH] : typeIds },
          response_status: { type: 'string', enum: RESPONSE_STATES },
          difficulty: { type: 'string', enum: ['basic', 'core', 'advanced', 'high'] },
          observed_error_tags: { type: 'array', items: { type: 'string' } },
          // 매칭용: 이 문항의 문제 본문(학생 풀이 제외). 등록 문항(user_items)과 대조해 정답/해설을 붙인다.
          question_text: { type: 'string' },
          // Fix-A(풀이 원문 보존): 태그 세분화 재료. WRONG/PARTIAL만 채우고 나머지는 빈 문자열.
          // required 아님(정답·빈칸 문항은 강제 생성 안 함) — 오답에서만 비용을 쓴다.
          student_work_text: { type: 'string' },
          student_answer: { type: 'string' },
          tag_rationale: { type: 'string' },
          // 조각이 여러 개면 둘 이상이 같은 문항을 자기 것이라 할 수 있다. 그때 고르는 기준.
          ...(allowNoMatch ? { confidence: { type: 'number' } } : {})
        }
      }
    }
  }
});

function chunkList(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// description 접두("…범주")에서 범주를 코드로 파싱한다(AI 아님). 실패 시 null → 단일단계 폴백.
function deriveCategory(t) {
  const m = /^\s*(.+?)\s*범주/.exec(String((t && t.description) || ''));
  return m ? m[1].trim() : null;
}
function renderTypeLine(t) {
  const fine = (t.fine_error_tags && t.fine_error_tags.length)
    ? `\n    [후보 오류태그] ${t.fine_error_tags.join(', ')}` : '';
  return `${t.id} = ${t.name}${fine}`;
}
// 레버 A 자동 스코프: 다범주·대형 단원만 2단계. 소형·단일범주·파싱실패는 단일단계 유지(회귀 없음).
const CATEGORY_STAGE_MIN_TYPES = 60;
const CATEGORY_STAGE_MIN_CATS = 3;

const CATEGORY_ASSIGN_SCHEMA = (cats) => ({
  type: 'object', additionalProperties: false, required: ['assignments'],
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['question_no', 'category', 'category_confidence'],
        properties: {
          question_no: { type: 'string' },
          category: { type: 'string', enum: [...cats, NO_MATCH] },
          category_confidence: { type: 'number' }
        }
      }
    }
  }
});

// TYPE_ASSIGN 규칙(전사·오류태그·오답원문·NO_MATCH). 단일단계 프롬프트와 동일 문구를 2단계·복구가 공유한다.
const TYPE_ASSIGN_RULES = `규칙:
- 대상 문항 전부에 대해 한 줄씩 낸다.
- response_status는 위에 적힌 상태를 그대로 다시 쓴다. 임의로 바꾸지 않는다.
- question_text: 이 문항의 **문제 본문을 글자 그대로 전사한다.** 요약·축약·재서술·부분 생략을 절대 하지 않는다.
  시험지에 인쇄된 문제 문장을 문두부터 문말(예: "…구하시오.", "…설명하시오.")까지 **빠짐없이** 옮긴다 —
  조건·단서·괄호·단위·마무리 어구까지 전부. 네 말로 바꾸지 말고 인쇄된 그대로. 학생 풀이·답은 제외(문제 문장만).
  수식은 평문으로(1/3, 루트2, x^2, <=, ×).
  ★나쁜 예(요약·뒷부분 누락 — 금지): "이차함수 y=(x-3)^2-4의 꼭짓점"
  ★좋은 예(전문 전사): "이차함수 y = (x-3)^2 - 4 의 꼭짓점의 좌표를 구하시오."
  이 값은 등록 문항과 대조(매칭)하는 키라 한 글자라도 빠지면 매칭이 깨진다. 정답/오답과 무관하게 모든 문항에서 이렇게 채운다.
- observed_error_tags는 WRONG_COMPLETE·PARTIAL_STOP에서 실제로 관찰된 오류만 쓴다.
  CORRECT_COMPLETE와 BLANK_UNKNOWN은 빈 배열로 둔다.
  유형에 [후보 오류태그]가 붙어 있으면 그 중 실제 관찰된 것을 우선 고른다. 이 후보는
  재태깅 관측 어휘와 정합하여 축(17진단축) 진단으로 이어진다. 후보에 없는 오류만
  자연어로 덧붙이되 최소화한다.
- WRONG_COMPLETE·PARTIAL_STOP 문항은 아래 셋을 함께 남긴다(오답 세분화 재료).
  CORRECT_COMPLETE·BLANK_UNKNOWN은 셋 다 빈 문자열("")로 둔다.
  · student_work_text: 학생이 그 문항에 실제로 쓴 풀이를 원문 그대로 옮긴다. 핵심 단계·식
    위주로 짧게(대략 400자 이내), 결정적으로 틀어진 지점이 반드시 포함되게 한다.
  · student_answer: 학생이 최종 답으로 쓴 값(없으면 "").
  · tag_rationale: observed_error_tags를 그렇게 고른 근거를 한 문장으로.
- 개인정보 보호: 풀이·답에 이름·학교·전화번호 등 개인식별정보가 보여도 옮기지 않는다.
  수학 풀이 내용만 남긴다.
- difficulty는 문항 난도다.
- 자기 후보 목록에 이 문항과 맞는 유형이 없으면 **억지로 고르지 말고** problem_type_id를 "${NO_MATCH}"로, confidence를 0으로 둔다.
  특히 그림에 의존하는 문항을 본문만으로 구분하기 어려우면 비슷한 유형을 억지로 붙이지 말 것 — 틀린 유형보다 "없음"이 낫다.
- 맞는 유형이 있으면 confidence를 0보다 크게(확신할수록 1에 가깝게) 쓴다.`;

// 레버 A(범주 2단계, A2 단일콜 + 조건부 복구). 자격 미달 단원은 assignSingleStage로 위임한다.
// 반환은 { rows, meta } — 계측(category_assigned·menu_violation·recovered)을 _staged로 올린다.
async function assignTypesForUnit({ env, files, unitId, rows, types, usageSink }) {
  // category는 fetchUnitProblemTypes가 원본 description에서 파싱해 이미 부착한다. 여기선 판정·계측만.
  const parseFailed = types.filter(t => !t.category);
  const parseMeta = {
    parse_failed_count: parseFailed.length,
    parse_failed_sample: parseFailed.slice(0, 3).map(t => ({ id: t.id, description: String(t.description || '').slice(0, 60) })),
    description_present: `${types.filter(t => t.description).length}/${types.length}`
  };
  const allHaveCat = parseFailed.length === 0;
  const catSet = Array.from(new Set(types.map(t => t.category).filter(Boolean)));
  const eligible = allHaveCat && catSet.length >= CATEGORY_STAGE_MIN_CATS && types.length >= CATEGORY_STAGE_MIN_TYPES;
  if (!eligible) {
    const reason = !allHaveCat ? 'parse_incomplete' : (catSet.length < CATEGORY_STAGE_MIN_CATS ? 'few_categories' : 'small_unit');
    const rowsOut = await assignSingleStage({ env, files, unitId, rows, types, usageSink });
    return { rows: rowsOut, meta: { unit_id: unitId, category_stage: 'single', reason, categories: catSet.length, types: types.length, ...parseMeta } };
  }

  const catToTypes = {};
  for (const t of types) (catToTypes[t.category] = catToTypes[t.category] || []).push(t);

  // 2a: 범주 배정(없음 허용). category_confidence 기록.
  const targetList = rows.map(r => `${r.question_no}번 (상태: ${r.response_status})`).join('\n');
  const catMenu = catSet.join('\n');
  const catByNo = new Map();
  try {
    const catOut = await callClaudeJson({
      env, files, structured: true, label: `analyze_stage2cat_${unitId}`, usageSink,
      schemaName: `category_assignment_${unitId}`,
      schema: CATEGORY_ASSIGN_SCHEMA(catSet),
      prompt: `아래 문항들은 「${unitId}」 단원으로 확정됐다. 각 문항이 이 단원의 어느 "범주"에 속하는지 고르라.
세부 유형이 아니라 큰 범주다. 뒤 단계에서 그 범주 안의 세부 유형을 다시 고른다.

[대상 문항]
${targetList}

[범주 목록 · 이 목록 밖은 고를 수 없다]
${catMenu}

규칙:
- 대상 문항 전부에 한 줄씩 낸다.
- 맞는 범주가 없거나 그림만으로 범주를 정하기 어려우면 억지로 고르지 말고 category를 "${NO_MATCH}"로, category_confidence를 0으로 둔다.
- 맞으면 category_confidence를 0보다 크게(확신할수록 1에 가깝게) 쓴다.`
    });
    for (const a of (catOut?.assignments || [])) if (a && a.question_no) catByNo.set(String(a.question_no), a);
  } catch (err) {
    // 범주 단계가 실패하면 2단계를 포기하고 단일단계로 폴백(회귀 없음).
    console.error(`stage2 category failed (${unitId}):`, err?.message || err);
    const rowsOut = await assignSingleStage({ env, files, unitId, rows, types, usageSink });
    return { rows: rowsOut, meta: { unit_id: unitId, category_stage: 'single', reason: 'category_call_failed', categories: catSet.length, types: types.length, ...parseMeta } };
  }

  // 2b: 문항별 후보 메뉴(A2). 스키마 enum은 배정범주 합집합(+NO_MATCH). 프롬프트가 문항별로 좁힌다.
  const rowCat = new Map();   // no -> { category|null, confidence, candIds:Set }
  const enumSet = new Set();
  const menuBlocks = [];
  for (const r of rows) {
    const a = catByNo.get(String(r.question_no));
    const cat = (a && a.category && a.category !== NO_MATCH && catToTypes[a.category]) ? a.category : null;
    const cand = cat ? catToTypes[cat] : types;   // 범주=없음이면 전체(그 문항은 여기서 이미 전부 봄 → 복구 불요)
    const candIds = new Set(cand.map(t => t.id));
    rowCat.set(String(r.question_no), { category: cat, confidence: a ? Number(a.category_confidence || 0) : 0, candIds });
    cand.forEach(t => enumSet.add(t.id));
    const lines = cand.map(t => '  ' + renderTypeLine(t).replace(/\n/g, '\n  ')).join('\n');
    menuBlocks.push(`${r.question_no}번 (상태: ${r.response_status}) [범주: ${cat || '전체(범주 미정)'}]\n${lines}`);
  }

  const askTypeAssign = async ({ header, enumIds, label }) => {
    const out = await callClaudeJson({
      env, files, structured: true, label, usageSink, schemaName: label,
      schema: TYPE_ASSIGN_SCHEMA(enumIds, true),
      prompt: `${header}

${TYPE_ASSIGN_RULES}`
    });
    return (out?.attempts || []);
  };

  const mainAttempts = await askTypeAssign({
    label: `analyze_stage2type_${unitId}`,
    enumIds: [...enumSet],
    header: `아래 문항들은 「${unitId}」 단원으로 확정됐다. 각 문항 아래에 그 문항의 후보 유형 목록이 있다.
각 문항은 **자기 후보 목록 안에서만** problem_type_id를 고른다. 다른 문항의 목록에서 고르지 않는다.

[대상 문항과 후보 유형]
${menuBlocks.join('\n\n')}`
  });

  const pick = new Map();     // no -> attempt(problem_type_id 있는 것 중 최고 confidence)
  const anyByNo = new Map();
  const absorb = (list, recovered) => {
    for (const a of list) {
      if (!a || !a.question_no) continue;
      const key = String(a.question_no);
      if (!anyByNo.has(key)) anyByNo.set(key, { ...a, _recovered: recovered });
      if (a.problem_type_id === NO_MATCH || !a.problem_type_id) continue;
      const prev = pick.get(key);
      if (!prev || Number(a.confidence || 0) > Number(prev.confidence || 0)) pick.set(key, { ...a, _recovered: recovered });
    }
  };
  absorb(mainAttempts, false);

  // 조건부 복구: 범주를 좁혔는데(그 문항 cat != null) 유형을 못 정한 문항만 전체로 재시도.
  // 범주=없음 문항은 이미 전체를 봤으므로 복구 대상 아님.
  const needRecovery = rows.filter(r => {
    const rc = rowCat.get(String(r.question_no));
    return !pick.get(String(r.question_no)) && rc && rc.category;   // 좁혔으나 미결정
  });
  let recoveredCount = 0;
  if (needRecovery.length) {
    const fullMenu = types.map(renderTypeLine).join('\n');
    const recTarget = needRecovery.map(r => `${r.question_no}번 (상태: ${r.response_status})`).join('\n');
    const recAttempts = await askTypeAssign({
      label: `analyze_stage2recover_${unitId}`,
      enumIds: types.map(t => t.id),
      header: `아래 문항들은 「${unitId}」 단원으로 확정됐으나 앞 단계에서 유형을 정하지 못했다. 이 단원 전체 유형에서 다시 고르라.

[대상 문항]
${recTarget}

[문항유형 목록 · 이 목록 밖은 고를 수 없다]
${fullMenu}`
    });
    absorb(recAttempts, true);
    recoveredCount = needRecovery.filter(r => pick.get(String(r.question_no))).length;
  }

  // 채택 + 계측 조립.
  const menuViolation = [];
  const perQuestion = [];
  const rowsOut = rows.map(r => {
    const key = String(r.question_no);
    const rc = rowCat.get(key) || { category: null, confidence: 0, candIds: new Set() };
    const hit = pick.get(key);
    const recovered = hit ? !!hit._recovered : false;
    let ptid = '';
    let base;
    if (hit) {
      const { _chunk, _recovered, confidence, ...rest } = hit;
      base = { ...rest, question_no: r.question_no, unit_id: unitId };
      ptid = hit.problem_type_id || '';
    } else {
      const any = anyByNo.get(key) || {};
      const { _chunk, _recovered, confidence, problem_type_id, ...carry } = any;
      base = { ...carry, question_no: r.question_no, problem_type_id: '', response_status: any.response_status || r.response_status, difficulty: any.difficulty || 'core', observed_error_tags: any.observed_error_tags || [], unit_id: unitId };
    }
    // menu_violation: 확정 유형이 그 문항 범주 후보에 없으면(합집합 enum 때문에 가능) 기록. 복구·범주없음은 제외.
    const menuOk = !ptid || recovered || !rc.category || rc.candIds.has(ptid);
    if (!menuOk) menuViolation.push({ question_no: r.question_no, unit_id: unitId, problem_type_id: ptid, category: rc.category });
    perQuestion.push({ question_no: r.question_no, unit_id: unitId, category: rc.category || NO_MATCH, category_confidence: rc.confidence, problem_type_id: ptid, menu_ok: menuOk, recovered });
    return base;
  });

  return {
    rows: rowsOut,
    meta: {
      unit_id: unitId, category_stage: 'two_stage', categories: catSet.length, types: types.length,
      per_question: perQuestion, menu_violation: menuViolation, recovered_count: recoveredCount, ...parseMeta
    }
  };
}

// 한 단원의 유형을 확정한다(단일단계). 한도 안이면 종전대로 한 번에, 넘으면 조각으로 나눠 병렬로
// 묻고 합친다. 호출부는 어느 쪽인지 알 필요가 없다.
async function assignSingleStage({ env, files, unitId, rows, types, usageSink }) {
  const chunks = chunkList(types, MAX_ENUM_TYPES);
  const targetList = rows.map(r => `${r.question_no}번 (상태: ${r.response_status})`).join('\n');
  const askChunk = async (part, i) => {
    const split = chunks.length > 1;
    const menu = part.map(t => {
      const fine = (t.fine_error_tags && t.fine_error_tags.length)
        ? `\n    [후보 오류태그] ${t.fine_error_tags.join(', ')}`
        : '';
      return `${t.id} = ${t.name}${fine}`;
    }).join('\n');
    const out = await callClaudeJson({
      env, files, structured: true, label: `analyze_stage2_type_${unitId}${split ? `_${i + 1}` : ''}`, usageSink,
      schemaName: `type_assignment_${unitId}${split ? `_${i + 1}` : ''}`,
      // 차단2(2026-08-11): NO_MATCH+confidence를 조각(split)일 때만이 아니라 항상 허용한다.
      // 단일 청크에서 강제 선택하게 두면 그림 의존 문항이 소수 유형으로 붕괴하고, type_matched가 이를 성공으로 계수했다.
      schema: TYPE_ASSIGN_SCHEMA(part.map(t => t.id), true),
      prompt: `아래 문항들은 「${unitId}」 단원으로 확정됐다. 각 문항이 이 단원의 어느 문항유형인지 고르라.

[대상 문항]
${targetList}

[문항유형 목록${split ? ` — 이 단원 유형 ${types.length}개 중 ${i + 1}/${chunks.length} 조각` : ''} · 이 목록 밖은 고를 수 없다]
${menu}

규칙:
- 대상 문항 전부에 대해 한 줄씩 낸다.
- response_status는 위에 적힌 상태를 그대로 다시 쓴다. 임의로 바꾸지 않는다.
- question_text: 이 문항의 **문제 본문을 글자 그대로 전사한다.** 요약·축약·재서술·부분 생략을 절대 하지 않는다.
  시험지에 인쇄된 문제 문장을 문두부터 문말(예: "…구하시오.", "…설명하시오.")까지 **빠짐없이** 옮긴다 —
  조건·단서·괄호·단위·마무리 어구까지 전부. 네 말로 바꾸지 말고 인쇄된 그대로. 학생 풀이·답은 제외(문제 문장만).
  수식은 평문으로(1/3, 루트2, x^2, <=, ×).
  ★나쁜 예(요약·뒷부분 누락 — 금지): "이차함수 y=(x-3)^2-4의 꼭짓점"
  ★좋은 예(전문 전사): "이차함수 y = (x-3)^2 - 4 의 꼭짓점의 좌표를 구하시오."
  이 값은 등록 문항과 대조(매칭)하는 키라 한 글자라도 빠지면 매칭이 깨진다. 정답/오답과 무관하게 모든 문항에서 이렇게 채운다.
- observed_error_tags는 WRONG_COMPLETE·PARTIAL_STOP에서 실제로 관찰된 오류만 쓴다.
  CORRECT_COMPLETE와 BLANK_UNKNOWN은 빈 배열로 둔다.
  유형에 [후보 오류태그]가 붙어 있으면 그 중 실제 관찰된 것을 우선 고른다. 이 후보는
  재태깅 관측 어휘와 정합하여 축(17진단축) 진단으로 이어진다. 후보에 없는 오류만
  자연어로 덧붙이되 최소화한다.
- WRONG_COMPLETE·PARTIAL_STOP 문항은 아래 셋을 함께 남긴다(오답 세분화 재료).
  CORRECT_COMPLETE·BLANK_UNKNOWN은 셋 다 빈 문자열("")로 둔다.
  · student_work_text: 학생이 그 문항에 실제로 쓴 풀이를 원문 그대로 옮긴다. 핵심 단계·식
    위주로 짧게(대략 400자 이내), 결정적으로 틀어진 지점이 반드시 포함되게 한다.
  · student_answer: 학생이 최종 답으로 쓴 값(없으면 "").
  · tag_rationale: observed_error_tags를 그렇게 고른 근거를 한 문장으로.
- 개인정보 보호: 풀이·답에 이름·학교·전화번호 등 개인식별정보가 보여도 옮기지 않는다.
  수학 풀이 내용만 남긴다.
- difficulty는 문항 난도다.
- 위 목록에 이 문항과 맞는 유형이 없으면 **억지로 고르지 말고** problem_type_id를 "${NO_MATCH}"로, confidence를 0으로 둔다.
  특히 그림에 의존하는 문항을 본문만으로 구분하기 어려우면 비슷한 유형을 억지로 붙이지 말 것 — 틀린 유형보다 "없음"이 낫다.${split ? `
  (참고: 이 목록은 단원 전체 유형의 일부다.)` : ''}
- 맞는 유형이 있으면 confidence를 0보다 크게(확신할수록 1에 가깝게) 쓴다.`
    });
    return (out?.attempts || []).map(x => ({ ...x, _chunk: i + 1 }));
  };

  // 차단2: 단일 청크도 NO_MATCH를 낼 수 있어 단일/다중 모두 같은 채택 경로를 쓴다.
  // 단일 청크는 실패를 caller가 처리하도록 그대로 던진다(종전 동작). 다중은 조각별 실패를 흡수한다.
  const settled = chunks.length === 1
    ? [await askChunk(chunks[0], 0)]
    : await Promise.all(chunks.map((part, i) => askChunk(part, i).catch(err => {
        console.error(`stage2 chunk failed (${unitId} ${i + 1}/${chunks.length}):`, err?.message || err);
        return [];
      })));

  // 문항별로 가장 확신이 높은 조각의 답을 채택한다. 전 조각이 "없다"(NO_MATCH)면 유형은 비우되
  // 단원·정오답·question_text(매칭키)는 살린다.
  const best = new Map();
  const anyByNo = new Map();   // NO_MATCH여도 question_text 등 보존 — 유형 못 정했다고 매칭키를 잃지 않는다.
  for (const a of settled.flat()) {
    if (!a?.question_no) continue;
    const key = String(a.question_no);
    if (!anyByNo.has(key)) anyByNo.set(key, a);
    if (a.problem_type_id === NO_MATCH || !a.problem_type_id) continue;
    const prev = best.get(key);
    if (!prev || Number(a.confidence || 0) > Number(prev.confidence || 0)) best.set(key, a);
  }
  return rows.map(r => {
    const key = String(r.question_no);
    const hit = best.get(key);
    if (hit) {
      const { _chunk, confidence, ...rest } = hit;
      return { ...rest, question_no: r.question_no, unit_id: unitId };
    }
    const any = anyByNo.get(key);
    const { _chunk, confidence, problem_type_id, ...carry } = any || {};
    // 태그는 버리지 않는다: NO_MATCH여도 학생이 틀렸고 오류가 식별됐으면 축 진단 재료다(검수 지적).
    return { ...carry, question_no: r.question_no, problem_type_id: '', response_status: any?.response_status || r.response_status, difficulty: any?.difficulty || 'core', observed_error_tags: any?.observed_error_tags || [], unit_id: unitId };
  });
}

async function runStagedEngineAdapter({ env, payload, files, scope, usageSink }) {
  if (!scope.units.length) throw new Error('후보 단원이 비어 있다(시험 범위 미선택)');
  const unitIds = scope.units.map(u => u.unit_id);
  const unitMenu = scope.units.map(u => `${u.unit_id} = ${u.unit_name}`).join('\n');

  // 1단계: 문항 → 단원
  const stage1 = await callClaudeJson({
    env, files, structured: true, schemaName: 'unit_assignment', label: 'analyze_stage1_unit_assign', usageSink,
    schema: UNIT_ASSIGN_SCHEMA(unitIds),
    prompt: `학생이 제출한 시험지/풀이를 읽고, 채점 대상 문항마다 어느 단원 문제인지 고르라.

[선택 가능한 단원 — 이 목록 밖은 고를 수 없다]
${unitMenu}

규칙:
- 문항 번호(question_no)는 자료에 적힌 번호를 그대로 문자열로 쓴다.
- 시험지에 있는 문항은 빠짐없이 넣는다. 빈칸도 넣는다. 없는 문항을 만들지는 않는다.
- 범위: ${scope.label || '전체'}

${RESPONSE_STATE_RULE}`
  });

  const assignments = (stage1?.assignments || []).filter(a => a.question_no && a.unit_id);
  if (!assignments.length) throw new Error('1단계에서 배정된 문항이 없다');

  // 2단계: 단원별로 묶어 병렬. 한 단원이 실패해도 나머지 단원 진단은 남는다.
  const byUnit = {};
  for (const a of assignments) (byUnit[a.unit_id] = byUnit[a.unit_id] || []).push(a);

  const chunkPlan = [];
  const typeLoadFailed = [];   // 유형 로드 실패 단원(미구축·데이터 부재). 조용히 넘기지 않고 결과에 남긴다.
  const stageMetas = [];       // 레버 A 계측: 단원별 단계·문항별 범주배정·메뉴이탈·복구수.
  const results = await Promise.all(Object.keys(byUnit).map(async unitId => {
    const rows = byUnit[unitId];
    try {
      const types = await fetchUnitProblemTypes(scope, unitId);
      if (!types.length) throw new Error(`${unitId} 유형 목록이 비어 있다`);
      // 한도를 넘는 단원은 assignTypesForUnit이 알아서 조각내 처리한다. 예전처럼 통째로
      // 건너뛰지 않는다 — 고등 9개 단원이 그래서 유형 없이 나가고 있었다.
      chunkPlan.push({ unit_id: unitId, types: types.length, chunks: Math.ceil(types.length / MAX_ENUM_TYPES) });
      const r = await assignTypesForUnit({ env, files, unitId, rows, types, usageSink });
      if (r && r.meta) stageMetas.push(r.meta);
      return (r && r.rows) || [];
    } catch (err) {
      console.error(`stage2 failed (${unitId}):`, err?.message || err);
      typeLoadFailed.push({ unit_id: unitId, question_count: rows.length, reason: err?.message || String(err) });
      stageMetas.push({ unit_id: unitId, category_stage: 'type_load_failed', reason: err?.message || String(err) });
      // 유형은 못 정해도 단원·정오답은 살아 있다. 버리지 않고 그대로 넘긴다.
      return rows.map(r => ({ question_no: r.question_no, problem_type_id: '', response_status: r.response_status, difficulty: 'core', observed_error_tags: [], unit_id: unitId }));
    }
  }));

  // 엔진은 response_status를 우선으로 읽지만, is_correct만 보는 옛 경로(폴백·렌더러)도
  // 남아 있다. 상태에서 파생해 같이 실어 두 경로가 어긋나지 않게 한다.
  const attempts = results.flat().map(a => ({
    ...a,
    is_correct: a.response_status === 'CORRECT_COMPLETE'
  }));
  const topUnit = Object.keys(byUnit).sort((a, b) => byUnit[b].length - byUnit[a].length)[0] || '';
  const matched = attempts.filter(a => a.problem_type_id).length;
  // 차단2: type_matched(유형ID 존재 수)는 붕괴를 성공으로 오독한다. 유형 분포·종수·무유형을 함께 낸다.
  const typeDist = {};
  for (const a of attempts) if (a.problem_type_id) typeDist[a.problem_type_id] = (typeDist[a.problem_type_id] || 0) + 1;
  const distinctTypes = Object.keys(typeDist).length;
  const noType = attempts.filter(a => !a.problem_type_id).length;
  const states = {};
  for (const a of attempts) states[a.response_status || 'UNKNOWN'] = (states[a.response_status || 'UNKNOWN'] || 0) + 1;
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
    _staged: {
      mode: scope.mode, scope: scope.label, units: Object.keys(byUnit),
      questions: attempts.length, type_matched: matched,
      // 차단2: distinct_types가 questions 대비 과소(예: 20문항→3종)면 유형 붕괴 신호. type_distribution으로 어디에 뭉쳤는지 본다.
      distinct_types: distinctTypes, no_type: noType, type_distribution: typeDist,
      // 5상태 분포. 빈칸이 0으로만 나오면 판독이 빈칸을 놓치고 있다는 신호다.
      states,
      // 어느 단원이 몇 조각으로 나뉘었는지. 유형이 안 붙었을 때 조각 문제인지 판별하는 값이다.
      chunked: chunkPlan.filter(c => c.chunks > 1),
      // 유형 로드 실패 단원(미구축·PT파일 부재 등). 비어 있지 않으면 그 단원 문항은 유형·개념 진단이 빠진 것.
      type_load_failures: typeLoadFailed,
      // 레버 A(범주 2단계) 계측 — 2회 실측 대조용. units: 단원별 단계(single/two_stage/type_load_failed)·사유.
      // per_question: 문항별 category_assigned·category_confidence·menu_ok·recovered. menu_violation: 문항 후보밖 배정(A2 느슨함 지표).
      // recovered_count: 좁힌뒤 못 정해 전체메뉴로 복구된 수(판정은 복구 제외 일치율로).
      type_stage: {
        units: stageMetas.map(m => ({ unit_id: m.unit_id, mode: m.category_stage, reason: m.reason || null, categories: m.categories || null, types: m.types || null, parse_failed_count: m.parse_failed_count ?? null, parse_failed_sample: m.parse_failed_sample || null, description_present: m.description_present || null })),
        per_question: stageMetas.flatMap(m => m.per_question || []),
        menu_violation: stageMetas.flatMap(m => m.menu_violation || []),
        recovered_count: stageMetas.reduce((s, m) => s + (m.recovered_count || 0), 0)
      }
    }
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

async function runJsonTask({ env, task, prompt, files, schemaName, schema, fallback, validate, structured = true, run = null, usageSink = null }) {
  const stubMode = isStubMode(env);
  const allowFallback = boolEnv(env.ALLOW_STUB, false) || boolEnv(env.FALLBACK_ON_AI_ERROR, true);
  if (stubMode) return withRuntimeNote(fallback(), `stub_mode:${task}`);
  if (!env.ANTHROPIC_API_KEY) {
    if (boolEnv(env.ALLOW_STUB, false)) return withRuntimeNote(fallback(), 'missing_api_key_stub_fallback');
    throw httpError(500, 'ANTHROPIC_API_KEY is not configured. Set it as a Cloudflare Worker secret.');
  }
  try {
    // run이 주어지면 그 절차가 호출 전체를 책임진다(2단계 판정처럼 호출이 여러 번인 경우).
    const result = run ? await run() : await callClaudeJson({ env, prompt, files, schemaName, schema, structured, label: task, usageSink });
    if (validate) validate(result);
    return result;
  } catch (error) {
    console.error(`Claude JSON task failed (${task}):`, error?.message || error);
    if (allowFallback) return withRuntimeNote(fallback(), `ai_error_fallback:${error?.message || error}`);
    throw error;
  }
}

async function callClaudeJson({ env, prompt, files, schemaName, schema, structured = true, label, usageSink }) {
  // structured=false는 스키마가 커서 structured outputs의 문법 컴파일 한도를 넘는 경우다.
  // 그때는 스키마를 프롬프트로 지시하고 파싱 단계에서 검증한다(실패 시 기존 fallback 경로).
  const head = (structured || !schema) ? prompt : `${prompt}

[출력 형식]
아래 JSON Schema를 정확히 만족하는 JSON 객체 하나만 출력한다.
코드펜스(\`\`\`), 설명 문장, 앞뒤 텍스트를 절대 붙이지 않는다. 첫 글자는 {, 마지막 글자는 } 여야 한다.

[수식 표기 — 반드시 지킨다]
문자열 값 안에 백슬래시(\\)를 절대 쓰지 않는다. LaTeX를 쓰지 않는다.
\\frac{1}{3}, \\sqrt{2}, \\le, \\times, \\(x\\) 같은 표기는 JSON 문자열을 깨뜨린다.
수식은 학생이 읽는 평문으로 쓴다: 1/3, √2 또는 루트2, <=, ×, 0.333..., x^2, (123-1)/99.
${JSON.stringify(schema)}`;
  // files는 보통 prepareFiles()가 만든 배열이다. 원본 File 객체가 들어오는 단일 호출
  // 경로(답안 검토)에서는 여기서 변환하고, 그 경우에만 뒤처리도 여기서 책임진다.
  const ownsFiles = Array.isArray(files) && files.some(isFile);
  const prepared = ownsFiles ? await prepareFiles(env, files) : (files || []);
  try {
    return await requestClaudeJson({ env, head, prepared, schemaName, schema, structured, label, usageSink });
  } finally {
    if (ownsFiles) await deleteUploadedFiles(env, prepared);
  }
}

// review-hardening: structured=true 우선, 실패 시 structured=false 폴백(회귀 불가).
async function callReviewWithFallback({ env, prompt, files, schema, usageSink }) {
  try {
    return await callClaudeJson({ env, prompt, files, schemaName: 'math_material_review', schema, structured: true, label: 'analyze_review(structured)', usageSink });
  } catch (e) {
    return await callClaudeJson({ env, prompt, files, schemaName: 'math_material_review', schema, structured: false, label: 'analyze_review(prompt-fallback)', usageSink });
  }
}

// 참고 단가(USD/1M tok). 실제 청구는 Anthropic Console. effort/모델 바뀌면 여기 조정.
const MODEL_PRICING = {
  'claude-opus-4-8': { in: 5, out: 25 }, 'claude-opus-5': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 3, out: 15 }, 'claude-haiku-4-5': { in: 1, out: 5 }
};
function summarizeUsage(sink, env) {
  const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const calls = Array.isArray(sink) ? sink : [];
  let inTok = 0, outTok = 0, cacheRead = 0;
  for (const c of calls) { inTok += c.input_tokens || 0; outTok += c.output_tokens || 0; cacheRead += c.cache_read_input_tokens || 0; }
  const p = MODEL_PRICING[model] || null;
  const est = p ? +((inTok * p.in + outTok * p.out) / 1e6).toFixed(4) : null;
  return {
    model, effort: env.ANTHROPIC_EFFORT || DEFAULT_EFFORT, call_count: calls.length,
    total_input_tokens: inTok, total_output_tokens: outTok, total_cache_read_tokens: cacheRead,
    est_cost_usd: est, note: 'est only; 실제 청구는 Anthropic Console에서 확인',
    per_call: calls.map(c => ({ call: c.call, in: c.input_tokens, out: c.output_tokens }))
  };
}

async function requestClaudeJson({ env, head, prepared, schemaName, schema, structured, label, usageSink }) {
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
  const { text, stopReason, stopDetails, streamError, usage } = await collectClaudeStream(res);
  // usage 기록: 호출별 토큰·모델을 로그(Worker Logs)와 usageSink(응답 _runtime 집계)에 남긴다.
  const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const rec = { call: label || schemaName, model, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cache_read_input_tokens: usage.cache_read_input_tokens, cache_creation_input_tokens: usage.cache_creation_input_tokens };
  try { console.log('[usage]', JSON.stringify(rec)); } catch (e) {}
  if (Array.isArray(usageSink)) usageSink.push(rec);
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
    // 파서가 실패한 지점을 같이 싣는다. head/tail만으로는 "형식이 깨졌다"까지만 알 수 있고
    // 어느 글자에서 깨졌는지 몰라 추측 수정을 반복하게 된다.
    const pos = Number(String(err?.message || '').match(/position (\d+)/)?.[1]);
    const around = Number.isFinite(pos) ? ` · 깨진 위치 …${text.slice(Math.max(0, pos - 60), pos + 60).replace(/\s+/g, ' ')}…` : '';
    throw httpError(502, `Claude output was not valid JSON (${schemaName}) · len=${text.length} stop=${stopReason || 'none'} · ${err?.message || 'parse failed'}${around} · head="${head}" · tail="${tail}"`);
  }
}

// SSE를 읽어 text 블록만 이어 붙인다. adaptive thinking이 켜져 있어 thinking_delta가
// 먼저 흐르므로, content_block_start에서 type이 text인 index만 골라 담는다.
async function collectClaudeStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const textBlocks = new Set();
  let buf = '', text = '', stopReason = null, stopDetails = null, streamError = null;
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
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
      } else if (ev.type === 'message_start') {
        const u = ev.message && ev.message.usage;
        if (u) { usage.input_tokens = u.input_tokens || 0; usage.cache_read_input_tokens = u.cache_read_input_tokens || 0; usage.cache_creation_input_tokens = u.cache_creation_input_tokens || 0; }
      } else if (ev.type === 'message_delta') {
        if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
        if (ev.delta && ev.delta.stop_details) stopDetails = ev.delta.stop_details;
        if (ev.usage && typeof ev.usage.output_tokens === 'number') usage.output_tokens = ev.usage.output_tokens;
      } else if (ev.type === 'error') {
        streamError = (ev.error && ev.error.message) || 'unknown stream error';
      }
    }
  }
  return { text, stopReason, stopDetails, streamError, usage };
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

  let lastError = null;
  for (const candidate of attempts) {
    if (!candidate || candidate[0] !== '{') continue;
    for (const variant of [candidate, repairJsonText(candidate)]) {
      try { return JSON.parse(variant); } catch (err) { lastError = err; }
      // 후행 쉼표는 모델이 자주 남기는 형태라 한 번 더 시도한다.
      try { return JSON.parse(variant.replace(/,\s*([}\]])/g, '$1')); } catch (err) { lastError = err; }
    }
  }
  throw new SyntaxError(`no parsable JSON object found${lastError ? ` · 마지막 오류: ${lastError.message}` : ''}`);
}

// 프롬프트 방식(structured=false)에서 모델이 정상 종료(end_turn)하고도 JSON이 깨지는
// 두 가지를 되살린다.
//   1) 유효하지 않은 이스케이프 — LaTeX의 \(, \), \le, \sqrt 같은 것. JSON은 백슬래시 뒤에
//      ["\/bfnrtu]만 허용해서 "Bad escaped character"로 통째로 실패한다.
//   2) 문자열 안의 생 줄바꿈·탭 — JSON 문자열에는 그대로 들어갈 수 없다.
// \frac, \times처럼 우연히 유효한 이스케이프로 시작하는 LaTeX(\f=폼피드, \t=탭)는 여기서
// 살릴 수 없다. 파싱은 되고 글자만 조용히 깨지며, 사후에는 의도를 구분할 방법이 없다.
// 그래서 애초에 백슬래시를 쓰지 말라고 프롬프트에서 막는다.
function repairJsonText(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!inString) {
      if (c === '"') inString = true;
      out += c;
      continue;
    }
    if (c === '\\') {
      const next = text[i + 1];
      const validHex = next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6));
      if (next === 'u' ? validHex : '"\\/bfnrt'.includes(next)) {
        out += c + next; i++;            // 정상 이스케이프는 그대로 둔다
      } else {
        out += '\\\\';                    // 깨진 이스케이프는 백슬래시 자체로 살린다
      }
      continue;
    }
    if (c === '"') { inString = false; out += c; continue; }
    if (c === '\n') { out += '\\n'; continue; }
    if (c === '\r') { out += '\\r'; continue; }
    if (c === '\t') { out += '\\t'; continue; }
    out += c;
  }
  return out;
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
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Write-Key');
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
                  "observed_error_tags": { "type": "array", "items": { "type": "string" } },
                  "question_text": { "type": "string" },
                  "student_work_text": { "type": "string" },
                  "student_answer": { "type": "string" },
                  "tag_rationale": { "type": "string" }
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
