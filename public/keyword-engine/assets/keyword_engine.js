const DATA_PATHS = {
  bridge: 'seed/keyword_cluster_bridge.json',
  patterns: 'seed/admission_pattern_rules.json',
  gradeModifiers: 'seed/admission_grade_level_modifiers.json'
};

const CLUSTER_LABELS = {
  lang_humanities: '언어·인문',
  nursing_health: '간호·보건',
  ai_sw_engineering: 'AI·SW·공학',
  advanced_convergence_stem: '첨단융합·이공',
  materials_engineering: '신소재·공학'
};

let ENGINE_DATA = {
  bridge: [],
  patterns: { clusters: [] },
  gradeModifiers: {}
};

const form = document.getElementById('engineForm');
const keywordInput = document.getElementById('keywordInput');
const gradeSelect = document.getElementById('gradeSelect');
const trackSelect = document.getElementById('trackSelect');
const majorInput = document.getElementById('majorInput');
const resetBtn = document.getElementById('resetBtn');
const resultSection = document.getElementById('resultSection');
const emptyState = document.getElementById('emptyState');

async function loadEngineData() {
  const [bridge, patterns, gradeModifiers] = await Promise.all([
    fetchJson(DATA_PATHS.bridge),
    fetchJson(DATA_PATHS.patterns),
    fetchJson(DATA_PATHS.gradeModifiers)
  ]);

  ENGINE_DATA = { bridge, patterns, gradeModifiers };
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`데이터 로딩 실패: ${path}`);
  }
  return response.json();
}

function normalizeKeyword(value) {
  return String(value || '').trim();
}

function findBridge(keyword) {
  const normalized = normalizeKeyword(keyword);
  return ENGINE_DATA.bridge.find(item => item.keyword === normalized);
}

function findCluster(clusterId) {
  return ENGINE_DATA.patterns.clusters.find(item => item.cluster_id === clusterId);
}

function inferCluster(keyword, selectedTrack) {
  if (selectedTrack) return selectedTrack;

  const bridge = findBridge(keyword);
  if (bridge?.primary_cluster) return bridge.primary_cluster;

  return 'advanced_convergence_stem';
}

function buildReason({ keyword, grade, cluster, bridge, major }) {
  const gradeProfile = bridge?.grade_profiles?.[grade] || `${grade} 수준에서 무리 없는 탐구 흐름으로 보정`;
  const majorText = major ? `${major} 진로와의 연결성을 살려` : '전공 연결성을 고려해';
  const intro = cluster?.starting_frames?.[0] || '이 키워드를 교과와 실제 문제에 연결하는 방식으로';
  return `${keyword}는 ${CLUSTER_LABELS[cluster.cluster_id] || '관련 전공군'}에서 반복적으로 확장성이 확인된 키워드이며, ${majorText} ${gradeProfile}으로 접근할 때 설득력이 높습니다. 이번 추천은 '${intro}'라는 출발점을 바탕으로, 학생이 실제로 따라가기 쉬운 단계형 흐름으로 정리했습니다.`;
}

function buildFlow(cluster, grade, keyword) {
  const raw = cluster?.recommended_flows?.[0] || '질문 설정 → 개념 확인 → 사례 조사 → 정리';
  return raw.split('→').map(step => `${step.trim()} (${keyword} 기준 ${grade} 단계 적용)`);
}

function buildMethods(gradeModifier) {
  return gradeModifier?.recommended_methods || ['사례 조사', '비교 분석'];
}

function buildOutputs(cluster, keyword) {
  return (cluster?.preferred_outputs || []).map(item => `${keyword} 주제로 ${item} 형태로 정리`);
}

function buildExtensions(cluster, bridge, grade, major) {
  const items = [];
  const secondary = (bridge?.secondary_clusters || [])
    .map(id => CLUSTER_LABELS[id])
    .filter(Boolean);

  if (secondary.length) {
    items.push(`다음 단계에서는 ${secondary.join(', ')} 관점까지 확장해 융합성을 보여줄 수 있습니다.`);
  }

  if (major) {
    items.push(`${major}와 직접 연결되는 사례나 기사, 실험, 보고서 형식으로 정리하면 진로 정합성이 더 선명해집니다.`);
  }

  items.push(`${grade} 단계에서는 교과 개념을 먼저 잡고, 그 뒤에 사회적 의미·윤리·응용 문제까지 넓히는 순서가 안정적입니다.`);
  return items;
}

