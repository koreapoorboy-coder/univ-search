(function () {
  const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
  const TEXTBOOK_MASTER_URL = "seed/textbook_master.json";

  const els = {
    keyword: document.getElementById("keyword"),
    grade: document.getElementById("grade"),
    track: document.getElementById("track"),
    major: document.getElementById("major"),
    activityLevel: document.getElementById("activityLevel"),
    style: document.getElementById("style"),
    generateBtn: document.getElementById("generateBtn"),
    loadingText: document.getElementById("loadingText"),
    statusMessage: document.getElementById("statusMessage"),
    resultSection: document.getElementById("resultSection"),
    textbookSection: document.getElementById("textbookSection"),
    textbookMatches: document.getElementById("textbookMatches"),
    reason: document.getElementById("reason"),
    steps: document.getElementById("steps"),
    flow: document.getElementById("flow"),
    recommendedApproach: document.getElementById("recommendedApproach"),
    extension: document.getElementById("extension"),
    subjectLinks: document.getElementById("subjectLinks"),
    warnings: document.getElementById("warnings")
  };

  let matcher = null;

  async function initMatcher() {
    if (!window.StudentTextbookMatcher) return null;
    try {
      const res = await fetch(TEXTBOOK_MASTER_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("textbook_master.json 로드 실패");
      const textbookMaster = await res.json();
      matcher = new window.StudentTextbookMatcher(textbookMaster);
    } catch (error) {
      console.error(error);
      matcher = null;
    }
    return matcher;
  }

  function setStatus(message, type = "") {
    els.statusMessage.textContent = message || "";
    els.statusMessage.className = `status-message ${type}`.trim();
  }

  function setLoading(isLoading) {
    els.generateBtn.disabled = isLoading;
    els.loadingText.hidden = !isLoading;
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [String(value)];
  }

  function renderList(target, items) {
    target.innerHTML = "";
    asArray(items).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      target.appendChild(li);
    });
  }

  function renderResult(result) {
    els.reason.textContent = result.reason || "";
    renderList(els.steps, result.steps);
    renderList(els.flow, result.flow);
    els.recommendedApproach.textContent = result.recommendedApproach || "";
    els.extension.textContent = result.extension || "";
    renderList(els.subjectLinks, result.subjectLinks);
    renderList(els.warnings, result.warnings);
    els.resultSection.hidden = false;
  }

  function renderTextbookMatches(matches) {
    els.textbookMatches.innerHTML = "";

    if (!matches || matches.length === 0) {
      els.textbookSection.hidden = true;
      return;
    }

    matches.forEach((match) => {
      const card = document.createElement("article");
      card.className = "textbook-card";

      card.innerHTML = `
        <div class="textbook-top">
          <div>
            <h3>${escapeHtml(match.subject || "관련 교과")}</h3>
            <p class="meta-line">${escapeHtml(match.unit || "")}${match.subunit ? ` · ${escapeHtml(match.subunit)}` : ""}</p>
          </div>
          <span class="match-score">매칭 ${Math.round(match.score || 0)}점</span>
        </div>
        <p class="seed-line"><strong>연결 포인트:</strong> ${escapeHtml((match.interpretation_points || []).join(" / ") || "-")}</p>
        <div class="kv-block">
          <strong>핵심 개념</strong>
          <div class="chip-list">${(match.core_concepts || []).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join("")}</div>
        </div>
        <div class="kv-block">
          <strong>탐구 씨앗</strong>
          <ul class="seed-list">${(match.topic_seeds || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
        </div>
      `;

      els.textbookMatches.appendChild(card);
    });

    els.textbookSection.hidden = false;
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function generate() {
    const payload = {
      keyword: els.keyword.value.trim(),
      grade: els.grade.value.trim(),
      track: els.track.value.trim(),
      major: els.major.value.trim(),
      activityLevel: els.activityLevel.value.trim(),
      style: els.style.value.trim()
    };

    if (!payload.keyword || !payload.grade || !payload.track || !payload.major) {
      setStatus("키워드, 학년, 계열, 전공은 꼭 입력해야 해요.", "error");
      return;
    }

    setLoading(true);
    setStatus("탐구 설계를 생성하고 있어요.");
    els.resultSection.hidden = true;
    els.textbookSection.hidden = true;

    try {
      const res = await fetch(`${WORKER_BASE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.mode || "생성 중 오류가 발생했습니다.");
      }

      renderResult(data.result || {});

      if (!matcher) {
        await initMatcher();
      }

      if (matcher) {
        const matches = matcher.match(payload, { limit: 4 });
        renderTextbookMatches(matches);
      }

      setStatus(`생성 완료${data.mode ? ` · 모드: ${data.mode}` : ""}`, "success");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "생성 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }

  els.generateBtn?.addEventListener("click", generate);
  initMatcher();
})();
