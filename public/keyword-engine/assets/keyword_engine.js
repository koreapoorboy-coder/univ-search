
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
    summary: `${keyword}는${subjectText ? ` ${subjectText} 교과와 연결해` : ""} 탐구 주제를 설계할 수 있는 키워드다.`,
    directions: [
      "핵심 개념을 먼저 정리합니다.",
      "관련 사례를 조사합니다.",
      "비교하거나 분석할 기준을 세웁니다.",
      "결과를 정리하고 확장 방향을 붙입니다."
    ],
    flow: "개념 이해 → 사례 조사 → 비교 또는 데이터 분석 → 결론 정리",
    executionSteps: related.length > 0
      ? [
          `${related[0]}와 연결해 첫 번째 탐구 축을 잡습니다.`,
          related[1] ? `${related[1]}를 붙여 비교 또는 분석 방향을 만듭니다.` : "비교 또는 분석 기준을 추가합니다.",
          "근거 자료를 정리해 발표 또는 보고서 형태로 마무리합니다."
        ]
      : [
          "핵심 개념 1개를 먼저 정리합니다.",
          "사례 1~2개를 조사해 탐구 축을 잡습니다.",
          "비교·분석·해결 중 하나로 방향을 정해 마무리합니다."
        ],
    extensions: [
      "같은 키워드를 다른 교과와 연결해보면 확장성이 높아집니다.",
      "비교 대상이나 실제 사례가 들어가면 탐구 완성도가 올라갑니다."
    ]
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
    executionSteps: buildExecutionSteps(keyword, item),
    extensions: buildExtensions(keyword, item)
  };
}

function buildExecutionSteps(keyword, item) {
  const map = {
    "이차전지": [
      "충·방전 원리를 먼저 개념 수준에서 정리합니다.",
      "전고체 배터리와 비교해 구조·성능 차이를 잡습니다.",
      "폐배터리 재활용 공정을 붙여 문제 해결 관점으로 확장합니다.",
      "에너지 저장 시스템까지 연결해 공학적 확장성을 마무리합니다."
    ],
    "반도체": [
      "도핑과 밴드 구조를 중심으로 작동 원리를 정리합니다.",
      "전력반도체와 일반 반도체의 역할 차이를 비교합니다.",
      "정밀 공정 사례를 붙여 실제 산업 문제와 연결합니다."
    ],
    "인공지능": [
      "머신러닝과 딥러닝 차이를 데이터 처리 방식 중심으로 정리합니다.",
      "실제 활용 사례 1개를 골라 문제 해결 구조를 분석합니다.",
      "할루시네이션이나 편향 문제를 붙여 한계까지 검토합니다."
    ],
    "미세먼지": [
      "시간대·계절·풍속 조건 중 비교 기준을 하나 정합니다.",
      "데이터를 수집하거나 실제 센서 측정값을 확보합니다.",
      "변화 패턴을 분석한 뒤 저감 방안을 붙입니다."
    ],
    "스마트팜": [
      "센서와 자동 제어 구조를 먼저 이해합니다.",
      "생육 데이터나 환경 변화 데이터를 연결합니다.",
      "아두이노 등 구현 요소를 붙여 실제 수행형 탐구로 만듭니다."
    ],
    "자율주행": [
      "센서 데이터가 어떻게 판단 구조로 들어가는지 먼저 이해합니다.",
      "통계나 확률 개념을 붙여 사고 회피 구조를 해석합니다.",
      "안전성과 책임 문제까지 연결해 융합형 주제로 확장합니다."
    ],
    "유전자": [
      "DNA 구조와 유전자 발현 원리를 먼저 정리합니다.",
      "CRISPR 같은 최신 기술을 비교 대상으로 붙입니다.",
      "활용 가능성과 한계를 함께 검토하며 심화합니다."
    ],
    "생명윤리": [
      "대표 사례 1~2개를 정해 쟁점을 분리합니다.",
      "찬반 또는 이해관계자 관점으로 비교 구조를 만듭니다.",
      "판단 기준을 세우고 자신의 결론까지 정리합니다."
    ]
  };
  return map[keyword] || item.directions || ["핵심 개념을 정리합니다.", "비교 또는 분석 방향을 정합니다.", "결과를 정리합니다."];
}

function buildExtensions(keyword, item) {
  const map = {
    "이차전지": [
      "배터리 관리 시스템이나 전기차와 연결하면 탐구 축이 더 넓어집니다.",
      "공정 비교를 넘어서 안전성·효율성 기준까지 세우면 완성도가 올라갑니다."
    ],
    "반도체": [
      "센서, 전력반도체, 정밀 공정 사례를 넣으면 산업 연결성이 더 분명해집니다.",
      "단순 원리 설명보다 공정 문제까지 붙이면 탐구 수준이 올라갑니다."
    ],
    "인공지능": [
      "윤리 문제를 넣으면 단순 기술 설명을 넘는 탐구가 됩니다.",
      "다른 교과 사례와 연결하면 활용 범위가 더 넓어집니다."
    ],
    "미세먼지": [
      "실측 데이터가 들어가면 탐구의 신뢰도가 확 올라갑니다.",
      "지역 비교나 계절 비교를 붙이면 결과 해석이 더 선명해집니다."
    ]
  };
  return map[keyword] || [
    "비교 대상이나 실제 사례를 추가하면 탐구의 완성도가 올라갑니다.",
    "교과 개념과 실생활 문제를 함께 연결하면 설득력이 더 강해집니다."
  ];
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

  const executionList = document.getElementById("executionList");
  executionList.innerHTML = "";
  (model.executionSteps || []).forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    executionList.appendChild(li);
  });

  const extensionList = document.getElementById("extensionList");
  extensionList.innerHTML = "";
  (model.extensions || []).forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    extensionList.appendChild(li);
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
}

bootstrap();
