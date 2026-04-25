window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v33.0-cell-metabolism-support";

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

  // 구조 정리 기준
  // - 교과 원본 SSOT: seed/textbook-data/
  // - 3번 화면 런타임 데이터: seed/textbook-v1/
  // - 4번 종단 연결/브리지 데이터: seed/followup-axis/
  //
  // 실무 원칙:
  // 1) 과목 수정은 textbook-data부터
  // 2) 화면 반영은 textbook-v1 갱신 후 확인
  // 3) 후속 연계축은 followup-axis에서 별도 관리
  const DATA_SOURCE_POLICY = Object.freeze({
    sourceOfTruth: "seed/textbook-data/",
    runtimeUi: "seed/textbook-v1/",
    followupAxis: "seed/followup-axis/"
  });

  const UI_SEED_URL = `${DATA_SOURCE_POLICY.runtimeUi}subject_concept_ui_seed.json`;
  const ENGINE_MAP_URL = `${DATA_SOURCE_POLICY.runtimeUi}subject_concept_engine_map.json`;
  const TOPIC_MATRIX_URL = `${DATA_SOURCE_POLICY.runtimeUi}topic_matrix_seed.json`;
  const FOLLOWUP_SUBJECT_URL = `${DATA_SOURCE_POLICY.followupAxis}subject_bridge_point.json`;
  const FOLLOWUP_MAJOR_URL = `${DATA_SOURCE_POLICY.followupAxis}major_followup_axis.json`;

  const SUBJECT_NAME_ALIASES = Object.freeze({
    "통합사회": "통합사회1",
    "통합사회 1": "통합사회1",
    "통합사회I": "통합사회1",
    "통합사회Ⅰ": "통합사회1",
    "물리학": "물리",
    "물리학1": "물리",
    "물리학 1": "물리",
    "물리학I": "물리",
    "물리학Ⅰ": "물리",
    "화학학": "화학",
    "화학1": "화학",
    "화학 1": "화학",
    "화학I": "화학",
    "화학Ⅰ": "화학",
    "생명과학1": "생명과학",
    "생명과학 1": "생명과학",
    "생명과학I": "생명과학",
    "생명과학Ⅰ": "생명과학",
    "지구과학1": "지구과학",
    "지구과학 1": "지구과학",
    "지구과학I": "지구과학",
    "지구과학Ⅰ": "지구과학",
    "역학과에너지": "역학과 에너지",
    "고등 역학과 에너지": "역학과 에너지",
    "고등학교 역학과 에너지": "역학과 에너지",
    "전자기와양자": "전자기와 양자",
    "고등 전자기와 양자": "전자기와 양자",
    "고등학교 전자기와 양자": "전자기와 양자",
    "물질과에너지": "물질과 에너지",
    "고등 물질과 에너지": "물질과 에너지",
    "고등학교 물질과 에너지": "물질과 에너지",
    "세포와물질대사": "세포와 물질대사",
    "고등 세포와 물질대사": "세포와 물질대사",
    "고등학교 세포와 물질대사": "세포와 물질대사",
    "지구시스템과학": "지구시스템과학",
    "지구시스템 과학": "지구시스템과학",
    "고등 지구시스템과학": "지구시스템과학",
    "고등학교 지구시스템과학": "지구시스템과학"
  });
  const SUBJECT_CONCEPT_LONGITUDINAL_URLS = {
    "통합과학1": "seed/followup-axis/integrated_science1_concept_longitudinal_map.json",
    "통합과학2": "seed/followup-axis/integrated_science2_concept_longitudinal_map.json",
    "공통수학1": "seed/followup-axis/common_math1_concept_longitudinal_map.json",
    "공통수학2": "seed/followup-axis/common_math2_concept_longitudinal_map.json",
    "정보": "seed/followup-axis/info_concept_longitudinal_map.json",
    "통합사회1": "seed/followup-axis/integrated_society1_concept_longitudinal_map.json",
    "통합사회": "seed/followup-axis/integrated_society1_concept_longitudinal_map.json",
    "공통국어1": "seed/followup-axis/common_korean1_concept_longitudinal_map.json",
    "공통국어2": "seed/followup-axis/common_korean2_concept_longitudinal_map.json",
    "통합사회2": "seed/followup-axis/integrated_society2_concept_longitudinal_map.json",
    "과학탐구실험1": "seed/followup-axis/science_inquiry1_concept_longitudinal_map.json",
    "과학탐구실험2": "seed/followup-axis/science_inquiry2_concept_longitudinal_map.json",
    "대수": "seed/followup-axis/algebra_concept_longitudinal_map.json",
    "확률과 통계": "seed/followup-axis/probability_statistics_concept_longitudinal_map.json",
    "미적분1": "seed/followup-axis/calculus1_concept_longitudinal_map.json",
    "기하": "seed/followup-axis/geometry_concept_longitudinal_map.json",
    "물리": "seed/followup-axis/physics1_concept_longitudinal_map.json",
    "물리학": "seed/followup-axis/physics1_concept_longitudinal_map.json",
    "물리학Ⅰ": "seed/followup-axis/physics1_concept_longitudinal_map.json",
    "화학": "seed/followup-axis/chemistry1_concept_longitudinal_map.json",
    "화학Ⅰ": "seed/followup-axis/chemistry1_concept_longitudinal_map.json",
    "화학1": "seed/followup-axis/chemistry1_concept_longitudinal_map.json",
    "생명과학": "seed/followup-axis/life_science_concept_longitudinal_map.json",
    "생명과학Ⅰ": "seed/followup-axis/life_science_concept_longitudinal_map.json",
    "생명과학1": "seed/followup-axis/life_science_concept_longitudinal_map.json",
    "지구과학": "seed/followup-axis/earth_science_concept_longitudinal_map.json",
    "지구과학Ⅰ": "seed/followup-axis/earth_science_concept_longitudinal_map.json",
    "지구과학1": "seed/followup-axis/earth_science_concept_longitudinal_map.json",
    "역학과 에너지": "seed/followup-axis/mechanics_energy_concept_longitudinal_map.json",
    "역학과에너지": "seed/followup-axis/mechanics_energy_concept_longitudinal_map.json",
    "전자기와 양자": "seed/followup-axis/electromagnetism_quantum_concept_longitudinal_map.json",
    "전자기와양자": "seed/followup-axis/electromagnetism_quantum_concept_longitudinal_map.json",
    "물질과 에너지": "seed/followup-axis/matter_energy_concept_longitudinal_map.json",
    "물질과에너지": "seed/followup-axis/matter_energy_concept_longitudinal_map.json",
    "세포와 물질대사": "seed/followup-axis/cell_metabolism_concept_longitudinal_map.json",
    "세포와물질대사": "seed/followup-axis/cell_metabolism_concept_longitudinal_map.json"
  }

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
    reportLine: "",
    majorSelectedName: "",
    majorCoreKeywords: [],
    majorComparison: null,
    linkTrackSource: ""
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
  let subjectBridgePoint = [];
  let majorFollowupAxis = [];
  let conceptLongitudinalMaps = {};

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


  function getCanonicalSubjectName(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (SUBJECT_NAME_ALIASES[raw]) return SUBJECT_NAME_ALIASES[raw];

    const cleaned = normalize(raw);
    for (const [alias, canonical] of Object.entries(SUBJECT_NAME_ALIASES)) {
      if (normalize(alias) === cleaned) return canonical;
    }
    return raw;
  }

  function applySubjectAliasesToMap(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return source;
    const cloned = { ...source };

    Object.entries(SUBJECT_NAME_ALIASES).forEach(([alias, canonical]) => {
      if (canonical in cloned && !(alias in cloned)) cloned[alias] = cloned[canonical];
      if (alias in cloned && !(canonical in cloned)) cloned[canonical] = cloned[alias];
    });

    return cloned;
  }

  async function loadSubjectConceptLongitudinalMaps() {
    const result = {};
    const entries = Object.entries(SUBJECT_CONCEPT_LONGITUDINAL_URLS || {});
    await Promise.all(entries.map(async ([subjectName, url]) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        result[subjectName] = await res.json();
      } catch (error) {
        console.warn("subject concept longitudinal map load skipped:", subjectName, error);
      }
    }));
    return result;
  }

  async function init() {
    try {
      const [uiRes, engineRes, matrixRes, followupSubjectRes, followupMajorRes, loadedConceptMaps] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }),
        fetch(ENGINE_MAP_URL, { cache: "no-store" }),
        fetch(TOPIC_MATRIX_URL, { cache: "no-store" }).catch(() => null),
        fetch(FOLLOWUP_SUBJECT_URL, { cache: "no-store" }).catch(() => null),
        fetch(FOLLOWUP_MAJOR_URL, { cache: "no-store" }).catch(() => null),
        loadSubjectConceptLongitudinalMaps()
      ]);

      if (!uiRes.ok || !engineRes.ok) {
        console.warn("textbook concept seed load failed", uiRes.status, engineRes.status);
        return;
      }

      uiSeed = applySubjectAliasesToMap(await uiRes.json());
      engineMap = applySubjectAliasesToMap(await engineRes.json());
      topicMatrix = matrixRes && matrixRes.ok ? await matrixRes.json() : null;
      subjectBridgePoint = followupSubjectRes && followupSubjectRes.ok ? await followupSubjectRes.json() : [];
      majorFollowupAxis = followupMajorRes && followupMajorRes.ok ? await followupMajorRes.json() : [];
      conceptLongitudinalMaps = applySubjectAliasesToMap(loadedConceptMaps || {});

      injectStyles();
      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      syncCareerFromInput();
      renderCareerKeywordPreview();
      renderAll();
      renderUploadSummary();
    } catch (error) {
      console.warn("textbook concept helper init error:", error);
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
      .engine-flow-kicker, .engine-flow-title, .engine-flow-desc, .engine-selection-box { display:none; }
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
        <h2 class="engine-flow-title">과목 → 학과 검색 → 후속 연계축 → 추천 개념·키워드 → 도서 → 보고서 방식 → 관점</h2>
        <p class="engine-flow-desc">학생이 학과명만 알아도 선택할 수 있도록, 학과 검색 다음에 먼저 <strong>후속 연계축</strong>을 고르고 그 축에 맞는 추천 개념과 키워드를 보여주는 구조입니다. 고1은 고2 과목, 고2는 고3 심화 과목과의 연결까지 생각하며 선택할 수 있습니다.</p>

        <div class="engine-status-row">
          <div class="engine-status-box">
            <div class="engine-status-label">1. 과목</div>
            <div id="engineSubjectSummary" class="engine-status-value">선택 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">2. 학과</div>
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
              <h3 class="engine-step-title">3. 후속 연계축 선택</h3>
              <div class="engine-step-copy">학과에서 중요하게 보는 축과 현재 선택 과목이 만나는 지점을 먼저 고릅니다. 이 단계는 보고서 형식을 확정하는 것이 아니라, 다음 학년까지 이어질 확장 방향을 정하는 단계입니다.</div>
            </div>
            <div class="engine-step-guide">수학 / 정보 / 데이터 / 과학</div>
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
    cleanupMinimalForm();

    const flowCard = section.querySelector(".engine-flow-card");
    const conceptBlock = section.querySelector("#engineConceptBlock");
    const trackBlock = section.querySelector("#engineTrackBlock");
    if (flowCard && conceptBlock && trackBlock) {
      flowCard.insertBefore(conceptBlock, trackBlock);

      const conceptTitle = conceptBlock.querySelector(".engine-step-title");
      const conceptCopy = conceptBlock.querySelector(".engine-step-copy");
      const conceptGuide = conceptBlock.querySelector(".engine-step-guide");
      if (conceptTitle) conceptTitle.textContent = "3. 교과 개념·키워드 선택";
      if (conceptCopy) conceptCopy.textContent = "먼저 현재 과목 안에서 어떤 교과 개념과 키워드로 출발할지 고릅니다. 종단 연결성은 이 선택을 바탕으로 열립니다.";
      if (conceptGuide) conceptGuide.textContent = "교과 개념 → 핵심 키워드";

      const trackTitle = trackBlock.querySelector(".engine-step-title");
      const trackCopy = trackBlock.querySelector(".engine-step-copy");
      const trackGuide = trackBlock.querySelector(".engine-step-guide");
      if (trackTitle) trackTitle.textContent = "4. 교과 개념 기반 후속 연계축 선택";
      if (trackCopy) trackCopy.textContent = "선택한 교과 개념이 다음 학년 과목으로 어떻게 이어지는지 먼저 보고, 학과 입력은 그 축의 우선순위를 조정하는 데만 사용합니다.";
      if (trackGuide) trackGuide.textContent = "종단 연결 → 학과 보정";
    }

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

    if (taskNameSpan) taskNameSpan.textContent = "활동 과제 이름";
    if (taskTypeSpan) taskTypeSpan.textContent = "결과물 유형";
    if (taskDescSpan) taskDescSpan.textContent = "선생님 안내문";
    if (usageSpan) usageSpan.textContent = "사용 목적";

    if (taskName) taskName.placeholder = "예: 과학 탐구 보고서, 동아리 주제 발표, 자율활동 기록 정리";
    const careerInput = $("career");
    const careerSpan = careerInput?.closest("label")?.querySelector("span");
    if (careerSpan) careerSpan.textContent = "학과 검색";
    if (careerInput) careerInput.placeholder = "예: 컴퓨터, 반도체, 간호, 신소재, 환경";
    if (taskDescription) taskDescription.placeholder = "예: 교과 개념과 연결한 자료조사형 보고서, 실험은 어렵고 발표 포함 / 동아리에서 실제 사례 조사 중심";
  }


  function cleanupMinimalForm() {
    const usagePurpose = $("usagePurpose");
    const keywordInput = $("keyword");
    const taskType = $("taskType");
    const taskDescription = $("taskDescription");
    const careerInput = $("career");

    const usageLabel = usagePurpose?.closest("label");
    if (usageLabel) usageLabel.style.display = "none";

    const keywordLabel = keywordInput?.closest("label");
    if (keywordLabel) keywordLabel.style.display = "none";
    if (keywordInput && keywordInput.type !== "hidden") {
      keywordInput.type = "hidden";
    }

    const careerSpan = careerInput?.closest("label")?.querySelector("span");
    if (careerSpan) careerSpan.textContent = "학과 검색";
    if (careerInput) careerInput.placeholder = "예: 컴퓨터, 반도체, 간호, 신소재, 환경";

    const taskTypeSpan = taskType?.closest("label")?.querySelector("span");
    if (taskTypeSpan) taskTypeSpan.textContent = "결과물 유형";

    const taskDescSpan = taskDescription?.closest("label")?.querySelector("span");
    if (taskDescSpan) taskDescSpan.textContent = "선생님 안내문";
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
      ["탐구보고서", "탐구보고서"],
      ["실험보고서", "실험보고서"],
      ["자료조사 보고서", "자료조사 보고서"],
      ["발표보고서", "발표보고서"]
    ].forEach(([value, label]) => ensureSelectOption(taskType, value, label));

    [
      "동아리 주제 정리",
      "자율활동 주제 설계",
      "진로활동 확장",
      "세특 참고 초안"
    ].forEach(v => ensureSelectOption(usagePurpose, v, v));
  }

  function injectGeneralContextPanel() {
    // 최소 입력 폼 운영을 위해 현재는 추가 패널을 생성하지 않습니다.
    return;
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
            <option value="탐구보고서">탐구보고서</option>
            <option value="실험보고서">실험보고서</option>
            <option value="자료조사 보고서">자료조사 보고서</option>
            <option value="발표보고서">발표보고서</option>
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

  function getMajorEngineSnapshot() {
    try {
      return typeof window.getMajorEngineSelectionData === "function"
        ? (window.getMajorEngineSelectionData() || null)
        : null;
    } catch (error) {
      console.warn("major snapshot read failed:", error);
      return null;
    }
  }

  function derivePreviewDetailFromPayload(payload) {
    if (!payload) return null;
    if (payload.status === "resolved") {
      return {
        display_name: payload.display_name || "",
        core_keywords: Array.isArray(payload.core_keywords) ? payload.core_keywords.slice(0, 8) : [],
        comparison: payload.comparison || null
      };
    }
    if ((payload.status === "ambiguous" || payload.status === "not_found") && Array.isArray(payload.suggestions) && payload.suggestions.length) {
      const first = payload.suggestions.find(item => Array.isArray(item?.keywords) && item.keywords.length) || payload.suggestions[0];
      return {
        display_name: first?.display_name || "",
        core_keywords: Array.isArray(first?.keywords) ? first.keywords.slice(0, 8) : [],
        comparison: null
      };
    }
    return null;
  }

  function renderCareerKeywordPreview() {
    const keywordInput = $("keyword");
    if (!keywordInput) return;
    if (state.keyword) {
      keywordInput.value = state.keyword;
      keywordInput.placeholder = "교과 개념 키워드가 자동 입력된 상태입니다.";
      return;
    }
    syncMajorSelectionDetail(null);
    const preview = Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords.slice(0, 5).join(', ') : '';
    keywordInput.value = preview || '';
    keywordInput.placeholder = preview
      ? "전공 키워드 미리보기가 자동 반영된 상태입니다. 아래에서 교과 개념을 고르면 최종 키워드로 바뀝니다."
      : "학과를 고르면 먼저 전공 키워드가 보이고, 아래에서 교과 개념을 고르면 최종 키워드가 바뀝니다.";
  }

  function syncMajorSelectionDetail(detail) {
    const fallback = detail || derivePreviewDetailFromPayload(getMajorEngineSnapshot());
    state.majorSelectedName = fallback?.display_name || '';
    state.majorCoreKeywords = Array.isArray(fallback?.core_keywords) ? fallback.core_keywords.slice(0, 8) : [];
    state.majorComparison = fallback?.comparison || null;
    if (!state.linkTrack && state.subject && state.career) {
      const autoTrack = getAutoTrackDetail();
      if (autoTrack?.id) {
        state.linkTrack = autoTrack.id;
        state.linkTrackSource = 'auto';
      }
    }
  }

  let __majorPreviewSyncTimer = null;
  let __majorPreviewFrame = null;

  function scheduleMajorPreviewSync() {
    if (__majorPreviewSyncTimer) clearTimeout(__majorPreviewSyncTimer);
    if (__majorPreviewFrame) cancelAnimationFrame(__majorPreviewFrame);
    __majorPreviewSyncTimer = setTimeout(function () {
      __majorPreviewFrame = requestAnimationFrame(function () {
        try {
          if (typeof window.__MAJOR_ENGINE_RENDER__ === "function") {
            window.__MAJOR_ENGINE_RENDER__();
          }
        } catch (error) {
          console.warn("major render refresh failed:", error);
        }
        syncMajorSelectionDetail(null);
        if (!state.keyword) {
          renderCareerKeywordPreview();
        }
        syncOutputFields();
      });
    }, 140);
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
      let careerInputDebounce = null;
      const runCareerUpdate = function (immediate) {
        const apply = function () {
          syncCareerFromInput();
          state.linkTrackSource = state.linkTrackSource || "";
          renderAll();
          scheduleMajorPreviewSync();
        };
        if (careerInputDebounce) clearTimeout(careerInputDebounce);
        if (immediate) {
          apply();
          return;
        }
        careerInputDebounce = setTimeout(apply, 160);
      };
      careerEl.addEventListener("input", function () {
        runCareerUpdate(false);
      });
      careerEl.addEventListener("change", function () {
        runCareerUpdate(true);
      });
    }

    let lastMajorSelectionSignature = "";
    let majorSelectionRenderTimer = null;
    window.addEventListener("major-engine-selection-changed", function (event) {
      const detail = event?.detail || null;
      const signature = JSON.stringify({
        display_name: detail?.display_name || "",
        core_keywords: Array.isArray(detail?.core_keywords) ? detail.core_keywords.slice(0, 8) : [],
        group_label: detail?.comparison?.group_label || "",
        selected_focus: detail?.comparison?.selected_focus || ""
      });
      if (signature === lastMajorSelectionSignature) return;
      lastMajorSelectionSignature = signature;
      syncMajorSelectionDetail(detail);
      if (majorSelectionRenderTimer) clearTimeout(majorSelectionRenderTimer);
      majorSelectionRenderTimer = setTimeout(function () {
        renderAll();
      }, 0);
    });

    document.addEventListener("click", function (event) {
      const autoTrackBtn = event.target.closest(".engine-auto-btn[data-action='auto-track']");
      if (autoTrackBtn && isStepEnabled(4)) {
        const topTrack = getTrackOptions()[0];
        clearFrom("track");
        state.linkTrack = topTrack ? topTrack.id : "";
        state.linkTrackSource = topTrack ? 'auto' : '';
        syncOutputFields();
        renderAll();
        return;
      }

      const trackCard = event.target.closest(".engine-track-card");
      if (trackCard && isStepEnabled(4)) {
        const nextTrack = trackCard.getAttribute("data-track") || "";
        clearFrom("track");
        state.linkTrack = nextTrack;
        state.linkTrackSource = 'manual';
        syncOutputFields();
        renderAll();
        return;
      }

      const conceptCard = event.target.closest(".engine-concept-card");
      if (conceptCard && isStepEnabled(3)) {
        const value = conceptCard.getAttribute("data-concept") || "";
        state.concept = value;
        state.keyword = "";
        clearFrom("track");
        syncOutputFields();
        renderAll();
        return;
      }

      const keywordBtn = event.target.closest(".engine-chip[data-action='keyword']");
      if (keywordBtn && isStepEnabled(3)) {
        state.keyword = keywordBtn.getAttribute("data-value") || "";
        clearFrom("track");
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
        return;
      }

      const lineCard = event.target.closest(".engine-mode-card[data-action='line']");
      if (lineCard && isStepEnabled(8)) {
        state.reportLine = lineCard.getAttribute("data-value") || "";
        syncOutputFields();
        renderAll();
        return;
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
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      state.reportLine = "";
      syncOutputFields();
      return;
    }
    if (stepName === "concept") {
      state.concept = "";
      state.keyword = "";
      state.linkTrack = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      state.reportLine = "";
      syncOutputFields();
    }
  }

  function syncSubjectFromSelect() {
    const el = $("subject");
    const raw = el ? ((el.value || "").trim() || (el.options?.[el.selectedIndex]?.text || "").trim()) : "";
    state.subject = getCanonicalSubjectName(findSubjectKey(raw) || raw);
    if (state.subject === "통합사회") state.subject = "통합사회1";
  }

  function syncCareerFromInput() {
    const el = $("career");
    state.career = (el?.value || "").trim();
    syncMajorSelectionDetail(null);
    if (!state.keyword) renderCareerKeywordPreview();
  }

  function findSubjectKey(raw) {
    if (!raw) return "";
    const canonicalRaw = getCanonicalSubjectName(raw);
    const cleaned = normalize(canonicalRaw);
    if (cleaned === normalize("통합사회")) return "통합사회1";

    const seedKeys = uiSeed ? Object.keys(uiSeed) : [];
    for (const key of seedKeys) {
      if (normalize(key) === cleaned) return key;
    }
    for (const key of seedKeys) {
      const nk = normalize(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    const engineKeys = engineMap ? Object.keys(engineMap) : [];
    for (const key of engineKeys) {
      if (normalize(key) === cleaned) return key;
    }
    for (const key of engineKeys) {
      const nk = normalize(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    return raw;
  }


  function getResolvedTrackId() {
    const meta = getTrackMeta(state.linkTrack);
    return mapAxisDomainToLegacyTrack(meta?.axisDomain || meta?.id || state.linkTrack || "");
  }

  function mapAxisDomainToLegacyTrack(axisDomain) {
    const domain = String(axisDomain || "").trim().toLowerCase();
    if (!domain) return "";
    if (domain === "chemistry") return "chemistry";
    if (domain === "physics") return "physics";
    if (domain === "biology") return "biology";
    if (domain === "earth" || domain === "earth_env" || domain === "environment") return "earth";
    if (domain === "data") return "physics";
    if (domain === "math") return "physics";
    if (domain === "info") return "physics";
    if (domain === "social_policy") return "biology";
    return "";
  }

  function getFollowupSubjectEntry(subject) {
    if (!subject || !Array.isArray(subjectBridgePoint)) return null;
    return subjectBridgePoint.find(item => fuzzyIncludes(item?.subject_name, subject)) || null;
  }

  function getConceptTextBag() {
    const entry = getConceptEntry();
    const followupEntry = getFollowupSubjectEntry(state.subject);
    const followupKeywords = Array.isArray(followupEntry?.bridge_points)
      ? followupEntry.bridge_points.flatMap(point => point?.bridge_keywords || [])
      : [];
    return [
      state.subject || "",
      state.concept || "",
      state.keyword || "",
      ...(entry?.core_concepts || []),
      ...(entry?.micro_keywords || []),
      ...(entry?.linked_career_bridge || []),
      ...followupKeywords
    ].join(" ");
  }

  function getConceptDrivenNextSubjects() {
    const followupEntry = getFollowupSubjectEntry(state.subject);
    const fromFollowup = Array.isArray(followupEntry?.bridge_points)
      ? followupEntry.bridge_points.flatMap(point => point?.next_subject_candidates || [])
      : [];
    const conceptBag = getConceptTextBag();

    const subjectMap = [
      { domain: "data", subjects: ["대수", "확률과 통계", "정보"], regex: /(측정|단위|자료|데이터|그래프|정량|오차|패턴|규칙|함수|모델|정보|분석)/ },
      { domain: "physics", subjects: ["물리", "역학과 에너지", "전자기와 양자"], regex: /(측정|단위|힘|운동|에너지|전류|전압|센서|시스템|벡터|구조|안정성|회로|장치)/ },
      { domain: "chemistry", subjects: ["화학", "물질과 에너지", "전자기와 양자"], regex: /(물질|원소|주기율|결합|산화|환원|분자|이온|재료|구성|성질|규칙성|화학)/ },
      { domain: "biology", subjects: ["생명과학", "세포와 물질대사", "화학"], regex: /(생명|항상성|세포|대사|효소|호흡|광합성|면역|건강|조절|생체)/ },
      { domain: "earth_env", subjects: ["지구과학", "지구시스템과학", "확률과 통계"], regex: /(지구|환경|기후|천체|우주|대기|해양|순환|지질|시공간|관측)/ },
      { domain: "engineering", subjects: ["기하", "물리", "역학과 에너지"], regex: /(공간|좌표|벡터|정사영|입체|구조|모형|설계)/ }
    ];

    const inferred = subjectMap
      .filter(item => item.regex.test(conceptBag))
      .flatMap(item => item.subjects);

    return uniq([...fromFollowup, ...inferred]);
  }

  function getConceptDrivenAxisSeeds() {
    return [
      {
        id: "data_math",
        title: "수리·데이터 모델링 축",
        short: "대수·확통·정보",
        axisDomain: "data",
        linkedSubjects: ["대수", "확률과 통계", "정보"],
        extensionKeywords: ["데이터", "정량 분석", "모델링"],
        activityExamples: ["데이터 비교", "그래프 해석", "패턴 분석"],
        desc: "선택한 교과 개념을 수치화·비교·예측 관점으로 확장하는 방향입니다.",
        pattern: /(측정|단위|자료|데이터|그래프|정량|오차|패턴|규칙|함수|모델|정보|분석)/
      },
      {
        id: "physics_system",
        title: "물리·시스템 해석 축",
        short: "물리·역학·전자기",
        axisDomain: "physics",
        linkedSubjects: ["물리", "역학과 에너지", "전자기와 양자"],
        extensionKeywords: ["힘", "운동", "에너지"],
        activityExamples: ["센서 원리 설명", "시스템 구조 분석", "운동·에너지 해석"],
        desc: "현재 개념을 힘·운동·전기·시스템 원리로 이어서 해석하는 방향입니다.",
        pattern: /(측정|단위|힘|운동|에너지|전류|전압|센서|시스템|벡터|구조|안정성|회로|장치)/
      },
      {
        id: "chem_material",
        title: "화학·재료 분석 축",
        short: "화학·물질·재료",
        axisDomain: "chemistry",
        linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자"],
        extensionKeywords: ["물질", "결합", "성질"],
        activityExamples: ["재료 성질 비교", "결합 구조 설명", "반응 조건 분석"],
        desc: "물질 구성과 성질, 결합과 반응을 바탕으로 재료·화학 방향으로 확장하는 축입니다.",
        pattern: /(물질|원소|주기율|결합|산화|환원|분자|이온|재료|구성|성질|규칙성|화학)/
      },
      {
        id: "bio_cell",
        title: "생명·세포 심화 축",
        short: "생명·세포·대사",
        axisDomain: "biology",
        linkedSubjects: ["생명과학", "세포와 물질대사", "화학"],
        extensionKeywords: ["생명", "세포", "대사"],
        activityExamples: ["생명 시스템 설명", "세포 수준 원리 정리", "건강 반응 해석"],
        desc: "생명 현상과 세포 수준 원리를 중심으로 건강·생명과학 방향으로 확장하는 축입니다.",
        pattern: /(생명|항상성|세포|대사|효소|호흡|광합성|면역|건강|조절|생체)/
      },
      {
        id: "earth_env",
        title: "지구·환경 해석 축",
        short: "지구·기후·환경",
        axisDomain: "earth_env",
        linkedSubjects: ["지구과학", "지구시스템과학", "확률과 통계"],
        extensionKeywords: ["환경", "기후", "순환"],
        activityExamples: ["기후 자료 비교", "지구 시스템 정리", "환경 변화 해석"],
        desc: "지구 시스템과 환경 변화, 관측 자료 해석으로 이어지는 축입니다.",
        pattern: /(지구|환경|기후|천체|우주|대기|해양|순환|지질|시공간|관측)/
      },
      {
        id: "space_structure",
        title: "공간·구조 모델링 축",
        short: "기하·구조·설계",
        axisDomain: "engineering",
        linkedSubjects: ["기하", "물리", "역학과 에너지"],
        extensionKeywords: ["좌표", "공간", "벡터"],
        activityExamples: ["공간 구조 분석", "정사영·좌표 모델링", "설계 조건 비교"],
        desc: "공간도형, 좌표, 벡터와 같은 구조적 사고로 확장하는 축입니다.",
        pattern: /(공간|좌표|벡터|정사영|입체|구조|모형|설계)/
      }
    ];
  }

  function getCareerAxisBoost(axis) {
    const bucket = detectCareerBucket(state.career || "");
    let score = 0;
    if (bucket === "it") {
      if (axis.axisDomain === "data") score += 14;
      if (axis.axisDomain === "physics") score += 6;
    } else if (bucket === "electronic") {
      if (axis.axisDomain === "physics") score += 14;
      if (axis.axisDomain === "chemistry") score += 8;
      if (axis.axisDomain === "data") score += 4;
    } else if (bucket === "materials") {
      if (axis.axisDomain === "chemistry") score += 14;
      if (axis.axisDomain === "physics") score += 8;
      if (axis.axisDomain === "engineering") score += 5;
    } else if (bucket === "mechanical") {
      if (axis.axisDomain === "physics") score += 14;
      if (axis.axisDomain === "engineering") score += 10;
      if (axis.axisDomain === "data") score += 3;
    } else if (bucket === "bio") {
      if (axis.axisDomain === "biology") score += 14;
      if (axis.axisDomain === "chemistry") score += 6;
    } else if (bucket === "env") {
      if (axis.axisDomain === "earth_env") score += 16;
      if (axis.axisDomain === "data") score += 4;
    }
    return score;
  }

  function getMajorAxisBoost(axis) {
    if (!state.majorSelectedName || !Array.isArray(majorFollowupAxis)) return 0;
    const matches = majorFollowupAxis.filter(item =>
      item && item.active !== false &&
      fuzzyIncludes(item.major_name, state.majorSelectedName) &&
      fuzzyIncludes(item.base_subject, state.subject)
    );
    let score = 0;
    matches.forEach(item => {
      const linked = Array.isArray(item.linked_subjects) ? item.linked_subjects : [];
      if (linked.some(subject => axis.linkedSubjects.some(linkedSubject => fuzzyIncludes(linkedSubject, subject)))) {
        score += item.is_primary ? 14 : 8;
      }
      if (item.axis_domain && item.axis_domain === axis.axisDomain) {
        score += item.is_primary ? 10 : 5;
      }
    });
    return score;
  }


  function getCurrentConceptLongitudinalMap() {
    if (!state.subject || !conceptLongitudinalMaps) return null;
    if (conceptLongitudinalMaps[state.subject]) return conceptLongitudinalMaps[state.subject];
    const values = Object.values(conceptLongitudinalMaps || {});
    return values.find(map => fuzzyIncludes(map?.subject_name, state.subject)) || null;
  }

  function getConceptLongitudinalEntry() {
    const currentMap = getCurrentConceptLongitudinalMap();
    if (!state.subject || !state.concept || !currentMap) return null;
    const items = Array.isArray(currentMap.concept_longitudinal_map)
      ? currentMap.concept_longitudinal_map
      : [];
    return items.find(item => fuzzyIncludes(item.concept_name, state.concept)) || null;
  }
  function getAxisCareerRelationMeta(subjectName, axisLike) {
    const careerText = [
      state.career || "",
      state.majorSelectedName || "",
      ...(Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords : []),
      state.majorComparison?.group_label || "",
      state.majorComparison?.selected_focus || ""
    ].join(" ").trim();

    if (!careerText) {
      return {
        type: "none",
        label: "",
        score: 0,
        message: "학과를 입력하면 이 축의 우선순위만 달라집니다."
      };
    }

    const subjectText = String(subjectName || state.subject || "");
    const axisText = [
      axisLike?.axis_domain || axisLike?.axisDomain || "",
      axisLike?.axis_title || axisLike?.title || "",
      ...(Array.isArray(axisLike?.next_subjects) ? axisLike.next_subjects : []),
      ...(Array.isArray(axisLike?.linkedSubjects) ? axisLike.linkedSubjects : [])
    ].join(" ");

    let type = "general";

    if (/공통국어|국어|문학|독서와 작문|독서와작문|매체 의사소통|매체의사소통/.test(subjectText)) {
      if (/(국어국문|국문|문예창작|문학|국어교육|언론|신문방송|미디어|콘텐츠|광고홍보|출판|작가|스토리|문화콘텐츠)/.test(careerText)) {
        type = "direct";
      } else if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|기계|공학|생명|화학|간호|의학|경영|경제|법|행정|정치|심리|사회|교육|디자인)/.test(careerText)) {
        type = "bridge";
      }
    } else if (/통합사회|사회/.test(subjectText)) {
      if (/(정치|행정|사회|경영|경제|무역|국제|지리|법|교육|언론|미디어|사회복지|심리|도시|환경)/.test(careerText)) {
        type = "direct";
      } else if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|기계|공학|생명|화학|간호|의학|건축)/.test(careerText)) {
        type = "bridge";
      }
    } else if (/정보/.test(subjectText)) {
      if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|로봇|전기|통신|디지털|AI)/i.test(careerText)) {
        type = "direct";
      } else if (/(경영|경제|산업|미디어|디자인|교육|심리|사회|생명|화학|환경|수학)/.test(careerText)) {
        type = "bridge";
      }
    } else {
      const domain = String(axisLike?.axis_domain || axisLike?.axisDomain || "").toLowerCase();
      if ((/physics|engineering/.test(domain) || /물리|역학|기하|전자기/.test(axisText)) && /(기계|전자|전기|반도체|로봇|자동차|항공|공학|컴퓨터|소프트웨어|정보)/.test(careerText)) {
        type = "direct";
      } else if ((/chemistry/.test(domain) || /화학|물질|재료/.test(axisText)) && /(화학|신소재|재료|고분자|배터리|생명|바이오|제약|화공|식품)/.test(careerText)) {
        type = "direct";
      } else if ((/biology/.test(domain) || /생명|세포|건강/.test(axisText)) && /(생명|바이오|간호|의학|보건|수의|약학|임상)/.test(careerText)) {
        type = "direct";
      } else if ((/earth|environment/.test(domain) || /환경|기후|지구/.test(axisText)) && /(환경|기후|지구|에너지|해양|천문|우주)/.test(careerText)) {
        type = "direct";
      } else if ((/data|info|math/.test(domain) || /데이터|통계|정보|수리/.test(axisText)) && /(컴퓨터|소프트웨어|인공지능|데이터|정보|경영|경제|통계)/.test(careerText)) {
        type = "direct";
      } else if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|기계|공학|경영|경제|심리|사회|교육|디자인|환경|생명|간호|의학)/.test(careerText)) {
        type = "bridge";
      }
    }

    if (type === "direct") {
      return {
        type,
        label: "직접 연계 강함",
        score: 12,
        message: `${state.career}와 바로 이어지는 축입니다.`
      };
    }
    if (type === "bridge") {
      return {
        type,
        label: "역량 브리지",
        score: 6,
        message: `${state.career}와 직접 일치하지 않아도 역량 연결이 가능한 축입니다.`
      };
    }
    return {
      type: "general",
      label: "일반 탐구",
      score: 0,
      message: `${state.career}와 직접 매핑이 약해도 탐구 확장용으로 활용 가능한 축입니다.`
    };
  }


  function getAxisKeywordSignal(axis) {
    if (!axis || !Array.isArray(axis.keyword_signals) || !state.keyword) return null;
    const selectedKeyword = String(state.keyword || "").trim();
    const selectedTokens = selectedKeyword.split(/\s+/).filter(Boolean);
    let best = null;

    axis.keyword_signals.forEach(signal => {
      const keywords = Array.isArray(signal?.keywords) ? signal.keywords : [];
      let hit = false;
      let partialHits = 0;
      keywords.forEach(keyword => {
        if (!keyword) return;
        if (fuzzyIncludes(keyword, selectedKeyword) || fuzzyIncludes(selectedKeyword, keyword)) {
          hit = true;
          return;
        }
        const keywordTokens = String(keyword || '').split(/\s+/).filter(Boolean);
        if (keywordTokens.some(token => selectedTokens.some(sel => fuzzyIncludes(token, sel) || fuzzyIncludes(sel, token)))) {
          partialHits += 1;
        }
      });

      if (!hit && partialHits === 0) return;
      const signalScore = Number(signal?.boost || 0) + (hit ? 100 : partialHits * 10);
      if (!best || signalScore > best.__score) {
        best = { ...signal, __score: signalScore, __exactHit: hit, __partialHits: partialHits };
      }
    });

    return best;
  }

  function buildConceptMappedAxes(entry) {
    if (!entry || !Array.isArray(entry.longitudinal_axes)) return [];
    return entry.longitudinal_axes.map(axis => {
      const relationMeta = getAxisCareerRelationMeta(state.subject, axis);
      const keywordSignal = getAxisKeywordSignal(axis);
      const signalActivities = Array.isArray(keywordSignal?.activity_examples) ? keywordSignal.activity_examples : [];
      const mergedActivities = uniq([
        ...(axis.student_output_hint ? [axis.student_output_hint] : []),
        ...signalActivities
      ]);
      const mergedReason = [
        keywordSignal?.message || "",
        relationMeta.message || ""
      ].filter(Boolean).join(" ");
      return {
        id: axis.axis_id,
        title: axis.axis_title,
        short: keywordSignal?.short_label || axis.axis_short || entry.concept_label || state.concept,
        nextSubject: Array.isArray(axis.next_subjects) ? axis.next_subjects.join(" / ") : "",
        desc: keywordSignal?.desc || axis.why || "",
        reason: mergedReason || relationMeta.message,
        relationLabel: keywordSignal?.label || relationMeta.label,
        relationType: relationMeta.type,
        easy: mergedActivities[0] || axis.student_output_hint || "",
        axisDomain: axis.axis_domain || "",
        extensionKeywords: Array.isArray(keywordSignal?.keywords) ? keywordSignal.keywords : [],
        activityExamples: mergedActivities,
        linkedSubjects: Array.isArray(axis.next_subjects) ? axis.next_subjects : [],
        grade2NextSubjects: Array.isArray(axis.next_subjects) ? axis.next_subjects : [],
        recordContinuityPoint: `${state.subject}의 ${entry.concept_name} 개념을 다음 과목으로 연결하는 종단 확장 포인트`,
        isPrimary: Number(axis.priority || 99) === 1,
        __relationScore: relationMeta.score,
        __priority: Number(axis.priority || 99),
        __keywordSignalBoost: Number(keywordSignal?.boost || 0)
      };
    });
  }

  function getFollowupAxisCandidates() {
    if (!state.subject || !state.concept || !state.keyword) return [];

    const mappedEntry = getConceptLongitudinalEntry();
    if (mappedEntry) {
      const mappedAxes = buildConceptMappedAxes(mappedEntry).map(axis => {
        let score = 100 - (axis.__priority * 12);
        score += getCareerAxisBoost(axis);
        score += getMajorAxisBoost(axis);
        score += Number(axis.__relationScore || 0);
        score += Number(axis.__keywordSignalBoost || 0);
        return { ...axis, __score: score };
      });

      return mappedAxes
        .sort((a, b) => b.__score - a.__score || a.__priority - b.__priority || a.title.localeCompare(b.title, "ko"))
        .slice(0, 3);
    }

    const conceptBag = getConceptTextBag();
    const nextSubjects = getConceptDrivenNextSubjects();
    const seeds = getConceptDrivenAxisSeeds();

    const scored = seeds.map(seed => {
      let score = 0;
      if (seed.pattern.test(conceptBag)) score += 18;
      if (seed.linkedSubjects.some(subject => nextSubjects.some(next => fuzzyIncludes(subject, next)))) score += 16;
      score += getCareerAxisBoost(seed);
      score += getMajorAxisBoost(seed);
      const relationMeta = getAxisCareerRelationMeta(state.subject, seed);
      score += relationMeta.score;

      return {
        id: seed.id,
        title: seed.title,
        short: seed.short,
        nextSubject: seed.linkedSubjects.join(" / "),
        desc: `${state.concept} 개념을 바탕으로 ${seed.desc}`,
        reason: relationMeta.message,
        relationLabel: relationMeta.label,
        relationType: relationMeta.type,
        easy: seed.desc,
        axisDomain: seed.axisDomain,
        extensionKeywords: seed.extensionKeywords,
        activityExamples: seed.activityExamples,
        linkedSubjects: seed.linkedSubjects,
        grade2NextSubjects: seed.linkedSubjects,
        recordContinuityPoint: `${state.subject}의 ${state.concept} 개념을 다음 과목으로 연결하는 종단 확장 포인트`,
        isPrimary: score >= 26,
        __score: score
      };
    });

    const filtered = scored
      .filter(item => item.__score > 0)
      .sort((a, b) => b.__score - a.__score || a.title.localeCompare(b.title, "ko"));

    return filtered.slice(0, 3);
  }


