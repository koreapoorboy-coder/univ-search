
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

function buildFallback(keyword) {
  const item = libraryData[keyword] || {};
  const related = item.related_keywords || [];
  const subjectText = (item.related_subjects || []).join(", ");
  return {
    keyword,
    topic: `${keyword} 관련 탐구 설계`,
    directions: related.length > 0 ? related.map(v => `${v}와 연결해 탐구 방향을 확장할 수 있습니다.`) : [`${keyword}의 개념과 사례를 조사하고 탐구 방향을 정리합니다.`],
    flow: "개념 이해 → 사례 조사 → 비교 또는 데이터 분석 → 결론 정리",
    resultExamples: ["탐구 보고서", "발표 자료", "비교표 또는 그래프"],
    recordSentence: `${keyword}의 핵심 개념을 이해하고${subjectText ? ` ${subjectText} 교과와 연결하여` : ""} 관련 사례를 조사·분석함.`,
    patternGuide: []
  };
}

function buildActivity(keyword) {
  const item = mappingData[keyword];
  if (!item) return buildFallback(keyword);

  const sub = (item.sub_keywords && item.sub_keywords[0]) ? item.sub_keywords[0] : "핵심 기술";
  const template = (item.topic_templates && item.topic_templates[0]) ? item.topic_templates[0] : `${keyword} 관련 탐구`;
  const topic = template.replaceAll("{sub}", sub).replaceAll("{keyword}", keyword);
  const directions = item.record_sentences || [];
  const flow = item.activity_flow || "개념 이해 → 사례 조사 → 분석 → 결론 정리";
  const resultExamples = item.result_examples || ["탐구 보고서", "발표 자료"];
  const recordSentence = directions.length ? directions.join(" ") : `${keyword}에 관한 탐구를 수행함.`;
  const patternGuide = (item.patterns || []).map(name => ({ pattern: name, guide: `${name} 구조로 탐구를 설계합니다.` }));

  return { keyword, topic, directions, flow, resultExamples, recordSentence, patternGuide };
}

function renderResult(model) {
  document.getElementById("resultWrap").hidden = false;
  document.getElementById("summaryKeyword").textContent = model.keyword;
  document.getElementById("summaryTitle").textContent = model.topic;
  document.getElementById("summarySentence").textContent = model.recordSentence;

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
    const box = document.createElement("div");
    box.className = "pattern-item";
    box.innerHTML = `<strong>${item.pattern}</strong><span>${item.guide}</span>`;
    patternGuide.appendChild(box);
  });
}

function setStatus(message = "", visible = false) {
  const box = document.getElementById("statusBox");
  box.hidden = !visible;
  box.textContent = message;
}

function runSearch(raw) {
  const keyword = normalizeKeyword(raw);
  if (!keyword) {
    setStatus("키워드를 입력해 주세요.", true);
    document.getElementById("resultWrap").hidden = true;
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
      document.getElementById("searchInput").value = btn.dataset.keyword || "";
      runSearch(btn.dataset.keyword || "");
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
