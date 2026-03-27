const STORAGE_KEYS = {
  search: 'keyword_engine_search_logs',
  interaction: 'keyword_engine_interaction_logs',
  selection: 'keyword_engine_selection_logs',
  consulting: 'keyword_engine_consulting_logs'
};

const state = {
  sessionId: `sess_${Date.now()}`,
  keywordLibrary: {},
  keywordAlias: {},
  currentResults: [],
  currentQuery: null,
  currentClicks: [],
  searchStartedAt: null
};

const $ = (selector) => document.querySelector(selector);

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

async function init() {
  try {
    const [library, alias] = await Promise.all([
      loadJSON('./data/keyword_library.json'),
      loadJSON('./data/keyword_alias.json')
    ]);
    state.keywordLibrary = library;
    state.keywordAlias = alias;
    bindEvents();
  } catch (error) {
    alert(`데이터를 불러오지 못했습니다. ${error.message}`);
  }
}

function bindEvents() {
  $('#searchBtn').addEventListener('click', handleSearch);
  $('#randomBtn').addEventListener('click', handleRandomKeyword);
  $('#exportLogsBtn').addEventListener('click', exportLogs);
  $('#clearLogsBtn').addEventListener('click', clearLogs);
  $('#keywordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  window.addEventListener('beforeunload', saveInteractionSnapshot);
}

function normalizeKeyword(raw) {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return '';
  return state.keywordAlias[cleaned] || cleaned;
}

function handleRandomKeyword() {
  const keys = Object.keys(state.keywordLibrary);
  const pick = keys[Math.floor(Math.random() * keys.length)];
  $('#keywordInput').value = pick;
  handleSearch();
}

function scoreKeyword(entry, track, subject, keyword) {
  let score = 0;
  if (entry.display_name === keyword) score += 60;
  if ((entry.category || []).includes(track)) score += 15;
  if ((entry.related_subjects || []).includes(subject)) score += 12;
  if ((entry.recommended_for || []).includes(track)) score += 10;
  return score;
}

function buildResultSet(keyword, track, subject) {
  const entry = state.keywordLibrary[keyword];
  if (!entry) return [];

  return (entry.plans || [])
    .map((plan, idx) => ({
      keyword,
      rank: idx + 1,
      score: scoreKeyword(entry, track, subject, keyword) + (3 - idx),
      related_subjects: entry.related_subjects || [],
      recommended_for: entry.recommended_for || [],
      related_keywords: entry.related_keywords || [],
      ...plan
    }))
    .sort((a, b) => b.score - a.score)
    .map((plan, idx) => ({ ...plan, rank: idx + 1 }));
}

function handleSearch() {
  const rawKeyword = $('#keywordInput').value;
  const keyword = normalizeKeyword(rawKeyword);
  const track = $('#trackSelect').value;
  const subject = $('#subjectSelect').value;
  const schoolLevel = $('#schoolLevelSelect').value;

  if (!keyword) {
    alert('키워드를 입력해 주세요.');
    return;
  }

  const entry = state.keywordLibrary[keyword];
  if (!entry) {
    alert(`'${keyword}' 키워드는 아직 라이브러리에 없습니다.`);
    return;
  }

  const results = buildResultSet(keyword, track, subject);
  state.currentResults = results;
  state.currentClicks = [];
  state.searchStartedAt = Date.now();
  state.currentQuery = {
    query_keyword: keyword,
    interest_track: track || '',
    favorite_subjects: subject ? [subject] : [],
    school_level: schoolLevel || '',
    searched_at: new Date().toISOString(),
    engine_version: 'keyword_engine_v1'
  };

  saveLog(STORAGE_KEYS.search, {
    session_id: state.sessionId,
    ...state.currentQuery
  });

  renderSummary(keyword, entry, track, subject);
  renderResults(results);
}

function renderSummary(keyword, entry, track, subject) {
  const section = $('#summarySection');
  section.classList.remove('hidden');
  const tags = [keyword, ...(entry.category || []), ...(entry.related_subjects || [])]
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .slice(0, 8)
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join('');

  section.innerHTML = `
    <div class="summary-top">
      <div>
        <h2>${keyword}</h2>
        <p>${entry.summary || '입력한 키워드와 연결되는 공용 탐구 설계 카드입니다.'}</p>
      </div>
      <div>
        <p>관심 계열: <strong>${track || '전체'}</strong></p>
        <p>관심 과목: <strong>${subject || '전체'}</strong></p>
      </div>
    </div>
    <div class="summary-tags">${tags}</div>
  `;
}

function renderResults(results) {
  $('#resultSection').classList.remove('hidden');
  $('#resultMeta').textContent = `${results.length}개의 추천 카드가 생성되었습니다.`;
  const wrap = $('#resultCards');
  wrap.innerHTML = '';
  const template = $('#planCardTemplate');

  results.forEach((plan) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.planType = plan.type;

    node.querySelector('.card-rank').textContent = `추천 ${plan.rank}`;
    node.querySelector('.card-title').textContent = plan.title;
    node.querySelector('.card-type').textContent = `${plan.type} · 점수 ${plan.score}`;
    node.querySelector('.core-design').textContent = plan.core_design;
    node.querySelector('.intent').textContent = plan.intent;
    node.querySelector('.problem-definition').textContent = plan.problem_definition;
    node.querySelector('.analysis-design').textContent = plan.analysis_design;
    node.querySelector('.advanced-design').textContent = plan.advanced_design;
    node.querySelector('.conclusion-design').textContent = plan.conclusion_design;
    node.querySelector('.why-recommended').textContent = plan.why_recommended;

    fillList(node.querySelector('.result-examples'), plan.result_examples || []);
    fillList(node.querySelector('.record-points'), plan.record_points || []);

    node.querySelector('.copy-btn').addEventListener('click', () => handleCopy(plan));
    node.querySelector('.select-btn').addEventListener('click', () => handleSelect(plan));
    node.querySelector('.consult-btn').addEventListener('click', () => handleConsulting(plan));
    node.addEventListener('click', () => logCardOpen(plan), { once: true });

    wrap.appendChild(node);
  });
}

