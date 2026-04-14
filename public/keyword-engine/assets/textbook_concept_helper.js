
window.__MAJOR_ENGINE_HELPER_VERSION__ = "v0.6.0-major-search-compare";

(function(){
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
    selectedMajorName: ''
  };

  function $(id){ return document.getElementById(id); }
  function normalize(value){
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g,'')
      .replace(/[()\-_/·.,]/g,'')
      .replace(/학과|학부|전공|예과/g,'');
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
  function fuzzyIncludes(a,b){
    const na = normalize(a); const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
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
      injectStyles();
      bindCareerInput();
      renderMajorSummary();
      startMiniPayloadPatch();
    } catch (error) {
      console.warn('major engine helper load failed:', error);
    }
  }

  function getCareerInput(){ return $('career'); }

  function bindCareerInput(){
    const el = getCareerInput();
    if (!el || el.dataset.majorBound === '1') return;
    el.dataset.majorBound = '1';
    ['input','change','focus','blur'].forEach(evt => {
      el.addEventListener(evt, () => {
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

  function buildHeuristicKeywords(displayName, trackCategory){
    const name = String(displayName || '');
    const rules = [
      [/주거환경|실내/, ['주거 설계','실내 환경','공간 분석','생활 동선','주거문화']],
      [/환경공학|지구환경|대기과학|환경/, ['환경 분석','기후 데이터','지속가능성','오염 원인','환경 정책']],
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
      [/통계|응용통계/, ['데이터 분석','확률 모델','통계 추정','그래프 해석','표본 조사']],
      [/수학/, ['수리 모델링','증명 논리','문제 해결','함수 해석','정량 분석']],
      [/화학|화학공학/, ['물질 구조','반응 원리','실험 설계','정량 분석','에너지 변화']],
      [/생명공학|생명과학|생물|수산생명|미생물|동물자원|식물자원|원예|식품공학|식품영양/, ['생명 시스템','변화 분석','실험 설계','생체 데이터','응용 사례']],
      [/물리|천문|우주|해양/, ['관측 데이터','원리 해석','시스템 이해','변화 분석','모델링']],
      [/간호|의예|약학|치의|한의|수의|보건|방사선|물리치료|임상병리|작업치료|재활상담|치위생|치기공|응급구조|언어치료/, ['건강 데이터','생체 반응','질병 이해','의료 사례','문제 해결']],
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


  const GROUP_META = {
    rehab_therapy: { id:'rehab_therapy', label:'재활·치료', desc:'기능 회복, 재활, 의사소통 지원처럼 회복을 돕는 학과입니다.' },
    clinical_health: { id:'clinical_health', label:'보건·임상', desc:'환자 돌봄, 검사, 영상, 보건관리처럼 의료 현장과 가까운 학과입니다.' },
    bio_engineering: { id:'bio_engineering', label:'바이오·생명공학', desc:'생명 현상을 실험과 기술로 연결하는 학과입니다.' },
    bio_science: { id:'bio_science', label:'기초 생명과학', desc:'생명 현상의 원리를 실험과 데이터로 탐구하는 학과입니다.' },
    bio_devices: { id:'bio_devices', label:'의료기기·바이오소재', desc:'의료기기, 바이오소재, 생체재료처럼 공학과 생명 기술이 만나는 학과입니다.' },
    space_housing: { id:'space_housing', label:'공간·주거 환경', desc:'주거, 실내, 공간 설계처럼 생활 공간과 연결된 학과입니다.' },
    climate_nature: { id:'climate_nature', label:'기후·자연 환경', desc:'기후, 대기, 지구 시스템, 자연 관측과 연결된 학과입니다.' },
    city_infra: { id:'city_infra', label:'도시·인프라', desc:'도시 구조, 인프라, 건설·토목처럼 생활 기반을 다루는 학과입니다.' },
    data_statistics: { id:'data_statistics', label:'데이터·통계', desc:'수치, 데이터 해석, 모델링과 연결된 학과입니다.' },
    media_content: { id:'media_content', label:'미디어·콘텐츠', desc:'미디어, 콘텐츠, 커뮤니케이션처럼 정보 전달과 해석을 다루는 학과입니다.' },
    psychology_counsel: { id:'psychology_counsel', label:'심리·상담', desc:'인지, 정서, 행동, 상담 사례를 중심으로 보는 학과입니다.' },
    business_global: { id:'business_global', label:'국제·통상', desc:'국제 이슈, 무역, 경제 흐름과 연결된 사회계열 학과입니다.' },
    business_service: { id:'business_service', label:'경영·서비스', desc:'기업 운영, 소비자, 관광·호텔 같은 서비스 산업과 연결된 학과입니다.' },
    law_public: { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.' },
    bio_health: { id:'bio_health', label:'생명·보건', desc:'건강, 생명, 의료와 연결된 학과입니다.' },
    materials_devices: { id:'materials_devices', label:'반도체·소자 설계', desc:'재료, 반도체, 회로, 장치 설계와 연결된 학과입니다.' },
    language_culture: { id:'language_culture', label:'언어·문화·사상', desc:'언어, 텍스트, 문화와 사상을 중심으로 읽는 학과입니다.' },
    general: { id:'general', label:'관련 학과 묶음', desc:'입력한 단어와 연결된 후보를 모아 보여줍니다.' }
  };

  const MAJOR_GROUP_OVERRIDES = {
    '보건관리학과':'clinical_health',
    '간호학과':'clinical_health',
    '방사선학과':'clinical_health',
    '임상병리학과':'clinical_health',
    '치위생학과':'clinical_health',
    '치기공학과':'clinical_health',
    '응급구조학과':'clinical_health',
    '물리치료학과':'rehab_therapy',
    '작업치료학과':'rehab_therapy',
    '언어치료학과':'rehab_therapy',
    '재활상담학과':'rehab_therapy',
    '식품생명공학과':'bio_engineering',
    '제약공학과':'bio_engineering',
    '화공생명공학과':'bio_engineering',
    '의공학과':'bio_devices',
    '고분자공학과':'bio_devices',
    '생명과학과':'bio_science',
    '반도체공학과':'materials_devices',
    '신소재공학과':'materials_devices',
    '전자공학과':'materials_devices',
    '국제학부':'business_global',
    '국제통상학과':'business_global',
    '경제학과':'business_global',
    '농업경제학과':'business_global',
    '경영학과':'business_service',
    '관광경영학과':'business_service',
    '호텔경영학과':'business_service'
  };

  function getGroupMeta(groupId){
    return GROUP_META[groupId] || GROUP_META.general;
  }

  function getQueryAllowedGroupIds(rawInput){
    const input = normalize(rawInput || '');
    if (!input) return null;
    if (input.includes('보건')) return new Set(['clinical_health','rehab_therapy']);
    if (input.includes('간호') || input.includes('방사선') || input.includes('임상병리')) return new Set(['clinical_health']);
    if (input.includes('물리치료') || input.includes('작업치료') || input.includes('언어치료') || input.includes('재활')) return new Set(['rehab_therapy']);
    if (input.includes('바이오')) return new Set(['bio_engineering','bio_science','bio_devices']);
    if (input.includes('반도체')) return new Set(['materials_devices']);
    if (input.includes('국제')) return new Set(['business_global','business_service']);
    if (input.includes('심리')) return new Set(['psychology_counsel']);
    if (input.includes('미디어')) return new Set(['media_content']);
    if (input.includes('환경')) return new Set(['space_housing','climate_nature','city_infra']);
    return null;
  }

  function isGroupAllowedForQuery(groupId, rawInput){
    const allowed = getQueryAllowedGroupIds(rawInput);
    return !allowed || allowed.has(groupId);
  }


  function classifyCandidateGroup(row, rawInput){
    const input = String(rawInput || '').trim();
    const profile = row?.profile || {};
    const name = String(row?.display_name || profile?.display_name || '');
    const textBag = [
      name,
      row?.track_category || '',
      ...(row?.keywords || []),
      ...(profile?.related_subject_hints || []),
      ...(profile?.inquiry_topics_raw || [])
    ].join(' ');

    const overrideGroupId = MAJOR_GROUP_OVERRIDES[name];
    if (overrideGroupId && isGroupAllowedForQuery(overrideGroupId, input)) {
      return getGroupMeta(overrideGroupId);
    }

    const rules = [
      { id:'rehab_therapy', test: /(물리치료|작업치료|언어치료|재활상담|재활)/ },
      { id:'clinical_health', test: /(보건관리|간호|방사선|임상병리|치위생|치기공|응급구조|의예|약학|한의|수의|보건)/ },
      { id:'bio_devices', test: /(의공|고분자|생체재료|바이오소재|의료기기|바이오센서)/ },
      { id:'bio_engineering', test: /(식품생명공학|제약공학|화공생명|생명공학|미생물|유전|세포|단백질|발효|식품|바이오)/ },
      { id:'bio_science', test: /(생명과학|생물학|분자생물|생태학)/ },
      { id:'space_housing', test: /(주거환경|주거|실내|주택|공간|생활환경|인테리어|실내디자인)/ },
      { id:'climate_nature', test: /(지구환경|대기과학|기후|환경과학|지구과학|천문|해양|생태|관측|자연환경)/ },
      { id:'city_infra', test: /(도시|토목|건설|인프라|교통|도시행정|조경|건축공학|건축학)/ },
      { id:'data_statistics', test: /(통계|응용통계|데이터|분석|확률|모델링|수리|정량)/ },
      { id:'media_content', test: /(미디어|콘텐츠|신문방송|광고홍보|언론정보|커뮤니케이션|문화콘텐츠|방송)/ },
      { id:'psychology_counsel', test: /(심리|상담|정서|인지|행동과학)/ },
      { id:'business_global', test: /(국제학부|국제통상|무역|통상|글로벌|경제학|농업경제)/ },
      { id:'business_service', test: /(경영정보|경영|관광|호텔|회계|세무|부동산|소비자)/ },
      { id:'law_public', test: /(행정|정책|법학|정치외교|공공|경찰|군사|외교)/ },
      { id:'materials_devices', test: /(신소재|재료|반도체|금속|전자|전기|센서|정보통신|컴퓨터|소프트웨어|AI|로봇|기계|자동차)/ },
      { id:'language_culture', test: /(국어국문|언어|영어|일어|중어|불어|독어|노어|아랍어|철학|사학|고고|신학|한문|한국어|미학|문예창작|문화인류|문화유산)/ }
    ];

    for (const rule of rules) {
      if (!rule.test.test(textBag) && !(input && rule.test.test(input))) continue;
      if (!isGroupAllowedForQuery(rule.id, input)) continue;
      return getGroupMeta(rule.id);
    }

    const track = String(row?.track_category || '');
    if (track.includes('의약')) {
      const fallback = input && getQueryAllowedGroupIds(input);
      if (fallback) {
        const preferred = ['clinical_health','rehab_therapy','bio_engineering','bio_science','bio_devices'].find(v => fallback.has(v));
        if (preferred) return getGroupMeta(preferred);
      }
      return getGroupMeta('clinical_health');
    }
    if (track.includes('공학')) return getGroupMeta(isGroupAllowedForQuery('materials_devices', input) ? 'materials_devices' : 'general');
    if (track.includes('자연')) {
      const fallback = input && getQueryAllowedGroupIds(input);
      if (fallback) {
        const preferred = ['bio_science','climate_nature','space_housing','city_infra'].find(v => fallback.has(v));
        if (preferred) return getGroupMeta(preferred);
      }
      return getGroupMeta('climate_nature');
    }
    if (track.includes('인문')) return getGroupMeta('language_culture');
    if (track.includes('사회')) {
      const fallback = input && getQueryAllowedGroupIds(input);
      if (fallback) {
        const preferred = ['business_global','business_service','law_public','psychology_counsel','media_content'].find(v => fallback.has(v));
        if (preferred) return getGroupMeta(preferred);
      }
      return getGroupMeta('business_global');
    }
    return getGroupMeta('general');
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
      [/경영|경제|무역|국제|통상|회계|세무|부동산/, '시장·정책·국제 흐름 해석'],
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

  function getSelectedComparison(profile, rawInput){
    const current = {
      major_id: profile?.major_id || '',
      display_name: profile?.display_name || '',
      track_category: profile?.track_category || '',
      profile,
      keywords: getMeaningfulKeywords(profile)
    };
    const group = classifyCandidateGroup(current, rawInput);
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
      const peerGroup = classifyCandidateGroup(peerRow, rawInput);
      if ((peerGroup.id || '') !== (group.id || '')) return null;
      let overlap = 0;
      const selectedKeywords = new Set((current.keywords || []).map(normalize));
      (peerRow.keywords || []).forEach(v => { if (selectedKeywords.has(normalize(v))) overlap += 1; });
      if (normalize(peerRow.display_name).includes(normalize(rawInput)) || normalize(rawInput).includes(normalize(peerRow.display_name))) overlap += 2;
      return {
        major_id: peerRow.major_id,
        display_name: peerRow.display_name,
        track_category: peerRow.track_category,
        focus: getPrimaryFocus(peerProfile, peerGroup),
        hint: `이 학과는 ${getPrimaryFocus(peerProfile, peerGroup)} 쪽이 더 강합니다.`,
        overlap
      };
    }).filter(Boolean)
      .sort((a,b)=> b.overlap - a.overlap || a.display_name.localeCompare(b.display_name,'ko'))
      .slice(0,3);

    return {
      group_id: group.id || '',
      group_label: group.label || '비슷한 학과',
      group_desc: group.desc || '',
      selected_focus: getPrimaryFocus(profile, group),
      peers
    };
  }

  function groupCandidateSuggestions(rows, rawInput){
    const orderedGroups = [];
    const groupMap = new Map();
    const allowed = getQueryAllowedGroupIds(rawInput);
    const sourceRows = Array.isArray(rows) ? rows : [];
    sourceRows.forEach(row => {
      const group = classifyCandidateGroup(row, rawInput);
      if (allowed && !allowed.has(group.id)) return;
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
        score: row.score
      });
    });
    const targetGroups = orderedGroups.length ? orderedGroups : [];
    return targetGroups.map(group => ({
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
      if (keywordMatchCount) score += 18 + (keywordMatchCount * 8);
      if (fuzzyIncludes(getTrackLabel(profile.track_category || row.track_category || ''), input)) score += 12;
      if ((profile.display_name || '').includes(input)) score += 18;
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

    const exactProfile = state.profiles.find(row => normalize(row.display_name) === normalized);
    if (exactProfile) {
      state.selectedMajorId = exactProfile.major_id || '';
      state.selectedMajorName = exactProfile.display_name || '';
      return buildResolved(exactProfile, 'exact_major_name', input);
    }

    const aliasRow = state.aliasRows.find(row => row.normalized_aliases.includes(normalized));
    if (aliasRow) {
      const profile = state.profileByMajorId.get(aliasRow.major_id) || state.profileByName.get(aliasRow.display_name);
      if (profile) {
        state.selectedMajorId = profile.major_id || '';
        state.selectedMajorName = profile.display_name || '';
        return buildResolved(profile, 'alias_match', input, aliasRow);
      }
    }

    const candidates = findCandidates(input);
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
      track_category: profile.track_category || '',
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
      major_intro: profile.major_intro || '',
      core_keywords: resolved.meaningful_keywords || [],
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
                    <div class="major-engine-candidate-keywords">${escapeHtml((row.keywords || []).slice(0, 5).join(', ') || '관련 키워드 준비 중')}</div>
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
        입력값 정규화: <strong>${escapeHtml(data.input)}</strong> → <strong>${escapeHtml(data.display_name)}</strong><br>
        선택 과목: ${escapeHtml($('subject')?.value || '') || '-'} · 계열: ${escapeHtml(data.track_category || '-')} · 매칭: ${escapeHtml(data.matched_by || '-')}
        ${profileReady ? '' : '<br><strong>현재는 skeleton 상태라 기본 정보만 표시합니다.</strong>'}
      </div>
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
            <div class="major-engine-compare-desc">선택한 <strong>${escapeHtml(data.display_name)}</strong>은(는) <strong>${escapeHtml(data.comparison.selected_focus || '')}</strong> 쪽에 더 가깝습니다. 같은 묶음 안에서도 아래 학과들과 초점이 조금씩 다릅니다.</div>
          </div>
          <div class="major-engine-group-count">${escapeHtml(data.comparison.group_label || '비슷한 학과')}</div>
        </div>
        <div class="major-engine-compare-grid">
          ${data.comparison.peers.map(peer => `
            <div class="major-engine-compare-card">
              <div class="major-engine-compare-name">${escapeHtml(peer.display_name)}</div>
              <div class="major-engine-compare-track">${escapeHtml(peer.track_category || '-')}</div>
              <div class="major-engine-compare-focus">더 가까운 초점: ${escapeHtml(peer.focus || '')}</div>
              <div class="major-engine-compare-hint">${escapeHtml(peer.hint || '')}</div>
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
    window.dispatchEvent(new CustomEvent('major-engine-selection-changed', {
      detail: data && data.status === 'resolved' ? {
        display_name: data.display_name,
        core_keywords: data.core_keywords || [],
        track_category: data.track_category || '',
        comparison: data.comparison || null
      } : null
    }));
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }
})();
