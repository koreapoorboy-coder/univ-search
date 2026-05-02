window.__MAJOR_SEARCH_FAST_GUARD_VERSION = 'v68-business-search-filter';

(function(){
  if (window.__MAJOR_SEARCH_FAST_GUARD_BOUND__) return;
  window.__MAJOR_SEARCH_FAST_GUARD_BOUND__ = true;

  const VERSION = window.__MAJOR_SEARCH_FAST_GUARD_VERSION;
  const state = {
    input: null,
    panel: null,
    lastRaw: '',
    confirmedName: '',
    isComposing: false,
    renderTimer: null,
    candidateCache: new Map()
  };

  const norm = (value) => String(value || '')
    .toLowerCase()
    .replace(/\s+/g,'')
    .replace(/[()\-_/·.,]/g,'')
    .replace(/학과|학부|전공|예과/g,'')
    .trim();

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');

  const CANDIDATE_PROFILES = {
    '컴퓨터공학과': { track:'컴퓨터·AI·데이터', keywords:['프로그래밍','알고리즘','데이터','시스템','오류 검증'], aliases:['컴','컴퓨터','컴공','컴퓨터공','프로그래밍','개발자'] },
    '소프트웨어학과': { track:'컴퓨터·AI·데이터', keywords:['소프트웨어','앱 개발','시스템 설계','알고리즘'], aliases:['소프트','소프트웨어','SW','앱','개발'] },
    '인공지능학과': { track:'컴퓨터·AI·데이터', keywords:['AI','모델','학습 데이터','예측','분류'], aliases:['인공지능','ai','AI','머신러닝','딥러닝'] },
    '데이터사이언스학과': { track:'컴퓨터·AI·데이터', keywords:['데이터','통계','시각화','예측','분석'], aliases:['데이터','데이터사이언스','빅데이터'] },
    '정보보호학과': { track:'컴퓨터·AI·데이터', keywords:['보안','암호','네트워크','위험 탐지'], aliases:['보안','정보보호','사이버보안'] },

    '간호학과': { track:'보건·임상', keywords:['간호','환자 관찰','생체 반응','위험 요인','관리 기준'], aliases:['간','간호','간호학','간호사','보건','임상'] },
    '보건관리학과': { track:'보건·임상', keywords:['보건','예방','건강 지표','위험 관리'], aliases:['보건','보건관리','공중보건'] },
    '물리치료학과': { track:'재활·치료', keywords:['재활','운동 기능','회복','치료 계획'], aliases:['물리치료','재활','치료'] },
    '임상병리학과': { track:'보건·임상', keywords:['검사','진단 지표','검체','임상 자료'], aliases:['임상병리','병리','검사'] },
    '작업치료학과': { track:'재활·치료', keywords:['작업치료','일상 기능','재활','회복 지원'], aliases:['작업치료'] },

    '반도체공학과': { track:'반도체·전자', keywords:['반도체','소자','회로','재료','공정'], aliases:['반','반도','반도체','반도체공','반도체공학'] },
    '전자공학과': { track:'반도체·전자', keywords:['회로','센서','신호','전자 장치'], aliases:['전자','전자공','전자공학'] },
    '전기공학과': { track:'반도체·전자', keywords:['전기','전력','회로','에너지 변환'], aliases:['전기','전기공','전기공학'] },
    '신소재공학과': { track:'화학·에너지·소재', keywords:['소재','물성','재료','결정 구조','배터리'], aliases:['신소재','소재','재료','신소재공'] },

    '환경공학과': { track:'환경·도시 시스템', keywords:['환경 변수','기후','오염','위험도','저감 기준'], aliases:['환경','환경공','환경공학','기후','대기'] },
    '지구환경과학과': { track:'환경·도시 시스템', keywords:['지구환경','기후 자료','대기','해양','관측'], aliases:['지구','지구환경','기후','대기'] },
    '대기과학과': { track:'환경·도시 시스템', keywords:['대기','기온','습도','기상 자료','예보'], aliases:['대기','대기과학','기상'] },
    '도시공학과': { track:'도시·인프라', keywords:['도시','공간 구조','인프라','열섬','생활권'], aliases:['도시','도시공','도시공학','인프라','생활권'] },
    '건설환경공학과': { track:'도시·인프라', keywords:['건설','환경','수자원','인프라','토목'], aliases:['건설환경','토목환경','토목','건설'] },

    '경영학과': { track:'경영·서비스', keywords:['경영','시장','소비자','의사결정','전략'], aliases:['경영','마케팅','기업'] },
    '경제학과': { track:'경제·금융·회계', keywords:['경제','시장','지표','자원 배분','정책 효과'], aliases:['경제','금융','시장'] },
    '심리학과': { track:'심리·상담', keywords:['심리','인지','정서','행동','상담'], aliases:['심리','상담','마음'] },
    '미디어커뮤니케이션학과': { track:'미디어·콘텐츠', keywords:['미디어','콘텐츠','여론','커뮤니케이션'], aliases:['미디어','언론','커뮤니케이션','콘텐츠'] }
  };

  const QUERY_GROUPS = [
    { test: /(컴|컴퓨터|컴공|소프트|소프트웨어|인공지능|\bai\b|데이터|보안|프로그래밍|개발)/i, names:['컴퓨터공학과','소프트웨어학과','인공지능학과','데이터사이언스학과','정보보호학과'] },
    { test: /(간|간호|보건|임상|물리치료|작업치료|재활|치료|의료)/, names:['간호학과','보건관리학과','물리치료학과','임상병리학과','작업치료학과'] },
    { test: /(반|반도|반도체|전자|전기|소자|회로)/, names:['반도체공학과','전자공학과','전기공학과','신소재공학과'] },
    { test: /(신소재|소재|재료|배터리|이차전지|화학|화공|에너지)/, names:['신소재공학과','반도체공학과','전자공학과','환경공학과'] },
    { test: /(환경|기후|대기|지구|도시|인프라|토목|건설|열섬|녹지)/, names:['환경공학과','지구환경과학과','대기과학과','도시공학과','건설환경공학과'] },
    { test: /(경영|경제|금융|회계|마케팅|무역|통상)/, names:['경영학과','경제학과'] },
    { test: /(심리|상담|교육|복지)/, names:['심리학과','보건관리학과'] },
    { test: /(미디어|언론|콘텐츠|광고|홍보)/, names:['미디어커뮤니케이션학과','경영학과'] }
  ];

  function getInput(){
    return document.getElementById('career') || document.querySelector('input[name="career"], textarea[name="career"], input[data-field="career"], textarea[data-field="career"]');
  }

  function ensureStyles(){
    if (document.getElementById('majorSearchFastGuardStyles')) return;
    const style = document.createElement('style');
    style.id = 'majorSearchFastGuardStyles';
    style.textContent = `
      .major-engine-panel[data-fast-guard="1"] { display:block; margin-top:12px; padding:16px; border:1px solid #dbe5f4; border-radius:16px; background:#fbfdff; box-shadow:0 8px 20px rgba(15,23,42,.04); }
      .major-engine-fast-note { margin-top:8px; color:#6b7890; font-size:12px; line-height:1.45; }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    const input = getInput();
    if (!input) return null;
    let panel = document.getElementById('majorEngineSummary');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'majorEngineSummary';
      panel.className = 'major-engine-panel';
      input.insertAdjacentElement('afterend', panel);
    } else if (panel.previousElementSibling !== input) {
      input.insertAdjacentElement('afterend', panel);
    }
    state.panel = panel;
    return panel;
  }

  function findCandidates(raw){
    const q = String(raw || '').trim();
    const nq = norm(q);
    if (!nq) return [];
    if (state.candidateCache.has(nq)) return state.candidateCache.get(nq);

    const score = new Map();
    Object.entries(CANDIDATE_PROFILES).forEach(([name, profile]) => {
      const nameN = norm(name);
      const aliases = [name, ...(profile.aliases || []), ...(profile.keywords || [])];
      let s = 0;
      if (nameN === nq || norm(name.replace(/학과$/,'')) === nq) s += 120;
      else if (nameN.startsWith(nq) || nq.startsWith(nameN)) s += 80;
      aliases.forEach(alias => {
        const a = norm(alias);
        if (!a) return;
        if (a === nq) s += 90;
        else if (a.startsWith(nq) || nq.startsWith(a)) s += 55;
        else if (a.includes(nq) || nq.includes(a)) s += 32;
      });
      if (s > 0) score.set(name, Math.max(score.get(name) || 0, s));
    });

    QUERY_GROUPS.forEach(group => {
      if (!group.test.test(q) && !group.test.test(nq)) return;
      group.names.forEach((name, idx) => score.set(name, Math.max(score.get(name) || 0, 70 - idx * 4)));
    });

    // v68: 경영/경제 계열 입력에서는 '데이터사이언스학과'를 즉시 후보로 섞지 않는다.
    // 데이터사이언스는 사용자가 데이터/통계/빅데이터/분석 등을 직접 입력했을 때만 노출한다.
    const businessIntent = /(경영|경제|금융|회계|마케팅|무역|통상)/.test(q) || /(경영|경제|금융|회계|마케팅|무역|통상)/.test(nq);
    const dataIntent = /(데이터|데이터사이언스|빅데이터|통계|시각화|예측|분석)/.test(q) || /(데이터|데이터사이언스|빅데이터|통계|시각화|예측|분석)/.test(nq);
    if (businessIntent && !dataIntent) {
      score.delete('데이터사이언스학과');
    }

    const rows = Array.from(score.entries())
      .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 8)
      .map(([name, s]) => ({ name, score:s, ...(CANDIDATE_PROFILES[name] || {}) }));
    state.candidateCache.set(nq, rows);
    return rows;
  }

  function renderCandidates(raw){
    ensureStyles();
    const panel = ensurePanel();
    if (!panel) return;
    const q = String(raw || '').trim();
    if (!q) {
      panel.style.display = 'none';
      panel.innerHTML = '';
      panel.removeAttribute('data-fast-guard');
      return;
    }
    const rows = findCandidates(q);
    panel.setAttribute('data-fast-guard', '1');
    panel.style.display = 'block';
    if (!rows.length) {
      panel.innerHTML = `
        <div class="major-engine-kicker">학과 검색</div>
        <h4 class="major-engine-title">관련 학과 후보를 찾는 중입니다</h4>
        <div class="major-engine-sub"><strong>${escapeHtml(q)}</strong>와 연결되는 학과가 없으면 학과명을 조금 더 구체적으로 입력해 주세요.</div>
      `;
      return;
    }
    panel.innerHTML = `
      <div class="major-engine-kicker">학과 검색 후보</div>
      <h4 class="major-engine-title">관련 학과를 선택하세요</h4>
      <div class="major-engine-sub"><strong>${escapeHtml(q)}</strong> 입력 기준으로 바로 선택 가능한 후보입니다. Enter가 아니라 후보 버튼을 클릭해야 아래 단계가 확정됩니다.</div>
      <div class="major-engine-candidates">
        ${rows.map(row => `
          <button type="button" class="major-engine-candidate" data-major-id="fast:${escapeHtml(norm(row.name))}" data-major-select="${escapeHtml(row.name)}" data-fast-major-select="${escapeHtml(row.name)}">
            <div class="major-engine-candidate-title">${escapeHtml(row.name)}</div>
            <div class="major-engine-candidate-meta">
              <span class="major-engine-candidate-track">${escapeHtml(row.track || '관련 학과')}</span>
              <span class="major-engine-candidate-score">즉시 후보</span>
            </div>
            <div class="major-engine-candidate-keywords">${escapeHtml((row.keywords || []).slice(0, 5).join(' · '))}</div>
          </button>
        `).join('')}
      </div>
      <div class="major-engine-fast-note">입력 중에는 3~8번 단계 계산을 멈추고, 학과를 클릭한 뒤에만 후속 연계축을 다시 계산합니다. (${escapeHtml(VERSION)})</div>
    `;
  }

  function publishPreview(raw){
    const q = String(raw || '').trim();
    state.lastRaw = q;
    window.__MAJOR_SEARCH_IS_TYPING__ = true;
    window.__MAJOR_SEARCH_RAW__ = q;
    window.__MAJOR_ENGINE_LAST_RAW__ = q;
    window.__MAJOR_ENGINE_LAST_INPUT__ = q;
    if (state.confirmedName && norm(q) !== norm(state.confirmedName)) {
      state.confirmedName = '';
      window.__MAJOR_SEARCH_CONFIRMED_NAME__ = '';
      window.__MAJOR_ENGINE_SELECTED__ = null;
    }
    window.dispatchEvent(new CustomEvent('major-engine-input-preview', { detail: { raw:q, version:VERSION } }));
  }

  function scheduleRender(raw){
    clearTimeout(state.renderTimer);
    renderCandidates(raw);
    state.renderTimer = setTimeout(() => renderCandidates(raw), 60);
  }

  function handleTextInput(event){
    const input = getInput();
    if (!input || event.target !== input) return;
    const raw = String(input.value || '').trim();
    publishPreview(raw);
    scheduleRender(raw);
    if (event.type === 'input' || event.type === 'keyup' || event.type === 'compositionupdate') {
      event.stopImmediatePropagation();
    }
  }

  function confirmMajor(name){
    const input = getInput();
    if (!input || !name) return;
    state.confirmedName = name;
    window.__MAJOR_SEARCH_IS_TYPING__ = false;
    window.__MAJOR_SEARCH_RAW__ = name;
    window.__MAJOR_SEARCH_CONFIRMED_NAME__ = name;
    window.__MAJOR_ENGINE_LAST_RAW__ = name;
    window.__MAJOR_ENGINE_LAST_INPUT__ = name;
    const profile = CANDIDATE_PROFILES[name] || {};
    window.__MAJOR_ENGINE_SELECTED__ = {
      display_name: name,
      core_keywords: profile.keywords || [],
      track_category: profile.track || '',
      comparison: null,
      source: 'major_search_fast_guard'
    };
    input.value = name;
    renderCandidates(name);
    const panel = ensurePanel();
    panel?.querySelectorAll('[data-major-select]').forEach(btn => {
      btn.classList.toggle('is-selected', String(btn.getAttribute('data-major-select') || '') === name);
    });
    window.dispatchEvent(new CustomEvent('major-engine-selection-changed', { detail: window.__MAJOR_ENGINE_SELECTED__ }));
    setTimeout(() => {
      try { if (typeof window.__MAJOR_ENGINE_RENDER__ === 'function') window.__MAJOR_ENGINE_RENDER__(); } catch (error) {}
      input.dispatchEvent(new Event('change', { bubbles:true }));
    }, 0);
  }

  function handleKeydown(event){
    const input = getInput();
    if (!input || event.target !== input) return;
    if (event.key !== 'Enter') return;
    const rows = findCandidates(input.value || '');
    if (rows.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      // 부분 검색어에서 Enter를 누르면 오래 걸리는 전체 resolve를 돌리지 않고 첫 후보를 확정한다.
      confirmMajor(rows[0].name);
    }
  }

  function handleClick(event){
    const btn = event.target?.closest?.('[data-fast-major-select], [data-major-select]');
    if (!btn) return;
    const panel = ensurePanel();
    if (panel && !panel.contains(btn)) return;
    const name = btn.getAttribute('data-fast-major-select') || btn.getAttribute('data-major-select') || '';
    if (!name) return;
    confirmMajor(name);
  }

  function bind(){
    const input = getInput();
    if (!input) return;
    state.input = input;
    ensurePanel();
    ['compositionstart','compositionupdate','compositionend','input','keyup','paste'].forEach(type => {
      input.addEventListener(type, handleTextInput, true);
    });
    input.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('click', handleClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  window.addEventListener('load', bind);
  setTimeout(bind, 300);
})();
