
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
    "원리 탐구형": "핵심 개념과 작동 원리를 먼저 분명히 잡고, 실제 사례와 연결해 설명력을 높이는 방식이다.",
    "비교 분석형": "두 기술·소재·방식을 같은 기준으로 놓고 차이를 해석해 탐구의 논리 구조를 선명하게 만드는 방식이다.",
    "데이터 분석형": "수치 자료를 정리하고 변수별 패턴을 해석해 근거 중심의 결론을 도출하는 구조다.",
    "설계/구현형": "이론을 장치·코드·센서·모형 활동으로 연결해 수행 경험을 드러내는 흐름이다.",
    "문제 해결형": "현실 문제를 발견하고 개선 방향이나 해결 방안을 설계해 탐구의 실천성을 높이는 구조다.",
    "확장/후속연구형": "현재 탐구의 한계를 검토하고 차세대 기술·응용 방향까지 이어 주제를 한 단계 끌어올리는 방식이다."
  };
  return guides[name] || "탐구 방향을 구조적으로 정리하는 패턴이다.";
}

function buildFallback(keyword) {
  const item = libraryData[keyword] || {};
  const related = item.related_keywords || [];
  const subjectText = (item.related_subjects || []).join(", ");
  const directions = related.length > 0
      ? related.slice(0, 3).map((v, idx) => `${idx + 1}. ${v}와 연결해 탐구 방향을 구체화합니다.`)
      : ["1. 핵심 개념을 정리합니다.", "2. 사례를 조사합니다.", "3. 결과를 정리합니다."];
  return {
    keyword,
    topic: `${keyword} 관련 탐구 설계`,
    summary: `${keyword}는${subjectText ? ` ${subjectText} 교과와 연결해` : ""} 탐구 주제를 설계할 수 있는 키워드다.`,
    directions,
    flow: "개념 이해 → 사례 조사 → 비교 또는 데이터 분석 → 결론 정리",
    resultExamples: ["탐구 보고서", "발표 자료", "비교표 또는 그래프"],
    recordSentence: `${keyword}의 핵심 개념을 이해하고${subjectText ? ` ${subjectText} 교과와 연결하여` : ""} 관련 사례를 조사·분석함.`,
    patternGuide: [{ pattern: "기본 탐구형", guide: "개념 이해와 사례 분석을 중심으로 탐구를 설계한다." }]
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
    summary: item.summary || `${keyword} 관련 탐구를 설계한다.`,
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
