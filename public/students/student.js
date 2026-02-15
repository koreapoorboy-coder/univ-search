/* student.js (Option #2: 국/수/영 기본 + 탐구 더보기) */
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  async function loadJson(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(path + " load failed (" + r.status + ")");
    return r.json();
  }

  // ✅ 2번 패치: scores.json이 배열이 아니어도 펼치기
  function normalizeArrayish(x) {
    if (Array.isArray(x)) return x.slice();
    if (!x || typeof x !== "object") return [];
    for (const k of ["records", "rows", "items", "data", "scores"]) {
      if (Array.isArray(x[k])) return x[k].slice();
    }
    const out = [];
    for (const [k, v] of Object.entries(x)) {
      if (Array.isArray(v)) out.push(...v.map(r => ({ ...r, id: (r?.id ?? k) })));
      else if (v && typeof v === "object") out.push({ ...v, id: (v?.id ?? k) });
    }
    return out;
  }

  function toNum(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const cleaned = String(v).trim().replace(/[^0-9.+-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function pickId(row) {
    return row?.id ?? row?.studentId ?? row?.studentID ?? row?.["ID"] ?? row?.["학생ID"] ?? row?.["학번"] ?? null;
  }
  function pickRound(row) {
    const v = row?.round ?? row?.Round ?? row?.["회차"] ?? row?.["차수"];
    return v == null ? null : Number(v);
  }
  function pickDate(row) {
    return row?.date ?? row?.Date ?? row?.["날짜"] ?? row?.["일자"] ?? null;
  }
  function roundLabel(row) {
    const r = pickRound(row);
    const d = pickDate(row);
    if (r != null && d) return `#${r} (${d})`;
    if (r != null) return `#${r}`;
    if (d) return String(d);
    return "-";
  }

  // ---- subject config ----
  const CORE_SUBS = ["국어", "수학", "영어"];
  const INQ_SUBS  = ["탐1", "탐2"];
  const ALL_SUBS  = [...CORE_SUBS, ...INQ_SUBS];

  // 학생 점수 키(원점수/백분위)
  function pickStudentRaw(row, sub) {
    const keys = [
      `${sub}_raw`, `${sub}raw`,
      sub, // legacy
      // 호환: 탐구1/탐구2
      (sub === "탐1") ? "탐구1_raw" : null,
      (sub === "탐2") ? "탐구2_raw" : null,
      (sub === "탐1") ? "탐구1" : null,
      (sub === "탐2") ? "탐구2" : null,
    ].filter(Boolean);

    for (const k of keys) {
      const v = toNum(row?.[k]);
      if (v != null) return v;
    }
    return null;
  }

  function pickStudentPct(row, sub) {
    const keys = [
      `${sub}_pct`, `${sub}p`, `${sub}P`,
      `${sub}백분위`, `${sub} 백분위`,
      // 호환: 탐구1/탐구2
      (sub === "탐1") ? "탐구1_pct" : null,
      (sub === "탐2") ? "탐구2_pct" : null,
      (sub === "탐1") ? "탐구1p" : null,
      (sub === "탐2") ? "탐구2p" : null,
    ].filter(Boolean);

    for (const k of keys) {
      const v = toNum(row?.[k]);
      if (v != null) return v;
    }
    return null;
  }

  // 컷 점수(원점수/백분위) - 없을 수 있음
  function pickCutRaw(row, sub) {
    const keys = [
      `${sub}_cut_raw`, `${sub}cut_raw`,
      `${sub}컷_raw`, `${sub}컷원점수`, `${sub}컷점수`, `${sub}컷점`,
      `${sub}컷`, // legacy
    ];
    for (const k of keys) {
      const v = toNum(row?.[k]);
      if (v != null) return v;
    }
    return null;
  }

  function pickCutPct(row, sub) {
    const keys = [
      `${sub}_cut_pct`, `${sub}cut_pct`,
      `${sub}컷_pct`, `${sub}컷p`, `${sub}컷P`,
      `${sub}컷백분위`, `${sub}컷 백분위`,
    ];
    for (const k of keys) {
      const v = toNum(row?.[k]);
      if (v != null) return v;
    }
    return null;
  }

  async function ensureChartJs() {
    if (window.Chart) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Chart.js load failed"));
      document.head.appendChild(s);
    });
  }

  function injectStyleOnce() {
    if ($("#__score_ui_style__")) return;
    const st = document.createElement("style");
    st.id = "__score_ui_style__";
    st.textContent = `
      .card{border:1px solid #ddd;border-radius:18px;padding:16px;margin:12px 0;background:#fff}
      .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
      .muted{opacity:.7}

      .pillBtn{
        appearance:none; border:2px solid #111; background:#fff; color:#111;
        border-radius:999px; padding:7px 12px; font-weight:900; cursor:pointer;
      }
      .pillBtn.sel{background:#111;color:#fff}
      .subBtn{
        appearance:none; border:1px solid #ddd; background:#fff;
        border-radius:999px; padding:7px 10px; font-weight:900; cursor:pointer;
      }
      .subBtn.sel{border-color:#111}
      .divider{height:1px;background:#f0f0f0;margin:12px 0}

      /* 최신 성적(모바일) */
      .scoreTop{display:flex;flex-direction:column;gap:10px}
      .tag{display:inline-flex;align-items:center;border:1px solid #ddd;border-radius:999px;padding:8px 12px;font-weight:900;background:#fff}
      .scorePills{display:flex;gap:8px;flex-wrap:wrap}
      .scorePill{
        display:inline-flex;gap:10px;align-items:center;
        border:1px solid #eee;border-radius:14px;padding:8px 10px;background:#fff;font-weight:900;
      }
      .scorePill .k{opacity:.7}
      .scorePill .v{font-weight:900}
      @media(max-width: 520px){
        .scorePills{flex-direction:column;align-items:stretch}
        .scorePill{justify-content:space-between}
      }

      .grid{display:grid;grid-template-columns: 1.2fr .8fr; gap:14px; align-items:start; margin-top:12px}
      @media(max-width: 860px){ .grid{grid-template-columns:1fr} }

      .box{border:1px solid #eee;border-radius:16px;padding:14px}
      table{border-collapse:collapse;width:100%;min-width:520px}
      th,td{border-bottom:1px solid #eee;padding:10px;text-align:left;font-size:14px;white-space:nowrap}
      th{background:#fafafa;font-weight:900}
      .num{text-align:right}
    `;
    document.head.appendChild(st);
  }

  function fmtPair(raw, pct) {
    const r = (raw == null) ? "-" : `${raw}점`;
    const p = (pct == null) ? "-" : `${pct}p`;
    return `${r} · ${p}`;
  }

  function makeBtn(label, selected, cls, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls + (selected ? " sel" : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  async function main() {
    injectStyleOnce();

    const root = $("#detail") || $("#content") || document.body;

    const qs = new URLSearchParams(location.search);
    const sid = qs.get("id");
    if (!sid) {
      root.innerHTML = `<div class="card"><div style="color:#b00020;font-weight:900">오류</div><div class="muted">id 파라미터가 없습니다.</div></div>`;
      return;
    }

    const rawScores = await loadJson("./scores.json");
    const scores = normalizeArrayish(rawScores);

    const rows = scores
      .filter(r => String(pickId(r) ?? "") === String(sid))
      .sort((a, b) => {
        const ra = pickRound(a), rb = pickRound(b);
        if (ra != null && rb != null) return ra - rb;
        const da = pickDate(a), db = pickDate(b);
        if (da && db) return String(da).localeCompare(String(db));
        return 0;
      });

    if (!rows.length) {
      root.innerHTML = `<div class="card"><div style="color:#b00020;font-weight:900">성적 데이터 없음</div><div class="muted">scores.json에서 id=${esc(sid)} 데이터를 찾지 못했습니다.</div></div>`;
      return;
    }

    const latest = rows[rows.length - 1];

    // state
    let showInq = false;        // ✅ 탐구 더보기
    let activeSub = "수학";      // 기본 수학
    let metric = "pct";         // 그래프 기준(p 기본)

    // skeleton
    root.innerHTML = `
      <div class="card" id="scoreCard"></div>
      <div class="card" id="viewCard"></div>
    `;

    const scoreCard = $("#scoreCard");
    const viewCard = $("#viewCard");

    function renderTopSummary() {
      const visibleSubs = showInq ? ALL_SUBS : CORE_SUBS;

      const pills = visibleSubs.map(sub => {
        const r = pickStudentRaw(latest, sub);
        const p = pickStudentPct(latest, sub);
        return `<div class="scorePill"><span class="k">${esc(sub)}</span><span class="v">${esc(fmtPair(r,p))}</span></div>`;
      }).join("");

      scoreCard.innerHTML = `
        <div class="scoreTop">
          <div class="row" style="gap:8px">
            <div class="tag"><strong>최신 성적</strong>&nbsp;${esc(roundLabel(latest))}</div>
            <button class="subBtn ${showInq ? "sel" : ""}" id="toggleInqBtn">
              ${showInq ? "탐구 숨기기" : "탐구 더보기"}
            </button>
          </div>
          <div class="scorePills">${pills}</div>
        </div>
      `;

      $("#toggleInqBtn").addEventListener("click", () => {
        showInq = !showInq;

        // 탐구 숨길 때 탐구 탭이 선택돼 있으면 수학으로 복귀
        if (!showInq && (activeSub === "탐1" || activeSub === "탐2")) {
          activeSub = "수학";
        }
        renderAll();
      });
    }

    let chart = null;

    function renderControlsAndLayout() {
      const tabs = document.createElement("div");
      tabs.className = "row";
      tabs.style.marginTop = "12px";

      const visibleTabs = showInq ? ALL_SUBS : CORE_SUBS;

      visibleTabs.forEach(sub => {
        tabs.appendChild(makeBtn(sub, sub === activeSub, "pillBtn", () => {
          activeSub = sub;
          renderAll();
        }));
      });

      const toggles = document.createElement("div");
      toggles.className = "row";
      toggles.style.marginTop = "10px";
      toggles.innerHTML = `<span class="muted" style="font-weight:900">그래프 기준</span>`;
      toggles.appendChild(makeBtn("백분위(p)", metric === "pct", "subBtn", () => { metric = "pct"; renderAll(); }));
      toggles.appendChild(makeBtn("원점수", metric === "raw", "subBtn", () => { metric = "raw"; renderAll(); }));

      viewCard.innerHTML = "";
      viewCard.appendChild(tabs);
      viewCard.appendChild(toggles);

      const grid = document.createElement("div");
      grid.className = "grid";
      grid.innerHTML = `
        <div class="box">
          <div style="font-weight:900;margin-bottom:10px">그래프 (학생 vs 컷) · ${esc(activeSub)} · ${metric === "pct" ? "백분위(p)" : "원점수"}</div>
          <canvas id="scoreChart" height="120"></canvas>
          <div class="muted" style="margin-top:10px">
            ※ 표에서는 항상 <b>원점수·백분위</b>가 같이 표시됩니다.
          </div>
        </div>
        <div class="box">
          <div style="font-weight:900;margin-bottom:10px">회차별 표</div>
          <div id="tblArea"></div>
        </div>
      `;
      viewCard.appendChild(grid);
    }

    async function renderChartAndTable() {
      await ensureChartJs();

      const labels = rows.map(r => roundLabel(r));

      const stuRawArr = rows.map(r => pickStudentRaw(r, activeSub));
      const stuPctArr = rows.map(r => pickStudentPct(r, activeSub));
      const cutRawArr = rows.map(r => pickCutRaw(r, activeSub));
      const cutPctArr = rows.map(r => pickCutPct(r, activeSub));

      const stuSeries = (metric === "pct") ? stuPctArr : stuRawArr;
      const cutSeries = (metric === "pct") ? cutPctArr : cutRawArr;

      const hasAnyCut = cutSeries.some(v => v != null);

      // chart
      const ctx = $("#scoreChart");
      if (chart) chart.destroy();

      chart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "학생", data: stuSeries, tension: 0.25, spanGaps: true },
            { label: "컷", data: hasAnyCut ? cutSeries : cutSeries.map(() => null), tension: 0.25, spanGaps: true, hidden: !hasAnyCut }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
            tooltip: {
              callbacks: {
                afterBody: (items) => {
                  const i = items?.[0]?.dataIndex ?? 0;
                  const sr = stuRawArr[i], sp = stuPctArr[i];
                  const cr = cutRawArr[i], cp = cutPctArr[i];
                  return [
                    `학생: ${fmtPair(sr, sp)}`,
                    `컷: ${fmtPair(cr, cp)}`
                  ];
                }
              }
            }
          }
        }
      });

      // table (항상 원점수·백분위 같이)
      const tbody = rows.map((r, idx) => {
        const sr = stuRawArr[idx], sp = stuPctArr[idx];
        const cr = cutRawArr[idx], cp = cutPctArr[idx];

        const sv = (metric === "pct") ? sp : sr;
        const cv = (metric === "pct") ? cp : cr;
        const diff = (sv != null && cv != null) ? (sv - cv) : null;

        const unit = (metric === "pct") ? "p" : "점";
        const diffTxt = diff == null ? "-" : ((diff >= 0 ? "+" : "") + diff.toFixed(1) + unit);

        return `
          <tr>
            <td>${esc(roundLabel(r))}</td>
            <td>${esc(fmtPair(sr, sp))}</td>
            <td>${esc(fmtPair(cr, cp))}</td>
            <td class="num">${esc(diffTxt)}</td>
          </tr>
        `;
      }).join("");

      $("#tblArea").innerHTML = `
        <table>
          <thead>
            <tr>
              <th>회차</th>
              <th>학생 (원점수 · 백분위)</th>
              <th>컷 (원점수 · 백분위)</th>
              <th class="num">차이</th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
        ${hasAnyCut ? "" : `<div class="muted" style="margin-top:10px">※ 현재 회차에 컷 데이터가 없어서 컷 라인이 숨겨질 수 있어요.</div>`}
      `;
    }

    async function renderAll() {
      renderTopSummary();
      renderControlsAndLayout();
      await renderChartAndTable();
    }

    await renderAll();
  }

  main().catch(err => {
    const root = $("#detail") || $("#content") || document.body;
    root.innerHTML = `
      <div class="card">
        <div style="color:#b00020;font-weight:900">로딩 오류</div>
        <div class="muted">${esc(err.message)}</div>
      </div>
    `;
  });
})();
