(function(){
  'use strict';

  const VERSION = 'v65-major-search-fast-guard';
  window.__MAJOR_SEARCH_FAST_GUARD_VERSION = VERSION;

  const state = {
    typingTimer: null,
    renderTimer: null,
    lastRaw: '',
    lastHtmlKey: '',
    lastCandidates: [],
    installed: false
  };

  const $ = (id) => document.getElementById(id);
  const normalize = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·ㆍ.\-_]/g, '')
    .replace(/학과$|학부$|전공$|과$/g, '');
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const MAJORS = [
    { name:'컴퓨터공학과', group:'컴퓨터·AI', aliases:['컴퓨터','컴공','computer','소프트웨어','코딩','프로그래밍'], keywords:['프로그래밍','알고리즘','데이터'] },
    { name:'소프트웨어학과', group:'컴퓨터·AI', aliases:['소프트웨어','SW','sw','앱개발','개발자'], keywords:['소프트웨어','앱 개발','시스템'] },
    { name:'인공지능학과', group:'컴퓨터·AI', aliases:['인공지능','AI','ai','머신러닝','딥러닝'], keywords:['AI','모델','데이터'] },
    { name:'데이터사이언스학과', group:'컴퓨터·AI', aliases:['데이터','데이터사이언스','빅데이터','통계데이터'], keywords:['데이터','통계','시각화'] },
    { name:'정보보호학과', group:'컴퓨터·AI', aliases:['보안','정보보호','사이버보안','해킹'], keywords:['보안','암호','네트워크'] },
    { name:'산업공학과', group:'컴퓨터·AI', aliases:['산업공학','최적화','공정','시스템'], keywords:['최적화','의사결정','시스템'] },

    { name:'반도체공학과', group:'반도체·전자', aliases:['반','반도','반도체','반도체공','semiconductor','칩','웨이퍼'], keywords:['반도체','소자','공정'] },
    { name:'반도체시스템공학과', group:'반도체·전자', aliases:['반도체시스템','시스템반도체','반도체설계','칩설계'], keywords:['시스템반도체','회로','설계'] },
    { name:'전자공학과', group:'반도체·전자', aliases:['전자','전자공','회로','센서','디바이스'], keywords:['회로','센서','디바이스'] },
    { name:'전기전자공학과', group:'반도체·전자', aliases:['전기전자','전기','전자','전력','회로'], keywords:['전기','회로','시스템'] },
    { name:'신소재공학과', group:'반도체·전자', aliases:['신소재','소재','재료','나노소재','반도체소재'], keywords:['소재','물성','나노'] },
    { name:'재료공학과', group:'반도체·전자', aliases:['재료','금속','세라믹','고분자'], keywords:['재료','구조','물성'] },

    { name:'환경공학과', group:'환경·도시', aliases:['환경','환경공','환경공학','기후','대기','수질','폐기물'], keywords:['환경 변수','오염','저감'] },
    { name:'기후에너지공학과', group:'환경·도시', aliases:['기후','에너지','기후에너지','탄소','재생에너지'], keywords:['기후','에너지','탄소'] },
    { name:'지구환경과학과', group:'환경·도시', aliases:['지구환경','지구과학','대기','해양','기후'], keywords:['기후 자료','대기','지구환경'] },
    { name:'도시공학과', group:'환경·도시', aliases:['도시','도시공','도시공학','도시설계','도시계획','열섬','인프라'], keywords:['도시 열섬','공간 구조','인프라'] },
    { name:'도시계획학과', group:'환경·도시', aliases:['도시계획','도시설계','공간계획','생활권'], keywords:['도시계획','생활권','공간'] },
    { name:'교통공학과', group:'환경·도시', aliases:['교통','교통공','교통공학','모빌리티'], keywords:['교통','이동','도시 인프라'] },
    { name:'건축공학과', group:'환경·도시', aliases:['건축','건축공','건축공학','건물','구조'], keywords:['건축','구조','환경'] },
    { name:'토목공학과', group:'환경·도시', aliases:['토목','토목공학','건설','인프라'], keywords:['토목','인프라','구조'] },

    { name:'간호학과', group:'보건·생명', aliases:['간호','간호학','보건','환자','의료'], keywords:['간호','증상 관찰','관리 기준'] },
    { name:'의생명과학과', group:'보건·생명', aliases:['의생명','생명','바이오','의학'], keywords:['생명 현상','질병','바이오'] },
    { name:'생명과학과', group:'보건·생명', aliases:['생명과학','생명','유전','세포'], keywords:['세포','유전','생명'] },
    { name:'바이오메디컬공학과', group:'보건·생명', aliases:['바이오메디컬','의공학','의료기기','생체'], keywords:['의료기기','생체 신호','공학'] },
    { name:'임상병리학과', group:'보건·생명', aliases:['임상병리','검사','진단검사'], keywords:['검사','진단','생체 자료'] },
    { name:'물리치료학과', group:'보건·생명', aliases:['물리치료','재활','운동치료'], keywords:['재활','운동','신체 기능'] },

    { name:'화학공학과', group:'화학·에너지', aliases:['화공','화학공학','화학','공정','촉매'], keywords:['공정','촉매','반응'] },
    { name:'에너지공학과', group:'화학·에너지', aliases:['에너지','배터리','이차전지','전지'], keywords:['에너지','배터리','전환'] },
    { name:'배터리공학과', group:'화학·에너지', aliases:['배터리','이차전지','전고체','전지'], keywords:['배터리','전극','전해질'] },

    { name:'경영학과', group:'사회·경영', aliases:['경영','마케팅','기업','경영학'], keywords:['의사결정','비용','시장'] },
    { name:'경제학과', group:'사회·경영', aliases:['경제','금융','시장','통계'], keywords:['시장','수요','자료 분석'] },
    { name:'미디어커뮤니케이션학과', group:'사회·경영', aliases:['미디어','언론','방송','콘텐츠','커뮤니케이션'], keywords:['미디어','콘텐츠','사회 인식'] },
    { name:'광고홍보학과', group:'사회·경영', aliases:['광고','홍보','PR','마케팅'], keywords:['광고','브랜드','소비자'] }
  ];

  const PRIORITY_BY_QUERY = [
    { test:/^(반|반도|반도체|칩|웨이퍼|시스템반도체)/, names:['반도체공학과','반도체시스템공학과','전자공학과','전기전자공학과','신소재공학과'] },
    { test:/^(컴|컴공|컴퓨터|소프트|소프트웨어|인공지능|ai|데이터|보안|정보보호)/, names:['컴퓨터공학과','소프트웨어학과','인공지능학과','데이터사이언스학과','정보보호학과'] },
    { test:/^(환경|기후|대기|수질|탄소|에너지환경)/, names:['환경공학과','기후에너지공학과','지구환경과학과','에너지공학과'] },
    { test:/^(도시|도시공|도시설계|도시계획|교통|인프라|토목|건축|열섬)/, names:['도시공학과','도시계획학과','교통공학과','건축공학과','토목공학과'] },
    { test:/^(간호|보건|의료|임상|물리치료|재활)/, names:['간호학과','임상병리학과','물리치료학과','의생명과학과','바이오메디컬공학과'] },
    { test:/^(생명|바이오|의생명|유전|세포)/, names:['생명과학과','의생명과학과','바이오메디컬공학과','간호학과'] },
    { test:/^(화학|화공|촉매|공정)/, names:['화학공학과','에너지공학과','신소재공학과'] },
    { test:/^(배터리|이차전지|전고체|전지)/, names:['배터리공학과','에너지공학과','화학공학과','신소재공학과'] },
    { test:/^(경영|경제|마케팅|광고|미디어|콘텐츠)/, names:['경영학과','경제학과','미디어커뮤니케이션학과','광고홍보학과'] }
  ];

  function getCareerInput(){
    return $('career')
      || document.querySelector('input[name="career"], textarea[name="career"], input[data-field="career"], textarea[data-field="career"]')
      || document.querySelector('input[placeholder*="학과"], input[placeholder*="진로"], input[placeholder*="전공"], textarea[placeholder*="학과"], textarea[placeholder*="진로"], textarea[placeholder*="전공"]');
  }

  function isCareerTarget(target){
    const input = getCareerInput();
    return !!input && target === input;
  }

  function markTyping(active){
    window.__MAJOR_ENGINE_TYPING__ = !!active;
    window.__MAJOR_FAST_SEARCH_ACTIVE__ = !!active;
    clearTimeout(state.typingTimer);
    if (active) {
      state.typingTimer = setTimeout(() => {
        window.__MAJOR_ENGINE_TYPING__ = false;
        window.__MAJOR_FAST_SEARCH_ACTIVE__ = false;
      }, 2600);
    }
  }

  function scoreMajor(item, raw){
    const q = normalize(raw);
    const name = normalize(item.name);
    const aliases = (item.aliases || []).map(normalize);
    if (!q) return 0;
    let score = 0;
    if (name === q) score += 200;
    if (name.startsWith(q)) score += 120;
    if (name.includes(q)) score += 70;
    if (aliases.includes(q)) score += 160;
    if (aliases.some(a => a.startsWith(q))) score += 115;
    if (aliases.some(a => a.includes(q) || q.includes(a))) score += 75;
    if ((item.keywords || []).some(k => normalize(k).includes(q) || q.includes(normalize(k)))) score += 35;
    return score;
  }

  function candidatesFor(raw){
    const q = normalize(raw);
    if (!q) return [];
    const byName = new Map(MAJORS.map(item => [item.name, item]));
    const prioritized = [];
    for (const rule of PRIORITY_BY_QUERY) {
      if (rule.test.test(q)) {
        rule.names.forEach((name, idx) => {
          const item = byName.get(name);
          if (item) prioritized.push({ ...item, score: 500 - idx });
        });
        break;
      }
    }
    const scored = MAJORS.map(item => ({ ...item, score: Math.max(scoreMajor(item, raw), 0) }))
      .filter(item => item.score > 0);
    const merged = new Map();
    [...prioritized, ...scored].forEach(item => {
      const prev = merged.get(item.name);
      if (!prev || item.score > prev.score) merged.set(item.name, item);
    });
    return Array.from(merged.values())
      .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 8);
  }

  function ensurePanel(){
    const input = getCareerInput();
    if (!input) return null;
    let panel = $('majorEngineSummary');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'majorEngineSummary';
      input.insertAdjacentElement('afterend', panel);
    } else if (panel.previousElementSibling !== input) {
      input.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }

  function injectStyle(){
    if ($('majorFastSearchGuardStyle')) return;
    const style = document.createElement('style');
    style.id = 'majorFastSearchGuardStyle';
    style.textContent = `
      #majorEngineSummary.major-fast-guard-panel { display:block; margin-top:10px; border:1px solid #dbe5f4; background:#fff; border-radius:18px; padding:14px; box-shadow:0 8px 22px rgba(15,23,42,.06); }
      .major-fast-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:10px; }
      .major-fast-title { font-size:15px; font-weight:900; color:#172033; }
      .major-fast-desc { margin-top:4px; font-size:12px; color:#66758f; line-height:1.45; }
      .major-fast-badge { display:inline-flex; padding:4px 9px; border-radius:999px; background:#eef4ff; color:#245ee8; font-size:11px; font-weight:800; white-space:nowrap; }
      .major-fast-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; }
      .major-fast-btn { text-align:left; cursor:pointer; border:1px solid #cfe0ff; background:#fff; border-radius:14px; padding:11px; color:#172033; }
      .major-fast-btn:hover { background:#eef4ff; border-color:#9ec0ff; }
      .major-fast-name { font-size:14px; font-weight:900; color:#245ee8; }
      .major-fast-meta { margin-top:5px; display:flex; flex-wrap:wrap; gap:5px; }
      .major-fast-chip { display:inline-flex; padding:3px 7px; border-radius:999px; background:#f3f6fd; color:#52627c; font-size:11px; font-weight:700; }
      .major-fast-empty { color:#66758f; font-size:13px; line-height:1.55; }
    `;
    document.head.appendChild(style);
  }

  function renderFast(raw){
    injectStyle();
    const input = getCareerInput();
    const panel = ensurePanel();
    if (!input || !panel) return;
    const query = String(raw ?? input.value ?? '').trim();
    const candidates = candidatesFor(query);
    state.lastRaw = query;
    state.lastCandidates = candidates;
    if (!query) {
      panel.classList.remove('major-fast-guard-panel');
      panel.style.display = 'none';
      panel.innerHTML = '';
      return;
    }
    const htmlKey = query + '|' + candidates.map(c => c.name).join('|');
    if (htmlKey === state.lastHtmlKey) return;
    state.lastHtmlKey = htmlKey;
    panel.classList.add('major-fast-guard-panel');
    panel.style.display = 'block';
    panel.innerHTML = `
      <div class="major-fast-head">
        <div>
          <div class="major-fast-title">학과 후보를 바로 고르세요</div>
          <div class="major-fast-desc"><strong>${escapeHtml(query)}</strong> 입력 중에는 검색 후보만 표시하고, 아래 교과·도서·보고서 단계는 다시 계산하지 않습니다.</div>
        </div>
        <div class="major-fast-badge">${escapeHtml(String(candidates.length))}개 후보</div>
      </div>
      ${candidates.length ? `<div class="major-fast-grid">
        ${candidates.map(item => `<button type="button" class="major-fast-btn" data-fast-major="${escapeHtml(item.name)}">
          <div class="major-fast-name">${escapeHtml(item.name)}</div>
          <div class="major-fast-meta">
            <span class="major-fast-chip">${escapeHtml(item.group || '관련 학과')}</span>
            ${(item.keywords || []).slice(0,2).map(k => `<span class="major-fast-chip">${escapeHtml(k)}</span>`).join('')}
          </div>
        </button>`).join('')}
      </div>` : `<div class="major-fast-empty">아직 바로 연결되는 후보가 없습니다. 예: 컴퓨터, 반도체, 환경, 도시, 간호, 신소재처럼 입력해 보세요.</div>`}
    `;
  }

  function scheduleRender(raw, delay){
    clearTimeout(state.renderTimer);
    state.renderTimer = setTimeout(() => renderFast(raw), delay || 0);
  }

  function commitMajor(name){
    const input = getCareerInput();
    if (!input || !name) return;
    clearTimeout(state.renderTimer);
    clearTimeout(state.typingTimer);
    window.__MAJOR_ENGINE_TYPING__ = false;
    window.__MAJOR_FAST_SEARCH_ACTIVE__ = false;
    input.value = name;
    state.lastRaw = name;
    const panel = ensurePanel();
    if (panel) {
      panel.classList.remove('major-fast-guard-panel');
      panel.style.display = 'none';
    }
    input.dispatchEvent(new Event('change', { bubbles:true }));
    setTimeout(() => {
      try {
        if (typeof window.__MAJOR_ENGINE_RENDER__ === 'function') {
          window.__MAJOR_ENGINE_RENDER__({ dispatch:true, reason:'commit' });
        }
      } catch (error) {}
    }, 80);
  }

  function interceptSearchEvent(event){
    const target = event.target;
    if (!isCareerTarget(target)) return;
    const type = event.type;
    const raw = String(target.value || '').trim();
    if (type === 'keydown' && event.key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      markTyping(true);
      scheduleRender(raw, 0);
      return;
    }
    if (type === 'change' || type === 'blur') return;
    // 입력 중에는 기존 major/textbook helper의 무거운 input/key/composition 리스너로 이벤트가 내려가지 않게 막는다.
    event.stopImmediatePropagation();
    markTyping(true);
    scheduleRender(raw, type === 'paste' ? 0 : 0);
  }

  function onCandidateClick(event){
    const btn = event.target && event.target.closest ? event.target.closest('[data-fast-major]') : null;
    if (!btn) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    commitMajor(btn.getAttribute('data-fast-major') || '');
  }

  function install(){
    if (state.installed) return;
    state.installed = true;
    ['beforeinput','input','keyup','keydown','compositionstart','compositionupdate','compositionend','paste'].forEach(type => {
      document.addEventListener(type, interceptSearchEvent, true);
    });
    document.addEventListener('click', onCandidateClick, true);
    injectStyle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
