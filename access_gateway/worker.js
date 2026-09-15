const TARGET_HOST = 'https://univ-search.pages.dev';
const TARGET_BASE_PATH = '/keyword-engine';

const GENERATE_WORKER_URL = 'https://curly-base-a1a9.koreapoorboy.workers.dev/generate';
const GENERATE_GATEWAY_PATH = '/__mini/generate';
// Reading a student's past 보고서 or 생활기록부 is its own paid action: they may come only for the analysis and
// never generate a report, so it cannot ride along on the report's use.
const ANALYZE_GATEWAY_PATH = '/__mini/analyze-upload';
const ANALYZE_WORKER_URL = 'https://curly-base-a1a9.koreapoorboy.workers.dev/analyze-upload';
const UPLOAD_ANALYSIS_STAGE = 'student_upload_analysis';

const GATEWAY_MODE = 'generate-stage-aware-flow-token-v241-count-on-completed-report';
const PRIMARY_GENERATION_STAGE = 'primary_student_result';
const SECONDARY_DRAFT_STAGE = 'secondary_report_draft';
const FLOW_TOKEN_TTL_SECONDS = 6 * 60 * 60;

const PRIMARY_REQUIRED_INPUTS = [
  { key: 'subject', label: '과목' },
  { key: 'taskDescription', label: '수행평가 안내문' },
  { key: 'career', label: '희망 계열' },
];

const COOKIE_NAME = 'univ_access_code';

const ACCESS_CODES = {
  'test-0508': {
    name: '테스트 접속권',
    expiresAt: '2026-05-31T23:59:59+09:00',
    maxUses: 1000,
    enabled: true,
  },

  'expired-0508': {
    name: '만료 테스트 접속권',
    expiresAt: '2024-01-01T23:59:59+09:00',
    maxUses: 100,
    enabled: true,
  },

  'limit-0508': {
    name: '횟수 제한 테스트 접속권',
    expiresAt: '2026-05-31T23:59:59+09:00',
    maxUses: 2,
    enabled: true,
  },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0] || '';

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'access-gateway',
        mode: GATEWAY_MODE,
        targetHost: TARGET_HOST,
        targetBasePath: TARGET_BASE_PATH,
        generateEndpoint: GENERATE_GATEWAY_PATH,
        generateWorkerUrl: GENERATE_WORKER_URL,
        hasKV: Boolean(env.ACCESS_KV),
        billing: {
          countedStage: PRIMARY_GENERATION_STAGE,
          noCountStage: SECONDARY_DRAFT_STAGE,
          requiresGenerationTokenForNoCount: true,
          flowTokenTtlSeconds: FLOW_TOKEN_TTL_SECONDS,
        },
      });
    }

    if (url.pathname === GENERATE_GATEWAY_PATH) {
      return handleGenerateRequest(request, env);
    }

    if (url.pathname === ANALYZE_GATEWAY_PATH) {
      return handleAnalyzeUploadRequest(request, env);
    }

    if (
      pathParts.length >= 3 &&
      ACCESS_CODES[firstPart] &&
      pathParts[1] === '__mini' &&
      (pathParts[2] === 'generate' || pathParts[2] === 'analyze-upload')
    ) {
      return pathParts[2] === 'analyze-upload'
        ? handleAnalyzeUploadRequest(request, env, firstPart)
        : handleGenerateRequest(request, env, firstPart);
    }

    if (ACCESS_CODES[firstPart]) {
      const check = await checkCodeForBrowse(firstPart);

      if (!check.ok) {
        return deniedPage(check.message);
      }

      const strippedPath = '/' + pathParts.slice(1).join('/');
      const targetUrl = buildTargetUrl(strippedPath, url.search);

      const response = await proxyRequest(request, targetUrl);
      const newResponse = new Response(response.body, response);

      newResponse.headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${firstPart}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
      );

      return newResponse;
    }

    const cookieCode = getCookie(request, COOKIE_NAME);

    if (!cookieCode || !ACCESS_CODES[cookieCode]) {
      return deniedPage('유효한 접속 코드가 없습니다. 전용 접속 주소로 다시 접속해 주세요.');
    }

    const browseCheck = await checkCodeForBrowse(cookieCode);

    if (!browseCheck.ok) {
      return deniedPage(browseCheck.message);
    }

    const targetUrl = buildTargetUrl(url.pathname, url.search);
    return proxyRequest(request, targetUrl);
  },
};

