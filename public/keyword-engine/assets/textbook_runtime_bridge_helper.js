window.__TEXTBOOK_RUNTIME_BRIDGE_HELPER_VERSION = "v1.1.4-life-science-alias";

(function () {
  const FLATTENED_URL = "seed/textbook-data/textbook_flattened_segments_v1.json";
  const BRIDGES_URL = "seed/textbook-data/textbook_cross_subject_bridges_v1.json";

  const SUBJECT_ID_MAP = {
    "통합과학1": "integrated_science1",
    "통합과학2": "integrated_science2",
    "과학탐구실험1": "science_inquiry1",
    "과학탐구실험2": "science_inquiry2",
    "공통수학1": "common_math1",
    "공통수학2": "common_math2",
    "공통국어1": "common_korean1",
    "공통국어2": "common_korean2",
    "공통국어": "common_korean1",
    "통합사회": "integrated_society",
    "통합사회1": "integrated_society",
    "통합사회2": "integrated_society2",
    "정보": "info",
    "대수": "algebra",
    "확률과 통계": "probability_statistics",
    "미적분1": "calculus1",
    "미적분": "calculus1",
    "기하": "geometry",
    "물리": "physics1",
    "물리학": "physics1",
    "물리학1": "physics1",
    "물리학 1": "physics1",
    "물리학I": "physics1",
    "물리학Ⅰ": "physics1",
    "화학": "chemistry1",
    "화학1": "chemistry1",
    "화학 1": "chemistry1",
    "화학I": "chemistry1",
    "화학Ⅰ": "chemistry1",
    "생명과학": "life_science",
    "생명과학1": "life_science",
    "생명과학 1": "life_science",
    "생명과학I": "life_science",
    "생명과학Ⅰ": "life_science",
    "지구과학": "earth_science",
    "역학과 에너지": "mechanics_energy",
    "전자기와 양자": "electromagnetism_quantum",
    "물질과 에너지": "matter_energy",
    "세포와 물질대사": "cell_metabolism",
    "지구시스템과학": "earth_system_science"
  };

  const TASK_HINTS = {
    "탐구보고서": ["분석", "비교", "원리", "구조", "설명"],
    "실험보고서": ["실험", "측정", "센서", "조건", "검증"],
    "자료조사 보고서": ["자료", "사례", "조사", "윤리", "시각화"],
    "발표보고서": ["발표", "시연", "프로젝트", "제작", "정리"]
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "");
  }

  function includesNormalized(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    return !!na && !!nb && (na.includes(nb) || nb.includes(na));
  }

  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function firstText(...values) {
    for (const v of values) {
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    return "";
  }

  let flattened = [];
  let bridges = [];
  let isLoaded = false;

  async function loadData() {
    if (isLoaded) return true;
    try {
      const [segmentsRes, bridgesRes] = await Promise.all([
        fetch(FLATTENED_URL, { cache: "no-store" }),
        fetch(BRIDGES_URL, { cache: "no-store" })
      ]);
      if (!segmentsRes.ok || !bridgesRes.ok) {
        console.warn("textbook runtime load failed", segmentsRes.status, bridgesRes.status);
        return false;
      }
      const segmentsJson = await segmentsRes.json();
      const bridgesJson = await bridgesRes.json();
      flattened = Array.isArray(segmentsJson.segments) ? segmentsJson.segments : [];
      bridges = Array.isArray(bridgesJson.bridges) ? bridgesJson.bridges : [];
      isLoaded = true;
      return true;
    } catch (error) {
      console.warn("textbook runtime helper init error", error);
      return false;
    }
  }

  function getCurrentState() {
    const subject = $("subject")?.value || "";
    const career = $("career")?.value || "";
    const taskType = $("taskType")?.value || "";
    const grade = $("grade")?.value || "";
    return {
      subject,
      subjectId: SUBJECT_ID_MAP[subject] || "",
      career,
      taskType,
      grade
    };
  }

  function scoreSegment(segment, state) {
    let score = 0;
    const allTags = [
      ...(segment.concept_tags || []),
      ...(segment.skill_tags || []),
      ...(segment.activity_tags || []),
      ...(segment.data_tags || []),
      ...(segment.expansion_tags || []),
      ...(segment.problem_tags || []),
      ...(segment.major_bridge_tags || [])
    ];

    if (includesNormalized(segment.subject_name, state.subject) || includesNormalized(segment.display_name, state.subject)) score += 10;
    if (segment.subject_id === state.subjectId) score += 10;

    if (state.career) {
      for (const major of segment.major_bridge_tags || []) {
        if (includesNormalized(major, state.career)) score += 8;
      }
      for (const tag of allTags) {
        if (includesNormalized(tag, state.career)) score += 3;
      }
    }

    const taskHints = TASK_HINTS[state.taskType] || [];
    for (const hint of taskHints) {
      for (const tag of allTags) {
        if (includesNormalized(tag, hint)) score += 2;
      }
      if (includesNormalized(segment.segment_title, hint)) score += 3;
    }

    if (state.grade === "고1") {
      if (segment.segment_type === "subunit" || segment.segment_type === "unit_chapter") score += 1;
    } else {
      if (segment.segment_type === "activity") score += 1;
    }

    return score;
  }

  function getTopSegments(state, limit = 3) {
    return flattened
      .filter(s => s.subject_id === state.subjectId || includesNormalized(s.subject_name, state.subject) || includesNormalized(s.display_name, state.subject))
      .map(s => ({ ...s, __score: scoreSegment(s, state) }))
      .sort((a, b) => b.__score - a.__score || a.segment_title.localeCompare(b.segment_title, "ko"))
      .slice(0, limit);
  }

  function scoreBridge(bridge, state) {
    let score = 0;
    if (bridge.source_subject_id === state.subjectId) score += 10;
    if (state.taskType === "실험보고서" && bridge.recommended_use.includes("실측")) score += 2;
    if (state.career) {
      for (const keyword of bridge.bridge_keywords || []) {
        if (includesNormalized(keyword, state.career)) score += 4;
      }
      if (includesNormalized(bridge.target_segment_title, state.career)) score += 3;
    }
    return score;
  }

  function getTopBridges(state, limit = 4) {
    return bridges
      .filter(b => b.source_subject_id === state.subjectId)
      .map(b => ({ ...b, __score: scoreBridge(b, state) }))
      .sort((a, b) => b.__score - a.__score || a.target_subject_id.localeCompare(b.target_subject_id, "ko"))
      .slice(0, limit);
  }

  function buildMiniContext(state) {
    const segments = getTopSegments(state, 3);
    const nextBridges = getTopBridges(state, 3);

    return {
      selected_subject: state.subject,
      subject_id: state.subjectId,
      selected_major_keyword: state.career,
      selected_output_type: state.taskType,
      recommended_segments: segments.map(seg => ({
        segment_title: seg.segment_title,
        unit_title: seg.unit_title,
        chapter_title: seg.chapter_title,
        concept_tags: seg.concept_tags || [],
        skill_or_activity_tags: uniq([...(seg.skill_tags || []), ...(seg.activity_tags || [])]),
        data_tags: seg.data_tags || [],
        expansion_tags: seg.expansion_tags || [],
        major_bridge_tags: seg.major_bridge_tags || [],
        focus_sentence: seg.mini_subject_context?.focus_sentence || "",
        report_seed_keywords: seg.mini_subject_context?.report_seed_keywords || []
      })),
      recommended_bridges: nextBridges.map(bridge => ({
        target_subject_id: bridge.target_subject_id,
        source_segment_title: bridge.source_segment_title,
        target_segment_title: bridge.target_segment_title,
        bridge_type: bridge.bridge_type,
        bridge_keywords: bridge.bridge_keywords || [],
        bridge_reason: bridge.bridge_reason || "",
        recommended_use: bridge.recommended_use || ""
      }))
    };
  }

  function renderSegmentCard(card, segments) {
    if (!card) return;
    if (!segments.length) {
      card.innerHTML = `
        <div class="mini-label">교과서 기반 핵심 연결</div>
        <h4 style="margin:6px 0 8px;">데이터 대기 중</h4>
        <p style="margin:0;color:#596579;line-height:1.6;">과목을 선택하면 교과서 기반 핵심 세그먼트가 여기에 표시됩니다.</p>
      `;
      return;
    }

    const html = segments.map(seg => {
      const tagRow = uniq([
        ...(seg.concept_tags || []).slice(0, 3),
        ...(seg.major_bridge_tags || []).slice(0, 2)
      ]).slice(0, 5).map(tag => `<span style="display:inline-flex;padding:4px 8px;border-radius:999px;background:#eef4ff;color:#2256c4;font-size:12px;font-weight:700;margin:0 6px 6px 0;">${escapeHtml(tag)}</span>`).join("");

      return `
        <div style="border:1px solid #dde6f3;border-radius:16px;padding:14px 14px 12px;margin-top:10px;">
          <div style="font-size:12px;color:#5f6e84;font-weight:700;">${escapeHtml(firstText(seg.unit_title, seg.subject_name))}${seg.chapter_title ? ` · ${escapeHtml(seg.chapter_title)}` : ""}</div>
          <div style="font-size:16px;font-weight:800;color:#172033;margin-top:6px;">${escapeHtml(seg.segment_title)}</div>
          <div style="font-size:13px;color:#4f5e74;line-height:1.6;margin-top:6px;">${escapeHtml(seg.mini_subject_context?.focus_sentence || "")}</div>
          <div style="margin-top:10px;">${tagRow}</div>
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <div class="mini-label">교과서 기반 핵심 연결</div>
      <h4 style="margin:6px 0 8px;">현재 과목에서 바로 쓸 포인트</h4>
      <p style="margin:0;color:#596579;line-height:1.6;">선택 과목에서 바로 보고서 주제로 이어질 수 있는 세그먼트를 우선순위로 정리했습니다.</p>
      ${html}
    `;
  }

  function renderBridgeCard(card, bridgeList) {
    if (!card) return;
    if (!bridgeList.length) {
      card.innerHTML = `
        <div class="mini-label">종단·횡단 확장 연결</div>
        <h4 style="margin:6px 0 8px;">연결 대기 중</h4>
        <p style="margin:0;color:#596579;line-height:1.6;">이 과목의 다음 확장 연결이 아직 표시되지 않았습니다.</p>
      `;
      return;
    }

    const html = bridgeList.map(bridge => {
      const keywords = (bridge.bridge_keywords || []).slice(0, 5).map(tag => `<span style="display:inline-flex;padding:4px 8px;border-radius:999px;background:#f3f5f9;color:#3f4d63;font-size:12px;font-weight:700;margin:0 6px 6px 0;">${escapeHtml(tag)}</span>`).join("");
      return `
        <div style="border:1px solid #dde6f3;border-radius:16px;padding:14px 14px 12px;margin-top:10px;">
          <div style="font-size:12px;color:#5f6e84;font-weight:700;">${escapeHtml(bridge.source_subject_id)} → ${escapeHtml(bridge.target_subject_id)}</div>
          <div style="font-size:16px;font-weight:800;color:#172033;margin-top:6px;">${escapeHtml(bridge.target_segment_title)}</div>
          <div style="font-size:13px;color:#4f5e74;line-height:1.6;margin-top:6px;">${escapeHtml(bridge.bridge_reason || "")}</div>
          <div style="font-size:12px;color:#2256c4;font-weight:700;line-height:1.6;margin-top:6px;">${escapeHtml(bridge.recommended_use || "")}</div>
          <div style="margin-top:10px;">${keywords}</div>
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <div class="mini-label">종단·횡단 확장 연결</div>
      <h4 style="margin:6px 0 8px;">다음 학년·다른 과목 확장</h4>
      <p style="margin:0;color:#596579;line-height:1.6;">현재 과목 탐구를 다음 과목이나 다른 과목으로 이어가기 좋은 bridge만 추려서 보여줍니다.</p>
      ${html}
    `;
  }

  function renderInputSummaryAddon(summaryCard, state, payload) {
    if (!summaryCard) return;
    const existing = summaryCard.querySelector(".textbook-runtime-addon");
    if (existing) existing.remove();

    const topSegment = payload.recommended_segments?.[0];
    const topBridge = payload.recommended_bridges?.[0];

    const box = document.createElement("div");
    box.className = "textbook-runtime-addon";
    box.style.marginTop = "14px";
    box.style.paddingTop = "14px";
    box.style.borderTop = "1px dashed #d6dfec";
    box.innerHTML = `
      <div style="font-size:12px;color:#53708f;font-weight:800;margin-bottom:8px;">통합 교과서 연결 요약</div>
      <div style="font-size:13px;color:#233247;line-height:1.7;">
        <div><strong>현재 과목 핵심:</strong> ${escapeHtml(topSegment?.segment_title || "-")}</div>
        <div><strong>다음 확장:</strong> ${escapeHtml(topBridge?.target_segment_title || "-")}</div>
        <div><strong>연결 키워드:</strong> ${escapeHtml((topBridge?.bridge_keywords || topSegment?.report_seed_keywords || []).slice(0,5).join(", ") || "-")}</div>
      </div>
    `;
    summaryCard.appendChild(box);
  }

  function renderAll() {
    const state = getCurrentState();
    const segments = state.subject ? getTopSegments(state, 3) : [];
    const nextBridges = state.subject ? getTopBridges(state, 4) : [];
    const payload = buildMiniContext(state);

    renderSegmentCard($("textbookSection"), segments);
    renderBridgeCard($("extensionLibrarySection"), nextBridges);
    renderInputSummaryAddon($("inputSummaryCard"), state, payload);

    window.__TEXTBOOK_RUNTIME_CONTEXT = payload;
    document.dispatchEvent(new CustomEvent("textbook-runtime-updated", { detail: payload }));
  }

  function debounce(fn, wait) {
    let t = null;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  async function init() {
    const ok = await loadData();
    if (!ok) return;

    const rerender = debounce(renderAll, 120);
    ["subject", "career", "taskType", "grade", "taskName"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", rerender);
      el.addEventListener("input", rerender);
    });

    const generateBtn = $("generateBtn");
    if (generateBtn) generateBtn.addEventListener("click", () => setTimeout(renderAll, 60));

    renderAll();
  }

  window.TextbookRuntimeBridgeHelper = {
    loadData,
    getCurrentState,
    getTopSegments: (limit = 3) => getTopSegments(getCurrentState(), limit),
    getTopBridges: (limit = 4) => getTopBridges(getCurrentState(), limit),
    buildMiniContext: () => buildMiniContext(getCurrentState()),
    renderAll
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