function fillList(ul, items) {
  ul.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
}

function logCardOpen(plan) {
  const payload = {
    rank: plan.rank,
    keyword: plan.keyword,
    plan_type: plan.type,
    title: plan.title,
    clicked_at: new Date().toISOString(),
    dwell_start: Date.now()
  };
  state.currentClicks.push(payload);
}

function handleCopy(plan) {
  const text = [
    plan.title,
    `핵심 탐구 설계: ${plan.core_design}`,
    `설계 의도: ${plan.intent}`,
    `문제 정의: ${plan.problem_definition}`,
    `분석 설계: ${plan.analysis_design}`,
    `심화 설계: ${plan.advanced_design}`,
    `결론 설계: ${plan.conclusion_design}`
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    saveInteractionSnapshot({ copy_clicked: true, copied_plan: plan.title });
    alert('카드 내용을 복사했습니다.');
  });
}

function handleSelect(plan) {
  saveLog(STORAGE_KEYS.selection, {
    session_id: state.sessionId,
    query_keyword: state.currentQuery?.query_keyword || '',
    final_selected_plan: {
      keyword: plan.keyword,
      plan_type: plan.type,
      title: plan.title
    },
    selected_at: new Date().toISOString()
  });
  alert(`'${plan.title}' 카드가 선택되었습니다.`);
}

function handleConsulting(plan) {
  saveLog(STORAGE_KEYS.consulting, {
    session_id: state.sessionId,
    consulting_requested: true,
    consulting_requested_at: new Date().toISOString(),
    pre_consulting_keyword: state.currentQuery?.query_keyword || '',
    pre_consulting_selected_plan: {
      keyword: plan.keyword,
      plan_type: plan.type,
      title: plan.title
    },
    consulting_status: 'requested'
  });
  alert('상담 연결 로그가 저장되었습니다.');
}

function saveInteractionSnapshot(extra = {}) {
  if (!state.currentResults.length || !state.currentQuery) return;
  const clickedCards = state.currentClicks.map((item) => ({
    ...item,
    dwell_seconds: Math.max(1, Math.floor((Date.now() - item.dwell_start) / 1000))
  }));

  saveLog(STORAGE_KEYS.interaction, {
    session_id: state.sessionId,
    query_keyword: state.currentQuery.query_keyword,
    recommended_cards: state.currentResults.map((r) => ({
      rank: r.rank,
      keyword: r.keyword,
      plan_type: r.type,
      title: r.title,
      score: r.score
    })),
    first_clicked_card: clickedCards[0] || null,
    clicked_cards: clickedCards,
    ended_at: new Date().toISOString(),
    ...extra
  });
}

function getStoredArray(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveLog(key, item) {
  const arr = getStoredArray(key);
  arr.push(item);
  localStorage.setItem(key, JSON.stringify(arr));
}

function exportLogs() {
  const payload = {
    search_logs: getStoredArray(STORAGE_KEYS.search),
    interaction_logs: getStoredArray(STORAGE_KEYS.interaction),
    selection_logs: getStoredArray(STORAGE_KEYS.selection),
    consulting_logs: getStoredArray(STORAGE_KEYS.consulting)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keyword_engine_logs_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearLogs() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  alert('브라우저에 저장된 로그를 초기화했습니다.');
}

init();