function getSelectedFollowupAxisDetail(trackId) {
    if (!trackId) return null;
    return getFollowupAxisCandidates().find(item => item.id === trackId) || null;
  }


  function getTrackOptions() {
    const followupCandidates = getFollowupAxisCandidates();
    if (followupCandidates.length) return followupCandidates;

    const bucket = detectCareerBucket(state.career || "");
    const base = [
      { ...TRACK_HELP.physics, score: 4, axisDomain: "physics", linkedSubjects: ["물리", "역학과 에너지", "전자기와 양자"] },
      { ...TRACK_HELP.chemistry, score: 4, axisDomain: "chemistry", linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자"] },
      { ...TRACK_HELP.biology, score: 4, axisDomain: "biology", linkedSubjects: ["생명과학", "세포와 물질대사", "화학"] },
      { ...TRACK_HELP.earth, score: 4, axisDomain: "earth_env", linkedSubjects: ["지구과학", "지구시스템과학", "확률과 통계"] }
    ];

    base.forEach(item => {
      item.score += getCareerAxisBoost(item);
      if (bucket === "mechanical" && item.id === "physics") item.score += 6;
      if (bucket === "materials" && item.id === "chemistry") item.score += 6;
      if (bucket === "bio" && item.id === "biology") item.score += 6;
      if (bucket === "env" && item.id === "earth") item.score += 6;
    });

    return base
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item,
        nextSubject: (item.linkedSubjects || []).join(" / "),
        extensionKeywords: [],
        activityExamples: [],
        grade2NextSubjects: item.linkedSubjects || [],
        recordContinuityPoint: "현재 개념과 가장 가까운 후속 과목 방향",
        reason: getTrackReason(item)
      }));
  }


