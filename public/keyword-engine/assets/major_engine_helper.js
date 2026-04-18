
window.__MAJOR_ENGINE_HELPER_VERSION__ = "v0.7.11-major-search-integrated-bundle-v27";

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

  const BROAD_QUERY_KEYWORDS = new Set(['환경','심리','교육','복지','미디어','국제','경제','금융','회계','무역','통상','반도체','바이오','보건','컴퓨터','인공지능','소프트웨어','데이터','보안','화학','화공','에너지','소재','배터리','이차전지','건축','디자인','실내','인테리어','국문','문학','영문','역사','철학','문헌']);

  const QUERY_BOOST_RULES = [
    { queries:['환경'], test: /(건설환경공학|토목환경공학|지구환경과학|주거환경|도시공학)/, boost: 38 },
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
    { queries:['보건'], test: /(보건관리학|간호학|방사선학|임상병리학|물리치료학|작업치료학|언어치료학)/, boost: 34 }
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
    '행정·정책·법': { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.' },
    '미디어·콘텐츠': { id:'media_content', label:'미디어·콘텐츠 기획 쪽', desc:'미디어, 콘텐츠, 커뮤니케이션처럼 정보 전달과 해석을 다루는 학과입니다.' },
    '인문·어문·문화': { id:'humanities_language_culture', label:'언어·역사·문화 해석 쪽', desc:'언어, 문학, 역사, 철학, 기록과 지식 구조처럼 인간과 문화를 해석하는 학과입니다.' },
    '환경 관련 추천': { id:'environment', label:'환경·도시 시스템 쪽', desc:'기후, 환경, 도시 기반시설과 연결된 학과입니다.' },
    '공간·주거 환경': { id:'space_housing', label:'주거·공간 설계 쪽', desc:'주거, 실내, 공간 설계처럼 생활 공간과 연결된 학과입니다.' },
    '도시·인프라': { id:'city_infra', label:'도시 기반시설 쪽', desc:'도시 구조, 인프라, 건설·토목처럼 생활 기반을 다루는 학과입니다.' },
    '건축·디자인': { id:'architecture_design', label:'건축·디자인 쪽', desc:'건축 설계, 공간 디자인, 제품·시각 디자인처럼 형태와 사용 경험을 다루는 학과입니다.' }
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
      '행정·정책·법':'행정·정책·법',
      '미디어·콘텐츠 기획 쪽':'미디어·콘텐츠',
      '언어·역사·문화 해석 쪽':'인문·어문·문화',
      '환경·도시 시스템 쪽':'환경 관련 추천',
      '주거·공간 설계 쪽':'공간·주거 환경',
      '도시 기반시설 쪽':'도시·인프라',
      '건축·디자인 쪽':'건축·디자인'
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
    if (input.includes('화학') || input.includes('화공') || input.includes('에너지') || input.includes('소재') || input.includes('배터리') || input.includes('이차전지') || input.includes('촉매')) return new Set(['chem_energy_materials','materials_devices','bio_engineering']);
    if (input.includes('바이오') || input.includes('생명') || input.includes('유전') || input.includes('제약') || input.includes('의공') || input.includes('식품생명') || input.includes('화공생명')) return new Set(['bio_engineering','bio_science','bio_materials_devices','chem_energy_materials']);
    if (input.includes('컴퓨터') || input.includes('소프트웨어') || input.includes('인공지능') || input.includes('ai') || input.includes('데이터사이언스') || input.includes('정보보호') || input.includes('보안') || input.includes('산업공학')) return new Set(['computing_ai']);
    if (input.includes('반도체') || input.includes('전자') || input.includes('전기') || input.includes('기계') || input.includes('로봇') || input.includes('자동차') || input.includes('모빌리티')) return new Set(['materials_devices']);
    if (input.includes('국제')) return new Set(['global_trade','business_service']);
    if (input.includes('심리') || input.includes('상담')) return new Set(['psychology_counsel','welfare_support']);
    if (input.includes('교육') || input.includes('유아') || input.includes('아동') || input.includes('특수')) return new Set(['education_child','welfare_support']);
    if (input.includes('복지')) return new Set(['welfare_support','education_child']);
    if (input.includes('건축') || input.includes('디자인') || input.includes('실내') || input.includes('인테리어') || input.includes('시각') || input.includes('제품')) return new Set(['architecture_design','space_housing','city_infra','media_content']);
    if (input.includes('국문') || input.includes('문학') || input.includes('영문') || input.includes('영어영문') || input.includes('역사') || input.includes('사학') || input.includes('철학') || input.includes('문헌') || input.includes('도서관') || input.includes('어문')) return new Set(['humanities_language_culture','media_content']);
    if (input.includes('미디어') || input.includes('광고') || input.includes('홍보') || input.includes('언론') || input.includes('방송') || input.includes('콘텐츠') || input.includes('신문')) return new Set(['media_content','humanities_language_culture']);
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
      group_label: '인문·어문·문화',
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
    }  };

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
      { id:'psychology_counsel', label:'마음 이해·상담 쪽', desc:'인지, 정서, 상담 사례를 중심으로 보는 학과입니다.', test: /(심리|상담|정서|인지|행동과학)/ },
      { id:'global_trade', label:'국제 이슈·무역 쪽', desc:'국제 이슈, 무역, 경제 흐름과 연결된 사회계열 학과입니다.', test: /(국제학부|국제통상|무역|통상|글로벌|경제학|농업경제)/ },
      { id:'business_service', label:'기업 운영·서비스 쪽', desc:'기업 운영, 소비자, 관광·호텔 같은 서비스 산업과 연결된 학과입니다.', test: /(경영|관광|호텔|회계|세무|부동산|소비자)/ },
      { id:'law_public', label:'행정·정책·법', desc:'정책, 제도, 행정, 공공 문제 해결과 연결된 학과입니다.', test: /(행정|정책|법학|정치외교|공공|경찰|군사|외교)/ },
      { id:'computing_ai', label:'컴퓨터·AI 쪽', desc:'프로그래밍, 알고리즘, 데이터, 시스템 설계와 연결된 학과입니다.', test: /(컴퓨터공학|소프트웨어학|인공지능학|데이터사이언스학|정보보호학|산업공학|프로그래밍|알고리즘|인공지능|AI|데이터분석|보안|암호|시스템설계|소프트웨어)/i },
      { id:'materials_devices', label:'반도체·소자 설계 쪽', desc:'재료, 반도체, 회로, 장치 설계와 연결된 학과입니다.', test: /(신소재|재료|반도체|금속|전자|전기|센서|정보통신|로봇|기계|자동차)/ },
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
