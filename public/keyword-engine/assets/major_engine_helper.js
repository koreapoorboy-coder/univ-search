window.__MAJOR_ENGINE_HELPER_VERSION__ = "v0.5.0-subject-first-booster";

(function(){
  const CATALOG_URL = "seed/major-engine/major_catalog_198.json";
  const PROFILES_URL = "seed/major-engine/major_profiles_master_198.json";
  const ALIAS_URL = "seed/major-engine/major_alias_map.json";
  const ROUTER_URL = "seed/major-engine/major_engine_router.json";
  const BRIDGE_URL = "seed/major-engine/major_to_book_bridge.json";
  const TOPIC_MATRIX_URL = "seed/textbook-v1/topic_matrix_seed.json";
  const CONCEPT_UI_URL = "seed/textbook-v1/subject_concept_ui_seed.json";

  const state = {
    loaded: false,
    wrapped: false,
    catalog: [],
    profiles: [],
    aliases: [],
    router: {},
    bridges: [],
    topicMatrix: {},
    conceptUI: {},
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
      const [catalog, profiles, aliases, router, bridges, topicMatrix, conceptUI] = await Promise.all([
        loadJSON(CATALOG_URL),
        loadJSON(PROFILES_URL),
        loadJSON(ALIAS_URL),
        loadJSON(ROUTER_URL),
        loadJSON(BRIDGE_URL),
        loadJSON(TOPIC_MATRIX_URL),
        loadJSON(CONCEPT_UI_URL)
      ]);
      state.catalog = Array.isArray(catalog) ? catalog : [];
      state.profiles = Array.isArray(profiles) ? profiles : [];
      state.aliases = Array.isArray(aliases) ? aliases : [];
      state.router = router || {};
      state.bridges = Array.isArray(bridges) ? bridges : [];
      state.topicMatrix = topicMatrix || {};
      state.conceptUI = conceptUI || {};

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
      bindSubjectInput();
      renderMajorSummary();
      startMiniPayloadPatch();
    } catch (error) {
      console.warn('major engine helper load failed:', error);
    }
  }

  function getCareerInput(){ return $('career'); }
  function getKeywordInput(){ return $('keyword'); }
  function getTaskDescriptionInput(){ return $('taskDescription'); }
  function getTextbookState(){ return window.__TEXTBOOK_HELPER_STATE__ || {}; }
  function getSelectedSubject(){ return getTextbookState().subject || $('subject')?.value || ''; }

  function buildKeywordSuggestionText(data){
    if (!data || data.status !== 'resolved' || !data.selected_subject) return '';
    return uniq(data.boost_keywords || data.core_keywords || []).slice(0, 6).join(', ');
  }
  function buildInquirySeedText(data){
    if (!data || data.status !== 'resolved' || !data.selected_subject) return '';
    const parts = [];
    parts.push(`선택 과목 ${data.selected_subject}`);
    if ((data.boost_concepts || [])[0]) parts.push(`${data.boost_concepts[0]} 중심`);
    if ((data.inquiry_topics_raw || [])[0]) parts.push(data.inquiry_topics_raw[0]);
    return parts.filter(Boolean).join(' / ');
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
    if (!data || data.status !== 'resolved' || !data.selected_subject) return;
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

  function bindSubjectInput(){
    const el = $('subject');
    if (!el || el.dataset.majorSubjectBound === '1') return;
    el.dataset.majorSubjectBound = '1';
    ['change','input'].forEach(evt => {
      el.addEventListener(evt, () => {
        setTimeout(() => {
          renderMajorSummary();
          startMiniPayloadPatch();
        }, 0);
      });
    });
    const renderFn = window.__TEXTBOOK_HELPER_RENDER__;
    if (typeof renderFn === 'function' && !window.__MAJOR_ENGINE_WRAP_TEXTBOOK_RENDER__) {
      window.__MAJOR_ENGINE_WRAP_TEXTBOOK_RENDER__ = true;
      window.__TEXTBOOK_HELPER_RENDER__ = function(){
        const result = renderFn.apply(this, arguments);
        setTimeout(() => {
          renderMajorSummary();
          startMiniPayloadPatch();
        }, 0);
        return result;
      };
    }
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
      .major-engine-panel { margin-top: 12px; padding: 16px; border: 1px solid #dbe5f4; border-radius: 16px; background: #fbfdff; box-shadow: 0 8px 20px rgba(15, 23, 42, .04); display:none; }
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
      .major-engine-action-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .major-engine-action-btn { border:1px solid #cfe0ff; background:#f4f8ff; color:#1f4fbf; border-radius:10px; padding:8px 12px; font-size:12px; font-weight:800; cursor:pointer; }
      .major-engine-action-btn:hover { background:#eaf2ff; }
      .major-engine-note { margin-top:10px; font-size:12px; color:#5d6c86; }
      .major-engine-status { margin-top: 10px; border:1px dashed #dbe5f4; border-radius:14px; background:#fff; padding:12px; }
      .major-engine-status-title { font-size:13px; font-weight:900; color:#16213a; margin-bottom:8px; }
      .major-engine-status p { margin:0; color:#5f6d86; font-size:13px; line-height:1.6; }
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

    const suggestions = state.catalog.filter(row => fuzzyIncludes(row.display_name, input)).slice(0, 6).map(row => row.display_name);
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

  function collectSubjectScopedConcepts(selectedSubject, data){
    if (!selectedSubject || !state.conceptUI[selectedSubject]) return [];
    const row = state.conceptUI[selectedSubject];
    const buttons = row?.concept_buttons || [];
    const bag = uniq([
      data.display_name,
      ...(data.core_keywords || []),
      ...(data.inquiry_topics_raw || []),
      ...(data.book_bridge_candidates || [])
    ]).join(' ');
    const scored = buttons.map(btn => {
      const text = [btn.concept, btn.unit, ...(btn.core_preview || []), ...(btn.student_topics || [])].join(' ');
      let score = 0;
      (data.core_keywords || []).forEach(k => { if (fuzzyIncludes(text, k) || fuzzyIncludes(k, text)) score += 12; });
      (btn.core_preview || []).forEach(k => { if (fuzzyIncludes(bag, k) || fuzzyIncludes(k, bag)) score += 8; });
      if (fuzzyIncludes(data.display_name, text) || fuzzyIncludes(text, data.display_name)) score += 10;
      if (/반도체|전자|전기/.test(data.display_name + ' ' + bag) && /(측정|물질|규칙성|전기|자료|정보|행렬|그래프|시스템|역학)/.test(text)) score += 6;
      if (/컴퓨터|소프트웨어|정보|보안/.test(data.display_name + ' ' + bag) && /(자료|정보|알고리즘|데이터|시각화|문제 분해)/.test(text)) score += 6;
      if (/신소재|재료|화학|에너지/.test(data.display_name + ' ' + bag) && /(물질|원소|규칙성|주기율|측정|단위|에너지|역학)/.test(text)) score += 6;
      return { concept: btn.concept, score, preview: btn.core_preview || [] };
    }).sort((a,b)=> b.score-a.score || a.concept.localeCompare(b.concept,'ko'));
    return scored.slice(0,4);
  }

  function getPerspectiveSuggestions(data){
    const tm = state.topicMatrix || {};
    const picks = [];
    const keywordProfiles = tm.keywordProfiles || {};
    (data.core_keywords || []).forEach(k => {
      Object.keys(keywordProfiles).forEach(name => {
        if (name === '_default') return;
        if (fuzzyIncludes(name, k) || fuzzyIncludes(k, name)) {
          (keywordProfiles[name].perspectives || []).forEach(p => picks.push(p));
        }
      });
    });
    if (!picks.length) {
      const defaults = tm.keywordProfiles?._default?.perspectives || tm.careerProfiles?._default?.perspectives || [];
      picks.push(...defaults);
    }
    return uniq(picks).slice(0, 4);
  }

  function getSummaryData(){
    const input = getCareerInput();
    const raw = input?.value || '';
    const resolved = resolveMajor(raw);
    const selectedSubject = getSelectedSubject();
    if (resolved.status !== 'resolved') return { ...resolved, selected_subject: selectedSubject };
    const profile = resolved.profile || {};
    const relatedSubjects = uniq(profile.related_subject_hints || []).slice(0, 6);
    const subjectScopedConcepts = collectSubjectScopedConcepts(selectedSubject, {
      display_name: resolved.display_name,
      core_keywords: uniq(profile.core_keywords || []),
      inquiry_topics_raw: uniq(profile.inquiry_topics_raw || []),
      book_bridge_candidates: uniq(profile.book_bridge_candidates || [])
    });
    const perspectiveSuggestions = getPerspectiveSuggestions({ core_keywords: uniq(profile.core_keywords || []) });
    const boostKeywords = uniq([
      ...(profile.core_keywords || []).slice(0, 5),
      ...(subjectScopedConcepts[0]?.preview || []).slice(0, 2)
    ]).slice(0, 6);
    return {
      ...resolved,
      selected_subject: selectedSubject,
      subject_selected: !!selectedSubject,
      major_intro: profile.major_intro || '',
      core_keywords: uniq(profile.core_keywords || []).slice(0, 8),
      related_subject_hints: relatedSubjects,
      inquiry_topics_raw: uniq(profile.inquiry_topics_raw || []).slice(0, 5),
      prep_activities: uniq(profile.prep_activities || []).slice(0, 5),
      recommended_books_raw: uniq(profile.recommended_books_raw || []).slice(0, 5),
      book_bridge_candidates: uniq(profile.book_bridge_candidates || []),
      bridge_books: resolved.bridge_books || [],
      boost_subjects: selectedSubject ? [selectedSubject] : [],
      boost_concepts: subjectScopedConcepts.map(v => v.concept),
      boost_perspectives: perspectiveSuggestions,
      boost_keywords: boostKeywords
    };
  }

  function renderMajorSummary(){
    injectStyles();
    bindCareerInput();
    bindSubjectInput();
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
        <div class="major-engine-note">과목 선택 뒤 다시 입력하면 전공 맞춤 추천이 더 정확해집니다.</div>
      `;
      return;
    }

    const profileReady = data.source_status !== 'skeleton_only';
    const subjectReady = !!data.selected_subject;
    panel.innerHTML = `
      <div class="major-engine-kicker">전공 기반 추천 프리셋</div>
      <h4 class="major-engine-title">${escapeHtml(data.display_name)}</h4>
      <div class="major-engine-sub">
        입력값 정규화: <strong>${escapeHtml(data.input)}</strong> → <strong>${escapeHtml(data.display_name)}</strong><br>
        선택 과목: <strong>${escapeHtml(data.selected_subject || '선택 전')}</strong> · 계열: ${escapeHtml(data.track_category || '-')}
        ${profileReady ? '' : '<br><strong>현재는 skeleton 상태라 기본 추천만 표시합니다.</strong>'}
      </div>
      <div class="major-engine-grid">
        <div class="major-engine-box">
          <div class="major-engine-box-title">전공 핵심 키워드 요약</div>
          <div class="major-engine-chip-wrap">${(data.core_keywords || []).slice(0,6).length ? data.core_keywords.slice(0,6).map(v => `<span class="major-engine-chip">${escapeHtml(v)}</span>`).join('') : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}</div>
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">선택 과목 안 추천 개념</div>
          ${subjectReady ? `<div class="major-engine-chip-wrap">${(data.boost_concepts || []).length ? data.boost_concepts.map(v => `<span class="major-engine-chip">${escapeHtml(v)}</span>`).join('') : '<div class="major-engine-empty">이 과목에서 바로 연결된 추천 개념을 찾지 못했습니다.</div>'}</div>` : '<div class="major-engine-empty">먼저 아래 공용 엔진에서 과목을 선택하면, 그 과목 안에서만 추천 개념을 추려 줍니다.</div>'}
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">추천 탐구 방향</div>
          ${(data.inquiry_topics_raw || []).slice(0,4).length ? `<ul class="major-engine-list">${data.inquiry_topics_raw.slice(0,4).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">참고 도서</div>
          ${(data.bridge_books || []).slice(0,4).length ? `<ul class="major-engine-list">${data.bridge_books.slice(0,4).map(v => `<li>${escapeHtml(v.title || v.book_id || '')}</li>`).join('')}</ul>` : '<div class="major-engine-empty">현재 연결된 도서가 없습니다.</div>'}
        </div>
      </div>
      <div class="major-engine-action-row">
        <button type="button" class="major-engine-action-btn" data-major-action="keywords" ${subjectReady ? '' : 'disabled'}>${subjectReady ? '아래 엔진에 키워드 넣기' : '과목 선택 후 키워드 반영'}</button>
        <button type="button" class="major-engine-action-btn" data-major-action="inquiry" ${subjectReady ? '' : 'disabled'}>${subjectReady ? '아래 엔진에 설명 넣기' : '과목 선택 후 설명 반영'}</button>
        <button type="button" class="major-engine-action-btn" data-major-action="all" ${subjectReady ? '' : 'disabled'}>${subjectReady ? '추천값 한 번에 넣기' : '과목 선택 후 전체 반영'}</button>
      </div>
      <div class="major-engine-note">전공 데이터는 과목을 바꾸지 않고, 학생이 고른 과목 안에서 추천 개념·키워드·설명 순서만 더 정교하게 보정합니다.</div>
      <div class="major-engine-status">
        <div class="major-engine-status-title">현재 반영 상태</div>
        <p>${subjectReady ? `선택 과목 <strong>${escapeHtml(data.selected_subject)}</strong> 기준으로 전공 맞춤 추천이 준비되었습니다. 아래 공용 엔진에서 실제 개념·도서·보고서 방식을 이어서 고르면 됩니다.` : '아직 과목이 선택되지 않았습니다. 먼저 아래 공용 엔진에서 과목을 고르면, 그 과목 안에서 전공 맞춤 추천만 보정됩니다.'}</p>
      </div>
    `;

    panel.querySelectorAll('[data-major-action]').forEach(btn => {
      if (btn.disabled) return;
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
        selected_subject: data?.selected_subject || '',
        subject_scoped: false,
        core_keywords: [],
        related_subject_hints: [],
        inquiry_topics_raw: [],
        prep_activities: [],
        recommended_books_raw: [],
        bridge_books: [],
        major_intro: '',
        suggestions: data?.suggestions || [],
        boost_subjects: [],
        boost_concepts: [],
        boost_perspectives: [],
        boost_keywords: []
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
      selected_subject: data.selected_subject || '',
      subject_scoped: !!data.selected_subject,
      core_keywords: data.core_keywords || [],
      related_subject_hints: data.related_subject_hints || [],
      inquiry_topics_raw: data.inquiry_topics_raw || [],
      prep_activities: data.prep_activities || [],
      recommended_books_raw: data.recommended_books_raw || [],
      bridge_books: data.bridge_books || [],
      major_intro: data.major_intro || '',
      book_bridge_candidates: data.book_bridge_candidates || [],
      boost_subjects: data.boost_subjects || [],
      boost_concepts: data.boost_concepts || [],
      boost_perspectives: data.boost_perspectives || [],
      boost_keywords: data.boost_keywords || []
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
