(() => {
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));

  const qs = new URLSearchParams(location.search);
  const id = qs.get("id");
  const t = qs.get("t") || qs.get("token");

  async function loadJson(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(`${path} load failed (${r.status})`);
    return r.json();
  }

  function pickId(x) {
    return x?.id ?? x?.studentId ?? x?.studentID ?? x?.["학생ID"] ?? x?.["ID"] ?? null;
  }
  function pickRound(x) {
    const v = x?.round ?? x?.Round ?? x?.["회차"] ?? x?.["차수"] ?? null;
    return v == null ? null : Number(v);
  }
  function pickDate(x) {
    return x?.date ?? x?.Date ?? x?.["날짜"] ?? x?.["일자"] ?? null;
  }

  const META_KEYS = new Set([
    "id", "studentId", "studentID", "ID", "학생ID",
    "name", "학생명", "이름", "성명",
    "round", "Round", "회차", "차수",
    "date", "Date", "날짜", "일자",
  ]);

  function findCutKey(obj, subjectKey) {
    const keys = Object.keys(obj || {});
    const s = subjectKey;

    const candidates = [
      `${s}컷`, `${s}_cut`, `${s}Cut`, `${s}cut`,
      `cut_${s}`, `Cut_${s}`, `CUT_${s}`,
      `${s}_컷`, `${s}기준`, `${s}기준점`,
    ];

    for (const c of candidates) {
      if (keys.includes(c)) return c;
    }

    const loose = keys.find(
      (k) => k !== s && k.includes(s) && (k.includes("컷") || k.toLowerCase().includes("cut"))
    );
    return loose || null;
  }

  function toNum(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function ensureChartJs() {
    return new Promise((resolve) => {
      if (window.Chart) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function injectStyles() {
    const st = document.createElement("style");
    st.textContent = `
      .score-card{border:1px solid #ddd;border-radius:18px;padding:16px;margin:14px 0;background:#fff}
      .score-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
      .score-title{font-size:18px;font-weight:900}
      .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px}
      .tab{border:1px solid #111;border-radius:999px;padding:8px 12px;background:#fff;cursor:pointer;font-weight:800}
      .tab[aria-selected="true"]{background:#111;color:#fff}
      .panel{display:none}
      .panel.active{display:block}

      /* ✅ 2열 레이아웃 */
      .grid{
        display:grid;
        grid-template-columns: 1fr;
        gap:12px;
        align-items:start; /* 표 높이에 맞춰 그래프가 늘어나는 것 방지 */
      }
      grid > * { min-width: 0; }
      @media(min-width: 860px){ .grid{grid-template-columns: 1.1fr .9fr} }
      tablebox{
  border:1px solid #eee;border-radius:14px;padding:12px;overflow:auto;
  min-width:0;}

      /* ✅ 핵심: 차트 박스 자체 높이를 고정(이러면 절대 무한히 늘지 않음) */
      .chartbox{
        border:1px solid #eee;border-radius:14px;padding:12px;
        height:340px;                 /* ← 여기로 고정 */
        display:flex;flex-direction:column;
      }
      .chart-area{
        flex:1;                       /* 남은 공간 채움 */
        min-height:0;                 /* flex에서 overflow 계산 안정 */
      }
      .chart-area canvas{
        width:100% !important;
        height:100% !important;
        display:block;
      }

      .tablebox{border:1px solid #eee;border-radius:14px;padding:12px;overflow:auto}
      table{border-collapse:collapse;width:100%;min-width:520px}
      th,td{border-bottom:1px solid #eee;padding:10px;text-align:left;font-size:14px}
      th{background:#fafafa;font-weight:900;position:sticky;top:0}
      .num{text-align:right}
      .badge{display:inline-flex;align-items:center;border:1px solid #ddd;border-radius:999px;padding:6px 10px;font-weight:800;background:#fff}
      .muted{opacity:.7}
      .warn{color:#b00020;font-weight:900}
    `;
    document.head.appendChild(st);
  }

  function renderError(container, title, detail) {
    container.innerHTML = `
      <div class="score-card">
        <div class="score-head">
          <div class="score-title">${esc(title)}</div>
        </div>
        <div class="warn">${esc(detail)}</div>
      </div>
    `;
  }

  function roundLabel(row) {
    const r = pickRound(row);
    const d = pickDate(row);
    if (r != null && d) return `#${r} (${d})`;
    if (r != null) return `#${r}`;
    if (d) return `${d}`;
    return `회차`;
  }

  function sortSubjects(arr) {
    const priority = ["국어", "수학", "영어", "한국사", "통합사회", "통합과학", "사문", "생윤"];
    return arr.slice().sort((a, b) => {
      const ia = priority.findIndex(p => a.includes(p));
      const ib = priority.findIndex(p => b.includes(p));
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b, "ko");
    });
  }

  function buildSubjectSeries(rows) {
    const subjects = new Set();

    for (const row of rows) {
      for (const k of Object.keys(row || {})) {
        if (META_KEYS.has(k)) continue;
        if (k.includes("컷") || k.toLowerCase().includes("cut")) continue;

        const v = toNum(row[k]);
        if (v != null) subjects.add(k);
      }
    }

    const subjectList = sortSubjects([...subjects]);
    const series = {};

    for (const sub of subjectList) {
      const points = [];
      for (const row of rows) {
        const score = toNum(row[sub]);
        const cutKey = findCutKey(row, sub);
        const cut = cutKey ? toNum(row[cutKey]) : null;

        points.push({
          label: roundLabel(row),
          score,
          cut,
        });
      }
      if (points.some(p => p.score != null || p.cut != null)) series[sub] = points;
    }

    return series;
  }

  function makeTabs(container, subjects) {
    const tabs = document.createElement("div");
    tabs.className = "tabs";

    const panels = document.createElement("div");

    subjects.forEach((sub, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.textContent = sub;
      btn.setAttribute("aria-selected", idx === 0 ? "true" : "false");
      btn.dataset.target = `panel_${idx}`;
      tabs.appendChild(btn);

      const panel = document.createElement("div");
      panel.className = "panel" + (idx === 0 ? " active" : "");
      panel.id = `panel_${idx}`;
      panels.appendChild(panel);

      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", "false"));
        btn.setAttribute("aria-selected", "true");
        panels.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
        panel.classList.add("active");
      });
    });

    container.appendChild(tabs);
    container.appendChild(panels);
    return panels;
  }

  function renderTable(points) {
    const rowsHtml = points.map((p) => {
      const s = p.score == null ? "" : p.score;
      const c = p.cut == null ? "" : p.cut;
      const gap = (p.score != null && p.cut != null) ? (p.score - p.cut) : "";
      return `
        <tr>
          <td>${esc(p.label)}</td>
          <td class="num">${esc(s)}</td>
          <td class="num">${esc(c)}</td>
          <td class="num">${esc(gap)}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="tablebox">
        <table>
          <thead>
            <tr>
              <th>회차</th>
              <th class="num">학생 점수</th>
              <th class="num">컷 점수</th>
              <th class="num">차이(학생-컷)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  function renderChartBox() {
    const wrap = document.createElement("div");
    wrap.className = "chartbox";
    wrap.innerHTML = `
      <div class="muted" style="margin-bottom:8px;">그래프(학생 점수 / 컷 점수)</div>
      <div class="chart-area"><canvas></canvas></div>
    `;
    return wrap;
  }

  function drawChart(canvas, points) {
    const labels = points.map(p => p.label);
    const studentData = points.map(p => (p.score == null ? null : p.score));
    const cutData = points.map(p => (p.cut == null ? null : p.cut));

    const allNums = [...studentData, ...cutData].filter(v => typeof v === "number");
    const min = allNums.length ? Math.min(...allNums) : 0;
    const max = allNums.length ? Math.max(...allNums) : 100;

    const pad = 5;
    const yMin = Math.max(0, Math.floor((min - pad) / 5) * 5);
    const yMax = Math.min(200, Math.ceil((max + pad) / 5) * 5);

    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "학생 점수", data: studentData, tension: 0.25, spanGaps: true, pointRadius: 4 },
          { label: "컷 점수", data: cutData, tension: 0.25, spanGaps: true, pointRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // chartbox 고정 높이를 그대로 사용
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items?.[0]?.dataIndex;
                if (idx == null) return "";
                const p = points[idx];
                const s = p.score == null ? "-" : p.score;
                const c = p.cut == null ? "-" : p.cut;
                const g = (p.score != null && p.cut != null) ? (p.score - p.cut) : "-";
                return [`학생: ${s}`, `컷: ${c}`, `차이: ${g}`];
              }
            }
          }
        },
        scales: {
          y: { suggestedMin: yMin, suggestedMax: yMax, ticks: { stepSize: 5 } }
        }
      }
    });
  }

  async function main() {
    injectStyles();

    const detail = $("#detail");
    if (!detail) return;

    if (!id && !t) {
      renderError(detail, "데이터 표시 불가", "id 또는 t(토큰) 파라미터가 없습니다.");
      return;
    }

    let scores;
    try {
      scores = await loadJson("./scores.json");
    } catch (e) {
      renderError(detail, "scores.json 로딩 실패", e.message);
      return;
    }

    if (!Array.isArray(scores)) {
      renderError(detail, "scores.json 형식 오류", "scores.json은 배열(Array) 형태여야 합니다.");
      return;
    }

    const rows = scores
      .filter(r => String(pickId(r)) === String(id))
      .map(r => ({ ...r }))
      .sort((a, b) => {
        const ra = pickRound(a);
        const rb = pickRound(b);
        if (ra != null && rb != null) return ra - rb;
        const da = pickDate(a);
        const db = pickDate(b);
        if (da && db) return String(da).localeCompare(String(db));
        return 0;
      });

    if (!rows.length) {
      renderError(detail, "성적 데이터 없음", `scores.json에서 id=${id} 데이터를 찾지 못했습니다.`);
      return;
    }

    const series = buildSubjectSeries(rows);
    const subjects = Object.keys(series);

    const latest = rows[rows.length - 1];
    const topCard = document.createElement("div");
    topCard.className = "score-card";
    topCard.innerHTML = `
      <div class="score-head">
        <div class="score-title">성적/그래프</div>
        <span class="badge">최신: ${esc(roundLabel(latest))}</span>
        <span class="badge muted">과목 수: ${subjects.length}</span>
      </div>
      <div class="muted">과목 탭을 눌러 회차별 “학생 점수 + 컷 점수”를 그래프/표로 확인하세요.</div>
    `;
    detail.appendChild(topCard);

    const card = document.createElement("div");
    card.className = "score-card";
    detail.appendChild(card);

    const panelsWrap = makeTabs(card, subjects);

    const chartOk = await ensureChartJs();

    subjects.forEach((sub, idx) => {
      const panel = panelsWrap.querySelector(`#panel_${idx}`);
      const points = series[sub];

      const grid = document.createElement("div");
      grid.className = "grid";

      if (chartOk) {
        const chartBox = renderChartBox();
        grid.appendChild(chartBox);

        const tableBox = document.createElement("div");
        tableBox.innerHTML = renderTable(points);
        grid.appendChild(tableBox);

        panel.appendChild(grid);

        const canvas = chartBox.querySelector("canvas");
        drawChart(canvas, points);
      } else {
        panel.innerHTML = `
          <div class="warn" style="margin-bottom:8px;">그래프 라이브러리 로딩 실패 → 표로만 표시합니다.</div>
          ${renderTable(points)}
        `;
      }
    });
  }

  main().catch((e) => {
    const detail = document.querySelector("#detail");
    if (detail) renderError(detail, "오류", e.message || String(e));
  });
})();
