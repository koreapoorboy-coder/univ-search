
window.__MAJOR_ENGINE_HELPER_VERSION__ = "v0.7.79-direct-query-routing-fix";

(function(){
  window.__MAJOR_ENGINE_HELPER_VERSION = 'v33.17-major-bridge-fullfix';
  const CATALOG_URL = "seed/major-engine/major_catalog_198.json";
  const PROFILES_URL = "seed/major-engine/major_profiles_master_198.json";
  const ALIAS_URL = "seed/major-engine/major_alias_map.json";
  const ROUTER_URL = "seed/major-engine/major_engine_router.json";
  const BRIDGE_URL = "seed/major-engine/major_to_book_bridge.json";

  const PLACEHOLDER_KEYWORDS = new Set([
    '전공 핵심키워드','개설 대학','필요 역량','전공 탐구활동 주제'
  ]);

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
    aliasRows: [],
    activeResolved: null,
    selectedMajorId: '',
    selectedMajorName: '',
    loading: false,
    delegatedCareerBound: false,
    inputObserverBound: false
  };

  function $(id){ return document.getElementById(id); }
  function normalize(value){
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g,'')
      .replace(/[()\-_/·.,]/g,'')
      .replace(/학과|학부|전공|예과/g,'');
  }

  function uniqStrings(values){
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function getNearbyInputFromNode(node){
    if (!node) return null;
    const direct = node.matches?.('input, textarea') ? node : null;
    if (direct) return direct;
    const own = node.querySelector?.('input, textarea');
    if (own) return own;
    let current = node;
    for (let depth = 0; depth < 4 && current; depth += 1) {
      const parent = current.parentElement;
      if (!parent) break;
      const parentInput = parent.querySelector?.('input, textarea');
      if (parentInput) return parentInput;
      let sibling = current.nextElementSibling;
      while (sibling) {
        if (sibling.matches?.('input, textarea')) return sibling;
        const nested = sibling.querySelector?.('input, textarea');
        if (nested) return nested;
        sibling = sibling.nextElementSibling;
      }
      current = parent;
    }
    return null;
  }

  function getInputByLabelText(labelText){
    const target = String(labelText || '').trim();
    if (!target) return null;
    const normalizedTarget = target.replace(/\s+/g,'').trim();
    const nodes = Array.from(document.querySelectorAll('label, legend, th, td, dt, span, div, strong, p'));
    for (const node of nodes) {
      const text = String(node.textContent || '').replace(/\s+/g,' ').trim();
      const normalizedText = text.replace(/\s+/g,'').trim();
      if (!text) continue;
      if (text === target || text.includes(target) || normalizedText === normalizedTarget || normalizedText.includes(normalizedTarget)) {
        const input = getNearbyInputFromNode(node);
        if (input) return input;
      }
    }
    return null;
  }

  function getCareerInput(){
    return $('career')
      || document.querySelector('input[name="career"]')
      || document.querySelector('textarea[name="career"]')
      || document.querySelector('input[data-field="career"]')
      || document.querySelector('textarea[data-field="career"]')
      || document.querySelector('#career input, #career textarea')
      || getInputByLabelText('희망 진로')
      || getInputByLabelText('희망진로')
      || getInputByLabelText('희망 전공')
      || getInputByLabelText('희망전공')
      || document.querySelector('input[placeholder*="희망 진로"]')
      || document.querySelector('textarea[placeholder*="희망 진로"]')
      || document.querySelector('input[placeholder*="희망진로"]')
      || document.querySelector('textarea[placeholder*="희망진로"]')
      || null;
  }

  function stripMajorSuffix(value){
    return String(value || '')
      .trim()
      .replace(/(학과|학부|전공|예과|과)$/,'');
  }
  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function uniq(arr){ return Array.from(new Set((arr || []).filter(Boolean))); }


  function sanitizeAliasList(aliases){
    return uniq((aliases || []).filter(alias => normalize(alias).length >= 2));
  }

  function buildVirtualMajorProfile(name, majorId, existingRow){
    const override = getMajorOverride(name) || {};
    const explicitCoreKeywords = Array.isArray(override.core_keywords) ? override.core_keywords : [];
    const explicitRecommendedKeywords = Array.isArray(override.recommended_keywords) ? override.recommended_keywords : [];
    const fallbackKeywords = uniq([
      ...((existingRow && Array.isArray(existingRow.core_keywords)) ? existingRow.core_keywords : []),
      ...explicitCoreKeywords,
      ...((existingRow && Array.isArray(existingRow.recommended_keywords)) ? existingRow.recommended_keywords : []),
      ...explicitRecommendedKeywords,
      ...((override.subjects || [])),
      ...((override.topics || [])).map(v => String(v).split(/[·,]/)[0].trim())
    ]).filter(Boolean).slice(0, 6);
    return {
      ...(existingRow || {}),
      major_id: majorId,
      display_name: name,
      track_category: override.track_category || existingRow?.track_category || '',
      core_keywords: (explicitCoreKeywords.length ? explicitCoreKeywords : ((existingRow?.core_keywords && existingRow.core_keywords.length) ? existingRow.core_keywords : fallbackKeywords)),
      recommended_keywords: (explicitRecommendedKeywords.length ? explicitRecommendedKeywords : ((existingRow?.recommended_keywords && existingRow.recommended_keywords.length) ? existingRow.recommended_keywords : [])),
      source_status: existingRow?.source_status || 'virtual_override'
    };
  }

  function ensureOverrideMajorsInSearch(){
    const overrideNames = Object.keys(MAJOR_COPY_OVERRIDES || {});
    if (!overrideNames.length) return;

    const catalogNameMap = new Map((state.catalog || []).map(row => [normalize(row?.display_name), row]).filter(([k]) => k));
    const profileNameMap = new Map((state.profiles || []).map(row => [normalize(row?.display_name), row]).filter(([k]) => k));
    const aliasNameSet = new Set((state.aliases || []).flatMap(row => {
      const values = [row?.display_name, ...((row?.aliases) || [])];
      return values.map(normalize).filter(Boolean);
    }));

    overrideNames.forEach(name => {
      const key = normalize(name);
      const existingCatalog = catalogNameMap.get(key) || null;
      const existingProfile = profileNameMap.get(key) || null;
      const majorId = existingCatalog?.major_id || existingProfile?.major_id || `virtual:${key}`;

      if (!existingCatalog) {
        const virtualCatalog = {
          major_id: majorId,
          display_name: name,
          track_category: getMajorOverride(name)?.track_category || '',
          source_status: 'virtual_override'
        };
        state.catalog.push(virtualCatalog);
        catalogNameMap.set(key, virtualCatalog);
      }

      if (!existingProfile) {
        const virtualProfile = buildVirtualMajorProfile(name, majorId, existingCatalog);
        state.profiles.push(virtualProfile);
        profileNameMap.set(key, virtualProfile);
      }

      const override = getMajorOverride(name) || {};
      const forcedAliases = uniq([
        name,
        String(name).replace(/학과$/, ''),
        String(name).replace(/학부$/, ''),
        stripMajorSuffix(name),
        stripMajorSuffix(name),
        ...((override.aliases || [])),
        ...((override.search_aliases || [])),
        ...((override.core_keywords || [])),
        ...((override.subjects || [])),
        ...((override.topics || [])).map(v => String(v).split(/[·,]/)[0].trim())
      ]).filter(Boolean);

      const existingAliasRow = (state.aliases || []).find(row => normalize(row?.display_name) === key || row?.major_id === majorId);
      if (existingAliasRow) {
        existingAliasRow.aliases = sanitizeAliasList([...(existingAliasRow.aliases || []), ...forcedAliases]);
      } else {
        state.aliases.push({
          major_id: majorId,
          display_name: name,
          aliases: sanitizeAliasList(forcedAliases)
        });
      }
      forcedAliases.map(normalize).filter(Boolean).forEach(v => aliasNameSet.add(v));
    });
  }


  function backfillPriorityMajorsForSearch(names){
    (names || []).forEach(name => {
      const key = normalize(name);
      const override = getMajorOverride(name) || {};
      const catalogRow = (state.catalog || []).find(row => normalize(row?.display_name) === key);
      const profileRow = (state.profiles || []).find(row => normalize(row?.display_name) === key);
      const majorId = catalogRow?.major_id || profileRow?.major_id || `virtual:${key}`;
      if (!catalogRow) {
        state.catalog.push({ major_id: majorId, display_name: name, track_category: override.track_category || '', source_status: 'priority_override' });
      }
      if (!profileRow) {
        state.profiles.push(buildVirtualMajorProfile(name, majorId, catalogRow || null));
      }
      const aliasPool = uniq([
        name,
        String(name).replace(/학과$/, ''),
        String(name).replace(/학부$/, ''),
        stripMajorSuffix(name),
        ...((override.aliases || [])),
        ...((override.search_aliases || [])),
        ...((override.core_keywords || []))
      ]).filter(Boolean);
      const aliasRow = (state.aliases || []).find(row => normalize(row?.display_name) === key || row?.major_id === majorId);
      if (aliasRow) {
        aliasRow.aliases = sanitizeAliasList([...(aliasRow.aliases || []), ...aliasPool]);
      } else {
        state.aliases.push({ major_id: majorId, display_name: name, aliases: sanitizeAliasList(aliasPool) });
      }
    });
  }

  function fuzzyIncludes(a,b){
    const na = normalize(a); const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
  }

  function boundedEditDistance(a, b, maxDistance){
    const left = normalize(a);
    const right = normalize(b);
    const limit = Number.isFinite(maxDistance) ? maxDistance : 2;
    if (!left || !right) return Number.POSITIVE_INFINITY;
    if (left === right) return 0;
    if (Math.abs(left.length - right.length) > limit) return Number.POSITIVE_INFINITY;
    const rows = Array.from({ length: left.length + 1 }, (_, i) => i);
    for (let j = 1; j <= right.length; j += 1) {
      let previous = rows[0];
      rows[0] = j;
      let rowMin = rows[0];
      for (let i = 1; i <= left.length; i += 1) {
        const current = rows[i];
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        rows[i] = Math.min(
          rows[i] + 1,
          rows[i - 1] + 1,
          previous + cost
        );
        previous = current;
        if (rows[i] < rowMin) rowMin = rows[i];
      }
      if (rowMin > limit) return Number.POSITIVE_INFINITY;
    }
    return rows[left.length] <= limit ? rows[left.length] : Number.POSITIVE_INFINITY;
  }

  function isTypoCloseMatch(a, b){
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (Math.min(na.length, nb.length) < 4) return false;
    const limit = Math.max(1, Math.min(2, Math.floor(Math.min(na.length, nb.length) / 4)));
    return boundedEditDistance(na, nb, limit) <= limit;
  }

  function countKeywordMatches(keywords, input){
    const normalizedInput = normalize(input);
    if (!normalizedInput) return 0;
    return (keywords || []).filter(v => fuzzyIncludes(v, input)).length;
  }

  function deriveMatchLabel(score){
    if (score >= 120) return '강한 일치';
    if (score >= 70) return '높은 연관';
    if (score >= 40) return '관련 추천';
    return '확장 후보';
  }

  function buildUrlCandidates(url){
    const clean = String(url || '').replace(/^\/+/, '');
    const href = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : window.location.href;
    return uniqStrings([
      clean,
      `./${clean}`,
      `/${clean}`,
      new URL(clean, href).toString(),
      new URL(`./${clean}`, href).toString(),
      new URL(`../${clean}`, href).toString()
    ]);
  }

  async function loadJSON(url){
    let lastError = null;
    for (const candidate of buildUrlCandidates(url)) {
      try {
        const res = await fetch(candidate, { cache: 'no-store' });
        if (!res.ok) {
          lastError = new Error(`Failed to load ${candidate}: ${res.status}`);
          continue;
        }
        return await res.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Failed to load ${url}`);
  }

  async function loadAll(){
    if (state.loaded || state.loading) return;
    state.loading = true;
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
      state.aliases = (Array.isArray(aliases) ? aliases : []).map(row => ({ ...row, aliases: sanitizeAliasList(row?.aliases || []) }));
      state.router = router || {};
      state.bridges = Array.isArray(bridges) ? bridges : [];
      ensureOverrideMajorsInSearch();
      backfillPriorityMajorsForSearch(['연극영화과','영화영상학과','공연예술학과','방송영상학과','애니메이션학과','실용음악과','체육학과','스포츠과학과','스포츠산업학과','사회체육학과','레저스포츠학과','스포츠의학과','행정학과','정치외교학과','법학과','경찰행정학과','공공인재학부','사회학과','관광경영학과','호텔경영학과','항공서비스학과','항공운항학과','외식경영학과','MICE산업학과','식품영양학과','식품공학과','동물자원학과','원예생명과학과','산림자원학과','농업경제학과']);

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
      injectStyles();
      bindCareerInput();
      renderMajorSummary();
      startMiniPayloadPatch();
    } catch (error) {
      console.warn('major engine helper load failed:', error);
    } finally {
      state.loading = false;
    }
  }

  function onCareerInputEvent(el){
    if (!el) return;
    const raw = String(el.value || '').trim();
    if (!raw) {
      state.selectedMajorId = '';
      state.selectedMajorName = '';
    } else if (state.selectedMajorName && normalize(raw) !== normalize(state.selectedMajorName)) {
      state.selectedMajorId = '';
      state.selectedMajorName = '';
    }
    renderMajorSummary();
    startMiniPayloadPatch();
  }

  function bindCareerInput(){
    const el = getCareerInput();
    if (el && el.dataset.majorBound !== '1') {
      el.dataset.majorBound = '1';
      ['input','change','focus','blur'].forEach(evt => {
        el.addEventListener(evt, () => onCareerInputEvent(el));
      });
    }

    if (!state.delegatedCareerBound) {
      state.delegatedCareerBound = true;
      const handler = (event) => {
        const current = getCareerInput();
        if (!current) return;
        if (event.target === current) onCareerInputEvent(current);
      };
      ['input','change','focus','blur'].forEach(evt => {
        document.addEventListener(evt, handler, true);
      });
    }

    if (!state.inputObserverBound && typeof MutationObserver !== 'undefined') {
      state.inputObserverBound = true;
      const observer = new MutationObserver(() => {
        const current = getCareerInput();
        if (current && current.dataset.majorBound !== '1') bindCareerInput();
        const panel = $('majorEngineSummary');
        if (panel && current && panel.previousElementSibling !== current) {
          current.insertAdjacentElement('afterend', panel);
        }
      });
      observer.observe(document.body || document.documentElement, { childList:true, subtree:true });
    }
  }

  function ensureMajorPanel(){
    const input = getCareerInput();
    if (!input) return null;
    let panel = $('majorEngineSummary');
    if (panel) {
      if (panel.previousElementSibling !== input) {
        input.insertAdjacentElement('afterend', panel);
      }
      return panel;
    }
    panel = document.createElement('div');
    panel.id = 'majorEngineSummary';
    panel.className = 'major-engine-panel';
    input.insertAdjacentElement('afterend', panel);
    panel.addEventListener('click', onPanelClick);
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
      .major-engine-candidates { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:12px; }
      .major-engine-candidate { border:1px solid #cfe0ff; background:#fff; color:#245ee8; border-radius:16px; padding:12px; font-size:13px; font-weight:700; cursor:pointer; text-align:left; }
      .major-engine-candidate:hover { background:#eef4ff; }
      .major-engine-candidate.is-selected { background:#245ee8; color:#fff; border-color:#245ee8; box-shadow:0 4px 12px rgba(36,94,232,.18); }
      .major-engine-candidate-title { font-size:14px; font-weight:800; }
      .major-engine-candidate-meta { margin-top:6px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
      .major-engine-candidate-track { display:inline-block; border-radius:999px; padding:3px 8px; background:#eef4ff; color:#245ee8; font-size:11px; font-weight:700; }
      .major-engine-candidate.is-selected .major-engine-candidate-track { background:rgba(255,255,255,.18); color:#fff; }
      .major-engine-candidate-score { display:inline-block; border-radius:999px; padding:3px 8px; background:#f6f8fc; color:#5c6c86; font-size:11px; font-weight:700; }
      .major-engine-candidate.is-selected .major-engine-candidate-score { background:rgba(255,255,255,.12); color:#fff; }
      .major-engine-candidate-keywords { margin-top:8px; color:#5c6c86; font-size:12px; line-height:1.5; }
      .major-engine-candidate.is-selected .major-engine-candidate-keywords { color:rgba(255,255,255,.92); }
      .major-engine-help { margin-top:8px; color:#6a7891; font-size:12px; }
      .major-engine-group-list { margin-top: 12px; display:grid; gap:14px; }
      .major-engine-group { border:1px solid #dbe5f4; background:#fff; border-radius:18px; padding:14px; }
      .major-engine-group-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:10px; }
      .major-engine-group-title { font-size:16px; font-weight:800; color:#172033; }
      .major-engine-group-desc { margin-top:4px; color:#5c6c86; font-size:13px; line-height:1.55; }
      .major-engine-group-count { display:inline-flex; padding:4px 10px; border-radius:999px; background:#f3f6fd; color:#40506a; font-size:12px; font-weight:700; white-space:nowrap; }
      .major-engine-candidates { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:12px; }
      .major-engine-compare { margin-top:14px; padding:14px; border:1px solid #dbe5f4; background:#fbfdff; border-radius:16px; }
      .major-engine-compare-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:10px; }
      .major-engine-compare-title { font-size:15px; font-weight:800; color:#172033; }
      .major-engine-compare-desc { margin-top:4px; color:#5c6c86; font-size:13px; line-height:1.55; }
      .major-engine-compare-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:10px; }
      .major-engine-compare-card { border:1px solid #d7e4fb; background:#fff; border-radius:14px; padding:12px; }
      .major-engine-compare-name { font-size:14px; font-weight:800; color:#172033; }
      .major-engine-compare-track { margin-top:6px; display:inline-flex; padding:3px 8px; border-radius:999px; background:#eef4ff; color:#245ee8; font-size:11px; font-weight:700; }
      .major-engine-compare-focus { margin-top:8px; color:#33435f; font-size:13px; line-height:1.55; }
      .major-engine-compare-hint { margin-top:8px; color:#61708c; font-size:12px; line-height:1.5; }
      @media (max-width: 900px){ .major-engine-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function getTrackLabel(track){
    const map = {
      engineering:'공학계열', medical:'의약계열', natural:'자연계열', humanities:'인문계열', social:'사회계열', autonomous:'자율전공'
    };
    return map[track] || track || '';
  }


  const GENERIC_MAJOR_INTRO_PATTERNS = [
    /source 구조화가 완료된 전공입니다/,
    /세부 문장 추출은 후속 보강 단계/,
    /기반의 source 구조화가 완료/
  ];

  const BROAD_QUERY_KEYWORDS = new Set(['환경','심리','교육','복지','미디어','국제','경제','금융','회계','무역','통상','법','행정','정치','외교','사회학','공공','경찰','반도체','바이오','보건','컴퓨터','인공지능','소프트웨어','데이터','보안','화학','화공','에너지','소재','배터리','이차전지','건축','디자인','실내','인테리어','국문','문학','영문','역사','철학','문헌','수학','물리','지구과학','천문','우주','통계','체육','스포츠','레저','운동','관광','호텔','항공','승무','운항','외식','컨벤션','마이스']);


  const DIRECT_QUERY_MAJOR_MAP = {
    '신소재': ['신소재공학과'],
    '신소재공': ['신소재공학과']
  };

  const DIRECT_QUERY_BROAD_MAP = {
    '환경': ['환경공학과','지구환경과학과','건설환경공학과','토목환경공학과','주거환경학과','도시공학과']
  };

  const QUERY_BOOST_RULES = [
    { queries:['환경'], test: /(환경공학과|건설환경공학|토목환경공학|지구환경과학|주거환경|도시공학)/, boost: 38 },
    { queries:['도시'], test: /(도시공학|건설환경공학|토목환경공학|주거환경|지구환경과학)/, boost: 36 },
    { queries:['주거'], test: /(주거환경|도시공학)/, boost: 34 },
    { queries:['심리'], test: /(심리학|상담심리학|재활상담학)/, boost: 42 },
    { queries:['교육'], test: /(교육학|유아교육|아동학|특수교육|사회복지학)/, boost: 40 },
    { queries:['복지'], test: /(사회복지학|상담심리학|재활상담학|특수교육|아동학)/, boost: 38 },
    { queries:['미디어'], test: /(미디어커뮤니케이션|광고홍보|문화인류|문화유산)/, boost: 34 },
    { queries:['국제'], test: /(국제학부|국제통상학|경제학|경영학)/, boost: 34 },
    { queries:['경제'], test: /(경제학|금융학|회계학|국제통상학|무역학|경영정보학)/, boost: 42 },
    { queries:['금융'], test: /(금융학|경제학|회계학|경영정보학)/, boost: 44 },
    { queries:['회계'], test: /(회계학|금융학|경영정보학|경제학)/, boost: 44 },
    { queries:['무역'], test: /(무역학|국제통상학|경제학|글로벌경영학)/, boost: 42 },
    { queries:['통상'], test: /(국제통상학|무역학|경제학|국제학부)/, boost: 42 },
    { queries:['법'], test: /(법학과|경찰행정학과|행정학과|정치외교학과|사회학과)/, boost: 42 },
    { queries:['행정'], test: /(행정학과|경찰행정학과|공공인재학부|정치외교학과|사회학과)/, boost: 42 },
    { queries:['정치','외교'], test: /(정치외교학과|행정학과|국제학부|법학과|사회학과)/, boost: 42 },
    { queries:['사회학'], test: /(사회학과|행정학과|정치외교학과|사회복지학과|심리학과)/, boost: 44 },
    { queries:['공공'], test: /(공공인재학부|행정학과|경찰행정학과|정치외교학과|사회학과)/, boost: 40 },
    { queries:['반도체'], test: /(반도체공학|신소재공학|전자공학)/, boost: 36 },
    { queries:['건축'], test: /(건축학|건축공학|실내디자인학|공간디자인|인테리어)/, boost: 42 },
    { queries:['디자인'], test: /(산업디자인학|시각디자인학|제품디자인학|실내디자인학|건축학)/, boost: 42 },
    { queries:['실내','인테리어'], test: /(실내디자인학|건축학|주거환경학)/, boost: 42 },
    { queries:['컴퓨터'], test: /(컴퓨터공학|소프트웨어학|인공지능학|데이터사이언스학|정보보호학|산업공학)/, boost: 42 },
    { queries:['소프트웨어'], test: /(소프트웨어학|컴퓨터공학|인공지능학)/, boost: 42 },
    { queries:['인공지능'], test: /(인공지능학|데이터사이언스학|소프트웨어학|컴퓨터공학)/, boost: 44 },
    { queries:['데이터'], test: /(데이터사이언스학|인공지능학|산업공학|컴퓨터공학)/, boost: 40 },
    { queries:['보안'], test: /(정보보호학|컴퓨터공학|소프트웨어학)/, boost: 42 },
    { queries:['바이오'], test: /(생명공학|생명과학|식품생명공학|화공생명공학|제약공학|의공학)/, boost: 44 },
    { queries:['화학'], test: /(화학과|화학공학과|화공생명공학과|에너지공학과|신소재공학과)/, boost: 42 },
    { queries:['화공'], test: /(화학공학과|화공생명공학과|에너지공학과|신소재공학과)/, boost: 44 },
    { queries:['에너지'], test: /(에너지공학과|화학공학과|화공생명공학과|신소재공학과|전기공학과)/, boost: 42 },
    { queries:['소재'], test: /(신소재공학과|반도체공학과|화학공학과|화공생명공학과)/, boost: 40 },
    { queries:['배터리','이차전지'], test: /(신소재공학과|화학공학과|에너지공학과|화공생명공학과|전기공학과)/, boost: 46 },
    { queries:['국문','문학'], test: /(국어국문학과|영어영문학과|사학과|철학과|문헌정보학과|문화콘텐츠학과)/, boost: 40 },
    { queries:['영문','영어영문'], test: /(영어영문학과|국어국문학과|국제통상학과|문화콘텐츠학과)/, boost: 42 },
    { queries:['역사','사학'], test: /(사학과|철학과|문헌정보학과|국어국문학과)/, boost: 42 },
    { queries:['철학'], test: /(철학과|심리학과|사학과|국어국문학과)/, boost: 40 },
    { queries:['문헌','도서관'], test: /(문헌정보학과|국어국문학과|사학과|미디어커뮤니케이션학과)/, boost: 42 },
    { queries:['수학'], test: /(수학과|통계학과|응용통계학과|물리학과|컴퓨터공학과)/, boost: 42 },
    { queries:['물리'], test: /(물리학과|천문우주학과|수학과|전자공학과)/, boost: 42 },
    { queries:['지구과학','지구'], test: /(지구과학과|천문우주학과|환경공학과|에너지공학과)/, boost: 42 },
    { queries:['천문','우주'], test: /(천문우주학과|물리학과|지구과학과|수학과)/, boost: 44 },
    { queries:['통계'], test: /(통계학과|응용통계학과|경제학과|데이터사이언스학과)/, boost: 42 },
    { queries:['체육','스포츠'], test: /(체육학과|스포츠과학과|스포츠산업학과|사회체육학과|레저스포츠학과|스포츠의학과)/, boost: 44 },
    { queries:['레저'], test: /(레저스포츠학과|사회체육학과|스포츠산업학과|체육학과)/, boost: 42 },
    { queries:['운동'], test: /(체육학과|스포츠과학과|스포츠의학과|물리치료학과|사회체육학과)/, boost: 36 },
    { queries:['관광'], test: /(관광경영학과|호텔경영학과|항공서비스학과|외식경영학과|MICE산업학과)/, boost: 44 },
    { queries:['호텔'], test: /(호텔경영학과|관광경영학과|외식경영학과|항공서비스학과)/, boost: 44 },
    { queries:['항공','승무'], test: /(항공서비스학과|항공운항학과|관광경영학과|호텔경영학과)/, boost: 46 },
    { queries:['운항'], test: /(항공운항학과|항공서비스학과|기계공학과|전자공학과)/, boost: 44 },
    { queries:['외식'], test: /(외식경영학과|호텔경영학과|관광경영학과|경영학과)/, boost: 44 },
    { queries:['컨벤션','마이스'], test: /(MICE산업학과|관광경영학과|호텔경영학과|스포츠산업학과)/, boost: 44 },
    { queries:['식품','영양'], test: /(식품영양학과|식품공학과|생명공학과|식품생명공학과|외식경영학과)/, boost: 44 },
    { queries:['동물','축산'], test: /(동물자원학과|식품영양학과|생명공학과|수의예과|수의학과)/, boost: 42 },
    { queries:['원예','식물'], test: /(원예생명과학과|산림자원학과|생명과학과|환경공학과|식품공학과)/, boost: 42 },
    { queries:['산림','임업'], test: /(산림자원학과|원예생명과학과|환경공학과|지구과학과)/, boost: 42 },
    { queries:['농업','농경제'], test: /(농업경제학과|경제학과|식품영양학과|원예생명과학과|동물자원학과)/, boost: 42 },
    { queries:['보건'], test: /(보건관리학|간호학|방사선학|임상병리학|물리치료학|작업치료학|언어치료학|스포츠의학과)/, boost: 34 }
  ];

  const GROUP_META_OVERRIDES = {
    '보건·임상': { id:'clinical_health', label:'환자 진료·검사 쪽', desc:'환자 돌봄, 검사, 영상, 보건관리처럼 의료 현장과 가까운 학과입니다.' },
    '재활·치료': { id:'rehab_therapy', label:'회복 지원·치료 쪽', desc:'기능 회복, 재활, 의사소통 지원처럼 회복을 돕는 학과입니다.' },
    '바이오·생명공학': { id:'bio_engineering', label:'실험·기술 응용 쪽', desc:'생명 현상을 실험과 기술로 연결하는 학과입니다.' },
    '바이오·생명과학': { id:'bio_science', label:'기초 생명과학 쪽', desc:'생명 현상의 원리를 실험과 데이터로 탐구하는 학과입니다.' },
    '바이오소재·의료기기': { id:'bio_materials_devices', label:'의료기기·바이오소재 쪽', desc:'의료기기, 바이오소재, 생체재료처럼 공학과 생명 기술이 만나는 학과입니다.' },
    '화학·에너지·소재': { id:'chem_energy_materials', label:'화학·에너지·소재 쪽', desc:'화학 반응, 공정 설계, 에너지 변환, 소재 응용과 연결된 학과입니다.' },
    '반도체·전자': { id:'materials_devices', label:'반도체·소자 설계 쪽', desc:'재료, 반도체, 회로, 장치 설계와 연결된 학과입니다.' },
    '컴퓨터·AI·데이터': { id:'computing_ai', label:'컴퓨터·AI 쪽', desc:'프로그래밍, 알고리즘, 데이터, 시스템 설계와 연결된 학과입니다.' },
    '심리·상담': { id:'psychology_counsel', label:'마음 이해·상담 쪽', desc:'인지, 정서, 상담 사례를 중심으로 보는 학과입니다.' },
    '교육·아동 발달': { id:'education_child', label:'교육·발달 지원 쪽', desc:'유아, 아동, 학습 발달, 특수교육처럼 성장과 학습 지원을 다루는 학과입니다.' },
    '복지·상담 지원': { id:'welfare_support', label:'복지·상담 지원 쪽', desc:'상담, 복지 제도, 사례 지원처럼 삶의 적응과 회복을 돕는 학과입니다.' },
    '국제·통상': { id:'global_trade', label:'국제 이슈·무역 쪽', desc:'국제 이슈, 무역, 경제 흐름과 연결된 사회계열 학과입니다.' },
    '경제·금융·회계': { id:'econ_finance_accounting', label:'경제·금융·회계 쪽', desc:'시장 구조, 금융 흐름, 회계·재무 해석과 연결된 상경계열 학과입니다.' },
    '디지털경영·정보': { id:'digital_business_info', label:'디지털 경영·정보 쪽', desc:'기업 운영을 정보시스템, 데이터, 디지털 전략과 연결해 다루는 학과입니다.' },
    '경영·서비스': { id:'business_service', label:'기업 운영·서비스 쪽', desc:'기업 운영, 소비자, 관광·호텔 같은 서비스 산업과 연결된 학과입니다.' },
    '관광·호텔·항공 서비스': { id:'tourism_service_aviation', label:'관광·호텔·항공 서비스 쪽', desc:'관광, 호텔, 항공, 외식, 이벤트 운영처럼 고객 경험과 현장 서비스 설계를 다루는 학과입니다.' },
    '행정·정책·법': { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.' },
    '미디어·콘텐츠': { id:'media_content', label:'미디어·콘텐츠 기획 쪽', desc:'미디어, 콘텐츠, 커뮤니케이션처럼 정보 전달과 해석을 다루는 학과입니다.' },
    '인문·어문·문화': { id:'humanities_language_culture', label:'언어·역사·문화 해석 쪽', desc:'언어, 문학, 역사, 철학, 기록과 지식 구조처럼 인간과 문화를 해석하는 학과입니다.' },
    '환경 관련 추천': { id:'environment', label:'환경·도시 시스템 쪽', desc:'기후, 환경, 도시 기반시설과 연결된 학과입니다.' },
    '공간·주거 환경': { id:'space_housing', label:'주거·공간 설계 쪽', desc:'주거, 실내, 공간 설계처럼 생활 공간과 연결된 학과입니다.' },
    '도시·인프라': { id:'city_infra', label:'도시 기반시설 쪽', desc:'도시 구조, 인프라, 건설·토목처럼 생활 기반을 다루는 학과입니다.' },
    '건축·디자인': { id:'architecture_design', label:'건축·디자인 쪽', desc:'건축 설계, 공간 디자인, 제품·시각 디자인처럼 형태와 사용 경험을 다루는 학과입니다.' },
    '공연·영상·예술': { id:'performing_visual_arts', label:'공연·영상·예술 쪽', desc:'공연, 연기, 영화, 방송, 애니메이션, 음악처럼 장면과 감각 표현을 다루는 학과입니다.' },
    '체육·스포츠·레저': { id:'sports_leisure', label:'체육·스포츠·레저 쪽', desc:'운동 수행, 스포츠 과학, 경기 분석, 레저·스포츠 산업처럼 몸의 움직임과 스포츠 현장을 다루는 학과입니다.' },
    '자연과학·수리탐구': { id:'natural_math_stats', label:'자연과학·수리탐구 쪽', desc:'수학, 물리, 지구과학, 우주, 통계처럼 원리 탐구와 데이터 해석을 다루는 학과입니다.' },
    '식품·농업·환경생명': { id:'food_agri_life', label:'식품·농업·환경생명 쪽', desc:'식품, 영양, 농업, 동물, 식물, 산림 자원처럼 먹거리와 생명 환경을 다루는 학과입니다.' },
    '러시아어·문학·지역이해': { id:'russian_language_region', label:'러시아어·문학·지역이해', desc:'러시아어와 러시아권 문학, 문화, 지역 이해를 함께 다루는 학과입니다.' },
    '독일어·문학·문화해석': { id:'german_language_culture', label:'독일어·문학·문화해석', desc:'독일어와 독일권 문학, 문화, 사상을 텍스트 해석으로 배우는 학과입니다.' },
    '프랑스어·문학·문화해석': { id:'french_language_culture', label:'프랑스어·문학·문화해석', desc:'프랑스어와 프랑스권 문학, 문화, 사회를 함께 해석하는 학과입니다.' },
    '일본어·문학·문화해석': { id:'japanese_language_culture', label:'일본어·문학·문화해석', desc:'일본어와 일본 문학, 문화, 사회를 텍스트 해석과 번역으로 배우는 학과입니다.' },
    '중국어·문학·동아시아이해': { id:'chinese_language_eastasia', label:'중국어·문학·동아시아이해', desc:'중국어와 중국권 문학, 문화, 동아시아 맥락을 함께 이해하는 학과입니다.' },
    '아랍어·중동지역이해': { id:'arabic_middleeast', label:'아랍어·중동지역이해', desc:'아랍어와 중동 지역의 문화, 사회, 국제 맥락을 함께 배우는 학과입니다.' }
  };

  function getGroupMetaByLabel(label){
    const key = String(label || '').trim();
    return GROUP_META_OVERRIDES[key] || GROUP_META_OVERRIDES[({
      '환자 진료·검사 쪽':'보건·임상',
      '회복 지원·치료 쪽':'재활·치료',
      '실험·기술 응용 쪽':'바이오·생명공학',
      '기초 생명과학 쪽':'바이오·생명과학',
      '의료기기·바이오소재 쪽':'바이오소재·의료기기',
      '화학·에너지·소재 쪽':'화학·에너지·소재',
      '반도체·소자 설계 쪽':'반도체·전자',
      '컴퓨터·AI 쪽':'컴퓨터·AI·데이터',
      '마음 이해·상담 쪽':'심리·상담',
      '교육·발달 지원 쪽':'교육·아동 발달',
      '복지·상담 지원 쪽':'복지·상담 지원',
      '국제 이슈·무역 쪽':'국제·통상',
      '기업 운영·서비스 쪽':'경영·서비스',
      '관광·호텔·항공 서비스 쪽':'관광·호텔·항공 서비스',
      '행정·정책·법':'행정·정책·법',
      '미디어·콘텐츠 기획 쪽':'미디어·콘텐츠',
      '언어·역사·문화 해석 쪽':'인문·어문·문화',
      '환경·도시 시스템 쪽':'환경 관련 추천',
      '주거·공간 설계 쪽':'공간·주거 환경',
      '도시 기반시설 쪽':'도시·인프라',
      '건축·디자인 쪽':'건축·디자인',
      '공연·영상·예술 쪽':'공연·영상·예술',
      '체육·스포츠·레저 쪽':'체육·스포츠·레저',
      '자연과학·수리탐구 쪽':'자연과학·수리탐구',
      '식품·농업·환경생명 쪽':'식품·농업·환경생명',
      '러시아어·문학·지역이해':'러시아어·문학·지역이해',
      '독일어·문학·문화해석':'독일어·문학·문화해석',
      '프랑스어·문학·문화해석':'프랑스어·문학·문화해석',
      '일본어·문학·문화해석':'일본어·문학·문화해석',
      '중국어·문학·동아시아이해':'중국어·문학·동아시아이해',
      '아랍어·중동지역이해':'아랍어·중동지역이해'
    })[key]] || null;
  }


  function getQueryAllowedGroupIds(rawInput){
    const input = normalize(rawInput || '');
    if (!input) return null;
    if (input.includes('체육') || input.includes('스포츠') || input.includes('레저') || input.includes('운동')) return new Set(['sports_leisure']);
    if (input.includes('보건')) return new Set(['clinical_health','rehab_therapy']);
    if (input.includes('간호') || input.includes('방사선') || input.includes('임상병리') || input.includes('보건관리') || input.includes('안경광학')) return new Set(['clinical_health']);
    if (input.includes('물리치료') || input.includes('작업치료') || input.includes('언어치료') || input.includes('재활')) return new Set(['rehab_therapy']);
    if (input.includes('행정') || input.includes('정치') || input.includes('법') || input.includes('경찰') || input.includes('공공') || input.includes('군사') || input.includes('외교') || input.includes('사회학')) return new Set(['law_public']);
    if (input.includes('관광') || input.includes('호텔') || input.includes('항공') || input.includes('승무') || input.includes('운항') || input.includes('외식') || input.includes('컨벤션') || input.includes('마이스')) return new Set(['tourism_service_aviation']);
    if (input.includes('경영') || input.includes('소비자')) return new Set(['business_service']);
    if (input.includes('경제') || input.includes('통상') || input.includes('무역')) return new Set(['global_trade']);
    if (input.includes('화학') || input.includes('화공') || input.includes('에너지') || input.includes('소재') || input.includes('배터리') || input.includes('이차전지') || input.includes('촉매')) return new Set(['chem_energy_materials','materials_devices','bio_engineering']);
    if (input.includes('바이오') || input.includes('생명') || input.includes('유전') || input.includes('제약') || input.includes('의공') || input.includes('식품생명') || input.includes('화공생명')) return new Set(['bio_engineering','bio_science','bio_materials_devices','chem_energy_materials']);
    if (input.includes('컴퓨터') || input.includes('소프트웨어') || input.includes('인공지능') || input.includes('ai') || input.includes('데이터사이언스') || input.includes('정보보호') || input.includes('보안') || input.includes('산업공학')) return new Set(['computing_ai']);
    if (input.includes('반도체') || input.includes('전자') || input.includes('전기') || input.includes('기계') || input.includes('로봇') || input.includes('자동차') || input.includes('모빌리티')) return new Set(['materials_devices']);
    if (input.includes('러시아') || input.includes('러시아어') || input.includes('노어') || input.includes('노문')) return new Set(['russian_language_region']);
    if (input.includes('독일') || input.includes('독일어') || input.includes('독어') || input.includes('독문')) return new Set(['german_language_culture']);
    if (input.includes('프랑스') || input.includes('프랑스어') || input.includes('불어') || input.includes('불문')) return new Set(['french_language_culture']);
    if (input.includes('일본') || input.includes('일본어') || input.includes('일어') || input.includes('일문')) return new Set(['japanese_language_culture']);
    if (input.includes('중국') || input.includes('중국어') || input.includes('중어') || input.includes('중문')) return new Set(['chinese_language_eastasia']);
    if (input.includes('아랍') || input.includes('중동')) return new Set(['arabic_middleeast']);
    if (input.includes('국제')) return new Set(['global_trade','business_service']);
    if (input.includes('심리') || input.includes('상담')) return new Set(['psychology_counsel','welfare_support']);
    if (input.includes('교육') || input.includes('유아') || input.includes('아동') || input.includes('특수')) return new Set(['education_child','welfare_support']);
    if (input.includes('복지')) return new Set(['welfare_support','education_child']);
    if (input.includes('건축') || input.includes('디자인') || input.includes('실내') || input.includes('인테리어') || input.includes('시각') || input.includes('제품')) return new Set(['architecture_design','space_housing','city_infra','media_content']);
    if (input.includes('국문') || input.includes('문학') || input.includes('영문') || input.includes('영어영문') || input.includes('역사') || input.includes('사학') || input.includes('철학') || input.includes('문헌') || input.includes('도서관') || input.includes('어문')) return new Set(['humanities_language_culture','media_content']);
    if (input.includes('미디어') || input.includes('광고') || input.includes('홍보') || input.includes('언론') || input.includes('방송') || input.includes('콘텐츠') || input.includes('신문')) return new Set(['media_content','humanities_language_culture','performing_visual_arts']);
    if (input.includes('연극') || input.includes('영화') || input.includes('공연') || input.includes('영상') || input.includes('애니') || input.includes('애니메이션') || input.includes('실용음악') || input.includes('음악') || input.includes('뮤지컬')) return new Set(['performing_visual_arts','media_content','architecture_design']);
    if (input.includes('수학') || input.includes('물리') || input.includes('통계') || input.includes('지구과학') || input.includes('지구') || input.includes('천문') || input.includes('우주')) return new Set(['natural_math_stats']);
    if (input.includes('식품') || input.includes('영양') || input.includes('농업') || input.includes('농경제') || input.includes('동물자원') || input.includes('축산') || input.includes('원예') || input.includes('산림') || input.includes('임업') || input.includes('식물')) return new Set(['food_agri_life','bio_science','bio_engineering','chem_energy_materials']);
    if (input.includes('환경') || input.includes('도시') || input.includes('주거') || input.includes('건설') || input.includes('토목') || input.includes('인프라')) return new Set(['environment','space_housing','city_infra','architecture_design']);
    return null;
  }

  function isGroupAllowedForQuery(groupId, rawInput){
    const allowed = getQueryAllowedGroupIds(rawInput);
    return !allowed || allowed.has(groupId);
  }

  const MAJOR_COPY_OVERRIDES = {
    '안경광학과': {
      card: '시각 기능 평가와 렌즈·굴절·광학 기초를 바탕으로 검사 중심 의료 보조를 배우는 학과입니다.',
      fit: '시각 검사, 광학 기초, 렌즈·정밀 측정에 관심 있는 학생에게 잘 맞습니다.',
      intro: '안경광학과는 시각 기능을 이해하고 시력 교정, 렌즈 처방, 검안과 광학 기초를 바탕으로 시기능 관리 방법을 배우는 학과입니다.',
      subjects: ['물리학', '생명과학', '통합과학1', '보건'],
      topics: ['렌즈 굴절 원리가 시력 교정에 적용되는 방식 분석', '시각 기능 검사와 정밀 측정의 중요성 탐구', '생활 습관이 시기능 변화에 미치는 영향 비교'],
      group_label: '보건·임상',
      compare: ['의공학과','방사선학과','임상병리학과']
    },
    '경찰행정학과': {
      card: '치안, 범죄 예방, 수사·행정 체계를 중심으로 배우는 공공안전 계열 학과입니다.',
      fit: '사회 질서, 범죄 예방, 공공안전과 제도 운영에 관심 있는 학생에게 잘 맞습니다.',
      intro: '경찰행정학과는 치안 정책, 범죄 예방, 수사 절차, 경찰 조직과 행정 체계를 배우며 공공안전 문제를 제도적으로 이해하는 학과입니다.',
      subjects: ['통합사회', '정치와 법', '사회와 문화', '공통국어', '영어'],
      topics: ['범죄 예방 정책이 지역사회 안전에 미치는 영향 분석', '경찰 조직과 행정 체계의 역할 비교', '디지털 범죄 대응에서 수사 절차와 공공성 탐구'],
      group_label: '행정·정책·법',
      compare: ['행정학과','정치외교학과','사회학과']
    },
    '행정학과': {
      card: '정부와 공공기관의 제도, 정책, 행정 운영을 중심으로 배우는 학과입니다.',
      fit: '공공 문제를 제도와 정책으로 해결하는 방식에 관심 있는 학생에게 잘 맞습니다.',
      intro: '행정학과는 정부와 공공기관이 사회 문제를 해결하는 과정을 이해하기 위해 정책 설계, 제도 운영, 행정 조직, 공공서비스를 배우는 학과입니다.',
      subjects: ['통합사회', '정치와 법', '사회와 문화', '공통국어', '경제'],
      topics: ['공공정책 설계 과정과 이해관계 조정 방식 분석', '행정 제도가 시민 생활에 미치는 영향 탐구', '지방행정과 중앙행정의 역할 차이 비교'],
      group_label: '행정·정책·법',
      compare: ['경찰행정학과','정치외교학과','사회학과']
    },
    '정치외교학과': {
      card: '정치, 외교, 국제관계, 권력 구조를 중심으로 국내외 공공 문제를 해석하는 학과입니다.',
      fit: '정치 구조와 국가 관계, 외교 전략과 국제 이슈를 넓게 읽고 싶은 학생에게 잘 맞습니다.',
      intro: '정치외교학과는 국내 정치 구조와 국제정치, 외교 전략, 국가 간 관계를 배우며 권력과 제도, 국제 질서를 분석하는 학과입니다.',
      track_category: '정치/외교/국제관계',
      core_keywords: ['정치','외교','국제관계','권력','국가전략','협상'],
      subjects: ['통합사회', '정치와 법', '세계사', '공통국어', '영어'],
      topics: ['국가 간 갈등이 외교 전략에 미치는 영향 분석', '정치 제도 차이가 시민 참여에 미치는 효과 비교', '국제기구와 외교 협상의 역할 탐구'],
      group_label: '행정·정책·법',
      compare_profiles: [
        { display_name: '행정학과', track_category: '사회계열', focus: '정부와 공공기관의 제도, 정책, 행정 운영을 중심으로 배우는 학과입니다.', hint: '외교와 국가 전략보다 공공 제도와 행정 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '법학과', track_category: '법/제도/분쟁해결', focus: '법과 제도, 권리와 책임, 분쟁 해결 원리를 중심으로 배우는 학과입니다.', hint: '정치 구조와 국제 이슈보다 규범과 법 해석에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '사회학과', track_category: '사회/구조/문화', focus: '사회 구조, 집단 행동, 문화와 제도를 바탕으로 사회 현상을 해석하는 학과입니다.', hint: '국가 간 관계보다 사회 구조와 문화 변화를 넓게 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '법학과': {
      card: '법과 제도, 권리와 책임, 분쟁 해결 원리를 중심으로 배우는 학과입니다.',
      fit: '규범과 제도, 권리 판단과 사회 질서를 논리적으로 이해하고 싶은 학생에게 잘 맞습니다.',
      intro: '법학과는 헌법, 민법, 형법 등 사회 질서를 구성하는 법 체계를 배우고 권리와 책임, 분쟁 해결 원리를 해석하는 학과입니다.',
      track_category: '법/제도/분쟁해결',
      core_keywords: ['법체계','판례','권리','책임','분쟁해결','법해석'],
      subjects: ['정치와 법', '통합사회', '공통국어', '사회와 문화', '영어'],
      topics: ['법 체계가 사회 질서 유지에 미치는 영향 분석', '권리와 책임 충돌 사례의 판단 기준 탐구', '형사 절차와 시민 기본권의 관계 비교'],
      group_label: '행정·정책·법',
      compare_profiles: [
        { display_name: '경찰행정학과', track_category: '사회계열', focus: '치안, 범죄 예방, 수사·행정 체계를 중심으로 배우는 공공안전 계열 학과입니다.', hint: '법 해석 자체보다 치안 행정과 범죄 예방 제도에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '행정학과', track_category: '사회계열', focus: '정부와 공공기관의 제도, 정책, 행정 운영을 중심으로 배우는 학과입니다.', hint: '판례와 법 논리보다 공공 정책과 행정 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '사회학과', track_category: '사회/구조/문화', focus: '사회 구조, 집단 행동, 문화와 제도를 바탕으로 사회 현상을 해석하는 학과입니다.', hint: '법 규범과 판례 해석보다 사회 구조와 집단 행동을 넓게 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '공공인재학부': {
      card: '정책, 행정, 공공조직 운영을 폭넓게 배우는 공공문제 해결 중심 학과입니다.',
      fit: '행정·정책·공공기관 진로를 넓게 탐색하고 싶은 학생에게 잘 맞습니다.',
      intro: '공공인재학부는 정책, 행정, 조직 운영, 공공서비스를 폭넓게 배우며 공공영역 진로를 준비하는 학과입니다.',
      subjects: ['통합사회', '정치와 법', '사회와 문화', '공통국어', '경제'],
      topics: ['공공조직 운영이 사회 문제 해결에 미치는 영향 분석', '정책 설계 과정에서 필요한 공공성 기준 탐구', '공공기관 역할을 사례 중심으로 비교'],
      group_label: '행정·정책·법',
      compare: ['행정학과','경찰행정학과','정치외교학과']
    },
    '군사학과': {
      card: '안보, 국방, 전략, 조직 운영을 중심으로 배우는 공공안전·국가안보 계열 학과입니다.',
      fit: '국가안보와 위기 대응, 전략적 판단에 관심 있는 학생에게 잘 맞습니다.',
      intro: '군사학과는 국가안보, 국방 전략, 조직 운영, 위기 대응 체계를 배우며 안보 문제를 제도와 전략 관점에서 이해하는 학과입니다.',
      subjects: ['통합사회', '정치와 법', '세계사', '체육', '영어'],
      topics: ['국가안보 전략이 국제정세 변화에 따라 달라지는 방식 분석', '군 조직 운영과 공공성의 관계 탐구', '위기 대응 체계에서 전략 판단의 중요성 비교'],
      group_label: '행정·정책·법',
      compare: ['경찰행정학과','정치외교학과','사회학과']
    },
    '사회학과': {
      card: '사회 구조, 집단 행동, 문화와 제도를 바탕으로 사회 현상을 해석하는 학과입니다.',
      fit: '개인보다 사회 구조와 집단, 문화 변화가 어떻게 사회 문제를 만드는지 넓게 보고 싶은 학생에게 잘 맞습니다.',
      intro: '사회학과는 계층, 가족, 문화, 미디어, 도시, 조직 같은 사회 구조와 집단 행동을 배우며 사회 현상을 데이터와 이론으로 해석하는 학과입니다.',
      subjects: ['통합사회', '사회와 문화', '정치와 법', '공통국어', '통계와 사회'],
      topics: ['세대와 계층 차이가 소비와 가치관에 미치는 영향 분석', '미디어 환경 변화가 집단 행동과 여론 형성에 주는 효과 비교', '도시화·가족 구조 변화가 사회 제도에 미치는 영향 탐구'],
      group_label: '행정·정책·법',
      search_aliases: ['사회과학과','사회학'],
      compare_profiles: [
        { display_name: '행정학과', track_category: '행정/정책/공공서비스', focus: '정부와 공공기관의 제도와 정책 운영을 중심으로 배우는 학과입니다.', hint: '사회 구조 해석보다 정책 설계와 공공서비스 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '정치외교학과', track_category: '정치/외교/국가관계', focus: '권력 구조와 국가, 외교 전략을 중심으로 국내외 정치 문제를 다루는 학과입니다.', hint: '사회 집단과 문화 변화보다 정치 구조와 외교 이슈에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '사회복지학과', track_category: '복지/사례관리/지역지원', focus: '사회 제도와 지역 자원을 바탕으로 삶의 어려움을 지원하는 학과입니다.', hint: '사회 현상 분석을 넘어서 제도 개선과 현장 지원으로 연결하고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '경영학과': {
      card: '기업 운영과 소비자, 시장 전략을 함께 보는 대표 상경계열 학과입니다.',
      fit: '시장 구조와 소비자 반응, 기업 의사결정을 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '경영학과는 기업의 생산·마케팅·재무·조직 운영을 배우며 소비자와 시장 전략, 기업 의사결정 구조를 함께 이해하는 학과입니다.',
      subjects: ['통합사회', '경제', '공통국어', '영어', '수학'],
      topics: ['브랜드 전략이 소비자 선택에 미치는 영향 분석', '기업 의사결정 과정에서 필요한 정보와 기준 탐구', '시장 변화에 따른 기업 전략 전환 사례 비교'],
      group_label: '경영·서비스',
      compare: ['경영정보학과','글로벌경영학과','관광경영학과']
    },
    '경제학과': {
      card: '시장 원리와 자원 배분, 경제 지표를 데이터와 이론으로 해석하는 학과입니다.',
      fit: '시장 구조와 국제 이슈, 수치와 데이터를 함께 읽고 해석하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '경제학과는 시장 원리와 자원 배분, 소비와 생산, 환율과 무역, 정책 효과를 이론과 데이터로 분석하는 학과입니다.',
      subjects: ['통합사회', '경제', '공통수학1', '영어', '정치와 법'],
      topics: ['환율과 금리 변화가 시장에 미치는 영향 분석', '경제 지표를 활용한 경기 흐름 해석', '국제 무역 구조가 국내 산업에 미치는 효과 비교'],
      group_label: '국제·통상',
      compare: ['국제통상학과','무역학과','응용통계학과']
    },
    '글로벌경영학과': {
      card: '기업 경영을 국제시장과 글로벌 조직, 문화 차이까지 확장해 배우는 학과입니다.',
      fit: '국제 시장과 브랜드, 해외 진출 전략을 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '글로벌경영학과는 기업 경영을 국제시장과 글로벌 조직, 문화 차이의 관점까지 확장해 배우며 해외 진출과 글로벌 브랜드 전략을 함께 이해하는 학과입니다.',
      subjects: ['경제', '통합사회', '국제관계의 이해', '영어', '정보'],
      topics: ['해외 시장 진출 전략이 기업 성과에 미치는 영향 분석', '문화 차이가 글로벌 조직 운영에 미치는 효과 비교', '국제 브랜드 전략과 소비자 반응 탐구'],
      group_label: '국제·통상',
      compare: ['경영학과','국제통상학과','무역학과']
    },
    '경영정보학과': {
      card: '기업 운영을 데이터와 정보시스템 관점에서 해결하는 융합형 상경계열 학과입니다.',
      fit: '기업 문제를 데이터와 디지털 시스템으로 해결하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '경영정보학과는 기업 운영과 의사결정을 정보시스템, 데이터 분석, 디지털 전략 관점에서 배우는 학과입니다.',
      subjects: ['정보', '경제', '통합사회', '공통수학1', '영어'],
      topics: ['정보시스템이 기업 의사결정에 미치는 영향 분석', '데이터 기반 경영 전략 사례 비교', '디지털 전환이 조직 운영 구조를 바꾸는 방식 탐구'],
      group_label: '경영·서비스',
      compare: ['경영학과','응용통계학과','글로벌경영학과']
    },
    '관광경영학과': {
      track_category: '관광/서비스/기획',
      core_keywords: ['관광','여행기획','서비스','지역자원','고객경험','운영'],
      card: '관광 산업 구조와 여행 기획, 지역 자원 운영, 고객 경험 설계를 함께 다루는 학과입니다.',
      fit: '관광 상품 기획과 지역 관광 자원 활용, 서비스 경험 설계에 관심 있는 학생에게 잘 맞습니다.',
      intro: '관광경영학과는 관광 산업 구조와 여행 상품, 지역 관광 자원 운영, 서비스 기획, 고객 경험 설계를 배우는 학과입니다.',
      subjects: ['통합사회', '경제', '영어', '세계시민과 지리', '공통국어'],
      topics: ['관광 동선 설계 차이가 방문객 만족도와 지역 소비에 미치는 영향 분석', '여행 상품 구성 방식이 고객 선택에 주는 효과 비교', '지역 축제와 관광 자원 운영 전략이 재방문율에 미치는 영향 탐구'],
      group_label: '관광·호텔·항공 서비스',
      search_aliases: ['관광학과','관광'],
      compare_profiles: [
        { display_name: '호텔경영학과', track_category: '호텔/서비스/브랜드운영', focus: '숙박 서비스, 브랜드 운영, 고객 응대 프로세스를 중심으로 배우는 학과입니다.', hint: '관광 이동 동선보다 숙박 서비스 현장 운영과 고객 경험 관리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '항공서비스학과', track_category: '항공서비스/승무/고객응대', focus: '항공객실 서비스와 고객 응대, 글로벌 매너와 현장 커뮤니케이션을 배우는 학과입니다.', hint: '여행 상품 기획보다 실제 고객 응대와 서비스 수행에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: 'MICE산업학과', track_category: 'MICE/컨벤션/이벤트기획', focus: '전시·박람회·컨벤션 같은 행사 기획과 운영을 중심으로 배우는 학과입니다.', hint: '관광 일반보다 행사 기획과 운영, 현장 프로그램 설계에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '호텔경영학과': {
      track_category: '호텔/서비스/브랜드운영',
      core_keywords: ['호텔서비스','숙박운영','고객응대','브랜드','객실관리','서비스품질'],
      card: '숙박 서비스 운영, 객실·식음 관리, 브랜드 경험 설계를 함께 다루는 학과입니다.',
      fit: '서비스 현장 운영과 고객 응대, 호텔 브랜드 경험 설계에 관심 있는 학생에게 잘 맞습니다.',
      intro: '호텔경영학과는 호텔과 숙박 산업의 운영, 객실·식음 서비스 관리, 브랜드 전략, 고객 경험 설계를 배우는 학과입니다.',
      subjects: ['경제', '통합사회', '영어', '독서와 작문', '세계시민과 지리'],
      topics: ['객실 운영 기준 차이가 고객 만족과 재방문 의도에 미치는 영향 분석', '브랜드 서비스 매뉴얼이 응대 품질에 주는 효과 비교', '관광 수요 변화가 숙박 서비스 운영 전략을 바꾸는 방식 탐구'],
      group_label: '관광·호텔·항공 서비스',
      search_aliases: ['호텔서비스학과','호텔관광학과','호텔'],
      compare_profiles: [
        { display_name: '관광경영학과', track_category: '관광/서비스/기획', focus: '관광 산업과 여행 상품, 지역 자원 운영을 중심으로 배우는 학과입니다.', hint: '숙박 서비스 현장보다 관광 상품과 지역 자원 기획에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '외식경영학과', track_category: '외식/매장운영/푸드서비스', focus: '외식 브랜드, 메뉴 운영, 매장 서비스 설계를 중심으로 배우는 학과입니다.', hint: '객실 중심 서비스보다 식음 브랜드와 매장 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '항공서비스학과', track_category: '항공서비스/승무/고객응대', focus: '항공객실 서비스와 현장 고객 응대, 글로벌 커뮤니케이션을 배우는 학과입니다.', hint: '숙박 현장보다 이동 서비스 현장과 승객 응대에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '항공서비스학과': {
      track_category: '항공서비스/승무/고객응대',
      core_keywords: ['항공서비스','승무','고객응대','매너','안전서비스','의사소통'],
      card: '항공객실 서비스, 승객 응대, 안전 서비스와 글로벌 커뮤니케이션을 배우는 학과입니다.',
      fit: '현장 고객 응대와 서비스 매너, 언어 소통을 실제 상황에 적용해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '항공서비스학과는 항공객실 서비스, 승객 응대, 안전 서비스, 글로벌 매너와 커뮤니케이션을 배우며 항공 현장 서비스를 준비하는 학과입니다.',
      subjects: ['영어', '공통국어', '통합사회', '사회와 문화', '세계시민과 지리'],
      topics: ['기내 안내 방식 차이가 고객 신뢰와 만족도에 미치는 영향 분석', '서비스 매뉴얼과 돌발 상황 대응 기준 비교', '다국적 고객 응대에서 언어 표현과 비언어 표현의 역할 탐구'],
      group_label: '관광·호텔·항공 서비스',
      search_aliases: ['항공서비스','승무원학과','항공승무원학과','항공승무'],
      compare_profiles: [
        { display_name: '항공운항학과', track_category: '항공운항/비행/항법', focus: '비행 원리와 항법, 운항 시스템, 조종 수행을 중심으로 배우는 학과입니다.', hint: '승객 응대보다 항공기의 운항과 조종 원리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '호텔경영학과', track_category: '호텔/서비스/브랜드운영', focus: '숙박 서비스와 고객 경험, 브랜드 운영을 중심으로 배우는 학과입니다.', hint: '이동 서비스보다 숙박 서비스 현장 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '관광경영학과', track_category: '관광/서비스/기획', focus: '관광 산업 구조와 여행 상품, 지역 자원 운영을 중심으로 배우는 학과입니다.', hint: '현장 응대보다 여행 상품 기획과 관광 서비스 운영에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '항공운항학과': {
      track_category: '항공운항/비행/항법',
      core_keywords: ['항공운항','비행','항법','기상','조종','운항안전'],
      card: '비행 원리, 항법, 기상 판단, 조종 수행과 운항 안전을 중심으로 배우는 학과입니다.',
      fit: '항공기의 비행 원리와 운항 시스템, 기상 판단을 물리와 수학으로 이해하고 싶은 학생에게 잘 맞습니다.',
      intro: '항공운항학과는 항공기의 비행 원리, 항법, 기상 판단, 조종 수행, 운항 안전과 항공 시스템을 배우는 학과입니다.',
      subjects: ['물리학', '공통수학1', '영어', '지구과학', '정보'],
      topics: ['기상 조건 변화가 항로 선택과 운항 안전에 미치는 영향 분석', '양력과 항법 원리가 비행 경로 설계에 주는 효과 비교', '조종 판단과 자동화 시스템의 역할 차이 탐구'],
      group_label: '항공운항·비행시스템',
      search_aliases: ['항공운항','비행학과','항공조종학과','항공조종'],
      compare_profiles: [
        { display_name: '항공서비스학과', track_category: '항공서비스/승무/고객응대', focus: '항공객실 서비스와 승객 응대, 현장 커뮤니케이션을 중심으로 배우는 학과입니다.', hint: '조종과 운항 원리보다 승객 응대와 기내 서비스에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '기계공학과', track_category: '기계/설계/동역학', focus: '기계 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 시스템을 만드는 학과입니다.', hint: '비행 실무보다 운동과 힘, 구조 설계 원리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '전자공학과', track_category: '전자/회로/신호', focus: '회로, 신호, 센서, 임베디드 시스템을 설계하는 학과입니다.', hint: '항법과 조종보다 전자 장치와 센서 시스템 설계에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '외식경영학과': {
      track_category: '외식/매장운영/푸드서비스',
      core_keywords: ['외식경영','메뉴기획','매장운영','서비스','브랜드','원가관리'],
      card: '외식 브랜드 운영, 메뉴 기획, 매장 서비스와 고객 경험 관리를 배우는 학과입니다.',
      fit: '음식 자체보다 외식 브랜드 운영과 매장 서비스, 메뉴 기획에 관심 있는 학생에게 잘 맞습니다.',
      intro: '외식경영학과는 외식 브랜드 운영, 메뉴 기획, 원가 관리, 매장 서비스와 고객 경험 설계를 배우는 학과입니다.',
      subjects: ['경제', '통합사회', '영어', '정보', '가정'],
      topics: ['메뉴 구성 방식이 고객 선택과 매장 회전에 미치는 영향 분석', '매장 동선 설계 차이가 서비스 효율에 주는 효과 비교', '브랜드 콘셉트 변화가 외식 소비 경험에 미치는 영향 탐구'],
      group_label: '관광·호텔·항공 서비스',
      search_aliases: ['외식경영','푸드서비스경영학과','조리서비스경영학과'],
      compare_profiles: [
        { display_name: '호텔경영학과', track_category: '호텔/서비스/브랜드운영', focus: '숙박 서비스와 식음 운영, 브랜드 경험 설계를 중심으로 배우는 학과입니다.', hint: '외식 매장 운영보다 객실·숙박 서비스 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '관광경영학과', track_category: '관광/서비스/기획', focus: '관광 산업 구조와 여행 상품, 지역 자원 운영을 배우는 학과입니다.', hint: '음식 서비스 현장보다 여행 경험과 관광 상품 기획에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경영학과', track_category: '경영/서비스전략', focus: '기업 운영과 소비자, 시장 전략을 폭넓게 다루는 대표 상경계열 학과입니다.', hint: '외식 브랜드 현장보다 기업 운영 전반과 시장 전략에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    'MICE산업학과': {
      track_category: 'MICE/컨벤션/이벤트기획',
      core_keywords: ['MICE','컨벤션','이벤트기획','전시','운영','현장관리'],
      card: '전시·박람회·컨벤션·이벤트의 기획과 운영, 현장 관리 구조를 배우는 학과입니다.',
      fit: '행사 기획과 현장 운영, 프로그램 구성, 방문객 경험 설계에 관심 있는 학생에게 잘 맞습니다.',
      intro: 'MICE산업학과는 전시·박람회·컨벤션·이벤트의 기획, 운영, 홍보, 현장 관리 구조를 배우며 행사 산업을 서비스 관점에서 이해하는 학과입니다.',
      subjects: ['통합사회', '경제', '영어', '정보', '공통국어'],
      topics: ['행사 동선 설계 차이가 방문객 몰입도와 체류 시간에 미치는 영향 분석', '오프라인 이벤트와 온라인 중계 방식의 운영 차이 비교', '브랜드 행사 기획이 참여자 경험을 바꾸는 구조 탐구'],
      group_label: '관광·호텔·항공 서비스',
      search_aliases: ['컨벤션학과','이벤트컨벤션학과','마이스학과','마이스산업학과'],
      compare_profiles: [
        { display_name: '관광경영학과', track_category: '관광/서비스/기획', focus: '관광 산업 구조와 여행 상품, 지역 자원 운영을 배우는 학과입니다.', hint: '행사 현장보다 관광 상품과 지역 관광 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '호텔경영학과', track_category: '호텔/서비스/브랜드운영', focus: '숙박 서비스와 고객 경험, 브랜드 운영을 중심으로 배우는 학과입니다.', hint: '행사 프로그램 운영보다 숙박 서비스 현장 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '스포츠산업학과', track_category: '스포츠산업/마케팅/경영', focus: '스포츠 산업 구조와 이벤트 운영, 구단 비즈니스를 배우는 학과입니다.', hint: '일반 행사 기획보다 스포츠 이벤트 산업과 팬 경험 설계에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '식품공학과': {
      track_category: '식품/가공/품질관리',
      core_keywords: ['식품공학','가공','품질관리','안전성','보존','생산공정'],
      card: '식품 원료를 가공하고 보존하며 품질과 안전성을 관리하는 공정 중심 학과입니다.',
      fit: '음식의 성분 자체보다 식품이 만들어지고 오래 유지되는 공정과 품질 관리에 관심 있는 학생에게 잘 맞습니다.',
      intro: '식품공학과는 식품의 가공, 저장, 발효, 품질관리, 생산 시스템을 배우며 먹거리를 공학적으로 다루는 학과입니다.',
      subjects: ['화학', '생명과학', '공통수학1', '정보', '가정'],
      topics: ['가공 방식 차이가 식품의 저장성과 품질에 미치는 영향 분석', '식품 안전 기준 변화가 생산 공정에 주는 효과 비교', '발효·건조·냉장 기술이 원료 특성을 바꾸는 방식 탐구'],
      group_label: '식품·농업·환경생명',
      search_aliases: ['식품공학', '식품가공학과'],
      compare_profiles: [
        { display_name: '식품영양학과', track_category: '영양/식품/건강관리', focus: '식품의 성분과 조리, 영양 설계, 건강 증진과 식생활 관리의 관계를 함께 배우는 학과입니다.', hint: '생산 공정보다 사람의 식생활과 영양 관리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '화학공학과', track_category: '화학공정/소재/생산', focus: '화학 반응, 분리 공정, 생산 시스템을 바탕으로 소재·에너지·생산 시스템을 다루는 학과입니다.', hint: '먹거리보다 더 넓은 공정 설계와 생산 시스템에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의약·식품·환경 기술로 연결하는 학과입니다.', hint: '가공 공정보다 생명 현상을 기술로 확장해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '동물자원학과': {
      track_category: '동물/자원/생산관리',
      core_keywords: ['동물자원','축산','사육관리','생산','복지','유전개량'],
      card: '가축과 동물 자원의 사육, 생산, 복지와 유전 개량 구조를 배우는 학과입니다.',
      fit: '동물의 성장과 생산 관리, 자원 활용을 현장과 데이터 관점에서 보고 싶은 학생에게 잘 맞습니다.',
      intro: '동물자원학과는 가축과 동물 자원의 성장, 사육, 생산성, 복지, 유전 개량, 자원 활용 구조를 배우는 학과입니다.',
      subjects: ['생명과학', '화학', '정보', '공통수학1', '통합사회'],
      topics: ['사육 환경 차이가 동물 건강과 생산성에 미치는 영향 분석', '동물 복지 기준 변화가 생산 관리 방식에 주는 효과 비교', '유전 개량과 사료 관리가 축산 자원 활용에 미치는 영향 탐구'],
      group_label: '식품·농업·환경생명',
      search_aliases: ['동물자원', '축산학과', '동물생명자원학과'],
      compare_profiles: [
        { display_name: '원예생명과학과', track_category: '원예/식물/생명응용', focus: '식물과 작물의 생장, 재배 환경, 원예 기술과 생명 응용을 배우는 학과입니다.', hint: '동물 자원보다 식물·작물 생장과 재배 관리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '산림자원학과', track_category: '산림/자원/생태관리', focus: '숲과 산림 생태, 자원 관리, 복원과 임업 활용 구조를 배우는 학과입니다.', hint: '축산 현장보다 넓은 생태·자원 관리 관점에서 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의약·식품·환경 기술로 연결하는 학과입니다.', hint: '사육 관리보다 생명 기술과 실험 응용에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '원예생명과학과': {
      track_category: '원예/식물/생명응용',
      core_keywords: ['원예','식물','재배','생장환경','품종','생명응용'],
      card: '식물과 작물의 생장, 재배 환경, 품종과 원예 기술을 배우는 식물 중심 학과입니다.',
      fit: '식물의 생장과 재배 환경을 관찰하고 원예 기술을 생활·산업과 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '원예생명과학과는 식물과 작물의 생장 원리, 재배 환경, 품종 개량, 원예 기술과 생명 응용을 함께 배우는 학과입니다.',
      subjects: ['생명과학', '화학', '정보', '가정', '공통수학1'],
      topics: ['재배 환경 차이가 식물 생장 속도와 품질에 미치는 영향 분석', '품종 차이가 저장성·상품성에 주는 효과 비교', '원예 기술이 생활 환경과 식품 생산에 연결되는 방식 탐구'],
      group_label: '식품·농업·환경생명',
      search_aliases: ['원예생명', '원예학과', '원예과학과', '식물자원학과'],
      compare_profiles: [
        { display_name: '산림자원학과', track_category: '산림/자원/생태관리', focus: '산림 생태와 자원 관리, 복원, 임업 활용 구조를 배우는 학과입니다.', hint: '원예 작물보다 숲과 산림 자원 전체의 관리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '동물자원학과', track_category: '동물/자원/생산관리', focus: '가축과 동물 자원의 사육, 생산, 복지와 유전 개량 구조를 배우는 학과입니다.', hint: '식물보다 동물 자원과 생산 관리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '생명과학과', track_category: '세포/유전/생명탐구', focus: '세포, 유전, 진화, 생태 같은 생명 현상의 원리를 이론과 실험으로 탐구하는 기초과학 중심 학과입니다.', hint: '재배 기술보다 생명 현상의 원리와 생태를 넓게 탐구하고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '산림자원학과': {
      track_category: '산림/자원/생태관리',
      core_keywords: ['산림자원','생태','복원','임업','환경관리','자원순환'],
      card: '숲과 산림 생태, 자원 관리, 복원과 임업 활용 구조를 배우는 학과입니다.',
      fit: '산림 생태계와 자원 보전, 복원, 인간 이용의 균형을 현장과 데이터로 보고 싶은 학생에게 잘 맞습니다.',
      intro: '산림자원학과는 산림 생태, 토양, 수자원, 복원, 임업, 자원 순환과 같은 숲 환경 전반의 관리 구조를 배우는 학과입니다.',
      subjects: ['생명과학', '지구과학', '정보', '통합사회', '공통수학1'],
      topics: ['산림 복원 방식 차이가 생태 다양성과 토양 안정성에 미치는 영향 분석', '인간 이용과 산림 보전 기준이 자원 순환에 주는 효과 비교', '기후 변화가 산림 자원 관리 전략을 바꾸는 방식 탐구'],
      group_label: '식품·농업·환경생명',
      search_aliases: ['산림자원', '산림학과', '임학과'],
      compare_profiles: [
        { display_name: '원예생명과학과', track_category: '원예/식물/생명응용', focus: '식물과 작물의 생장, 재배 환경, 원예 기술과 생명 응용을 배우는 학과입니다.', hint: '숲 전체보다 재배 가능한 작물과 식물 생장에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '지구환경과학과', track_category: '환경/기후/지구시스템', focus: '기후, 대기, 지질, 해양, 수문 등 지구 시스템의 변화를 관측 자료와 과학적 모델로 분석하는 학과입니다.', hint: '산림 관리보다 기후와 지구 환경 변화를 넓게 분석하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '환경공학과', track_category: '건설/환경/인프라', focus: '수질·대기·폐기물 같은 환경 문제를 공학적으로 해결하는 학과입니다.', hint: '생태 관리보다 환경 문제의 기술적 해결에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '농업경제학과': {
      track_category: '농업/경제/유통정책',
      core_keywords: ['농업경제','유통','정책','시장','자원관리','지역경제'],
      card: '농산물 시장, 유통 구조, 농업 정책과 지역 경제의 관계를 배우는 학과입니다.',
      fit: '먹거리 생산 그 자체보다 농업이 시장과 지역 사회에서 어떻게 운영되는지 궁금한 학생에게 잘 맞습니다.',
      intro: '농업경제학과는 농산물 생산과 유통, 농업 정책, 지역 경제, 자원 관리와 시장 구조의 관계를 배우는 학과입니다.',
      subjects: ['경제', '통합사회', '사회와 문화', '정보', '공통수학1'],
      topics: ['유통 구조 차이가 농산물 가격과 지역 경제에 미치는 영향 분석', '농업 지원 정책 변화가 생산 구조에 주는 효과 비교', '지역 자원과 먹거리 소비 구조가 농업 시장을 바꾸는 방식 탐구'],
      group_label: '식품·농업·환경생명',
      search_aliases: ['농업경제', '농경제학과', '농업경제'],
      compare_profiles: [
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장 원리와 정책 효과를 이론과 데이터로 해석하는 학과입니다.', hint: '농업 현장보다 시장 구조와 정책 효과를 넓게 분석하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '국제통상학과', track_category: '국제통상/무역/글로벌시장', focus: '수출입 구조와 무역, 통상 정책, 글로벌 시장 흐름을 함께 배우는 학과입니다.', hint: '지역 농업보다 국제 거래와 무역 구조에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '식품공학과', track_category: '식품/가공/품질관리', focus: '식품 원료를 가공하고 보존하며 품질과 안전성을 관리하는 공정 중심 학과입니다.', hint: '시장 구조보다 식품 생산 공정과 품질 관리에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },

    '소비자학과': {
      card: '소비자의 선택과 행동, 생활 방식, 권리와 복지를 함께 다루는 학과입니다.',
      fit: '시장과 소비자 반응, 생활 문제를 행동과 제도 관점에서 보고 싶은 학생에게 잘 맞습니다.',
      intro: '소비자학과는 소비자의 선택과 행동, 생활 방식, 소비자 권리와 기업 책임을 함께 배우는 학과입니다.',
      subjects: ['경제', '사회와 문화', '통합사회', '독서와 작문', '공통수학1'],
      topics: ['소비자 행동이 시장 전략에 미치는 영향 분석', '소비자 권리와 기업 책임의 관계 탐구', '생활 방식 변화가 소비 패턴에 주는 효과 비교'],
      group_label: '경영·서비스',
      compare: ['경영학과','호텔경영학과','경영정보학과']
    },
    '무역학과': {
      card: '국가 간 상품과 서비스 거래, 수출입 구조와 무역 실무를 배우는 학과입니다.',
      fit: '국제 거래 흐름과 물류, 수출입 구조를 현실 문제와 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '무역학과는 국가 간 상품과 서비스 거래, 수출입 구조, 물류, 관세와 계약 같은 무역 실무를 배우는 학과입니다.',
      subjects: ['경제', '통합사회', '국제관계의 이해', '영어', '정보'],
      topics: ['수출입 구조가 산업에 미치는 영향 분석', '관세와 국제 분쟁이 무역에 주는 효과 비교', '물류 흐름과 거래 구조의 관계 탐구'],
      group_label: '국제·통상',
      compare: ['국제통상학과','글로벌경영학과','경제학과']
    },
    '보건관리학과': {
      track_category: '보건/예방/관리',
      card: '질병 예방, 건강 증진, 보건 정책과 의료행정을 데이터와 함께 다루는 학과입니다.',
      fit: '의료 현장을 직접 처치하기보다 예방과 제도, 지역사회 건강 관리에 관심 있는 학생에게 잘 맞습니다.',
      intro: '보건관리학과는 지역사회 건강 문제를 줄이기 위해 질병 예방, 건강 증진, 보건 정책, 의료행정, 건강 통계를 함께 배우는 학과입니다.',
      subjects: ['통합사회', '사회와 문화', '정보', '공통수학1', '보건'],
      topics: ['지역별 건강지표 차이와 공공보건 서비스 개선안 비교', '감염병 예방 정책이 지역사회 건강 관리에 미치는 영향 분석', '건강검진 데이터로 생활습관과 만성질환 위험 요인 해석'],
      group_label: '보건·예방·관리',
      compare: ['식품영양학과','간호학과','임상병리학과'],
      compare_profiles: [
        { display_name: '식품영양학과', track_category: '영양/식품/건강관리', focus: '식품과 영양, 건강 관리의 관계를 생활과 예방 관점에서 다루는 학과입니다.', hint: '생활 습관과 영양 관리가 건강에 어떤 영향을 주는지 궁금한 학생에게 잘 맞습니다.' },
        { display_name: '간호학과', track_category: '메디컬/보건 계열', focus: '환자 상태를 지속적으로 관찰하고 직접 간호를 수행하는 임상 실천 중심 학과입니다.', hint: '사람을 직접 돌보며 변화하는 상태를 빠르게 판단하고 대응하는 일에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '임상병리학과', track_category: '메디컬/보건 계열', focus: '혈액·조직·체액 검사를 통해 질병 원인을 찾고 진단을 돕는 검사 중심 학과입니다.', hint: '검진 데이터와 검사 결과를 바탕으로 건강 문제를 해석하는 과정에 흥미가 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '간호학과': {
      card: '환자 상태를 지속적으로 관찰하고 직접 간호를 수행하는 임상 실천 중심 학과입니다.',
      fit: '사람을 직접 돌보며 변화하는 상태를 빠르게 판단하고 대응하는 일에 관심 있는 학생에게 잘 맞습니다.',
      intro: '간호학과는 환자의 건강 상태를 사정하고 회복을 돕기 위해 기본간호, 건강사정, 임상판단, 감염관리, 의사소통을 배우는 학과입니다.',
      subjects: ['보건', '생명과학', '화학', '통합과학1', '공통수학1'],
      topics: ['환자 안전을 높이는 간호 의사소통과 팀 협력 방식 분석', '고령사회 만성질환 관리에서 간호의 역할과 한계 탐구', '병원 감염관리 기본 원칙이 임상 현장에 적용되는 구조 분석'],
      group_label: '보건·임상',
      compare: ['임상병리학과','방사선학과','물리치료학과']
    },
    '방사선학과': {
      card: '의료영상 장비를 다루며 촬영 기술과 영상 품질, 방사선 안전관리를 배우는 학과입니다.',
      fit: '정밀 장비 조작, 영상 판독 보조, 물리 기반 의료기술에 관심 있는 학생에게 잘 맞습니다.',
      intro: '방사선학과는 X선, CT, MRI, 초음파 같은 의료영상 장비의 원리와 촬영 기술, 영상 품질 관리, 방사선 안전관리를 배우는 학과입니다.',
      subjects: ['보건', '물리학', '생명과학', '공통수학1', '정보'],
      topics: ['의료영상 장비별 원리와 활용 분야 비교', '영상 품질과 환자 피폭량 사이의 균형 분석', '방사선 안전관리 기준이 촬영 실무에서 필요한 이유 탐구'],
      group_label: '보건·임상',
      compare: ['임상병리학과','간호학과','의공학과'],
      compare_profiles: [
        { display_name: '임상병리학과', track_category: '메디컬/보건 계열', focus: '혈액·조직·체액 검사를 통해 질병 원인을 찾고 진단을 돕는 검사 중심 학과입니다.', hint: '실험 과정과 검사 데이터를 바탕으로 질병의 원인을 정밀하게 해석하는 일에 흥미가 있는 학생에게 잘 맞습니다.' },
        { display_name: '간호학과', track_category: '메디컬/보건 계열', focus: '환자 상태를 지속적으로 관찰하고 직접 간호를 수행하는 임상 실천 중심 학과입니다.', hint: '사람을 직접 돌보며 변화하는 상태를 빠르게 판단하고 대응하는 일에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '의공학과', track_category: '의료기기/생체신호/공학융합', focus: '의료기기와 생체신호를 공학적으로 분석하고 설계하는 학과입니다.', hint: '공학 기술을 의료기기와 생체신호 분석에 연결해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '임상병리학과': {
      card: '혈액·조직·체액 검사를 통해 질병 원인을 찾고 진단을 돕는 검사 중심 학과입니다.',
      fit: '실험 과정과 검사 데이터를 바탕으로 질병의 원인을 정밀하게 해석하는 일에 흥미가 있는 학생에게 잘 맞습니다.',
      intro: '임상병리학과는 혈액, 조직, 체액 같은 생체 시료를 분석해 질병의 원인을 찾고 진단과 치료 방향 판단을 돕는 검사 중심 학과입니다.',
      subjects: ['보건', '생명과학', '화학', '정보', '공통수학1'],
      topics: ['혈액검사 수치 변화로 추정할 수 있는 질환 사례 분석', '미생물 검사와 감염병 진단 과정에서 필요한 표본 처리 이해', '정확한 검사 결과를 위한 품질관리 기준과 오류 요인 탐구'],
      group_label: '보건·임상',
      compare: ['방사선학과','간호학과','보건관리학과']
    },
    '물리치료학과': {
      card: '움직임 평가와 재활 운동을 통해 신체 기능 회복을 돕는 학과입니다.',
      fit: '근육·관절·신경계 움직임을 분석하고 운동을 통한 회복 지원에 관심 있는 학생에게 잘 맞습니다.',
      intro: '물리치료학과는 근골격계와 신경계 기능을 이해하고 운동치료, 재활치료, 기능평가를 통해 통증 완화와 움직임 회복을 돕는 학과입니다.',
      subjects: ['보건', '생명과학', '물리학', '운동과 건강', '공통수학1'],
      topics: ['근골격계 손상 후 재활 단계별 목표와 평가 요소 비교', '자세 불균형이 통증과 움직임 효율에 미치는 영향 탐구', '운동치료 프로그램이 기능 회복에 기여하는 원리 분석'],
      group_label: '재활·치료',
      compare: ['작업치료학과','간호학과','언어치료학과']
    },
    '작업치료학과': {
      card: '일상생활·학습·직업 활동 복귀를 돕는 활동 훈련 중심 재활 학과입니다.',
      fit: '신체 기능뿐 아니라 인지와 생활 적응까지 사람 중심으로 회복을 돕고 싶은 학생에게 잘 맞습니다.',
      intro: '작업치료학과는 환자가 일상생활, 학습, 놀이, 직업 활동에 다시 참여할 수 있도록 기능 회복과 활동 훈련을 설계하는 학과입니다.',
      subjects: ['보건', '생명과학', '심리', '정보', '통합과학1'],
      topics: ['일상생활 동작 평가와 재활 계획 수립 사례 분석', '인지 기능 변화가 작업 수행과 자립도에 미치는 영향 탐구', '재활 보조도구가 환자 참여 수준 향상에 주는 효과 비교'],
      group_label: '재활·치료',
      compare: ['물리치료학과','언어치료학과','재활상담학과'],
      compare_profiles: [
        { display_name: '물리치료학과', track_category: '메디컬/보건 계열', focus: '움직임 평가와 재활 운동을 통해 신체 기능 회복을 돕는 학과입니다.', hint: '근육·관절·신경계 움직임을 분석하고 운동을 통한 회복 지원에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '언어치료학과', track_category: '메디컬/보건 계열', focus: '말·언어·의사소통의 어려움을 평가하고 중재하는 의사소통 재활 학과입니다.', hint: '언어 발달과 발음, 의사소통 지원을 성장과 회복 관점에서 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '재활상담학과', track_category: '재활/상담/지원', focus: '질환이나 장애 이후의 학교·직업·사회 복귀를 상담과 지원 관점에서 다루는 학과입니다.', hint: '회복 이후의 적응과 복귀, 상담 지원 체계에 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '언어치료학과': {
      card: '말·언어·의사소통의 어려움을 평가하고 중재하는 의사소통 재활 학과입니다.',
      fit: '언어 발달과 발음, 의사소통 지원을 사람의 성장과 회복 관점에서 보고 싶은 학생에게 잘 맞습니다.',
      intro: '언어치료학과는 발음, 언어 발달, 의사소통 장애를 평가하고 훈련 프로그램을 설계해 의사소통 기능 회복을 돕는 학과입니다.',
      subjects: ['공통국어', '심리', '보건', '생명과학', '정보'],
      topics: ['언어 발달 지연 사례에서 필요한 평가 요소 분석', '의사소통 장애 유형별 중재 방법과 효과 비교', '뇌 손상과 언어 기능 저하의 관계를 사례 중심으로 탐구'],
      group_label: '재활·치료',
      compare: ['작업치료학과','물리치료학과','재활상담학과'],
      compare_profiles: [
        { display_name: '작업치료학과', track_category: '메디컬/보건 계열', focus: '일상생활·학습·직업 활동 복귀를 돕는 활동 훈련 중심 재활 학과입니다.', hint: '신체 기능뿐 아니라 인지와 생활 적응까지 사람 중심으로 회복을 돕고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '물리치료학과', track_category: '메디컬/보건 계열', focus: '움직임 평가와 재활 운동을 통해 신체 기능 회복을 돕는 학과입니다.', hint: '근육·관절·신경계 움직임을 분석하고 운동을 통한 회복 지원에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '재활상담학과', track_category: '재활/상담/지원', focus: '질환이나 장애 이후의 학교·직업·사회 복귀를 상담과 지원 관점에서 다루는 학과입니다.', hint: '회복 이후의 적응과 복귀, 상담 지원 체계에 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '의공학과': {
      card: '의료기기, 바이오센서, 생체신호 기술을 공학적으로 설계하고 분석하는 학과입니다.',
      fit: '공학을 의료 장비·센서·생체신호 해석에 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '의공학과는 의료기기, 바이오센서, 의료영상, 생체신호 처리 기술을 바탕으로 진단과 치료 현장의 문제를 공학적으로 해결하는 학과입니다.',
      subjects: ['물리학', '정보', '생명과학', '화학', '공통수학1'],
      topics: ['웨어러블 의료기기의 측정 원리와 정확도 한계 분석', '심전도·근전도 같은 생체신호 데이터가 질환 판별에 활용되는 방식 탐구', '의료영상 장비 성능을 높이는 공학적 설계 요소 분석'],
      group_label: '의료기기·생체신호',
      track_category: '의료기기/생체신호/공학융합',
      compare_profiles: [
        { display_name: '방사선학과', track_category: '메디컬/보건 계열', focus: 'X선, CT, MRI 같은 의료영상 장비를 다루며 촬영 기술과 영상 품질, 방사선 안전관리를 배우는 학과입니다.', hint: '영상 장비를 실제 의료 현장에서 어떻게 활용하는지 궁금한 학생에게 잘 맞습니다.' },
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의료·식품·환경 기술로 연결하는 학과입니다.', hint: '생명 현상을 실험과 기술로 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '제약공학과', track_category: '제약/약물전달/생산공정', focus: '의약품의 개발·생산·품질 관리를 공정 관점에서 다루는 학과입니다.', hint: '약물 개발과 생산 공정이 어떻게 연결되는지 궁금한 학생에게 잘 맞습니다.' }
      ]
    },
    '제약공학과': {
      card: '의약품의 제형 설계, 약물전달, 생산 공정, 품질 관리를 공학적으로 다루는 학과입니다.',
      fit: '신약이 실제 약으로 생산되고 관리되는 과정에 관심 있는 학생에게 잘 맞습니다.',
      intro: '제약공학과는 신약 후보 물질이 실제 의약품으로 만들어지는 과정에서 필요한 제형 설계, 약물전달, 생산 공정, 품질관리를 공학적으로 배우는 학과입니다.',
      subjects: ['화학', '생명과학', '공통수학1', '정보', '통합과학1'],
      topics: ['약물전달 시스템이 약효와 부작용에 미치는 영향 비교', '바이오의약품 생산 공정에서 품질관리 기준이 중요한 이유 탐구', '친환경 제약 생산 공정 설계 아이디어 분석'],
      group_label: '제약·약물전달',
      track_category: '제약/약물전달/생산공정',
      compare_profiles: [
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의료·식품·환경 기술로 연결하는 학과입니다.', hint: '생명 현상을 실험과 기술로 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '화공생명공학과', track_category: '화학공정/바이오생산/소재', focus: '화학공정과 생명기술을 함께 다루며 의약·소재·에너지 응용으로 이어지는 학과입니다.', hint: '화학과 생명기술을 산업 공정으로 연결하는 데 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '생명과학과', track_category: '세포/유전/생명탐구', focus: '세포, 유전, 진화, 생태 같은 생명 현상의 원리를 이론과 실험으로 탐구하는 기초과학 중심 학과입니다.', hint: '의약품 개발의 출발이 되는 생명 원리를 깊게 이해해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '생명공학과': {
      card: '세포·유전자·미생물을 활용해 의약, 식품, 환경 기술로 연결하는 응용 중심 학과입니다.',
      fit: '생명 현상을 실험으로 확인하고 기술로 확장해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '생명공학과는 세포, 유전자, 단백질, 미생물 같은 생명 시스템을 이해하고 이를 의약, 식품, 환경, 산업 기술로 연결하는 응용 중심 학과입니다.',
      subjects: ['생명과학', '화학', '정보', '공통수학1', '통합과학1'],
      topics: ['유전자 편집 기술의 가능성과 윤리 문제를 함께 탐구', '미생물 활용 기술이 식품·환경 산업에 미치는 영향 분석', '세포 배양 기술이 의료 연구와 바이오산업에 활용되는 방식 비교'],
      group_label: '유전자·세포 응용',
      track_category: '유전자/세포/바이오기술',
      compare_profiles: [
        { display_name: '생명과학과', track_category: '세포/유전/생명탐구', focus: '생명 현상의 원리를 실험과 데이터로 탐구하는 기초과학 중심 학과입니다.', hint: '생명 현상 자체의 원리를 깊게 파고드는 탐구에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '제약공학과', track_category: '제약/약물전달/생산공정', focus: '의약품의 제형 설계, 약물전달, 생산 공정, 품질 관리를 공학적으로 다루는 학과입니다.', hint: '생명과학을 약물 개발과 생산 문제로 확장해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '화공생명공학과', track_category: '화학공정/바이오생산/소재', focus: '화학공정과 생명기술을 함께 다루며 의약·소재·에너지 응용으로 이어지는 학과입니다.', hint: '생명기술을 대규모 생산 공정과 연결하고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '생명과학과': {
      card: '세포, 유전, 진화, 생태 같은 생명 현상의 원리를 실험과 데이터로 탐구하는 학과입니다.',
      fit: '응용보다 생명 현상 자체의 원리를 깊게 탐구해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '생명과학과는 세포, 유전, 진화, 생태 같은 생명 현상의 원리를 이론과 실험으로 탐구하는 기초과학 중심 학과입니다.',
      subjects: ['생명과학', '화학', '공통수학1', '정보', '통합과학1'],
      topics: ['유전 정보 발현 과정이 생명체 기능에 미치는 영향 탐구', '생태계 변화와 생물다양성 감소 원인 분석', '효소 활성과 세포 대사 조건을 실험 설계로 비교'],
      group_label: '기초생명 탐구',
      track_category: '세포/유전/생명탐구',
      compare_profiles: [
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의약, 식품, 환경 기술로 연결하는 응용 중심 학과입니다.', hint: '생명 현상을 기술과 산업으로 확장해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '식품생명공학과', track_category: '식품/발효/기능성소재', focus: '식품과 생명과학을 바탕으로 안전성, 가공, 기능성 소재를 연구하는 학과입니다.', hint: '생명과학을 식품 산업과 건강 문제에 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '제약공학과', track_category: '제약/약물전달/생산공정', focus: '의약품의 제형 설계, 약물전달, 생산 공정, 품질 관리를 공학적으로 다루는 학과입니다.', hint: '생명과학을 약물 개발과 생산 문제로 확장해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '식품생명공학과': {
      card: '식품과 생명과학을 바탕으로 안전성, 발효, 기능성 소재를 연구하는 학과입니다.',
      fit: '생명과학을 식품 산업과 건강 문제에 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '식품생명공학과는 식품의 제조, 가공, 안전성, 영양, 발효, 기능성 소재를 생명과학과 공학 관점에서 함께 다루는 학과입니다.',
      subjects: ['생명과학', '화학', '정보', '공통수학1', '통합과학1'],
      topics: ['기능성 식품의 원리와 건강 효과를 비교해 보는 탐구', '푸드테크가 식품 산업과 소비 방식에 미치는 영향 분석', '발효 공정이 식품 품질과 안전성에 미치는 효과 탐구'],
      group_label: '바이오·생명공학',
      track_category: '식품/발효/기능성소재',
      compare_profiles: [
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의약, 식품, 환경 기술로 연결하는 응용 중심 학과입니다.', hint: '생명 현상을 실험과 기술로 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '식품영양학과', track_category: '영양/식품/건강관리', focus: '식품의 성분과 조리, 영양 설계, 건강 증진과 식생활 관리의 관계를 함께 배우는 학과입니다.', hint: '식품과 영양이 건강에 어떤 영향을 주는지 궁금한 학생에게 잘 맞습니다.' },
        { display_name: '화공생명공학과', track_category: '화학공정/바이오생산/소재', focus: '화학공정과 생명기술을 함께 다루며 의약·소재·에너지 응용으로 이어지는 학과입니다.', hint: '식품 생산을 공정 설계와 대규모 생산 관점으로 확장해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '화공생명공학과': {
      card: '화학공정과 생명기술을 결합해 의약품, 식품, 소재 생산 과정을 설계하는 학과입니다.',
      fit: '화학과 생명기술을 산업 공정과 대규모 생산으로 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '화공생명공학과는 화학공정과 생명공학을 결합해 의약품, 식품, 에너지, 소재 생산 과정을 설계하는 융합 학과입니다.',
      subjects: ['화학', '생명과학', '공통수학1', '정보', '통합과학1'],
      topics: ['바이오 공정과 화학 공정의 차이를 생산 관점에서 비교', '의약품 생산 공정에서 중요한 설계 요소 탐구', '생명공학 기술이 화학 산업과 소재 개발에 미치는 영향 분석'],
      group_label: '바이오·생명공학',
      track_category: '화학공정/바이오생산/소재',
      compare_profiles: [
        { display_name: '생명공학과', track_category: '유전자/세포/바이오기술', focus: '세포·유전자·미생물을 활용해 의약, 식품, 환경 기술로 연결하는 응용 중심 학과입니다.', hint: '생명 현상을 실험과 기술로 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '제약공학과', track_category: '제약/약물전달/생산공정', focus: '의약품의 제형 설계, 약물전달, 생산 공정, 품질 관리를 공학적으로 다루는 학과입니다.', hint: '생산 공정을 의약품 개발과 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '신소재공학과', track_category: '반도체/소재/재료설계', focus: '금속, 세라믹, 고분자, 반도체 소재의 구조와 성질을 설계하는 학과입니다.', hint: '생산 공정이 새로운 소재의 성능과 연결되는 방식에 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },

    '컴퓨터공학과': {
      card: '컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.',
      fit: '프로그램이 어떻게 돌아가는지, 하드웨어와 소프트웨어가 만나는 구조에 관심 있는 학생에게 잘 맞습니다.',
      intro: '컴퓨터공학과는 컴퓨터 구조, 운영체제, 네트워크, 알고리즘, 데이터베이스를 배우며 다양한 디지털 시스템이 안정적으로 동작하도록 설계하는 학과입니다.',
      subjects: ['정보', '공통수학1', '물리학', '영어', '통합과학1'],
      topics: ['알고리즘 효율 차이가 프로그램 실행 속도에 미치는 영향 분석', '운영체제의 자원 관리 방식이 시스템 성능에 주는 효과 비교', '네트워크 구조 변화가 데이터 전송 안정성에 미치는 영향 탐구'],
      group_label: '컴퓨터·AI·데이터',
      track_category: '컴퓨터/시스템/개발',
      core_keywords: ['컴퓨터공학','알고리즘','시스템','운영체제','네트워크','개발'],
      recommended_keywords: ['정보','공통수학1','물리학','영어','통합과학1'],
      compare_profiles: [
        { display_name: '소프트웨어학과', track_category: '소프트웨어/개발/서비스', focus: '서비스를 실제로 구현하는 프로그래밍, 앱·웹 개발, 협업 중심 개발 과정을 배우는 학과입니다.', hint: '사용자가 직접 쓰는 프로그램과 서비스를 만드는 일에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '인공지능학과', track_category: 'AI/데이터/모델링', focus: '데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.', hint: '수학과 데이터를 활용해 스스로 판단하는 시스템을 만들고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '정보보호학과', track_category: '보안/암호/시스템', focus: '해킹 대응, 암호, 인증, 시스템 보안을 통해 디지털 환경을 안전하게 지키는 학과입니다.', hint: '시스템을 만드는 것뿐 아니라 공격과 방어 구조까지 함께 이해하고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '소프트웨어학과': {
      card: '앱, 웹, 서비스 개발을 중심으로 실제 사용자를 위한 프로그램을 만드는 학과입니다.',
      fit: '프로그래밍으로 문제를 해결하고 사용자 경험이 좋은 서비스를 직접 구현해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '소프트웨어학과는 프로그래밍, 자료구조, 데이터베이스, 웹·앱 개발, 협업 개발 방식을 배우며 실제 서비스 구현 역량을 키우는 학과입니다.',
      subjects: ['정보', '공통수학1', '영어', '통합과학1', '통합사회'],
      topics: ['앱 기능 설계가 사용자 경험에 미치는 영향 분석', '데이터베이스 구조가 서비스 속도와 안정성에 주는 효과 비교', '협업 개발 과정에서 버전 관리가 필요한 이유 탐구'],
      group_label: '컴퓨터·AI·데이터',
      track_category: '소프트웨어/개발/서비스',
      core_keywords: ['소프트웨어','프로그래밍','서비스','앱개발','웹개발','구현'],
      recommended_keywords: ['정보','공통수학1','영어','통합과학1','통합사회'],
      compare_profiles: [
        { display_name: '컴퓨터공학과', track_category: '컴퓨터/시스템/개발', focus: '컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.', hint: '프로그램이 돌아가는 바탕 구조와 시스템 자체에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '인공지능학과', track_category: 'AI/데이터/모델링', focus: '데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.', hint: '서비스에 AI 기능을 넣거나 데이터를 바탕으로 자동화하는 일에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '데이터사이언스학과', track_category: '데이터/통계/AI응용', focus: '데이터 수집, 정제, 분석, 시각화를 바탕으로 의미 있는 의사결정을 돕는 학과입니다.', hint: '프로그램 구현보다 데이터 해석과 분석 결과 활용에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '인공지능학과': {
      card: '데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.',
      fit: '수학과 데이터를 활용해 스스로 판단하는 시스템을 만들고 싶고, 모델 성능을 비교해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '인공지능학과는 머신러닝, 딥러닝, 데이터 처리, 모델 평가, AI 윤리를 배우며 사람의 판단을 보조하거나 자동화하는 시스템을 설계하는 학과입니다.',
      subjects: ['정보', '공통수학1', '영어', '통합과학1', '물리학'],
      topics: ['학습 데이터의 양과 질이 모델 성능에 미치는 영향 비교', '추천 시스템이 사용자 선택을 바꾸는 방식 분석', 'AI 판단 과정에서 발생할 수 있는 편향과 윤리 문제 탐구'],
      group_label: '컴퓨터·AI·데이터',
      track_category: 'AI/데이터/모델링',
      core_keywords: ['인공지능','머신러닝','데이터','모델링','예측','딥러닝'],
      recommended_keywords: ['정보','공통수학1','영어','통합과학1','물리학'],
      compare_profiles: [
        { display_name: '데이터사이언스학과', track_category: '데이터/통계/AI응용', focus: '데이터 수집, 정제, 분석, 시각화를 바탕으로 의미 있는 의사결정을 돕는 학과입니다.', hint: '모델을 만드는 것보다 데이터를 해석해 현장 문제를 해결하는 데 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '소프트웨어학과', track_category: '소프트웨어/개발/서비스', focus: '앱, 웹, 서비스 개발을 중심으로 실제 사용자를 위한 프로그램을 만드는 학과입니다.', hint: 'AI 자체보다 실제 서비스 구현과 사용자 경험에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '컴퓨터공학과', track_category: '컴퓨터/시스템/개발', focus: '컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.', hint: 'AI를 돌리는 바탕 시스템과 성능 구조까지 함께 이해하고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '데이터사이언스학과': {
      card: '데이터를 수집·정제·분석·시각화해 의미 있는 의사결정을 돕는 학과입니다.',
      fit: '숫자와 패턴을 읽어 현실 문제를 해석하고, 데이터를 바탕으로 결론을 도출하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '데이터사이언스학과는 데이터 수집, 전처리, 통계 분석, 시각화, 모델링을 배우며 산업과 사회 문제를 데이터 기반으로 해결하는 학과입니다.',
      subjects: ['정보', '공통수학1', '통합사회', '영어', '사회와 문화'],
      topics: ['생활 데이터 시각화 방식이 해석 결과에 미치는 영향 비교', '예측 모델이 실제 의사결정에서 어떻게 활용되는지 사례 분석', '데이터 편향이 결과 해석과 정책 판단에 미치는 영향 탐구'],
      group_label: '컴퓨터·AI·데이터',
      track_category: '데이터/통계/AI응용',
      core_keywords: ['데이터','분석','시각화','예측','통계','모델링'],
      recommended_keywords: ['정보','공통수학1','통합사회','영어','사회와 문화'],
      compare_profiles: [
        { display_name: '인공지능학과', track_category: 'AI/데이터/모델링', focus: '데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.', hint: '데이터 해석을 넘어 학습 모델 자체를 만드는 데 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '산업공학과', track_category: '최적화/시스템/데이터', focus: '생산·물류·서비스 시스템을 데이터와 최적화 기법으로 개선하는 학과입니다.', hint: '데이터를 해석해 실제 운영 효율과 시스템 개선으로 연결하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '컴퓨터공학과', track_category: '컴퓨터/시스템/개발', focus: '컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.', hint: '데이터 분석보다 시스템 자체의 구조와 구현에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '정보보호학과': {
      card: '해킹 대응, 암호, 인증, 시스템 보안을 통해 디지털 환경을 안전하게 지키는 학과입니다.',
      fit: '시스템을 만드는 것뿐 아니라 공격과 방어 구조, 정보 보호 원리에 관심 있는 학생에게 잘 맞습니다.',
      intro: '정보보호학과는 네트워크 보안, 시스템 보안, 암호 기술, 디지털 포렌식, 보안 정책을 배우며 정보 유출과 사이버 공격을 막는 방법을 다루는 학과입니다.',
      subjects: ['정보', '공통수학1', '영어', '물리학', '통합사회'],
      topics: ['암호화 방식 차이가 정보 보호 수준에 미치는 영향 비교', '네트워크 공격 유형별 탐지·차단 방식 분석', '개인정보 보호 정책이 디지털 서비스 설계에 주는 영향 탐구'],
      group_label: '보안·시스템',
      track_category: '보안/암호/시스템',
      core_keywords: ['정보보호','보안','암호','인증','시스템','네트워크'],
      recommended_keywords: ['정보','공통수학1','영어','물리학','통합사회'],
      compare_profiles: [
        { display_name: '컴퓨터공학과', track_category: '컴퓨터/시스템/개발', focus: '컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.', hint: '시스템 자체를 설계하는 기반 기술에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '소프트웨어학과', track_category: '소프트웨어/개발/서비스', focus: '앱, 웹, 서비스 개발을 중심으로 실제 사용자를 위한 프로그램을 만드는 학과입니다.', hint: '보안보다는 서비스 구현과 사용자 기능 설계에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '인공지능학과', track_category: 'AI/데이터/모델링', focus: '데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.', hint: '보안 문제를 넘어서 자동화와 지능형 판단 시스템 자체에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '산업공학과': {
      card: '생산·물류·서비스 시스템을 데이터와 최적화 기법으로 개선하는 학과입니다.',
      fit: '복잡한 운영 과정을 더 효율적으로 만들고, 데이터를 바탕으로 전체 흐름을 개선하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '산업공학과는 생산관리, 물류, 품질관리, 인간공학, 데이터 분석, 최적화 기법을 배우며 제조와 서비스 시스템의 효율을 높이는 학과입니다.',
      subjects: ['공통수학1', '정보', '통합사회', '영어', '물리학'],
      topics: ['대기 시간과 작업 순서가 생산 효율에 미치는 영향 분석', '물류 경로 최적화가 비용과 시간에 주는 효과 비교', '서비스 운영 데이터로 병목 구간을 찾아 개선하는 방식 탐구'],
      group_label: '시스템·최적화·데이터',
      track_category: '최적화/시스템/데이터',
      core_keywords: ['산업공학','최적화','시스템','생산관리','물류','데이터'],
      recommended_keywords: ['공통수학1','정보','통합사회','영어','물리학'],
      compare_profiles: [
        { display_name: '데이터사이언스학과', track_category: '데이터/통계/AI응용', focus: '데이터를 수집·정제·분석·시각화해 의미 있는 의사결정을 돕는 학과입니다.', hint: '데이터를 해석하는 데서 나아가 실제 운영 시스템 개선으로 연결하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '경영정보학과', track_category: '경영/정보시스템/데이터', focus: '기업 운영을 데이터와 정보시스템 관점에서 해결하는 융합형 상경계열 학과입니다.', hint: '공장·물류뿐 아니라 조직 운영과 비즈니스 시스템 개선에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '컴퓨터공학과', track_category: '컴퓨터/시스템/개발', focus: '컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.', hint: '운영 최적화보다 시스템 자체 구현과 성능 구조에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '고분자공학과': {
      card: '고분자 소재의 구조와 성질을 이해하고 바이오소재·의료용 재료로 확장하는 학과입니다.',
      fit: '재료의 성질이 의료용 소재와 생활 기술에 어떻게 적용되는지 궁금한 학생에게 잘 맞습니다.',
      intro: '고분자공학과는 플라스틱, 고무, 섬유, 생체재료 같은 고분자 소재의 구조와 성질을 배우고 이를 의료, 환경, 산업 소재로 확장하는 학과입니다.',
      subjects: ['화학', '생명과학', '통합과학1', '공통수학1', '정보'],
      topics: ['생체적합성 고분자 소재가 의료 분야에 쓰이는 이유', '플라스틱과 바이오소재의 성질 비교', '고분자 구조 변화가 재료 성능에 미치는 영향 탐구'],
      group_label: '바이오소재·의료기기',
      compare: ['의공학과','신소재공학과','화공생명공학과']
    },
    '기계공학과': {
      card: '기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.',
      fit: '움직이는 구조가 어떻게 힘을 전달하고, 설계가 성능을 바꾸는지 궁금한 학생에게 잘 맞습니다.',
      intro: '기계공학과는 역학, 열유체, 재료, 설계, 제어를 배우며 기계 장치와 생산 시스템이 안정적으로 작동하도록 설계하는 학과입니다.',
      subjects: ['물리학', '공통수학1', '정보', '통합과학1', '영어'],
      topics: ['기어비와 토크 변화가 기계 동작 성능에 미치는 영향 분석', '열에너지 전달 방식 차이가 냉각 효율에 주는 효과 비교', '재료 강성과 구조 설계가 진동과 안정성에 미치는 영향 탐구'],
      group_label: '기계·로봇 설계',
      track_category: '기계/설계/동역학',
      core_keywords: ['기계공학','설계','동역학','열유체','재료','제어'],
      recommended_keywords: ['물리학','공통수학1','정보','통합과학1','영어'],
      compare_profiles: [
        { display_name: '로봇공학과', track_category: '로봇/제어/센서', focus: '기계 구조와 센서, 제어 알고리즘을 결합해 자동으로 움직이는 시스템을 만드는 학과입니다.', hint: '움직이는 장치에 제어와 자동화를 넣어 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '자동차공학과', track_category: '자동차/모빌리티/동력', focus: '자동차의 동력, 차체, 주행 제어와 미래 모빌리티 기술을 배우는 학과입니다.', hint: '기계 설계를 실제 이동 수단과 주행 시스템으로 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '전자공학과', track_category: '전자/회로/신호', focus: '회로, 신호, 센서, 통신 시스템을 설계하는 학과입니다.', hint: '기계 구조보다 전자 회로와 센서가 장치를 움직이게 하는 방식에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '전자공학과': {
      card: '회로, 신호, 센서, 통신 시스템을 설계하고 장치가 정보를 처리하도록 만드는 학과입니다.',
      fit: '회로와 신호가 장치 동작과 센서 반응을 어떻게 바꾸는지 궁금한 학생에게 잘 맞습니다.',
      intro: '전자공학과는 회로이론, 전자소자, 신호처리, 센서, 통신, 임베디드 시스템을 배우며 전자 장치와 정보 처리 시스템을 설계하는 학과입니다.',
      subjects: ['물리학', '공통수학1', '정보', '통합과학1', '영어'],
      topics: ['센서 신호의 잡음 제거 방식이 측정 정확도에 미치는 영향 분석', '증폭 회로 구조 차이가 장치 성능에 주는 효과 비교', '무선 통신 방식 변화가 전자 시스템 설계에 주는 영향 탐구'],
      group_label: '전자·전기·반도체',
      track_category: '전자/회로/신호',
      core_keywords: ['전자공학','회로','신호','센서','통신','반도체'],
      recommended_keywords: ['물리학','공통수학1','정보','통합과학1','영어'],
      compare_profiles: [
        { display_name: '전기공학과', track_category: '전기/에너지/제어', focus: '전력 시스템, 모터, 에너지 변환, 제어를 중심으로 전기 시스템을 다루는 학과입니다.', hint: '전자 회로보다 전력과 에너지 흐름, 제어 시스템에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '반도체공학과', track_category: '반도체/소자/공정', focus: '칩 설계와 반도체 공정, 소자 동작 원리를 배우는 학과입니다.', hint: '전자 장치보다 칩 내부 소자와 공정 구조를 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '로봇공학과', track_category: '로봇/제어/센서', focus: '기계 구조와 센서, 제어 알고리즘을 결합해 자동으로 움직이는 시스템을 만드는 학과입니다.', hint: '전자 회로를 실제 움직이는 시스템 제어로 확장해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '전기공학과': {
      card: '전력, 에너지 변환, 모터, 제어를 중심으로 전기 시스템을 설계하는 학과입니다.',
      fit: '전기가 어떻게 생성·전달·제어되고 실제 시스템을 움직이게 하는지 궁금한 학생에게 잘 맞습니다.',
      intro: '전기공학과는 전력 시스템, 전기회로, 모터, 제어, 에너지 변환을 배우며 전기 에너지의 흐름과 활용 기술을 다루는 학과입니다.',
      subjects: ['물리학', '공통수학1', '정보', '통합과학1', '영어'],
      topics: ['전력 손실이 송배전 효율에 미치는 영향 분석', '모터 제어 방식 차이가 동작 안정성에 주는 효과 비교', '재생에너지 연계가 전력 시스템 설계에 주는 변화 탐구'],
      group_label: '전자·전기·반도체',
      track_category: '전기/에너지/제어',
      core_keywords: ['전기공학','전력','에너지','모터','제어','회로'],
      recommended_keywords: ['물리학','공통수학1','정보','통합과학1','영어'],
      compare_profiles: [
        { display_name: '전자공학과', track_category: '전자/회로/신호', focus: '회로, 신호, 센서, 통신 시스템을 설계하는 학과입니다.', hint: '전력보다 전자 회로와 정보 처리 쪽에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '자동차공학과', track_category: '자동차/모빌리티/동력', focus: '자동차의 동력, 차체, 주행 제어와 미래 모빌리티 기술을 배우는 학과입니다.', hint: '전기 시스템을 실제 구동 장치와 모빌리티에 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '로봇공학과', track_category: '로봇/제어/센서', focus: '기계 구조와 센서, 제어 알고리즘을 결합해 자동으로 움직이는 시스템을 만드는 학과입니다.', hint: '전기 제어를 자동화 장치의 움직임으로 확장해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '반도체공학과': {
      card: '집적회로 설계와 반도체 공정, 소자 동작 원리를 배우는 학과입니다.',
      fit: '집적회로, 소자, 공정이 미세한 구조 차이로 성능을 어떻게 바꾸는지 궁금한 학생에게 잘 맞습니다.',
      intro: '반도체공학과는 반도체 소자, 회로 설계, 공정, 패키징, 검사 기술을 배우며 집적회로가 만들어지고 동작하는 전 과정을 이해하는 학과입니다.',
      subjects: ['물리학', '화학', '공통수학1', '정보', '통합과학1'],
      topics: ['미세공정 변화가 반도체 성능과 수율에 미치는 영향 분석', '반도체 소자 구조 차이가 전류 흐름에 주는 효과 비교', '집적회로 설계와 열 관리가 장치 안정성에 미치는 영향 탐구'],
      group_label: '전자·전기·반도체',
      track_category: '반도체/소자/공정',
      core_keywords: ['반도체공학','소자','공정','집적회로','회로','패키징'],
      recommended_keywords: ['물리학','화학','공통수학1','정보','통합과학1'],
      compare_profiles: [
        { display_name: '전자공학과', track_category: '전자/회로/신호', focus: '회로, 신호, 센서, 통신 시스템을 설계하는 학과입니다.', hint: '집적회로 내부보다 전자 시스템 전체와 회로 동작에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '신소재공학과', track_category: '반도체/소재/재료설계', focus: '새로운 소재의 구조와 성질을 분석해 반도체·배터리·부품으로 연결하는 학과입니다.', hint: '집적회로 공정보다 재료 자체의 구조와 성질이 성능을 바꾸는 방식에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '전기공학과', track_category: '전기/에너지/제어', focus: '전력 시스템, 모터, 에너지 변환, 제어를 중심으로 전기 시스템을 다루는 학과입니다.', hint: '집적회로 자체보다 전기 에너지 흐름과 대규모 시스템 제어에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '화학과': {
      card: '원자와 분자 수준에서 물질의 구조와 반응 원리를 실험과 분석으로 탐구하는 기초과학 학과입니다.',
      fit: '눈에 보이지 않는 분자 구조와 반응 원리를 실험으로 확인하고 깊게 이해해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '화학과는 원자, 분자, 결합, 반응, 평형, 분석 방법을 배우며 물질이 어떻게 변하고 어떤 성질을 가지는지 기초 원리부터 탐구하는 학과입니다.',
      subjects: ['화학', '공통수학1', '생명과학', '물리학', '정보'],
      topics: ['반응 조건 변화가 평형 이동과 생성물 수율에 미치는 영향 분석', '분자 구조 차이가 물질의 성질과 반응성에 주는 효과 비교', '분석 화학 기법이 미지 시료 성분을 구별하는 방식 탐구'],
      group_label: '기초화학 탐구',
      track_category: '화학/분석/분자이해',
      core_keywords: ['화학과','분자','반응','구조','분석','실험'],
      recommended_keywords: ['화학','공통수학1','생명과학','물리학','정보'],
      compare_profiles: [
        { display_name: '화학공학과', track_category: '화학공정/소재/생산', focus: '화학 반응과 물질전달, 공정 설계를 바탕으로 소재·에너지·생산 시스템을 다루는 학과입니다.', hint: '기초 반응 원리를 산업 공정과 생산 시스템으로 확장해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '생명과학과', track_category: '세포/유전/생명탐구', focus: '세포, 유전, 진화, 생태 같은 생명 현상의 원리를 이론과 실험으로 탐구하는 기초과학 중심 학과입니다.', hint: '화학적 원리를 생명 현상 이해와 실험 데이터 해석으로 넓혀 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '신소재공학과', track_category: '소재/배터리/재료설계', focus: '새로운 소재의 구조와 성질을 분석해 배터리·반도체·부품으로 연결하는 학과입니다.', hint: '기초 물질 성질을 실제 소재 설계와 성능 문제로 이어 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '화학공학과': {
      card: '화학 반응과 물질전달, 공정 설계를 바탕으로 소재·에너지·생산 시스템을 다루는 학과입니다.',
      fit: '실험실 반응을 대규모 생산 공정과 설비 시스템으로 확장해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '화학공학과는 반응공학, 열·물질전달, 분리 공정, 공정 설계를 배우며 화학 원리를 의약, 배터리, 소재, 에너지 생산 시스템에 적용하는 학과입니다.',
      subjects: ['화학', '공통수학1', '물리학', '정보', '통합과학1'],
      topics: ['촉매 조건 변화가 생산 효율과 에너지 사용량에 미치는 영향 분석', '배터리 전해질 공정 차이가 안정성과 수율에 주는 효과 비교', '분리 공정 설계가 자원 회수와 친환경 생산에 기여하는 방식 탐구'],
      group_label: '화학공정·소재',
      track_category: '화학공정/소재/생산',
      core_keywords: ['화학공학','공정','반응','분리','촉매','생산'],
      recommended_keywords: ['화학','공통수학1','물리학','정보','통합과학1'],
      compare_profiles: [
        { display_name: '화학과', track_category: '화학/분석/분자이해', focus: '원자와 분자 수준에서 물질의 구조와 반응 원리를 실험과 분석으로 탐구하는 기초과학 학과입니다.', hint: '공정보다 분자 반응 원리 자체를 깊게 이해하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '에너지공학과', track_category: '에너지/전환/저장시스템', focus: '전기, 열, 연료, 저장 시스템을 바탕으로 에너지 변환과 활용을 설계하는 학과입니다.', hint: '생산 공정 전반보다 전력·저장·변환 시스템 자체에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '신소재공학과', track_category: '소재/배터리/재료설계', focus: '새로운 소재의 구조와 성질을 분석해 배터리·반도체·부품으로 연결하는 학과입니다.', hint: '공정보다 소재 조성과 구조가 성능을 바꾸는 방식에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '에너지공학과': {
      card: '전기, 열, 연료, 저장 시스템을 바탕으로 에너지 전환과 활용 구조를 설계하는 학과입니다.',
      fit: '에너지가 만들어지고 전달되고 저장되는 전체 시스템을 효율 중심으로 보고 싶은 학생에게 잘 맞습니다.',
      intro: '에너지공학과는 열역학, 전기화학, 전력 시스템, 에너지 전환, 저장 기술을 배우며 발전·신재생에너지·배터리 활용 문제를 시스템 관점에서 공학적으로 다루는 학과입니다.',
      subjects: ['물리학', '화학', '공통수학1', '정보', '통합과학1'],
      topics: ['전력 생산 방식 차이가 시스템 효율과 손실에 미치는 영향 분석', '에너지 저장 장치 구성이 수요 변동 대응에 주는 효과 비교', '신재생에너지 출력 변동을 전력·저장 시스템이 보완하는 방식 탐구'],
      group_label: '에너지 전환·시스템',
      track_category: '에너지/전환/저장시스템',
      core_keywords: ['에너지','전력','변환','저장','효율','신재생'],
      recommended_keywords: ['물리학','화학','공통수학1','정보','통합과학1'],
      compare_profiles: [
        { display_name: '화학공학과', track_category: '화학공정/소재/생산', focus: '화학 반응과 물질전달, 공정 설계를 바탕으로 소재·에너지·생산 시스템을 다루는 학과입니다.', hint: '에너지 문제를 생산 공정과 제조 시스템까지 넓혀 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '전기공학과', track_category: '전기/에너지/제어', focus: '전력 시스템, 모터, 에너지 변환, 제어를 중심으로 전기 시스템을 다루는 학과입니다.', hint: '저장 기술보다 전력 설비와 제어 시스템 쪽에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '신소재공학과', track_category: '소재/배터리/재료설계', focus: '새로운 소재의 구조와 성질을 분석해 배터리·반도체·부품으로 연결하는 학과입니다.', hint: '에너지 시스템보다 배터리와 기능성 소재 자체의 성능 설계에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '신소재공학과': {
      card: '새로운 소재의 구조와 성질을 분석해 배터리·반도체·부품 성능으로 연결하는 학과입니다.',
      fit: '소재 조성과 결정 구조가 실제 기술 성능을 바꾸는 과정에 흥미가 있는 학생에게 잘 맞습니다.',
      intro: '신소재공학과는 금속, 세라믹, 고분자, 반도체 소재의 구조와 성질을 분석하고 이를 배터리, 반도체, 전자부품, 기능성 소재 설계로 연결하는 학과입니다.',
      subjects: ['화학', '물리학', '공통수학1', '통합과학1', '정보'],
      topics: ['결정 구조 차이가 전도성과 강도에 미치는 영향 분석', '배터리 소재 변화가 성능과 안정성에 주는 효과 비교', '소재 조성 변화가 반도체·전극 성능에 미치는 영향 탐구'],
      group_label: '소재·배터리 설계',
      track_category: '소재/배터리/재료설계',
      core_keywords: ['신소재공학','소재','결정구조','배터리','반도체','재료설계'],
      recommended_keywords: ['화학','물리학','공통수학1','통합과학1','정보'],
      compare_profiles: [
        { display_name: '화학공학과', track_category: '화학공정/소재/생산', focus: '화학 반응과 물질전달, 공정 설계를 바탕으로 소재·에너지·생산 시스템을 다루는 학과입니다.', hint: '소재 성질보다 생산 공정과 대규모 제조 시스템에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '반도체공학과', track_category: '반도체/소자/공정', focus: '집적회로 설계와 반도체 공정, 소자 동작 원리를 배우는 학과입니다.', hint: '재료 자체보다 소자 구조와 공정 설계에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '에너지공학과', track_category: '에너지/전환/저장시스템', focus: '전기, 열, 연료, 저장 시스템을 바탕으로 에너지 변환과 활용을 설계하는 학과입니다.', hint: '소재 자체보다 배터리와 저장 시스템 전체 성능에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '로봇공학과': {
      card: '기계 구조와 센서, 제어 시스템을 결합해 자동으로 움직이는 장치를 설계하는 학과입니다.',
      fit: '움직이는 장치에 센서와 제어를 넣어 자동화 시스템으로 확장해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '로봇공학과는 기계 설계, 센서, 제어, 임베디드 시스템, 메카트로닉스를 배우며 자동화 장치와 로봇 시스템을 설계하는 학과입니다.',
      subjects: ['물리학', '공통수학1', '정보', '통합과학1', '영어'],
      topics: ['센서 피드백 제어가 로봇 움직임 안정성에 미치는 영향 분석', '로봇 관절 구조 차이가 작업 효율에 주는 효과 비교', '로봇 경로 계획 방식이 작업 성능에 미치는 영향 탐구'],
      group_label: '로봇·제어 시스템',
      track_category: '로봇/제어/센서',
      core_keywords: ['로봇공학','센서','제어','메카트로닉스','임베디드','기구설계'],
      recommended_keywords: ['물리학','공통수학1','정보','통합과학1','영어'],
      compare_profiles: [
        { display_name: '기계공학과', track_category: '기계/설계/동역학', focus: '기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.', hint: '자동화보다 구조 설계와 동역학 자체에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '전자공학과', track_category: '전자/회로/신호', focus: '회로, 신호, 센서, 통신 시스템을 설계하는 학과입니다.', hint: '기계 구조보다 센서와 회로, 제어 신호 처리 쪽에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '인공지능학과', track_category: 'AI/데이터/모델링', focus: '데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.', hint: '로봇 장치 설계보다 인식·판단 알고리즘 자체에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '자동차공학과': {
      card: '자동차의 동력, 차체, 주행 제어와 미래 모빌리티 기술을 배우는 학과입니다.',
      fit: '기계 설계를 실제 이동 수단과 주행 시스템으로 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '자동차공학과는 동력전달, 차체 구조, 차량 제어, 친환경 파워트레인, 미래 모빌리티 기술을 배우며 자동차 시스템 전반을 설계하는 학과입니다.',
      subjects: ['물리학', '공통수학1', '정보', '통합과학1', '영어'],
      topics: ['차량 무게 배분이 주행 안정성에 미치는 영향 분석', '전기차와 내연기관의 동력 전달 구조 차이 비교', '자율주행 보조 시스템이 운전 안전성에 주는 효과 탐구'],
      group_label: '자동차·모빌리티',
      track_category: '자동차/모빌리티/동력',
      core_keywords: ['자동차공학','모빌리티','동력','차체','제어','주행'],
      recommended_keywords: ['물리학','공통수학1','정보','통합과학1','영어'],
      compare_profiles: [
        { display_name: '기계공학과', track_category: '기계/설계/동역학', focus: '기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.', hint: '자동차라는 응용 분야보다 기계 전반의 구조 설계에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '전기공학과', track_category: '전기/에너지/제어', focus: '전력 시스템, 모터, 에너지 변환, 제어를 중심으로 전기 시스템을 다루는 학과입니다.', hint: '차량 전체보다 전기 구동과 에너지 제어 기술에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '로봇공학과', track_category: '로봇/제어/센서', focus: '기계 구조와 센서, 제어 알고리즘을 결합해 자동으로 움직이는 시스템을 만드는 학과입니다.', hint: '차량보다 자동화 장치와 움직이는 제어 시스템 전반에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '심리학과': {
      card: '인지·정서·행동의 원리를 실험과 분석으로 이해하는 학과입니다.',
      fit: '사람의 마음과 행동을 분석적으로 이해하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '심리학과는 사람의 인지, 정서, 행동이 어떻게 나타나는지 실험과 통계, 사례 분석으로 탐구하는 학과입니다.',
      subjects: ['통합사회', '공통국어', '생명과학', '영어', '공통수학1'],
      topics: ['기억과 주의집중이 학습에 미치는 영향 탐구', '정서 조절 전략과 스트레스 반응 비교', '설문과 실험을 활용한 행동 패턴 분석'],
      group_label: '심리·상담',
      compare: ['상담심리학과']
    },
    '상담심리학과': {
      card: '심리 이해를 바탕으로 상담과 관계 지원에 더 가까운 학과입니다.',
      fit: '사람의 마음을 이해하고 상담과 지원 활동으로 연결하고 싶은 학생에게 잘 맞습니다.',
      intro: '상담심리학과는 심리 이론을 바탕으로 개인과 집단의 어려움을 이해하고 상담을 통해 관계 회복과 적응을 돕는 학과입니다.',
      subjects: ['심리', '공통국어', '사회와 문화', '정보', '공통수학1'],
      topics: ['상담 관계 형성 요소가 개입 효과에 미치는 영향', '청소년 정서 문제 지원 방식 비교', '상담 장면에서 의사소통과 공감의 역할 탐구'],
      group_label: '심리·상담',
      compare: ['심리학과']
    },
    '재활상담학과': {
      card: '장애와 질환 이후의 학교·직업·사회 복귀를 상담과 지원 관점에서 돕는 학과입니다.',
      fit: '재활 과정에서 심리 지원과 사회 적응, 진로 복귀까지 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '재활상담학과는 장애나 질환 이후 필요한 심리 지원, 진로 상담, 사회 적응과 복귀 지원을 함께 배우는 학과입니다.',
      subjects: ['심리', '보건', '사회와 문화', '공통국어', '정보'],
      topics: ['재활 단계별 상담 지원이 사회 복귀에 미치는 영향 분석', '장애 학생의 진로 지원 체계와 학교 적응 사례 비교', '심리 지원과 직업 재활이 함께 작동하는 구조 탐구'],
      group_label: '재활·상담 지원',
      track_category: '재활/상담/지원',
      compare: ['작업치료학과','언어치료학과','상담심리학과']
    },
    '식품영양학과': {
      card: '식품과 영양, 건강 관리의 관계를 생활과 예방 관점에서 다루는 학과입니다.',
      fit: '생활 습관과 영양 관리가 건강에 어떤 영향을 주는지 궁금한 학생에게 잘 맞습니다.',
      intro: '식품영양학과는 식품의 성분과 조리, 영양 설계, 건강 증진과 식생활 관리의 관계를 함께 배우는 학과입니다.',
      subjects: ['화학', '생명과학', '보건', '가정', '정보'],
      topics: ['연령별 영양 요구 차이와 식단 설계 비교', '생활 습관과 영양 불균형이 건강에 미치는 영향 분석', '식품 성분 표시와 건강 정보 해석 방식 탐구'],
      group_label: '식품·영양·건강',
      track_category: '영양/식품/건강관리',
      compare: ['식품공학과','보건관리학과','생명공학과']
    },

    '교육학과': {
      card: '교육 제도와 학습 원리, 학교 운영 구조를 폭넓게 이해하는 학과입니다.',
      fit: '사람이 배우고 성장하는 과정과 교육 제도가 어떻게 연결되는지 궁금한 학생에게 잘 맞습니다.',
      intro: '교육학과는 학습 이론, 교육과정, 학교 제도, 교육 정책을 함께 배우며 교육이 개인의 성장과 사회 변화에 어떤 역할을 하는지 폭넓게 탐구하는 학과입니다.',
      subjects: ['통합사회', '공통국어', '사회와 문화', '심리', '공통수학1'],
      topics: ['학교 교육과정 차이가 학습 경험에 미치는 영향 비교', '교육 정책 변화가 학생 성장 지원에 미치는 효과 분석', '학습 동기 이론이 수업 설계에 반영되는 방식 탐구'],
      group_label: '교육·아동 발달',
      track_category: '교육/학습/정책',
      compare_profiles: [
        { display_name: '유아교육과', track_category: '유아교육/발달/놀이', focus: '유아의 발달과 놀이, 초기 학습 환경을 이해하고 교육 활동을 설계하는 학과입니다.', hint: '어린 시기의 성장과 놀이 중심 교육에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '특수교육과', track_category: '특수교육/개별지원/통합교육', focus: '장애·학습 차이가 있는 학생을 위한 개별 지원과 통합교육 방법을 배우는 학과입니다.', hint: '학습 지원과 교육적 배려를 실제 교육 현장에 적용해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '사회복지학과', track_category: '복지/사례관리/지역지원', focus: '개인과 가족, 지역사회의 어려움을 제도와 사례 지원으로 돕는 학과입니다.', hint: '교육 밖의 생활 환경과 지원 체계까지 함께 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '유아교육과': {
      card: '유아의 발달과 놀이, 초기 학습 환경을 이해하고 교육 활동을 설계하는 학과입니다.',
      fit: '어린 시기의 성장과 놀이, 언어·사회성 발달을 교육 활동으로 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '유아교육과는 영유아의 인지, 언어, 사회성, 정서 발달을 이해하고 놀이와 생활 경험을 바탕으로 초기 학습 환경을 설계하는 학과입니다.',
      subjects: ['통합사회', '공통국어', '아동발달', '심리', '미술'],
      topics: ['놀이 유형이 언어·사회성 발달에 미치는 영향 분석', '연령별 발달 차이에 맞는 활동 설계 비교', '유아 교실 환경이 정서 안정과 참여도에 주는 효과 탐구'],
      group_label: '교육·아동 발달',
      track_category: '유아교육/발달/놀이',
      compare_profiles: [
        { display_name: '아동학과', track_category: '아동발달/가족/성장지원', focus: '아동의 성장과 가족 환경, 발달 지원을 폭넓게 이해하는 학과입니다.', hint: '교육뿐 아니라 가정과 발달 환경 전체를 함께 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '교육학과', track_category: '교육/학습/정책', focus: '학습 원리와 교육 제도, 학교 운영 구조를 폭넓게 이해하는 학과입니다.', hint: '교육 현상을 제도와 학습 이론 관점에서 넓게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '특수교육과', track_category: '특수교육/개별지원/통합교육', focus: '장애·학습 차이가 있는 학생을 위한 개별 지원과 통합교육 방법을 배우는 학과입니다.', hint: '발달 지원을 더 세밀한 개별 교육 관점에서 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '아동학과': {
      card: '아동의 성장과 가족 환경, 발달 지원을 폭넓게 이해하는 학과입니다.',
      fit: '아이의 발달을 교육뿐 아니라 가족, 복지, 상담까지 넓게 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '아동학과는 아동의 인지, 정서, 사회성 발달과 가족 관계, 양육 환경, 성장 지원 체계를 폭넓게 배우는 학과입니다.',
      subjects: ['아동발달', '통합사회', '심리', '공통국어', '사회와 문화'],
      topics: ['가정 환경 차이가 아동 발달에 미치는 영향 분석', '놀이·양육 방식에 따른 정서 발달 차이 비교', '아동 권리와 보호 제도가 성장 지원에 주는 효과 탐구'],
      group_label: '교육·아동 발달',
      track_category: '아동발달/가족/성장지원',
      compare_profiles: [
        { display_name: '유아교육과', track_category: '유아교육/발달/놀이', focus: '유아의 발달과 놀이, 초기 학습 환경을 이해하고 교육 활동을 설계하는 학과입니다.', hint: '성장을 교육 활동으로 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '사회복지학과', track_category: '복지/사례관리/지역지원', focus: '개인과 가족, 지역사회의 어려움을 제도와 사례 지원으로 돕는 학과입니다.', hint: '아동과 가족 문제를 복지 제도와 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '상담심리학과', track_category: '인간이해/상담/관계지원', focus: '심리 이론을 바탕으로 개인과 집단의 어려움을 이해하고 상담을 통해 관계 회복과 적응을 돕는 학과입니다.', hint: '아이의 정서와 관계 지원을 심리·상담 관점에서 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '특수교육과': {
      card: '장애·학습 차이가 있는 학생을 위한 개별 지원과 통합교육 방법을 배우는 학과입니다.',
      fit: '학습 지원과 교육적 배려, 개별화된 수업 설계에 관심 있는 학생에게 잘 맞습니다.',
      intro: '특수교육과는 장애나 학습 차이가 있는 학생의 발달 특성을 이해하고 개별화 교육, 의사소통 지원, 통합교육 방법을 배우는 학과입니다.',
      core_keywords: ['개별화교육', '통합교육', '학습지원', '의사소통지원', '발달이해', '교육배려'],
      recommended_keywords: ['특수교육', '개별지원', '학교적응', '지원체계'],
      subjects: ['통합사회', '심리', '공통국어', '보건', '정보'],
      topics: ['개별화 교육계획이 학습 참여도에 미치는 영향 분석', '통합교육 환경에서 필요한 지원 요소 비교', '의사소통 보조도구가 학습 접근성에 주는 효과 탐구'],
      group_label: '교육·아동 발달',
      track_category: '특수교육/개별지원/통합교육',
      compare_profiles: [
        { display_name: '유아교육과', track_category: '유아교육/발달/놀이', focus: '유아의 발달과 놀이, 초기 학습 환경을 이해하고 교육 활동을 설계하는 학과입니다.', hint: '발달 초기 교육과 놀이 중심 지원에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '교육학과', track_category: '교육/학습/정책', focus: '교육 제도와 학습 원리, 학교 운영 구조를 폭넓게 이해하는 학과입니다.', hint: '지원 체계를 교육 전반의 제도와 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '언어치료학과', track_category: '메디컬/보건 계열', focus: '발음, 언어 발달, 의사소통 장애를 평가하고 중재하는 의사소통 재활 학과입니다.', hint: '교육과 치료가 만나는 지원 방식에 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '사회복지학과': {
      card: '개인과 가족, 지역사회의 어려움을 제도와 사례 지원으로 돕는 학과입니다.',
      fit: '사람의 어려움을 상담만이 아니라 제도, 서비스, 지역사회 지원까지 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '사회복지학과는 개인, 가족, 아동, 노인, 장애인 등 다양한 대상의 삶의 문제를 이해하고 복지 제도, 사례관리, 지역사회 지원 체계를 배우는 학과입니다.',
      subjects: ['통합사회', '사회와 문화', '정치와 법', '공통국어', '심리'],
      topics: ['복지 제도 차이가 삶의 안정에 미치는 영향 분석', '사례관리 과정에서 필요한 지역사회 자원 연결 방식 탐구', '아동·노인·장애인 복지 서비스 비교와 개선안 분석'],
      group_label: '복지·상담 지원',
      track_category: '복지/사례관리/지역지원',
      compare_profiles: [
        { display_name: '상담심리학과', track_category: '인간이해/상담/관계지원', focus: '심리 이론을 바탕으로 개인과 집단의 어려움을 이해하고 상담을 통해 관계 회복과 적응을 돕는 학과입니다.', hint: '개인의 정서 지원에 더 가까운 방향을 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '아동학과', track_category: '아동발달/가족/성장지원', focus: '아동의 성장과 가족 환경, 발달 지원을 폭넓게 이해하는 학과입니다.', hint: '복지 대상을 아동·가족 성장 관점으로 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '특수교육과', track_category: '특수교육/개별지원/통합교육', focus: '장애·학습 차이가 있는 학생을 위한 개별 지원과 통합교육 방법을 배우는 학과입니다.', hint: '지원 체계를 교육 현장과 연결해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '심리학과': {
      card: '인지·정서·행동의 원리를 실험과 분석으로 이해하는 학과입니다.',
      fit: '사람의 마음과 행동을 분석적으로 이해하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '심리학과는 사람의 인지, 정서, 행동이 어떻게 나타나는지 실험과 통계, 사례 분석으로 탐구하는 학과입니다.',
      subjects: ['통합사회', '공통국어', '생명과학', '영어', '공통수학1'],
      topics: ['기억과 주의집중이 학습에 미치는 영향 탐구', '정서 조절 전략과 스트레스 반응 비교', '설문과 실험을 활용한 행동 패턴 분석'],
      group_label: '심리·상담',
      track_category: '심리/실험/행동분석',
      compare_profiles: [
        { display_name: '상담심리학과', track_category: '인간이해/상담/관계지원', focus: '심리 이론을 바탕으로 개인과 집단의 어려움을 이해하고 상담을 통해 관계 회복과 적응을 돕는 학과입니다.', hint: '심리 이해를 실제 상담 장면에 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '사회복지학과', track_category: '복지/사례관리/지역지원', focus: '개인과 가족, 지역사회의 어려움을 제도와 사례 지원으로 돕는 학과입니다.', hint: '마음과 행동 문제를 생활 환경·지원 체계까지 넓혀 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '교육학과', track_category: '교육/학습/정책', focus: '학습 원리와 교육 제도, 학교 운영 구조를 폭넓게 이해하는 학과입니다.', hint: '심리 이론이 학습과 교육 현장에 어떻게 쓰이는지 궁금한 학생에게 잘 맞습니다.' }
      ]
    },
    '상담심리학과': {
      card: '심리 이해를 바탕으로 상담과 관계 지원에 더 가까운 학과입니다.',
      fit: '사람의 마음을 이해하고 상담과 지원 활동으로 연결하고 싶은 학생에게 잘 맞습니다.',
      intro: '상담심리학과는 심리 이론을 바탕으로 개인과 집단의 어려움을 이해하고 상담을 통해 관계 회복과 적응을 돕는 학과입니다.',
      subjects: ['심리', '공통국어', '사회와 문화', '정보', '공통수학1'],
      topics: ['상담 관계 형성 요소가 개입 효과에 미치는 영향', '청소년 정서 문제 지원 방식 비교', '상담 장면에서 의사소통과 공감의 역할 탐구'],
      group_label: '심리·상담',
      track_category: '인간이해/상담/관계지원',
      compare_profiles: [
        { display_name: '심리학과', track_category: '심리/실험/행동분석', focus: '인지·정서·행동의 원리를 실험과 분석으로 이해하는 학과입니다.', hint: '마음의 원리를 더 분석적으로 파고드는 방향에 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '사회복지학과', track_category: '복지/사례관리/지역지원', focus: '개인과 가족, 지역사회의 어려움을 제도와 사례 지원으로 돕는 학과입니다.', hint: '상담을 복지 제도와 사례 지원까지 넓혀 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '아동학과', track_category: '아동발달/가족/성장지원', focus: '아동의 성장과 가족 환경, 발달 지원을 폭넓게 이해하는 학과입니다.', hint: '상담 대상을 아동·가족 성장 관점에서 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '국제통상학과': {
      card: '무역과 글로벌 시장, 통상 흐름을 실무적으로 다루는 학과입니다.',
      fit: '국제 시장, 무역, 수출입 구조를 현실 문제와 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '국제통상학과는 무역, 수출입, 글로벌 시장 구조, 통상 정책과 같은 국제 거래 흐름을 실무적으로 배우는 학과입니다.',
      subjects: ['통합사회', '영어', '경제', '수학', '공통국어'],
      topics: ['환율 변동이 수출입 산업에 미치는 영향 분석', 'FTA가 국내 산업 구조에 주는 효과 탐구', '글로벌 무역 갈등이 기업 전략에 미치는 변화 분석'],
      group_label: '국제·통상',
      compare: ['국제학부','경제학과','경영학과']
    },
        '미디어커뮤니케이션학과': {
      card: '뉴스, 플랫폼, 영상 콘텐츠처럼 미디어 메시지가 사회에 미치는 영향을 분석하는 학과입니다.',
      fit: '미디어와 콘텐츠가 사람과 사회에 어떤 영향을 주는지 분석하고 싶은 학생에게 잘 맞습니다.',
      intro: '미디어커뮤니케이션학과는 뉴스, 광고, 플랫폼, 영상 콘텐츠 같은 미디어 메시지가 사람과 사회에 미치는 영향을 분석하고 커뮤니케이션 구조를 해석하는 학과입니다.',
      subjects: ['통합사회', '공통국어', '영어', '정보', '경제'],
      topics: ['뉴스 프레이밍이 여론 형성에 미치는 영향 분석', '숏폼 콘텐츠 소비 방식 변화와 미디어 산업 탐구', '플랫폼 알고리즘이 정보 노출에 미치는 효과 비교'],
      group_label: '미디어·콘텐츠',
      compare: ['광고홍보학과','언론정보학과','문화콘텐츠학과']
    },
        '광고홍보학과': {
      card: '브랜드 메시지와 콘텐츠 전략을 기획하고 소비자 반응을 분석하는 학과입니다.',
      fit: '메시지를 기획하고 사람의 반응과 설득 효과를 분석하는 일에 관심 있는 학생에게 잘 맞습니다.',
      intro: '광고홍보학과는 브랜드와 기관의 메시지를 효과적으로 전달하기 위해 콘텐츠 전략, 캠페인 기획, 소비자 반응 분석을 배우는 학과입니다.',
      subjects: ['통합사회', '공통국어', '영어', '경제', '정보'],
      topics: ['광고 메시지 유형별 설득 전략 비교', '브랜드 캠페인이 소비자 태도에 미치는 영향 분석', 'SNS 홍보 콘텐츠 확산 구조 탐구'],
      group_label: '미디어·콘텐츠',
      compare: ['미디어커뮤니케이션학과','문화콘텐츠학과','언론정보학과']
    },
        '언론정보학과': {
      card: '뉴스와 정보가 생산·유통되는 구조를 읽고 기사와 데이터, 플랫폼 환경을 함께 해석하는 학과입니다.',
      fit: '기사, 정보 검증, 데이터 기반 시사 해석에 관심 있는 학생에게 잘 맞습니다.',
      intro: '언론정보학과는 뉴스 생산과 정보 유통 구조를 배우고, 기사와 데이터, 플랫폼 환경이 사회 인식에 어떤 영향을 미치는지 해석하는 학과입니다.',
      subjects: ['통합사회', '공통국어', '영어', '정보', '경제'],
      topics: ['정보 유통 구조가 사회 인식에 미치는 영향 분석', '기사 데이터와 플랫폼 반응의 관계 탐구', '언론 신뢰도와 정보 검증 문제를 사례로 비교'],
      group_label: '미디어·콘텐츠',
      compare: ['신문방송학과','미디어커뮤니케이션학과','광고홍보학과']
    },
        '신문방송학과': {
      card: '뉴스와 방송 콘텐츠가 어떻게 제작되고 전달되며 사회 의제를 형성하는지 배우는 학과입니다.',
      fit: '보도, 시사 해석, 방송 콘텐츠와 공공성에 관심 있는 학생에게 잘 맞습니다.',
      intro: '신문방송학과는 뉴스와 방송 콘텐츠의 제작 과정, 보도와 편집, 시사 해석, 공공성과 미디어 윤리를 함께 배우는 학과입니다.',
      subjects: ['통합사회', '공통국어', '영어', '정보', '정치와 법'],
      topics: ['뉴스 프레이밍이 사건 인식에 미치는 영향 분석', '방송 보도와 디지털 뉴스의 전달 방식 비교', '미디어 윤리와 공공성 기준을 사례로 검토하기'],
      group_label: '미디어·콘텐츠',
      compare: ['언론정보학과','미디어커뮤니케이션학과','광고홍보학과']
    },
        '문화콘텐츠학과': {
      card: '스토리와 문화 자원을 콘텐츠로 기획하고, 매체 확장과 산업 구조까지 함께 배우는 학과입니다.',
      fit: '이야기와 문화 자원을 콘텐츠 기획과 산업 흐름으로 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '문화콘텐츠학과는 문화와 이야기를 단순 감상이 아니라 콘텐츠 기획, 산업 구조, 매체 확장 관점에서 배우는 학과입니다.',
      subjects: ['통합사회', '공통국어', '영어', '정보', '미술'],
      topics: ['원작 서사가 콘텐츠 산업에서 확장되는 방식 분석', '플랫폼 변화가 콘텐츠 소비 방식에 미치는 영향 탐구', '지역 문화자원을 활용한 콘텐츠 기획안 설계'],
      group_label: '미디어·콘텐츠',
      compare: ['광고홍보학과','미디어커뮤니케이션학과','신문방송학과']
    },
    '건설환경공학과': {
      track_category: '건설/환경/인프라',
      card: '도시 기반시설의 설계·시공·유지관리를 배우며 수질·대기·폐기물 같은 환경 문제를 함께 해결하는 학과입니다.',
      fit: '시설을 짓는 것에서 끝나지 않고, 인프라 운영과 환경 문제를 함께 보고 기술적으로 해결하고 싶은 학생에게 잘 맞습니다.',
      intro: '건설환경공학과는 도로·교량·상하수도 같은 사회기반시설의 설계·시공·유지관리를 배우고, 수질·대기·폐기물 같은 환경 문제까지 함께 다루며 지속가능한 인프라 시스템을 고민하는 학과입니다.',
      subjects: ['물리학', '화학', '미적분', '정보', '통합과학1'],
      topics: ['건설 공정이 수질·대기 환경에 미치는 영향 분석', '도시 인프라 유지관리와 환경 기준의 관계 탐구', '친환경 건설 기술과 기존 공법의 차이 비교'],
      group_label: '건설·환경 인프라',
      compare: ['토목환경공학과','도시공학과','주거환경학과']
    },
    '토목환경공학과': {
      track_category: '토목/환경/인프라',
      card: '도로·교량·하천·상하수도 같은 사회기반시설을 구조 설계와 수자원·환경 관리 관점에서 함께 배우는 학과입니다.',
      fit: '구조물 안전성, 하천·수자원 관리, 도시 재난 대응을 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '토목환경공학과는 도로·교량·하천·상하수도 같은 토목 구조물의 설계와 해석을 배우고, 수자원·수질·환경 관리까지 함께 다루며 사회기반시설의 안전성과 자연환경의 균형을 이해하는 학과입니다.',
      subjects: ['물리학', '미적분', '기하', '지구과학', '정보'],
      topics: ['하천·상하수도 설계와 수질 관리 기준의 관계 분석', '교량·도로 같은 구조물 안전성과 환경 영향 비교', '토목 기술이 도시 재난 대응에 기여하는 방식 탐구'],
      group_label: '토목·환경 인프라',
      compare: ['건설환경공학과','도시공학과','지구환경과학과']
    },
    '지구환경과학과': {
      search_aliases: ['지구과학과', '지구과학'],
      track_category: '환경/기후/지구시스템',
      card: '기후·대기·지질·해양·수문 같은 지구 시스템의 변화를 관측 자료와 데이터로 분석하는 학과입니다.',
      fit: '기후 변화와 자연환경 문제를 관측 자료와 지도, 과학 모델로 해석해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '지구환경과학과는 기후, 대기, 지질, 해양, 수문 등 지구 시스템의 변화를 관측 자료와 과학적 모델로 분석하며 환경 변화의 원인과 결과를 통합적으로 이해하는 학과입니다.',
      subjects: ['지구과학', '화학', '생명과학', '미적분', '정보'],
      topics: ['기후 자료와 지질·수문 자료를 연결한 환경 변화 분석', '인간 활동이 대기·해양 환경에 미치는 영향 탐구', '기후 위기 대응 정책과 과학 데이터의 관계 해석'],
      group_label: '환경·지구시스템',
      compare: ['도시공학과','건설환경공학과','토목환경공학과']
    },
    '주거환경학과': {
      track_category: '주거/공간/생활환경',
      card: '주거 공간, 실내 환경, 생활 동선과 안전·편의를 사람 중심으로 설계하고 분석하는 학과입니다.',
      fit: '사람이 실제로 살아가는 공간을 더 안전하고 편리하게 바꾸는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '주거환경학과는 주거 공간, 실내 환경, 생활 동선, 주거문화 등을 바탕으로 사람이 살아가는 공간을 설계하고 삶의 질을 높이는 생활환경을 분석하는 학과입니다.',
      subjects: ['실용가정', '미술', '통합사회', '정보', '기하'],
      topics: ['세대별 주거환경 요구 차이와 공간 설계 비교', '실내 환경이 생활 습관과 건강에 미치는 영향 분석', '안전·편의를 반영한 생활 공간 개선 방향 탐구'],
      group_label: '주거/공간 설계',
      compare: ['도시공학과','건설환경공학과','토목환경공학과']
    },
    '도시공학과': {
      track_category: '도시/교통/인프라',
      card: '도시 공간과 주거·교통·환경·인프라를 생활권 전체의 구조에서 종합적으로 계획하는 학과입니다.',
      fit: '도시 문제를 개별 시설보다 생활권 전체의 구조로 보고 설계·기획하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '도시공학과는 주거, 교통, 인프라, 환경, 도시재생과 개발 계획을 통합적으로 다루며 사람이 살아가는 도시를 설계하고 운영하는 방식을 배우는 학과입니다.',
      subjects: ['세계시민과 지리', '통합사회', '경제', '미적분', '정보'],
      topics: ['도시계획이 생활환경과 이동 방식에 미치는 영향 분석', '주거·교통·환경 요소를 통합한 도시 설계 비교', '도시재생과 지역 공동체 변화의 관계 탐구'],
      group_label: '도시계획/인프라',
      compare: ['주거환경학과','건설환경공학과','지구환경과학과']
    }
,
    '건축학과': {
      track_category: '건축/공간/설계',
      card: '건물과 공간을 설계하고 인간의 생활 방식과 도시 맥락, 미적 요소를 함께 고려하는 학과입니다.',
      fit: '공간 구조와 미적 요소, 도시 맥락을 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '건축학과는 건물과 공간의 구조와 쓰임을 이해하고 도시와 생활 환경을 고려해 설계하는 학과입니다. 구조적 안정성과 디자인 감각을 함께 배우며 공간이 사람의 삶에 미치는 영향을 탐구합니다.',
      subjects: ['미술', '물리학', '미적분', '통합사회', '정보'],
      topics: ['공간 설계가 인간 행동과 경험에 미치는 영향 분석', '도시 맥락을 반영한 건축 설계 기준 비교', '건축물의 미적 요소와 기능적 요소의 균형 탐구'],
      group_label: '건축·디자인 폭',
      compare_profiles: [
        { display_name: '건축공학과', track_category: '건축/구조/시공', focus: '건축·디자인 폭과 연결해 도시 구조와 생활 기반 설계를 중심으로 배우는 학과입니다.', hint: '건축·디자인 폭의 연관된 주제를 사례와 데이터로 탐구해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '실내디자인학과', track_category: '실내/공간/인테리어', focus: '실내 공간과 생활 동선, 인테리어 요소를 중심으로 공간 경험을 설계하는 학과입니다.', hint: '건축 공간을 사람의 생활과 감각 경험까지 확장해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '주거환경학과', track_category: '주거/공간/생활환경', focus: '주거 공간, 실내 환경, 생활 동선과 안전·편의를 사람 중심으로 설계하고 분석하는 학과입니다.', hint: '건축 공간을 생활 환경과 주거 관점으로 연결해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '건축공학과': {
      track_category: '건축/구조/시공',
      card: '건축물을 안전하고 효율적으로 짓기 위한 구조, 재료, 설비, 시공 기술을 배우는 학과입니다.',
      fit: '구조 안정성과 재료 성능, 시공 기술에 관심 있는 학생에게 잘 맞습니다.',
      intro: '건축공학과는 건축물을 안전하고 효율적으로 짓기 위해 구조, 재료, 설비, 시공 기술을 배우는 학과입니다. 건축 디자인보다는 실제 건축물이 어떻게 버티고 유지되는지에 더 가까운 학과입니다.',
      subjects: ['물리학', '미적분', '화학', '통합과학1', '정보'],
      topics: ['건축 재료 차이가 구조 안정성에 미치는 영향 분석', '건축 설비 시스템이 사용 환경에 미치는 영향 탐구', '건축 공법에서 구조 안전과 효율의 균형 비교'],
      group_label: '건축·디자인 폭',
      compare_profiles: [
        { display_name: '건축학과', track_category: '건축/공간/설계', focus: '건축·디자인 폭과 연결해 도시 구조와 생활 기반 설계를 중심으로 배우는 학과입니다.', hint: '건축·디자인 폭의 연관된 주제를 사례와 데이터로 탐구해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '실내디자인학과', track_category: '실내/공간/인테리어', focus: '실내 환경과 공간 분위기, 동선 설계를 중심으로 배우는 학과입니다.', hint: '건축 구조보다 생활 공간의 경험 설계에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '도시공학과', track_category: '도시/교통/인프라', focus: '주거, 교통, 인프라, 환경과 도시재생을 통합적으로 계획하는 학과입니다.', hint: '개별 건축물보다 도시 전체의 구조와 인프라를 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '실내디자인학과': {
      track_category: '실내/공간/인테리어',
      card: '실내 공간, 생활 동선, 조명·색채·가구 같은 요소를 바탕으로 사람이 머무는 공간 경험을 설계하는 학과입니다.',
      fit: '공간이 주는 분위기와 사용 경험, 생활 동선을 사람 중심으로 바꾸는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '실내디자인학과는 주거·상업·문화 공간의 실내 환경을 설계하며, 생활 동선과 가구 배치, 재료와 색채, 조명 계획을 통해 공간 경험을 만드는 학과입니다.',
      subjects: ['미술', '통합사회', '정보', '실용가정', '공통수학1'],
      topics: ['실내 공간 배치가 생활 동선과 편의에 미치는 영향 분석', '조명·색채 계획 차이가 공간 분위기에 주는 효과 비교', '가구 배치와 공간 밀도가 사용자 경험을 바꾸는 방식 탐구'],
      group_label: '건축·디자인 폭',
      compare_profiles: [
        { display_name: '건축학과', track_category: '건축/공간/설계', focus: '건물과 공간의 구조, 도시 맥락, 설계 원리를 함께 배우는 학과입니다.', hint: '실내보다 건축물과 도시 전체의 설계를 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '주거환경학과', track_category: '주거/공간/생활환경', focus: '주거 공간과 실내 환경, 생활 동선과 안전·편의를 사람 중심으로 분석하는 학과입니다.', hint: '공간 디자인을 생활 환경과 주거 관점으로 확장해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '산업디자인학과', track_category: '제품/사용자/디자인', focus: '사용자 경험과 제품 형태, 기능 설계를 중심으로 디자인하는 학과입니다.', hint: '공간보다 제품과 서비스 경험 설계에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '산업디자인학과': {
      track_category: '제품/사용자/디자인',
      card: '사람이 사용하는 제품과 서비스의 형태, 기능, 사용 경험을 분석하고 설계하는 학과입니다.',
      fit: '제품을 예쁘게 만드는 것보다 사용성과 문제 해결 관점에서 디자인하고 싶은 학생에게 잘 맞습니다.',
      intro: '산업디자인학과는 생활용품, 전자기기, 서비스 도구처럼 사람이 사용하는 제품과 시스템의 형태와 기능, 사용 경험을 설계하는 학과입니다.',
      core_keywords: ['산업디자인', '사용자경험', '형태', '기능', '제품구조', '문제해결'],
      recommended_keywords: ['미술', '정보', '통합사회', '공통수학1', '물리학'],
      subjects: ['미술', '정보', '통합사회', '공통수학1', '물리학'],
      topics: ['제품 형태 차이가 사용자 편의와 조작 경험에 미치는 영향 분석', '생활 문제를 해결하는 제품 디자인 사례 비교', '재료·구조 변화가 제품 내구성과 사용성에 주는 효과 탐구'],
      group_label: '건축·디자인 폭',
      compare_profiles: [
        { display_name: '제품디자인학과', track_category: '제품/형태/사용경험', focus: '제품 형태와 구조, 사용 경험을 더 직접적으로 설계하는 학과입니다.', hint: '산업 전반의 사용자 경험보다 제품 단위 디자인에 더 집중하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '시각디자인학과', track_category: '시각/브랜드/콘텐츠', focus: '이미지, 편집, 브랜드, 콘텐츠 전달 방식을 시각적으로 설계하는 학과입니다.', hint: '제품보다 메시지와 브랜드 경험 설계에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '실내디자인학과', track_category: '실내/공간/인테리어', focus: '사람이 머무는 공간의 동선과 분위기, 생활 경험을 설계하는 학과입니다.', hint: '제품 대신 공간 경험 설계에 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '시각디자인학과': {
      track_category: '시각/브랜드/콘텐츠',
      card: '이미지, 편집, 브랜드, 콘텐츠 전달 방식을 시각적으로 설계하는 학과입니다.',
      fit: '정보를 보기 좋게 만드는 것을 넘어 메시지 전달과 브랜드 경험을 시각적으로 만들고 싶은 학생에게 잘 맞습니다.',
      intro: '시각디자인학과는 포스터, 편집, 브랜드, 디지털 콘텐츠처럼 정보를 시각적으로 전달하는 방법을 배우고 이미지와 메시지의 관계를 설계하는 학과입니다.',
      subjects: ['미술', '정보', '공통국어', '영어', '통합사회'],
      topics: ['색채와 레이아웃 차이가 정보 전달력에 미치는 영향 분석', '브랜드 시각 요소가 소비자 인식에 주는 효과 비교', '디지털 콘텐츠 플랫폼별 시각 구성 방식 탐구'],
      group_label: '건축·디자인 폭',
      compare_profiles: [
        { display_name: '산업디자인학과', track_category: '제품/사용자/디자인', focus: '사람이 사용하는 제품과 서비스의 형태, 기능, 사용 경험을 분석하고 설계하는 학과입니다.', hint: '시각 이미지보다 제품과 사용자 경험 설계에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '광고홍보학과', track_category: '브랜드/메시지/캠페인', focus: '브랜드 메시지와 콘텐츠 전략을 기획하고 소비자 반응을 분석하는 학과입니다.', hint: '디자인을 설득과 캠페인 전략으로 확장해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '미디어커뮤니케이션학과', track_category: '미디어/콘텐츠/사회분석', focus: '뉴스, 플랫폼, 영상 콘텐츠가 사람과 사회에 미치는 영향을 분석하는 학과입니다.', hint: '시각 디자인을 콘텐츠와 미디어 구조까지 넓혀 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '경제학과': {
      track_category: '경제/시장/데이터해석',
      card: '시장 원리와 자원 배분, 경기 흐름을 지표와 데이터로 읽는 학과입니다.',
      fit: '수치와 그래프를 바탕으로 시장 변화와 정책 효과를 해석하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '경제학과는 소비와 생산, 물가와 고용, 환율과 금리, 국제 교역과 정책 효과를 이론과 데이터로 분석하는 학과입니다.',
      core_keywords: ['경제학','시장','지표','정책','환율','데이터해석'],
      recommended_keywords: ['경제','공통수학1','통합사회','영어','정보'],
      subjects: ['경제', '공통수학1', '통합사회', '영어', '정보'],
      topics: ['금리 변화가 소비와 투자에 미치는 영향 분석', '환율 변동이 수출입 산업 구조에 주는 효과 비교', '경제 지표를 활용한 경기 국면 해석과 정책 효과 탐구'],
      group_label: '경제·시장 분석',
      compare_profiles: [
        { display_name: '금융학과', track_category: '금융/투자/자산관리', focus: '금융시장과 투자 상품, 자산 운용 구조를 배우며 돈의 흐름을 실무적으로 다루는 학과입니다.', hint: '시장 전체 구조보다 금융상품과 투자 의사결정에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '국제통상학과', track_category: '국제통상/무역/글로벌시장', focus: '무역, 수출입, 글로벌 시장 구조와 통상 정책을 실무적으로 배우는 학과입니다.', hint: '경제 이론을 국제 거래와 통상 흐름까지 넓혀 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '응용통계학과', track_category: '통계/데이터/정량분석', focus: '확률과 통계 모델을 바탕으로 데이터를 정량적으로 해석하는 학과입니다.', hint: '경제 현상을 수학적 모델과 데이터 분석으로 더 깊게 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '금융학과': {
      track_category: '금융/투자/자산관리',
      card: '금융시장과 투자, 자산 운용, 금융상품 구조를 실무적으로 배우는 학과입니다.',
      fit: '돈의 흐름과 투자 판단, 금융시장 변화가 자산 가치에 주는 영향을 읽는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '금융학과는 예금·대출·주식·채권 같은 금융상품과 투자 의사결정, 금융시장 구조, 자산 관리, 위험 관리를 배우는 학과입니다.',
      core_keywords: ['금융학','투자','자산관리','금융시장','위험관리','금융상품'],
      recommended_keywords: ['경제','공통수학1','통합사회','영어','정보'],
      subjects: ['경제', '공통수학1', '통합사회', '영어', '정보'],
      topics: ['금리 변화가 금융상품 수익률에 미치는 영향 분석', '투자 포트폴리오 분산이 위험 관리에 주는 효과 비교', '디지털 금융 서비스가 소비자 선택을 바꾸는 방식 탐구'],
      group_label: '금융·투자 시스템',
      compare_profiles: [
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장 전체 구조와 정책 효과를 지표와 데이터로 해석하는 학과입니다.', hint: '금융시장보다 경제 전반의 흐름을 이론과 데이터로 읽고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '회계학과', track_category: '회계/재무/기업분석', focus: '기업 재무상태와 회계 처리, 재무제표 해석을 통해 기업의 돈 흐름을 읽는 학과입니다.', hint: '투자 판단보다 기업 내부의 재무 구조와 성과 분석에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경영정보학과', track_category: '경영/정보시스템/데이터', focus: '기업 운영을 정보시스템과 데이터 관점에서 분석하는 융합형 상경계열 학과입니다.', hint: '금융 서비스를 디지털 플랫폼과 데이터 시스템 관점에서 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '회계학과': {
      track_category: '회계/재무/기업분석',
      card: '회계 처리와 재무제표, 기업의 자금 흐름을 수치와 기준으로 해석하는 학과입니다.',
      fit: '기업의 성과와 비용 구조를 숫자와 기준으로 정확하게 읽고 해석하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '회계학과는 재무회계, 원가회계, 세무, 감사, 재무제표 분석을 배우며 기업의 자금 흐름과 성과를 수치로 해석하는 학과입니다.',
      core_keywords: ['회계학','재무제표','원가','세무','감사','기업분석'],
      recommended_keywords: ['경제', '공통수학1', '통합사회', '정보', '영어'],
      subjects: ['경제', '공통수학1', '통합사회', '정보', '영어'],
      topics: ['재무제표 항목 변화가 기업 건전성 해석에 미치는 영향 분석', '원가 구조 차이가 제품 가격과 수익성에 주는 효과 비교', '회계 기준 변화가 기업 보고 방식에 미치는 영향 탐구'],
      group_label: '회계·재무 관리',
      compare_profiles: [
        { display_name: '금융학과', track_category: '금융/투자/자산관리', focus: '금융시장과 투자 상품, 자산 운용 구조를 배우며 돈의 흐름을 실무적으로 다루는 학과입니다.', hint: '기업 내부 회계보다 금융시장과 투자 의사결정에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장 원리와 정책 효과를 이론과 데이터로 해석하는 학과입니다.', hint: '개별 기업의 수치보다 시장 전체의 흐름을 읽고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '경영정보학과', track_category: '경영/정보시스템/데이터', focus: '기업 운영과 의사결정을 정보시스템, 데이터 분석, 디지털 전략 관점에서 배우는 학과입니다.', hint: '회계 데이터를 시스템과 디지털 경영 도구로 연결해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '경영정보학과': {
      track_category: '경영/정보시스템/데이터',
      card: '기업 운영과 의사결정을 정보시스템, 데이터, 디지털 전략으로 해결하는 학과입니다.',
      fit: '경영 문제를 데이터와 시스템, 플랫폼 관점에서 풀어 보고 싶은 학생에게 잘 맞습니다.',
      intro: '경영정보학과는 기업 운영과 의사결정을 정보시스템, 데이터 분석, 디지털 전략, 플랫폼 관점에서 배우는 융합형 상경계열 학과입니다.',
      core_keywords: ['경영정보','정보시스템','데이터','디지털전략','플랫폼','의사결정'],
      recommended_keywords: ['정보', '경제', '공통수학1', '통합사회', '영어'],
      subjects: ['정보', '경제', '공통수학1', '통합사회', '영어'],
      topics: ['정보시스템이 기업 의사결정 속도에 미치는 영향 분석', '데이터 기반 고객 분석이 경영 전략을 바꾸는 방식 비교', '디지털 플랫폼 전환이 조직 운영 구조에 주는 효과 탐구'],
      group_label: '디지털경영·정보',
      compare_profiles: [
        { display_name: '경영학과', track_category: '경영/브랜드/서비스전략', focus: '기업 운영과 소비자, 시장 전략을 함께 보는 대표 상경계열 학과입니다.', hint: '디지털 시스템보다 조직 운영과 시장 전략 전반에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '회계학과', track_category: '회계/재무/기업분석', focus: '재무제표와 원가, 세무, 감사 관점에서 기업 성과를 수치로 해석하는 학과입니다.', hint: '정보시스템보다 숫자와 회계 기준으로 기업 상태를 읽고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '데이터사이언스학과', track_category: '데이터/통계/AI응용', focus: '데이터 수집·정제·분석·시각화를 바탕으로 의미 있는 의사결정을 돕는 학과입니다.', hint: '경영 문제를 넘어서 더 넓은 데이터 분석 기법 자체에 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '무역학과': {
      track_category: '무역/물류/국제거래',
      card: '국가 간 상품과 서비스 거래, 수출입 구조와 물류 흐름을 배우는 학과입니다.',
      fit: '국제 거래 구조와 수출입 실무, 물류 흐름을 현실 문제와 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '무역학과는 국가 간 상품과 서비스 거래, 수출입 구조, 물류, 관세와 계약, 무역 실무를 배우는 학과입니다.',
      core_keywords: ['무역학','수출입','물류','관세','계약','국제거래'],
      recommended_keywords: ['경제', '영어', '통합사회', '국제관계의 이해', '정보'],
      subjects: ['경제', '영어', '통합사회', '국제관계의 이해', '정보'],
      topics: ['환율과 물류비 변화가 수출입 구조에 미치는 영향 분석', '관세 제도 변화가 국제 거래 흐름에 주는 효과 비교', '디지털 무역 플랫폼이 중소기업 수출 방식에 미치는 변화 탐구'],
      group_label: '무역·국제거래',
      compare_profiles: [
        { display_name: '국제통상학과', track_category: '국제통상/무역/글로벌시장', focus: '무역, 통상 정책, 글로벌 시장 구조를 실무적으로 배우는 학과입니다.', hint: '거래 실무와 물류보다 국제 시장 전략과 통상 정책에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장 원리와 정책 효과를 이론과 데이터로 해석하는 학과입니다.', hint: '개별 거래 실무보다 시장 전체 흐름과 정책 효과를 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '글로벌경영학과', track_category: '경영/글로벌시장/브랜드전략', focus: '기업 경영을 국제시장과 글로벌 조직, 브랜드 전략까지 확장해 배우는 학과입니다.', hint: '무역 구조보다 글로벌 기업 운영과 해외 진출 전략에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '국제통상학과': {
      track_category: '국제통상/무역/글로벌시장',
      card: '무역, 통상 정책, 글로벌 시장 흐름을 함께 배우는 국제 거래 중심 학과입니다.',
      fit: '국제 시장과 통상 이슈, 수출입 구조를 전략과 정책 관점에서 보고 싶은 학생에게 잘 맞습니다.',
      intro: '국제통상학과는 무역, 수출입, 글로벌 시장 구조, 통상 정책, 국제 협상과 같은 국제 거래 흐름을 실무와 전략 관점에서 배우는 학과입니다.',
      core_keywords: ['국제통상','무역','글로벌시장','통상정책','협상','수출입'],
      recommended_keywords: ['경제', '영어', '통합사회', '국제관계의 이해', '정보'],
      subjects: ['경제', '영어', '통합사회', '국제관계의 이해', '정보'],
      topics: ['FTA와 통상 정책 변화가 산업 구조에 미치는 영향 분석', '글로벌 공급망 재편이 기업 수출 전략에 주는 효과 비교', '환율과 무역 분쟁이 국제 거래 흐름을 바꾸는 방식 탐구'],
      group_label: '국제통상·시장',
      compare_profiles: [
        { display_name: '무역학과', track_category: '무역/물류/국제거래', focus: '수출입 구조, 물류, 관세와 계약 등 무역 실무를 배우는 학과입니다.', hint: '국제 시장 전략보다 거래 과정과 물류 실무에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장 원리와 정책 효과를 이론과 데이터로 해석하는 학과입니다.', hint: '국제 거래보다 경제 전반의 구조와 정책 효과를 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '경영학과', track_category: '경영/브랜드/서비스전략', focus: '기업 운영과 소비자, 시장 전략을 함께 보는 대표 상경계열 학과입니다.', hint: '무역 구조보다 기업의 시장 전략과 조직 운영에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },

    '국어국문학과': {
      track_category: '국어/문학/텍스트해석',
      card: '한국어와 문학 작품, 글쓰기와 비평을 통해 언어와 문화의 의미를 읽는 학과입니다.',
      fit: '문학 작품의 표현 방식과 시대 맥락, 글쓰기와 비평 관점에 관심 있는 학생에게 잘 맞습니다.',
      intro: '국어국문학과는 한국어의 구조와 표현, 고전과 현대 문학, 글쓰기와 비평을 배우며 언어와 텍스트가 시대와 사회를 어떻게 담아내는지 탐구하는 학과입니다.',
      core_keywords: ['국어국문','문학','텍스트','비평','서사','언어'],
      recommended_keywords: ['공통국어','문학','화법과 언어','통합사회','영어'],
      subjects: ['공통국어','문학','화법과 언어','통합사회','영어'],
      topics: ['서사 구조 차이가 작품 해석에 미치는 영향 분석', '시대별 문학 표현 방식 비교와 사회 맥락 탐구', '비평 관점에 따라 같은 작품의 의미가 달라지는 방식 탐구'],
      group_label: '인문·어문·문화',
      compare_profiles: [
        { display_name: '영어영문학과', track_category: '영어/문학/글로벌텍스트', focus: '영어권 문학과 표현, 번역과 해석을 통해 언어와 문화를 폭넓게 다루는 학과입니다.', hint: '한국어 텍스트보다 영어권 텍스트와 번역, 글로벌 문화 해석에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '사학과', track_category: '역사/사료/시대해석', focus: '사료와 기록을 바탕으로 시대 변화와 사건의 맥락을 해석하는 학과입니다.', hint: '문학 텍스트보다 실제 기록과 역사 자료로 시대를 읽고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '문화콘텐츠학과', track_category: '문화/스토리/콘텐츠기획', focus: '문화와 이야기를 콘텐츠 기획과 산업 구조 관점에서 확장해 다루는 학과입니다.', hint: '텍스트 해석을 이야기 산업과 콘텐츠 기획으로 넓혀 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '영어영문학과': {
      track_category: '영어/문학/글로벌텍스트',
      card: '영어권 문학과 표현, 번역과 해석을 통해 언어와 문화를 폭넓게 읽는 학과입니다.',
      fit: '영어 텍스트를 깊게 읽고 표현과 번역, 글로벌 문화 맥락까지 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '영어영문학과는 영어의 구조와 표현, 영미 문학, 번역과 비평, 영어권 문화 텍스트를 배우며 언어와 문학을 통해 세계를 해석하는 학과입니다.',
      core_keywords: ['영어영문','영문학','텍스트해석','번역','비평','문화'],
      recommended_keywords: ['영어','공통국어','문학','통합사회','세계사'],
      subjects: ['영어','공통국어','문학','통합사회','세계사'],
      topics: ['번역 방식 차이가 작품 의미 전달에 주는 영향 분석', '영어권 문학 작품의 시대 배경과 주제 의식 비교', '같은 메시지가 언어 표현에 따라 다르게 읽히는 방식 탐구'],
      group_label: '인문·어문·문화',
      compare_profiles: [
        { display_name: '국어국문학과', track_category: '국어/문학/텍스트해석', focus: '한국어의 구조와 표현, 고전과 현대 문학을 통해 텍스트를 해석하는 학과입니다.', hint: '영어권 텍스트보다 한국어와 한국 문학을 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '국제통상학과', track_category: '국제통상/무역/글로벌시장', focus: '영어를 국제 거래, 통상 정책, 글로벌 시장 분석에 실무적으로 연결하는 학과입니다.', hint: '문학과 번역보다 영어를 국제 비즈니스와 시장 흐름에 연결해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '문화콘텐츠학과', track_category: '문화/스토리/콘텐츠기획', focus: '이야기와 문화 요소를 콘텐츠 기획과 매체 확장 관점에서 다루는 학과입니다.', hint: '문학 텍스트를 콘텐츠 산업과 스토리 기획으로 확장해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '사학과': {
      track_category: '역사/사료/시대해석',
      card: '사료와 기록을 바탕으로 사건과 시대 변화의 맥락을 해석하는 학과입니다.',
      fit: '역사 자료를 통해 시대 흐름과 사회 변화를 구조적으로 읽고 싶은 학생에게 잘 맞습니다.',
      intro: '사학과는 고대부터 현대까지의 역사, 사료 읽기, 시대 변화, 국가와 사회 구조를 배우며 기록과 증거를 통해 과거를 해석하는 학과입니다.',
      core_keywords: ['사학','역사','사료','시대해석','기록','변화'],
      recommended_keywords: ['세계사','한국사','통합사회','공통국어','영어'],
      subjects: ['세계사','한국사','통합사회','공통국어','영어'],
      topics: ['같은 사건을 서로 다른 사료가 기록하는 방식 비교', '시대 전환기 제도 변화가 사회 구조에 미친 영향 분석', '역사 서술 관점 차이가 사건 해석에 주는 효과 탐구'],
      group_label: '인문·어문·문화',
      compare_profiles: [
        { display_name: '철학과', track_category: '철학/사유/윤리', focus: '개념과 논증, 존재와 윤리 문제를 깊게 사고하는 학과입니다.', hint: '사건과 기록보다 개념과 사유의 구조를 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '국어국문학과', track_category: '국어/문학/텍스트해석', focus: '문학 작품과 글쓰기, 비평을 통해 텍스트와 시대 맥락을 해석하는 학과입니다.', hint: '역사 기록보다 문학 텍스트 속 시대상과 표현을 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '문헌정보학과', track_category: '문헌/정보조직/기록관리', focus: '자료와 기록, 정보 분류와 검색 체계를 배우며 지식 구조를 관리하는 학과입니다.', hint: '역사 해석보다 기록과 지식의 정리·보존·탐색 구조에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '철학과': {
      track_category: '철학/사유/윤리',
      card: '인간, 지식, 존재, 윤리 문제를 개념과 논증으로 깊게 사고하는 학과입니다.',
      fit: '정답을 외우기보다 개념을 끝까지 따지고 사고의 근거를 세우는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '철학과는 인간과 세계를 이해하기 위해 존재, 인식, 윤리, 정치, 언어 철학 등을 배우며 개념과 논증을 통해 질문을 깊게 탐구하는 학과입니다.',
      core_keywords: ['철학','사유','윤리','논증','개념','질문'],
      recommended_keywords: ['통합사회','정치와 법','공통국어','윤리와 사상','영어'],
      subjects: ['통합사회','정치와 법','공통국어','윤리와 사상','영어'],
      topics: ['같은 사회 문제를 서로 다른 윤리 관점이 해석하는 방식 비교', '언어 표현 차이가 개념 이해에 주는 영향 분석', '기술 발전이 인간 책임과 자유 개념을 어떻게 바꾸는지 탐구'],
      group_label: '인문·어문·문화',
      compare_profiles: [
        { display_name: '사학과', track_category: '역사/사료/시대해석', focus: '기록과 사료를 통해 사건과 시대 변화를 해석하는 학과입니다.', hint: '개념 논증보다 실제 사건과 역사 자료를 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '심리학과', track_category: '심리/실험/행동분석', focus: '인지·정서·행동의 원리를 실험과 데이터로 이해하는 학과입니다.', hint: '철학적 질문보다 인간 마음과 행동을 관찰·실험으로 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '국어국문학과', track_category: '국어/문학/텍스트해석', focus: '문학과 글쓰기, 비평을 통해 언어와 텍스트를 해석하는 학과입니다.', hint: '개념과 논증보다 텍스트와 표현을 통해 인간과 사회를 읽고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '문헌정보학과': {
      track_category: '문헌/정보조직/기록관리',
      card: '자료와 기록, 지식 분류와 검색 체계를 배우며 정보를 조직하고 연결하는 학과입니다.',
      fit: '책과 기록, 데이터와 정보 구조를 정리하고 필요한 지식을 찾기 쉽게 만드는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '문헌정보학과는 도서관·아카이브 자료, 기록 관리, 정보 검색, 분류 체계, 디지털 정보 서비스를 배우며 지식과 기록을 조직하는 학과입니다.',
      core_keywords: ['문헌정보','기록관리','정보검색','분류','아카이브','지식조직'],
      recommended_keywords: ['공통국어','정보','통합사회','영어','공통수학1'],
      subjects: ['공통국어','정보','통합사회','영어','공통수학1'],
      topics: ['분류 기준 차이가 정보 검색 효율에 미치는 영향 분석', '기록 보존 방식에 따라 자료 활용성이 달라지는 구조 탐구', '디지털 아카이브 서비스가 지식 접근 방식을 바꾸는 효과 비교'],
      group_label: '기록·지식관리',
      compare_profiles: [
        { display_name: '사학과', track_category: '역사/사료/시대해석', focus: '사료와 기록을 통해 과거 사건과 시대 흐름을 해석하는 학과입니다.', hint: '기록을 정리하는 것보다 기록 자체로 시대를 해석하고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '경영정보학과', track_category: '경영/정보시스템/데이터', focus: '정보시스템과 데이터 관점에서 조직 운영과 의사결정을 다루는 학과입니다.', hint: '지식 조직보다 기업 정보 시스템과 데이터 활용에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '미디어커뮤니케이션학과', track_category: '미디어/콘텐츠/사회분석', focus: '미디어, 정보 전달, 콘텐츠가 사회에 미치는 영향을 분석하는 학과입니다.', hint: '자료 보존보다 정보 전달 구조와 미디어 환경 변화에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '제품디자인학과': {
      track_category: '제품/형태/사용경험',
      card: '제품의 형태와 구조, 조작 방식, 사용 경험을 구체적으로 설계하는 학과입니다.',
      fit: '손에 잡히는 제품의 구조와 형태, 사용 편의성을 세밀하게 설계하고 싶은 학생에게 잘 맞습니다.',
      intro: '제품디자인학과는 생활용품, 가전, 디지털 기기 등의 형태와 구조, 조작 방식, 사용 경험을 구체적으로 설계하는 학과입니다.',
      subjects: ['미술', '정보', '공통수학1', '물리학', '통합사회'],
      topics: ['제품 조작 구조 차이가 사용 경험에 미치는 영향 분석', '형태 설계와 재료 선택이 제품 내구성에 주는 효과 비교', '사용자 불편을 해결하는 제품 리디자인 사례 탐구'],
      group_label: '건축·디자인 폭',
      compare_profiles: [
        { display_name: '산업디자인학과', track_category: '제품/사용자/디자인', focus: '사람이 사용하는 제품과 서비스의 형태, 기능, 사용 경험을 분석하고 설계하는 학과입니다.', hint: '제품 단위보다 산업 전반의 사용자 경험과 문제 해결에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '시각디자인학과', track_category: '시각/브랜드/콘텐츠', focus: '이미지, 편집, 브랜드, 콘텐츠 전달 방식을 시각적으로 설계하는 학과입니다.', hint: '제품 형태보다 시각 커뮤니케이션과 브랜드 경험에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '실내디자인학과', track_category: '실내/공간/인테리어', focus: '실내 공간의 동선과 분위기, 생활 경험을 중심으로 설계하는 학과입니다.', hint: '제품보다 공간과 생활 환경 디자인에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]

    },
    '연극영화과': {
      track_category: '연극/영화/연출',
      card: '연기와 연출, 장면 구성과 서사를 통해 무대와 스크린의 표현 방식을 배우는 학과입니다.',
      fit: '인물 감정과 장면 연출, 이야기 표현을 몸과 화면으로 풀어내는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '연극영화과는 연기, 연출, 희곡과 시나리오, 장면 구성, 캐릭터 해석을 배우며 무대와 영화가 이야기를 전달하는 방식을 탐구하는 학과입니다.',
      core_keywords: ['연극영화','연기','연출','장면구성','캐릭터해석','서사'],
      recommended_keywords: ['공통국어','문학','영어','미술','사회와 문화'],
      subjects: ['공통국어','문학','영어','미술','사회와 문화'],
      topics: ['같은 장면을 연기 방식에 따라 다르게 전달하는 효과 비교', '희곡과 시나리오 구조 차이가 인물 해석에 주는 영향 분석', '카메라 구도와 무대 동선이 감정 전달을 바꾸는 방식 탐구'],
      group_label: '공연·영상·예술',
      compare_profiles: [
        { display_name: '영화영상학과', track_category: '영화/영상/연출', focus: '카메라 구도와 편집, 영상 문법을 바탕으로 장면을 설계하는 학과입니다.', hint: '배우의 표현보다 장면 구성과 촬영·편집 방식에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '공연예술학과', track_category: '공연/무대/표현', focus: '무대, 공연 기획, 퍼포먼스 표현을 중심으로 현장형 예술을 배우는 학과입니다.', hint: '스크린보다 무대 표현과 공연 제작 과정에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '방송영상학과', track_category: '방송/영상제작/콘텐츠', focus: '방송 포맷, 영상 제작, 편집과 콘텐츠 흐름을 중심으로 매체 제작을 배우는 학과입니다.', hint: '극영화보다 방송·콘텐츠 제작 구조와 영상 편집에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '영화영상학과': {
      track_category: '영화/영상/연출',
      card: '카메라 구도와 편집, 영상 문법을 바탕으로 장면과 이야기를 설계하는 학과입니다.',
      fit: '촬영, 편집, 장면 전환과 영상 흐름을 통해 메시지를 구성하는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '영화영상학과는 영화와 영상 콘텐츠의 촬영, 편집, 사운드, 연출, 영상 문법을 배우며 화면이 이야기를 전달하는 방식을 탐구하는 학과입니다.',
      core_keywords: ['영화영상','촬영','편집','연출','영상문법','사운드'],
      recommended_keywords: ['미술','영어','공통국어','정보','통합사회'],
      subjects: ['미술','영어','공통국어','정보','통합사회'],
      topics: ['편집 리듬 차이가 장면 몰입도에 미치는 영향 분석', '카메라 구도 변화가 인물 감정 해석을 바꾸는 방식 비교', '사운드 설계가 영상 메시지 전달에 주는 효과 탐구'],
      group_label: '공연·영상·예술',
      compare_profiles: [
        { display_name: '연극영화과', track_category: '연극/영화/연출', focus: '연기와 장면 연출, 캐릭터 해석을 통해 무대와 영화 표현을 배우는 학과입니다.', hint: '영상 편집보다 배우 표현과 장면 연기에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '방송영상학과', track_category: '방송/영상제작/콘텐츠', focus: '방송 포맷과 영상 제작, 콘텐츠 흐름을 중심으로 매체 제작을 배우는 학과입니다.', hint: '영화보다 방송 콘텐츠와 포맷 제작 구조에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '애니메이션학과', track_category: '애니메이션/캐릭터/스토리보드', focus: '캐릭터와 움직임, 스토리보드와 작화 설계를 통해 영상 서사를 만드는 학과입니다.', hint: '실사 영상보다 캐릭터 기반 장면 구성과 움직임 표현에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '공연예술학과': {
      track_category: '공연/무대/표현',
      card: '무대, 공연 기획, 퍼포먼스 표현을 중심으로 현장형 예술을 배우는 학과입니다.',
      fit: '관객과 현장에서 만나는 무대 표현, 공연 흐름, 몸과 소리의 전달 방식에 관심 있는 학생에게 잘 맞습니다.',
      intro: '공연예술학과는 무대 연출, 퍼포먼스, 공연 기획, 음악과 움직임, 현장 제작을 배우며 공연이 관객과 소통하는 구조를 탐구하는 학과입니다.',
      core_keywords: ['공연예술','무대','퍼포먼스','공연기획','표현','현장제작'],
      recommended_keywords: ['음악','미술','공통국어','영어','통합사회'],
      subjects: ['음악','미술','공통국어','영어','통합사회'],
      topics: ['무대 동선 차이가 공연 몰입도에 미치는 영향 분석', '라이브 공연과 녹화 영상의 표현 방식 비교', '공연 기획 요소가 관객 경험을 바꾸는 방식 탐구'],
      group_label: '공연·영상·예술',
      compare_profiles: [
        { display_name: '연극영화과', track_category: '연극/영화/연출', focus: '연기와 연출, 장면 구성을 통해 이야기 표현을 배우는 학과입니다.', hint: '공연 전체 기획보다 인물과 장면의 드라마 표현에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '실용음악과', track_category: '실용음악/작곡/공연', focus: '보컬, 연주, 작곡과 무대 공연을 중심으로 음악 표현을 배우는 학과입니다.', hint: '연기와 무대 연출보다 음악 퍼포먼스와 사운드 표현에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '방송영상학과', track_category: '방송/영상제작/콘텐츠', focus: '방송 포맷, 영상 제작, 편집과 콘텐츠 흐름을 배우는 학과입니다.', hint: '현장 공연보다 매체 제작과 편집, 방송 송출 구조에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '방송영상학과': {
      track_category: '방송/영상제작/콘텐츠',
      card: '방송 포맷과 영상 제작, 편집과 콘텐츠 흐름을 중심으로 매체 제작을 배우는 학과입니다.',
      fit: '영상 편집, 콘텐츠 기획, 방송 제작 흐름과 시청자 반응을 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '방송영상학과는 방송 포맷, 촬영과 편집, 영상 제작, 스튜디오 운영, 콘텐츠 기획을 배우며 영상 매체가 메시지를 전달하는 방식을 이해하는 학과입니다.',
      core_keywords: ['방송영상','영상제작','편집','콘텐츠','포맷','송출'],
      recommended_keywords: ['정보','미술','영어','공통국어','통합사회'],
      subjects: ['정보','미술','영어','공통국어','통합사회'],
      topics: ['방송 포맷 차이가 시청자 몰입도에 미치는 영향 분석', '편집 방식이 영상 전달 속도와 이해도에 주는 효과 비교', '플랫폼 변화가 방송 콘텐츠 제작 구조를 바꾸는 방식 탐구'],
      group_label: '공연·영상·예술',
      compare_profiles: [
        { display_name: '영화영상학과', track_category: '영화/영상/연출', focus: '카메라 구도와 편집, 영상 문법을 바탕으로 장면을 설계하는 학과입니다.', hint: '방송 포맷보다 영화적 장면 구성과 연출에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '미디어커뮤니케이션학과', track_category: '미디어/콘텐츠/사회분석', focus: '미디어 구조와 정보 전달, 콘텐츠가 사회에 미치는 영향을 분석하는 학과입니다.', hint: '제작 실무보다 미디어 구조와 여론, 커뮤니케이션 효과 분석에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '시각디자인학과', track_category: '시각/브랜드/콘텐츠', focus: '이미지, 편집, 브랜드와 콘텐츠 전달 방식을 시각적으로 설계하는 학과입니다.', hint: '방송 포맷보다 화면 디자인과 시각 전달 구조에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '애니메이션학과': {
      track_category: '애니메이션/캐릭터/스토리보드',
      card: '캐릭터와 움직임, 스토리보드와 작화 설계를 통해 영상 서사를 만드는 학과입니다.',
      fit: '캐릭터 감정 표현, 움직임 연출, 그림과 장면 구성으로 이야기를 만드는 데 관심 있는 학생에게 잘 맞습니다.',
      intro: '애니메이션학과는 캐릭터 디자인, 스토리보드, 작화, 움직임 표현, 영상 연출을 배우며 그림과 시간의 흐름으로 이야기를 만드는 학과입니다.',
      core_keywords: ['애니메이션','캐릭터','스토리보드','작화','움직임','연출'],
      recommended_keywords: ['미술','공통국어','영어','정보','통합사회'],
      subjects: ['미술','공통국어','영어','정보','통합사회'],
      topics: ['캐릭터 표정 변화가 감정 전달에 미치는 영향 분석', '스토리보드 구성 차이가 장면 이해도에 주는 효과 비교', '작화 방식과 움직임 표현이 몰입도를 바꾸는 방식 탐구'],
      group_label: '공연·영상·예술',
      compare_profiles: [
        { display_name: '시각디자인학과', track_category: '시각/브랜드/콘텐츠', focus: '이미지, 편집, 브랜드와 콘텐츠 전달 방식을 시각적으로 설계하는 학과입니다.', hint: '움직임 서사보다 정지 이미지와 전달 디자인에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '영화영상학과', track_category: '영화/영상/연출', focus: '촬영, 편집, 영상 문법을 통해 실사 장면을 설계하는 학과입니다.', hint: '캐릭터 기반 표현보다 실제 장면 촬영과 편집에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '문화콘텐츠학과', track_category: '문화/스토리/콘텐츠기획', focus: '이야기와 문화 요소를 콘텐츠 기획과 산업 구조 관점에서 다루는 학과입니다.', hint: '작화와 장면 연출보다 스토리 IP 기획과 콘텐츠 확장에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '실용음악과': {
      track_category: '실용음악/작곡/공연',
      card: '보컬, 연주, 작곡과 무대 공연을 중심으로 음악 표현을 배우는 학과입니다.',
      fit: '리듬과 멜로디, 무대 퍼포먼스, 사운드 표현을 실제 공연과 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '실용음악과는 보컬, 연주, 작곡, 편곡, 사운드와 무대 공연을 배우며 대중음악이 만들어지고 전달되는 방식을 탐구하는 학과입니다.',
      core_keywords: ['실용음악','보컬','연주','작곡','편곡','공연'],
      recommended_keywords: ['음악','영어','공통국어','미술','정보'],
      subjects: ['음악','영어','공통국어','미술','정보'],
      topics: ['편곡 방식 차이가 곡 분위기와 전달력에 미치는 영향 분석', '라이브 공연과 음원 제작의 표현 방식 비교', '사운드 구성 요소가 청자의 몰입도에 주는 효과 탐구'],
      group_label: '공연·영상·예술',
      compare_profiles: [
        { display_name: '공연예술학과', track_category: '공연/무대/표현', focus: '무대 연출과 퍼포먼스, 공연 기획을 중심으로 현장형 예술을 배우는 학과입니다.', hint: '음악 중심 공연보다 무대 전체 기획과 현장 표현에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '방송영상학과', track_category: '방송/영상제작/콘텐츠', focus: '방송 포맷과 영상 제작, 편집과 콘텐츠 흐름을 배우는 학과입니다.', hint: '음악 자체보다 음원 영상화와 방송 콘텐츠 제작에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '연극영화과', track_category: '연극/영화/연출', focus: '연기와 연출, 장면 구성과 서사를 통해 이야기 표현을 배우는 학과입니다.', hint: '음악 퍼포먼스보다 인물과 장면의 극적 표현에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '수학과': {
      track_category: '수학/모델링/증명',
      card: '수와 함수, 구조와 증명, 추상적 개념 사이의 관계를 논리적으로 탐구하는 학과입니다.',
      fit: '정답만 구하는 계산보다 개념의 구조와 증명 방식, 수학적 모델링 자체에 관심 있는 학생에게 잘 맞습니다.',
      intro: '수학과는 수와 함수, 구조와 증명, 추상화 개념의 관계를 논리적으로 탐구하는 학과입니다. 계산보다 개념이 왜 성립하는지와 증명이 어떤 구조로 이루어지는지 이해하는 데 가까운 학과입니다.',
      core_keywords: ['수학','증명','구조','추상화','함수','논리'],
      recommended_keywords: ['공통수학1','대수','미적분','확률과 통계','정보'],
      subjects: ['공통수학1','대수','미적분','확률과 통계','정보'],
      topics: ['함수와 변수 개념이 과학 모델링에 적용되는 방식 분석', '추상적 구조를 활용한 문제 해결 방식 비교', '증명 과정이 수학적 판단 기준을 만드는 방식 탐구'],
      group_label: '수학·모델링',
      compare_profiles: [
        { display_name: '물리학과', track_category: '물리/이론/실험', focus: '자연 현상의 법칙을 수식과 실험으로 설명하는 학과입니다.', hint: '증명 중심 수학보다 자연 법칙을 수식과 실험으로 확인해 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '통계학과', track_category: '통계/확률/데이터해석', focus: '확률과 표본, 추정을 바탕으로 데이터를 해석하는 학과입니다.', hint: '추상적 구조보다 데이터와 불확실성 해석에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '응용통계학과', track_category: '응용통계/모델링/데이터분석', focus: '현실 데이터 문제를 통계 모델과 정량 분석으로 해결하는 학과입니다.', hint: '순수 수학보다 실제 데이터와 모델 적용에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '물리학과': {
      track_category: '물리/이론/실험',
      card: '힘, 운동, 파동, 전기와 에너지 같은 자연 법칙을 수식과 실험으로 탐구하는 학과입니다.',
      fit: '관찰한 현상을 공식만 외우는 것이 아니라, 왜 그런 법칙이 성립하는지 이론과 실험으로 확인하고 싶은 학생에게 잘 맞습니다.',
      intro: '물리학과는 고전역학, 전자기학, 파동과 광학, 열과 에너지, 현대물리 같은 주제를 배우며 자연을 이루는 기본 법칙을 수식과 실험으로 이해하는 학과입니다.',
      core_keywords: ['물리','힘','운동','에너지','파동','전자기'],
      recommended_keywords: ['물리학','미적분','공통수학1','정보'],
      subjects: ['물리학','미적분','공통수학1','정보'],
      topics: ['에너지 전환 과정이 물리 법칙과 어떻게 연결되는지 분석', '파동과 전자기 개념이 현대 기술에 적용되는 방식 비교', '물리 실험에서 오차와 측정 기준이 결과 해석에 미치는 영향 탐구'],
      group_label: '물리·자연 법칙',
      compare_profiles: [
        { display_name: '천문우주학과', track_category: '천문/우주/관측', focus: '별과 행성, 우주 구조를 관측 자료와 물리 법칙으로 해석하는 학과입니다.', hint: '실험실 물리보다 우주 규모의 현상을 관측과 계산으로 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '수학과', track_category: '수학/모델링/증명', focus: '구조와 증명, 추상적 개념의 관계를 논리적으로 탐구하는 학과입니다.', hint: '자연 현상보다 수식과 증명 구조 자체에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '전자공학과', track_category: '전자/회로/신호', focus: '회로, 신호, 센서, 전자 시스템을 설계하는 학과입니다.', hint: '물리 법칙을 장치와 회로 설계로 연결해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '통계학과': {
      track_category: '통계/확률/데이터해석',
      card: '확률과 표본, 추정과 검정을 바탕으로 데이터 속 불확실성과 패턴을 해석하는 학과입니다.',
      fit: '숫자를 계산하는 데서 끝나는 것이 아니라, 데이터가 말해 주는 결론이 얼마나 믿을 만한지 판단하고 싶은 학생에게 잘 맞습니다.',
      intro: '통계학과는 표본과 모집단, 확률분포, 추정과 검정, 회귀와 예측 같은 개념을 배우며 데이터에서 의미 있는 결론을 꺼내는 방법을 탐구하는 학과입니다.',
      core_keywords: ['통계','데이터','확률','표본','추정','분석'],
      recommended_keywords: ['확률과 통계','미적분','정보','경제'],
      subjects: ['확률과 통계','미적분','정보','경제'],
      topics: ['표본과 모집단의 차이가 해석 결과에 미치는 영향 분석', '데이터 시각화 방식에 따라 의미가 달라지는 사례 비교', '확률과 통계 모델이 사회 예측에 활용되는 구조 탐구'],
      group_label: '통계·데이터해석',
      compare_profiles: [
        { display_name: '응용통계학과', track_category: '응용통계/모델링/데이터분석', focus: '통계 모델을 현실 데이터 문제 해결과 의사결정에 더 직접 연결하는 학과입니다.', hint: '이론적 통계보다 실제 데이터 적용과 모델 운용에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장과 정책, 지표 변화를 이론과 데이터로 해석하는 학과입니다.', hint: '통계 기법 자체보다 경제 현상을 데이터로 읽는 데 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '데이터사이언스학과', track_category: '데이터/통계/AI응용', focus: '데이터 수집·정제·분석·시각화를 바탕으로 의미 있는 의사결정을 돕는 학과입니다.', hint: '통계 이론보다 분석 도구와 데이터 처리 전 과정에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '응용통계학과': {
      track_category: '응용통계/모델링/데이터분석',
      card: '현실 데이터를 모델링하고 해석해 문제 해결과 의사결정을 돕는 학과입니다.',
      fit: '통계 이론을 실제 데이터와 예측, 평가, 정책 판단에 연결해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '응용통계학과는 확률과 통계 이론을 바탕으로 데이터 분석, 예측 모델, 실험 설계, 평가 지표를 현실 문제 해결에 적용하는 학과입니다.',
      core_keywords: ['응용통계','모델링','데이터분석','예측','평가','추정'],
      recommended_keywords: ['확률과 통계','미적분','정보','경제'],
      subjects: ['확률과 통계','미적분','정보','경제'],
      topics: ['예측 모델 성능 지표 차이가 해석에 미치는 영향 분석', '실험 설계 방식이 결과 신뢰도에 주는 효과 비교', '사회·산업 데이터에 통계 모델을 적용하는 방식 탐구'],
      group_label: '통계·데이터해석',
      compare_profiles: [
        { display_name: '통계학과', track_category: '통계/확률/데이터해석', focus: '확률과 표본, 추정과 검정 같은 통계 원리를 더 이론적으로 탐구하는 학과입니다.', hint: '실제 적용보다 통계 원리와 수학적 기반을 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '데이터사이언스학과', track_category: '데이터/통계/AI응용', focus: '데이터 처리와 분석 도구, 시각화를 함께 다루는 학과입니다.', hint: '통계 모델뿐 아니라 데이터 엔지니어링과 AI 응용까지 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '경제학과', track_category: '경제/시장/데이터해석', focus: '시장과 정책, 지표 변화를 데이터로 해석하는 학과입니다.', hint: '통계 기법 자체보다 경제 현상 해석에 모델을 적용해 보고 싶은 학생에게 잘 맞습니다.' }
      ]
    },
    '체육학과': {
      track_category: '체육/운동과학/경기분석',
      card: '인체 움직임과 운동 수행 원리, 경기 분석을 바탕으로 체육 활동과 훈련을 이해하는 학과입니다.',
      fit: '운동을 잘하는 것에서 끝나는 것이 아니라, 몸의 움직임 원리와 경기 수행을 체계적으로 보고 싶은 학생에게 잘 맞습니다.',
      intro: '체육학과는 운동 생리, 운동 역학, 훈련 방법, 경기 분석 같은 내용을 배우며 신체 활동과 스포츠 수행을 과학적으로 이해하는 학과입니다.',
      core_keywords: ['체육','운동과학','경기분석','훈련','체력','움직임'],
      recommended_keywords: ['체육','생명과학','물리학','확률과 통계','정보'],
      subjects: ['체육','생명과학','물리학','확률과 통계','정보'],
      topics: ['훈련 강도 차이가 경기 수행과 회복에 미치는 영향 분석', '운동 자세 변화가 기록과 효율에 주는 효과 비교', '경기 데이터 지표로 선수 수행을 해석하는 방식 탐구'],
      group_label: '체육·스포츠·레저',
      search_aliases: ['체육과','스포츠학과','운동과학'],
      compare_profiles: [
        { display_name: '스포츠과학과', track_category: '스포츠과학/운동분석/퍼포먼스', focus: '운동 수행과 훈련 효과를 데이터와 과학적 분석으로 더 깊게 다루는 학과입니다.', hint: '경기 현장 경험보다 운동 분석과 퍼포먼스 향상 원리에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '사회체육학과', track_category: '생활체육/지도/건강증진', focus: '지역사회와 생활체육 현장에서 운동 프로그램을 기획하고 지도하는 학과입니다.', hint: '엘리트 경기 분석보다 생활체육 지도와 참여 확대에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '스포츠산업학과', track_category: '스포츠산업/마케팅/경영', focus: '스포츠를 경기 수행뿐 아니라 산업, 기획, 마케팅 관점까지 확장해 보는 학과입니다.', hint: '운동 수행 자체보다 스포츠 산업 구조와 운영 방식에도 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '스포츠과학과': {
      track_category: '스포츠과학/운동분석/퍼포먼스',
      card: '운동 수행을 생리·역학·데이터 분석으로 해석해 기록과 퍼포먼스를 높이는 학과입니다.',
      fit: '훈련과 운동을 감각으로만 보지 않고, 데이터와 과학 원리로 성과를 분석하고 싶은 학생에게 잘 맞습니다.',
      intro: '스포츠과학과는 운동 생리학, 운동 역학, 훈련 과학, 퍼포먼스 분석을 배우며 스포츠 수행을 데이터와 과학 모델로 이해하는 학과입니다.',
      core_keywords: ['스포츠과학','운동분석','퍼포먼스','훈련','생리','역학'],
      recommended_keywords: ['체육','생명과학','물리학','확률과 통계','정보'],
      subjects: ['체육','생명과학','물리학','확률과 통계','정보'],
      topics: ['운동 생리 지표 변화가 퍼포먼스에 미치는 영향 분석', '촬영 각도와 센서 데이터가 자세 평가에 주는 차이 비교', '경기 기록과 체력 지표를 함께 해석하는 방식 탐구'],
      group_label: '체육·스포츠·레저',
      search_aliases: ['운동과학과','스포츠사이언스'],
      compare_profiles: [
        { display_name: '체육학과', track_category: '체육/운동과학/경기분석', focus: '체육 활동과 경기 수행을 폭넓게 다루는 학과입니다.', hint: '분석 도구보다 운동 수행과 경기 자체를 더 넓게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '스포츠의학과', track_category: '스포츠의학/운동재활/건강평가', focus: '운동 손상 예방과 회복, 건강 평가를 의료·재활 관점으로 연결하는 학과입니다.', hint: '퍼포먼스 향상뿐 아니라 운동 손상과 회복 관리에도 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '물리치료학과', track_category: '재활/운동치료/기능회복', focus: '움직임 평가와 기능 회복을 통해 신체 회복을 돕는 학과입니다.', hint: '선수 퍼포먼스보다 운동을 통한 회복과 기능 재건에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '스포츠산업학과': {
      track_category: '스포츠산업/마케팅/경영',
      card: '스포츠를 경기 자체뿐 아니라 산업 운영, 마케팅, 이벤트 기획, 비즈니스 구조로 확장해 다루는 학과입니다.',
      fit: '스포츠를 좋아하지만 경기력보다 구단 운영, 브랜드, 팬 경험, 산업 구조에 더 관심 있는 학생에게 잘 맞습니다.',
      intro: '스포츠산업학과는 스포츠 마케팅, 이벤트 운영, 구단 비즈니스, 스포츠 소비자 행동을 배우며 스포츠를 산업과 서비스 관점에서 이해하는 학과입니다.',
      core_keywords: ['스포츠산업','마케팅','이벤트','구단운영','브랜드','팬경험'],
      recommended_keywords: ['경제','통합사회','영어','정보','확률과 통계'],
      subjects: ['경제','통합사회','영어','정보','확률과 통계'],
      topics: ['스포츠 이벤트 운영 방식 차이가 관람 경험에 미치는 영향 분석', '구단 브랜드 전략이 팬 참여도에 주는 효과 비교', '경기 데이터와 티켓·굿즈 소비를 연결해 보는 방식 탐구'],
      group_label: '체육·스포츠·레저',
      search_aliases: ['스포츠마케팅학과','스포츠경영학과'],
      compare_profiles: [
        { display_name: '체육학과', track_category: '체육/운동과학/경기분석', focus: '운동 수행과 경기 자체를 중심으로 배우는 학과입니다.', hint: '산업 운영보다 스포츠 수행과 지도에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '경영학과', track_category: '경영/브랜드/서비스전략', focus: '기업 운영과 소비자, 시장 전략을 폭넓게 다루는 대표 상경계열 학과입니다.', hint: '스포츠 산업에 한정되지 않고 일반 경영과 마케팅 전반을 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '미디어커뮤니케이션학과', track_category: '미디어/콘텐츠/사회분석', focus: '미디어와 콘텐츠가 사람과 사회에 미치는 영향을 분석하는 학과입니다.', hint: '스포츠 자체보다 스포츠 콘텐츠와 미디어 전략에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '사회체육학과': {
      track_category: '생활체육/지도/건강증진',
      card: '생활체육 프로그램을 기획하고 지도하며 지역사회 건강 증진과 운동 참여를 돕는 학과입니다.',
      fit: '선수 경기보다 생활체육 지도, 참여 확대, 건강 증진 프로그램 운영에 관심 있는 학생에게 잘 맞습니다.',
      intro: '사회체육학과는 생활체육 지도법, 운동 프로그램 기획, 건강 증진 활동을 배우며 지역사회에서 운동 참여를 넓히는 방법을 다루는 학과입니다.',
      core_keywords: ['생활체육','지도','건강증진','프로그램','참여','지역사회'],
      recommended_keywords: ['체육','생명과학','통합사회','보건','정보'],
      subjects: ['체육','생명과학','통합사회','보건','정보'],
      topics: ['연령별 운동 프로그램 차이가 참여 지속성에 미치는 영향 분석', '지역 체육 시설 접근성 차이가 생활체육 참여율에 주는 효과 비교', '건강 증진 목표에 맞춘 운동 지도 방식 탐구'],
      group_label: '체육·스포츠·레저',
      search_aliases: ['생활체육학과','체육지도학과'],
      compare_profiles: [
        { display_name: '체육학과', track_category: '체육/운동과학/경기분석', focus: '체육 활동과 경기 수행을 폭넓게 다루는 학과입니다.', hint: '생활체육 프로그램보다 운동 원리와 경기 수행 자체를 더 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '레저스포츠학과', track_category: '레저스포츠/야외활동/프로그램기획', focus: '야외 활동과 레저 프로그램을 기획하고 운영하는 학과입니다.', hint: '건강 증진 중심보다 레저 활동 기획과 현장 운영에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '스포츠산업학과', track_category: '스포츠산업/마케팅/경영', focus: '스포츠를 산업 운영과 서비스 관점까지 확장해 다루는 학과입니다.', hint: '생활체육 현장보다 스포츠 산업과 마케팅 구조에도 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '레저스포츠학과': {
      track_category: '레저스포츠/야외활동/프로그램기획',
      card: '야외 활동과 레저 프로그램을 기획하고 운영하며 체험 중심 스포츠 현장을 다루는 학과입니다.',
      fit: '경기 기록보다 활동 경험, 프로그램 기획, 현장 운영과 안전 관리에 관심 있는 학생에게 잘 맞습니다.',
      intro: '레저스포츠학과는 야외 스포츠, 레저 프로그램 기획, 안전 관리, 체험 활동 운영을 배우며 스포츠를 여가와 현장 운영 관점에서 다루는 학과입니다.',
      core_keywords: ['레저스포츠','야외활동','프로그램기획','안전관리','체험','운영'],
      recommended_keywords: ['체육','통합사회','지구과학','보건','영어'],
      subjects: ['체육','통합사회','지구과학','보건','영어'],
      topics: ['야외 스포츠 프로그램 구성이 참여 만족도에 미치는 영향 분석', '활동 안전 수칙 차이가 사고 예방에 주는 효과 비교', '계절·환경 조건 변화에 따른 레저 프로그램 운영 방식 탐구'],
      group_label: '체육·스포츠·레저',
      search_aliases: ['레저스포츠','레저학과'],
      compare_profiles: [
        { display_name: '사회체육학과', track_category: '생활체육/지도/건강증진', focus: '생활체육 참여 확대와 건강 증진 프로그램을 다루는 학과입니다.', hint: '현장 체험형 레저보다 생활체육 지도와 건강 증진에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '관광경영학과', track_category: '관광/서비스/기획', focus: '관광과 서비스 운영, 여행 경험 기획을 배우는 학과입니다.', hint: '스포츠 활동 자체보다 관광·레저 서비스 기획과 운영에도 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '체육학과', track_category: '체육/운동과학/경기분석', focus: '운동 수행과 경기 자체를 중심으로 배우는 학과입니다.', hint: '레저 체험보다 스포츠 수행 원리와 훈련에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '스포츠의학과': {
      track_category: '스포츠의학/운동재활/건강평가',
      card: '운동 손상 예방, 운동 처방, 회복 관리처럼 스포츠와 건강·재활이 만나는 영역을 다루는 학과입니다.',
      fit: '운동 능력 향상뿐 아니라 부상 예방과 회복, 건강 평가까지 함께 보고 싶은 학생에게 잘 맞습니다.',
      intro: '스포츠의학과는 운동 생리, 스포츠 손상, 운동 처방, 재활과 건강 평가를 배우며 스포츠 수행과 건강 관리를 연결하는 학과입니다.',
      core_keywords: ['스포츠의학','운동재활','건강평가','손상예방','운동처방','회복관리'],
      recommended_keywords: ['생명과학','보건','체육','물리학','정보'],
      subjects: ['생명과학','보건','체육','물리학','정보'],
      topics: ['운동 손상 유형 차이가 회복 프로그램 설계에 주는 영향 분석', '체력 평가 지표가 운동 처방 방식에 미치는 효과 비교', '경기 일정과 회복 관리 방식이 수행 유지에 주는 영향 탐구'],
      group_label: '체육·스포츠·레저',
      search_aliases: ['운동재활학과','스포츠재활학과'],
      compare_profiles: [
        { display_name: '스포츠과학과', track_category: '스포츠과학/운동분석/퍼포먼스', focus: '운동 수행과 훈련 효과를 데이터와 과학적 분석으로 다루는 학과입니다.', hint: '회복 관리보다 퍼포먼스 향상과 분석에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '물리치료학과', track_category: '재활/운동치료/기능회복', focus: '움직임 평가와 기능 회복을 통해 신체 회복을 돕는 학과입니다.', hint: '스포츠 현장보다는 환자 기능 회복과 재활 치료에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '체육학과', track_category: '체육/운동과학/경기분석', focus: '운동 수행과 경기 활동 전반을 폭넓게 다루는 학과입니다.', hint: '의학·재활보다 스포츠 수행 자체와 경기 분석에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    },
    '천문우주학과': {
      track_category: '천문/우주/관측',
      card: '별, 행성, 은하와 우주 구조를 관측 자료와 물리 법칙으로 해석하는 학과입니다.',
      fit: '우주 현상을 상상으로만 보는 것이 아니라, 관측 데이터와 물리 모델로 이해해 보고 싶은 학생에게 잘 맞습니다.',
      intro: '천문우주학과는 별과 행성, 은하와 우주 구조, 천체 관측과 우주 물리를 배우며 우주 현상을 데이터와 이론으로 해석하는 학과입니다.',
      core_keywords: ['천문','우주','관측','천체','은하','우주물리'],
      recommended_keywords: ['물리학','미적분','공통수학1','지구과학','정보'],
      subjects: ['물리학','미적분','공통수학1','지구과학','정보'],
      topics: ['관측 파장대 차이가 천체 정보 해석에 주는 영향 분석', '행성 운동 모델 차이가 궤도 예측에 미치는 효과 비교', '우주 관측 자료 처리 방식이 발견 가능성을 바꾸는 방식 탐구'],
      group_label: '천문·우주 관측',
      compare_profiles: [
        { display_name: '물리학과', track_category: '물리/이론/실험', focus: '자연 법칙을 이론과 실험으로 탐구하는 학과입니다.', hint: '우주 현상보다 보편적 물리 법칙 자체를 더 깊게 보고 싶은 학생에게 잘 맞습니다.' },
        { display_name: '지구환경과학과', track_category: '환경/기후/지구시스템', focus: '기후, 대기, 지질, 해양 같은 지구 시스템 변화를 데이터로 해석하는 학과입니다.', hint: '우주보다 지구 환경과 기후 시스템 변화에 더 관심 있는 학생에게 잘 맞습니다.' },
        { display_name: '수학과', track_category: '수학/모델링/증명', focus: '구조와 증명, 추상적 개념을 논리적으로 탐구하는 학과입니다.', hint: '관측 대상보다 수학적 모델과 계산 구조 자체에 더 관심 있는 학생에게 잘 맞습니다.' }
      ]
    }
  };

  const REMAINING_MISC_FIRSTPASS_OVERRIDES = {
    "고고학과": {
        "track": "고고/유물/역사해석",
        "core": [
            "고고학",
            "유물",
            "발굴",
            "유적",
            "해석",
            "보존"
        ],
        "subs": [
            "역사",
            "세계사",
            "통합사회",
            "공통국어",
            "정보"
        ],
        "topics": [
            "유물 출토 맥락 차이가 해석 결과에 미치는 영향 분석",
            "유적 보존 방식에 따라 역사 자료 활용도가 달라지는 구조 비교",
            "발굴 기록이 과거 생활상을 복원하는 데 주는 정보 탐구"
        ],
        "card": "유적과 유물을 통해 과거 사회와 문화를 복원하는 학과입니다.",
        "fit": "발굴 자료와 유물, 과거 생활 흔적을 근거로 시대를 해석하고 싶은 학생에게 잘 맞습니다.",
        "intro": "고고학과는 유적과 유물, 발굴 기록을 통해 과거 사회의 생활상과 문화, 교류 구조를 복원하고 해석하는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "사학과",
            "문화유산학과",
            "문헌정보학과"
        ],
        "search_aliases": [
            "고고",
            "고고학"
        ]
    },
    "노어노문학과": {
        "track": "노어/문학/문화이해",
        "core": [
            "러시아어",
            "문학",
            "문화",
            "텍스트",
            "번역",
            "표현"
        ],
        "subs": [
            "공통국어",
            "영어",
            "세계사",
            "통합사회",
            "정보"
        ],
        "topics": [
            "러시아 문학 작품 번역 차이가 의미 전달에 미치는 영향 분석",
            "언어 표현 방식이 문화 이해에 주는 효과 비교",
            "러시아권 사회 변화가 문학 작품 주제에 반영되는 방식 탐구"
        ],
        "card": "러시아어와 러시아권 문학·문화를 함께 배우는 학과입니다.",
        "fit": "언어 표현과 번역, 러시아권 문화와 문학을 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "노어노문학과는 러시아어를 익히고 러시아권 문학과 문화, 사회 맥락을 텍스트 해석과 번역을 통해 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "group_label": "러시아어·문학·지역이해",
        "compare": [
            "영어영문학과",
            "국어국문학과",
            "언어학과"
        ],
        "aliases": [
            "러시아어과",
            "러시아문학과",
            "노문과"
        ],
        "search_aliases": [
            "노어노문",
            "노문과",
            "노어과"
        ]
    },
    "독어독문학과": {
        "track": "독어/문학/문화이해",
        "core": [
            "독일어",
            "문학",
            "문화",
            "텍스트",
            "번역",
            "표현"
        ],
        "subs": [
            "공통국어",
            "영어",
            "세계사",
            "통합사회",
            "정보"
        ],
        "topics": [
            "독일어 번역 표현 차이가 문학 해석에 미치는 영향 분석",
            "독일권 사회 변동이 문학 주제에 반영되는 방식 비교",
            "문화 맥락 차이가 동일 표현 이해에 주는 효과 탐구"
        ],
        "card": "독일어와 독일권 문학·문화를 함께 배우는 학과입니다.",
        "fit": "언어 표현과 번역, 독일권 사회와 문학을 함께 읽고 싶은 학생에게 잘 맞습니다.",
        "intro": "독어독문학과는 독일어를 익히고 독일권 문학과 문화, 사상과 사회를 텍스트 해석과 번역을 통해 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "group_label": "독일어·문학·문화해석",
        "compare": [
            "영어영문학과",
            "국어국문학과",
            "언어학과"
        ],
        "aliases": [
            "독문과",
            "독일어과"
        ],
        "search_aliases": [
            "독어독문",
            "독문과",
            "독어과"
        ]
    },
    "문예창작학과": {
        "track": "문예/창작/서사구성",
        "core": [
            "문예창작",
            "서사",
            "인물",
            "구성",
            "문체",
            "창작"
        ],
        "subs": [
            "공통국어",
            "문학",
            "영어",
            "통합사회",
            "정보"
        ],
        "topics": [
            "시점 차이가 인물 해석에 주는 효과 분석",
            "서사 구조 변화가 독자 몰입 방식에 미치는 영향 비교",
            "대사와 묘사 비중 차이가 장면 전달에 주는 효과 탐구"
        ],
        "card": "소설·시·희곡 등 다양한 창작 형식을 통해 서사와 표현을 설계하는 학과입니다.",
        "fit": "이야기 구성과 문체, 인물 설계에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "문예창작학과는 소설, 시, 희곡 등 다양한 장르의 글쓰기를 통해 서사 구성과 문체, 창작 원리를 배우는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "국어국문학과",
            "문화콘텐츠학과",
            "연극영화과"
        ],
        "search_aliases": [
            "문예창작",
            "문창과"
        ]
    },
    "문화인류학과": {
        "track": "문화/인류/현장연구",
        "core": [
            "문화인류",
            "현지조사",
            "관습",
            "의례",
            "집단",
            "문화변동"
        ],
        "subs": [
            "통합사회",
            "사회와 문화",
            "세계사",
            "공통국어",
            "영어"
        ],
        "topics": [
            "문화권별 의례 차이가 공동체 관계 형성에 주는 영향 분석",
            "현지조사 기록 방식이 문화 해석에 미치는 효과 비교",
            "세계화가 지역 문화 변동에 미치는 영향 탐구"
        ],
        "card": "다양한 사회와 문화를 현지 조사와 비교 관점에서 배우는 학과입니다.",
        "fit": "사람들의 생활 방식과 문화 차이를 현장에서 관찰하고 해석해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "문화인류학과는 다양한 사회의 생활 방식, 관습, 의례, 문화 변동을 현지 조사와 비교 분석으로 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "사회학과",
            "사학과",
            "문화유산학과"
        ],
        "search_aliases": [
            "문화인류",
            "인류학과"
        ]
    },
    "문화유산학과": {
        "track": "문화유산/보존/기록해석",
        "core": [
            "문화유산",
            "보존",
            "기록",
            "복원",
            "유산관리",
            "전승"
        ],
        "subs": [
            "역사",
            "통합사회",
            "공통국어",
            "세계사",
            "정보"
        ],
        "topics": [
            "보존 환경 차이가 문화유산 훼손도에 미치는 영향 분석",
            "유산 기록 방식이 해설과 전시에 주는 효과 비교",
            "전승 방식 변화가 문화유산 인식에 미치는 영향 탐구"
        ],
        "card": "유형·무형 문화유산을 기록하고 보존·활용하는 학과입니다.",
        "fit": "과거의 흔적을 지키고 해석해 오늘의 문화로 연결하고 싶은 학생에게 잘 맞습니다.",
        "intro": "문화유산학과는 유형·무형 문화유산을 기록하고 보존하며 전승과 활용, 해설 방식을 함께 배우는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "고고학과",
            "사학과",
            "문화인류학과"
        ],
        "search_aliases": [
            "문화유산",
            "문화재학과"
        ]
    },
    "미학과": {
        "track": "미학/예술철학/감각해석",
        "core": [
            "미학",
            "예술",
            "감각",
            "아름다움",
            "해석",
            "가치"
        ],
        "subs": [
            "공통국어",
            "미술",
            "철학",
            "영어",
            "통합사회"
        ],
        "topics": [
            "표현 방식 차이가 아름다움 인식에 주는 영향 분석",
            "예술 작품 해석 기준이 시대에 따라 달라지는 구조 비교",
            "감각 경험과 가치 판단의 관계 탐구"
        ],
        "card": "예술과 아름다움, 감각과 가치 판단의 원리를 배우는 학과입니다.",
        "fit": "예술을 감상하는 데서 나아가 왜 아름답다고 느끼는지 근거를 따져 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "미학과는 예술과 아름다움, 감각 경험과 가치 판단의 원리를 철학적으로 탐구하는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "철학과",
            "시각디자인학과",
            "문화콘텐츠학과"
        ],
        "search_aliases": [
            "미",
            "예술철학과"
        ]
    },
    "불어불문학과": {
        "track": "불어/문학/문화이해",
        "core": [
            "프랑스어",
            "문학",
            "문화",
            "텍스트",
            "번역",
            "표현"
        ],
        "subs": [
            "공통국어",
            "영어",
            "세계사",
            "통합사회",
            "정보"
        ],
        "topics": [
            "번역 선택 차이가 문학 작품 해석에 미치는 영향 분석",
            "프랑스권 문화 코드가 표현 방식 이해에 주는 효과 비교",
            "사회 변화가 문학 주제에 반영되는 방식 탐구"
        ],
        "card": "프랑스어와 프랑스권 문학·문화를 함께 배우는 학과입니다.",
        "fit": "언어 표현과 번역, 문화적 맥락을 함께 읽고 싶은 학생에게 잘 맞습니다.",
        "intro": "불어불문학과는 프랑스어를 익히고 프랑스권 문학과 문화, 사회를 텍스트 해석과 번역을 통해 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "group_label": "프랑스어·문학·문화해석",
        "compare": [
            "영어영문학과",
            "국어국문학과",
            "언어학과"
        ],
        "aliases": [
            "불문과",
            "프랑스어과"
        ],
        "search_aliases": [
            "불어불문",
            "불문과",
            "불어과"
        ]
    },
    "신학과": {
        "track": "신학/종교/가치탐구",
        "core": [
            "신학",
            "종교",
            "가치",
            "해석",
            "공동체",
            "윤리"
        ],
        "subs": [
            "통합사회",
            "공통국어",
            "영어",
            "세계사",
            "윤리와 사상"
        ],
        "topics": [
            "종교 전통 차이가 가치관 형성에 주는 영향 분석",
            "경전 해석 방식이 공동체 윤리에 미치는 효과 비교",
            "현대 사회 문제를 바라보는 종교적 관점 탐구"
        ],
        "card": "종교와 신앙, 가치와 공동체의 의미를 배우는 학과입니다.",
        "fit": "삶의 의미와 공동체 윤리, 종교 전통을 깊이 있게 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "신학과는 종교 전통과 신앙, 공동체 윤리와 가치 문제를 배우며 인간과 세계를 신학적으로 해석하는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "철학과",
            "사회복지학과",
            "상담심리학과"
        ],
        "search_aliases": [
            "신"
        ]
    },
    "아랍어과": {
        "track": "아랍어/지역이해/국제소통",
        "core": [
            "아랍어",
            "문화",
            "번역",
            "의사소통",
            "지역이해",
            "표현"
        ],
        "subs": [
            "공통국어",
            "영어",
            "세계사",
            "통합사회",
            "정보"
        ],
        "topics": [
            "언어 표현 차이가 문화 이해에 주는 영향 분석",
            "중동 지역 이슈가 언어와 미디어 담론에 반영되는 방식 비교",
            "번역 선택이 의미 전달에 미치는 효과 탐구"
        ],
        "card": "아랍어와 중동 지역 문화·사회를 함께 배우는 학과입니다.",
        "fit": "언어 학습을 넘어 지역 이해와 국제 소통에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "아랍어과는 아랍어를 익히고 중동 지역의 문화와 사회, 국제 맥락을 언어와 번역을 통해 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "group_label": "아랍어·중동지역이해",
        "compare": [
            "국제통상학과",
            "정치외교학과",
            "영어영문학과"
        ],
        "aliases": [
            "아랍어학과"
        ],
        "search_aliases": [
            "아랍어"
        ]
    },
    "언어학과": {
        "track": "언어/구조/의미분석",
        "core": [
            "언어학",
            "음운",
            "문법",
            "의미",
            "구조",
            "언어변화"
        ],
        "subs": [
            "공통국어",
            "영어",
            "통합사회",
            "정보",
            "공통수학1"
        ],
        "topics": [
            "발음 체계 차이가 의미 구별에 주는 영향 분석",
            "문장 구조 변화가 의미 해석에 주는 효과 비교",
            "언어 변화가 사회와 문화 맥락에 따라 달라지는 방식 탐구"
        ],
        "card": "언어의 구조와 의미, 변화 원리를 과학적으로 탐구하는 학과입니다.",
        "fit": "말과 글을 쓰는 데서 나아가 언어가 어떤 구조로 의미를 만드는지 알고 싶은 학생에게 잘 맞습니다.",
        "intro": "언어학과는 음운, 문법, 의미, 언어 변화 원리를 분석하며 인간 언어의 구조를 과학적으로 탐구하는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "국어국문학과",
            "영어영문학과",
            "심리학과"
        ],
        "search_aliases": [
            "언어"
        ]
    },
    "일어일문학과": {
        "track": "일어/문학/문화이해",
        "core": [
            "일본어",
            "문학",
            "문화",
            "텍스트",
            "번역",
            "표현"
        ],
        "subs": [
            "공통국어",
            "영어",
            "세계사",
            "통합사회",
            "정보"
        ],
        "topics": [
            "번역 표현 차이가 작품 해석에 미치는 영향 분석",
            "일본 대중문화 코드가 텍스트 이해에 주는 효과 비교",
            "사회 변화가 문학 주제에 반영되는 방식 탐구"
        ],
        "card": "일본어와 일본 문학·문화를 함께 배우는 학과입니다.",
        "fit": "언어 표현과 문화 맥락, 번역에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "일어일문학과는 일본어를 익히고 일본 문학과 문화, 사회를 텍스트 해석과 번역을 통해 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "group_label": "일본어·문학·문화해석",
        "compare": [
            "영어영문학과",
            "국어국문학과",
            "언어학과"
        ],
        "aliases": [
            "일문과",
            "일본어과"
        ],
        "search_aliases": [
            "일어일문",
            "일문과",
            "일어과"
        ]
    },
    "중어중문학과": {
        "track": "중어/문학/문화이해",
        "core": [
            "중국어",
            "문학",
            "문화",
            "텍스트",
            "번역",
            "표현"
        ],
        "subs": [
            "공통국어",
            "영어",
            "세계사",
            "통합사회",
            "정보"
        ],
        "topics": [
            "중국어 번역 선택이 의미 전달에 주는 영향 분석",
            "중국 문화 코드가 문학 해석에 주는 효과 비교",
            "사회 변화가 텍스트 주제에 반영되는 방식 탐구"
        ],
        "card": "중국어와 중국권 문학·문화를 함께 배우는 학과입니다.",
        "fit": "언어 학습과 문화 이해, 번역에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "중어중문학과는 중국어를 익히고 중국권 문학과 문화, 사회를 텍스트 해석과 번역으로 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "group_label": "중국어·문학·동아시아이해",
        "compare": [
            "국제통상학과",
            "영어영문학과",
            "언어학과"
        ],
        "aliases": [
            "중문과",
            "중국어과"
        ],
        "search_aliases": [
            "중어중문",
            "중문과",
            "중어과"
        ]
    },
    "한국어학과": {
        "track": "한국어/언어구조/의미분석",
        "core": [
            "한국어학",
            "문법",
            "의미",
            "표현",
            "발음",
            "구조"
        ],
        "subs": [
            "공통국어",
            "영어",
            "정보",
            "통합사회",
            "공통수학1"
        ],
        "topics": [
            "문장 구조 차이가 의미 전달에 미치는 영향 분석",
            "표준어와 방언 차이가 의사소통에 주는 효과 비교",
            "발음 변화가 의미 구별에 미치는 영향 탐구"
        ],
        "card": "한국어의 구조와 의미, 표현 원리를 체계적으로 배우는 학과입니다.",
        "fit": "한국어를 잘 쓰는 데서 나아가 언어 구조를 깊이 있게 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "한국어학과는 한국어의 음운, 문법, 의미, 표현 구조를 분석하며 언어 원리를 체계적으로 배우는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "국어국문학과",
            "언어학과",
            "문헌정보학과"
        ],
        "search_aliases": [
            "한국어",
            "국어학과"
        ]
    },
    "한문학과": {
        "track": "한문/고전/문헌해석",
        "core": [
            "한문",
            "고전",
            "문헌",
            "한자",
            "해석",
            "사상"
        ],
        "subs": [
            "공통국어",
            "역사",
            "영어",
            "정보",
            "윤리와 사상"
        ],
        "topics": [
            "고전 문장 해석 차이가 의미 이해에 주는 영향 분석",
            "한자 문화권 사상이 현대 가치관에 미치는 효과 비교",
            "문헌 기록 방식이 시대 해석에 주는 영향 탐구"
        ],
        "card": "한문 고전과 문헌, 한자 문화권 사상을 배우는 학과입니다.",
        "fit": "고전 텍스트를 바탕으로 사상과 문화를 해석하고 싶은 학생에게 잘 맞습니다.",
        "intro": "한문학과는 한문 고전과 문헌을 읽고 해석하며 한자 문화권의 사상과 문화 전통을 배우는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "국어국문학과",
            "사학과",
            "철학과"
        ],
        "search_aliases": [
            "한문",
            "한문과"
        ]
    },
    "광고홍보학과": {
        "track": "광고/홍보/브랜드전략",
        "core": [
            "광고",
            "홍보",
            "브랜드",
            "캠페인",
            "전략",
            "소비자"
        ],
        "subs": [
            "통합사회",
            "공통국어",
            "영어",
            "정보",
            "미술"
        ],
        "topics": [
            "광고 메시지 구조 차이가 소비자 반응에 미치는 영향 분석",
            "브랜드 캠페인 전략 변화가 인식에 주는 효과 비교",
            "미디어 채널 차이가 홍보 성과에 미치는 영향 탐구"
        ],
        "card": "브랜드와 캠페인, 소비자 반응을 바탕으로 광고·홍보 전략을 배우는 학과입니다.",
        "fit": "메시지 기획과 브랜드 전략, 소비자 반응 해석에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "광고홍보학과는 브랜드 전략, 캠페인 기획, 홍보 메시지 설계와 소비자 반응 분석을 배우는 학과입니다.",
        "group": "미디어·콘텐츠",
        "compare": [
            "미디어커뮤니케이션학과",
            "경영학과",
            "시각디자인학과"
        ],
        "search_aliases": [
            "광고홍보"
        ]
    },
    "국제학부": {
        "track": "국제/글로벌/정책이해",
        "core": [
            "국제학",
            "글로벌",
            "국제관계",
            "문화이해",
            "전략",
            "소통"
        ],
        "subs": [
            "통합사회",
            "세계사",
            "영어",
            "정치와 법",
            "국제관계의 이해"
        ],
        "topics": [
            "국가별 문화 차이가 협력 전략에 주는 영향 분석",
            "국제 이슈가 지역 사회와 산업에 미치는 효과 비교",
            "글로벌 문제 해결에서 국제기구 역할 탐구"
        ],
        "card": "국가와 문화, 국제 이슈를 넓게 배우는 글로벌 융합형 학과입니다.",
        "fit": "국제관계와 글로벌 이슈를 폭넓게 읽고 싶은 학생에게 잘 맞습니다.",
        "intro": "국제학부는 국제정치와 문화, 글로벌 이슈와 지역 협력 구조를 폭넓게 배우는 융합형 학과입니다.",
        "group": "국제·통상",
        "compare": [
            "정치외교학과",
            "국제통상학과",
            "영어영문학과"
        ],
        "search_aliases": [
            "국제",
            "국제학과"
        ]
    },
    "도시행정학과": {
        "track": "도시행정/정책/지역운영",
        "core": [
            "도시행정",
            "정책",
            "지역운영",
            "공공서비스",
            "도시문제",
            "행정"
        ],
        "subs": [
            "통합사회",
            "정치와 법",
            "사회와 문화",
            "공통국어",
            "경제"
        ],
        "topics": [
            "도시 행정 정책이 생활권 서비스에 미치는 영향 분석",
            "지방정부 운영 방식 차이가 도시 문제 해결에 주는 효과 비교",
            "도시 재생 정책과 주민 참여 구조 탐구"
        ],
        "card": "도시 문제를 행정과 정책, 지역 운영 관점에서 배우는 학과입니다.",
        "fit": "도시 생활 문제를 제도와 정책으로 해결하는 데 관심 있는 학생에게 잘 맞습니다.",
        "intro": "도시행정학과는 도시 정책, 지역 행정, 공공서비스 운영을 배우며 도시 문제를 제도적으로 해결하는 학과입니다.",
        "group": "행정·정책·법",
        "compare": [
            "행정학과",
            "도시공학과",
            "사회학과"
        ],
        "search_aliases": [
            "도시행정"
        ]
    },
    "문화콘텐츠학과": {
        "track": "문화/스토리/콘텐츠기획",
        "core": [
            "문화콘텐츠",
            "스토리",
            "기획",
            "브랜드",
            "콘텐츠",
            "산업"
        ],
        "subs": [
            "공통국어",
            "통합사회",
            "미술",
            "영어",
            "정보"
        ],
        "topics": [
            "이야기 구조 차이가 콘텐츠 몰입에 미치는 영향 분석",
            "문화 트렌드 변화가 콘텐츠 기획 방향에 주는 효과 비교",
            "브랜드 요소가 콘텐츠 확장성에 미치는 영향 탐구"
        ],
        "card": "이야기와 문화 요소를 콘텐츠 기획과 산업 구조 관점에서 배우는 학과입니다.",
        "fit": "스토리와 기획을 산업과 연결해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "문화콘텐츠학과는 문화와 이야기 요소를 콘텐츠 기획과 산업 구조 관점에서 배우는 학과입니다.",
        "group": "미디어·콘텐츠",
        "compare": [
            "미디어커뮤니케이션학과",
            "국어국문학과",
            "애니메이션학과"
        ],
        "search_aliases": [
            "문화콘텐츠"
        ]
    },
    "미디어커뮤니케이션학과": {
        "track": "미디어/콘텐츠/사회분석",
        "core": [
            "미디어",
            "콘텐츠",
            "소통",
            "여론",
            "플랫폼",
            "사회분석"
        ],
        "subs": [
            "공통국어",
            "통합사회",
            "영어",
            "정보",
            "사회와 문화"
        ],
        "topics": [
            "플랫폼 변화가 뉴스 소비 방식에 미치는 영향 분석",
            "콘텐츠 형식 차이가 메시지 전달에 주는 효과 비교",
            "여론 형성 과정에서 미디어 구조가 하는 역할 탐구"
        ],
        "card": "미디어와 콘텐츠가 사회와 소통에 미치는 영향을 배우는 학과입니다.",
        "fit": "뉴스, 콘텐츠, 플랫폼 구조를 사회와 연결해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "미디어커뮤니케이션학과는 뉴스, 콘텐츠, 플랫폼, 여론 형성 구조를 배우며 미디어가 사회에 미치는 영향을 분석하는 학과입니다.",
        "group": "미디어·콘텐츠",
        "compare": [
            "신문방송학과",
            "광고홍보학과",
            "방송영상학과"
        ],
        "search_aliases": [
            "미디어커뮤니케이션"
        ]
    },
    "부동산학과": {
        "track": "부동산/도시/자산분석",
        "core": [
            "부동산",
            "도시",
            "자산",
            "시장",
            "개발",
            "정책"
        ],
        "subs": [
            "경제",
            "통합사회",
            "정치와 법",
            "공통수학1",
            "정보"
        ],
        "topics": [
            "금리 변화가 부동산 시장 구조에 미치는 영향 분석",
            "도시 개발 정책 차이가 지역 가치에 주는 효과 비교",
            "자산 유형별 수익 구조와 위험 요소 탐구"
        ],
        "card": "토지와 건물, 도시 개발과 자산 가치 구조를 함께 배우는 학과입니다.",
        "fit": "도시 공간과 자산 시장, 개발 정책을 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "부동산학과는 토지와 건물, 도시 개발, 자산 가치와 시장 구조를 배우며 부동산을 경제와 제도 관점에서 이해하는 학과입니다.",
        "group": "경제·금융·회계",
        "compare": [
            "경제학과",
            "도시공학과",
            "행정학과"
        ],
        "search_aliases": [
            "부동산",
            "부동산학"
        ]
    },
    "세무학과": {
        "track": "세무/조세/기업재무",
        "core": [
            "세무",
            "조세",
            "세금",
            "재무",
            "신고",
            "절세"
        ],
        "subs": [
            "경제",
            "공통수학1",
            "통합사회",
            "정보",
            "영어"
        ],
        "topics": [
            "세율 변화가 기업 의사결정에 미치는 영향 분석",
            "조세 제도 차이가 소비와 투자에 주는 효과 비교",
            "신고 절차와 세무 정보 정리 방식 탐구"
        ],
        "card": "세금과 조세 제도, 신고와 기업 재무를 중심으로 배우는 학과입니다.",
        "fit": "숫자와 제도, 기업의 세무 구조를 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "세무학과는 조세 제도와 세금 신고, 기업 재무와 세무 관리 구조를 배우는 학과입니다.",
        "group": "경제·금융·회계",
        "compare": [
            "회계학과",
            "경제학과",
            "행정학과"
        ],
        "search_aliases": [
            "세무",
            "조세학과"
        ]
    },
    "식품자원경제학과": {
        "track": "식품자원/경제/유통정책",
        "core": [
            "식품자원",
            "유통",
            "정책",
            "시장",
            "가격",
            "지역경제"
        ],
        "subs": [
            "경제",
            "통합사회",
            "공통수학1",
            "정보",
            "사회와 문화"
        ],
        "topics": [
            "식품 가격 변동이 생산자와 소비자에 주는 영향 분석",
            "유통 구조 차이가 지역 농산물 경쟁력에 미치는 효과 비교",
            "식량 정책 변화가 자원 관리에 주는 영향 탐구"
        ],
        "card": "식품과 자원, 유통과 시장 구조를 경제 관점에서 배우는 학과입니다.",
        "fit": "식품 생산을 넘어 자원과 유통, 가격 구조를 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "식품자원경제학과는 식품과 자원의 생산·유통·가격 구조를 경제와 정책 관점에서 배우는 학과입니다.",
        "group": "식품·농업·환경생명",
        "compare": [
            "농업경제학과",
            "식품공학과",
            "경제학과"
        ],
        "search_aliases": [
            "식품자원경제",
            "식품경제학과"
        ]
    },
    "신문방송학과": {
        "track": "신문/방송/저널리즘",
        "core": [
            "신문방송",
            "저널리즘",
            "보도",
            "콘텐츠",
            "매체",
            "여론"
        ],
        "subs": [
            "공통국어",
            "통합사회",
            "영어",
            "정보",
            "사회와 문화"
        ],
        "topics": [
            "기사 구조 차이가 독자 이해에 주는 영향 분석",
            "보도 형식 변화가 여론 형성에 미치는 효과 비교",
            "방송 콘텐츠 편성 구조가 시청자 반응에 주는 영향 탐구"
        ],
        "card": "보도와 매체 콘텐츠, 저널리즘 구조를 배우는 학과입니다.",
        "fit": "뉴스와 방송이 사회에 미치는 영향, 기사와 콘텐츠 구성에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "신문방송학과는 보도와 저널리즘, 방송 콘텐츠와 매체 구조를 배우며 뉴스와 방송이 사회에 미치는 영향을 분석하는 학과입니다.",
        "group": "미디어·콘텐츠",
        "compare": [
            "미디어커뮤니케이션학과",
            "언론정보학과",
            "광고홍보학과"
        ],
        "search_aliases": [
            "신문방송"
        ]
    },
    "언론정보학과": {
        "track": "언론/정보/미디어분석",
        "core": [
            "언론정보",
            "보도",
            "정보",
            "미디어",
            "분석",
            "여론"
        ],
        "subs": [
            "공통국어",
            "통합사회",
            "영어",
            "정보",
            "사회와 문화"
        ],
        "topics": [
            "보도 자료 구성 차이가 정보 신뢰도에 미치는 영향 분석",
            "미디어 정보 흐름 구조가 사회 이슈 확산에 주는 효과 비교",
            "언론 플랫폼 변화가 뉴스 소비 방식에 주는 영향 탐구"
        ],
        "card": "언론과 정보 흐름, 미디어 분석을 함께 배우는 학과입니다.",
        "fit": "보도와 정보 전달 구조를 함께 읽고 싶은 학생에게 잘 맞습니다.",
        "intro": "언론정보학과는 언론 보도와 정보 전달 구조, 미디어 흐름과 사회 이슈 확산 구조를 함께 배우는 학과입니다.",
        "group": "미디어·콘텐츠",
        "compare": [
            "신문방송학과",
            "미디어커뮤니케이션학과",
            "문헌정보학과"
        ],
        "search_aliases": [
            "언론정보",
            "언론학과"
        ]
    },
    "지리학과": {
        "track": "지리/공간/지역분석",
        "core": [
            "지리학",
            "공간",
            "지역",
            "지도",
            "환경",
            "분포"
        ],
        "subs": [
            "통합사회",
            "세계시민과 지리",
            "지구과학",
            "공통국어",
            "정보"
        ],
        "topics": [
            "지역 분포 차이가 산업과 인구 구조에 주는 영향 분석",
            "지도 표현 방식이 공간 이해에 미치는 효과 비교",
            "도시와 농촌의 공간 구조 변화 탐구"
        ],
        "card": "공간과 지역, 인간과 환경의 관계를 지도와 자료로 배우는 학과입니다.",
        "fit": "지도를 바탕으로 지역과 공간 구조를 해석하고 싶은 학생에게 잘 맞습니다.",
        "intro": "지리학과는 공간과 지역, 인간과 환경의 관계를 지도와 자료 분석을 통해 이해하는 학과입니다.",
        "group": "인문·어문·문화",
        "compare": [
            "지구환경과학과",
            "도시공학과",
            "관광경영학과"
        ],
        "search_aliases": [
            "지리"
        ]
    },
    "대기과학과": {
        "track": "대기/기상/기후분석",
        "core": [
            "대기",
            "기상",
            "기후",
            "대기순환",
            "예보",
            "관측"
        ],
        "subs": [
            "지구과학",
            "물리학",
            "공통수학1",
            "정보",
            "화학"
        ],
        "topics": [
            "대기 순환 구조 차이가 지역 기후에 주는 영향 분석",
            "기압과 바람 변화가 날씨 예측에 주는 효과 비교",
            "기후 자료 해석 방식이 장기 변화 이해에 주는 영향 탐구"
        ],
        "card": "기상과 기후, 대기 순환을 자료와 모델로 배우는 학과입니다.",
        "fit": "날씨와 기후 변화를 관측 자료와 과학 모델로 해석하고 싶은 학생에게 잘 맞습니다.",
        "intro": "대기과학과는 기상과 기후, 대기 순환과 예측 구조를 관측 자료와 과학 모델로 배우는 학과입니다.",
        "group": "자연과학·수리탐구",
        "compare": [
            "지구환경과학과",
            "물리학과",
            "해양학과"
        ],
        "search_aliases": [
            "대기",
            "대기과",
            "기상학과"
        ]
    },
    "미생물학과": {
        "track": "미생물/세포/실험분석",
        "core": [
            "미생물",
            "세포",
            "배양",
            "유전자",
            "감염",
            "실험"
        ],
        "subs": [
            "생명과학",
            "화학",
            "정보",
            "공통수학1",
            "통합과학1"
        ],
        "topics": [
            "배양 조건 차이가 미생물 성장에 미치는 영향 분석",
            "미생물 반응 차이가 환경 변화에 주는 효과 비교",
            "실험 조건 통제가 결과 해석에 주는 영향 탐구"
        ],
        "card": "보이지 않는 미생물 세계를 실험과 분석으로 배우는 학과입니다.",
        "fit": "작은 생명체의 성장과 반응을 실험으로 확인해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "미생물학과는 세균과 곰팡이, 바이러스와 같은 미생물의 구조와 생장, 반응 원리를 실험으로 배우는 학과입니다.",
        "group": "자연과학·수리탐구",
        "compare": [
            "생물학과",
            "생명과학과",
            "식품공학과"
        ],
        "search_aliases": [
            "미생물"
        ]
    },
    "생물학과": {
        "track": "생물/생태/기초탐구",
        "core": [
            "생물학",
            "세포",
            "유전",
            "생태",
            "진화",
            "분석"
        ],
        "subs": [
            "생명과학",
            "화학",
            "공통수학1",
            "정보",
            "통합과학1"
        ],
        "topics": [
            "생물 종 차이가 생태 관계에 미치는 영향 분석",
            "유전 형질 변화가 집단 특성에 주는 효과 비교",
            "생태계 구조 변화가 개체군에 미치는 영향 탐구"
        ],
        "card": "생명체의 구조와 기능, 생태와 진화를 폭넓게 배우는 기초과학 학과입니다.",
        "fit": "생명 현상을 넓고 기초적으로 탐구하고 싶은 학생에게 잘 맞습니다.",
        "intro": "생물학과는 생명체의 구조와 기능, 생태와 진화를 폭넓게 배우며 생명 현상의 원리를 탐구하는 학과입니다.",
        "group": "자연과학·수리탐구",
        "compare": [
            "생명과학과",
            "미생물학과",
            "생명공학과"
        ],
        "search_aliases": [
            "생물"
        ]
    },
    "수산생명의학과": {
        "track": "수산/생명/질병관리",
        "core": [
            "수산생명",
            "질병관리",
            "양식",
            "수생생물",
            "면역",
            "검사"
        ],
        "subs": [
            "생명과학",
            "화학",
            "정보",
            "통합사회",
            "공통수학1"
        ],
        "topics": [
            "양식 환경 차이가 수생생물 건강에 미치는 영향 분석",
            "질병 관리 방식이 생산성과 안전성에 주는 효과 비교",
            "수질 조건 변화가 생물 면역 반응에 미치는 영향 탐구"
        ],
        "card": "수생 생물의 건강과 질병, 양식 환경을 함께 배우는 학과입니다.",
        "fit": "수산 생물의 건강과 질병 관리를 생명과학적으로 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "수산생명의학과는 어류와 수생 생물의 건강, 질병 관리, 양식 환경을 배우며 수산 생명체를 의학과 생명과학 관점에서 이해하는 학과입니다.",
        "group": "식품·농업·환경생명",
        "compare": [
            "동물자원학과",
            "생명공학과",
            "식품공학과"
        ],
        "search_aliases": [
            "수산생명의"
        ]
    },
    "식물자원학과": {
        "track": "식물/자원/재배관리",
        "core": [
            "식물",
            "재배",
            "품종",
            "토양",
            "생장",
            "자원"
        ],
        "subs": [
            "생명과학",
            "화학",
            "정보",
            "가정",
            "공통수학1"
        ],
        "topics": [
            "재배 환경 차이가 식물 성장에 미치는 영향 분석",
            "품종 차이가 생산성과 저장성에 주는 효과 비교",
            "토양 조건 변화가 식물 자원 활용에 미치는 영향 탐구"
        ],
        "card": "식물의 생장과 재배, 품종과 자원 활용을 배우는 학과입니다.",
        "fit": "식물 성장과 재배 환경을 데이터와 현장 관점에서 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "식물자원학과는 식물의 생장과 재배, 품종과 토양, 자원 활용 구조를 배우는 학과입니다.",
        "group": "식품·농업·환경생명",
        "compare": [
            "원예생명과학과",
            "산림자원학과",
            "생명공학과"
        ],
        "search_aliases": [
            "식물자원"
        ]
    },
    "원예학과": {
        "track": "원예/재배/품질관리",
        "core": [
            "원예",
            "식물",
            "재배",
            "품질",
            "환경",
            "관리"
        ],
        "subs": [
            "생명과학",
            "화학",
            "가정",
            "정보",
            "공통수학1"
        ],
        "topics": [
            "재배 환경 차이가 원예 작물 품질에 미치는 영향 분석",
            "품종 선택 방식이 생산성에 주는 효과 비교",
            "원예 관리 기준 차이가 저장성과 유통에 미치는 영향 탐구"
        ],
        "card": "원예 작물의 재배와 품질 관리, 생산 환경을 배우는 학과입니다.",
        "fit": "식물 재배와 품질 관리, 현장 운영에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "원예학과는 원예 작물의 재배와 품질 관리, 생산 환경을 배우며 식물 생산 구조를 이해하는 학과입니다.",
        "group": "식품·농업·환경생명",
        "compare": [
            "원예생명과학과",
            "식물자원학과",
            "조경학과"
        ],
        "search_aliases": [
            "원예"
        ]
    },
    "응용수학과": {
        "track": "응용수학/모델링/계산",
        "core": [
            "응용수학",
            "모델링",
            "계산",
            "최적화",
            "시뮬레이션",
            "해석"
        ],
        "subs": [
            "공통수학1",
            "미적분",
            "확률과 통계",
            "정보",
            "물리학"
        ],
        "topics": [
            "모델링 가정 차이가 결과 해석에 미치는 영향 분석",
            "최적화 기준 변화가 해결 방식에 주는 효과 비교",
            "수학적 계산과 시뮬레이션이 실제 문제 해결에 연결되는 구조 탐구"
        ],
        "card": "수학을 실제 현상과 시스템 문제에 적용하는 학과입니다.",
        "fit": "수학 개념을 현실 문제와 데이터, 모델링으로 연결하고 싶은 학생에게 잘 맞습니다.",
        "intro": "응용수학과는 수학 개념을 모델링과 계산, 최적화와 시뮬레이션으로 확장해 실제 문제를 해결하는 학과입니다.",
        "group": "자연과학·수리탐구",
        "compare": [
            "수학과",
            "통계학과",
            "컴퓨터공학과"
        ],
        "search_aliases": [
            "응용수",
            "응용수학"
        ]
    },
    "의류학과": {
        "track": "의류/패션/소비자이해",
        "core": [
            "의류",
            "패션",
            "소재",
            "착용감",
            "소비자",
            "기획"
        ],
        "subs": [
            "미술",
            "가정",
            "정보",
            "통합사회",
            "공통수학1"
        ],
        "topics": [
            "소재 차이가 착용감과 기능성에 미치는 영향 분석",
            "패션 트렌드 변화가 소비자 선택에 주는 효과 비교",
            "의류 기획 구조가 브랜드 경험에 미치는 영향 탐구"
        ],
        "card": "의류 소재와 착용, 패션과 소비자 반응을 함께 배우는 학과입니다.",
        "fit": "옷의 기능과 미감, 소비자 선택 구조를 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "의류학과는 의류 소재와 기능, 착용감과 패션 기획, 소비자 반응 구조를 함께 배우는 학과입니다.",
        "group": "건축·디자인",
        "compare": [
            "산업디자인학과",
            "소비자학과",
            "화장품공학과"
        ],
        "search_aliases": [
            "의류"
        ]
    },
    "조경학과": {
        "track": "조경/공간/환경설계",
        "core": [
            "조경",
            "공간",
            "생태",
            "설계",
            "식재",
            "환경"
        ],
        "subs": [
            "미술",
            "생명과학",
            "지구과학",
            "정보",
            "공통수학1"
        ],
        "topics": [
            "식재 구조 차이가 공간 이용 경험에 미치는 영향 분석",
            "생태 설계 요소가 환경 보전에 주는 효과 비교",
            "조경 계획 기준 변화가 생활 환경에 미치는 영향 탐구"
        ],
        "card": "식물과 공간, 생태와 생활 환경을 함께 설계하는 학과입니다.",
        "fit": "자연 요소를 공간 설계와 연결해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "조경학과는 식물과 공간, 생태와 생활 환경을 함께 설계하며 자연과 인간의 관계를 공간적으로 이해하는 학과입니다.",
        "group": "건축·디자인",
        "compare": [
            "건축학과",
            "원예생명과학과",
            "산림자원학과"
        ],
        "search_aliases": [
            "조경"
        ]
    },
    "해양학과": {
        "track": "해양/해수/환경분석",
        "core": [
            "해양학",
            "해수",
            "순환",
            "생태",
            "기후",
            "관측"
        ],
        "subs": [
            "지구과학",
            "화학",
            "물리학",
            "정보",
            "공통수학1"
        ],
        "topics": [
            "해수 순환 차이가 해양 생태에 미치는 영향 분석",
            "염분과 수온 변화가 해양 구조에 주는 효과 비교",
            "기후 변화가 해양 환경에 미치는 영향 탐구"
        ],
        "card": "바다의 구조와 순환, 해양 환경과 생태를 배우는 학과입니다.",
        "fit": "바다와 기후, 해양 생태를 자료와 과학 모델로 해석해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "해양학과는 바다의 구조와 순환, 해양 환경과 생태를 배우며 해양 시스템을 자료와 과학 모델로 이해하는 학과입니다.",
        "group": "자연과학·수리탐구",
        "compare": [
            "지구환경과학과",
            "대기과학과",
            "해양공학과"
        ],
        "search_aliases": [
            "해양",
            "해양과학과"
        ]
    },
    "건설시스템공학과": {
        "track": "건설/시스템/인프라설계",
        "core": [
            "건설시스템",
            "인프라",
            "구조",
            "시공",
            "설계",
            "운영"
        ],
        "subs": [
            "물리학",
            "미적분",
            "공통수학1",
            "정보",
            "통합과학1"
        ],
        "topics": [
            "구조 설계 기준 차이가 시설 안정성에 미치는 영향 분석",
            "시공 방식 변화가 공사 효율에 주는 효과 비교",
            "인프라 운영 시스템이 유지관리 비용에 미치는 영향 탐구"
        ],
        "card": "도시 기반시설을 구조와 시스템 관점에서 설계·운영하는 학과입니다.",
        "fit": "대형 시설을 구조뿐 아니라 운영 시스템까지 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "건설시스템공학과는 도로·교량·시설을 구조와 시공, 운영 시스템 관점에서 설계하고 관리하는 학과입니다.",
        "group": "도시·인프라",
        "compare": [
            "건설환경공학과",
            "토목환경공학과",
            "도시공학과"
        ],
        "search_aliases": [
            "건설시스템공",
            "건설시스템"
        ]
    },
    "교통공학과": {
        "track": "교통/이동/운영시스템",
        "core": [
            "교통공학",
            "이동",
            "수요",
            "신호",
            "운영",
            "안전"
        ],
        "subs": [
            "공통수학1",
            "미적분",
            "정보",
            "통합사회",
            "물리학"
        ],
        "topics": [
            "교통 신호 체계 차이가 혼잡도에 미치는 영향 분석",
            "대중교통 수요 변화가 도시 이동 구조에 주는 효과 비교",
            "교통 안전 기준 변화가 이용자 행동에 미치는 영향 탐구"
        ],
        "card": "사람과 물류의 이동, 교통 시스템 운영을 배우는 학과입니다.",
        "fit": "도시 이동 문제를 데이터와 시스템으로 해결하는 데 관심 있는 학생에게 잘 맞습니다.",
        "intro": "교통공학과는 사람과 물류의 이동 구조, 교통 수요와 신호 체계, 운영과 안전 시스템을 배우는 학과입니다.",
        "group": "도시·인프라",
        "compare": [
            "도시공학과",
            "산업공학과",
            "기계공학과"
        ],
        "search_aliases": [
            "교통공"
        ]
    },
    "기계시스템공학과": {
        "track": "기계/시스템/제어응용",
        "core": [
            "기계시스템",
            "설계",
            "동력",
            "제어",
            "구조",
            "운영"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "정보",
            "통합과학1",
            "영어"
        ],
        "topics": [
            "동력 전달 방식 차이가 시스템 효율에 미치는 영향 분석",
            "제어 기준 변화가 기계 성능에 주는 효과 비교",
            "구조 설계와 운영 조건이 안정성에 미치는 영향 탐구"
        ],
        "card": "기계 요소를 구조·동력·제어 시스템으로 확장해 배우는 학과입니다.",
        "fit": "기계를 부품이 아니라 전체 시스템으로 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "기계시스템공학과는 기계 요소를 구조와 동력, 제어와 운영 시스템 관점에서 배우는 학과입니다.",
        "group": "기계·전자·모빌리티",
        "compare": [
            "기계공학과",
            "메카트로닉스공학과",
            "자동차공학과"
        ],
        "search_aliases": [
            "기계시스템공",
            "기계시스템"
        ]
    },
    "메카트로닉스공학과": {
        "track": "메카트로닉스/제어/센서",
        "core": [
            "메카트로닉스",
            "센서",
            "제어",
            "기구",
            "임베디드",
            "통합설계"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "정보",
            "통합과학1",
            "영어"
        ],
        "topics": [
            "센서 피드백 구조 차이가 제어 성능에 미치는 영향 분석",
            "기구 설계와 전자 제어 결합이 시스템 효율에 주는 효과 비교",
            "임베디드 제어 기준 변화가 자동화 장치 동작에 미치는 영향 탐구"
        ],
        "card": "기계 구조와 전자 제어, 센서를 통합해 자동 시스템을 만드는 학과입니다.",
        "fit": "기계와 전자, 제어를 함께 다루는 융합 시스템에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "메카트로닉스공학과는 기계 구조와 전자 제어, 센서와 임베디드 시스템을 결합해 자동 시스템을 설계하는 학과입니다.",
        "group": "기계·전자·모빌리티",
        "compare": [
            "로봇공학과",
            "전자공학과",
            "기계공학과"
        ],
        "search_aliases": [
            "메카트로닉스공",
            "메카트로닉스"
        ]
    },
    "산업경영공학과": {
        "track": "산업경영/최적화/운영분석",
        "core": [
            "산업경영",
            "최적화",
            "생산",
            "데이터",
            "운영",
            "의사결정"
        ],
        "subs": [
            "공통수학1",
            "확률과 통계",
            "정보",
            "통합사회",
            "영어"
        ],
        "topics": [
            "운영 방식 차이가 생산성과 비용에 미치는 영향 분석",
            "데이터 해석 기준 변화가 의사결정에 주는 효과 비교",
            "공정 설계와 경영 기준 결합이 시스템 효율에 미치는 영향 탐구"
        ],
        "card": "생산과 운영, 데이터와 경영 판단을 함께 배우는 학과입니다.",
        "fit": "공학적 시스템과 경영 의사결정을 함께 연결해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "산업경영공학과는 생산과 운영 시스템, 데이터 분석과 경영 판단 구조를 함께 배우는 융합형 공학 학과입니다.",
        "group": "컴퓨터·AI·데이터",
        "compare": [
            "산업공학과",
            "경영정보학과",
            "데이터사이언스학과"
        ],
        "search_aliases": [
            "산업경영공"
        ]
    },
    "소방방재학과": {
        "track": "소방/방재/재난대응",
        "core": [
            "소방",
            "방재",
            "재난",
            "안전",
            "대응",
            "예방"
        ],
        "subs": [
            "물리학",
            "화학",
            "지구과학",
            "정보",
            "통합사회"
        ],
        "topics": [
            "재난 유형 차이가 대응 체계에 미치는 영향 분석",
            "예방 기준 변화가 사고 피해 저감에 주는 효과 비교",
            "위기 대응 시스템이 현장 안전성에 미치는 영향 탐구"
        ],
        "card": "재난과 화재, 예방과 대응 체계를 배우는 안전 계열 학과입니다.",
        "fit": "위기 상황과 안전 기준, 재난 대응 시스템에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "소방방재학과는 화재와 재난의 예방과 대응, 위기 관리와 방재 체계를 배우는 학과입니다.",
        "group": "도시·인프라",
        "compare": [
            "안전공학과",
            "건설환경공학과",
            "환경공학과"
        ],
        "search_aliases": [
            "소방방재"
        ]
    },
    "소프트웨어융합학과": {
        "track": "소프트웨어융합/서비스/응용",
        "core": [
            "소프트웨어융합",
            "개발",
            "응용",
            "서비스",
            "데이터",
            "시스템"
        ],
        "subs": [
            "정보",
            "공통수학1",
            "영어",
            "통합과학1",
            "물리학"
        ],
        "topics": [
            "앱 구조 차이가 사용자 경험에 미치는 영향 분석",
            "데이터 활용 방식이 서비스 성능에 주는 효과 비교",
            "소프트웨어 기능이 실제 산업 문제 해결에 연결되는 방식 탐구"
        ],
        "card": "소프트웨어를 다양한 산업과 서비스 문제에 연결해 배우는 학과입니다.",
        "fit": "개발 자체보다 소프트웨어 응용과 융합에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "소프트웨어융합학과는 소프트웨어 개발을 산업과 서비스, 데이터 응용 문제에 연결해 배우는 융합 학과입니다.",
        "group": "컴퓨터·AI·데이터",
        "compare": [
            "소프트웨어학과",
            "인공지능학과",
            "경영정보학과"
        ],
        "search_aliases": [
            "소프트웨어융합"
        ]
    },
    "안전공학과": {
        "track": "안전/위험분석/예방설계",
        "core": [
            "안전공학",
            "위험",
            "예방",
            "분석",
            "기준",
            "관리"
        ],
        "subs": [
            "물리학",
            "화학",
            "정보",
            "통합사회",
            "공통수학1"
        ],
        "topics": [
            "위험 요소 차이가 사고 발생 가능성에 미치는 영향 분석",
            "예방 기준 변화가 현장 안전성에 주는 효과 비교",
            "안전 관리 체계가 시스템 운영에 미치는 영향 탐구"
        ],
        "card": "위험 요소를 분석하고 사고를 예방하는 설계와 관리 기준을 배우는 학과입니다.",
        "fit": "위험을 수치와 구조로 보고 예방 기준을 세우는 데 관심 있는 학생에게 잘 맞습니다.",
        "intro": "안전공학과는 위험 요소 분석, 예방 설계, 안전 기준과 관리 체계를 배우는 학과입니다.",
        "group": "도시·인프라",
        "compare": [
            "소방방재학과",
            "환경공학과",
            "산업공학과"
        ],
        "search_aliases": [
            "안전공"
        ]
    },
    "원자력공학과": {
        "track": "원자력/에너지/발전시스템",
        "core": [
            "원자력",
            "발전",
            "핵분열",
            "안전",
            "에너지",
            "시스템"
        ],
        "subs": [
            "물리학",
            "화학",
            "공통수학1",
            "정보",
            "지구과학"
        ],
        "topics": [
            "발전 방식 차이가 에너지 효율에 미치는 영향 분석",
            "안전 기준 변화가 시스템 운영에 주는 효과 비교",
            "연료와 냉각 구조 차이가 발전 안정성에 미치는 영향 탐구"
        ],
        "card": "원자력 발전과 에너지 시스템, 안전 구조를 배우는 학과입니다.",
        "fit": "고에너지 시스템과 발전 구조, 안전 기준을 함께 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "원자력공학과는 원자력 발전 원리와 에너지 시스템, 안전과 운영 구조를 배우는 학과입니다.",
        "group": "화학·에너지·소재",
        "compare": [
            "에너지공학과",
            "전기공학과",
            "물리학과"
        ],
        "search_aliases": [
            "원자력공",
            "원자력"
        ]
    },
    "정보보안학과": {
        "track": "정보보안/해킹대응/시스템",
        "core": [
            "정보보안",
            "보안",
            "해킹대응",
            "암호",
            "시스템",
            "네트워크"
        ],
        "subs": [
            "정보",
            "공통수학1",
            "영어",
            "물리학",
            "통합사회"
        ],
        "topics": [
            "암호 방식 차이가 데이터 보호 수준에 미치는 영향 분석",
            "네트워크 구조 변화가 침해 대응에 주는 효과 비교",
            "보안 기준이 디지털 서비스 설계에 미치는 영향 탐구"
        ],
        "card": "디지털 시스템을 안전하게 지키는 보안 기술과 대응 구조를 배우는 학과입니다.",
        "fit": "공격과 방어, 암호와 시스템 보호 원리에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "정보보안학과는 디지털 시스템을 보호하기 위한 암호, 해킹 대응, 시스템·네트워크 보안 구조를 배우는 학과입니다.",
        "group": "보안·시스템",
        "compare": [
            "정보보호학과",
            "컴퓨터공학과",
            "소프트웨어학과"
        ],
        "search_aliases": [
            "정보보안",
            "보안학과"
        ]
    },
    "정보통신공학과": {
        "track": "정보통신/네트워크/신호",
        "core": [
            "정보통신",
            "통신",
            "네트워크",
            "신호",
            "센서",
            "전송"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "정보",
            "통합과학1",
            "영어"
        ],
        "topics": [
            "신호 전송 방식 차이가 통신 품질에 미치는 영향 분석",
            "네트워크 구조 변화가 데이터 전송 효율에 주는 효과 비교",
            "센서와 통신 결합 구조가 시스템 응답에 미치는 영향 탐구"
        ],
        "card": "정보 전달과 통신, 네트워크 시스템을 배우는 학과입니다.",
        "fit": "신호와 통신, 네트워크 구조를 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "정보통신공학과는 정보 전달과 통신, 네트워크와 신호 처리 구조를 배우는 학과입니다.",
        "group": "컴퓨터·AI·데이터",
        "compare": [
            "전자공학과",
            "컴퓨터공학과",
            "정보보호학과"
        ],
        "search_aliases": [
            "정보통신공",
            "통신공학과"
        ]
    },
    "조선해양공학과": {
        "track": "조선해양/선박/구조설계",
        "core": [
            "조선해양",
            "선박",
            "구조",
            "유체",
            "설계",
            "운항"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "미적분",
            "지구과학",
            "정보"
        ],
        "topics": [
            "선체 구조 차이가 운항 안정성에 미치는 영향 분석",
            "유체 저항 변화가 에너지 효율에 주는 효과 비교",
            "해양 환경 조건 차이가 설계 기준에 미치는 영향 탐구"
        ],
        "card": "선박과 해양 구조물의 설계와 운항 원리를 배우는 학과입니다.",
        "fit": "바다 위에서 움직이는 대형 시스템의 구조와 안정성을 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "조선해양공학과는 선박과 해양 구조물의 구조 설계, 유체와 운항 원리를 배우는 학과입니다.",
        "group": "기계·전자·모빌리티",
        "compare": [
            "해양공학과",
            "기계공학과",
            "전기공학과"
        ],
        "search_aliases": [
            "조선해양공",
            "조선해양"
        ]
    },
    "토목공학과": {
        "track": "토목/구조/인프라설계",
        "core": [
            "토목",
            "구조",
            "인프라",
            "시공",
            "측량",
            "재료"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "미적분",
            "정보",
            "통합과학1"
        ],
        "topics": [
            "구조 형식 차이가 하중 분산에 미치는 영향 분석",
            "재료 특성 변화가 시설 안전성에 주는 효과 비교",
            "측량 기준과 시공 순서가 공사 효율에 미치는 영향 탐구"
        ],
        "card": "도로와 교량, 기반시설 구조를 설계하고 시공하는 학과입니다.",
        "fit": "대형 구조물과 인프라를 설계 원리와 시공 관점에서 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "토목공학과는 도로와 교량, 기반시설의 구조 설계와 시공, 재료와 측량 원리를 배우는 학과입니다.",
        "group": "도시·인프라",
        "compare": [
            "토목환경공학과",
            "건설환경공학과",
            "도시공학과"
        ],
        "search_aliases": [
            "토목공"
        ]
    },
    "항공기계공학과": {
        "track": "항공기계/구조/동력",
        "core": [
            "항공기계",
            "구조",
            "동력",
            "유체",
            "설계",
            "비행체"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "미적분",
            "정보",
            "영어"
        ],
        "topics": [
            "기체 구조 차이가 비행 안정성에 미치는 영향 분석",
            "동력 시스템 변화가 추진 효율에 주는 효과 비교",
            "유체 흐름 차이가 비행체 제어에 미치는 영향 탐구"
        ],
        "card": "비행체의 구조와 동력, 기계 설계 원리를 배우는 학과입니다.",
        "fit": "비행체를 기계 구조와 동력 시스템 관점에서 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "항공기계공학과는 비행체의 구조와 동력, 유체와 기계 설계 원리를 배우는 학과입니다.",
        "group": "기계·전자·모빌리티",
        "compare": [
            "항공우주공학과",
            "기계공학과",
            "항공운항학과"
        ],
        "search_aliases": [
            "항공기계공",
            "항공기계"
        ]
    },
    "항공우주공학과": {
        "track": "항공우주/비행체/우주시스템",
        "core": [
            "항공우주",
            "비행체",
            "우주",
            "추진",
            "궤도",
            "설계"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "미적분",
            "정보",
            "영어"
        ],
        "topics": [
            "추진 방식 차이가 비행체 성능에 미치는 영향 분석",
            "궤도 조건 변화가 우주체 운용에 주는 효과 비교",
            "구조 설계 기준이 고도 환경 적응성에 미치는 영향 탐구"
        ],
        "card": "비행체와 우주 시스템의 구조와 운용 원리를 배우는 학과입니다.",
        "fit": "하늘과 우주를 기계와 물리 원리로 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "항공우주공학과는 비행체와 우주 시스템의 구조, 추진과 궤도, 운용 원리를 배우는 학과입니다.",
        "group": "기계·전자·모빌리티",
        "compare": [
            "천문우주학과",
            "항공기계공학과",
            "기계공학과"
        ],
        "search_aliases": [
            "항공우주공",
            "항공우주"
        ]
    },
    "항공정비학과": {
        "track": "항공정비/점검/안전관리",
        "core": [
            "항공정비",
            "점검",
            "안전",
            "정비",
            "기체",
            "엔진"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "정보",
            "영어",
            "통합과학1"
        ],
        "topics": [
            "정비 기준 차이가 항공기 안전성에 미치는 영향 분석",
            "기체 점검 순서 변화가 유지관리 효율에 주는 효과 비교",
            "엔진 상태 진단 방식이 운항 안정에 주는 영향 탐구"
        ],
        "card": "항공기의 기체와 엔진, 시스템 정비와 안전 관리를 배우는 학과입니다.",
        "fit": "비행보다 항공기 상태 점검과 안전 유지에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "항공정비학과는 항공기의 기체와 엔진, 시스템 정비와 안전 관리 구조를 배우는 학과입니다.",
        "group": "항공운항·비행시스템",
        "compare": [
            "항공운항학과",
            "기계공학과",
            "전자공학과"
        ],
        "search_aliases": [
            "항공정비"
        ]
    },
    "해양공학과": {
        "track": "해양공학/구조/시스템",
        "core": [
            "해양공학",
            "해양구조",
            "유체",
            "설계",
            "운영",
            "안전"
        ],
        "subs": [
            "물리학",
            "공통수학1",
            "미적분",
            "지구과학",
            "정보"
        ],
        "topics": [
            "해양 구조물 형식 차이가 안정성에 미치는 영향 분석",
            "파랑 조건 변화가 구조 설계에 주는 효과 비교",
            "운영 시스템 차이가 유지관리 효율에 미치는 영향 탐구"
        ],
        "card": "바다 위 구조물과 해양 시스템의 설계와 운영을 배우는 학과입니다.",
        "fit": "해양 환경 속 구조물과 시스템을 공학적으로 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "해양공학과는 바다 위 구조물과 해양 시스템의 설계, 유체와 안전, 운영 원리를 배우는 학과입니다.",
        "group": "기계·전자·모빌리티",
        "compare": [
            "조선해양공학과",
            "해양학과",
            "기계공학과"
        ],
        "search_aliases": [
            "해양공",
            "해양공학"
        ]
    },
    "화장품공학과": {
        "track": "화장품/소재/제품개발",
        "core": [
            "화장품공학",
            "소재",
            "제형",
            "피부",
            "품질",
            "개발"
        ],
        "subs": [
            "화학",
            "생명과학",
            "정보",
            "가정",
            "공통수학1"
        ],
        "topics": [
            "제형 차이가 사용감과 안정성에 미치는 영향 분석",
            "소재 구조 변화가 흡수와 보존성에 주는 효과 비교",
            "품질관리 기준이 제품 신뢰도에 미치는 영향 탐구"
        ],
        "card": "화장품 소재와 제형, 품질과 제품 개발을 배우는 학과입니다.",
        "fit": "뷰티 제품을 감각이 아니라 소재와 과학 원리로 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "화장품공학과는 화장품 소재와 제형, 피부 과학과 품질관리, 제품 개발 구조를 배우는 학과입니다.",
        "group": "화학·에너지·소재",
        "compare": [
            "화학공학과",
            "식품공학과",
            "의류학과"
        ],
        "search_aliases": [
            "화장품공"
        ]
    },
    "수의예과": {
        "track": "수의/동물의학/진료기초",
        "core": [
            "수의",
            "동물의학",
            "해부",
            "생리",
            "질병",
            "진료"
        ],
        "subs": [
            "생명과학",
            "화학",
            "공통수학1",
            "보건",
            "정보"
        ],
        "topics": [
            "동물 종 차이가 진단 기준에 미치는 영향 분석",
            "사육 환경 변화가 동물 건강에 주는 효과 비교",
            "예방접종 체계가 질병 관리에 미치는 영향 탐구"
        ],
        "card": "동물의 건강과 질병, 진단과 치료의 기초를 배우는 학과입니다.",
        "fit": "동물의 몸과 질병, 진료 구조를 의학적으로 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "수의예과는 동물의 해부와 생리, 질병과 진단, 치료의 기초를 배우며 동물의학 진로를 준비하는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "동물자원학과",
            "의예과",
            "생명과학과"
        ],
        "search_aliases": [
            "수의",
            "수의학과"
        ]
    },
    "약학과": {
        "track": "약학/약물/조제",
        "core": [
            "약학",
            "약물",
            "조제",
            "약효",
            "안전성",
            "복약"
        ],
        "subs": [
            "화학",
            "생명과학",
            "공통수학1",
            "정보",
            "보건"
        ],
        "topics": [
            "약물 구조 차이가 약효에 미치는 영향 분석",
            "복약 방식 변화가 안전성에 주는 효과 비교",
            "약물 전달 과정이 치료 효율에 미치는 영향 탐구"
        ],
        "card": "약물의 성질과 조제, 약효와 안전성을 배우는 학과입니다.",
        "fit": "약이 몸에 어떻게 작용하는지 화학과 생명과학 관점에서 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "약학과는 약물의 구조와 성질, 조제와 복약, 약효와 안전성을 배우는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "제약공학과",
            "화학과",
            "생명공학과"
        ],
        "search_aliases": [
            "약"
        ]
    },
    "응급구조학과": {
        "track": "응급구조/현장대응/처치",
        "core": [
            "응급구조",
            "현장대응",
            "기도관리",
            "평가",
            "처치",
            "이송"
        ],
        "subs": [
            "보건",
            "생명과학",
            "체육",
            "통합과학1",
            "정보"
        ],
        "topics": [
            "현장 평가 기준 차이가 응급 대응에 미치는 영향 분석",
            "이송 절차 변화가 환자 안정에 주는 효과 비교",
            "응급 장비 사용 기준이 처치 효율에 미치는 영향 탐구"
        ],
        "card": "응급 상황에서 환자를 평가하고 구조·이송하는 현장 중심 학과입니다.",
        "fit": "빠른 판단과 현장 대응, 생명 구조에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "응급구조학과는 응급 상황에서 환자를 평가하고 구조·이송하는 현장 대응과 처치 원리를 배우는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "간호학과",
            "보건관리학과",
            "스포츠의학과"
        ],
        "search_aliases": [
            "응급구조"
        ]
    },
    "한약학과": {
        "track": "한약/생약/약재이해",
        "core": [
            "한약학",
            "생약",
            "약재",
            "처방",
            "효능",
            "안전성"
        ],
        "subs": [
            "화학",
            "생명과학",
            "보건",
            "공통수학1",
            "정보"
        ],
        "topics": [
            "약재 조합 차이가 효능에 미치는 영향 분석",
            "생약 성분 변화가 안전성에 주는 효과 비교",
            "처방 기준 변화가 복용 방식에 미치는 영향 탐구"
        ],
        "card": "생약과 약재, 처방과 효능을 배우는 약학 계열 학과입니다.",
        "fit": "자연 유래 약재와 약효를 과학적으로 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "한약학과는 생약과 약재의 성질, 처방과 효능, 안전성과 복용 구조를 배우는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "약학과",
            "생명과학과",
            "식품영양학과"
        ],
        "search_aliases": [
            "한약"
        ]
    },
    "의예과": {
        "track": "의학/진단/치료기초",
        "core": [
            "의학",
            "진단",
            "질환",
            "치료",
            "해부",
            "생리"
        ],
        "subs": [
            "생명과학",
            "화학",
            "보건",
            "공통수학1",
            "정보"
        ],
        "topics": [
            "질환 원인 차이가 진단 과정에 미치는 영향 분석",
            "검사 결과 해석 기준 변화가 치료 선택에 주는 효과 비교",
            "인체 구조와 기능 관계가 질병 이해에 주는 영향 탐구"
        ],
        "card": "인체와 질병, 진단과 치료의 기초를 배우는 의학 진로 준비 학과입니다.",
        "fit": "사람의 몸과 질병, 치료 구조를 깊이 있게 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "의예과는 인체의 구조와 기능, 질병과 진단, 치료의 기초를 배우며 의학 진로를 준비하는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "생명과학과",
            "화학과",
            "간호학과"
        ],
        "search_aliases": [
            "의",
            "의학과"
        ]
    },
    "치기공학과": {
        "track": "치기공/보철/정밀제작",
        "core": [
            "치기공",
            "보철",
            "정밀제작",
            "치아구조",
            "재료",
            "복원"
        ],
        "subs": [
            "보건",
            "생명과학",
            "화학",
            "정보",
            "물리학"
        ],
        "topics": [
            "보철 재료 차이가 기능 회복에 미치는 영향 분석",
            "정밀 제작 기준이 복원 정확도에 주는 효과 비교",
            "치아 구조 이해가 기공 설계에 미치는 영향 탐구"
        ],
        "card": "치아 보철물과 정밀 제작, 복원 구조를 배우는 학과입니다.",
        "fit": "정밀 제작과 복원, 재료와 기능 회복에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "치기공학과는 치아 보철물의 재료와 정밀 제작, 복원 구조를 배우는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "치위생학과",
            "의공학과",
            "안경광학과"
        ],
        "search_aliases": [
            "치기공"
        ]
    },
    "치위생학과": {
        "track": "치위생/구강관리/예방",
        "core": [
            "치위생",
            "구강관리",
            "예방",
            "스케일링",
            "보건교육",
            "위생"
        ],
        "subs": [
            "보건",
            "생명과학",
            "화학",
            "공통수학1",
            "정보"
        ],
        "topics": [
            "구강 관리 습관 차이가 건강 상태에 미치는 영향 분석",
            "예방 교육 방식 변화가 실천율에 주는 효과 비교",
            "위생 기준이 치과 진료 보조에 미치는 영향 탐구"
        ],
        "card": "구강 건강 관리와 예방, 치과 위생 실무를 배우는 학과입니다.",
        "fit": "예방과 위생 관리, 치과 보건 교육에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "치위생학과는 구강 건강 관리와 예방, 치과 위생 실무와 보건 교육을 배우는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "치기공학과",
            "간호학과",
            "보건관리학과"
        ],
        "search_aliases": [
            "치위생"
        ]
    },
    "치의예과": {
        "track": "치의학/구강진단/치료기초",
        "core": [
            "치의학",
            "구강",
            "진단",
            "치료",
            "해부",
            "생리"
        ],
        "subs": [
            "생명과학",
            "화학",
            "보건",
            "공통수학1",
            "정보"
        ],
        "topics": [
            "구강 질환 유형 차이가 진단 과정에 미치는 영향 분석",
            "치아 구조 이해가 치료 선택에 주는 효과 비교",
            "예방 관리 기준이 구강 건강 유지에 미치는 영향 탐구"
        ],
        "card": "구강과 치아, 진단과 치료의 기초를 배우는 치의학 진로 준비 학과입니다.",
        "fit": "치아와 구강 구조, 진단과 치료에 관심 있는 학생에게 잘 맞습니다.",
        "intro": "치의예과는 구강과 치아의 구조와 기능, 질환과 진단, 치료의 기초를 배우며 치의학 진로를 준비하는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "의예과",
            "치기공학과",
            "치위생학과"
        ],
        "search_aliases": [
            "치의",
            "치의학과"
        ]
    },
    "한의예과": {
        "track": "한의학/진단/치료기초",
        "core": [
            "한의학",
            "진단",
            "처방",
            "경락",
            "생리",
            "치료"
        ],
        "subs": [
            "생명과학",
            "화학",
            "보건",
            "공통수학1",
            "정보"
        ],
        "topics": [
            "체질 차이가 처방 방식에 미치는 영향 분석",
            "진단 기준 변화가 치료 선택에 주는 효과 비교",
            "한의학 개념과 현대 생리 이해의 연결 구조 탐구"
        ],
        "card": "한의학의 진단과 처방, 치료 기초를 배우는 학과입니다.",
        "fit": "몸의 균형과 진단, 처방 구조를 폭넓게 이해하고 싶은 학생에게 잘 맞습니다.",
        "intro": "한의예과는 한의학의 진단과 처방, 치료의 기초를 배우며 몸의 균형과 질병 이해를 확장하는 학과입니다.",
        "group": "보건·임상",
        "compare": [
            "의예과",
            "한약학과",
            "생명과학과"
        ],
        "search_aliases": [
            "한의",
            "한의학과"
        ]
    },
    "전공자율선택제": {
        "track": "전공탐색/자율설계",
        "core": [
            "전공탐색",
            "자율선택",
            "기초이수",
            "진로설계",
            "융합",
            "탐색"
        ],
        "subs": [
            "통합사회",
            "공통국어",
            "영어",
            "정보",
            "공통수학1"
        ],
        "topics": [
            "전공 탐색 과정에서 필요한 자기 이해 기준 분석",
            "기초 과목 선택 방식이 향후 진로 설계에 주는 효과 비교",
            "융합 관심사가 전공 결정에 미치는 영향 탐구"
        ],
        "card": "여러 전공 기초를 탐색한 뒤 진로를 설계하는 선택형 제도입니다.",
        "fit": "처음부터 한 전공만 정하기보다 다양한 분야를 비교해 보고 싶은 학생에게 잘 맞습니다.",
        "intro": "전공자율선택제는 여러 전공 기초를 폭넓게 경험한 뒤 자신의 진로와 관심에 맞는 전공을 설계하는 제도입니다.",
        "group": "전공 탐색",
        "compare": [
            "공공인재학부",
            "국제학부",
            "소프트웨어융합학과"
        ],
        "search_aliases": []
    }
};

  Object.assign(MAJOR_COPY_OVERRIDES, REMAINING_MISC_FIRSTPASS_OVERRIDES);

  Object.assign(MAJOR_COPY_OVERRIDES, {
    "정보보안학과": {
      track_category: "보안/디지털시스템/네트워크",
      card: "디지털 시스템을 보호하기 위한 암호, 네트워크 보안, 해킹 대응 구조를 배우는 학과입니다.",
      fit: "공격과 방어, 데이터 보호, 네트워크와 시스템 보안 원리에 관심 있는 학생에게 잘 맞습니다.",
      intro: "정보보안학과는 디지털 시스템을 보호하기 위해 암호, 해킹 대응, 시스템·네트워크 보안 구조를 배우는 학과입니다.",
      core_keywords: ["정보보안","암호","해킹대응","네트워크","시스템보안","디지털보호"],
      recommended_keywords: ["정보","미적분","통합사회","영어","공통수학1"],
      subjects: ["정보","미적분","통합사회","영어","공통수학1"],
      topics: [
        "암호 방식 차이가 데이터 보호 수준에 미치는 영향 분석",
        "네트워크 구조 변화가 침해 대응에 주는 효과 비교",
        "보안 기준이 디지털 서비스 설계에 미치는 영향 탐구"
      ],
      group_label: "보안·디지털시스템",
      search_aliases: ["정보보안","보안학과"],
      compare_profiles: [
        { display_name: "정보보호학과", track_category: "보안/암호/시스템", focus: "해킹 대응, 암호, 시스템 보안을 통해 디지털 환경을 안전하게 지키는 학과입니다.", hint: "보안 전반의 원리와 방어 구조 자체를 더 깊게 이해하고 싶은 학생에게 잘 맞습니다." },
        { display_name: "컴퓨터공학과", track_category: "컴퓨터/시스템/개발", focus: "컴퓨터 구조와 운영체제, 네트워크, 알고리즘을 바탕으로 시스템을 설계하는 학과입니다.", hint: "프로그래밍과 시스템 구현을 함께 보고 싶은 학생에게 잘 맞습니다." },
        { display_name: "소프트웨어학과", track_category: "소프트웨어/개발/서비스", focus: "앱, 웹, 서비스 개발을 중심으로 실제 사용자를 위한 프로그램을 만드는 학과입니다.", hint: "보안뿐 아니라 서비스 구현과 사용자 경험에도 관심 있는 학생에게 잘 맞습니다." }
      ]
    },
    "소프트웨어융합학과": {
      track_category: "소프트웨어/AI/융합서비스",
      card: "소프트웨어를 다양한 산업과 서비스 문제에 연결해 배우는 융합형 학과입니다.",
      fit: "개발 자체보다 소프트웨어 응용, AI 활용, 산업 서비스 문제 해결에 관심 있는 학생에게 잘 맞습니다.",
      intro: "소프트웨어융합학과는 소프트웨어 개발을 산업과 서비스, 데이터 응용 문제에 연결해 배우는 융합 학과입니다.",
      core_keywords: ["소프트웨어융합","AI응용","서비스개발","데이터활용","시스템설계","문제해결"],
      recommended_keywords: ["정보","미적분","공통수학1","경제","통합과학1"],
      subjects: ["정보","미적분","공통수학1","경제","통합과학1"],
      topics: [
        "앱 구조 차이가 사용자 경험에 미치는 영향 분석",
        "데이터 활용 방식이 서비스 성능에 주는 효과 비교",
        "소프트웨어 기능이 실제 산업 문제 해결에 연결되는 방식 탐구"
      ],
      group_label: "소프트웨어·AI 융합",
      search_aliases: ["소프트웨어융합"],
      compare_profiles: [
        { display_name: "소프트웨어학과", track_category: "소프트웨어/개발/서비스", focus: "앱, 웹, 서비스 개발을 중심으로 실제 사용자를 위한 프로그램을 만드는 학과입니다.", hint: "융합 응용보다 순수한 소프트웨어 구현 자체에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "인공지능학과", track_category: "AI/데이터/모델링", focus: "데이터와 모델을 바탕으로 예측, 추천, 인식 같은 지능형 시스템을 만드는 학과입니다.", hint: "서비스 구현보다 AI 모델과 데이터 해석에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "경영정보학과", track_category: "경영/정보시스템/데이터", focus: "기업 운영과 의사결정을 정보시스템, 데이터, 디지털 전략으로 해결하는 학과입니다.", hint: "기술 구현을 서비스와 비즈니스 문제에 연결해 보고 싶은 학생에게 잘 맞습니다." }
      ]
    },
    "토목공학과": {
      track_category: "토목/구조/기반시설",
      card: "도로와 교량, 하천과 기반시설의 구조를 설계하고 시공하는 학과입니다.",
      fit: "대형 구조물과 기반시설을 설계 원리와 시공 관점에서 보고 싶은 학생에게 잘 맞습니다.",
      intro: "토목공학과는 도로와 교량, 기반시설의 구조 설계와 시공, 재료와 측량 원리를 배우는 학과입니다.",
      core_keywords: ["토목","구조","기반시설","시공","측량","재료"],
      recommended_keywords: ["물리학","미적분","정보","통합사회","공통수학1"],
      subjects: ["물리학","미적분","정보","통합사회","공통수학1"],
      topics: [
        "구조 형식 차이가 하중 분산에 미치는 영향 분석",
        "재료 특성 변화가 시설 안전성에 주는 효과 비교",
        "측량 기준과 시공 순서가 공사 효율에 미치는 영향 탐구"
      ],
      group_label: "토목·기반시설",
      search_aliases: ["토목공"],
      compare_profiles: [
        { display_name: "토목환경공학과", track_category: "토목/환경/인프라", focus: "도로·교량·하천·상하수도 같은 사회기반시설을 구조 설계와 수자원·환경 관리 관점에서 함께 배우는 학과입니다.", hint: "순수 구조 설계보다 하천·수자원·환경 관리까지 함께 보고 싶은 학생에게 잘 맞습니다." },
        { display_name: "건설환경공학과", track_category: "건설/환경/인프라", focus: "도시 기반시설의 설계·시공·유지관리를 배우며 수질·대기·폐기물 같은 환경 문제를 함께 해결하는 학과입니다.", hint: "기반시설 자체보다 환경 문제와 연결된 인프라 운영에도 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "도시공학과", track_category: "도시/교통/인프라", focus: "도시 공간과 주거·교통·환경·인프라를 생활권 전체의 구조에서 종합적으로 계획하는 학과입니다.", hint: "구조물 설계보다 도시계획과 생활권 인프라 전체 구조에 더 관심 있는 학생에게 잘 맞습니다." }
      ]
    },
    "건설시스템공학과": {
      track_category: "건설/시스템/인프라",
      card: "도시 기반시설을 구조와 시스템 관점에서 설계·운영하는 학과입니다.",
      fit: "대형 시설을 구조뿐 아니라 운영 시스템까지 함께 보고 싶은 학생에게 잘 맞습니다.",
      intro: "건설시스템공학과는 도로·교량·시설을 구조와 시공, 운영 시스템 관점에서 설계하고 관리하는 학과입니다.",
      core_keywords: ["건설시스템","인프라","구조","시공","유지관리","설계"],
      recommended_keywords: ["물리학","미적분","정보","통합과학1","공통수학1"],
      subjects: ["물리학","미적분","정보","통합과학1","공통수학1"],
      topics: [
        "구조 설계 기준 차이가 시설 안정성에 미치는 영향 분석",
        "시공 방식 변화가 공사 효율에 주는 효과 비교",
        "인프라 운영 시스템이 유지관리 비용에 미치는 영향 탐구"
      ],
      group_label: "건설·시스템·인프라",
      search_aliases: ["건설시스템공","건설시스템"],
      compare_profiles: [
        { display_name: "건설환경공학과", track_category: "건설/환경/인프라", focus: "도시 기반시설의 설계·시공·유지관리를 배우며 수질·대기·폐기물 같은 환경 문제를 함께 해결하는 학과입니다.", hint: "구조·시공뿐 아니라 환경 문제와 연결된 인프라 운영에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "토목공학과", track_category: "토목/구조/기반시설", focus: "도로와 교량, 기반시설의 구조 설계와 시공, 재료와 측량 원리를 배우는 학과입니다.", hint: "시스템 운영보다 구조 설계와 시공 원리를 더 깊게 보고 싶은 학생에게 잘 맞습니다." },
        { display_name: "도시공학과", track_category: "도시/교통/인프라", focus: "도시 공간과 주거·교통·환경·인프라를 생활권 전체의 구조에서 종합적으로 계획하는 학과입니다.", hint: "시설 구조보다 도시 전체 계획과 운영 구조에 더 관심 있는 학생에게 잘 맞습니다." }
      ]
    },
    "안전공학과": {
      track_category: "안전/리스크관리/방재",
      card: "위험 요소를 분석하고 사고를 예방하는 설계와 관리 기준을 배우는 학과입니다.",
      fit: "위험을 수치와 구조로 보고 예방 기준과 대응 체계를 세우는 데 관심 있는 학생에게 잘 맞습니다.",
      intro: "안전공학과는 위험 요소 분석, 예방 설계, 안전 기준과 관리 체계를 배우는 학과입니다.",
      core_keywords: ["안전공학","리스크","위험예방","사고분석","안전기준","관리체계"],
      recommended_keywords: ["물리학","화학","미적분","통합사회","정보"],
      subjects: ["물리학","화학","미적분","통합사회","정보"],
      topics: [
        "위험 요소 차이가 사고 발생 가능성에 미치는 영향 분석",
        "예방 기준 변화가 현장 안전성에 주는 효과 비교",
        "안전 관리 체계가 시스템 운영에 미치는 영향 탐구"
      ],
      group_label: "안전·방재·리스크관리",
      search_aliases: ["안전공"],
      compare_profiles: [
        { display_name: "소방방재학과", track_category: "소방/방재/재난대응", focus: "재난과 화재, 예방과 대응 체계를 배우는 안전 계열 학과입니다.", hint: "위험 분석 자체보다 재난 대응과 위기 관리 체계에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "환경공학과", track_category: "건설/환경/인프라", focus: "수질·대기·폐기물 같은 환경 문제를 공학적으로 해결하는 학과입니다.", hint: "사고 예방보다 환경 오염과 설비 관리 문제 해결에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "산업공학과", track_category: "최적화/시스템/데이터", focus: "생산·물류·서비스 시스템을 데이터와 최적화 기법으로 개선하는 학과입니다.", hint: "위험 관리보다 운영 효율과 시스템 개선에 더 관심 있는 학생에게 잘 맞습니다." }
      ]
    },
    "항공우주공학과": {
      track_category: "항공우주/비행체/추진",
      card: "비행체와 우주 시스템의 구조, 추진과 궤도, 운용 원리를 배우는 학과입니다.",
      fit: "하늘과 우주를 기계와 물리 원리로 이해하고 싶은 학생에게 잘 맞습니다.",
      intro: "항공우주공학과는 비행체와 우주 시스템의 구조, 추진과 궤도, 운용 원리를 배우는 학과입니다.",
      core_keywords: ["항공우주","비행체","추진","궤도","제어","우주시스템"],
      recommended_keywords: ["물리학","미적분","지구과학","정보","영어"],
      subjects: ["물리학","미적분","지구과학","정보","영어"],
      topics: [
        "추진 방식 차이가 비행체 성능에 미치는 영향 분석",
        "궤도 조건 변화가 우주체 운용에 주는 효과 비교",
        "구조 설계 기준이 고도 환경 적응성에 미치는 영향 탐구"
      ],
      group_label: "항공우주·비행체·추진",
      search_aliases: ["항공우주공","항공우주"],
      compare_profiles: [
        { display_name: "천문우주학과", track_category: "천문/우주/관측", focus: "별, 행성, 은하와 우주 구조를 관측 자료와 물리 법칙으로 해석하는 학과입니다.", hint: "비행체 설계보다 우주 현상 관측과 해석에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "항공기계공학과", track_category: "항공기계/구조/동력", focus: "비행체의 구조와 동력, 유체와 기계 설계 원리를 배우는 학과입니다.", hint: "우주 시스템보다 비행체 구조와 동력 설계에 더 관심 있는 학생에게 잘 맞습니다." },
        { display_name: "기계공학과", track_category: "기계/설계/동역학", focus: "기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.", hint: "비행·우주 특수성보다 일반 기계 설계와 동역학 원리에 더 관심 있는 학생에게 잘 맞습니다." }
      ]
    }
  });


Object.assign(MAJOR_COPY_OVERRIDES, {
  "항공기계공학과": {
    track_category: "항공기계/구조/동력",
    card: "비행체의 구조와 동력, 유체와 기계 설계 원리를 배우는 학과입니다.",
    fit: "비행체를 기계 구조와 동력 시스템 관점에서 이해하고 싶은 학생에게 잘 맞습니다.",
    intro: "항공기계공학과는 비행체의 구조와 동력, 유체와 기계 설계 원리를 배우는 학과입니다.",
    core_keywords: ["항공기계","항공기","구조","동력","기계시스템","비행"],
    recommended_keywords: ["물리학","미적분","통합과학1","정보","영어"],
    subjects: ["물리학","미적분","통합과학1","정보","영어"],
    topics: [
      "기체 구조 차이가 비행 안정성에 미치는 영향 분석",
      "동력 시스템 변화가 추진 효율에 주는 효과 비교",
      "유체 흐름 차이가 비행체 제어에 미치는 영향 탐구"
    ],
    group_label: "항공기계·구조·동력",
    search_aliases: ["항공기계공","항공기계"],
    compare_profiles: [
      { display_name: "항공우주공학과", track_category: "항공우주/비행체/추진", focus: "비행체와 우주 시스템의 구조, 추진과 궤도, 운용 원리를 배우는 학과입니다.", hint: "하늘과 우주를 기계와 물리 원리로 이해하고 싶은 학생에게 잘 맞습니다." },
      { display_name: "기계공학과", track_category: "기계/설계/동역학", focus: "기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.", hint: "비행 특수성보다 일반 기계 설계와 동역학 원리에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "항공운항학과", track_category: "항공운항/비행/항법", focus: "비행 원리와 항법, 기상 판단, 조종 수행과 운항 안전을 중심으로 배우는 학과입니다.", hint: "비행체 구조보다 비행 원리와 운항 시스템, 기상 판단을 물리와 수학으로 이해하고 싶은 학생에게 잘 맞습니다." }
    ]
  },
  "항공정비학과": {
    track_category: "항공정비/기체/엔진",
    card: "항공기의 기체와 엔진, 시스템 정비와 안전 관리를 배우는 학과입니다.",
    fit: "비행보다 항공기 상태 점검과 안전 유지에 관심 있는 학생에게 잘 맞습니다.",
    intro: "항공정비학과는 항공기의 기체와 엔진, 시스템 정비와 안전 관리 구조를 배우는 학과입니다.",
    core_keywords: ["항공정비","정비","엔진","항공기","점검","기체"],
    recommended_keywords: ["물리학","정보","통합과학1","미적분","영어"],
    subjects: ["물리학","정보","통합과학1","미적분","영어"],
    topics: [
      "정비 기준 차이가 항공기 안전성에 미치는 영향 분석",
      "기체 점검 순서 변화가 유지관리 효율에 주는 효과 비교",
      "엔진 상태 진단 방식이 운항 안정에 주는 영향 탐구"
    ],
    group_label: "항공정비·운항시스템",
    search_aliases: ["항공정비"],
    compare_profiles: [
      { display_name: "항공운항학과", track_category: "항공운항/비행/항법", focus: "비행 원리와 항법, 기상 판단, 조종 수행과 운항 안전을 중심으로 배우는 학과입니다.", hint: "정비보다 비행 원리와 운항 시스템, 기상 판단에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "기계공학과", track_category: "기계/설계/동역학", focus: "기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.", hint: "항공 특수성보다 일반 기계 구조와 운동, 에너지 전달 원리에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "전자공학과", track_category: "전자/회로/신호", focus: "회로, 신호, 센서, 전자 시스템을 설계하고 장치가 정보를 처리하도록 만드는 학과입니다.", hint: "정비 절차보다 전자 장치와 센서 시스템 설계에 더 관심 있는 학생에게 잘 맞습니다." }
    ]
  },
  "조선해양공학과": {
    track_category: "조선해양/선박/구조설계",
    card: "선박과 해양 구조물의 설계와 운항 원리를 배우는 학과입니다.",
    fit: "바다 위에서 움직이는 대형 시스템의 구조와 안정성을 보고 싶은 학생에게 잘 맞습니다.",
    intro: "조선해양공학과는 선박과 해양 구조물의 구조 설계, 유체와 운항 원리를 배우는 학과입니다.",
    core_keywords: ["조선해양","선박","해양구조물","설계","유체","구조"],
    recommended_keywords: ["물리학","미적분","지구과학","통합과학1","정보"],
    subjects: ["물리학","미적분","지구과학","통합과학1","정보"],
    topics: [
      "선체 구조 차이가 운항 안정성에 미치는 영향 분석",
      "유체 저항 변화가 에너지 효율에 주는 효과 비교",
      "해양 환경 조건 차이가 설계 기준에 미치는 영향 탐구"
    ],
    group_label: "조선·해양시스템",
    search_aliases: ["조선해양공","조선해양"],
    compare_profiles: [
      { display_name: "해양공학과", track_category: "해양/구조/유체시스템", focus: "바다 위 구조물과 해양 시스템의 설계와 운영을 배우는 학과입니다.", hint: "선박 운항보다 해양 구조물과 시스템 자체 설계에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "기계공학과", track_category: "기계/설계/동역학", focus: "기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.", hint: "해양 특수성보다 일반 기계 설계와 운동, 에너지 전달 원리에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "전기공학과", track_category: "전기/에너지/제어", focus: "전력 시스템, 모터, 에너지 변환, 제어를 중심으로 전기 시스템을 다루는 학과입니다.", hint: "선체 구조보다 추진 시스템과 제어, 전력 설계에 더 관심 있는 학생에게 잘 맞습니다." }
    ]
  },
  "해양공학과": {
    track_category: "해양/구조/유체시스템",
    card: "바다 위 구조물과 해양 시스템의 설계와 운영을 배우는 학과입니다.",
    fit: "해양 환경 속 구조물과 시스템을 공학적으로 보고 싶은 학생에게 잘 맞습니다.",
    intro: "해양공학과는 바다 위 구조물과 해양 시스템의 설계, 유체와 안전, 운영 원리를 배우는 학과입니다.",
    core_keywords: ["해양공학","해양구조","바다","설계","유체","시스템"],
    recommended_keywords: ["물리학","지구과학","미적분","통합과학1","정보"],
    subjects: ["물리학","지구과학","미적분","통합과학1","정보"],
    topics: [
      "해양 구조물 형식 차이가 안정성에 미치는 영향 분석",
      "파랑 조건 변화가 구조 설계에 주는 효과 비교",
      "운영 시스템 차이가 유지관리 효율에 미치는 영향 탐구"
    ],
    group_label: "해양시스템·구조설계",
    search_aliases: ["해양공","해양공학"],
    compare_profiles: [
      { display_name: "조선해양공학과", track_category: "조선해양/선박/구조설계", focus: "선박과 해양 구조물의 설계와 운항 원리를 배우는 학과입니다.", hint: "바다 위에서 움직이는 선박 시스템 자체 설계에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "해양학과", track_category: "해양/지리/순환", focus: "바다의 구조와 순환, 해양 환경과 생태를 배우는 자연과학 계열 학과입니다.", hint: "구조 설계보다 해양 환경과 자료 해석에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "기계공학과", track_category: "기계/설계/동역학", focus: "기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.", hint: "해양 특수성보다 일반 구조와 운동, 에너지 전달 원리에 더 관심 있는 학생에게 잘 맞습니다." }
    ]
  },
  "교통공학과": {
    track_category: "교통/이동/대중교통",
    card: "사람과 물류의 이동 구조, 교통 수요와 신호 체계, 운영과 안전 시스템을 배우는 학과입니다.",
    fit: "도시 이동 문제를 데이터와 시스템으로 해결하는 데 관심 있는 학생에게 잘 맞습니다.",
    intro: "교통공학과는 사람과 물류의 이동 구조, 교통 수요와 신호 체계, 운영과 안전 시스템을 배우는 학과입니다.",
    core_keywords: ["교통공학","이동","대중교통","도로","철도","교통흐름"],
    recommended_keywords: ["미적분","확률과 통계","정보","통합사회","물리학"],
    subjects: ["미적분","확률과 통계","정보","통합사회","물리학"],
    topics: [
      "교통 신호 체계 차이가 혼잡도에 미치는 영향 분석",
      "대중교통 수요 변화가 도시 이동 구조에 주는 효과 비교",
      "교통 안전 기준 변화가 이용자 행동에 미치는 영향 탐구"
    ],
    group_label: "교통시스템·도시이동",
    search_aliases: ["교통공"],
    compare_profiles: [
      { display_name: "도시공학과", track_category: "도시/교통/인프라", focus: "도시 공간과 주거·교통·환경·인프라를 생활권 전체의 구조에서 종합적으로 계획하는 학과입니다.", hint: "교통 운영보다 도시계획과 생활권 인프라 전체 구조에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "산업공학과", track_category: "최적화/시스템/데이터", focus: "생산·물류·서비스 시스템을 데이터와 최적화 기법으로 개선하는 학과입니다.", hint: "복잡한 교통 과정도 효율적으로 만들고, 데이터로 병목 구조를 개선하는 데 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "기계공학과", track_category: "기계/설계/동역학", focus: "기계의 구조와 운동, 에너지 전달, 설계 원리를 바탕으로 실제 장치를 만드는 학과입니다.", hint: "이동 체계보다는 차량·장치의 구조와 운동, 설계 원리에 더 관심 있는 학생에게 잘 맞습니다." }
    ]
  },
  "원자력공학과": {
    track_category: "원자력/에너지/안전시스템",
    card: "원자력 발전과 에너지 시스템, 안전 구조를 배우는 학과입니다.",
    fit: "고에너지 시스템과 발전 구조, 안전 기준을 함께 보고 싶은 학생에게 잘 맞습니다.",
    intro: "원자력공학과는 원자력 발전 원리와 에너지 시스템, 안전과 운영 구조를 배우는 학과입니다.",
    core_keywords: ["원자력","핵반응","에너지","발전","안전","방사선"],
    recommended_keywords: ["물리학","미적분","화학","통합과학1","정보"],
    subjects: ["물리학","미적분","화학","통합과학1","정보"],
    topics: [
      "발전 방식 차이가 에너지 효율에 미치는 영향 분석",
      "안전 기준 변화가 시스템 운영에 주는 효과 비교",
      "연료와 냉각 구조 차이가 발전 안정성에 미치는 영향 탐구"
    ],
    group_label: "원자력·에너지시스템",
    search_aliases: ["원자력공","원자력"],
    compare_profiles: [
      { display_name: "에너지공학과", track_category: "에너지/전력/저장시스템", focus: "전기·열·연료·저장 시스템을 바탕으로 에너지 전환과 활용을 설계하는 학과입니다.", hint: "원자력 반응 자체보다 전력·저장 시스템 전체 효율에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "전기공학과", track_category: "전기/에너지/제어", focus: "전력 시스템, 모터, 에너지 변환, 제어를 중심으로 전기 시스템을 다루는 학과입니다.", hint: "핵반응보다 발전 이후 전력 시스템과 제어 구조에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "물리학과", track_category: "물리/이론/실험", focus: "힘, 운동, 파동, 전기와 에너지 같은 자연 법칙을 수학과 실험으로 탐구하는 학과입니다.", hint: "발전 응용보다 에너지와 입자, 힘의 원리를 더 깊게 이해하고 싶은 학생에게 잘 맞습니다." }
    ]
  },
  "소방방재학과": {
    track_category: "소방/방재/재난대응",
    card: "재난과 화재, 예방과 대응 체계를 배우는 안전 계열 학과입니다.",
    fit: "위기 상황과 안전 기준, 재난 대응 시스템에 관심 있는 학생에게 잘 맞습니다.",
    intro: "소방방재학과는 화재와 재난의 예방과 대응, 위기 관리와 방재 체계를 배우는 학과입니다.",
    core_keywords: ["소방방재","재난","화재","예방","대응","복구"],
    recommended_keywords: ["물리학","화학","지구과학","통합사회","보건"],
    subjects: ["물리학","화학","지구과학","통합사회","보건"],
    topics: [
      "재난 유형 차이가 대응 체계에 미치는 영향 분석",
      "예방 기준 변화가 사고 피해 저감에 주는 효과 비교",
      "위기 대응 시스템이 현장 안전성에 미치는 영향 탐구"
    ],
    group_label: "방재·재난안전",
    search_aliases: ["소방방재"],
    compare_profiles: [
      { display_name: "안전공학과", track_category: "안전/리스크관리/방재", focus: "위험 요소를 분석하고 사고를 예방하는 설계와 관리 기준을 배우는 학과입니다.", hint: "재난 대응 자체보다 위험 분석과 예방 기준 설계에 더 관심 있는 학생에게 잘 맞습니다." },
      { display_name: "건설환경공학과", track_category: "건설/환경/인프라", focus: "도시 기반시설의 설계·시공·유지관리를 배우며 수질·대기·폐기물 같은 환경 문제를 함께 해결하는 학과입니다.", hint: "현장 대응보다 시설과 인프라 구조 자체를 기술적으로 보고 싶은 학생에게 잘 맞습니다." },
      { display_name: "응급구조학과", track_category: "응급구조/응급처치/현장대응", focus: "응급 상황에서 환자를 평가하고 구조·이송하는 현장 대응과 처치 원리를 배우는 학과입니다.", hint: "시설 재난 대응보다 사람을 직접 구조하고 응급 대응하는 현장 실무에 더 관심 있는 학생에게 잘 맞습니다." }
    ]
  }
});



  function buildHeuristicKeywords(displayName, trackCategory){
    const name = String(displayName || '');
    const rules = [
      [/주거환경|실내/, ['주거 설계','실내 환경','공간 분석','생활 동선','주거문화']],
      [/환경공학|지구환경|대기과학|환경/, ['환경 분석','기후 데이터','지속가능성','오염 원인','환경 정책']],
      [/간호|의예|약학|치의|한의|수의|보건관리|보건|방사선|물리치료|임상병리|작업치료|재활상담|치위생|치기공|응급구조|언어치료|안경광학/, ['건강 데이터','생체 반응','질병 이해','의료 사례','문제 해결']],
      [/생명공학|생명과학|생물|수산생명|미생물|동물자원|식물자원|원예|식품공학|식품영양/, ['생명 시스템','변화 분석','실험 설계','생체 데이터','응용 사례']],
      [/컴퓨터|소프트웨어|AI|인공지능|정보보안|정보통신|정보/, ['알고리즘','데이터 처리','시스템 설계','프로그래밍','디지털 기술']],
      [/경영정보/, ['정보시스템','비즈니스 데이터','디지털 전략','의사결정','플랫폼']],
      [/신소재|재료|반도체|고분자|금속/, ['재료 특성','구조 분석','성질 변화','소재 설계','공정 기술']],
      [/건축|건설|도시|조경|토목/, ['공간 구조','도시 설계','안전성','생활 환경','인프라']],
      [/기계|자동차|로봇|항공/, ['구조 설계','동작 원리','시스템 제어','에너지 효율','센서 활용']],
      [/전자|전기|회로|센서/, ['회로 원리','센서 측정','신호 처리','전력 제어','정확도']],
      [/경영|호텔경영|관광경영/, ['시장 분석','브랜드 전략','소비자 행동','조직 관리','경영 의사결정']],
      [/경제|무역|국제통상|국제학부|글로벌경영/, ['시장 구조','국제 교역','경제 지표','정책 분석','글로벌 이슈']],
      [/행정|공공인재|경찰행정|정치외교|군사학/, ['정책 분석','행정 제도','사회 문제','공공 데이터','제도 개선']],
      [/심리|상담심리/, ['인지 과정','정서 행동','심리 실험','상담 사례','행동 분석']],
      [/사회복지|아동/, ['복지 제도','발달 이해','지원 체계','사회 문제','현장 사례']],
      [/사회학|문화인류|문화유산|문화콘텐츠|미디어커뮤니케이션|언론정보|신문방송|광고홍보/, ['사회 현상','미디어 분석','문화 해석','콘텐츠 기획','커뮤니케이션']],
      [/연극영화|영화영상|방송영상|공연예술|애니메이션|실용음악|뮤지컬/, ['장면 구성','표현 방식','콘텐츠 제작','감정 전달','무대·영상']],
      [/체육|스포츠|레저|운동재활|사회체육|스포츠산업|스포츠과학|스포츠의학/, ['움직임 분석','경기 운영','신체 수행','운동 프로그램','스포츠 산업']],
      [/국어국문|영어영문|사학|철학|문헌정보/, ['텍스트 해석','시대 맥락','개념 탐구','기록 분석','문화 이해']],
      [/통계|응용통계/, ['데이터 분석','확률 모델','통계 추정','그래프 해석','표본 조사']],
      [/수학/, ['수리 모델링','증명 논리','문제 해결','함수 해석','정량 분석']],
      [/화학|화학공학/, ['물질 구조','반응 원리','실험 설계','정량 분석','에너지 변화']],
      [/물리(?!치료)|천문|우주|해양/, ['관측 데이터','원리 해석','시스템 이해','변화 분석','모델링']],
      [/국어국문|문예창작|언어학|영어영문|일어일문|중어중문|노어노문|독어독문|불어불문|아랍어|한문|한국어|철학|사학|고고|신학|미학/, ['텍스트 해석','비교 분석','문화 맥락','표현 방식','사상 이해']]
    ];
    for (const [regex, keywords] of rules) {
      if (regex.test(name)) return keywords;
    }
    if (String(trackCategory).includes('인문')) return ['텍스트 해석','비교 분석','문화 맥락','표현 방식','사상 이해'];
    if (String(trackCategory).includes('사회')) return ['사회 현상','데이터 해석','정책 분석','사례 비교','문제 해결'];
    if (String(trackCategory).includes('자연')) return ['관측 데이터','원리 해석','변화 분석','실험 설계','모델링'];
    if (String(trackCategory).includes('공학')) return ['구조 분석','시스템 설계','정량 측정','효율 개선','응용 사례'];
    if (String(trackCategory).includes('의약')) return ['건강 데이터','생체 반응','의료 사례','문제 해결','정확도'];
    return [name.replace(/학과|학부|전공|예과/g,''), '핵심 개념', '사례 분석', '문제 해결', '진로 연계'].filter(Boolean);
  }

  function getMeaningfulKeywords(profile){
    const override = getMajorOverride(profile);
    const overrideRaw = uniq((Array.isArray(override?.core_keywords) ? override.core_keywords : [])).filter(Boolean);
    const overrideFiltered = overrideRaw.filter(v => !PLACEHOLDER_KEYWORDS.has(String(v).trim()));
    if (overrideFiltered.length) return overrideFiltered.slice(0, 8);

    const raw = uniq(profile?.core_keywords || []).filter(Boolean);
    const filtered = raw.filter(v => !PLACEHOLDER_KEYWORDS.has(String(v).trim()));
    if (filtered.length) return filtered.slice(0, 8);
    return buildHeuristicKeywords(profile?.display_name || '', profile?.track_category || '').slice(0, 8);
  }

  function getProfileByIdOrName(majorId, displayName){
    return state.profileByMajorId.get(majorId) || state.profileByName.get(displayName) || null;
  }

  function buildResolvedFromSelection(profile, input){
    if (!profile) return null;
    return buildResolved(profile, 'suggestion_select', input || profile.display_name);
  }

  function applySelectedMajor(majorId, displayName){
    const input = getCareerInput();
    const profile = getProfileByIdOrName(majorId, displayName);
    if (!profile || !input) return;
    state.selectedMajorId = profile.major_id || majorId || '';
    state.selectedMajorName = profile.display_name || displayName || '';
    input.value = state.selectedMajorName;
    renderMajorSummary();
    startMiniPayloadPatch();
    input.dispatchEvent(new Event('change', { bubbles:true }));
  }


  function classifyCandidateGroup(row, rawInput){
    const profile = row?.profile || {};
    const textBag = [
      row?.display_name || '',
      profile?.display_name || '',
      row?.track_category || '',
      ...(row?.keywords || []),
      ...(profile?.related_subject_hints || []),
      ...(profile?.inquiry_topics_raw || []),
      profile?.major_intro || ''
    ].join(' ');
    const normalizedInput = normalize(rawInput || '');

    const override = getMajorOverride(profile || row);
    const overrideGroup = getGroupMetaByLabel(override?.group_label);
    if (overrideGroup && isGroupAllowedForQuery(overrideGroup.id, normalizedInput)) return overrideGroup;

    if (normalizedInput.includes('바이오') && /(의공|고분자|생체재료|바이오소재|의료기기|바이오센서)/.test(textBag)) {
      const forced = getGroupMetaByLabel('의료기기·바이오소재 쪽');
      if (forced && isGroupAllowedForQuery(forced.id, normalizedInput)) return forced;
    }

    const rules = [
      { id:'rehab_therapy', label:'회복 지원·치료 쪽', desc:'기능 회복, 재활, 의사소통 지원처럼 회복을 돕는 학과입니다.', test: /(물리치료|작업치료|언어치료|재활상담|재활)/ },
      { id:'clinical_health', label:'환자 진료·검사 쪽', desc:'환자 돌봄, 검사, 영상, 보건관리처럼 의료 현장과 가까운 학과입니다.', test: /(보건관리|간호|방사선|임상병리|치위생|치기공|응급구조|의예|약학|한의|수의|보건|안경광학)/ },
      { id:'bio_materials_devices', label:'의료기기·바이오소재 쪽', desc:'의료기기, 바이오소재, 생체재료처럼 공학과 생명 기술이 만나는 학과입니다.', test: /(의공|고분자|생체재료|바이오소재|의료기기|바이오센서)/ },
      { id:'chem_energy_materials', label:'화학·에너지·소재 쪽', desc:'화학 반응, 공정 설계, 에너지 변환, 소재 응용과 연결된 학과입니다.', test: /(화학과|화학공학|에너지공학|신소재공학|화공생명|촉매|반응공학|전기화학|배터리|이차전지|고분자|정제|분석화학|유기화학|무기화학|소재|에너지)/ },
      { id:'bio_engineering', label:'실험·기술 응용 쪽', desc:'생명 현상을 실험과 기술로 연결하는 학과입니다.', test: /(식품생명공학|제약공학|화공생명|생명공학|바이오|미생물|유전|세포|단백질|발효|식품)/ },
      { id:'bio_science', label:'기초 생명과학 쪽', desc:'생명 현상의 원리를 실험과 데이터로 탐구하는 학과입니다.', test: /(생명과학|생물학|분자생물|생태학)/ },
      { id:'architecture_design', label:'건축·디자인 쪽', desc:'건축 설계, 공간 디자인, 제품·시각 디자인처럼 형태와 사용 경험을 다루는 학과입니다.', test: /(건축학|건축공학|실내디자인|산업디자인|시각디자인|제품디자인|공간디자인|인테리어|디자인)/ },
      { id:'space_housing', label:'주거·공간 설계 쪽', desc:'주거, 실내, 공간 설계처럼 생활 공간과 연결된 학과입니다.', test: /(주거환경|주거|실내|주택|공간|생활환경|인테리어|실내디자인)/ },
      { id:'environment', label:'환경·도시 시스템 쪽', desc:'기후, 환경, 도시 기반시설과 연결된 학과입니다.', test: /(지구환경|대기과학|기후|환경과학|지구과학|생태|건설환경|토목환경|수자원|도시환경|환경)/ },
      { id:'city_infra', label:'도시 기반시설 쪽', desc:'도시 구조, 인프라, 건설·토목처럼 생활 기반을 다루는 학과입니다.', test: /(도시|토목|건설|인프라|교통|도시행정|조경|건축공학|건축학)/ },
      { id:'media_content', label:'미디어·콘텐츠 기획 쪽', desc:'미디어, 콘텐츠, 커뮤니케이션처럼 정보 전달과 해석을 다루는 학과입니다.', test: /(미디어|콘텐츠|신문방송|광고홍보|언론정보|커뮤니케이션|문화콘텐츠|방송)/ },
      { id:'sports_leisure', label:'체육·스포츠·레저 쪽', desc:'운동 수행, 스포츠 과학, 경기 분석, 레저·스포츠 산업처럼 몸의 움직임과 스포츠 현장을 다루는 학과입니다.', test: /(체육학|스포츠과학|스포츠산업|사회체육|레저스포츠|스포츠의학|운동처방|운동재활|체력|경기분석|스포츠마케팅)/ },
      { id:'psychology_counsel', label:'마음 이해·상담 쪽', desc:'인지, 정서, 상담 사례를 중심으로 보는 학과입니다.', test: /(심리|상담|정서|인지|행동과학)/ },
      { id:'global_trade', label:'국제 이슈·무역 쪽', desc:'국제 이슈, 무역, 경제 흐름과 연결된 사회계열 학과입니다.', test: /(국제학부|국제통상|무역|통상|글로벌|경제학|농업경제)/ },
      { id:'business_service', label:'기업 운영·서비스 쪽', desc:'기업 운영, 소비자, 관광·호텔 같은 서비스 산업과 연결된 학과입니다.', test: /(경영|관광|호텔|회계|세무|부동산|소비자)/ },
      { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.', test: /(행정|정책|법학|정치외교|공공|경찰|군사|외교)/ },
      { id:'computing_ai', label:'컴퓨터·AI 쪽', desc:'프로그래밍, 알고리즘, 데이터, 시스템 설계와 연결된 학과입니다.', test: /(컴퓨터공학|소프트웨어학|인공지능학|데이터사이언스학|정보보호학|산업공학|프로그래밍|알고리즘|인공지능|AI|데이터분석|보안|암호|시스템설계|소프트웨어)/i },
      { id:'materials_devices', label:'반도체·소자 설계 쪽', desc:'재료, 반도체, 회로, 장치 설계와 연결된 학과입니다.', test: /(신소재|재료|반도체|금속|전자|전기|센서|정보통신|로봇|기계|자동차)/ },
      { id:'data_statistics', label:'데이터·통계', desc:'수치, 데이터 해석, 모델링과 연결된 학과입니다.', test: /(통계|응용통계|확률|모델링|수리|정량)/ },
      { id:'russian_language_region', label:'러시아어·문학·지역이해', desc:'러시아어와 러시아권 문학, 문화, 지역 이해를 함께 다루는 학과입니다.', test: /(노어노문|러시아어|러시아문학|노문과|노어과)/ },
      { id:'german_language_culture', label:'독일어·문학·문화해석', desc:'독일어와 독일권 문학, 문화, 사상을 텍스트 해석으로 배우는 학과입니다.', test: /(독어독문|독일어|독문과|독어과)/ },
      { id:'french_language_culture', label:'프랑스어·문학·문화해석', desc:'프랑스어와 프랑스권 문학, 문화, 사회를 함께 해석하는 학과입니다.', test: /(불어불문|프랑스어|불문과|불어과)/ },
      { id:'japanese_language_culture', label:'일본어·문학·문화해석', desc:'일본어와 일본 문학, 문화, 사회를 텍스트 해석과 번역으로 배우는 학과입니다.', test: /(일어일문|일본어|일문과|일어과)/ },
      { id:'chinese_language_eastasia', label:'중국어·문학·동아시아이해', desc:'중국어와 중국권 문학, 문화, 동아시아 맥락을 함께 이해하는 학과입니다.', test: /(중어중문|중국어|중문과|중어과)/ },
      { id:'arabic_middleeast', label:'아랍어·중동지역이해', desc:'아랍어와 중동 지역의 문화, 사회, 국제 맥락을 함께 배우는 학과입니다.', test: /(아랍어|중동|아랍지역)/ },
      { id:'language_culture', label:'언어·문화·사상', desc:'언어, 텍스트, 문화와 사상을 중심으로 읽는 학과입니다.', test: /(국어국문|언어|영어|일어|중어|불어|독어|노어|아랍어|철학|사학|고고|신학|한문|한국어|미학|문예창작|문화인류|문화유산)/ }
    ];

    for (const rule of rules) {
      if (!rule.test.test(textBag)) continue;
      if (!isGroupAllowedForQuery(rule.id, normalizedInput)) continue;
      return rule;
    }

    const allowed = getQueryAllowedGroupIds(normalizedInput);
    const track = String(row?.track_category || '');
    if (track.includes('의약')) {
      if (allowed) {
        const preferred = ['clinical_health','rehab_therapy','bio_engineering','bio_science','bio_materials_devices'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
          clinical_health:'보건·임상',
          rehab_therapy:'재활·치료',
          bio_engineering:'바이오·생명공학',
          bio_science:'바이오·생명과학',
          bio_materials_devices:'바이오소재·의료기기'
        }[preferred])) };
      }
      return getGroupMetaByLabel('보건·임상');
    }
    if (track.includes('공학')) {
      if (allowed) {
        const preferred = ['architecture_design','computing_ai','chem_energy_materials','materials_devices','bio_engineering','bio_materials_devices','city_infra'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
          architecture_design:'건축·디자인',
          computing_ai:'컴퓨터·AI·데이터',
          chem_energy_materials:'화학·에너지·소재',
          materials_devices:'반도체·전자',
          bio_engineering:'바이오·생명공학',
          bio_materials_devices:'바이오소재·의료기기',
          city_infra:'도시·인프라'
        }[preferred])) };
      }
      return getGroupMetaByLabel('반도체·전자');
    }
    if (track.includes('자연')) {
      if (allowed) {
        const preferred = ['architecture_design','chem_energy_materials','bio_science','environment','space_housing','city_infra'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
          architecture_design:'건축·디자인',
          chem_energy_materials:'화학·에너지·소재',
          bio_science:'바이오·생명과학',
          environment:'환경 관련 추천',
          space_housing:'공간·주거 환경',
          city_infra:'도시·인프라'
        }[preferred])) };
      }
      return getGroupMetaByLabel('환경 관련 추천');
    }
    if (track.includes('체육') || track.includes('스포츠') || track.includes('레저')) return getGroupMetaByLabel('체육·스포츠·레저');
    if (track.includes('인문')) {
      if (allowed) {
        const preferred = ['russian_language_region','german_language_culture','french_language_culture','japanese_language_culture','chinese_language_eastasia','arabic_middleeast','humanities_language_culture','media_content'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
          russian_language_region:'러시아어·문학·지역이해',
          german_language_culture:'독일어·문학·문화해석',
          french_language_culture:'프랑스어·문학·문화해석',
          japanese_language_culture:'일본어·문학·문화해석',
          chinese_language_eastasia:'중국어·문학·동아시아이해',
          arabic_middleeast:'아랍어·중동지역이해',
          humanities_language_culture:'인문·어문·문화',
          media_content:'미디어·콘텐츠'
        }[preferred])) };
      }
      return getGroupMetaByLabel('인문·어문·문화') || { id:'language_culture', label:'언어·문화·사상', desc:'언어, 문화, 사상과 연결된 후보입니다.' };
    }
    if (track.includes('사회')) {
      if (allowed) {
        const preferred = ['global_trade','business_service','law_public','psychology_counsel','media_content'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
          global_trade:'국제·통상',
          business_service:'경영·서비스',
          law_public:'행정·정책·법',
          psychology_counsel:'심리·상담',
          media_content:'미디어·콘텐츠'
        }[preferred])) };
      }
      return getGroupMetaByLabel('국제·통상');
    }
    return { id:'general', label:'관련 학과 묶음', desc:'입력한 단어와 연결된 후보를 모아 보여줍니다.' };
  }


  function getPrimaryFocus(profile, group){
    const name = String(profile?.display_name || '');
    const keywords = getMeaningfulKeywords(profile);
    const firstTwo = keywords.slice(0, 2).join(', ');
    const focusRules = [
      [/주거환경|실내|주거/, '생활 공간과 주거 환경 설계'],
      [/지구환경|대기과학|해양|천문|우주/, '기후·지구 시스템과 자연 관측'],
      [/도시|건축|토목|조경|인프라/, '도시 구조와 생활 기반 설계'],
      [/통계|응용통계|데이터/, '데이터 해석과 정량 분석'],
      [/심리|상담/, '인지·정서·행동 이해'],
      [/경영정보/, '비즈니스와 정보시스템 연결'],
      [/국제|무역|통상|경제/, '시장·정책·국제 흐름 해석'],
      [/경영|관광|호텔|회계|세무|부동산/, '기업 운영과 서비스 전략 분석'],
      [/행정|정치외교|법학|공공|경찰|군사/, '제도·정책·공공 문제 해결'],
      [/생명|미생물|동물|식물|수산|간호|의예|약학|보건|치의|한의|수의/, '생명·건강·의료 문제 분석'],
      [/컴퓨터|소프트웨어|AI|정보|전자|전기|기계|자동차|로봇|재료|반도체/, '장치·시스템·기술 응용'],
      [/국어|문예|언어|영어|일어|중어|독어|불어|노어|아랍어|철학|사학|고고|신학|미학|한문|한국어/, '텍스트·언어·문화 해석']
    ];
    for (const [regex, label] of focusRules) {
      if (regex.test(name)) return label;
    }
    if (firstTwo) return firstTwo;
    return group?.label ? `${group.label} 중심 탐구` : '핵심 키워드 중심 탐구';
  }



  function getMajorOverride(profileOrName){
    const name = typeof profileOrName === 'string'
      ? profileOrName
      : String(profileOrName?.display_name || '');
    const raw = MAJOR_COPY_OVERRIDES[name] || null;
    if (!raw) return null;
    const normalizedOverride = { ...raw };
    if (!normalizedOverride.track_category && normalizedOverride.track) normalizedOverride.track_category = normalizedOverride.track;
    if (!normalizedOverride.core_keywords && Array.isArray(normalizedOverride.core)) normalizedOverride.core_keywords = normalizedOverride.core.slice();
    if (!normalizedOverride.subjects && Array.isArray(normalizedOverride.subs)) normalizedOverride.subjects = normalizedOverride.subs.slice();
    if (!normalizedOverride.group_label && normalizedOverride.group) normalizedOverride.group_label = normalizedOverride.group;
    const aliasPool = uniq([
      ...(Array.isArray(normalizedOverride.aliases) ? normalizedOverride.aliases : []),
      ...(Array.isArray(normalizedOverride.search_aliases) ? normalizedOverride.search_aliases : [])
    ]).filter(Boolean);
    normalizedOverride.aliases = aliasPool;
    normalizedOverride.search_aliases = aliasPool;
    return normalizedOverride;
  }

  function isGenericMajorIntro(value){
    const text = String(value || '').trim();
    if (!text) return true;
    return GENERIC_MAJOR_INTRO_PATTERNS.some(pattern => pattern.test(text));
  }

  function getPreferredMajorIntro(profile, group){
    const override = getMajorOverride(profile);
    if (override?.intro) return override.intro;
    const rawIntro = String(profile?.major_intro || '').trim();
    if (rawIntro && !isGenericMajorIntro(rawIntro)) return rawIntro;
    return buildStudentDescription(profile, group);
  }

  function getPreferredSubjectHints(profile){
    const override = getMajorOverride(profile);
    if (override?.subjects?.length) return override.subjects.slice(0, 6);
    return uniq(profile?.related_subject_hints || []).slice(0, 6);
  }

  function getPreferredInquiryTopics(profile){
    const override = getMajorOverride(profile);
    if (override?.topics?.length) return override.topics.slice(0, 5);
    const topics = uniq(profile?.inquiry_topics_raw || []).filter(v => !/관련 핵심 개념 탐구|진로 연계 사례 분석|주제 보고서 설계/.test(String(v)));
    if (topics.length) return topics.slice(0, 5);
    const base = String(profile?.display_name || '').replace(/학과|학부|전공/g, '');
    return base ? [`${base}와 관련된 핵심 개념 탐구`, `${base} 사례 비교 분석`, `${base} 보고서 주제 설계`] : [];
  }

  function applyQueryBoost(input, displayName){
    const normalizedInput = normalize(input);
    const name = String(displayName || '');
    let score = 0;
    QUERY_BOOST_RULES.forEach(rule => {
      if (rule.queries.some(q => normalize(q) === normalizedInput) && rule.test.test(name)) {
        score += rule.boost;
      }
    });
    return score;
  }

  function isBroadQueryKeyword(input){
    return BROAD_QUERY_KEYWORDS.has(String(input || '').trim());
  }

  function buildStudentDescription(profile, group){
    const override = getMajorOverride(profile);
    if (override?.card) return override.card;
    const name = String(profile?.display_name || '');
    const rules = [
      [/보건관리/, '질병 예방, 보건 정책, 의료행정과 건강 데이터를 다루는 학과입니다.'],
      [/간호/, '환자 상태를 관찰하고 직접 간호하는 임상 실천 중심 학과입니다.'],
      [/방사선/, '의료영상 장비를 다루며 촬영, 판독 보조, 방사선 안전관리를 배우는 학과입니다.'],
      [/물리치료/, '움직임 회복과 재활 운동을 통해 기능 회복을 돕는 학과입니다.'],
      [/임상병리/, '혈액·조직·체액 검사를 통해 질병 원인을 분석하는 검사 중심 학과입니다.'],
      [/응급구조/, '응급 상황에서 환자 상태를 판단하고 현장 처치를 수행하는 학과입니다.'],
      [/언어치료/, '말과 언어, 의사소통의 어려움을 평가하고 중재하는 학과입니다.'],
      [/작업치료/, '일상생활 기능 회복을 위한 활동 훈련과 재활을 다루는 학과입니다.'],
      [/치위생/, '구강 건강 예방과 위생 관리, 치과 진료 지원을 배우는 학과입니다.'],
      [/치기공/, '보철물과 치과 장치를 설계·제작하는 제작 중심 학과입니다.'],
      [/의공/, '의료기기와 생체신호를 공학적으로 분석하고 설계하는 학과입니다.'],
      [/제약공학/, '의약품의 개발·생산·품질 관리를 공정 관점에서 다루는 학과입니다.'],
      [/화학공학/, '화학 반응과 물질전달, 공정 설계를 바탕으로 소재·에너지·생산 시스템을 다루는 학과입니다.'],
      [/에너지공학/, '전기, 열, 연료, 저장 시스템을 바탕으로 에너지 변환과 활용을 설계하는 학과입니다.'],
      [/화학과/, '원자·분자 수준의 반응과 구조를 실험과 분석으로 탐구하는 기초과학 학과입니다.'],
      [/화공생명/, '화학공정과 생명기술을 함께 다루며 의약·소재·에너지 응용으로 이어지는 학과입니다.'],
      [/생명공학/, '세포·유전자·미생물을 활용해 의료·식품·환경 기술로 연결하는 학과입니다.'],
      [/생명과학/, '생명 현상의 원리를 실험과 데이터로 탐구하는 기초과학 중심 학과입니다.'],
      [/식품생명공학/, '식품과 생명과학을 바탕으로 안전성, 가공, 기능성 소재를 연구하는 학과입니다.'],
      [/식품영양/, '영양, 식생활, 건강 관리를 바탕으로 사람의 건강한 생활을 설계하는 학과입니다.'],
      [/반도체공학/, '칩 설계와 반도체 공정, 소자 동작 원리를 배우는 학과입니다.'],
      [/신소재공학|재료공학/, '새로운 소재의 구조와 성질을 분석해 반도체·배터리·부품으로 연결하는 학과입니다.'],
      [/전자공학/, '회로, 신호, 센서, 통신 시스템을 설계하는 학과입니다.'],
      [/전기공학/, '전력, 제어, 전기 시스템의 동작 원리를 다루는 학과입니다.'],
      [/미디어커뮤니케이션/, '미디어 메시지와 콘텐츠가 사회에 미치는 영향을 분석하는 학과입니다.'],
      [/광고홍보/, '브랜드 메시지와 콘텐츠 전략을 기획하고 전달 효과를 다루는 학과입니다.'],
      [/문화인류/, '사람들의 생활방식과 문화 차이를 현장과 사례로 해석하는 학과입니다.'],
      [/문화유산/, '역사·문화 자료를 조사하고 보존·활용하는 학과입니다.'],
      [/심리학/, '인지·정서·행동의 원리를 실험과 분석으로 이해하는 학과입니다.'],
      [/상담심리/, '심리 이해를 바탕으로 상담과 관계 지원에 더 가까운 학과입니다.'],
      [/국제학부/, '국제 이슈를 폭넓게 보고 정치·경제·외교를 함께 다루는 학과입니다.'],
      [/국제통상/, '무역과 글로벌 시장, 통상 흐름을 실무적으로 다루는 학과입니다.'],
      [/경제학/, '시장 원리와 자원 배분을 데이터와 이론으로 분석하는 학과입니다.'],
      [/경영학/, '기업 운영과 소비자, 시장 전략을 함께 보는 학과입니다.'],
      [/건설환경공학/, '도로·교량·상하수도 같은 도시 인프라와 수질·대기 등 환경 문제를 함께 다루는 공학 계열 학과입니다.'],
      [/토목환경공학/, '도로·교량·하천·상하수도 같은 사회기반시설과 환경 관리를 함께 다루는 학과입니다.'],
      [/지구환경과학/, '기후·대기·지질·수문 같은 지구 시스템의 변화를 관측 데이터로 분석하는 학과입니다.'],
      [/주거환경/, '주거 공간, 실내 환경, 생활 동선과 안전·편의를 사람 중심으로 설계하는 학과입니다.'],
      [/도시공학/, '도시 공간과 주거·교통·환경·인프라를 종합적으로 계획하는 학과입니다.']
    ];
    for (const [regex, sentence] of rules) {
      if (regex.test(name)) return sentence;
    }
    const focus = getPrimaryFocus(profile, group);
    if (group?.label) return `${group.label}와 관련해 ${focus}를 중심으로 배우는 학과입니다.`;
    return `${focus}를 중심으로 배우는 학과입니다.`;
  }

  function buildStudentFit(profile, group){
    const override = getMajorOverride(profile);
    if (override?.fit) return override.fit;
    const name = String(profile?.display_name || '');
    const rules = [
      [/보건관리/, '예방, 보건 정책, 통계 해석에 관심 있는 학생에게 잘 맞습니다.'],
      [/간호/, '사람을 직접 돌보고 임상 현장에서 빠르게 판단하는 일에 관심 있는 학생에게 잘 맞습니다.'],
      [/방사선/, '영상 장비, 정밀 촬영, 의료기술에 관심 있는 학생에게 잘 맞습니다.'],
      [/물리치료/, '움직임 분석, 재활, 운동을 통한 회복 지원에 관심 있는 학생에게 잘 맞습니다.'],
      [/임상병리/, '검사 데이터와 실험 과정으로 질병 원인을 찾는 일에 흥미가 있는 학생에게 잘 맞습니다.'],
      [/응급구조/, '긴급 상황에서 침착하게 판단하고 현장 대응을 하고 싶은 학생에게 잘 맞습니다.'],
      [/언어치료/, '언어 발달과 의사소통 지원에 관심 있는 학생에게 잘 맞습니다.'],
      [/작업치료/, '재활과 일상 기능 회복을 사람 중심으로 돕고 싶은 학생에게 잘 맞습니다.'],
      [/치위생/, '예방 중심 구강 관리와 환자 교육에 관심 있는 학생에게 잘 맞습니다.'],
      [/치기공/, '정밀 제작과 손기술, 치과 장치 설계에 관심 있는 학생에게 잘 맞습니다.'],
      [/의공/, '공학 기술을 의료기기와 생체신호 분석에 연결해 보고 싶은 학생에게 잘 맞습니다.'],
      [/생명공학|생명과학|제약공학|화공생명|식품생명공학/, '생명 현상을 실험과 기술로 연결해 보고 싶은 학생에게 잘 맞습니다.'],
      [/화학공학|에너지공학|신소재공학/, '반응, 공정, 에너지, 소재 변화가 실제 기술 성능으로 이어지는 과정에 관심 있는 학생에게 잘 맞습니다.'],
      [/화학과/, '물질의 구조와 반응 원리를 실험과 분석으로 깊게 탐구하고 싶은 학생에게 잘 맞습니다.'],
      [/반도체공학/, '칩, 회로, 공정 같은 반도체 기술에 관심 있는 학생에게 잘 맞습니다.'],
      [/신소재공학|재료공학/, '소재의 구조와 성질이 기술 성능을 바꾸는 과정에 흥미가 있는 학생에게 잘 맞습니다.'],
      [/전자공학|전기공학/, '회로와 신호, 장치 동작 원리에 관심 있는 학생에게 잘 맞습니다.'],
      [/미디어커뮤니케이션/, '콘텐츠와 미디어가 사람과 사회에 미치는 영향에 관심 있는 학생에게 잘 맞습니다.'],
      [/광고홍보/, '메시지를 기획하고 사람의 반응을 분석하는 일에 관심 있는 학생에게 잘 맞습니다.'],
      [/문화인류|문화유산/, '사람과 문화, 사회 맥락을 사례로 깊게 읽고 싶은 학생에게 잘 맞습니다.'],
      [/심리학|상담심리/, '사람의 마음과 행동을 이해하고 관계를 돕는 데 관심 있는 학생에게 잘 맞습니다.'],
      [/국제학부|국제통상|경제학|경영학/, '국제 이슈와 시장 흐름을 넓게 보고 해석하는 데 관심 있는 학생에게 잘 맞습니다.'],
      [/건설환경공학|토목환경공학|지구환경과학|주거환경|도시공학/, '환경과 생활 공간, 도시 문제를 연결해서 보고 싶은 학생에게 잘 맞습니다.']
    ];
    for (const [regex, sentence] of rules) {
      if (regex.test(name)) return sentence;
    }
    if (group?.label) return `${group.label}와 연결된 주제를 사례와 데이터로 탐구해 보고 싶은 학생에게 잘 맞습니다.`;
    return '관심 주제를 데이터와 사례로 탐구해 보고 싶은 학생에게 잘 맞습니다.';
  }

  function getSelectedComparison(profile, rawInput){
    const current = {
      major_id: profile?.major_id || '',
      display_name: profile?.display_name || '',
      track_category: (getMajorOverride(profile)?.track_category || profile?.track_category || ''),
      profile,
      keywords: getMeaningfulKeywords(profile)
    };
    const override = getMajorOverride(profile);
    const baseGroup = classifyCandidateGroup(current, rawInput);

    if (override?.compare_profiles?.length) {
      const peers = override.compare_profiles.map(peer => ({
        major_id: peer.major_id || '',
        display_name: peer.display_name || '',
        track_category: peer.track_category || '',
        focus: peer.focus || '',
        hint: peer.hint || '',
        overlap: 1000
      })).filter(peer => peer.display_name);
      return {
        group_id: baseGroup.id || '',
        group_label: override.group_label || baseGroup.label || '비슷한 학과',
        group_desc: baseGroup.desc || '',
        selected_focus: override.card || buildStudentDescription(profile, baseGroup),
        peers
      };
    }

    if (override?.compare?.length) {
      const peers = override.compare.map(name => {
        const peerProfile = getProfileByIdOrName('', name);
        if (!peerProfile) {
          return { major_id: '', display_name: name, track_category: '', focus: '', hint: '', overlap: 999 };
        }
        return {
          major_id: peerProfile.major_id || '',
          display_name: peerProfile.display_name,
          track_category: (getMajorOverride(peerProfile)?.track_category || peerProfile.track_category || ''),
          focus: buildStudentDescription(peerProfile, baseGroup),
          hint: buildStudentFit(peerProfile, baseGroup),
          overlap: 999
        };
      }).filter(Boolean);
      return {
        group_id: baseGroup.id || '',
        group_label: override.group_label || baseGroup.label || '비슷한 학과',
        group_desc: baseGroup.desc || '',
        selected_focus: override.card || buildStudentDescription(profile, baseGroup),
        peers
      };
    }

    const peers = state.catalog.map(row => {
      const peerProfile = state.profileByMajorId.get(row.major_id) || state.profileByName.get(row.display_name) || row;
      if (!peerProfile || peerProfile.major_id === profile?.major_id) return null;
      const peerRow = {
        major_id: row.major_id,
        display_name: row.display_name,
        track_category: peerProfile.track_category || row.track_category || '',
        profile: peerProfile,
        keywords: getMeaningfulKeywords(peerProfile)
      };
      const peerGroup = classifyCandidateGroup(peerRow, '');
      if ((peerGroup.id || '') !== (baseGroup.id || '')) return null;
      let overlap = 0;
      const selectedKeywords = new Set((current.keywords || []).map(normalize));
      (peerRow.keywords || []).forEach(v => { if (selectedKeywords.has(normalize(v))) overlap += 1; });
      return {
        major_id: peerRow.major_id,
        display_name: peerRow.display_name,
        track_category: peerRow.track_category,
        focus: buildStudentDescription(peerProfile, peerGroup),
        hint: buildStudentFit(peerProfile, peerGroup),
        overlap
      };
    }).filter(Boolean)
      .sort((a,b)=> b.overlap - a.overlap || a.display_name.localeCompare(b.display_name,'ko'))
      .slice(0,3);

    return {
      group_id: baseGroup.id || '',
      group_label: override?.group_label || baseGroup.label || '비슷한 학과',
      group_desc: baseGroup.desc || '',
      selected_focus: override?.card || buildStudentDescription(profile, baseGroup),
      peers
    };
  }

  function groupCandidateSuggestions(rows, rawInput){
    const normalizedInput = normalize(rawInput || '');
    let filteredRows = Array.isArray(rows) ? rows.slice() : [];

    // If the input already exactly matches a major name or an alias,
    // restrict grouped suggestions to that same family/group so unrelated
    // fuzzy matches (e.g. 화학과 for 연극영화) do not appear.
    let exactRow = null;
    const exactProfile = state.profiles.find(row => normalize(row.display_name) === normalizedInput || normalize(stripMajorSuffix(row.display_name)) === normalizedInput);
    if (exactProfile) {
      exactRow = filteredRows.find(row => row.major_id === exactProfile.major_id || row.display_name === exactProfile.display_name) || null;
    }
    if (!exactRow) {
      const exactAliasRow = state.aliasRows.find(row => row.normalized_display_name === normalizedInput || normalize(stripMajorSuffix(row.display_name)) === normalizedInput || row.normalized_aliases.includes(normalizedInput));
      if (exactAliasRow) {
        exactRow = filteredRows.find(row => row.major_id === exactAliasRow.major_id || row.display_name === exactAliasRow.display_name) || null;
      }
    }
    if (exactRow) {
      const exactGroup = classifyCandidateGroup(exactRow, rawInput);
      filteredRows = filteredRows.filter(row => {
        if (row.major_id === exactRow.major_id || row.display_name === exactRow.display_name) return true;
        const rowGroup = classifyCandidateGroup(row, rawInput);
        return rowGroup.id === exactGroup.id;
      });
    }

    const orderedGroups = [];
    const groupMap = new Map();
    filteredRows.forEach(row => {
      const group = classifyCandidateGroup(row, rawInput);
      const key = group.id || 'general';
      if (!groupMap.has(key)) {
        const bundle = { id:key, label:group.label, desc:group.desc, items:[] };
        groupMap.set(key, bundle);
        orderedGroups.push(bundle);
      }
      groupMap.get(key).items.push({
        major_id: row.major_id,
        display_name: row.display_name,
        track_category: row.track_category,
        match_label: row.match_label,
        keywords: (row.keywords || []).slice(0, 5),
        score: row.score,
        profile: row.profile || null
      });
    });
    return orderedGroups.map(group => ({
      ...group,
      items: group.items
        .sort((a,b)=> b.score - a.score || a.display_name.localeCompare(b.display_name,'ko'))
        .slice(0, 4)
    }));
  }

  function findCandidates(rawInput){
    const input = String(rawInput || '').trim();
    const normalized = normalize(input);
    if (!normalized) return [];
    const rows = state.catalog.map(row => {
      const profile = state.profileByMajorId.get(row.major_id) || state.profileByName.get(row.display_name) || row;
      const aliasRow = state.aliasRows.find(a => a.major_id === row.major_id || a.display_name === row.display_name);
      const aliases = uniq([...(aliasRow?.aliases || []), row.display_name]);
      const keywords = getMeaningfulKeywords(profile);
      const keywordMatchCount = countKeywordMatches(keywords, input);
      let score = 0;
      if (normalize(row.display_name) === normalized) score += 140;
      if (aliases.map(normalize).includes(normalized)) score += 120;
      if (fuzzyIncludes(row.display_name, input)) score += 45;
      if (aliases.some(v => fuzzyIncludes(v, input))) score += 35;
      if (isTypoCloseMatch(row.display_name, input)) score += 52;
      if (aliases.some(v => isTypoCloseMatch(v, input))) score += 44;
      if (keywordMatchCount) score += 18 + (keywordMatchCount * 8);
      if (fuzzyIncludes(getTrackLabel(profile.track_category || row.track_category || ''), input)) score += 12;
      if ((profile.display_name || '').includes(input)) score += 18;
      score += applyQueryBoost(input, row.display_name);
      if (!score) return null;
      return {
        major_id: row.major_id,
        display_name: row.display_name,
        track_category: profile.track_category || row.track_category || '',
        profile,
        aliasRow,
        score,
        match_label: deriveMatchLabel(score),
        keywords
      };
    }).filter(Boolean);
    return rows
      .sort((a,b)=> b.score - a.score || a.display_name.localeCompare(b.display_name,'ko'))
      .slice(0, 10);
  }


  function buildCandidateEntryFromProfile(profile, input, baseScore = 100){
    if (!profile) return null;
    const aliasRow = state.aliasRows.find(row => row.major_id === profile.major_id || row.display_name === profile.display_name) || null;
    const keywords = getMeaningfulKeywords(profile);
    return {
      major_id: profile.major_id || '',
      display_name: profile.display_name || '',
      track_category: profile.track_category || '',
      profile,
      aliasRow,
      score: baseScore + applyQueryBoost(input, profile.display_name || ''),
      match_label: deriveMatchLabel(baseScore + applyQueryBoost(input, profile.display_name || '')),
      keywords
    };
  }

  function buildDirectAmbiguousResponse(input, names){
    const rows = (names || []).map((name, idx) => {
      const profile = getProfileByIdOrName('', name);
      if (!profile) return null;
      return buildCandidateEntryFromProfile(profile, input, 140 - (idx * 5));
    }).filter(Boolean);
    if (!rows.length) return null;
    return {
      input,
      normalized: normalize(input),
      status: 'ambiguous',
      grouped_suggestions: groupCandidateSuggestions(rows, input),
      suggestions: rows.map(row => ({
        major_id: row.major_id,
        display_name: row.display_name,
        track_category: row.track_category,
        match_label: row.match_label,
        keywords: row.keywords.slice(0, 5)
      }))
    };
  }

  function resolveDirectQueryIntent(rawCareer){
    const input = String(rawCareer || '').trim();
    const normalized = normalize(input);
    if (!normalized) return null;
    const directNames = DIRECT_QUERY_MAJOR_MAP[normalized] || null;
    if (directNames?.length) {
      const profile = getProfileByIdOrName('', directNames[0]);
      if (profile) {
        state.selectedMajorId = profile.major_id || '';
        state.selectedMajorName = profile.display_name || '';
        return buildResolved(profile, 'direct_query_map', input);
      }
    }
    const broadNames = DIRECT_QUERY_BROAD_MAP[normalized] || null;
    if (broadNames?.length) {
      return buildDirectAmbiguousResponse(input, broadNames);
    }
    return null;
  }

  function resolveMajor(rawCareer){
    const input = String(rawCareer || '').trim();
    if (!input) return { input, status: 'empty' };
    const normalized = normalize(input);

    if (state.selectedMajorId) {
      const selectedProfile = getProfileByIdOrName(state.selectedMajorId, state.selectedMajorName);
      if (selectedProfile && (normalize(selectedProfile.display_name) === normalized || normalize(state.selectedMajorName) === normalized)) {
        return buildResolvedFromSelection(selectedProfile, input);
      }
    }

    const directIntent = resolveDirectQueryIntent(input);
    if (directIntent) return directIntent;

    const candidates = findCandidates(input);

    const exactProfile = state.profiles.find(row => normalize(row.display_name) === normalized || normalize(stripMajorSuffix(row.display_name)) === normalized);
    if (exactProfile) {
      state.selectedMajorId = exactProfile.major_id || '';
      state.selectedMajorName = exactProfile.display_name || '';
      return buildResolved(exactProfile, 'exact_major_name', input);
    }

    const typoProfileCandidates = state.profiles.filter(row => isTypoCloseMatch(row.display_name, input) || isTypoCloseMatch(stripMajorSuffix(row.display_name), input));
    if (typoProfileCandidates.length === 1) {
      const profile = typoProfileCandidates[0];
      state.selectedMajorId = profile.major_id || '';
      state.selectedMajorName = profile.display_name || '';
      return buildResolved(profile, 'typo_major_name', input);
    }

    const aliasRow = state.aliasRows.find(row => row.normalized_aliases.includes(normalized) || normalize(stripMajorSuffix(row.display_name)) === normalized);
    if (aliasRow) {
      const profile = state.profileByMajorId.get(aliasRow.major_id) || state.profileByName.get(aliasRow.display_name);
      if (profile) {
        state.selectedMajorId = profile.major_id || '';
        state.selectedMajorName = profile.display_name || '';
        return buildResolved(profile, 'alias_match', input, aliasRow);
      }
    }

    const typoAliasRows = state.aliasRows.filter(row => (row.aliases || []).some(alias => isTypoCloseMatch(alias, input)) || isTypoCloseMatch(row.display_name, input));
    if (typoAliasRows.length === 1) {
      const row = typoAliasRows[0];
      const profile = state.profileByMajorId.get(row.major_id) || state.profileByName.get(row.display_name);
      if (profile) {
        state.selectedMajorId = profile.major_id || '';
        state.selectedMajorName = profile.display_name || '';
        return buildResolved(profile, 'typo_alias_match', input, row);
      }
    }

    if (isBroadQueryKeyword(input) && candidates.length > 1) {
      return {
        input,
        normalized,
        status: 'ambiguous',
        grouped_suggestions: groupCandidateSuggestions(candidates, input),
        suggestions: candidates.map(row => ({
          major_id: row.major_id,
          display_name: row.display_name,
          track_category: row.track_category,
          match_label: row.match_label,
          keywords: row.keywords.slice(0, 5)
        }))
      };
    }

    if (!candidates.length) {
      return { input, normalized, status: 'not_found', suggestions: [] };
    }
    if (candidates.length === 1 && candidates[0].score >= 25) {
      state.selectedMajorId = candidates[0].profile.major_id || '';
      state.selectedMajorName = candidates[0].profile.display_name || '';
      return buildResolved(candidates[0].profile, 'candidate_match', input, candidates[0].aliasRow);
    }
    return {
      input,
      normalized,
      status: 'ambiguous',
      grouped_suggestions: groupCandidateSuggestions(candidates, input),
      suggestions: candidates.map(row => ({
        major_id: row.major_id,
        display_name: row.display_name,
        track_category: row.track_category,
        match_label: row.match_label,
        keywords: row.keywords.slice(0, 5)
      }))
    };
  }

  function buildResolved(profile, matchedBy, input, aliasRow){
    const bridge = state.bridgeByMajorId.get(profile.major_id) || state.bridgeByName.get(profile.display_name) || null;
    const meaningfulKeywords = getMeaningfulKeywords(profile);
    return {
      input,
      normalized: normalize(input),
      status: 'resolved',
      matched_by: matchedBy,
      major_id: profile.major_id,
      display_name: profile.display_name,
      track_category: (getMajorOverride(profile)?.track_category || profile.track_category || ''),
      source_status: profile.source_status || '',
      profile,
      alias_row: aliasRow || null,
      bridge,
      bridge_books: (bridge?.book_candidates || []).slice(0, 8),
      meaningful_keywords: meaningfulKeywords,
      comparison: getSelectedComparison(profile, input)
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
      major_intro: getPreferredMajorIntro(profile, resolved.comparison ? { label: resolved.comparison.group_label } : null),
      core_keywords: resolved.meaningful_keywords || [],
      related_subject_hints: getPreferredSubjectHints(profile),
      inquiry_topics_raw: getPreferredInquiryTopics(profile),
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
    state.activeResolved = data && data.status === 'resolved' ? data : null;
    if (!data || data.status === 'empty') {
      panel.style.display = 'none';
      panel.innerHTML = '';
      dispatchMajorSelection(null);
      return;
    }
    panel.style.display = 'block';

    if (data.status === 'ambiguous') {
      const grouped = Array.isArray(data.grouped_suggestions) && data.grouped_suggestions.length
        ? data.grouped_suggestions
        : [{ id:'general', label:'관련 학과 묶음', desc:'입력한 단어와 가까운 후보입니다.', items:(data.suggestions || []) }];

      panel.innerHTML = `
        <div class="major-engine-kicker">전공 후보 추천</div>
        <h4 class="major-engine-title">관련 학과를 먼저 고르세요</h4>
        <div class="major-engine-sub"><strong>${escapeHtml(data.input || '-')}</strong>와(과) 연결된 학과 후보입니다. 비슷한 학과를 묶음으로 보여주기 때문에, 학생이 학과명을 정확히 몰라도 차이를 보고 선택할 수 있습니다.</div>
        <div class="major-engine-group-list">
          ${grouped.map(group => `
            <section class="major-engine-group">
              <div class="major-engine-group-head">
                <div>
                  <div class="major-engine-group-title">${escapeHtml(group.label || '관련 학과')}</div>
                  <div class="major-engine-group-desc">${escapeHtml(group.desc || '입력한 단어와 연결된 후보입니다.')}</div>
                </div>
                <div class="major-engine-group-count">${escapeHtml(String((group.items || []).length))}개 후보</div>
              </div>
              <div class="major-engine-candidates">
                ${(group.items || []).map(row => `
                  <button type="button" class="major-engine-candidate ${state.selectedMajorId && state.selectedMajorId === row.major_id ? 'is-selected' : ''}" data-major-id="${escapeHtml(row.major_id)}" data-major-select="${escapeHtml(row.display_name)}">
                    <div class="major-engine-candidate-title">${escapeHtml(row.display_name)}</div>
                    <div class="major-engine-candidate-meta">
                      <span class="major-engine-candidate-track">${escapeHtml(row.track_category || '-')}</span>
                      <span class="major-engine-candidate-score">${escapeHtml(row.match_label || '관련 추천')}</span>
                    </div>
                    <div class="major-engine-candidate-keywords">${escapeHtml(buildStudentDescription(row.profile || {}, classifyCandidateGroup(row, data.input || '')))}</div>
                    <div class="major-engine-help">${escapeHtml(buildStudentFit(row.profile || {}, classifyCandidateGroup(row, data.input || '')))}</div>
                  </button>
                `).join('')}
              </div>
            </section>
          `).join('')}
        </div>
        <div class="major-engine-help">입력한 단어를 바탕으로 비슷한 학과를 묶어서 보여줍니다. 먼저 묶음을 보고, 그 안에서 가장 가까운 학과를 클릭하면 전공 프리셋과 자동 키워드가 함께 바뀝니다.</div>
      `;
      dispatchMajorSelection(null);
      return;
    }

    if (data.status !== 'resolved') {
      panel.innerHTML = `
        <div class="major-engine-kicker">전공 해석 미리보기</div>
        <h4 class="major-engine-title">학과명을 표준화하지 못했어요</h4>
        <div class="major-engine-sub">입력값: <strong>${escapeHtml(data.input || '-')}</strong></div>
        <div class="major-engine-suggest">비슷한 학과를 찾지 못했습니다. 더 구체적인 학과명이나 관심 키워드를 입력해 보세요.</div>
      `;
      dispatchMajorSelection(null);
      return;
    }

    const profileReady = data.source_status !== 'skeleton_only';
    panel.innerHTML = `
      <div class="major-engine-kicker">전공 기반 추천 프리셋</div>
      <h4 class="major-engine-title">${escapeHtml(data.display_name)}</h4>
      <div class="major-engine-sub">
        입력한 진로 키워드 <strong>${escapeHtml(data.input)}</strong>를 기준으로 가장 가까운 학과를 <strong>${escapeHtml(data.display_name)}</strong>로 연결했습니다.<br>
        계열: ${escapeHtml(data.track_category || '-')} · 선택 과목: ${escapeHtml($('subject')?.value || '') || '-'}
        ${profileReady ? '' : '<br><strong>현재는 기본 정보 중심으로 먼저 보여주고 있습니다.</strong>'}
      </div>
      <div class="major-engine-suggest"><strong>이 학과는?</strong> ${escapeHtml(data.major_intro || buildStudentDescription(data.profile || {}, data.comparison ? { label: data.comparison.group_label } : null))}</div>
      <div class="major-engine-suggest"><strong>이런 학생에게 잘 맞음:</strong> ${escapeHtml(buildStudentFit(data.profile || {}, data.comparison ? { label: data.comparison.group_label } : null))}</div>
      <div class="major-engine-grid">
        <div class="major-engine-box">
          <div class="major-engine-box-title">전공 핵심 키워드 요약</div>
          <div class="major-engine-chip-wrap">${(data.core_keywords || []).length ? data.core_keywords.map(v => `<span class="major-engine-chip">${escapeHtml(v)}</span>`).join('') : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}</div>
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">선택 과목 안 추천 개념</div>
          <div class="major-engine-chip-wrap">${(data.related_subject_hints || []).length ? data.related_subject_hints.map(v => `<span class="major-engine-chip">${escapeHtml(v)}</span>`).join('') : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}</div>
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">추천 탐구 방향</div>
          ${(data.inquiry_topics_raw || []).length ? `<ul class="major-engine-list">${data.inquiry_topics_raw.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : '<div class="major-engine-empty">아직 입력 전입니다.</div>'}
        </div>
        <div class="major-engine-box">
          <div class="major-engine-box-title">참고 도서</div>
          ${(data.bridge_books || []).length ? `<ul class="major-engine-list">${data.bridge_books.map(v => `<li>${escapeHtml(v.title || v.book_id || '')}</li>`).join('')}</ul>` : '<div class="major-engine-empty">현재 연결된 도서가 없습니다.</div>'}
        </div>
      </div>
      ${(data.comparison && Array.isArray(data.comparison.peers) && data.comparison.peers.length) ? `
      <div class="major-engine-compare">
        <div class="major-engine-compare-head">
          <div>
            <div class="major-engine-compare-title">비슷한 학과와 빠른 비교</div>
            <div class="major-engine-compare-desc">선택한 <strong>${escapeHtml(data.display_name)}</strong>은(는) ${escapeHtml(buildStudentDescription(data.profile || {}, { label: data.comparison.group_label || '' }))} 같은 묶음 안에서도 아래 학과들과 배우는 초점이 조금씩 다릅니다.</div>
          </div>
          <div class="major-engine-group-count">${escapeHtml(data.comparison.group_label || '비슷한 학과')}</div>
        </div>
        <div class="major-engine-compare-grid">
          ${data.comparison.peers.map(peer => `
            <div class="major-engine-compare-card">
              <div class="major-engine-compare-name">${escapeHtml(peer.display_name)}</div>
              <div class="major-engine-compare-track">${escapeHtml(peer.track_category || '-')}</div>
              <div class="major-engine-compare-focus">${escapeHtml(peer.focus || buildStudentDescription(getProfileByIdOrName(peer.major_id, peer.display_name) || { display_name: peer.display_name }, { label: data.comparison.group_label || '' }))}</div>
              <div class="major-engine-compare-hint">${escapeHtml(peer.hint || buildStudentFit(getProfileByIdOrName(peer.major_id, peer.display_name) || { display_name: peer.display_name }, { label: data.comparison.group_label || '' }))}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
      <div class="major-engine-help">학과를 고르면 오른쪽 입력칸에 학과 선택 키워드가 자동 반영됩니다. 이후 아래 공용 엔진에서 교과 개념·보고서 방식까지 이어서 고르면 됩니다.</div>
    `;
    dispatchMajorSelection(data);
  }

  function onPanelClick(event){
    const btn = event.target.closest('[data-major-select]');
    if (!btn) return;
    const name = btn.getAttribute('data-major-select') || '';
    const majorId = btn.getAttribute('data-major-id') || '';
    applySelectedMajor(majorId, name);
  }

  function dispatchMajorSelection(data){
    const detail = data && data.status === 'resolved' ? {
      display_name: data.display_name,
      core_keywords: data.core_keywords || [],
      track_category: data.track_category || '',
      comparison: data.comparison || null
    } : null;
    window.__MAJOR_ENGINE_SELECTED__ = detail;
    window.__MAJOR_ENGINE_LAST_RAW__ = getCareerInput()?.value || '';
    window.__MAJOR_ENGINE_LAST_INPUT__ = getCareerInput()?.value || '';
    window.dispatchEvent(new CustomEvent('major-engine-selection-changed', { detail }));
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
      book_bridge_candidates: data.book_bridge_candidates || [],
      comparison: data.comparison || null
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

  async function bootMajorEngine(){
    await loadAll();
    bindCareerInput();
    renderMajorSummary();
  }

  window.getMajorEngineSelectionData = buildMajorPayload;
  window.__MAJOR_ENGINE_RENDER__ = renderMajorSummary;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootMajorEngine);
    window.addEventListener('load', bootMajorEngine);
  } else {
    bootMajorEngine();
    window.addEventListener('load', bootMajorEngine);
  }
  setTimeout(bootMajorEngine, 1200);
})();