function getTrackMeta(trackId) {
    const followup = getSelectedFollowupAxisDetail(trackId);
    if (followup) return followup;
    return TRACK_HELP[trackId] || null;
  }

  function getConceptFriendlyLabel(concept) {
    const map = {
      "과학의 측정과 우리 사회": "센서·측정·데이터",
      "규칙성 발견과 주기율표": "원소·배열·예측",
      "기본량과 단위": "전류·시간·길이",
      "물질 구성과 분류": "재료·원소·구조",
      "자연 세계의 시간과 공간": "관측·규모·시공간",
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

  function getMajorGroupLabel() {
    return String(state.majorComparison?.group_label || "");
  }

  function getMajorTextBag() {
    return [
      state.majorSelectedName || "",
      ...(Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords : []),
      state.majorComparison?.group_label || "",
      state.majorComparison?.selected_focus || ""
    ].join(" ");
  }

  function getTrackReason(item) {
    const label = getMajorGroupLabel();
    const majorText = getMajorTextBag();
    if (/반도체|신소재|전자|소자/.test(majorText) && item.id === 'physics') return '반도체·소자 구조를 이해하기 쉬운 축';
    if (/반도체|신소재|전자|소자|재료|제약|화공|식품|고분자/.test(majorText) && item.id === 'chemistry') return '재료·반응·성질을 연결하기 쉬운 축';
    if (label.includes('환자 진료') && item.id === 'biology') return '인체 반응·건강 데이터를 연결하기 쉬운 축';
    if (label.includes('회복 지원') && item.id === 'biology') return '신체 기능 회복과 생명 반응을 설명하기 쉬운 축';
    if (label.includes('국제 이슈') && item.id === 'earth') return '환경·자원·지구 시스템 이슈와 연결하기 쉬운 축';
    if (label.includes('기업 운영') && item.id === 'chemistry') return '소재·제품·산업 사례를 붙이기 쉬운 축';
    if (label.includes('실험·기술 응용') && item.id === 'chemistry') return '실험·공정·응용 기술을 연결하기 쉬운 축';
    if (label.includes('기초 생명과학') && item.id === 'biology') return '생명 현상의 원리를 설명하기 쉬운 축';
    if (label.includes('의료기기') && item.id === 'physics') return '장비·센서·측정 원리를 설명하기 쉬운 축';
    if (label.includes('환경') && item.id === 'earth') return '환경·기후 변화를 바로 연결하기 쉬운 축';
    return item.easy || '';
  }

  function getPreferredConceptSequence() {
    const majorText = getMajorTextBag();
    const track = getResolvedTrackId() || '';

    if (/반도체|신소재|전자|소자|회로|센서|재료/.test(majorText)) {
      if (track === 'chemistry') return ['물질 구성과 분류', '규칙성 발견과 주기율표', '과학의 측정과 우리 사회', '기본량과 단위', '역학 시스템'];
      if (track === 'physics') return ['기본량과 단위', '과학의 측정과 우리 사회', '역학 시스템', '물질 구성과 분류', '규칙성 발견과 주기율표'];
    }

    if (/간호|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|재활|의학|의료/.test(majorText)) {
      if (track === 'biology') return ['생명 시스템', '과학의 측정과 우리 사회', '기본량과 단위', '물질 구성과 분류'];
      if (track === 'physics') return ['과학의 측정과 우리 사회', '기본량과 단위', '역학 시스템', '생명 시스템'];
      if (track === 'chemistry') return ['물질 구성과 분류', '과학의 측정과 우리 사회', '생명 시스템'];
    }

    if (/생명과학|바이오|제약|화공|식품|발효|미생물/.test(majorText)) {
      if (track === 'chemistry') return ['물질 구성과 분류', '규칙성 발견과 주기율표', '생명 시스템', '과학의 측정과 우리 사회'];
      if (track === 'biology') return ['생명 시스템', '물질 구성과 분류', '과학의 측정과 우리 사회'];
    }

    if (/국제|통상|무역|경영|관광|호텔/.test(majorText)) {
      if (track === 'earth') return ['지구시스템', '과학의 측정과 우리 사회', '기본량과 단위'];
      if (track === 'chemistry') return ['과학의 측정과 우리 사회', '물질 구성과 분류', '기본량과 단위'];
    }

    if (/환경|기후|지구|해양|천문|우주/.test(majorText)) {
      if (track === 'earth') return ['지구시스템', '자연 세계의 시간과 공간', '과학의 측정과 우리 사회'];
      if (track === 'chemistry') return ['과학의 측정과 우리 사회', '물질 구성과 분류', '지구시스템'];
    }

    return [];
  }

  function getPreferredKeywordSequence() {
    const majorText = getMajorTextBag();
    const track = getResolvedTrackId() || '';
    const concept = state.concept || '';
    if (/반도체|신소재|전자|소자|회로|센서|재료/.test(majorText)) {
      if (track === 'chemistry') {
        if (/물질 구성과 분류/.test(concept)) return ['원소', '원자', '분자', '이온', '물질 구성', '분류 기준', '금속', '비금속', '산화', '환원', '성질 비교'];
        if (/규칙성 발견과 주기율표/.test(concept)) return ['원자 번호', '주기율표', '원소 배열', '성질 예측', '금속', '비금속', '주기성', '족 구조', '규칙성'];
        if (/과학의 측정과 우리 사회/.test(concept)) return ['측정', '측정 표준', '정밀 측정', '센서', '디지털 데이터', '데이터 분석', '그래프 해석', '측정 도구', '오차', '단위', '수치 비교', '온도 센서'];
        return ['원소', '원자', '분자', '이온', '물질 구성', '분류 기준', '원자 번호', '주기율표', '원소 배열', '성질 예측', '재료 성질', '구조와 성질의 관계'];
      }
      if (track === 'physics') {
        if (/기본량과 단위|과학의 측정과 우리 사회/.test(concept)) return ['측정', '측정 표준', '정밀 측정', '센서', '전류', '전압', '시간', '길이', '질량', '단위', '디지털 정보', '데이터 분석'];
        return ['전류', '전압', '시간', '길이', '질량', '힘', '센서', '측정', '측정 표준', '정밀 측정', '디지털 정보', '구조 안정성'];
      }
    }
    if (/간호|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|재활|의학|의료/.test(majorText)) {
      if (track === 'biology') return ['생명 시스템', '항상성', '조절', '반응', '내부 환경 유지', '생체 데이터', '건강 측정'];
      if (track === 'physics') return ['측정', '센서', '측정 표준', '기본량', '유도량', '시간', '길이', '정밀 측정', '데이터 분석'];
    }
    if (/생명과학|바이오|제약|화공|식품|발효|미생물/.test(majorText)) {
      if (track === 'chemistry') {
        if (/물질 구성과 분류/.test(concept)) return ['원소', '분자', '이온', '물질 구성', '분류 기준', '구조와 성질의 관계', '재료 성질'];
        if (/규칙성 발견과 주기율표/.test(concept)) return ['원자 번호', '주기율표', '원소 배열', '성질 예측', '주기성', '족 구조'];
        return ['원소', '분자', '이온', '물질 구성', '분류 기준', '재료 성질', '구조와 성질의 관계'];
      }
      if (track === 'biology') return ['생명 시스템', '항상성', '조절', '반응', '생체 데이터'];
    }
    return [];
  }

  function getKeywordPriority(keyword, entry) {
    const majorText = getMajorTextBag();
    const track = getResolvedTrackId() || '';
    const concept = state.concept || '';
    const text = `${keyword} ${(entry?.unit || '')} ${concept}`;
    let score = 0;

    if (/반도체|신소재|전자|소자|회로|센서|재료/.test(majorText)) {
      if (track === 'chemistry' && /과학의 측정과 우리 사회/.test(concept)) {
        if (/측정|센서|표준|정밀|단위|데이터|그래프|오차|전자저울|온도|수치/.test(text)) score += 28;
        if (/미세먼지|데시벨|소음|난방|규제|실린더|부피 읽기/.test(text)) score -= 28;
      }
      if (track === 'chemistry' && /규칙성 발견과 주기율표/.test(concept)) {
        if (/원자 번호|주기율표|원소 배열|성질 예측|금속|비금속|족|주기성|규칙성/.test(text)) score += 24;
        if (/멘델레예프|과학사|표 구성|모델 형성/.test(text)) score += 8;
      }
      if (track === 'chemistry' && /물질 구성과 분류/.test(concept)) {
        if (/원소|원자|분자|이온|물질 구성|분류 기준|금속|비금속|산화|환원|성질 비교/.test(text)) score += 24;
      }
      if (track === 'physics' && /기본량과 단위|과학의 측정과 우리 사회/.test(concept)) {
        if (/측정|센서|전류|전압|정밀|표준|단위|데이터|그래프|오차/.test(text)) score += 24;
        if (/미세먼지|데시벨|소음|난방/.test(text)) score -= 20;
      }
    }

    if (/간호|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|재활|의학|의료/.test(majorText)) {
      if (track === 'physics' && /과학의 측정과 우리 사회|기본량과 단위/.test(concept)) {
        if (/측정|센서|표준|데이터|정밀|기본량|유도량/.test(text)) score += 18;
        if (/데시벨|난방|미세먼지/.test(text)) score -= 12;
      }
      if (track === 'biology' && /생명 시스템/.test(concept)) {
        if (/항상성|조절|반응|내부 환경|생체 데이터|건강/.test(text)) score += 18;
      }
    }

    if (/생명과학|바이오|제약|화공|식품|발효|미생물/.test(majorText)) {
      if (track === 'chemistry' && /물질 구성과 분류|규칙성 발견과 주기율표/.test(concept)) {
        if (/원소|분자|이온|주기율표|원자 번호|구조와 성질|재료 성질/.test(text)) score += 18;
      }
      if (track === 'biology' && /생명 시스템/.test(concept)) {
        if (/항상성|조절|반응|생체 데이터|세포/.test(text)) score += 18;
      }
    }

    return score;
  }

  function getAutoTrackDetail() {
    const options = getTrackOptions();
    return options[0] || null;
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
    const effectiveCareer = [
      state.career || "",
      state.majorSelectedName || "",
      ...(Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords : []),
      state.majorComparison?.group_label || "",
      state.majorComparison?.selected_focus || ""
    ].join(" ").trim();
    const bucket = detectCareerBucket(effectiveCareer);
    const track = getResolvedTrackId() || "";
    const majorText = getMajorTextBag();
    const preferred = getPreferredConceptSequence();
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
    const scaleStrong = /(시간 규모|공간 규모|미시 세계|거시 세계|관측 범위 확장|정밀 측정)/.test(textBag);

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
      if (scaleStrong && !hasChem && !hasElec && !hasMech) score -= 16;
    }
    if (bucket === "mechanical") {
      if (hasMech) { score += 16; reasons.push("진로 연결"); }
      if (hasBio && !hasMech) score -= 28;
      if (scaleStrong && !hasMech) score -= 10;
    }
    if (bucket === "electronic" || bucket === "it") {
      if (hasElec || hasData) { score += 15; reasons.push("진로 연결"); }
      if (hasBio && !hasElec && !hasData) score -= 22;
      if (scaleStrong && !hasElec && !hasData) score -= 10;
    }
    if (bucket === "bio") {
      if (hasBio) { score += 16; reasons.push("진로 연결"); }
      if (hasMech && !hasBio) score -= 10;
    }
    if (bucket === "env") {
      if (hasEnv) { score += 16; reasons.push("진로 연결"); }
      if (scaleStrong) score += 8;
    }

    if (track === "physics") {
      if (hasMech || hasElec || hasData) { score += 14; reasons.push("물리 연계 추천"); }
      if (hasBio && !hasMech) score -= 12;
      if (/반도체|신소재|전자|소자/.test(majorText) && /기본량과 단위|과학의 측정과 우리 사회|역학 시스템/.test(concept)) score += 18;
      if (/반도체|신소재|전자|소자/.test(majorText) && /자연 세계의 시간과 공간/.test(concept)) score -= 18;
    }
    if (track === "chemistry") {
      if (hasChem) { score += 14; reasons.push("화학 연계 추천"); }
      if (hasBio && !hasChem) score -= 10;
      if (/반도체|신소재|전자|소자|재료/.test(majorText) && /물질 구성과 분류|규칙성 발견과 주기율표|과학의 측정과 우리 사회/.test(concept)) score += 18;
      if (/반도체|신소재|전자|소자|재료/.test(majorText) && /자연 세계의 시간과 공간|생명 시스템/.test(concept)) score -= 18;
      if (/제약|화공|식품|발효|미생물/.test(majorText) && /물질 구성과 분류|규칙성 발견과 주기율표|생명 시스템/.test(concept)) score += 10;
    }
    if (track === "biology") {
      if (hasBio) { score += 14; reasons.push("생명과학 연계 추천"); }
      if ((hasMech || hasChem) && !hasBio) score -= 8;
      if (/간호|보건관리|임상병리|의학|의료|생명|바이오/.test(majorText) && /생명 시스템|과학의 측정과 우리 사회/.test(concept)) score += 12;
    }
    if (track === "earth") {
      if (hasEnv) { score += 22; reasons.push("지구과학 연계 추천"); }
      if (hasBio && !hasEnv) score -= 18;
      if (hasChem && !hasEnv) score -= 10;
      if (hasMech && !hasEnv) score -= 8;
      if (/국제|환경|기후|지구|우주/.test(majorText) && /지구시스템|자연 세계의 시간과 공간|과학의 측정과 우리 사회/.test(concept)) score += 12;
    }

    if ((entry?.linked_career_bridge || []).some(v => fuzzyIncludes(v, effectiveCareer))) {
      score += 10;
      reasons.push("진로 브리지 일치");
    }

    const majorHintPairs = [
      { pattern: /(컴퓨터|소프트웨어|데이터|AI|인공지능|정보|통계|코딩|알고리즘)/i, concept: /(자료|데이터|정보|분석|표현|그래프|확률|경우의 수|행렬|측정|단위|빅데이터|자동화|시스템)/ },
      { pattern: /(전자|전기|반도체|회로|센서|통신|로봇|메카트로닉스)/, concept: /(측정|단위|역학|전기|전자기|센서|시스템|파동|신호|양자|에너지|회로|시간과 공간)/ },
      { pattern: /(기계|자동차|항공|모빌리티|기구|설계|제어)/, concept: /(운동|힘|역학|에너지|구조|정사영|도형의 이동|물리|측정|효율|시뮬레이션)/ },
      { pattern: /(화학공학|화학|신소재|재료|고분자|금속|배터리|에너지공학)/, concept: /(물질|원자|주기율|결합|산화|염기|에너지|신재생|반응|소재|전지)/ },
      { pattern: /(생명|바이오|의학|의료|간호|보건|제약|약학|수의|임상)/, concept: /(생명|세포|항상성|건강|면역|유전자|산과 염기|대사|효소|백신|물질 이동)/ },
      { pattern: /(환경|기후|지구|해양|우주|천문|지리)/, concept: /(환경|기후|지구|해양|천체|우주|지구시스템|생태|순환|관측|미세먼지|에너지 효율)/ },
      { pattern: /(경영|경제|무역|국제|행정|사회|정책|미디어|언론|광고)/, concept: /(데이터|사회|빅데이터|과학 기술|윤리|시장|금융|지속가능|문화|토론|글쓰기|매체)/ }
    ];
    majorHintPairs.forEach(rule => {
      if (rule.pattern.test(effectiveCareer) && rule.concept.test(textBag)) {
        score += 14;
        reasons.push("학과 맞춤 추천");
      }
    });

    const prefIndex = preferred.indexOf(concept);
    if (prefIndex >= 0) {
      score += 30 - (prefIndex * 4);
      reasons.unshift("전공 맞춤 추천");
    }

    const profile = topicMatrix?.careerProfiles?.[getCareerProfileKey(effectiveCareer)];
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
    const preferred = getPreferredConceptSequence();
    const topScore = ranked[0]?.score ?? 0;
    const hasMajorSelection = !!(state.majorSelectedName || state.career);
    let filtered = ranked.filter(item => item.score >= topScore - (hasMajorSelection ? 18 : 12) && item.score > -24);

    if (preferred.length) {
      const preferredItems = preferred.map(name => filtered.find(item => item.concept === name)).filter(Boolean);
      const others = filtered.filter(item => !preferred.includes(item.concept));
      filtered = [...preferredItems, ...others];
    }

    if (state.linkTrack === "earth") {
      const envFirst = filtered.filter(item => /(지구|천체|대기|수권|우주|기후|관측)/.test(item.concept + ' ' + ((item.value?.core_concepts || []).join(' ')) + ' ' + ((item.value?.micro_keywords || []).join(' '))));
      const others = filtered.filter(item => !envFirst.includes(item));
      filtered = [...envFirst, ...others];
    }

    if (filtered.length < 3) {
      const fallback = preferred.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !fallback.includes(item));
      filtered = [...fallback, ...others];
    }

    // 학생 화면은 전체 개념을 다 보여주기보다, 과목+학과 기준 추천 개념 3개만 먼저 보여준다.
    // 데이터는 전체를 유지하되, UI는 선택하기 쉬운 상위 3개만 노출한다.
    return uniq(filtered).slice(0, 3);
  }

  function getConceptEntry() {
    if (!state.subject || !state.concept) return null;
    return engineMap?.[state.subject]?.concepts?.[state.concept] || null;
  }

  function getKeywordList(entry) {
    const base = uniq([...(entry?.micro_keywords || []), ...(entry?.core_concepts || [])]);
    const preferred = getPreferredKeywordSequence();
    const preferredIndex = new Map(preferred.map((item, idx) => [item, idx]));
    return base
      .map((keyword, index) => ({
        keyword,
        index,
        preferredScore: preferredIndex.has(keyword) ? (1000 - preferredIndex.get(keyword) * 10) : 0,
        customScore: getKeywordPriority(keyword, entry)
      }))
      .sort((a, b) => (b.preferredScore + b.customScore) - (a.preferredScore + a.customScore) || a.index - b.index)
      .map(item => item.keyword);
  }

  function isStepEnabled(step) {
    if (step === 1) return true;
    if (step === 2) return !!state.subject;
    if (step === 3) return !!state.subject;
    if (step === 4) return isStepEnabled(3) && !!state.concept && !!state.keyword;
    if (step === 5) return isStepEnabled(4) && !!state.linkTrack;
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

    let progress = "교과 개념 선택 대기";
    if (state.subject && !state.concept) progress = "교과 개념 선택 중";
    if (state.concept && !state.keyword) progress = "핵심 키워드 선택 중";
    if (state.keyword && !state.linkTrack) progress = "후속 연계축 선택 중";
    if (state.linkTrack && !state.selectedBook) progress = "도서 선택 대기";
    if (state.selectedBook && !state.reportMode) progress = "보고서 방식 선택 대기";
    if (state.reportMode && !state.reportView) progress = "보고서 관점 선택 대기";
    if (state.reportView && !state.reportLine) progress = "보고서 라인 선택 대기";
    if (state.reportLine) progress = "MINI 전달 데이터 준비 완료";
    if (progressEl) progressEl.textContent = progress;
  }

  function renderTrackArea() {
    const el = $("engineTrackArea");
    if (!el) return;
    if (!isStepEnabled(4)) {
      el.innerHTML = `<div class="engine-empty">먼저 현재 과목에서 출발할 교과 개념과 핵심 키워드를 고르면, 그 개념이 이어지는 후속 과목 축이 열립니다.</div>`;
      return;
    }
    const options = getTrackOptions();
    if (!options.length) {
      el.innerHTML = `<div class="engine-empty">현재 선택한 교과 개념과 키워드에 연결된 후속 과목 축이 아직 준비되지 않았습니다.</div>`;
      return;
    }
    const recommended = options[0];
    const autoHint = recommended?.reason || recommended?.easy || '';
    const guide = state.career
      ? `먼저 <strong>${escapeHtml(state.concept || '현재 교과 개념')}</strong>이 어디로 이어지는지 보고, <strong>${escapeHtml(state.career)}</strong> 입력은 그 축의 우선순위만 조정합니다.`
      : `지금은 <strong>${escapeHtml(state.concept || '현재 교과 개념')}</strong>에서 갈 수 있는 종단 연결을 먼저 펼쳐 보여줍니다. 학과를 입력하면 이 축들의 우선순위가 바뀝니다.`;
    el.innerHTML = `
      <div class="engine-help">${guide}</div>
      ${autoHint ? `<div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:700;">${escapeHtml(autoHint)}</div>` : ''}
      <div class="engine-track-grid">${options.map((item, index) => `
        <button type="button" class="engine-track-card ${state.linkTrack === item.id ? "is-active" : ""}" data-track="${escapeHtml(item.id)}">
          <div class="engine-track-top">
            <div class="engine-track-title">${escapeHtml(item.title)} ${index === 0 ? '<span class="engine-mini-tag" style="margin-left:6px;">1순위</span>' : ''} ${item.relationLabel ? `<span class="engine-mini-tag" style="margin-left:6px;">${escapeHtml(item.relationLabel)}</span>` : ''}</div>
            <div class="engine-track-short">${escapeHtml(item.short)}</div>
          </div>
          <div class="engine-track-next">연결 과목: ${escapeHtml(item.nextSubject || "-")}</div>
          <div class="engine-track-desc">${escapeHtml(item.desc || "")}</div>
          ${Array.isArray(item.activityExamples) && item.activityExamples.length ? `<div class="engine-track-desc" style="margin-top:6px;">활동 예시: ${escapeHtml(item.activityExamples.slice(0,2).join(', '))}</div>` : ''}
          <div class="engine-track-desc" style="margin-top:6px; color:#275fe8; font-weight:700;">${escapeHtml(item.reason || item.easy || "")}</div>
        </button>
      `).join("")}</div>
      <div class="engine-auto-row">
        <button type="button" class="engine-auto-btn" data-action="auto-track">잘 모르겠어요 → 대표 종단축 자동 선택</button>
      </div>
    `;
  }

  function renderConceptArea() {
    const conceptWrap = $("engineConceptCards");
    const keywordWrap = $("engineKeywordButtons");
    if (!conceptWrap || !keywordWrap) return;

    if (!isStepEnabled(3)) {
      conceptWrap.innerHTML = `<div class="engine-empty">먼저 과목을 선택해야 추천 교과 개념이 열립니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">교과 개념을 먼저 고르면 해당 개념의 핵심 키워드가 열립니다.</div>`;
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
      keywordWrap.innerHTML = `<div class="engine-empty">왼쪽에서 교과 개념을 먼저 고르면 해당 개념의 키워드가 열립니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);
    if (!keywords.length) {
      keywordWrap.innerHTML = `<div class="engine-empty">이 개념에 연결된 키워드가 없습니다.</div>`;
      return;
    }

    keywordWrap.innerHTML = `
      <div class="engine-help">선택 개념: <strong>${escapeHtml(state.concept)}</strong> · 아래 키워드를 고르면 그 개념이 이어질 후속 과목 축이 열립니다.</div>
      <div class="engine-chip-wrap">${keywords.map(keyword => `
        <button type="button" class="engine-chip ${state.keyword === keyword ? "is-active" : ""}" data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
      `).join("")}</div>
    `;
  }

  function renderBookArea() {
    const el = $("engineBookArea");
    if (!el) return;
    if (!isStepEnabled(5)) {
      el.innerHTML = `<div class="engine-empty">먼저 교과 개념 기반 후속 연계축을 선택해야 도서 추천이 열립니다.</div>`;
      return;
    }
    if (!window.renderBookSelectionHTML) {
      el.innerHTML = `<div class="engine-empty">도서 추천 기능을 불러오는 중입니다.</div>`;
      return;
    }
    el.innerHTML = window.renderBookSelectionHTML({
      subject: state.subject,
      career: state.career,
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      followupAxisTitle: getTrackMeta(state.linkTrack)?.title || "",
      followupAxisDomain: getTrackMeta(state.linkTrack)?.axisDomain || "",
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    });
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
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      followupAxisTitle: getTrackMeta(state.linkTrack)?.title || "",
      followupAxisDomain: getTrackMeta(state.linkTrack)?.axisDomain || "",
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
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      followupAxisTitle: getTrackMeta(state.linkTrack)?.title || "",
      followupAxisDomain: getTrackMeta(state.linkTrack)?.axisDomain || "",
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

  function getReportLineMeta() {
    return window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook,
      reportMode: state.reportMode,
      grade: ($("grade")?.value || "").trim()
    }) : { reportLines: [], recommendedLine: "" };
  }

  function getRecommendedReportLine() {
    const meta = getReportLineMeta();
    const reportLines = meta.reportLines || [];
    const recommended = meta.recommendedLine || "";
    const lineMap = { "기본형": "basic", "확장형": "standard", "심화형": "advanced", basic: "basic", standard: "standard", advanced: "advanced" };
    if (recommended && lineMap[recommended]) return lineMap[recommended];

    const grade = ($("grade")?.value || "").trim();
    const taskType = ($("taskType")?.value || "").trim();
    if (state.reportMode === "major") return reportLines.includes("심화형") ? "advanced" : "advanced";
    if (grade === "고3") return reportLines.includes("심화형") ? "advanced" : "advanced";
    if (grade === "고2" && ["data","compare","application"].includes(state.reportMode)) return reportLines.includes("확장형") ? "standard" : "standard";
    if (taskType.includes("실험") || taskType.includes("발표") || ["data","compare","application"].includes(state.reportMode)) return reportLines.includes("확장형") ? "standard" : "standard";
    if (grade === "고2") return reportLines.includes("확장형") ? "standard" : "standard";
    return reportLines.includes("기본형") ? "basic" : "basic";
  }

  function renderReportLineArea() {
    const el = $("engineLineArea");
    if (!el) return;
    if (!isStepEnabled(8)) {
      el.innerHTML = `<div class="engine-empty">먼저 보고서 관점을 선택해야 보고서 라인이 열립니다.</div>`;
      return;
    }
    const meta = getReportLineMeta();
    const allowedLabels = meta.reportLines || [];
    const labelToId = { "기본형": "basic", "확장형": "standard", "심화형": "advanced", basic: "basic", standard: "standard", advanced: "advanced" };
    const allowedIds = allowedLabels.map(label => labelToId[label]).filter(Boolean);
    if (!state.reportLine) {
      state.reportLine = getRecommendedReportLine();
    }
    const entries = (allowedIds.length ? Object.values(REPORT_LINE_HELP).filter(item => allowedIds.includes(item.id)) : Object.values(REPORT_LINE_HELP));
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
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      followupAxisTitle: getTrackMeta(state.linkTrack)?.title || "",
      followupAxisDomain: getTrackMeta(state.linkTrack)?.axisDomain || "",
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
      학과: ${escapeHtml(payload.student_context.career || "-")}<br>
      활용 영역: ${escapeHtml(payload.activity_context.activity_area || "-")}<br>
      최종 결과물: ${escapeHtml(payload.activity_context.output_goal || "-")}<br>
      기본 결과물: ${escapeHtml(payload.task_context.task_type || "-")}<br>
      연계 축: ${escapeHtml(payload.track_context.label || "-")}<br>
      축 도메인: ${escapeHtml(payload.track_context.axis_domain || payload.track_context.legacy_track || "-")}<br>
      종단 포인트: ${escapeHtml(payload.track_context.record_continuity_point || "-")}<br>
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
    if (keywordInput) {
      if (state.keyword) {
        keywordInput.value = state.keyword || "";
      } else {
        renderCareerKeywordPreview();
      }
    }
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
        next_subject: getTrackMeta(state.linkTrack)?.nextSubject || "",
        legacy_track: getResolvedTrackId() || "",
        axis_domain: getTrackMeta(state.linkTrack)?.axisDomain || "",
        extension_keywords: getTrackMeta(state.linkTrack)?.extensionKeywords || [],
        activity_examples: getTrackMeta(state.linkTrack)?.activityExamples || [],
        record_continuity_point: getTrackMeta(state.linkTrack)?.recordContinuityPoint || ""
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
