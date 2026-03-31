const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";

const els = {
  keyword: document.getElementById("keyword"),
  grade: document.getElementById("grade"),
  track: document.getElementById("track"),
  major: document.getElementById("major"),
  activityLevel: document.getElementById("activityLevel"),
  style: document.getElementById("style"),
  generateBtn: document.getElementById("generateBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),
  resultPanel: document.getElementById("resultPanel"),
  resultBody: document.getElementById("resultBody"),
  resultMode: document.getElementById("resultMode")
};

els.generateBtn.addEventListener("click", onGenerate);
els.resetBtn.addEventListener("click", onReset);

function setStatus(message, isError = false) {
  els.status.textContent = message || "";
  els.status.classList.toggle("error", Boolean(isError));
}

function setLoading(isLoading) {
  els.generateBtn.disabled = isLoading;
  els.resetBtn.disabled = isLoading;
  els.generateBtn.textContent = isLoading ? "생성 중..." : "탐구 설계 생성";
}

function onReset() {
  els.keyword.value = "";
  els.grade.value = "";
  els.track.value = "";
  els.major.value = "";
  els.activityLevel.value = "미입력";
  els.style.value = "미입력";
  els.resultPanel.classList.add("hidden");
  els.resultBody.innerHTML = "";
  els.resultMode.textContent = "";
  setStatus("");
}

async function onGenerate() {
  const payload = {
    keyword: els.keyword.value.trim(),
    grade: els.grade.value.trim(),
    track: els.track.value.trim(),
    major: els.major.value.trim(),
    activityLevel: els.activityLevel.value,
    style: els.style.value
  };

  if (!payload.keyword || !payload.grade || !payload.track || !payload.major) {
    setStatus("키워드, 학년, 관심 계열, 희망 전공은 꼭 입력해야 합니다.", true);
    return;
  }

  setLoading(true);
  setStatus("AI가 탐구 설계를 생성하고 있어요...");

  try {
    const res = await fetch(`${WORKER_BASE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("응답을 JSON으로 읽지 못했습니다.");
    }

    if (!res.ok || !data.ok) {
      const errorMessage = data?.error || data?.mode || "생성 중 오류가 발생했습니다.";
      const detail = data?.data?.error?.message || data?.detail || "";
      setStatus(`${errorMessage}${detail ? ` / ${detail}` : ""}`, true);
      renderError(data);
      return;
    }

    setStatus("생성이 완료되었습니다.");
    renderResult(data.mode, data.result);
  } catch (error) {
    setStatus(error.message || "호출 중 오류가 발생했습니다.", true);
    renderError({ error: String(error.message || error) });
  } finally {
    setLoading(false);
  }
}

function renderResult(mode, result) {
  els.resultPanel.classList.remove("hidden");
  els.resultMode.textContent = mode;

  if (mode === "ai-raw") {
    els.resultBody.innerHTML = `
      <article class="card full">
        <h3>AI 원문 응답</h3>
        <pre class="raw">${escapeHtml(result?.rawText || "(빈 응답)")}</pre>
      </article>
    `;
    return;
  }

  const cards = [
    cardHtml("이 주제를 추천하는 이유", result.reason),
    listCardHtml("탐구 진행 순서", result.steps),
    listCardHtml("활동 설계 흐름", result.flow),
    cardHtml("추천 진행 방식", result.recommendedApproach),
    cardHtml("한 단계 더 확장하려면", result.extension),
    listCardHtml("관련 교과 연결", result.subjectLinks),
    listCardHtml("주의할 점", result.warnings)
  ];

  els.resultBody.innerHTML = cards.join("");
}

function renderError(data) {
  els.resultPanel.classList.remove("hidden");
  els.resultMode.textContent = data?.mode || "error";
  els.resultBody.innerHTML = `
    <article class="card full">
      <h3>오류 내용</h3>
      <pre class="raw">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </article>
  `;
}

function cardHtml(title, text) {
  return `
    <article class="card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text || "-")}</p>
    </article>
  `;
}

function listCardHtml(title, items) {
  const safeItems = Array.isArray(items) ? items : [];
  const list = safeItems.length
    ? `<ul>${safeItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p>-</p>`;
  return `
    <article class="card">
      <h3>${escapeHtml(title)}</h3>
      ${list}
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