// Same door as the report: a valid access code, one use counted, and nothing counted when the read fails.
async function handleAnalyzeUploadRequest(request, env, pathCode = '') {
  if (request.method !== 'POST') {
    return json({ ok: false, error: '자료 분석은 POST 요청만 허용됩니다.' }, 405);
  }

  const code = pathCode || getCookie(request, COOKIE_NAME);
  if (!code || !ACCESS_CODES[code]) {
    return json({ ok: false, error: '유효한 접속 코드가 없습니다. 전용 접속 주소로 다시 접속해 주세요.' }, 403);
  }

  const allowance = await checkCodeForGenerate(code, env);
  if (!allowance.ok) {
    return json({
      ok: false,
      error: allowance.message,
      gateway: { ok: false, mode: GATEWAY_MODE, stage: UPLOAD_ANALYSIS_STAGE, counted: false, accessCode: code },
    }, 403);
  }

  let upstreamStatus = 0;
  let upstreamJson = null;
  try {
    // The body is multipart with the files in it; it is forwarded as it arrived.
    const upstream = await fetch(new Request(ANALYZE_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('Content-Type') || 'multipart/form-data' },
      body: request.body,
      duplex: "half",
    }));
    upstreamStatus = upstream.status;
    const text = await upstream.text();
    try {
      upstreamJson = JSON.parse(text);
    } catch (e) {
      upstreamJson = null;
    }
  } catch (error) {
    return json({
      ok: false,
      error: '자료를 읽지 못했습니다. 사용 횟수는 차감되지 않았습니다.',
      gateway: { ok: false, mode: GATEWAY_MODE, stage: UPLOAD_ANALYSIS_STAGE, counted: false, accessCode: code, upstreamStatus },
    }, 502);
  }

  // Anything short of a real analysis is free: a refused upload, a file we could not read, a network failure.
  const accepted = upstreamStatus >= 200 && upstreamStatus < 300 && upstreamJson && upstreamJson.ok !== false && upstreamJson.analysis;
  if (!accepted) {
    return json({
      ...(upstreamJson || {}),
      ok: false,
      error: upstreamJson?.message || upstreamJson?.error || '자료를 읽지 못했습니다. 사용 횟수는 차감되지 않았습니다.',
      gateway: { ok: false, mode: GATEWAY_MODE, stage: UPLOAD_ANALYSIS_STAGE, counted: false, accessCode: code, upstreamStatus },
    }, upstreamStatus >= 400 && upstreamStatus < 500 ? upstreamStatus : 502);
  }

  await increaseUsage(code, env);
  return json({
    ...upstreamJson,
    gateway: { ok: true, mode: GATEWAY_MODE, stage: UPLOAD_ANALYSIS_STAGE, counted: true, accessCode: code, upstreamStatus },
  });
}