function buildWarnings(cluster, gradeModifier) {
  return [...(cluster?.warning_rules || []), ...(gradeModifier?.avoid || [])];
}

function buildGradeProfiles(bridge) {
  if (!bridge?.grade_profiles) {
    return [];
  }

  return Object.entries(bridge.grade_profiles).map(([grade, text]) => `${grade}: ${text}`);
}

function renderList(containerId, items, ordered = false) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });

  if (!ordered && items.length === 0) {
    const li = document.createElement('li');
    li.textContent = '연결 가능한 데이터가 아직 부족합니다.';
    el.appendChild(li);
  }
}

function renderSummary(summary) {
  const summaryBox = document.getElementById('summaryBox');
  const rows = [
    ['키워드', summary.keyword],
    ['학년', summary.grade],
    ['전공군', summary.clusterLabel],
    ['희망 전공', summary.major || '미입력'],
    ['추천 방식', summary.gradeFocus]
  ];

  summaryBox.innerHTML = rows.map(([label, value]) => `
    <dl class="summary-row">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </dl>
  `).join('');
}

function renderResult(payload) {
  document.getElementById('resultKeywordLabel').textContent = `${payload.keyword} 추천 결과`;
  document.getElementById('resultTitle').textContent = `${payload.keyword} 탐구 설계 네비게이션`;
  document.getElementById('resultClusterBadge').textContent = payload.clusterLabel;
  document.getElementById('reasonText').textContent = payload.reason;
  document.getElementById('depthRule').textContent = payload.depthRule;

  renderList('flowList', payload.flow, true);
  renderList('methodList', payload.methods);
  renderList('outputList', payload.outputs);
  renderList('extensionList', payload.extensions);
  renderList('warningList', payload.warnings);
  renderList('gradeProfileList', payload.gradeProfiles);
  renderSummary(payload.summary);

  emptyState.classList.add('hidden');
  resultSection.classList.remove('hidden');
}

function generateRecommendation({ keyword, grade, selectedTrack, major }) {
  const bridge = findBridge(keyword);
  const clusterId = inferCluster(keyword, selectedTrack);
  const cluster = findCluster(clusterId);
  const gradeModifier = ENGINE_DATA.gradeModifiers[grade];
  const clusterLabel = CLUSTER_LABELS[clusterId] || '융합 추천';

  return {
    keyword,
    clusterLabel,
    reason: buildReason({ keyword, grade, cluster, bridge, major }),
    flow: buildFlow(cluster, grade, keyword),
    methods: buildMethods(gradeModifier),
    outputs: buildOutputs(cluster, keyword),
    extensions: buildExtensions(cluster, bridge, grade, major),
    warnings: buildWarnings(cluster, gradeModifier),
    depthRule: gradeModifier?.depth_rule || `${grade} 맞춤형 보정 규칙 없음`,
    gradeProfiles: buildGradeProfiles(bridge),
    summary: {
      keyword,
      grade,
      clusterLabel,
      major,
      gradeFocus: bridge?.grade_profiles?.[grade] || '일반 보정 적용'
    }
  };
}

form.addEventListener('submit', event => {
  event.preventDefault();

  const keyword = normalizeKeyword(keywordInput.value);
  const grade = gradeSelect.value;
  const selectedTrack = trackSelect.value;
  const major = normalizeKeyword(majorInput.value);

  if (!keyword) {
    alert('키워드를 입력해 주세요.');
    keywordInput.focus();
    return;
  }

  const result = generateRecommendation({ keyword, grade, selectedTrack, major });
  renderResult(result);
});

resetBtn.addEventListener('click', () => {
  form.reset();
  gradeSelect.value = '고1';
  resultSection.classList.add('hidden');
  emptyState.classList.remove('hidden');
  keywordInput.focus();
});

loadEngineData().catch(error => {
  console.error(error);
  alert('엔진 데이터를 불러오지 못했습니다. seed 폴더 경로를 확인해 주세요.');
});
