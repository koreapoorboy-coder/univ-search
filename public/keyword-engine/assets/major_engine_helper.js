
window.__MAJOR_ENGINE_HELPER_VERSION__ = "v0.7.7-major-search-integrated-bundle-v13";

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

  function buildVirtualMajorProfile(name, majorId, existingRow){
    const override = getMajorOverride(name) || {};
    const fallbackKeywords = uniq([
      ...((existingRow && Array.isArray(existingRow.core_keywords)) ? existingRow.core_keywords : []),
      ...((existingRow && Array.isArray(existingRow.recommended_keywords)) ? existingRow.recommended_keywords : []),
      ...((override.subjects || [])),
      ...((override.topics || [])).map(v => String(v).split(/[·,]/)[0].trim())
    ]).filter(Boolean).slice(0, 6);
    return {
      ...(existingRow || {}),
      major_id: majorId,
      display_name: name,
      track_category: override.track_category || existingRow?.track_category || '',
      core_keywords: existingRow?.core_keywords || fallbackKeywords,
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

      if (!aliasNameSet.has(key)) {
        state.aliases.push({
          major_id: majorId,
          display_name: name,
          aliases: uniq([name, String(name).replace(/학과$/, ''), String(name).replace(/학부$/, '')]).filter(Boolean)
        });
        aliasNameSet.add(key);
      }
    });
  }

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
      ensureOverrideMajorsInSearch();

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


  const GENERIC_MAJOR_INTRO_PATTERNS = [
    /source 구조화가 완료된 전공입니다/,
    /세부 문장 추출은 후속 보강 단계/,
    /기반의 source 구조화가 완료/
  ];

  const BROAD_QUERY_KEYWORDS = new Set(['환경','심리','교육','복지','미디어','국제','반도체','바이오','보건']);

  const QUERY_BOOST_RULES = [
    { queries:['환경'], test: /(건설환경공학|토목환경공학|지구환경과학|주거환경|도시공학)/, boost: 38 },
    { queries:['도시'], test: /(도시공학|건설환경공학|토목환경공학|주거환경|지구환경과학)/, boost: 36 },
    { queries:['주거'], test: /(주거환경|도시공학)/, boost: 34 },
    { queries:['심리'], test: /(심리학|상담심리학|재활상담학)/, boost: 42 },
    { queries:['교육'], test: /(교육학|유아교육|아동학|특수교육|사회복지학)/, boost: 40 },
    { queries:['복지'], test: /(사회복지학|상담심리학|재활상담학|특수교육|아동학)/, boost: 38 },
    { queries:['미디어'], test: /(미디어커뮤니케이션|광고홍보|문화인류|문화유산)/, boost: 34 },
    { queries:['국제'], test: /(국제학부|국제통상학|경제학|경영학)/, boost: 34 },
    { queries:['반도체'], test: /(반도체공학|신소재공학|전자공학)/, boost: 36 },
    { queries:['바이오'], test: /(생명공학|생명과학|식품생명공학|화공생명공학|제약공학|의공학)/, boost: 44 },
    { queries:['보건'], test: /(보건관리학|간호학|방사선학|임상병리학|물리치료학|작업치료학|언어치료학)/, boost: 34 }
  ];

  const GROUP_META_OVERRIDES = {
    '보건·임상': { id:'clinical_health', label:'환자 진료·검사 쪽', desc:'환자 돌봄, 검사, 영상, 보건관리처럼 의료 현장과 가까운 학과입니다.' },
    '재활·치료': { id:'rehab_therapy', label:'회복 지원·치료 쪽', desc:'기능 회복, 재활, 의사소통 지원처럼 회복을 돕는 학과입니다.' },
    '바이오·생명공학': { id:'bio_engineering', label:'실험·기술 응용 쪽', desc:'생명 현상을 실험과 기술로 연결하는 학과입니다.' },
    '바이오·생명과학': { id:'bio_science', label:'기초 생명과학 쪽', desc:'생명 현상의 원리를 실험과 데이터로 탐구하는 학과입니다.' },
    '바이오소재·의료기기': { id:'bio_materials_devices', label:'의료기기·바이오소재 쪽', desc:'의료기기, 바이오소재, 생체재료처럼 공학과 생명 기술이 만나는 학과입니다.' },
    '반도체·전자': { id:'materials_devices', label:'반도체·소자 설계 쪽', desc:'재료, 반도체, 회로, 장치 설계와 연결된 학과입니다.' },
    '심리·상담': { id:'psychology_counsel', label:'마음 이해·상담 쪽', desc:'인지, 정서, 상담 사례를 중심으로 보는 학과입니다.' },
    '교육·아동 발달': { id:'education_child', label:'교육·발달 지원 쪽', desc:'유아, 아동, 학습 발달, 특수교육처럼 성장과 학습 지원을 다루는 학과입니다.' },
    '복지·상담 지원': { id:'welfare_support', label:'복지·상담 지원 쪽', desc:'상담, 복지 제도, 사례 지원처럼 삶의 적응과 회복을 돕는 학과입니다.' },
    '국제·통상': { id:'global_trade', label:'국제 이슈·무역 쪽', desc:'국제 이슈, 무역, 경제 흐름과 연결된 사회계열 학과입니다.' },
    '경영·서비스': { id:'business_service', label:'기업 운영·서비스 쪽', desc:'기업 운영, 소비자, 관광·호텔 같은 서비스 산업과 연결된 학과입니다.' },
    '행정·정책·법': { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.' },
    '미디어·콘텐츠': { id:'media_content', label:'미디어·콘텐츠 기획 쪽', desc:'미디어, 콘텐츠, 커뮤니케이션처럼 정보 전달과 해석을 다루는 학과입니다.' },
    '환경 관련 추천': { id:'environment', label:'환경·도시 시스템 쪽', desc:'기후, 환경, 도시 기반시설과 연결된 학과입니다.' },
    '공간·주거 환경': { id:'space_housing', label:'주거·공간 설계 쪽', desc:'주거, 실내, 공간 설계처럼 생활 공간과 연결된 학과입니다.' },
    '도시·인프라': { id:'city_infra', label:'도시 기반시설 쪽', desc:'도시 구조, 인프라, 건설·토목처럼 생활 기반을 다루는 학과입니다.' }
  };

  function getGroupMetaByLabel(label){
    const key = String(label || '').trim();
    return GROUP_META_OVERRIDES[key] || GROUP_META_OVERRIDES[({
      '환자 진료·검사 쪽':'보건·임상',
      '회복 지원·치료 쪽':'재활·치료',
      '실험·기술 응용 쪽':'바이오·생명공학',
      '기초 생명과학 쪽':'바이오·생명과학',
      '의료기기·바이오소재 쪽':'바이오소재·의료기기',
      '반도체·소자 설계 쪽':'반도체·전자',
      '마음 이해·상담 쪽':'심리·상담',
      '교육·발달 지원 쪽':'교육·아동 발달',
      '복지·상담 지원 쪽':'복지·상담 지원',
      '국제 이슈·무역 쪽':'국제·통상',
      '기업 운영·서비스 쪽':'경영·서비스',
      '행정·정책·법':'행정·정책·법',
      '미디어·콘텐츠 기획 쪽':'미디어·콘텐츠',
      '환경·도시 시스템 쪽':'환경 관련 추천',
      '주거·공간 설계 쪽':'공간·주거 환경',
      '도시 기반시설 쪽':'도시·인프라'
    })[key]] || null;
  }


  function getQueryAllowedGroupIds(rawInput){
    const input = normalize(rawInput || '');
    if (!input) return null;
    if (input.includes('보건')) return new Set(['clinical_health','rehab_therapy']);
    if (input.includes('간호') || input.includes('방사선') || input.includes('임상병리') || input.includes('보건관리') || input.includes('안경광학')) return new Set(['clinical_health']);
    if (input.includes('물리치료') || input.includes('작업치료') || input.includes('언어치료') || input.includes('재활')) return new Set(['rehab_therapy']);
    if (input.includes('행정') || input.includes('정치') || input.includes('법') || input.includes('경찰') || input.includes('공공') || input.includes('군사')) return new Set(['law_public']);
    if (input.includes('경영') || input.includes('관광') || input.includes('호텔') || input.includes('소비자')) return new Set(['business_service']);
    if (input.includes('경제') || input.includes('통상') || input.includes('무역')) return new Set(['global_trade']);
    if (input.includes('바이오') || input.includes('생명') || input.includes('유전') || input.includes('제약') || input.includes('의공') || input.includes('식품생명') || input.includes('화공생명')) return new Set(['bio_engineering','bio_science','bio_materials_devices']);
    if (input.includes('반도체')) return new Set(['materials_devices']);
    if (input.includes('국제')) return new Set(['global_trade','business_service']);
    if (input.includes('심리') || input.includes('상담')) return new Set(['psychology_counsel','welfare_support']);
    if (input.includes('교육') || input.includes('유아') || input.includes('아동') || input.includes('특수')) return new Set(['education_child','welfare_support']);
    if (input.includes('복지')) return new Set(['welfare_support','education_child']);
    if (input.includes('미디어') || input.includes('광고') || input.includes('홍보') || input.includes('언론') || input.includes('방송') || input.includes('콘텐츠') || input.includes('신문')) return new Set(['media_content']);
    if (input.includes('환경') || input.includes('도시') || input.includes('주거') || input.includes('건설') || input.includes('토목') || input.includes('인프라')) return new Set(['environment','space_housing','city_infra']);
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
      compare: ['행정학과','정치외교학과','법학과']
    },
    '행정학과': {
      card: '정부와 공공기관의 제도, 정책, 행정 운영을 중심으로 배우는 학과입니다.',
      fit: '공공 문제를 제도와 정책으로 해결하는 방식에 관심 있는 학생에게 잘 맞습니다.',
      intro: '행정학과는 정부와 공공기관이 사회 문제를 해결하는 과정을 이해하기 위해 정책 설계, 제도 운영, 행정 조직, 공공서비스를 배우는 학과입니다.',
      subjects: ['통합사회', '정치와 법', '사회와 문화', '공통국어', '경제'],
      topics: ['공공정책 설계 과정과 이해관계 조정 방식 분석', '행정 제도가 시민 생활에 미치는 영향 탐구', '지방행정과 중앙행정의 역할 차이 비교'],
      group_label: '행정·정책·법',
      compare: ['경찰행정학과','정치외교학과','공공인재학부']
    },
    '정치외교학과': {
      card: '권력, 국가, 외교, 국제정치를 중심으로 공공 문제를 해석하는 학과입니다.',
      fit: '정치 구조와 국가 관계, 외교 이슈를 넓게 읽고 싶은 학생에게 잘 맞습니다.',
      intro: '정치외교학과는 국내 정치 구조와 국제정치, 외교 전략, 국가 간 관계를 배우며 권력과 제도를 분석하는 학과입니다.',
      subjects: ['통합사회', '정치와 법', '세계사', '공통국어', '영어'],
      topics: ['국가 간 갈등이 외교 전략에 미치는 영향 분석', '정치 제도 차이가 시민 참여에 미치는 효과 비교', '국제기구와 외교 협상의 역할 탐구'],
      group_label: '행정·정책·법',
      compare: ['행정학과','법학과','국제학부']
    },
    '법학과': {
      card: '법과 제도, 권리와 책임, 분쟁 해결 원리를 중심으로 배우는 학과입니다.',
      fit: '규범과 제도, 권리 판단과 사회 질서를 논리적으로 이해하고 싶은 학생에게 잘 맞습니다.',
      intro: '법학과는 헌법, 민법, 형법 등 사회 질서를 구성하는 법 체계를 배우고 권리와 책임, 분쟁 해결 원리를 해석하는 학과입니다.',
      subjects: ['정치와 법', '통합사회', '공통국어', '사회와 문화', '영어'],
      topics: ['법 체계가 사회 질서 유지에 미치는 영향 분석', '권리와 책임 충돌 사례의 판단 기준 탐구', '형사 절차와 시민 기본권의 관계 비교'],
      group_label: '행정·정책·법',
      compare: ['경찰행정학과','행정학과','정치외교학과']
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
      compare: ['경찰행정학과','정치외교학과','공공인재학부']
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
      card: '관광 산업과 서비스 운영, 고객 경험, 지역 자원을 함께 다루는 학과입니다.',
      fit: '관광 산업 구조와 서비스 기획, 지역 자원 활용에 관심 있는 학생에게 잘 맞습니다.',
      intro: '관광경영학과는 관광 산업 구조와 여행 상품, 고객 경험, 지역 관광 자원의 운영과 기획을 배우는 학과입니다.',
      subjects: ['통합사회', '경제', '영어', '세계시민과 지리', '공통국어'],
      topics: ['지역 관광 자원이 산업화되는 방식 분석', '여행 상품 기획이 소비자 선택에 미치는 영향 탐구', '관광 산업 변화가 서비스 운영에 미치는 효과 비교'],
      group_label: '경영·서비스',
      compare: ['호텔경영학과','경영학과','글로벌경영학과']
    },
    '호텔경영학과': {
      card: '숙박·서비스 산업의 운영, 브랜드, 고객 경험을 함께 다루는 학과입니다.',
      fit: '서비스 현장 운영과 고객 경험 관리, 브랜드 전략에 관심 있는 학생에게 잘 맞습니다.',
      intro: '호텔경영학과는 호텔과 숙박 산업의 운영, 서비스 설계, 브랜드 전략, 고객 경험 관리를 배우는 학과입니다.',
      subjects: ['경제', '통합사회', '영어', '독서와 작문', '세계시민과 지리'],
      topics: ['숙박 서비스 품질이 고객 만족에 미치는 영향 분석', '브랜드 전략이 호텔 운영에 미치는 효과 탐구', '관광 산업 변화와 숙박 서비스 구조 비교'],
      group_label: '경영·서비스',
      compare: ['관광경영학과','경영학과','소비자학과']
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
    '고분자공학과': {
      card: '고분자 소재의 구조와 성질을 이해하고 바이오소재·의료용 재료로 확장하는 학과입니다.',
      fit: '재료의 성질이 의료용 소재와 생활 기술에 어떻게 적용되는지 궁금한 학생에게 잘 맞습니다.',
      intro: '고분자공학과는 플라스틱, 고무, 섬유, 생체재료 같은 고분자 소재의 구조와 성질을 배우고 이를 의료, 환경, 산업 소재로 확장하는 학과입니다.',
      subjects: ['화학', '생명과학', '통합과학1', '공통수학1', '정보'],
      topics: ['생체적합성 고분자 소재가 의료 분야에 쓰이는 이유', '플라스틱과 바이오소재의 성질 비교', '고분자 구조 변화가 재료 성능에 미치는 영향 탐구'],
      group_label: '바이오소재·의료기기',
      compare: ['의공학과','신소재공학과','화공생명공학과']
    },
    '반도체공학과': {
      card: '칩 설계와 반도체 공정, 소자 동작 원리를 배우는 학과입니다.',
      fit: '칩, 회로, 공정 같은 반도체 기술에 관심 있는 학생에게 잘 맞습니다.',
      group_label: '반도체·전자',
      compare: ['신소재공학과','전자공학과']
    },
    '신소재공학과': {
      card: '새로운 소재의 구조와 성질을 분석해 반도체·배터리·부품으로 연결하는 학과입니다.',
      fit: '소재의 구조와 성질이 기술 성능을 바꾸는 과정에 흥미가 있는 학생에게 잘 맞습니다.',
      group_label: '반도체·전자',
      compare: ['반도체공학과','전자공학과']
    },
    '전자공학과': {
      card: '회로, 신호, 센서, 통신 시스템을 설계하는 학과입니다.',
      fit: '회로와 신호, 장치 동작 원리에 관심 있는 학생에게 잘 맞습니다.',
      group_label: '반도체·전자',
      compare: ['반도체공학과','신소재공학과']
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
      compare: ['보건관리학과','생명공학과','간호학과']
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
  };

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
      { id:'bio_engineering', label:'실험·기술 응용 쪽', desc:'생명 현상을 실험과 기술로 연결하는 학과입니다.', test: /(식품생명공학|제약공학|화공생명|생명공학|바이오|미생물|유전|세포|단백질|발효|식품)/ },
      { id:'bio_science', label:'기초 생명과학 쪽', desc:'생명 현상의 원리를 실험과 데이터로 탐구하는 학과입니다.', test: /(생명과학|생물학|분자생물|생태학)/ },
      { id:'space_housing', label:'주거·공간 설계 쪽', desc:'주거, 실내, 공간 설계처럼 생활 공간과 연결된 학과입니다.', test: /(주거환경|주거|실내|주택|공간|생활환경|인테리어|실내디자인)/ },
      { id:'environment', label:'환경·도시 시스템 쪽', desc:'기후, 환경, 도시 기반시설과 연결된 학과입니다.', test: /(지구환경|대기과학|기후|환경과학|지구과학|생태|건설환경|토목환경|수자원|도시환경|환경)/ },
      { id:'city_infra', label:'도시 기반시설 쪽', desc:'도시 구조, 인프라, 건설·토목처럼 생활 기반을 다루는 학과입니다.', test: /(도시|토목|건설|인프라|교통|도시행정|조경|건축공학|건축학)/ },
      { id:'media_content', label:'미디어·콘텐츠 기획 쪽', desc:'미디어, 콘텐츠, 커뮤니케이션처럼 정보 전달과 해석을 다루는 학과입니다.', test: /(미디어|콘텐츠|신문방송|광고홍보|언론정보|커뮤니케이션|문화콘텐츠|방송)/ },
      { id:'psychology_counsel', label:'마음 이해·상담 쪽', desc:'인지, 정서, 상담 사례를 중심으로 보는 학과입니다.', test: /(심리|상담|정서|인지|행동과학)/ },
      { id:'global_trade', label:'국제 이슈·무역 쪽', desc:'국제 이슈, 무역, 경제 흐름과 연결된 사회계열 학과입니다.', test: /(국제학부|국제통상|무역|통상|글로벌|경제학|농업경제)/ },
      { id:'business_service', label:'기업 운영·서비스 쪽', desc:'기업 운영, 소비자, 관광·호텔 같은 서비스 산업과 연결된 학과입니다.', test: /(경영|관광|호텔|회계|세무|부동산|소비자)/ },
      { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.', test: /(행정|정책|법학|정치외교|공공|경찰|군사|외교)/ },
      { id:'materials_devices', label:'반도체·소자 설계 쪽', desc:'재료, 반도체, 회로, 장치 설계와 연결된 학과입니다.', test: /(신소재|재료|반도체|금속|전자|전기|센서|정보통신|컴퓨터|소프트웨어|AI|로봇|기계|자동차)/ },
      { id:'data_statistics', label:'데이터·통계', desc:'수치, 데이터 해석, 모델링과 연결된 학과입니다.', test: /(통계|응용통계|확률|모델링|수리|정량)/ },
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
        const preferred = ['materials_devices','bio_engineering','bio_materials_devices','city_infra'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
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
        const preferred = ['bio_science','environment','space_housing','city_infra'].find(v => allowed.has(v));
        if (preferred) return { ...(getGroupMetaByLabel({
          bio_science:'바이오·생명과학',
          environment:'환경 관련 추천',
          space_housing:'공간·주거 환경',
          city_infra:'도시·인프라'
        }[preferred])) };
      }
      return getGroupMetaByLabel('환경 관련 추천');
    }
    if (track.includes('인문')) return getGroupMetaByLabel('미디어·콘텐츠') || { id:'language_culture', label:'언어·문화·사상', desc:'언어, 문화, 사상과 연결된 후보입니다.' };
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
    return MAJOR_COPY_OVERRIDES[name] || null;
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
    const orderedGroups = [];
    const groupMap = new Map();
    (rows || []).forEach(row => {
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

    const candidates = findCandidates(input);
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