async function handleGenerateRequest(request, env, pathCode = '') {
  if (request.method !== 'POST') {
    return json(
      {
        ok: false,
        error: '학생용 결과 생성은 POST 요청만 허용됩니다.',
      },
      405
    );
  }

  const cookieCode = getCookie(request, COOKIE_NAME);
  const code = pathCode || cookieCode;

  if (!code || !ACCESS_CODES[code]) {
    return json(
      {
        ok: false,
        error: '유효한 접속 코드가 없습니다. 전용 접속 주소로 다시 접속해 주세요.',
      },
      403
    );
  }

  let payloadText = '{}';
  let payload = {};

  try {
    const cloned = request.clone();
    const text = await cloned.text();
    payloadText = text && text.trim() ? text : '{}';
  } catch (e) {
    payloadText = '{}';
  }

  try {
    payload = JSON.parse(payloadText || '{}');
  } catch (e) {
    payload = {};
  }

  const normalizedInput = normalizeGeneratePayload(payload);

  if (!normalizedInput.ok) {
    return json(
      {
        ok: false,
        error: `Missing required input: ${normalizedInput.missingKey}`,
        message: `${normalizedInput.missingLabel}을(를) 입력해 주세요.`,
        gateway: {
          ok: false,
          mode: GATEWAY_MODE,
          stage: normalizedInput.stage,
          counted: false,
          accessCode: code,
        },
      },
      400
    );
  }

  payload = normalizedInput.payload;
  payloadText = JSON.stringify(payload);

  const billingDecision = await resolveBillingDecision(payload, code, env);

  if (!billingDecision.ok) {
    return json(
      {
        ok: false,
        error: billingDecision.message,
        gateway: {
          ok: false,
          mode: GATEWAY_MODE,
          stage: billingDecision.stage || '',
          counted: false,
          accessCode: code,
        },
      },
      billingDecision.status || 403
    );
  }

  let upstreamStatus = 0;
  let upstreamOk = false;
  let upstreamText = '';
  let upstreamJson = null;

  try {
    const upstreamRequest = new Request(GENERATE_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: payloadText,
      redirect: 'follow',
    });

    const upstreamResponse = await fetch(upstreamRequest);

    upstreamStatus = upstreamResponse.status;
    upstreamOk = upstreamResponse.ok;
    upstreamText = await upstreamResponse.text();

    try {
      upstreamJson = JSON.parse(upstreamText);
    } catch (e) {
      upstreamJson = null;
    }

    const upstreamAccepted = upstreamOk && upstreamJson && upstreamJson.ok !== false;

    // A counted (primary) request is billed only for a completed report, never for a fallback or an error.
    if (upstreamAccepted && (!billingDecision.countUsage || isCompletedReport(upstreamJson))) {
      const countResult = billingDecision.countUsage
        ? await countUsageAndCreateFlowToken(code, env)
        : { counted: false, generationToken: '', reason: billingDecision.reason || 'no-count-stage' };

      return json({
        ...upstreamJson,
        gateway: {
          ok: true,
          counted: countResult.counted,
          mode: GATEWAY_MODE,
          source: 'upstream-json',
          accessCode: code,
          stage: billingDecision.stage,
          noCountReason: billingDecision.countUsage ? '' : countResult.reason,
          generationToken: countResult.generationToken || '',
          acceptedGenerationToken: billingDecision.acceptedGenerationToken || false,
        },
      });
    }
  } catch (e) {
    upstreamStatus = 0;
    upstreamOk = false;
    upstreamText = e?.message || String(e);
    upstreamJson = null;
  }

  const preview = String(upstreamText || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  // 생성 Worker가 '권한이 없다'고 답한 것은 고장이 아니라 결정이다. 문구를 덮지 않고, 대체본으로도 빠지지
  // 않는다 — 여기서 빠지면 권한 없는 학생이 보고서를 받는다. 사용 횟수는 세지 않는다.
  if ((upstreamStatus === 403 || upstreamStatus === 404) && upstreamJson && upstreamJson.ok === false && upstreamJson.reason) {
    return json(
      {
        ...upstreamJson,
        gateway: {
          ok: false,
          counted: false,
          mode: GATEWAY_MODE,
          source: 'upstream-refused',
          accessCode: code,
          stage: billingDecision.stage,
          upstreamStatus,
        },
      },
      upstreamStatus
    );
  }

  if (billingDecision.countUsage) {
    return json(
      {
        ok: false,
        code: 'COMPLETE_REPORT_GENERATION_FAILED',
        error: '보고서를 만들지 못했습니다. 사용 횟수는 차감되지 않았습니다. 잠시 후 다시 시도해 주세요.',
        gateway: {
          ok: false,
          counted: false,
          mode: GATEWAY_MODE,
          source: upstreamJson && upstreamJson.ok !== false ? 'upstream-incomplete-report' : 'upstream-error',
          accessCode: code,
          stage: billingDecision.stage,
          upstreamOk,
          upstreamStatus,
          upstreamSource: String(upstreamJson?.source || ''),
          upstreamPreview: preview,
        },
      },
      502
    );
  }

  return json({
    ok: true,
    fallback: true,
    message: '기존 생성 Worker 응답이 정상 JSON이 아니어서, 선택 payload 기반 학생용 결과 생성을 계속 진행합니다.',
    gateway: {
      ok: true,
      counted: false,
      mode: GATEWAY_MODE,
      source: 'gateway-fallback',
      accessCode: code,
      stage: billingDecision.stage,
      noCountReason: billingDecision.reason || 'no-count-stage',
      generationToken: '',
      acceptedGenerationToken: billingDecision.acceptedGenerationToken || false,
      upstreamOk,
      upstreamStatus,
      upstreamPreview: preview,
    },
  });
}

