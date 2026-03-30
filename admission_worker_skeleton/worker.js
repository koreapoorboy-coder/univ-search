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
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') {
        return withCors(new Response(null, { status: 204 }));
      }
      if (url.pathname === '/health') {
        return json({ ok: true, service: SERVICE_NAME });
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
      if (url.pathname === '/generate' && request.method === 'POST') {
        const payload = await request.json();
        const input = resolveInput(payload);
        validateInput(input);

        const seedPack = await loadSeedPack(env);
        const seedMatch = matchSeed(input, seedPack);
        const prompt = buildPrompt(input, seedMatch, env);

        let result;
        let source = 'seed-fallback';

        if (env.OPENAI_API_KEY && String(env.ALLOW_STUB).toLowerCase() === 'false') {
          try {
            result = await callOpenAI(prompt, env);
            source = 'openai';
          } catch (error) {
            result = buildSeedFallbackResult(input, seedMatch);
            source = 'seed-fallback-after-openai-error';
            console.error('OpenAI call failed:', error?.message || error);
          }
        } else {
          result = buildSeedFallbackResult(input, seedMatch);
        }

        return json({
          ok: true,
          source,
          resolved: input,
          matchedCluster: seedMatch.matchedCluster,
          gradeModifier: seedMatch.gradeModifier,
          patternRule: seedMatch.patternRule,
          promptPreview: prompt.slice(0, 4000),
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
  return {
    keyword: String(payload?.keyword || '').trim(),
    grade: String(payload?.grade || '').trim(),
    track: String(payload?.track || '').trim(),
    major: String(payload?.major || '').trim(),
    activityLevel: String(payload?.activityLevel || '미입력').trim(),
    style: String(payload?.style || '미입력').trim(),
  };
}

function validateInput(input) {
  for (const key of REQUIRED_INPUTS) {
    if (!input[key]) {
      throw new Error(`Missing required input: ${key}`);
    }
  }
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
  const prompt = [
    '너는 고등학생용 탐구 설계 엔진이다.',
    '반드시 학생 눈높이의 한국어로만 답하라.',
    '출력은 JSON만 반환하라.',
    '키는 reason, steps, flow, recommendedApproach, extension, subjectLinks, warnings 이다.',
    'steps, flow, subjectLinks, warnings는 배열이어야 한다.',
    '생활기록부 문장이나 교사 평가 문체는 절대 쓰지 마라.',
    '대학교 수준의 과도한 이론이나 실험은 피하고, 학년 수준을 지켜라.',
    '',
    '[학생 입력]',
    JSON.stringify(input, null, 2),
    '',
    '[매칭 결과]',
    JSON.stringify({
      matchedCluster,
      gradeModifier,
      patternRule,
    }, null, 2),
    '',
    '[생성용 블록]',
    JSON.stringify({
      reasonBlocks: pickBlocks(seedPack.reasonBlocks, input, 5),
      stepBlocks: pickBlocks(seedPack.stepBlocks, input, 8),
      flowBlocks: pickBlocks(seedPack.flowBlocks, input, 8),
      extensionBlocks: pickBlocks(seedPack.extensionBlocks, input, 6),
      warningBlocks: pickBlocks(seedPack.warningBlocks, input, 6),
    }, null, 2),
    '',
    '[작성 지침]',
    '- reason: 2~3문장 문자열',
    '- steps: 4~5개 배열',
    '- flow: 4~5개 배열',
    '- recommendedApproach: 2문장 문자열',
    '- extension: 2문장 문자열',
    '- subjectLinks: 3~5개 배열',
    '- warnings: 2~4개 배열',
  ];

  return prompt.join('\n');
}

async function callOpenAI(prompt, env) {
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'admission_engine_output',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: OUTPUT_SECTIONS,
            properties: {
              reason: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } },
              flow: { type: 'array', items: { type: 'string' } },
              recommendedApproach: { type: 'string' },
              extension: { type: 'string' },
              subjectLinks: { type: 'array', items: { type: 'string' } },
              warnings: { type: 'array', items: { type: 'string' } },
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

  const content = body?.output?.[0]?.content?.[0]?.text || body?.output_text;
  if (!content) {
    throw new Error('OpenAI response did not include output text');
  }
  return JSON.parse(content);
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
