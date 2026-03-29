
const REF_BASE = "./reference";
const DATA_BASE = "./data";

let mappingData = {};
let libraryData = {};
let aliasData = {};

async function loadJsonSafe(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    return {};
  }
}

async function bootstrap() {
  [mappingData, libraryData, aliasData] = await Promise.all([
    loadJsonSafe(`${REF_BASE}/keyword_mapping_examples.json`),
    loadJsonSafe(`${DATA_BASE}/keyword_library.json`),
    loadJsonSafe(`${DATA_BASE}/keyword_alias.json`)
  ]);
  bindEvents();
}

function normalizeKeyword(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  return aliasData[value] || value;
}

function patternGuideText(name) {
  const guides = {
    "원리 탐구형": "핵심 개념과 작동 원리를 이해하고 실제 사례와 연결하는 방식으로 탐구를 설계합니다.",
    "비교 분석형": "두 기술·소재·방식을 기준을 세워 비교하고 차이를 해석하는 방식으로 설계합니다.",
    "데이터 분석형": "수치 자료를 정리하고 변수별 패턴과 의미를 해석하는 구조로 탐구를 구성합니다.",
    "설계/구현형": "이론을 장치·코드·센서·모형 설계 및 구현 활동으로 확장하는 흐름입니다.",
    "문제 해결형": "발생한 문제를 분석하고 실행 가능한 개선 방향이나 해결 방안을 제시하는 구조입니다.",
    "확장/후속연구형": "현재 탐구의 한계를 검토하고 차세대 기술·응용 방향까지 확장하는 구조입니다."
  };
  return guides[name] || "탐구 방향을 구조적으로 정리하는 패턴입니다.";
}

function buildFallback(keyword) {
  const item = libraryData[keyword] || {};
  const related = item.related_keywords || [];
  const subjectText = (item.related_subjects || []).join(", ");

  return {
    keyword,
    topic: `${keyword} 관련 탐구 설계`,
    summary: `${keyword}는${subjectText ? ` ${subjectText} 교과와 연결해` : ""} 탐구 방향을 설계할 수 있는 주제입니다.`,
    directions: related.length > 0
      ? related.map(v => `${v}와 연결해 탐구 방향을 확장할 수 있습니다.`)
      : [`${keyword}의 개념과 사례를 조사하고 탐구 방향을 정리합니다.`],
    flow: "개념 이해 → 사례 조사 → 비교 또는 데이터 분석 → 결론 정리",
    resultExamples: ["탐구 보고서", "발표 자료", "비교표 또는 그래프"],
    recordSentence: `${keyword}의 핵심 개념을 이해하고${subjectText ? ` ${subjectText} 교과와 연결하여` : ""} 관련 사례를 조사·분석함.`,
    patternGuide: [{ pattern: "기본 탐구형", guide: "개념 이해와 사례 분석을 중심으로 탐구를 설계합니다." }]
  };
}

function buildActivity(keyword) {
  const item = mappingData[keyword];
  if (!item) return buildFallback(keyword);

  const sub = item.sub_keywords?.[0] || "핵심 기술";
  const template = item.topic_templates?.[0] || `${keyword} 관련 탐구`;
  const topic = template.replaceAll("{sub}", sub).replaceAll("{keyword}", keyword);

  return {
    keyword,
    topic,
    summary: item.summary || `${keyword} 관련 탐구를 설계합니다.`,
    directions: item.directions || [],
    flow: item.activity_flow || "개념 이해 → 사례 조사 → 분석 → 결론 정리",
    resultExamples: item.result_examples || ["탐구 보고서", "발표 자료"],
    recordSentence: item.record_sentence || `${keyword} 관련 탐구를 수행함.`,
    patternGuide: (item.patterns || []).map(name => ({ pattern: name, guide: patternGuideText(name) }))
  };
}

function setStatus(message = "", visible = false) {
  const box = document.getElementById("statusBox");
  box.hidden = !visible;
  box.textContent = message;
}

function renderResult(model) {
  document.getElementById("resultWrap").hidden = false;
  document.getElementById("summaryKeyword").textContent = model.keyword;
  document.getElementById("summaryTitle").textContent = model.topic;
  document.getElementById("summarySentence").textContent = model.summary;

  const directionList = document.getElementById("directionList");
  directionList.innerHTML = "";
  model.directions.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    directionList.appendChild(li);
  });

  document.getElementById("flowText").textContent = model.flow;

  const resultExampleList = document.getElementById("resultExampleList");
  resultExampleList.innerHTML = "";
  model.resultExamples.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    resultExampleList.appendChild(li);
  });

  document.getElementById("recordSentence").textContent = model.recordSentence;

  const patternGuide = document.getElementById("patternGuide");
  patternGuide.innerHTML = "";
  (model.patternGuide || []).forEach(item => {
    const el = document.createElement("div");
    el.className = "pattern-item";
    el.innerHTML = `<strong>${item.pattern}</strong><span>${item.guide}</span>`;
    patternGuide.appendChild(el);
  });
}

function runSearch(rawKeyword) {
  const keyword = normalizeKeyword(rawKeyword);
  if (!keyword) {
    document.getElementById("resultWrap").hidden = true;
    setStatus("키워드를 입력해 주세요.", true);
    return;
  }
  setStatus("", false);
  const model = buildActivity(keyword);
  renderResult(model);
}

function bindEvents() {
  document.getElementById("searchBtn").addEventListener("click", () => {
    runSearch(document.getElementById("searchInput").value);
  });

  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch(e.target.value);
  });

  document.querySelectorAll(".quick-keyword").forEach(btn => {
    btn.addEventListener("click", () => {
      const keyword = btn.dataset.keyword || "";
      document.getElementById("searchInput").value = keyword;
      runSearch(keyword);
    });
  });

  document.getElementById("copySentenceBtn").addEventListener("click", async () => {
    const text = document.getElementById("recordSentence").textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      setStatus("생활기록부 문장을 복사했습니다.", true);
    } catch (err) {
      setStatus("복사에 실패했습니다. 직접 선택해서 복사해 주세요.", true);
    }
  });
}

bootstrap();