// Mirrors the browser's acceptance rule: a Worker report of at least 600 characters that is not a seed fallback.
function isCompletedReport(upstreamJson) {
  const report = upstreamJson?.result?.report;
  return !/^seed-fallback/.test(String(upstreamJson?.source || ''))
    && typeof report === 'string'
    && report.trim().length >= 600;
}


function normalizeGeneratePayload(payload) {
  const source =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};

  const stage = resolveGenerationStage(source);

  const subject = firstNonEmpty(
    source.subject,
    source.selectedSubject
  );

  const taskDescription = firstNonEmpty(
    source.taskDescription,
    source.assessmentTitleOrDescription,
    source.assessment_title_or_description,
    source.assessmentGuide,
    source.guideText,
    source.teacherGuide
  );

  const career = firstNonEmpty(
    source.career,
    source.selectedCareer,
    source.majorCategory,
    source.track,
    source.major
  );

  const normalized = {
    ...source,
    subject,
    taskDescription,
    career,
  };

  // The secondary draft request has its own shape/token validator below.
  // Only the primary student-result flow uses the new three required inputs.
  if (stage !== SECONDARY_DRAFT_STAGE) {
    for (const item of PRIMARY_REQUIRED_INPUTS) {
      if (!String(normalized[item.key] || '').trim()) {
        return {
          ok: false,
          stage: PRIMARY_GENERATION_STAGE,
          missingKey: item.key,
          missingLabel: item.label,
          payload: normalized,
        };
      }
    }
  }

  // Compatibility fields for the existing upstream /generate Worker.
  // They are transport-only defaults and are not restored to the student UI.
  normalized.keyword = firstNonEmpty(
    source.keyword,
    source.selectedKeyword,
    source.selectedRecommendedKeyword,
    source.derivedKeyword,
    subject
  );
  normalized.grade = firstNonEmpty(source.grade, '고등학생');
  normalized.track = firstNonEmpty(source.track, career);
  normalized.major = firstNonEmpty(source.major, career);
  normalized.activityLevel = firstNonEmpty(source.activityLevel, '미입력');
  normalized.style = firstNonEmpty(source.style, source.taskType, '미입력');

  return {
    ok: true,
    stage,
    payload: normalized,
  };
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value == null ? '' : value).trim();
    if (text) {
      return text;
    }
  }

  return '';
}

async function resolveBillingDecision(payload, code, env) {
  const stage = resolveGenerationStage(payload);

  if (stage === SECONDARY_DRAFT_STAGE) {
    const baseCheck = checkCodeBase(code);

    if (!baseCheck.ok) {
      return {
        ok: false,
        stage,
        status: 403,
        message: baseCheck.message,
      };
    }

    if (!isAllowedSecondaryDraftPayload(payload)) {
      return {
        ok: false,
        stage,
        status: 403,
        message: '보고서 초안 생성 no-count 요청 형식이 올바르지 않습니다.',
      };
    }

    const token = getGenerationTokenFromPayload(payload);
    const tokenCheck = await verifyGenerationToken(code, token, env);

    if (!tokenCheck.ok) {
      return {
        ok: false,
        stage,
        status: 403,
        message: tokenCheck.message,
      };
    }

    return {
      ok: true,
      stage,
      countUsage: false,
      reason: 'secondary-report-draft-after-primary-generation',
      acceptedGenerationToken: true,
    };
  }

  const generateCheck = await checkCodeForGenerate(code, env);

  if (!generateCheck.ok) {
    return {
      ok: false,
      stage: PRIMARY_GENERATION_STAGE,
      status: 403,
      message: generateCheck.message,
    };
  }

  return {
    ok: true,
    stage: PRIMARY_GENERATION_STAGE,
    countUsage: true,
    reason: 'primary-student-result',
    acceptedGenerationToken: false,
  };
}

