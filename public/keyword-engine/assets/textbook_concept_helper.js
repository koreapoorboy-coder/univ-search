window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v24.3-engine-flow-resilient";

(function () {
  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const UI_SEED_URL = "seed/textbook-v1/subject_concept_ui_seed.json";
  const ENGINE_MAP_URL = "seed/textbook-v1/subject_concept_engine_map.json";
  const TOPIC_MATRIX_URL = "seed/textbook-v1/topic_matrix_seed.json";

  const state = {
    subject: "",
    career: "",
    linkTrack: "",
    concept: "",
    keyword: "",
    selectedBook: "",
    selectedBookTitle: "",
    reportMode: "",
    reportView: "",
    reportLine: ""
  };

  const REPORT_LINE_HELP = {
    basic: {
      id: "basic",
      title: "기본형",
      desc: "고1 학생이 처음 쓰기 좋은 구조입니다. 개념을 먼저 설명하고, 도서를 참고로 간단히 넓혀 마무리합니다.",
      fit: "처음 쓰는 학생 / 교과 개념 설명 중심",
      sections: [
        "주제 선정 이유",
        "교과 개념 설명",
        "도서로 넓히기",
        "정리와 느낀 점"
      ]
    },
    standard: {
      id: "standard",
      title: "확장형",
      desc: "수행평가에서 가장 많이 쓰는 구조입니다. 교과 개념을 설명하고, 도서·사례·데이터 중 하나를 넣어 확장합니다.",
      fit: "일반 수행평가 / 비교·데이터·사례 확장",
      sections: [
        "주제 선정 이유",
        "교과 개념 설명",
        "도서·사례·데이터 확장",
        "분석과 해석",
        "결론 및 후속 연결"
      ]
    },
    advanced: {
      id: "advanced",
      title: "심화형",
      desc: "고2~고3 심화 탐구용 구조입니다. 현재 과목과 후속 과목, 진로를 함께 연결해 깊이 있게 정리합니다.",
      fit: "심화 탐구 / 후속 과목·진로 연결",
      sections: [
        "주제 선정 이유",
        "현재 과목의 핵심 개념 설명",
        "후속 과목 연결",
        "도서·자료 근거 확장",
        "분석과 한계",
        "추가 탐구 계획"
      ]
    }
  };

  const VIEW_HELP = {
    "구조": {
      title: "구조 관점",
      desc: "대상이 무엇으로 이루어져 있고, 각 부분이 어떻게 연결되어 있는지 중심으로 정리합니다.",
      example: "예: 센서가 어떤 구성 요소로 이루어지고, 각 요소가 어떤 역할을 나누는지 설명하기"
    },
    "기능": {
      title: "기능 관점",
      desc: "대상이 실제로 무엇을 하는지, 어떤 역할을 수행하는지 중심으로 설명합니다.",
      example: "예: 온도 센서가 왜 필요한지, 측정 과정에서 어떤 기능을 하는지 정리하기"
    },
    "안정성": {
      title: "안정성 관점",
      desc: "쉽게 흔들리거나 무너지지 않고 일정한 상태를 유지하는 조건을 중심으로 봅니다.",
      example: "예: 구조물이 왜 안정적으로 버텨야 하는지, 흔들림과 충격에 어떻게 대응하는지 설명하기"
    },
    "효율": {
      title: "효율 관점",
      desc: "같은 결과를 내기 위해 시간·에너지·비용을 얼마나 덜 쓰는지에 초점을 둡니다.",
      example: "예: 같은 장치라도 에너지를 덜 쓰고 더 정확하게 작동하는 방법 비교하기"
    },
    "비교": {
      title: "비교 관점",
      desc: "두 대상이나 두 조건을 나란히 놓고 차이점과 공통점을 정리합니다.",
      example: "예: 두 종류의 센서나 두 실험 조건을 비교해 어떤 점이 다른지 설명하기"
    },
    "원리": {
      title: "원리 관점",
      desc: "왜 그런 현상이 일어나는지, 어떤 과학 개념이 작동하는지 중심으로 풀이합니다.",
      example: "예: 산화가 왜 일어나는지, 온도 센서가 어떤 원리로 값을 읽는지 설명하기"
    },
    "변화": {
      title: "변화 관점",
      desc: "시간이 지나면서 값이나 상태가 어떻게 달라지는지 흐름 중심으로 정리합니다.",
      example: "예: 온도 변화에 따라 재료의 성질이나 측정값이 어떻게 달라지는지 설명하기"
    },
    "데이터": {
      title: "데이터 관점",
      desc: "수치, 그래프, 측정값을 해석해서 의미를 찾는 방식으로 정리합니다.",
      example: "예: 측정 데이터를 그래프로 보고, 어떤 경향이 나타나는지 해석하기"
    }
  };


  const TRACK_HELP = {
    physics: {
      id: "physics",
      title: "물리 연계",
      short: "힘·운동·센서",
      nextSubject: "고2 물리학",
      desc: "힘, 운동, 전류, 센서, 구조 안정성처럼 물리학으로 이어지는 방향입니다.",
      easy: "기계, 반도체, 센서, 구조 쪽 보고서에 잘 맞아요."
    },
    chemistry: {
      id: "chemistry",
      title: "화학 연계",
      short: "원소·재료·반응",
      nextSubject: "고2 화학",
      desc: "원소, 물질 성질, 산화·환원, 재료 변화처럼 화학으로 이어지는 방향입니다.",
      easy: "신소재, 배터리, 재료 성질 쪽 보고서에 잘 맞아요."
    },
    biology: {
      id: "biology",
      title: "생명과학 연계",
      short: "생명·건강·반응",
      nextSubject: "고2 생명과학",
      desc: "세포, 항상성, 생체 반응, 건강 데이터처럼 생명과학으로 이어지는 방향입니다.",
      easy: "의학, 간호, 생명, 바이오 쪽 보고서에 잘 맞아요."
    },
    earth: {
      id: "earth",
      title: "지구과학 연계",
      short: "환경·기후·지구",
      nextSubject: "고2 지구과학",
      desc: "환경, 기후, 지구 시스템, 관측 데이터처럼 지구과학으로 이어지는 방향입니다.",
      easy: "환경, 기후, 우주, 지구 시스템 쪽 보고서에 잘 맞아요."
    }
  };

  let uiSeed = null;
  let engineMap = null;
  let topicMatrix = null;

  function normalize(v) {
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "")
      .toLowerCase();
  }

  function fuzzyIncludes(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
  }

  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  async function init() {
    try {
      injectStyles();
      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      syncCareerFromInput();
      renderAll();
      renderUploadSummary();

      const [uiRes, engineRes, matrixRes] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }).catch(() => null),
        fetch(ENGINE_MAP_URL, { cache: "no-store" }).catch(() => null),
        fetch(TOPIC_MATRIX_URL, { cache: "no-store" }).catch(() => null)
      ]);

      if (!uiRes?.ok || !engineRes?.ok) {
        console.warn("textbook concept seed load failed", uiRes?.status, engineRes?.status);
        renderAll();
        return;
      }

      uiSeed = await uiRes.json();
      engineMap = await engineRes.json();
      topicMatrix = matrixRes && matrixRes.ok ? await matrixRes.json() : null;
      renderAll();
    } catch (error) {
      console.warn("textbook concept helper init error:", error);
      try { renderAll(); } catch (_) {}
    }
  }

  function injectStyles() {
    if ($("engineFlowStyles")) return;
    const style = document.createElement("style");
    style.id = "engineFlowStyles";
    style.textContent = `
      .engine-flow-wrap { margin-top: 18px; }
      .engine-flow-card {
        border: 1px solid #d9e1f2;
        border-radius: 22px;
        background: #fff;
        padding: 22px;
        box-shadow: 0 12px 30px rgba(16, 24, 40, .04);
      }
      .engine-flow-kicker {
        display: inline-flex;
        padding: 6px 12px;
        border-radius: 999px;
        background: #edf5ff;
        color: #1f6fe5;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .engine-flow-title {
        margin: 0;
        font-size: 29px;
        line-height: 1.35;
        font-weight: 800;
        color: #172033;
      }
      .engine-flow-desc {
        margin: 10px 0 0;
        color: #51607a;
        line-height: 1.65;
        font-size: 15px;
      }
      .engine-status-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 12px;
        margin-top: 22px;
      }
      .engine-status-box {
        border: 1px solid #d8e0ee;
        border-radius: 16px;
        padding: 14px 16px;
        background: #fbfcff;
      }
      .engine-status-label {
        font-size: 12px;
        color: #6d7c93;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .engine-status-value {
        font-size: 18px;
        color: #172033;
        font-weight: 800;
        word-break: keep-all;
      }
      .engine-step-block {
        margin-top: 16px;
        border: 1px solid #d8e0ee;
        border-radius: 20px;
        padding: 18px;
        background: #fff;
      }
      .engine-step-block.locked {
        opacity: .55;
        background: #fbfcfe;
      }
      .engine-step-head {
        display:flex;
        justify-content: space-between;
        align-items:flex-start;
        gap: 12px;
        margin-bottom: 14px;
      }
      .engine-step-title {
        margin:0;
        font-size: 22px;
        color:#172033;
        font-weight:800;
      }
      .engine-step-guide {
        color:#6d7c93;
        font-size:13px;
        font-weight:700;
        white-space:nowrap;
      }
      .engine-step-copy {
        color:#5b6880;
        font-size:14px;
        line-height:1.6;
      }
      .engine-concept-grid {
        display:grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .engine-concept-card {
        border: 1px solid #d5deef;
        background:#fff;
        border-radius: 16px;
        padding: 16px;
        text-align:left;
        cursor:pointer;
        transition: all .18s ease;
      }
      .engine-concept-card:hover { border-color:#b6c7ef; transform: translateY(-1px); }
      .engine-concept-card.is-active { border-color:#2764ff; box-shadow: 0 0 0 2px rgba(39, 100, 255, .08); background:#f7faff; }
      .engine-concept-name { font-size:17px; font-weight:800; color:#172033; }
      .engine-concept-tags, .engine-chip-wrap, .engine-tag-wrap { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .engine-mini-tag, .engine-chip, .engine-tag {
        display:inline-flex; align-items:center; gap:4px; padding:7px 11px; border-radius:999px;
        background:#f1f5fd; color:#304666; font-size:13px; font-weight:700; border:1px solid transparent;
      }
      button.engine-chip { cursor:pointer; }
      button.engine-chip:hover { border-color:#b8c8ee; }
      button.engine-chip.is-active { background:#2f66ff; color:#fff; }
      .engine-mini-tag.subtle, .engine-tag.subtle { background:#f7f9fd; color:#61708c; }
      .engine-subgrid {
        display:grid;
        grid-template-columns: 1.15fr .85fr;
        gap: 16px;
        margin-top: 14px;
      }
      .engine-panel {
        border:1px solid #e0e6f3;
        border-radius:16px;
        padding:16px;
        background:#fbfcff;
      }
      .engine-track-grid {
        display:grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap:12px;
        margin-top: 12px;
      }
      .engine-track-card {
        border:1px solid #d5deef;
        border-radius:16px;
        background:#fff;
        padding:16px;
        text-align:left;
        cursor:pointer;
        transition: all .18s ease;
      }
      .engine-track-card:hover { border-color:#b6c7ef; transform:translateY(-1px); }
      .engine-track-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-track-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
      .engine-track-title { font-size:18px; font-weight:800; color:#172033; }
      .engine-track-short { display:inline-flex; padding:6px 10px; border-radius:999px; background:#eef4ff; color:#265ae8; font-size:12px; font-weight:700; }
      .engine-track-next { margin-top:10px; color:#51607a; font-size:13px; font-weight:700; }
      .engine-track-desc { margin-top:8px; color:#5f6d86; font-size:13px; line-height:1.6; }
      .engine-auto-row { margin-top:12px; display:flex; justify-content:flex-end; }
      .engine-auto-btn {
        border:1px dashed #b8c8ee; background:#f8fbff; color:#275fe8; border-radius:999px;
        padding:10px 14px; font-size:13px; font-weight:800; cursor:pointer;
      }
      .engine-subtitle { font-size:16px; font-weight:800; color:#172033; margin-bottom:6px; }
      .engine-help { color:#6b7890; font-size:13px; line-height:1.55; }
      .engine-empty {
        padding: 18px;
        border-radius: 16px;
        background:#f7f9fd;
        color:#6a7891;
        font-size:14px;
        line-height:1.6;
        border:1px dashed #d8e0ee;
      }
      .engine-book-layout { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
      .engine-book-list, .engine-book-summary { min-height: 100%; }
      .engine-book-card {
        width:100%; display:flex; gap:14px; text-align:left; padding:14px; border-radius:16px; border:1px solid #d5deef; background:#fff; margin-top:10px; cursor:pointer;
      }
      .engine-book-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-book-order {
        width:28px; height:28px; flex:0 0 28px; border-radius:999px; background:#edf3ff; color:#2f66ff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:2px;
      }
      .engine-book-title { font-size:18px; font-weight:800; color:#172033; }
      .engine-book-meta { margin-top:4px; color:#66748c; font-size:13px; }
      .engine-book-reason { margin-top:8px; color:#1d2d49; font-size:14px; font-weight:700; }
      .engine-summary-box { background:#fff; border:1px solid #d5deef; border-radius:16px; padding:16px; min-height:100%; }
      .engine-summary-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .engine-summary-title { font-size:22px; font-weight:800; color:#172033; }
      .engine-summary-meta { margin-top:4px; color:#66748c; font-size:14px; }
      .engine-summary-badge {
        padding:6px 10px; border-radius:999px; background:#edf5ff; color:#2563eb; font-size:12px; font-weight:800; white-space:nowrap;
      }
      .engine-summary-text { color:#33435f; font-size:15px; line-height:1.7; margin:14px 0 0; }
      .engine-summary-foot { margin-top:14px; color:#61708c; font-size:13px; line-height:1.55; }
      .engine-mode-grid {
        display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:12px; margin-top:12px;
      }
      .engine-mode-card {
        border:1px solid #d5deef; background:#fff; border-radius:16px; padding:14px; text-align:left; cursor:pointer;
      }
      .engine-mode-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-mode-title { font-size:16px; font-weight:800; color:#172033; }
      .engine-mode-desc { color:#66748c; font-size:13px; line-height:1.55; margin-top:6px; }
      .engine-selection-box { margin-top:18px; border:1px solid #d8e0ee; border-radius:20px; padding:18px; background:#f8fbff; }
      .engine-selection-title { margin:0 0 10px; font-size:20px; font-weight:800; color:#172033; }
      .engine-selection-payload { margin-top:12px; padding:14px 16px; border-radius:16px; background:#fff; border:1px dashed #d6deef; color:#33435f; font-size:14px; line-height:1.7; }
      .engine-selection-payload strong { color:#172033; }
      .engine-view-guide {
        margin-top: 14px;
        padding: 14px 16px;
        border: 1px solid #d8e0ee;
        border-radius: 16px;
        background: #fbfcff;
      }
      .engine-view-guide-title {
        font-size: 15px;
        font-weight: 800;
        color: #172033;
        margin-bottom: 6px;
      }
      .engine-view-guide-desc {
        color: #47556e;
        font-size: 14px;
        line-height: 1.65;
      }
      .engine-view-guide-example {
        margin-top: 8px;
        color: #67758d;
        font-size: 13px;
        line-height: 1.6;
      }

      .engine-upload-panel {
        margin-top: 16px;
        border: 1px solid #d8e0ee;
        border-radius: 20px;
        padding: 18px;
        background: #fff;
      }
      .engine-upload-grid {
        display:grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap:14px;
        margin-top:12px;
      }
      .engine-upload-grid label {
        display:flex;
        flex-direction:column;
        gap:8px;
      }
      .engine-upload-grid label span {
        font-size:14px;
        font-weight:800;
        color:#172033;
      }
      .engine-file-input {
        border:1px dashed #b8c8ee;
        border-radius:14px;
        padding:12px;
        background:#fbfcff;
      }
      .engine-upload-help {
        color:#67758d;
        font-size:13px;
        line-height:1.6;
      }
      .engine-file-list {
        margin-top:10px;
        padding:12px 14px;
        border:1px dashed #d8e0ee;
        border-radius:14px;
        background:#fbfcff;
        color:#44526c;
        font-size:13px;
        line-height:1.7;
      }
      .engine-pill-checks { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
      .engine-pill-check {
        display:inline-flex; align-items:center; gap:6px; padding:8px 10px; border-radius:999px; background:#f3f6fc; font-size:13px; color:#304666; font-weight:700;
      }
      .engine-pill-check input { accent-color:#2563eb; }
      .engine-student-note {
        margin-top:10px;
        color:#5e6d87;
        font-size:13px;
        line-height:1.65;
      }

      @media (max-width: 1100px) {
        .engine-status-row, .engine-book-layout, .engine-subgrid, .engine-mode-grid, .engine-concept-grid, .engine-track-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    if ($("engineFlowSection")) return;

    const formGrid = document.querySelector(".form-grid");
    const actions = document.querySelector(".actions");
    if (!formGrid || !actions) return;

    const section = document.createElement("section");
    section.id = "engineFlowSection";
    section.className = "engine-flow-wrap";
    section.innerHTML = `
      <div class="engine-flow-card">
        <div class="engine-flow-kicker">학생이 직접 선택해서 MINI 보고서를 만드는 흐름</div>
        <h2 class="engine-flow-title">과목 → 진로 → 연계 축 → 추천 개념·키워드 → 도서 → 보고서 방식 → 관점</h2>
        <p class="engine-flow-desc">학생이 학과만 알아도 선택할 수 있도록, 진로 다음에 먼저 <strong>연계 축</strong>을 고르고 그 축에 맞는 추천 개념과 키워드를 보여주는 구조로 바꿨습니다. 고1은 고2 과목, 고2는 고3 심화 과목과의 연결을 생각하며 선택할 수 있습니다.</p>

        <div class="engine-status-row">
          <div class="engine-status-box">
            <div class="engine-status-label">1. 과목</div>
            <div id="engineSubjectSummary" class="engine-status-value">선택 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">2. 진로</div>
            <div id="engineCareerSummary" class="engine-status-value">입력 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">현재 진행 상태</div>
            <div id="engineProgressSummary" class="engine-status-value">연계 축 선택 대기</div>
          </div>
        </div>

        <div id="engineTrackBlock" class="engine-step-block" data-step="3">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">3. 후속 과목 연계 축 선택</h3>
              <div class="engine-step-copy">학과를 어떤 과학 축으로 연결할지 먼저 고릅니다. 학생은 어려운 교과 개념 대신, 익숙한 과목 축으로 먼저 방향을 정하면 됩니다.</div>
            </div>
            <div class="engine-step-guide">물리 / 화학 / 생명 / 지구</div>
          </div>
          <div id="engineTrackArea"></div>
        </div>

        <div id="engineConceptBlock" class="engine-step-block" data-step="4">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">4. 연계 축에 맞는 추천 개념·키워드 선택</h3>
              <div class="engine-step-copy">선택한 연계 축에 맞는 추천 개념을 먼저 보고, 그 안에서 보고서 핵심 키워드를 고릅니다.</div>
            </div>
            <div class="engine-step-guide">추천 개념 → 추천 키워드</div>
          </div>
          <div class="engine-subgrid">
            <div class="engine-panel">
              <div class="engine-subtitle">추천 개념 고르기</div>
              <div id="engineConceptCards"></div>
            </div>
            <div class="engine-panel">
              <div class="engine-subtitle">추천 키워드 고르기</div>
              <div id="engineKeywordButtons"></div>
            </div>
          </div>
        </div>

        <div id="engineBookBlock" class="engine-step-block" data-step="5">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">5. 직접 일치 / 확장 참고 도서 선택</h3>
              <div class="engine-step-copy">선택한 키워드와 직접 맞는 도서를 먼저 보고, 부족하면 보고서 확장에 참고할 도서를 봅니다. 도서는 보고서의 근거와 확장 프레임 역할을 합니다.</div>
            </div>
            <div class="engine-step-guide">도서 선택</div>
          </div>
          <div id="engineBookArea"></div>
        </div>

        <div id="engineModeBlock" class="engine-step-block" data-step="6">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">6. 보고서 전개 방식 선택</h3>
              <div class="engine-step-copy">같은 개념과 도서라도 어떻게 풀어 쓸지에 따라 보고서 방향이 달라집니다.</div>
            </div>
            <div class="engine-step-guide">원리 / 비교 / 데이터</div>
          </div>
          <div id="engineModeButtons"></div>
        </div>

        <div id="engineViewBlock" class="engine-step-block" data-step="7">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">7. 보고서 관점 선택</h3>
              <div class="engine-step-copy">보고서를 어떤 시선으로 정리할지 마지막 관점을 고릅니다.</div>
            </div>
            <div class="engine-step-guide">관점 선택</div>
          </div>
          <div id="engineViewButtons"></div>
        </div>

        <div id="engineLineBlock" class="engine-step-block" data-step="8">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">8. 보고서 라인 선택</h3>
              <div class="engine-step-copy">보고서를 어떤 순서와 비중으로 쓸지 뼈대를 고릅니다. 같은 주제라도 라인에 따라 결과물이 달라집니다.</div>
            </div>
            <div class="engine-step-guide">기본형 / 확장형 / 심화형</div>
          </div>
          <div id="engineLineArea"></div>
        </div>

        <div class="engine-selection-box">
          <h3 class="engine-selection-title">현재 선택 요약</h3>
          <div id="engineSelectionSummary"></div>
          <div id="engineMiniPayload" class="engine-selection-payload"></div>
        </div>
      </div>
    `;

    actions.parentNode.insertBefore(section, actions);

    const keywordInput = $("keyword");
    if (keywordInput) {
      keywordInput.readOnly = true;
      keywordInput.placeholder = "아래에서 교과 개념 키워드를 선택하면 자동 입력됩니다.";
      const label = keywordInput.closest("label");
      const span = label ? label.querySelector("span") : null;
      if (span) span.textContent = "선택 키워드(자동 반영)";
    }

    normalizeBaseLabels();
    augmentTaskOptions();
    injectGeneralContextPanel();

    injectHiddenInput("linkedTrack");
    injectHiddenInput("selectedConcept");
    injectHiddenInput("selectedBookId");
    injectHiddenInput("selectedBookTitle");
    injectHiddenInput("reportMode");
    injectHiddenInput("reportView");
    injectHiddenInput("reportLine");
    injectHiddenInput("miniNavigationPayload");
    injectHiddenInput("engineCollectionPayload");
  }

  function injectHiddenInput(id) {
    if ($(id)) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.id = id;
    const actions = document.querySelector(".actions");
    if (actions && actions.parentNode) {
      actions.parentNode.insertBefore(input, actions);
    }
  }

  function normalizeBaseLabels() {
    const taskName = $("taskName");
    const taskType = $("taskType");
    const taskDescription = $("taskDescription");
    const usagePurpose = $("usagePurpose");

    const taskNameSpan = taskName?.closest("label")?.querySelector("span");
    const taskTypeSpan = taskType?.closest("label")?.querySelector("span");
    const taskDescSpan = taskDescription?.closest("label")?.querySelector("span");
    const usageSpan = usagePurpose?.closest("label")?.querySelector("span");

    if (taskNameSpan) taskNameSpan.textContent = "활동/과제 이름";
    if (taskTypeSpan) taskTypeSpan.textContent = "기본 결과물";
    if (taskDescSpan) taskDescSpan.textContent = "선생님이 준 설명 / 활동 안내";
    if (usageSpan) usageSpan.textContent = "이 프로그램을 쓰는 목적";

    if (taskName) taskName.placeholder = "예: 과학 탐구 보고서, 동아리 주제 발표, 자율활동 기록 정리";
    if (taskDescription) taskDescription.placeholder = "예: 교과 개념과 연결한 자료조사형 보고서, 실험은 어렵고 발표 포함 / 동아리에서 실제 사례 조사 중심";
  }

  function ensureSelectOption(selectEl, value, label) {
    if (!selectEl) return;
    const exists = Array.from(selectEl.options || []).some(opt => (opt.value || opt.textContent || "").trim() === value);
    if (!exists) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label || value;
      selectEl.appendChild(option);
    }
  }

  function augmentTaskOptions() {
    const taskType = $("taskType");
    const usagePurpose = $("usagePurpose");
    [
      "활동 기록형 정리",
      "생기부형 요약",
      "아이디어 스케치"
    ].forEach(v => ensureSelectOption(taskType, v, v));

    [
      "동아리 주제 정리",
      "자율활동 주제 설계",
      "진로활동 확장",
      "세특 참고 초안"
    ].forEach(v => ensureSelectOption(usagePurpose, v, v));
  }

  function injectGeneralContextPanel() {
    if ($("engineGeneralContextPanel")) return;
    const formGrid = document.querySelector(".form-grid");
    const actions = document.querySelector(".actions");
    if (!formGrid || !actions || !actions.parentNode) return;

    const panel = document.createElement("div");
    panel.id = "engineGeneralContextPanel";
    panel.className = "engine-context-panel";
    panel.innerHTML = `
      <div class="engine-context-head">
        <div>
          <h3 class="engine-context-title">학생 입력 정보</h3>
          <div class="engine-context-copy">학생은 쉬운 질문에 답하고, 엔진은 그 답을 MINI와 Cloudflare가 쓰기 좋은 구조 데이터로 바꿉니다.</div>
        </div>
        <div class="engine-step-guide">수행평가 / 동아리 / 자율활동 공통</div>
      </div>
      <div class="engine-context-grid">
        <label>
          <span>이 글을 어디에 쓰나요?</span>
          <select id="activityArea">
            <option value="">선택</option>
            <option value="수행평가">수행평가</option>
            <option value="동아리 활동">동아리 활동</option>
            <option value="자율활동">자율활동</option>
            <option value="진로활동">진로활동</option>
            <option value="세특 참고">세특 참고</option>
          </select>
        </label>
        <label>
          <span>어떤 결과물이 필요하나요?</span>
          <select id="outputGoal">
            <option value="">선택</option>
            <option value="탐구 보고서">탐구 보고서</option>
            <option value="자료조사 보고서">자료조사 보고서</option>
            <option value="발표 개요">발표 개요</option>
            <option value="포스터 문안">포스터 문안</option>
            <option value="활동 기록형 정리">활동 기록형 정리</option>
            <option value="생기부형 요약">생기부형 요약</option>
          </select>
        </label>
        <label>
          <span>원하는 길이는 어느 정도인가요?</span>
          <select id="lengthLevel">
            <option value="">선택</option>
            <option value="짧게">짧게</option>
            <option value="보통">보통</option>
            <option value="깊게">깊게</option>
          </select>
        </label>
        <label>
          <span>혼자 하나요, 같이 하나요?</span>
          <select id="workStyle">
            <option value="">선택</option>
            <option value="개인">개인</option>
            <option value="모둠">모둠</option>
            <option value="개인+발표">개인+발표</option>
            <option value="모둠+발표">모둠+발표</option>
          </select>
        </label>
        <label class="full">
          <span>선생님 조건이 있나요?</span>
          <div class="engine-check-grid">
            <label class="engine-check-item"><input type="checkbox" id="ctx_presentation">발표 포함</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_experiment">실험 가능</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_research">자료조사 중심</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_graph">그래프 필요</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_table">표 필요</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_concept">교과 개념 반드시 포함</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_book">도서 활용 포함</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_compare">비교 대상 포함</label>
          </div>
          <div class="engine-context-note">잘 모르겠으면 비워도 괜찮아요. 체크한 조건만 반영해서 더 정확하게 맞춰줍니다.</div>
        </label>
        <label class="full">
          <span>선생님이 준 설명 그대로 붙여넣기</span>
          <textarea id="teacherFocus" placeholder="예: 교과 개념을 반드시 2개 이상 넣기 / 실제 사례 포함 / 발표 시간 3분 내외"></textarea>
        </label>
        <label class="full">
          <span>이미 생각한 키워드나 넣고 싶은 내용</span>
          <textarea id="studentSeed" placeholder="예: 배터리 열폭주 사례를 넣고 싶어요 / 반도체와 센서를 연결해 보고 싶어요"></textarea>
        </label>
      </div>
    `;

    const uploadPanel = document.createElement("div");
    uploadPanel.id = "engineUploadPanel";
    uploadPanel.className = "engine-upload-panel";
    uploadPanel.innerHTML = `
      <div class="engine-context-head">
        <div>
          <h3 class="engine-context-title">참고 자료 업로드</h3>
          <div class="engine-context-copy">예전 보고서나 생활기록부 PDF가 있으면 올려 주세요. 엔진이 키워드, 이미 쓴 방향, 중복 위험을 구조 데이터로 바꿔 쓰게 됩니다.</div>
        </div>
        <div class="engine-step-guide">PDF / 이미지 가능</div>
      </div>
      <div class="engine-upload-grid">
        <label>
          <span>이전에 쓴 보고서 / 발표 자료</span>
          <input id="pastReportFile" class="engine-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple />
          <div class="engine-upload-help">예: 예전 탐구 보고서, 발표 자료, 포스터 초안</div>
        </label>
        <label>
          <span>생활기록부 / 활동 기록 자료</span>
          <input id="recordFile" class="engine-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple />
          <div class="engine-upload-help">예: 생활기록부 일부, 세특 발췌본, 활동 기록 PDF</div>
        </label>
        <label class="full">
          <span>업로드 자료로 무엇을 도와드릴까요?</span>
          <div class="engine-pill-checks">
            <label class="engine-pill-check"><input type="checkbox" id="src_extract_keywords">키워드 추출</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_find_used_topics">이미 쓴 주제 파악</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_reduce_duplication">중복 줄이기</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_adjust_track">연계 축 추천 보정</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_adjust_books">도서 추천 보정</label>
          </div>
          <div class="engine-student-note">자료가 없으면 그냥 넘어가도 됩니다. 자료가 있으면 결과를 더 개인화하기 좋습니다.</div>
        </label>
        <label class="full">
          <span>업로드 자료 요약</span>
          <div id="engineUploadSummary" class="engine-file-list">아직 업로드한 자료가 없습니다.</div>
        </label>
      </div>
    `;

    actions.parentNode.insertBefore(panel, actions);
    actions.parentNode.insertBefore(uploadPanel, actions);
  }

  function getContextFieldIds() {
    return [
      "schoolName", "grade", "subject", "taskName", "taskType", "usagePurpose", "taskDescription",
      "activityArea", "outputGoal", "lengthLevel", "workStyle", "teacherFocus", "studentSeed",
      "ctx_presentation", "ctx_experiment", "ctx_research", "ctx_graph", "ctx_table", "ctx_concept", "ctx_book", "ctx_compare",
      "pastReportFile", "recordFile", "src_extract_keywords", "src_find_used_topics", "src_reduce_duplication", "src_adjust_track", "src_adjust_books"
    ];
  }

  function getStructuredConstraints() {
    const checks = [
      ["presentation_included", $("ctx_presentation")?.checked, "발표 포함"],
      ["experiment_possible", $("ctx_experiment")?.checked, "실험 가능"],
      ["research_only", $("ctx_research")?.checked, "자료조사 중심"],
      ["graph_needed", $("ctx_graph")?.checked, "그래프 필요"],
      ["table_needed", $("ctx_table")?.checked, "표 필요"],
      ["concept_required", $("ctx_concept")?.checked, "교과 개념 반드시 포함"],
      ["book_required", $("ctx_book")?.checked, "도서 활용 포함"],
      ["comparison_needed", $("ctx_compare")?.checked, "비교 대상 포함"]
    ];
    const flags = {};
    const labels = [];
    checks.forEach(([key, checked, label]) => {
      flags[key] = !!checked;
      if (checked) labels.push(label);
    });
    return { flags, labels };
  }

  function getSelectedSourceGoals() {
    const pairs = [
      ["extract_keywords", $("src_extract_keywords")?.checked, "키워드 추출"],
      ["find_used_topics", $("src_find_used_topics")?.checked, "이미 쓴 주제 파악"],
      ["reduce_duplication", $("src_reduce_duplication")?.checked, "중복 줄이기"],
      ["adjust_track", $("src_adjust_track")?.checked, "연계 축 추천 보정"],
      ["adjust_books", $("src_adjust_books")?.checked, "도서 추천 보정"]
    ];
    const flags = {};
    const labels = [];
    pairs.forEach(([key, checked, label]) => {
      flags[key] = !!checked;
      if (checked) labels.push(label);
    });
    return { flags, labels };
  }

  function fileMetaList(inputId, sourceType) {
    const input = $(inputId);
    const files = Array.from(input?.files || []);
    return files.map(file => ({
      source_type: sourceType,
      name: file.name || "",
      size: Number(file.size || 0),
      mime_type: file.type || "",
      last_modified: Number(file.lastModified || 0)
    }));
  }

  function formatBytes(n) {
    const value = Number(n || 0);
    if (!value) return "0KB";
    if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + "MB";
    return Math.max(1, Math.round(value / 1024)) + "KB";
  }

  function renderUploadSummary() {
    const box = $("engineUploadSummary");
    if (!box) return;
    const files = [
      ...fileMetaList("pastReportFile", "past_report"),
      ...fileMetaList("recordFile", "student_record")
    ];
    const goals = getSelectedSourceGoals().labels;
    if (!files.length) {
      box.innerHTML = "아직 업로드한 자료가 없습니다.";
      return;
    }
    const lines = files.map(file => `• ${escapeHtml(file.name)} (${escapeHtml(formatBytes(file.size))}) / ${escapeHtml(file.source_type === "past_report" ? "예전 보고서" : "생활기록부/활동 자료")}`);
    if (goals.length) {
      lines.push(`<br><strong>활용 목적</strong>: ${escapeHtml(goals.join(", "))}`);
    }
    box.innerHTML = lines.join("<br>");
  }

  function bindContextInputs() {
    getContextFieldIds().forEach(id => {
      const el = $(id);
      if (!el) return;
      const evt = el.tagName === "TEXTAREA" || el.tagName === "INPUT" ? "input" : "change";
      el.addEventListener(evt, function () {
        syncOutputFields();
        renderUploadSummary();
        renderSelectionSummary();
      });
      if (el.type === "checkbox") {
        el.addEventListener("change", function () {
          syncOutputFields();
          renderSelectionSummary();
        });
      }
    });
  }

  function bindEvents() {
    const subjectEl = $("subject");
    if (subjectEl) {
      subjectEl.addEventListener("change", function () {
        syncSubjectFromSelect();
        clearFrom("concept");
        renderAll();
      });
    }

    const careerEl = $("career");
    if (careerEl) {
      ["input", "change"].forEach(evt => {
        careerEl.addEventListener(evt, function () {
          syncCareerFromInput();
          clearFrom("track");
          renderAll();
        });
      });
    }

    document.addEventListener("click", function (event) {
      const autoTrackBtn = event.target.closest(".engine-auto-btn[data-action='auto-track']");
      if (autoTrackBtn && isStepEnabled(3)) {
        const topTrack = getTrackOptions()[0];
        state.linkTrack = topTrack ? topTrack.id : "";
        clearFrom("concept");
        syncOutputFields();
        renderAll();
        return;
      }

      const trackCard = event.target.closest(".engine-track-card");
      if (trackCard && isStepEnabled(3)) {
        state.linkTrack = trackCard.getAttribute("data-track") || "";
        clearFrom("concept");
        syncOutputFields();
        renderAll();
        return;
      }

      const conceptCard = event.target.closest(".engine-concept-card");
      if (conceptCard && isStepEnabled(4)) {
        const value = conceptCard.getAttribute("data-concept") || "";
        state.concept = value;
        state.keyword = "";
        state.selectedBook = "";
        state.selectedBookTitle = "";
        state.reportMode = "";
        state.reportView = "";
        state.reportLine = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const keywordBtn = event.target.closest(".engine-chip[data-action='keyword']");
      if (keywordBtn && isStepEnabled(4)) {
        state.keyword = keywordBtn.getAttribute("data-value") || "";
        state.selectedBook = "";
        state.selectedBookTitle = "";
        state.reportMode = "";
        state.reportView = "";
        state.reportLine = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const bookBtn = event.target.closest(".book-chip[data-kind='book']");
      if (bookBtn && isStepEnabled(5)) {
        state.selectedBook = bookBtn.getAttribute("data-value") || "";
        state.selectedBookTitle = bookBtn.getAttribute("data-title") || "";
        state.reportMode = "";
        state.reportView = "";
        state.reportLine = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const modeCard = event.target.closest(".engine-mode-card[data-action='mode']");
      if (modeCard && isStepEnabled(6)) {
        state.reportMode = modeCard.getAttribute("data-value") || "";
        state.reportView = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const viewBtn = event.target.closest(".engine-chip[data-action='view']");
      if (viewBtn && isStepEnabled(7)) {
        state.reportView = viewBtn.getAttribute("data-value") || "";
        syncOutputFields();
        renderAll();
      }
    });

    bindContextInputs();

    window.__BOOK_ENGINE_REQUEST_RERENDER__ = renderAll;
    window.__TEXTBOOK_HELPER_STATE__ = state;
    window.__TEXTBOOK_HELPER_RENDER__ = renderAll;
    window.getMiniNavigationSelectionData = buildMiniPayload;
    window.getEngineCollectionPayload = buildEngineCollectionPayload;
    window.getEngineCollectionFormData = buildEngineCollectionFormData;
  }

  function buildEngineCollectionPayload() {
    const mini = buildMiniPayload();
    return {
      collected_at: new Date().toISOString(),
      student_input: {
        school_name: $("schoolName")?.value || "",
        grade: $("grade")?.value || "",
        subject: state.subject || $("subject")?.value || "",
        career: state.career || $("career")?.value || "",
        task_name: $("taskName")?.value || "",
        task_type: $("taskType")?.value || "",
        usage_purpose: $("usagePurpose")?.value || "",
        task_description: $("taskDescription")?.value || "",
        linked_track: state.linkTrack || "",
        selected_concept: state.concept || "",
        selected_keyword: state.keyword || "",
        selected_book_id: state.selectedBook || "",
        selected_book_title: state.selectedBookTitle || "",
        report_mode: state.reportMode || "",
        report_view: state.reportView || "",
        report_line: state.reportLine || "",
        activity_area: $("activityArea")?.value || "",
        output_goal: $("outputGoal")?.value || "",
        length_level: $("lengthLevel")?.value || "",
        work_style: $("workStyle")?.value || "",
        teacher_focus: $("teacherFocus")?.value || "",
        student_seed: $("studentSeed")?.value || ""
      },
      source_materials: {
        files: [
          ...fileMetaList("pastReportFile", "past_report"),
          ...fileMetaList("recordFile", "student_record")
        ],
        source_goals: getSelectedSourceGoals().flags,
        source_goal_labels: getSelectedSourceGoals().labels
      },
      mini_payload: mini
    };
  }

  function buildEngineCollectionFormData() {
    const payload = buildEngineCollectionPayload();
    const fd = new FormData();
    fd.append("payload", JSON.stringify(payload));
    Array.from($("pastReportFile")?.files || []).forEach(file => fd.append("past_report_files", file));
    Array.from($("recordFile")?.files || []).forEach(file => fd.append("record_files", file));
    return fd;
  }

  function clearFrom(stepName) {
    if (stepName === "track") {
      state.linkTrack = "";
      state.concept = "";
      state.keyword = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      syncOutputFields();
      return;
    }
    if (stepName === "concept") {
      state.concept = "";
      state.keyword = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      syncOutputFields();
    }
  }

  function syncSubjectFromSelect() {
    const el = $("subject");
    const raw = el ? ((el.value || "").trim() || (el.options?.[el.selectedIndex]?.text || "").trim()) : "";
    state.subject = findSubjectKey(raw);
  }

  function syncCareerFromInput() {
    const el = $("career");
    state.career = (el?.value || "").trim();
  }

  function findSubjectKey(raw) {
    if (!raw || !uiSeed) return "";
    const cleaned = normalize(raw);
    const keys = Object.keys(uiSeed);
    for (const key of keys) {
      if (normalize(key) === cleaned) return key;
    }
    for (const key of keys) {
      const nk = normalize(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }
    return "";
  }


  function getTrackOptions() {
    const bucket = detectCareerBucket(state.career || "");
    const base = [
      { ...TRACK_HELP.physics, score: 4 },
      { ...TRACK_HELP.chemistry, score: 4 },
      { ...TRACK_HELP.biology, score: 4 },
      { ...TRACK_HELP.earth, score: 4 }
    ];

    base.forEach(item => {
      if (bucket === "materials") {
        if (item.id === "chemistry") item.score += 12;
        if (item.id === "physics") item.score += 9;
        if (item.id === "earth") item.score += 2;
        if (item.id === "biology") item.score -= 8;
      } else if (bucket === "mechanical") {
        if (item.id === "physics") item.score += 12;
        if (item.id === "chemistry") item.score += 4;
        if (item.id === "biology") item.score -= 10;
      } else if (bucket === "electronic" || bucket === "it") {
        if (item.id === "physics") item.score += 11;
        if (item.id === "chemistry") item.score += 5;
        if (item.id === "earth") item.score += 1;
        if (item.id === "biology") item.score -= 8;
      } else if (bucket === "bio") {
        if (item.id === "biology") item.score += 12;
        if (item.id === "chemistry") item.score += 3;
      } else if (bucket === "env") {
        if (item.id === "earth") item.score += 12;
        if (item.id === "physics") item.score += 3;
      }
    });

    return base.sort((a, b) => b.score - a.score);
  }

  function getTrackMeta(trackId) {
    return TRACK_HELP[trackId] || null;
  }

  function getConceptFriendlyLabel(concept) {
    const map = {
      "과학의 측정과 우리 사회": "센서·측정·데이터",
      "규칙성 발견과 주기율표": "원소·배열·예측",
      "기본량과 단위": "전류·시간·길이",
      "물질 구성과 분류": "재료·원소·구조",
      "생명 시스템": "생명·건강·반응",
      "역학 시스템": "힘·운동·안정성",
      "지구시스템": "환경·기후·지구"
    };
    return map[concept] || "";
  }

  function getSubjectConceptEntries(subject) {
    const entry = engineMap?.[subject];
    const concepts = entry?.concepts || {};
    return Object.entries(concepts).map(([concept, value]) => ({ concept, value }));
  }

  function detectCareerBucket(career) {
    const text = String(career || "");
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|고분자|금속)/.test(text)) return "materials";
    if (/(기계|자동차|로봇|항공|모빌리티)/.test(text)) return "mechanical";
    if (/(전기|전자|회로|센서|통신)/.test(text)) return "electronic";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터|보안|정보|통계)/i.test(text)) return "it";
    if (/(간호|의학|의예|치의|약학|보건|수의|생명|바이오|의료)/.test(text)) return "bio";
    if (/(환경|기후|지구|우주|천문|해양|지리)/.test(text)) return "env";
    return "default";
  }

  function getCareerProfileKey(career) {
    const bucket = detectCareerBucket(career);
    const map = {
      materials: "재료공학",
      mechanical: "기계공학",
      electronic: "전자공학",
      it: "정보",
      bio: "생명과학 탐구",
      env: "_default",
      default: "_default"
    };
    return map[bucket] || "_default";
  }

  function scoreConcept(concept, entry) {
    const career = state.career || "";
    const bucket = detectCareerBucket(career);
    const track = state.linkTrack || "";
    const textBag = [
      concept,
      entry?.unit || "",
      ...(entry?.micro_keywords || []),
      ...(entry?.linked_career_bridge || []),
      ...(entry?.core_concepts || [])
    ].join(" ");

    const bioStrong = /(세포|항상성|생명 시스템|생명 유지|생체 데이터|건강 측정|자극 반응|내부 환경)/.test(textBag);
    const mechStrong = /(역학 시스템|구조 안정성|하중 전달|진동 제어|운동|힘|전류|전압|센서|단위|측정|구조물|내진 설계)/.test(textBag);
    const elecStrong = /(전류|전압|전기|전자|회로|센서|디지털 정보|측정 도구|정밀 측정)/.test(textBag);
    const dataStrong = /(데이터 분석|그래프 해석|정량 분석|측정값 비교|디지털 데이터|표준|자료)/.test(textBag);
    const envStrong = /(지구시스템|지구 시스템|천체|대기권|수권|지구계|우주|기후|환경 측정|지구과학 탐구|위성|관측)/.test(textBag);
    const chemStrong = /(물질 구성|물질 분류|원소 배열|주기율|산화|염기|결합|분류 기준|금속|이온|분자|재료 변화|원소|자연에 존재하는 원소)/.test(textBag);

    const hasBio = bioStrong;
    const hasMech = mechStrong || dataStrong;
    const hasElec = elecStrong || dataStrong;
    const hasData = dataStrong;
    const hasEnv = envStrong;
    const hasChem = chemStrong;

    let score = 0;
    const reasons = [];

    if (bucket === "materials") {
      if (/(물질|규칙성|원소|주기율|측정|단위|역학|구조|안정성|에너지|재료)/.test(textBag)) { score += 16; reasons.push("진로 연결"); }
      if (hasBio && !hasMech && !hasChem) score -= 26;
    }
    if (bucket === "mechanical") {
      if (hasMech) { score += 16; reasons.push("진로 연결"); }
      if (hasBio && !hasMech) score -= 28;
    }
    if (bucket === "electronic" || bucket === "it") {
      if (hasElec || hasData) { score += 15; reasons.push("진로 연결"); }
      if (hasBio && !hasElec && !hasData) score -= 22;
    }
    if (bucket === "bio") {
      if (hasBio) { score += 16; reasons.push("진로 연결"); }
      if (hasMech && !hasBio) score -= 10;
    }
    if (bucket === "env") {
      if (hasEnv) { score += 16; reasons.push("진로 연결"); }
    }

    if (track === "physics") {
      if (hasMech || hasElec || hasData) { score += 14; reasons.push("물리 연계 추천"); }
      if (hasBio && !hasMech) score -= 12;
    }
    if (track === "chemistry") {
      if (hasChem) { score += 14; reasons.push("화학 연계 추천"); }
      if (hasBio && !hasChem) score -= 10;
    }
    if (track === "biology") {
      if (hasBio) { score += 14; reasons.push("생명과학 연계 추천"); }
      if ((hasMech || hasChem) && !hasBio) score -= 8;
    }
    if (track === "earth") {
      if (hasEnv) { score += 22; reasons.push("지구과학 연계 추천"); }
      if (hasBio && !hasEnv) score -= 18;
      if (hasChem && !hasEnv) score -= 10;
      if (hasMech && !hasEnv) score -= 8;
    }

    if ((entry?.linked_career_bridge || []).some(v => fuzzyIncludes(v, career))) {
      score += 10;
      reasons.push("진로 브리지 일치");
    }

    const profile = topicMatrix?.careerProfiles?.[getCareerProfileKey(career)];
    if (profile && Array.isArray(profile.categories)) {
      const combined = textBag;
      if (profile.categories.some(cat => fuzzyIncludes(combined, cat))) score += 6;
    }

    return { score, reasons: uniq(reasons) };
  }

  function getRankedConcepts() {
    return getSubjectConceptEntries(state.subject)
      .map(({ concept, value }) => ({ concept, value, ...scoreConcept(concept, value) }))
      .sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept, 'ko'));
  }

  function getDisplayConcepts(ranked) {
    if (!Array.isArray(ranked) || !ranked.length) return [];
    const topScore = ranked[0]?.score ?? 0;
    let filtered = ranked.filter(item => item.score >= topScore - 10 && item.score > -12);

    if (state.linkTrack === "earth") {
      const envFirst = filtered.filter(item => /(지구|천체|대기|수권|우주|기후|관측)/.test(item.concept + ' ' + ((item.value?.core_concepts || []).join(' ')) + ' ' + ((item.value?.micro_keywords || []).join(' '))));
      const others = filtered.filter(item => !envFirst.includes(item));
      filtered = [...envFirst, ...others];
    }

    if (filtered.length < 3) filtered = ranked.slice(0, 3);
    return filtered.slice(0, 3);
  }

  function getConceptEntry() {
    if (!state.subject || !state.concept) return null;
    return engineMap?.[state.subject]?.concepts?.[state.concept] || null;
  }

  function getKeywordList(entry) {
    return uniq([...(entry?.micro_keywords || []), ...(entry?.core_concepts || [])]);
  }

  function isStepEnabled(step) {
    if (step === 1) return true;
    if (step === 2) return !!state.subject;
    if (step === 3) return !!state.subject && !!state.career;
    if (step === 4) return isStepEnabled(3) && !!state.linkTrack;
    if (step === 5) return isStepEnabled(4) && !!state.concept && !!state.keyword;
    if (step === 6) return isStepEnabled(5) && !!state.selectedBook;
    if (step === 7) return isStepEnabled(6) && !!state.reportMode;
    if (step === 8) return isStepEnabled(7) && !!state.reportView;
    return false;
  }

  function renderAll() {
    renderStatus();
    renderTrackArea();
    renderConceptArea();
    renderBookArea();
    renderModeArea();
    renderViewArea();
    renderReportLineArea();
    renderSelectionSummary();
    applyLocks();
    syncOutputFields();
  }

  function renderStatus() {
    const subjectEl = $("engineSubjectSummary");
    const careerEl = $("engineCareerSummary");
    const progressEl = $("engineProgressSummary");
    if (subjectEl) subjectEl.textContent = state.subject || "선택 전";
    if (careerEl) careerEl.textContent = state.career || "입력 전";

    let progress = "연계 축 선택 대기";
    if (state.subject && state.career && !state.linkTrack) progress = "연계 축 선택 중";
    if (state.linkTrack && !state.keyword) progress = "추천 개념/키워드 선택 중";
    if (state.keyword && !state.selectedBook) progress = "도서 선택 대기";
    if (state.selectedBook && !state.reportMode) progress = "보고서 방식 선택 대기";
    if (state.reportMode && !state.reportView) progress = "보고서 관점 선택 대기";
    if (state.reportView && !state.reportLine) progress = "보고서 라인 선택 대기";
    if (state.reportLine) progress = "MINI 전달 데이터 준비 완료";
    if (progressEl) progressEl.textContent = progress;
  }

  function renderTrackArea() {
    const el = $("engineTrackArea");
    if (!el) return;
    if (!isStepEnabled(3)) {
      el.innerHTML = `<div class="engine-empty">먼저 과목과 진로를 정해야 연계 축 선택이 열립니다.</div>`;
      return;
    }
    const options = getTrackOptions();
    const recommended = options[0];
    el.innerHTML = `
      <div class="engine-help">학생은 어려운 개념을 고르기보다, 먼저 <strong>${escapeHtml(recommended?.title || "추천 연계 축")}</strong> 같은 쉬운 과학 축부터 고르면 됩니다.</div>
      <div class="engine-track-grid">${options.map(item => `
        <button type="button" class="engine-track-card ${state.linkTrack === item.id ? "is-active" : ""}" data-track="${escapeHtml(item.id)}">
          <div class="engine-track-top">
            <div class="engine-track-title">${escapeHtml(item.title)}</div>
            <div class="engine-track-short">${escapeHtml(item.short)}</div>
          </div>
          <div class="engine-track-next">연계 과목: ${escapeHtml(item.nextSubject)}</div>
          <div class="engine-track-desc">${escapeHtml(item.desc)}</div>
          <div class="engine-track-desc" style="margin-top:6px; color:#275fe8; font-weight:700;">${escapeHtml(item.easy)}</div>
        </button>
      `).join("")}</div>
      <div class="engine-auto-row">
        <button type="button" class="engine-auto-btn" data-action="auto-track">잘 모르겠어요 → 추천 연계 축 자동 선택</button>
      </div>
    `;
  }

  function renderConceptArea() {
    const conceptWrap = $("engineConceptCards");
    const keywordWrap = $("engineKeywordButtons");
    if (!conceptWrap || !keywordWrap) return;

    if (!isStepEnabled(4)) {
      conceptWrap.innerHTML = `<div class="engine-empty">먼저 연계 축을 선택해야 추천 개념이 열립니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">추천 개념을 먼저 선택하면 그 안의 추천 키워드가 열립니다.</div>`;
      return;
    }

    const ranked = getRankedConcepts();
    const displayConcepts = getDisplayConcepts(ranked);
    if (!displayConcepts.length) {
      conceptWrap.innerHTML = `<div class="engine-empty">등록된 교과 개념 데이터가 없습니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">등록된 키워드 데이터가 없습니다.</div>`;
      return;
    }

    conceptWrap.innerHTML = `<div class="engine-concept-grid">${displayConcepts.map(item => {
      const tags = getKeywordList(item.value).slice(0, 4).map(tag => `<span class="engine-mini-tag">${escapeHtml(tag)}</span>`).join("");
      const why = item.reasons[0] || "추천 개념";
      const alias = getConceptFriendlyLabel(item.concept);
      return `
        <button type="button" class="engine-concept-card ${state.concept === item.concept ? "is-active" : ""}" data-concept="${escapeHtml(item.concept)}">
          <div class="engine-concept-name">${escapeHtml(item.concept)}</div>
          ${alias ? `<div class="engine-help" style="margin-top:6px; color:#275fe8; font-weight:700;">${escapeHtml(alias)}</div>` : ""}
          <div class="engine-help" style="margin-top:8px;">${escapeHtml(why)}</div>
          <div class="engine-concept-tags">${tags}</div>
        </button>
      `;
    }).join("")}</div>`;

    if (!state.concept) {
      keywordWrap.innerHTML = `<div class="engine-empty">왼쪽에서 개념을 먼저 고르면 해당 개념의 키워드가 열립니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);
    if (!keywords.length) {
      keywordWrap.innerHTML = `<div class="engine-empty">이 개념에 연결된 키워드가 없습니다.</div>`;
      return;
    }

    keywordWrap.innerHTML = `
      <div class="engine-help">선택 개념: <strong>${escapeHtml(state.concept)}</strong></div>
      <div class="engine-chip-wrap">${keywords.map(keyword => `
        <button type="button" class="engine-chip ${state.keyword === keyword ? "is-active" : ""}" data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
      `).join("")}</div>
    `;
  }

  function renderBookArea() {
    const el = $("engineBookArea");
    if (!el) return;
    if (!isStepEnabled(4)) {
      el.innerHTML = `<div class="engine-empty">먼저 개념과 키워드를 선택해야 도서 추천이 열립니다.</div>`;
      return;
    }
    if (!window.renderBookSelectionHTML) {
      el.innerHTML = `<div class="engine-empty">도서 추천 기능을 불러오는 중입니다.</div>`;
      return;
    }
    el.innerHTML = window.renderBookSelectionHTML({
      subject: state.subject,
      career: state.career,
      linkTrack: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    });
  }

  function renderModeArea() {
    const el = $("engineModeButtons");
    if (!el) return;
    if (!isStepEnabled(6)) {
      el.innerHTML = `<div class="engine-empty">먼저 도서를 선택해야 보고서 전개 방식을 고를 수 있습니다.</div>`;
      return;
    }
    const meta = window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      linkTrack: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    }) : { modeOptions: [] };
    const options = meta.modeOptions || [];
    el.innerHTML = `<div class="engine-mode-grid">${options.map(option => `
      <button type="button" class="engine-mode-card ${state.reportMode === option.id ? "is-active" : ""}" data-action="mode" data-value="${escapeHtml(option.id)}">
        <div class="engine-mode-title">${escapeHtml(option.label)}</div>
        <div class="engine-mode-desc">${escapeHtml(option.desc)}</div>
      </button>
    `).join("")}</div>`;
  }

  function getRecommendedReportLine() {
    const grade = ($("grade")?.value || "").trim();
    const taskType = ($("taskType")?.value || "").trim();
    if (state.reportMode === "major") return "advanced";
    if (grade === "고3") return "advanced";
    if (grade === "고2" && ["data","compare","application"].includes(state.reportMode)) return "standard";
    if (taskType.includes("실험") || taskType.includes("발표") || ["data","compare","application"].includes(state.reportMode)) return "standard";
    if (grade === "고2") return "standard";
    return "basic";
  }

  function renderReportLineArea() {
    const el = $("engineLineArea");
    if (!el) return;
    if (!isStepEnabled(8)) {
      el.innerHTML = `<div class="engine-empty">먼저 보고서 관점을 선택해야 보고서 라인이 열립니다.</div>`;
      return;
    }
    if (!state.reportLine) {
      state.reportLine = getRecommendedReportLine();
    }
    const entries = Object.values(REPORT_LINE_HELP);
    const recommended = getRecommendedReportLine();
    const current = REPORT_LINE_HELP[state.reportLine] || REPORT_LINE_HELP[recommended] || entries[0];
    el.innerHTML = `
      <div class="engine-mode-grid">${entries.map(item => `
        <button type="button" class="engine-mode-card ${state.reportLine === item.id ? "is-active" : ""}" data-action="line" data-value="${escapeHtml(item.id)}">
          <div class="engine-mode-title">${escapeHtml(item.title)} ${item.id === recommended ? '<span class="engine-mini-tag" style="margin-left:6px;">추천</span>' : ''}</div>
          <div class="engine-mode-desc">${escapeHtml(item.desc)}</div>
          <div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:700;">${escapeHtml(item.fit)}</div>
        </button>
      `).join("")}</div>
      <div class="engine-view-guide">
        <div class="engine-view-guide-title">${escapeHtml(current.title)} 보고서 라인</div>
        <div class="engine-view-guide-desc">${escapeHtml(current.desc)}</div>
        <div class="engine-view-guide-example">문단 흐름: ${current.sections.map((section, idx) => `${idx + 1}. ${section}`).join(' → ')}</div>
      </div>
    `;
  }

  function renderViewArea() {
    const el = $("engineViewButtons");
    if (!el) return;
    if (!isStepEnabled(7)) {
      el.innerHTML = `<div class="engine-empty">먼저 보고서 전개 방식을 선택해야 관점 선택이 열립니다.</div>`;
      return;
    }
    const meta = window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      linkTrack: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    }) : { viewOptions: [] };
    const options = meta.viewOptions || [];
    const selectedView = state.reportView || options[0] || "";
    const viewMeta = VIEW_HELP[selectedView] || {
      title: `${selectedView || "관점"} 설명`,
      desc: "이 관점은 보고서를 어떤 시선으로 풀어갈지 정하는 선택입니다.",
      example: "예: 선택한 개념과 도서를 이 시선으로 다시 정리해 보세요."
    };
    el.innerHTML = `
      <div class="engine-chip-wrap">${options.map(view => `
        <button type="button" class="engine-chip ${state.reportView === view ? "is-active" : ""}" data-action="view" data-value="${escapeHtml(view)}">${escapeHtml(view)}</button>
      `).join("")}</div>
      <div class="engine-view-guide">
        <div class="engine-view-guide-title">${escapeHtml(viewMeta.title)}</div>
        <div class="engine-view-guide-desc">${escapeHtml(viewMeta.desc)}</div>
        <div class="engine-view-guide-example">${escapeHtml(viewMeta.example)}</div>
      </div>
    `;
  }

  function applyLocks() {
    [3,4,5,6,7,8].forEach(step => {
      const block = document.querySelector(`.engine-step-block[data-step="${step}"]`);
      if (block) block.classList.toggle("locked", !isStepEnabled(step));
    });
  }

  function renderSelectionSummary() {
    const el = $("engineSelectionSummary");
    const payloadEl = $("engineMiniPayload");
    if (!el || !payloadEl) return;

    const payload = buildMiniPayload();
    const chips = [
      state.subject,
      state.career,
      getTrackMeta(state.linkTrack)?.title || "",
      state.concept,
      state.keyword,
      state.selectedBookTitle || state.selectedBook,
      getModeLabel(state.reportMode),
      state.reportView,
      getReportLineLabel(state.reportLine),
      payload.activity_context.activity_area,
      payload.activity_context.output_goal
    ].filter(Boolean).map(v => `<span class="engine-tag">${escapeHtml(v)}</span>`).join("");

    el.innerHTML = chips || `<div class="engine-empty">아직 MINI로 넘길 선택 데이터가 없습니다.</div>`;

    payloadEl.innerHTML = `
      <strong>MINI 전달 구조</strong><br>
      학교/학년: ${escapeHtml(payload.student_context.school_name || "-")} / ${escapeHtml(payload.student_context.grade || "-")}<br>
      과목: ${escapeHtml(payload.student_context.subject || "-")}<br>
      진로: ${escapeHtml(payload.student_context.career || "-")}<br>
      활용 영역: ${escapeHtml(payload.activity_context.activity_area || "-")}<br>
      최종 결과물: ${escapeHtml(payload.activity_context.output_goal || "-")}<br>
      기본 결과물: ${escapeHtml(payload.task_context.task_type || "-")}<br>
      연계 축: ${escapeHtml(payload.track_context.label || "-")}<br>
      교과 개념: ${escapeHtml(payload.concept_context.concept || "-")}<br>
      교과 키워드: ${escapeHtml(payload.concept_context.keyword || "-")}<br>
      도서: ${escapeHtml(payload.book_context.title || "-")}<br>
      보고서 방식: ${escapeHtml(payload.report_context.mode_label || "-")}<br>
      보고서 관점: ${escapeHtml(payload.report_context.view || "-")}<br>
      보고서 라인: ${escapeHtml(payload.report_context.line_label || "-")}<br>
      문단 흐름: ${escapeHtml((payload.report_context.frame_sections || []).join(' → ') || "-")}<br>
      조건: ${escapeHtml((payload.activity_context.constraint_labels || []).join(', ') || "없음")}<br>
      교사 안내: ${escapeHtml(payload.activity_context.teacher_focus || "-")}<br>
      학생 메모: ${escapeHtml(payload.activity_context.student_seed || "-")}
    `;
  }

  function getModeLabel(id) {
    const labelMap = {
      principle: "원리 파악형",
      compare: "비교 분석형",
      data: "데이터 확장형",
      application: "사례 적용형",
      major: "전공 확장형"
    };
    return labelMap[id] || id || "";
  }

  function getReportLineLabel(id) {
    return REPORT_LINE_HELP[id]?.title || id || "";
  }

  function syncOutputFields() {
    const keywordInput = $("keyword");
    if (keywordInput) keywordInput.value = state.keyword || "";
    if ($("linkedTrack")) $("linkedTrack").value = state.linkTrack || "";
    if ($("selectedConcept")) $("selectedConcept").value = state.concept || "";
    if ($("selectedBookId")) $("selectedBookId").value = state.selectedBook || "";
    if ($("selectedBookTitle")) $("selectedBookTitle").value = state.selectedBookTitle || "";
    if ($("reportMode")) $("reportMode").value = state.reportMode || "";
    if ($("reportView")) $("reportView").value = state.reportView || "";
    if ($("reportLine")) $("reportLine").value = state.reportLine || "";
    if ($("miniNavigationPayload")) $("miniNavigationPayload").value = JSON.stringify(buildMiniPayload());
  }

  function buildMiniPayload() {
    const bookDetail = window.getSelectedBookDetail ? window.getSelectedBookDetail(state.selectedBook) : null;
    const lineMeta = REPORT_LINE_HELP[state.reportLine] || REPORT_LINE_HELP[getRecommendedReportLine()] || REPORT_LINE_HELP.basic;
    const constraints = getStructuredConstraints();
    return {
      student_context: {
        school_name: $("schoolName")?.value || "",
        grade: $("grade")?.value || "",
        subject: state.subject,
        career: state.career
      },
      activity_context: {
        activity_area: $("activityArea")?.value || "",
        output_goal: $("outputGoal")?.value || "",
        length_level: $("lengthLevel")?.value || "",
        work_style: $("workStyle")?.value || "",
        constraint_flags: constraints.flags,
        constraint_labels: constraints.labels,
        teacher_focus: $("teacherFocus")?.value || "",
        student_seed: $("studentSeed")?.value || ""
      },
      track_context: {
        id: state.linkTrack,
        label: getTrackMeta(state.linkTrack)?.title || "",
        next_subject: getTrackMeta(state.linkTrack)?.nextSubject || ""
      },
      concept_context: {
        concept: state.concept,
        keyword: state.keyword
      },
      book_context: {
        book_id: state.selectedBook,
        title: state.selectedBookTitle,
        author: bookDetail?.author || "",
        summary_short: bookDetail?.summary_short || ""
      },
      major_compare_context: {
        selected_major: state.majorSelectedName || '',
        comparison_group: state.majorComparison?.group_label || '',
        selected_focus: state.majorComparison?.selected_focus || '',
        peer_majors: Array.isArray(state.majorComparison?.peers) ? state.majorComparison.peers.slice(0,3).map(peer => ({
          display_name: peer.display_name || '',
          track_category: peer.track_category || '',
          focus: peer.focus || ''
        })) : []
      },
      report_context: {
        mode: state.reportMode,
        mode_label: getModeLabel(state.reportMode),
        view: state.reportView,
        line_id: lineMeta.id,
        line_label: lineMeta.title,
        line_fit: lineMeta.fit,
        frame_sections: lineMeta.sections,
        frame: {
          intro: lineMeta.sections[0] || "",
          body1: lineMeta.sections[1] || "",
          body2: lineMeta.sections[2] || "",
          body3: lineMeta.sections[3] || "",
          conclusion: lineMeta.sections[lineMeta.sections.length - 1] || ""
        }
      },
      task_context: {
        task_name: $("taskName")?.value || "",
        task_type: $("taskType")?.value || "",
        usage_purpose: $("usagePurpose")?.value || "",
        task_description: $("taskDescription")?.value || "",
        output_goal: $("outputGoal")?.value || "",
        activity_area: $("activityArea")?.value || "",
        length_level: $("lengthLevel")?.value || "",
        work_style: $("workStyle")?.value || "",
        constraints: constraints.labels,
        teacher_focus: $("teacherFocus")?.value || "",
        student_seed: $("studentSeed")?.value || ""
      }
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
