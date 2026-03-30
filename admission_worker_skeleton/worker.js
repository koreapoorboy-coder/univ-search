export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'admission-keyword-worker' });
    }

    if (url.pathname === '/config' && request.method === 'GET') {
      return jsonResponse({
        ok: true,
        requiredInputs: ['keyword', 'grade', 'track', 'major'],
        optionalInputs: ['activityLevel', 'style'],
        outputSections: [
          'reason',
          'steps',
          'flow',
          'recommendedApproach',
          'extension',
          'subjectLinks',
          'warnings'
        ]
      });
    }

    if (url.pathname === '/generate' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const validation = validateInput(payload);
        if (!validation.ok) {
          return jsonResponse({ ok: false, error: validation.error }, 400);
        }

        const seedBundle = await loadSeedBundle(env);
        const resolved = resolveContext(payload, seedBundle);
        const prompt = buildPrompt(payload, resolved, seedBundle);

        // TODO: Replace this stub with actual AI call.
        const aiResult = buildStubResult(payload, resolved);

        const response = {
          ok: true,
          mode: 'stub',
          requestId: crypto.randomUUID(),
          input: payload,
          resolved,
          promptPreview: prompt.system.slice(0, 800),
          result: aiResult,
          generatedAt: new Date().toISOString()
        };

        ctx.waitUntil(writeLog(env, {
          type: 'generate',
          payload,
          resolved,
          resultMeta: {
            mode: 'stub',
            generatedAt: response.generatedAt
          }
        }));

        return jsonResponse(response);
      } catch (error) {
        return jsonResponse({ ok: false, error: error.message || 'Unknown error' }, 500);
      }
    }

    if (url.pathname === '/log' && request.method === 'POST') {
      try {
        const payload = await request.json();
        await writeLog(env, {
          type: 'client_log',
          payload,
          createdAt: new Date().toISOString()
        });
        return jsonResponse({ ok: true });
      } catch (error) {
        return jsonResponse({ ok: false, error: error.message || 'Unknown error' }, 500);
      }
    }

    return jsonResponse({ ok: false, error: 'Not found' }, 404);
  }
};

function validateInput(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Input must be an object.' };
  }

  const required = ['keyword', 'grade', 'track', 'major'];
  for (const key of required) {
    if (!String(input[key] || '').trim()) {
      return { ok: false, error: `Missing required field: ${key}` };
    }
  }

  return { ok: true };
}

async function loadSeedBundle(env) {
  return {
    keywordBridge: await readJsonFromKV(env, 'seed:keyword_cluster_bridge'),
    patternRules: await readJsonFromKV(env, 'seed:admission_pattern_rules'),
    gradeModifiers: await readJsonFromKV(env, 'seed:admission_grade_level_modifiers'),
    reasonBlocks: await readJsonFromKV(env, 'seed:generation_reason_blocks'),
    stepBlocks: await readJsonFromKV(env, 'seed:generation_step_blocks'),
    flowBlocks: await readJsonFromKV(env, 'seed:generation_flow_blocks'),
    extensionBlocks: await readJsonFromKV(env, 'seed:generation_extension_blocks'),
    warningBlocks: await readJsonFromKV(env, 'seed:generation_warning_blocks')
  };
}

async function readJsonFromKV(env, key) {
  if (!env.SEED_KV) return null;
  const raw = await env.SEED_KV.get(key, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function resolveContext(input, seeds) {
  const normalizedKeyword = String(input.keyword).trim();
  const normalizedTrack = String(input.track).trim();
  const normalizedGrade = String(input.grade).trim();

  return {
    keyword: normalizedKeyword,
    grade: normalizedGrade,
    track: normalizedTrack,
    major: String(input.major).trim(),
    activityLevel: String(input.activityLevel || '').trim() || '미입력',
    style: String(input.style || '').trim() || '미입력',
    matchedCluster: findMatchedCluster(normalizedKeyword, seeds.keywordBridge),
    gradeModifier: findGradeModifier(normalizedGrade, seeds.gradeModifiers),
    patternRule: findPatternRule(normalizedTrack, seeds.patternRules)
  };
}

function findMatchedCluster(keyword, bridge) {
  if (!bridge) return null;
  const pools = Array.isArray(bridge) ? bridge : Object.values(bridge).flat();
  return pools.find(item => {
    const itemKeyword = item?.keyword || item?.name || '';
    return String(itemKeyword).trim() === keyword;
  }) || null;
}

function findGradeModifier(grade, modifiers) {
  if (!modifiers) return null;
  if (Array.isArray(modifiers)) {
    return modifiers.find(item => item.grade === grade) || null;
  }
  return modifiers[grade] || null;
}

function findPatternRule(track, rules) {
  if (!rules) return null;
  if (Array.isArray(rules)) {
    return rules.find(item => item.track === track || item.cluster === track) || null;
  }
  return rules[track] || null;
}

function buildPrompt(input, resolved, seeds) {
  const system = [
    '너는 학생용 공용 탐구 설계 엔진의 생성 모듈이다.',
    '반드시 학생 눈높이에 맞는 한국어로 작성한다.',
    '생활기록부 문장, 교사 평가 문체, 과장된 입시 단정은 금지한다.',
    '출력은 reason, steps, flow, recommendedApproach, extension, subjectLinks, warnings 7개 섹션으로 구성한다.',
    'seed에 없는 방향으로 과도하게 확장하지 않는다.',
    JSON.stringify({ resolved, controlHints: seeds?.gradeModifiers || null })
  ].join('\n');

  const user = JSON.stringify(input, null, 2);
  return { system, user };
}

function buildStubResult(input, resolved) {
  return {
    reason: `${resolved.keyword}는 ${resolved.track} 계열과 연결하기 좋고, ${resolved.grade} 수준에서 탐구 흐름을 잡기 쉬운 주제입니다.`,
    steps: [
      '핵심 개념을 짧게 정리한다.',
      '비교하거나 분석할 기준을 2~3개 정한다.',
      '자료 또는 사례를 찾아 핵심 내용을 정리한다.',
      '자신의 전공 관심과 연결해 해석한다.'
    ],
    flow: [
      '문제의식 설정',
      '자료 수집',
      '비교·분석',
      '결론 정리',
      '추가 확장 포인트 점검'
    ],
    recommendedApproach: `${resolved.activityLevel === '미입력' ? '기본형 비교·분석' : resolved.activityLevel} 수준에 맞춰 ${resolved.style === '미입력' ? '조사·보고서형' : resolved.style} 방식으로 진행하는 것이 적절합니다.`,
    extension: `${resolved.major}와 연결되는 실제 사례나 사회적 쟁점을 한 단계 더 붙이면 결과의 완성도가 높아집니다.`,
    subjectLinks: resolved.track.includes('공학') || resolved.track.includes('AI')
      ? ['물리', '화학', '정보']
      : ['국어', '사회', '과학'],
    warnings: [
      '주제를 너무 넓게 잡지 않는다.',
      '자료 나열만 하지 말고 비교 기준을 분명히 한다.',
      `${resolved.grade} 수준을 넘는 과도한 대학 전공 이론은 피한다.`
    ]
  };
}

async function writeLog(env, data) {
  const record = JSON.stringify({ ...data, createdAt: new Date().toISOString() });

  if (env.LOGS_KV) {
    const key = `log:${Date.now()}:${crypto.randomUUID()}`;
    await env.LOGS_KV.put(key, record);
  }

  if (env.LOG_ENDPOINT) {
    await fetch(env.LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: record
    }).catch(() => null);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