function resolveGenerationStage(payload) {
  const explicitStage = String(
    payload?.billing?.stage ||
      payload?.generationStage ||
      payload?.stage ||
      ''
  ).trim();

  if (explicitStage === SECONDARY_DRAFT_STAGE || explicitStage === 'secondary_expansion_report_draft') {
    return SECONDARY_DRAFT_STAGE;
  }

  if (explicitStage === PRIMARY_GENERATION_STAGE || explicitStage === 'primary_generate') {
    return PRIMARY_GENERATION_STAGE;
  }

  const mode = String(payload?.mode || '').trim();
  const generationMode = String(payload?.generationMode || '').trim();

  if (
    mode === 'secondary_expansion_report_draft_generation_v233' ||
    generationMode === 'secondary_expansion_student_report_draft_v233' ||
    payload?.secondaryDraftRequest
  ) {
    return SECONDARY_DRAFT_STAGE;
  }

  return PRIMARY_GENERATION_STAGE;
}

function isAllowedSecondaryDraftPayload(payload) {
  const mode = String(payload?.mode || '').trim();
  const generationMode = String(payload?.generationMode || '').trim();
  const billingStage = String(payload?.billing?.stage || payload?.generationStage || '').trim();
  const secondary = payload?.secondaryDraftRequest;
  const expansion = payload?.secondaryExpansion;
  const rules = payload?.generationRules;

  const hasSecondaryMode =
    mode === 'secondary_expansion_report_draft_generation_v233' ||
    generationMode === 'secondary_expansion_student_report_draft_v233' ||
    billingStage === SECONDARY_DRAFT_STAGE;

  const hasSecondaryShape =
    Boolean(secondary && typeof secondary === 'object') &&
    Boolean(expansion && typeof expansion === 'object') &&
    Boolean(rules && rules.produceDraftParagraphs === true);

  return hasSecondaryMode && hasSecondaryShape;
}

function getGenerationTokenFromPayload(payload) {
  return String(
    payload?.billing?.generationToken ||
      payload?.generationToken ||
      payload?.gateway?.generationToken ||
      ''
  ).trim();
}

async function verifyGenerationToken(code, token, env) {
  if (!token) {
    return {
      ok: false,
      message: '보고서 초안 생성용 인증 토큰이 없습니다. 먼저 학생용 결과 생성을 완료해 주세요.',
    };
  }

  if (!env.ACCESS_KV) {
    return {
      ok: false,
      message: '사용 흐름 인증 저장소가 연결되지 않았습니다. 관리자에게 문의해 주세요.',
    };
  }

  const key = buildFlowTokenKey(code, token);
  const saved = await env.ACCESS_KV.get(key);

  if (!saved) {
    return {
      ok: false,
      message: '보고서 초안 생성용 인증 토큰이 만료되었거나 유효하지 않습니다. 학생용 결과 생성을 다시 진행해 주세요.',
    };
  }

  return { ok: true };
}

async function countUsageAndCreateFlowToken(code, env) {
  await increaseUsage(code, env);

  const generationToken = await createGenerationFlowToken(code, env);

  return {
    counted: true,
    generationToken,
    reason: 'primary-student-result-counted',
  };
}

async function createGenerationFlowToken(code, env) {
  if (!env.ACCESS_KV) {
    return '';
  }

  const token = createSecureToken();
  const key = buildFlowTokenKey(code, token);

  await env.ACCESS_KV.put(
    key,
    JSON.stringify({
      code,
      createdAt: new Date().toISOString(),
      purpose: 'secondary_report_draft_no_count',
    }),
    { expirationTtl: FLOW_TOKEN_TTL_SECONDS }
  );

  return token;
}

function buildFlowTokenKey(code, token) {
  return `access:${code}:flow:${token}`;
}

function createSecureToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function checkCodeForBrowse(code) {
  const baseCheck = checkCodeBase(code);

  if (!baseCheck.ok) {
    return baseCheck;
  }

  return {
    ok: true,
  };
}

