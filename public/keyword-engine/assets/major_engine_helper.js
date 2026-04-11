window.__MAJOR_ENGINE_HELPER_VERSION__ = "v0.2.0-major-layer-enhanced";

(function(){
  const CATALOG_URL = "seed/major-engine/major_catalog_198.json";
  const PROFILES_URL = "seed/major-engine/major_profiles_master_198.json";
  const ALIAS_URL = "seed/major-engine/major_alias_map.json";
  const ROUTER_URL = "seed/major-engine/major_engine_router.json";
  const BRIDGE_URL = "seed/major-engine/major_to_book_bridge.json";

  const state = {
    loaded: false,
    wrapped: false,
    catalog: [],
    profiles: [],
    aliases: [],
    router: {},
    bridges: [],
    profileByMajorId: new Map(),
    profileByName: new Map(),
    bridgeByMajorId: new Map(),
    bridgeByName: new Map(),
    aliasRows: []
  };

  function $(id){ return document.getElementById(id); }
  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "")
      .replace(/학과|학부|전공|예과/g, "");
  }
  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function uniq(arr){ return Array.from(new Set((arr || []).filter(Boolean))); }
  function fuzzyIncludes(a,b){
    const na = normalize(a); const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
  }

  async function loadJSON(url){
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return await res.json();
  }

  async function loadAll(){
    try {
      const [catalog, profiles, aliases, router, bridges] = await Promise.all([
        loadJSON(CATALOG_URL),
        loadJSON(PROFILES_URL),
        loadJSON(ALIAS_URL),
        loadJSON(ROUTER_URL),
        loadJSON(BRIDGE_URL)
      ]);
      state.catalog = Array.isArray(catalog) ? catalog : [];
      state.profiles = Array.isArray(profiles) ? profiles : [];
      state.aliases = Array.isArray(aliases) ? aliases : [];
      state.router = router || {};
      state.bridges = Array.isArray(bridges) ? bridges : [];

      state.profiles.forEach(row => {
        if (!row || !row.major_id) return;
        state.profileByMajorId.set(row.major_id, row);
        state.profileByName.set(row.display_name, row);
      });
      state.bridges.forEach(row => {
        if (!row) return;
        if (row.major_id) state.bridgeByMajorId.set(row.major_id, row);
        if (row.display_name) state.bridgeByName.set(row.display_name, row);
      });
      state.aliasRows = state.aliases.map(row => ({
        ...row,
        normalized_display_name: normalize(row.display_name),
        normalized_aliases: (row.aliases || []).map(normalize).filter(Boolean)
      }));
      state.loaded = true;
      bindCareerInput();
      renderMajorSummary();
      startMiniPayloadPatch();
    } catch (error) {
      console.warn('major engine helper load failed:', error);
    }
  }

  function getCareerInput(){ return $('career'); }

  function getKeywordInput(){ return $("keyword"); }
  function getTaskDescriptionInput(){ return $("taskDescription"); }

  function buildKeywordSuggestionText(data){
    if (!data || data.status !== 'resolved') return '';
    return uniq([
      ...(data.core_keywords || []).slice(0, 4),
      ...(data.related_subject_hints || []).slice(0, 2)
    ]).slice(0, 6).join(', ');
  }

  function buildInquirySeedText(data){
    if (!data || data.status !== 'resolved') return '';
    return (data.inquiry_topics_raw || []).slice(0, 3).join(' / ');
  }

  function applyMajorSuggestions(mode){
    const data = getSummaryData();
    if (!data || data.status !== 'resolved') return;
    const keywordInput = getKeywordInput();
    const taskDesc = getTaskDescriptionInput();
    if (mode === 'keywords' || mode === 'all') {
      const nextKeyword = buildKeywordSuggestionText(data);
      if (keywordInput && nextKeyword) {
        keywordInput.value = nextKeyword;
        keywordInput.dataset.majorAutofill = '1';
        keywordInput.dispatchEvent(new Event('input', { bubbles: true }));
        keywordInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (mode === 'inquiry' || mode === 'all') {
      const nextDesc = buildInquirySeedText(data);
      if (taskDesc && nextDesc) {
        taskDesc.value = nextDesc;
        taskDesc.dispatchEvent(new Event('input', { bubbles: true }));
        taskDesc.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function autoReflectMajorData(data){
    if (!data || data.status !== 'resolved') return;
    const keywordInput = getKeywordInput();
    if (keywordInput && (!keywordInput.value.trim() || keywordInput.dataset.majorAutofill === '1')) {
      const nextKeyword = buildKeywordSuggestionText(data);
      if (nextKeyword) {
        keywordInput.value = nextKeyword;
        keywordInput.dataset.majorAutofill = '1';
        keywordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function bindCareerInput(){
    const el = getCareerInput();
    if (!el || el.dataset.majorBound === '1') return;
    el.dataset.majorBound = '1';
    ['input','change','blur','keyup'].forEach(evt => {
      el.addEventListener(evt, () => {
        renderMajorSummary();
        startMiniPayloadPatch();
      });
    });
  }

  function ensureMajorPanel(){
    const input = getCareerInput();
    if (!input) return null;
    let panel = $('majorEngineSummary');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'majorEngineSummary';
    panel.className = 'major-engine-panel';
    input.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function injectStyles(){
    if ($('majorEngineStyles')) return;
    const style = document.createElement('style');
    style.id = 'majorEngineStyles';
    style.textContent = `
      .major-engine-panel {
        margin-top: 12px; padding: 16px; border: 1px solid #dbe5f4; border-radius: 16px;
        background: #fbfdff; box-shadow: 0 8px 20px rgba(15, 23, 42, .04); display:none;
      }
      .major-engine-kicker { display:inline-flex; padding:4px 10px; border-radius:999px; background:#eef4ff; color:#245ee8; font-size:12px; font-weight:800; margin-bottom:8px; }
      .major-engine-title { font-size:18px; font-weight:800; color:#152033; margin:0; }
      .major-engine-sub { color:#65748c; font-size:13px; line-height:1.55; margin-top:6px; }
      .major-engine-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
      .major-engine-box { border:1px solid #e2e8f4; background:#fff; border-radius:14px; padding:12px; }
      .major-engine-box-title { font-size:13px; font-weight:800; color:#172033; margin-bottom:8px; }
      .major-engine-chip-wrap { display:flex; flex-wrap:wrap; gap:8px; }
      .major-engine-chip { display:inline-flex; padding:6px 10px; border-radius:999px; background:#f1f5fd; color:#314767; font-size:12px; font-weight:700; }
      .major-engine-list { margin:0; padding-left:18px; color:#3c4b64; font-size:13px; line-height:1.6; }
      .major-engine-empty { color:#6f7d95; font-size:13px; line-height:1.6; }
      .major-engine-suggest { margin-top:10px; color:#55647e; font-size:13px; }
      .major-engine-action-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .major-engine-action-btn { border:1px solid #cfe0ff; background:#f4f8ff; color:#1f4fbf; border-radius:10px; padding:8px 12px; font-size:12px; font-weight:800; cursor:pointer; }
      .major-engine-action-btn:hover { background:#eaf2ff; }
      .major-engine-note { margin-top:10px; font-size:12px; color:#5d6c86; }
      @media (max-width: 900px){ .major-engine-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function resolveMajor(rawCareer){
    const input = String(rawCareer || '').trim();
    if (!input) return { input, status: 'empty' };
    const normalized = normalize(input);

    const exactProfile = state.profiles.find(row => normalize(row.display_name) === normalized);
    if (exactProfile) return buildResolved(exactProfile, 'exact_major_name', input);

    const aliasRow = state.aliasRows.find(row => row.normalized_aliases.includes(normalized));
    if (aliasRow) {
      const profile = state.profileByMajorId.get(aliasRow.major_id) || state.profileByName.get(aliasRow.display_name);
      if (profile) return buildResolved(profile, 'alias_match', input, aliasRow);
    }

    const normalizedMatch = state.profiles.find(row => fuzzyIncludes(row.display_name, input));
    if (normalizedMatch) return buildResolved(normalizedMatch, 'normalized_match', input);

    const suggestions = state.catalog
      .filter(row => fuzzyIncludes(row.display_name, input))
      .slice(0, 6)
      .map(row => row.display_name);

    return { input, normalized, status: 'not_found', suggestions };
  }

  function buildResolved(profile, matchedBy, input, aliasRow){
    const bridge = state.bridgeByMajorId.get(profile.major_id) || state.bridgeByName.get(profile.display_name) || null;
    return {
      input,
      normalized: normalize(input),
      status: 'resolved',
      matched_by: matchedBy,
      major_id: profile.major_id,
      display_name: profile.display_name,
      track_category: profile.track_category || '',
      source_status: profile.source_status || '',
      profile,
      alias_row: aliasRow || null,
      bridge,
      bridge_books: (bridge?.book_candidates || []).slice(0, 8)
    };
  }

  function getSummaryData(){
    const input = getCareerInput();
    const raw = input?.value || '';
    const resolved = resolveMajor(raw);
    if (resolved.status !== 'resolved') return resolved;
    const profile = resolved.profile || {};
    return {
      ...resolved,
      major_intro: profile.major_intro || '',
      core_keywords: uniq(profile.core_keywords || []).slice(0, 8),
      related_subject_hints: uniq(profile.related_subject_hints || []).slice(0, 6),
      inquiry_topics_raw: uniq(profile.inquiry_topics_raw || []).slice(0, 5),
      prep_activities: uniq(profile.prep_activities || []).slice(0, 5),
      recommended_books_raw: uniq(profile.recommended_books_raw || []).slice(0, 5),
      book_bridge_candidates: uniq(profile.book_bridge_candidates || []),
      bridge_books: resolved.bridge_books || []
    };
  }

  function renderMajorSummary(){
    injectStyles();
    bindCareerInput();
    const panel = ensureMajorPanel();
    if (!panel) return;
    const data = getSummaryData();
    if (!data || data.status === 'empty') {
      panel.style.display = 'none';
      panel.innerHTML = '';
      return;
    }
    panel.style.display = 'block';

    if (data.status !== 'resolved') {
      panel.innerHTML = `
        <div class="major-engine-kicker">전공 해석 미리보기</div>
        <h4 class="major-engine-title">학과명을 표준화하지 못했어요</h4>
        <div class="major-engine-sub">입력값: <strong>${escapeHtml(data.input || '-')}</strong></div>
        <div class="major-engine-suggest">${(data.suggestions || []).length ? `비슷한 학과: ${data.suggestions.map(escapeHtml).join(', ')}` : '아직 연결된 전공 프로필이 없습니다.'}</div>
      `;
      return;
    }

    const profileReady = data.source_status !== 'skeleton_only';
    panel.innerHTML = `
      <div class="major-engine-kicker">전공 해석 레이어</div>
      <h4 class="major-engine-title">${escapeHtml(data.display_name)}</h4>
      <div class="major-engine-sub">
        입력값 정규화: <strong>${escapeHtml(data.input)}</strong> → <strong>${escapeHtml(data.display_name)}</strong><br>
        계열: ${escapeHtml(data.track_category || '-')} · 매칭: ${escapeHtml(data.matched_by || '-')}
        ${profileReady ? '' : '<br><strong>현재는 skeleton 상태라 기본 정보만 표시합니다.</strong>'}
      </div>
      <div class="major-engine-grid">
        <div class="major-engine-box">
          <div class="major-engine-box-title">핵심 키워드</div>
          <div class="major-engine-chip-wrap">${(data.core_keywords || []).length ? data.core_keywords.map(v => `<span class="major-engine-chip">${escapeHtml(v)}</span>`).join('') : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}</div>
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">연결 교과</div>
          <div class="major-engine-chip-wrap">${(data.related_subject_hints || []).length ? data.related_subject_hints.map(v => `<span class="major-engine-chip">${escapeHtml(v)}</span>`).join('') : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}</div>
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">탐구 방향 예시</div>
          ${(data.inquiry_topics_raw || []).length ? `<ul class="major-engine-list">${data.inquiry_topics_raw.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">기존 도서 엔진 연결</div>
          ${(data.bridge_books || []).length ? `<ul class="major-engine-list">${data.bridge_books.map(v => `<li>${escapeHtml(v.title || v.book_id || '')}</li>`).join('')}</ul>` : '<div class="major-engine-empty">현재 연결된 도서가 없습니다.</div>'}
        </div>
      </div>
      <div class="major-engine-action-row">
        <button type="button" class="major-engine-action-btn" data-major-action="keywords">핵심 키워드 자동 반영</button>
        <button type="button" class="major-engine-action-btn" data-major-action="inquiry">탐구 예시 설명칸 넣기</button>
        <button type="button" class="major-engine-action-btn" data-major-action="all">둘 다 자동 반영</button>
      </div>
      <div class="major-engine-note">전공 입력을 실제 엔진 동작에 바로 쓰도록, 선택 키워드와 설명칸에 자동 반영할 수 있습니다.</div>
    `;

    panel.querySelectorAll('[data-major-action]').forEach(btn => {
      btn.addEventListener('click', () => applyMajorSuggestions(btn.dataset.majorAction));
    });
    autoReflectMajorData(data);
  }

  function buildMajorPayload(){
    const data = getSummaryData();
    if (!data || data.status !== 'resolved') {
      return {
        status: data?.status || 'empty',
        raw_input: data?.input || '',
        display_name: '',
        major_id: '',
        track_category: '',
        matched_by: data?.matched_by || '',
        source_status: '',
        core_keywords: [],
        related_subject_hints: [],
        inquiry_topics_raw: [],
        prep_activities: [],
        recommended_books_raw: [],
        bridge_books: [],
        major_intro: '',
        suggestions: data?.suggestions || []
      };
    }
    return {
      status: data.status,
      raw_input: data.input,
      display_name: data.display_name,
      major_id: data.major_id,
      track_category: data.track_category,
      matched_by: data.matched_by,
      source_status: data.source_status,
      core_keywords: data.core_keywords || [],
      related_subject_hints: data.related_subject_hints || [],
      inquiry_topics_raw: data.inquiry_topics_raw || [],
      prep_activities: data.prep_activities || [],
      recommended_books_raw: data.recommended_books_raw || [],
      bridge_books: data.bridge_books || [],
      major_intro: data.major_intro || '',
      book_bridge_candidates: data.book_bridge_candidates || []
    };
  }

  function startMiniPayloadPatch(){
    if (state.wrapped) return;
    const tryWrap = () => {
      if (state.wrapped) return true;
      if (typeof window.getMiniNavigationSelectionData !== 'function') return false;
      const original = window.getMiniNavigationSelectionData;
      window.getMiniNavigationSelectionData = function(){
        const payload = original() || {};
        payload.major_context = buildMajorPayload();
        return payload;
      };
      state.wrapped = true;
      return true;
    };
    if (tryWrap()) return;
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (tryWrap() || count > 40) clearInterval(timer);
    }, 250);
  }

  window.getMajorEngineSelectionData = buildMajorPayload;
  window.__MAJOR_ENGINE_RENDER__ = renderMajorSummary;
  window.__MAJOR_ENGINE_APPLY__ = applyMajorSuggestions;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }
})();
