/* student.js (Option #2 + Table: 최근3/전체/회차선택, 원점수 우선 표기 + 백분위 병기) */
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
      table{border-collapse:collapse;width:100%;min-width:560px}
      th,td{border-bottom:1px solid #eee;padding:10px;text-align:left;font-size:14px;white-space:nowrap;vertical-align:top}
      th{background:#fafafa;font-weight:900}
      .num{text-align:right}

      /* 표 셀(원점수 크게 + 백분위 작게) */
      .cell2{display:flex;flex-direction:column;gap:2px;line-height:1.1}
      .big{font-weight:900}
      .small{font-size:12px;opacity:.7;font-weight:900}

      .tableCtl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:10px}
      .leftCtl{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      select{
        border:1px solid #ddd;border-radius:12px;padding:8px 10px;background:#fff;font-weight:900;
      }
    `;
    document.head.appendChild(st);
  }

  function fmtPairRawPct(raw, pct) {
    const r = (raw == null) ? "-" : `${raw}점`;
    const p = (pct == null) ? "-" : `${pct}p`;
    return { r, p };
  }

  function fmtDiffPair(sr, sp, cr, cp) {
    // 원점수 차이 / 백분위 차이 둘 다
    const dr = (sr != null && cr != null) ? (sr - cr) : null;
    const dp = (sp != null && cp != null) ? (sp - cp) : null;

    const drTxt = dr == null ? "-" : ((dr >= 0 ? "+" : "") + dr.toFixed(1) + "점");
    const dpTxt = dp == null ? "-" : ((dp >= 0 ? "+" : "") + dp.toFixed(1) + "p");

    // 둘 다 있으면 같이, 아니면 있는 것만
    if (dr != null && dp != null) return `${drTxt} / ${dpTxt}`;
    if (dr != null) return drTxt;
    if (dp != null) return dpTxt;
    return "-";
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

    const rowsAsc = scores
      .filter(r => String(pickId(r) ?? "") === String(sid))
      .sort((a, b) => {
        const ra = pickRound(a), rb = pickRound(b);
        if (ra != null && rb != null) return ra - rb;
        const da = pickDate(a), db = pickDate(b);
        if (da && db) return String(da).localeCompare(String(db));
        return 0;
      });

    if (!rowsAsc.length) {
      root.innerHTML = `<div class="card"><div style="color:#b00020;font-weight:900">성적 데이터 없음</div><div class="muted">scores.json에서 id=${esc(sid)} 데이터를 찾지 못했습니다.</div></div>`;
      return;
    }

    const rowsDesc = rowsAsc.slice().reverse(); // ✅ 표는 최신순이 더 직관적
    const latest = rowsDesc[0];

    // state
    let showInq = false;                 // ✅ 탐구 더보기
    let activeSub = "수학";               // 기본 수학
    let metric = "raw";                  // ✅ 학부모 기준: 그래프 기본은 원점수
    let tableMode = "recent3";           // recent3 | all | one
    let selectedLabel = "";              // tableMode=one일 때

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
        const rr = pickStudentRaw(latest, sub);
        const pp = pickStudentPct(latest, sub);
        const { r, p } = fmtPairRawPct(rr, pp);
        return `
          <div class="scorePill">
            <span class="k">${esc(sub)}</span>
            <span class="v">${esc(r)} <span style="opacity:.6;font-weight:900">(${esc(p)})</span></span>
          </div>
        `;
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
        if (!showInq && (activeSub === "탐1" || activeSub === "탐2")) activeSub = "수학";
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
      toggles.appendChild(makeBtn("원점수", metric === "raw", "subBtn", () => { metric = "raw"; renderAll(); }));
      toggles.appendChild(makeBtn("백분위(p)", metric === "pct", "subBtn", () => { metric = "pct"; renderAll(); }));

      viewCard.innerHTML = "";
      viewCard.appendChild(tabs);
      viewCard.appendChild(toggles);

      const grid = document.createElement("div");
      grid.className = "grid";
      grid.innerHTML = `
        <div class="box">
          <div style="font-weight:900;margin-bottom:10px">
            그래프 (학생 vs 컷) · ${esc(activeSub)} · ${metric === "pct" ? "백분위(p)" : "원점수"}
          </div>
          <canvas id="scoreChart" height="120"></canvas>
          <div class="muted" style="margin-top:10px">
            ※ 표/툴팁에서는 항상 <b>원점수 + 백분위</b>가 같이 표시됩니다.
          </div>
        </div>
        <div class="box">
          <div class="tableCtl">
            <div class="leftCtl" id="tableBtns"></div>
            <div class="leftCtl" id="roundPick"></div>
          </div>
          <div id="tblArea"></div>
        </div>
      `;
      viewCard.appendChild(grid);
    }

    function buildRoundOptions() {
      const labels = rowsDesc.map(r => roundLabel(r));
      const uniq = Array.from(new Set(labels));
      return uniq;
    }

    function getTableRows() {
      if (tableMode === "all") return rowsDesc;
      if (tableMode === "one") {
        const lab = selectedLabel;
        return rowsDesc.filter(r => roundLabel(r) === lab);
      }
      // recent3
      return rowsDesc.slice(0, 3);
    }

    async function renderChartAndTable() {
      await ensureChartJs();

      // ---- chart uses all rows (상세 추세 보이게) ----
      const labels = rowsAsc.map(r => roundLabel(r)); // chart는 시간순이 자연스러움

      const stuRawArr = rowsAsc.map(r => pickStudentRaw(r, activeSub));
      const stuPctArr = rowsAsc.map(r => pickStudentPct(r, activeSub));
      const cutRawArr = rowsAsc.map(r => pickCutRaw(r, activeSub));
      const cutPctArr = rowsAsc.map(r => pickCutPct(r, activeSub));

      const stuSeries = (metric === "pct") ? stuPctArr : stuRawArr;
      const cutSeries = (metric === "pct") ? cutPctArr : cutRawArr;

      const hasAnyCut = cutSeries.some(v => v != null);

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
                  const s = fmtPairRawPct(sr, sp);
                  const c = fmtPairRawPct(cr, cp);
                  return [
                    `학생: ${s.r} (${s.p})`,
                    `컷: ${c.r} (${c.p})`
                  ];
                }
              }
            }
          }
        }
      });

      // ---- table controls ----
      const btnWrap = $("#tableBtns");
      const pickWrap = $("#roundPick");
      btnWrap.innerHTML = "";
      pickWrap.innerHTML = "";

      btnWrap.appendChild(makeBtn("최근 3회", tableMode === "recent3", "subBtn", () => { tableMode = "recent3"; selectedLabel = ""; renderAll(); }));
      btnWrap.appendChild(makeBtn("전체", tableMode === "all", "subBtn", () => { tableMode = "all"; selectedLabel = ""; renderAll(); }));

      const opts = buildRoundOptions();
      const sel = document.createElement("select");
      sel.innerHTML = `
        <option value="">회차 선택(해당 회차만)</option>
        ${opts.map(x => `<option value="${esc(x)}"${(tableMode==="one" && selectedLabel===x) ? " selected" : ""}>${esc(x)}</option>`).join("")}
      `;
      sel.addEventListener("change", () => {
        const v = sel.value;
        if (!v) {
          if (tableMode === "one") { tableMode = "recent3"; selectedLabel = ""; }
        } else {
          tableMode = "one";
          selectedLabel = v;
        }
        renderAll();
      });
      pickWrap.appendChild(sel);

      // ---- table rows ----
      const tRows = getTableRows(); // 최신순 기준(표)
      const tbody = tRows.map((r) => {
        const sr = pickStudentRaw(r, activeSub);
        const sp = pickStudentPct(r, activeSub);
        const cr = pickCutRaw(r, activeSub);
        const cp = pickCutPct(r, activeSub);

        const s = fmtPairRawPct(sr, sp);
        const c = fmtPairRawPct(cr, cp);

        const diffTxt = fmtDiffPair(sr, sp, cr, cp);

        return `
          <tr>
            <td>${esc(roundLabel(r))}</td>
            <td>
              <div class="cell2">
                <div class="big">${esc(s.r)}</div>
                <div class="small">${esc(s.p)}</div>
              </div>
            </td>
            <td>
              <div class="cell2">
                <div class="big">${esc(c.r)}</div>
                <div class="small">${esc(c.p)}</div>
              </div>
            </td>
            <td class="num" style="font-weight:900">${esc(diffTxt)}</td>
          </tr>
        `;
      }).join("");

      $("#tblArea").innerHTML = `
        <div class="muted" style="margin-bottom:8px">
          표는 <b>원점수(점)</b>와 <b>백분위(p)</b>를 함께 보여줍니다.
        </div>
        <div style="overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid #eee;border-radius:14px">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th>학생 (원점수)</th>
                <th>컷 (원점수)</th>
                <th class="num">차이(점/p)</th>
              </tr>
            </thead>
            <tbody>${tbody || `<tr><td colspan="4" class="muted">표시할 데이터가 없습니다.</td></tr>`}</tbody>
          </table>
        </div>
        ${hasAnyCut ? "" : `<div class="muted" style="margin-top:10px">※ 현재 회차들에 컷 데이터가 없으면 컷이 "-"로 보일 수 있어요.</div>`}
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