async function checkCodeForGenerate(code, env) {
  const baseCheck = checkCodeBase(code);

  if (!baseCheck.ok) {
    return baseCheck;
  }

  const item = ACCESS_CODES[code];

  if (item.maxUses && !env.ACCESS_KV) {
    return {
      ok: false,
      message: '사용 횟수 저장소가 연결되지 않았습니다. 관리자에게 문의해 주세요.',
    };
  }

  if (item.maxUses && env.ACCESS_KV) {
    const currentUses = await getUsage(code, env);

    if (currentUses >= item.maxUses) {
      return {
        ok: false,
        message: `학생용 결과 생성 가능 횟수 ${item.maxUses}회를 모두 사용했습니다. 관리자에게 문의해 주세요.`,
      };
    }
  }

  return {
    ok: true,
  };
}

function checkCodeBase(code) {
  const item = ACCESS_CODES[code];

  if (!item) {
    return {
      ok: false,
      message: '존재하지 않는 접속 코드입니다.',
    };
  }

  if (!item.enabled) {
    return {
      ok: false,
      message: '사용이 중지된 접속 코드입니다.',
    };
  }

  const now = new Date();
  const expiresAt = new Date(item.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      ok: false,
      message: '접속 코드의 만료일 설정이 잘못되었습니다.',
    };
  }

  if (now > expiresAt) {
    return {
      ok: false,
      message: '접속 기간이 만료되었습니다. 관리자에게 문의해 주세요.',
    };
  }

  return {
    ok: true,
  };
}

async function getUsage(code, env) {
  if (!env.ACCESS_KV) {
    return 0;
  }

  const usageKey = `access:${code}:uses`;
  const currentUsesRaw = await env.ACCESS_KV.get(usageKey);

  return Number(currentUsesRaw || 0);
}

async function increaseUsage(code, env) {
  const item = ACCESS_CODES[code];

  if (!item?.maxUses || !env.ACCESS_KV) {
    return;
  }

  const usageKey = `access:${code}:uses`;
  const currentUses = await getUsage(code, env);

  await env.ACCESS_KV.put(usageKey, String(currentUses + 1));
}

function buildTargetUrl(pathname, search = '') {
  let path = pathname || '/';

  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  if (path === TARGET_BASE_PATH || path.startsWith(TARGET_BASE_PATH + '/')) {
    const targetUrl = new URL(TARGET_HOST + path);
    targetUrl.search = search || '';
    return targetUrl;
  }

  if (path === '/') {
    const targetUrl = new URL(TARGET_HOST + TARGET_BASE_PATH + '/');
    targetUrl.search = search || '';
    return targetUrl;
  }

  const targetUrl = new URL(TARGET_HOST + TARGET_BASE_PATH + path);
  targetUrl.search = search || '';

  return targetUrl;
}

async function proxyRequest(request, targetUrl) {
  const headers = new Headers(request.headers);

  headers.set('Host', new URL(TARGET_HOST).host);
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('x-forwarded-proto');
  headers.delete('x-real-ip');

  const newRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : request.body,
    redirect: 'follow',
  });

  const response = await fetch(newRequest);
  const responseHeaders = new Headers(response.headers);

  responseHeaders.delete('content-security-policy');
  responseHeaders.delete('content-security-policy-report-only');
  responseHeaders.delete('x-frame-options');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const parts = cookie.split(';').map((v) => v.trim());

  for (const part of parts) {
    const [key, ...rest] = part.split('=');

    if (key === name) {
      return rest.join('=');
    }
  }

  return '';
}

function deniedPage(message) {
  return html(
    `
    <main>
      <h1>접속할 수 없습니다</h1>
      <p>${escapeHtml(message)}</p>
      <div class="box">
        관리자에게 문의해 주세요.
      </div>
    </main>
  `,
    403
  );
}

function json(data, status = 200) {
  return withCors(
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  );
}

function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

function html(content, status = 200) {
  return new Response(
    `
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>수행평가 탐구엔진 접속</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7fb;
      color: #111827;
    }

    main {
      max-width: 520px;
      margin: 120px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 32px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }

    h1 {
      margin: 0 0 12px;
      font-size: 24px;
    }

    p {
      margin: 0 0 18px;
      line-height: 1.6;
      color: #374151;
    }

    .box {
      background: #f3f4f6;
      border-radius: 12px;
      padding: 14px 16px;
      color: #374151;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
  `,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
