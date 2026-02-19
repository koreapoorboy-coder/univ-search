// student.js (PATCH: 회차 토글로 카드 갱신)
// - 기본: 최신 회차 선택
// - 상단에 "회차 토글(칩)" + 모바일용 select 제공
// - 클릭/선택 시 카드(국/수/영/탐1/탐2) 즉시 교체

(async function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  const qs = new URLSearchParams(location.search);
  const sid = qs.get("id");

  async function loadJson(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(`${path} load failed (${r.status})`);
    return r.json();
  }

  function toNum(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (!s) return null;
    const cleaned = s.replace(/[^0-9.+-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function pickId(x) {
    return x?.id ?? x?.studentId ?? x?.studentID ?? x?.["ID"] ?? x?.["학생ID"] ?? null;
  }
  function pickRound(x) {
    const v = x?.round ?? x?.Round ?? x?.["회차"] ?? x?.["차수"];
    return v == null ? null : Number(v);
  }
  function pickDate(x) {
    return x?.date ?? x?.Date ?? x?.["날짜"] ?? x?.["일자"] ?? null;
  }

  // scores.json이 배열이 아닐 때도 펼치기(기존 2번 패치와 호환)
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

  // ✅ 과목 키
  const SUBS = ["국어", "수학", "영어", "탐1", "탐2"];

  // ✅ row에서 원점수/백분위/등급 읽기 (키는 유연하게)
  function readSub(row, sub) {
    // 예: 국어_raw, 국어_pct, 국어_grade
    const raw = toNum(row?.[`${sub}_raw`]) ?? toNum(row?.[sub]) ?? null;
    const pct = toNum(row?.[`${sub}_pct`]) ?? toNum(row?.[`${sub}p`]) ?? null;

    // 등급 키: 국어_grade / 국어등급 / 국어_등급 등도 허용
    const g =
      toNum(row?.[`${sub}_grade`]) ??
      toNum(row?.[`${sub}등급`]) ??
      toNum(row?.[`${sub}_등급`]) ??
      null;

    return { raw, pct, grade: g };
  }

  function roundLabel(row) {
    const r = pickRound(row);
    const d = pickDate(row);
    if (r != null && d) return `#${r} (${d})`;
    if (r != null) return `#${r}`;
    if (d) return String(d);
    return "-";
  }

  // ✅ 카드 렌더 (점수 오른쪽에 등급)
  function scoreCard(sub, data) {
    const raw = data.raw == null ? "-" : `${data.raw}점`;
    const pct = data.pct == null ? "-" : `${data.pct}p`;
    const grade = data.grade == null ? "" : `${data.grade}등급`;

    return `
      <div class="sCard">
        <div class="sTop">
          <div class="sSub">${esc(sub)}</div>
          <div class="sPct">${esc(pct)}</div>
        </div>
        <div class="sBottom">
          <div class="sRaw">${esc(raw)}</div>
          ${grade ? `<div class="sGrade">${esc(grade)}</div>` : ``}
        </div>
      </div>
    `;
  }

  // ✅ 회차 토글 UI + 카드 갱신
  function render(detailEl, rows) {
    // 최신이 맨 마지막이라고 가정(정렬된 rows)
    let selectedIdx = rows.length - 1;

    function paint() {
      const row = rows[selectedIdx];
      const label = roundLabel(row);

      // 카드 5개
      const cards = SUBS.map(sub => scoreCard(sub, readSub(row, sub))).join("");

      // 회차 칩 (PC)
      const pills = rows.map((r, i) => {
        const active = (i === selectedIdx);
        return `
          <button type="button" class="rPill" data-i="${i}" aria-pressed="${active ? "true" : "false"}">
            ${esc(roundLabel(r))}
          </button>
        `;
      }).join("");

      // 모바일 select
      const opts = rows.map((r, i) => {
        const sel = i === selectedIdx ? "selected" : "";
        return `<option value="${i}" ${sel}>${esc(roundLabel(r))}</option>`;
      }).join("");

      detailEl.innerHTML = `
        <style>
          .box{border:1px solid #ddd;border-radius:18px;padding:16px;margin:12px 0;background:#fff}
          .headRow{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
          .hTitle{font-weight:900;font-size:18px}
          .hHint{opacity:.7;font-weight:800;font-size:12px}

          /* 회차 선택 */
          .roundWrap{margin-top:10px}
          .roundPills{display:flex;gap:8px;flex-wrap:nowrap;overflow:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
          .roundPills::-webkit-scrollbar{display:none}
          .rPill{
            border:1px solid #111;border-radius:999px;background:#fff;
            padding:8px 12px;font-weight:900;white-space:nowrap;cursor:pointer
          }
          .rPill[aria-pressed="true"]{background:#111;color:#fff}
          .roundSelect{display:none;width:100%;border:1px solid #ddd;border-radius:12px;padding:12px 14px;font-weight:900;background:#fff}

          /* 점수 카드 */
          .grid{display:grid;grid-template-columns:repeat(5, 1fr);gap:12px;margin-top:12px}
          .sCard{border:1px solid #eee;border-radius:16px;padding:14px}
          .sTop{display:flex;justify-content:space-between;align-items:center;gap:10px}
          .sSub{font-weight:900;font-size:14px}
          .sPct{font-weight:900;opacity:.75}
          .sBottom{margin-top:10px;display:flex;align-items:baseline;gap:10px}
          .sRaw{font-weight:1000;font-size:26px;letter-spacing:-0.5px}
          .sGrade{font-weight:1000;font-size:14px;opacity:.8}

          /* CTA */
          .ctaRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
          .btn{
            display:inline-block;border:1px solid #111;border-radius:12px;padding:10px 14px;
            text-decoration:none;color:#111;background:#fff;font-weight:900
          }
          .btn:active{transform:scale(0.99)}
          .btn.primary{background:#111;color:#fff}

          /* 모바일 최적화 */
          @media(max-width:860px){
            .grid{grid-template-columns:repeat(2, 1fr)}
            .roundPills{display:none}
            .roundSelect{display:block}
            .sRaw{font-size:24px}
          }
        </style>

        <div class="box">
          <div class="headRow">
            <div class="hTitle">최신 성적: <span style="font-weight:1000">${esc(label)}</span></div>
            <div class="hHint">원점수 + 백분위(p) + 등급</div>
          </div>

          <div class="roundWrap">
            <select class="roundSelect" id="roundSelect">${opts}</select>
            <div class="roundPills" id="roundPills">${pills}</div>
          </div>

          <div class="grid">${cards}</div>

          <div class="ctaRow">
            <a class="btn primary" id="goUniv" href="./univ_list.html?${sid ? `id=${encodeURIComponent(sid)}` : ""}">대학 상향/적정 보기</a>
            <a class="btn" id="goProg" href="./progress_detail.html?${sid ? `id=${encodeURIComponent(sid)}` : ""}">진도/상담 보기</a>
          </div>
        </div>
      `;

      // 이벤트 바인딩
      const pillsEl = detailEl.querySelector("#roundPills");
      if (pillsEl) {
        pillsEl.querySelectorAll(".rPill").forEach(b => {
          b.addEventListener("click", () => {
            selectedIdx = Number(b.dataset.i);
            paint();
          });
        });
      }
      const sel = detailEl.querySelector("#roundSelect");
      if (sel) {
        sel.addEventListener("change", () => {
          selectedIdx = Number(sel.value);
          paint();
        });
      }
    }

    paint();
  }

  // --- main ---
  try {
    const detailEl = $("#detail") || document.body;

    if (!sid) {
      detailEl.innerHTML = `<div style="padding:16px;font-weight:900;color:#b00020">id 파라미터가 없습니다. (예: student.html?id=shstudy01)</div>`;
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
      detailEl.innerHTML = `<div style="padding:16px;font-weight:900;opacity:.75">표시할 데이터가 없습니다.</div>`;
      return;
    }

    render(detailEl, rows);
  } catch (e) {
    const detailEl = $("#detail") || document.body;
    detailEl.innerHTML = `<div style="padding:16px;font-weight:900;color:#b00020">로딩 오류: ${esc(e.message)}</div>`;
  }
})();
