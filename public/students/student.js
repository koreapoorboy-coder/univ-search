/*
  student.js (v3)
  - 모바일 가독성 최우선: 기본은 '최신 성적'만 보여줌
  - 이전 성적은 토글(details)로 확인
  - 대학 상향/적정, 진도 보기 버튼을 상단에 고정 노출
  - scores.json은 배열이 아니어도 자동으로 펼쳐서 읽음
*/

(function(){
  const $ = (s)=>document.querySelector(s);
  const esc = (s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const norm = (v)=>String(v??"").trim();

  // --- ctx from student.html ---
  const CTX = window.__STUDENT_CTX__ || {};
  const ADMIN_TOKEN = CTX.ADMIN_TOKEN || "CHANGE_ME_ADMIN";
  const isAdmin = !!CTX.isAdmin;
  const idParam = CTX.idParam || null;
  const tokenParam = CTX.tokenParam || null;

  async function loadJson(path){
    const r = await fetch(path, { cache:"no-store" });
    if(!r.ok) throw new Error(path+" load failed ("+r.status+")");
    return r.json();
  }

  // ✅ 숫자 파서: "96p", "96%", " 96 " 모두 허용
  function toNum(v){
    if(v==null || v==="") return null;
    if(typeof v==="number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if(!s) return null;
    const cleaned = s.replace(/[^0-9.+-]/g,"");
    if(!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function pickName(s){
    return s.studentName ?? s.studentname ?? s.name ?? s["학생명"] ?? s["이름"] ?? s["성명"] ?? s.id ?? "-";
  }
  function pickId(s){
    return s.id ?? s.studentId ?? s.studentID ?? s["ID"] ?? s["학생ID"] ?? s["학번"] ?? null;
  }
  function pickToken(s){
    return s.token ?? s.accessToken ?? s.key ?? s["token"] ?? s["토큰"] ?? null;
  }
  function pickRound(x){
    const v = x?.round ?? x?.Round ?? x?.["회차"] ?? x?.["차수"]; 
    return v==null ? null : Number(v);
  }
  function pickDate(x){
    return x?.date ?? x?.Date ?? x?.["날짜"] ?? x?.["일자"] ?? null;
  }

  function roundLabel(row){
    const r = pickRound(row);
    const d = pickDate(row);
    if(r!=null && d) return `#${r} (${d})`;
    if(r!=null) return `#${r}`;
    if(d) return String(d);
    return "-";
  }

  // ✅ scores.json이 배열이 아니어도 최대한 펼쳐서 배열로 만들기
  function normalizeArrayish(x){
    if(Array.isArray(x)) return x.slice();
    if(!x || typeof x!=="object") return [];

    for(const k of ["records","rows","items","data","scores"]){
      if(Array.isArray(x[k])) return x[k].slice();
    }

    const out = [];
    for(const [k,v] of Object.entries(x)){
      if(Array.isArray(v)) out.push(...v.map(r => ({...r, id:(r?.id ?? k)})));
      else if(v && typeof v==="object") out.push({...v, id:(v?.id ?? k)});
    }
    return out;
  }

  const SUBS = ["국어","수학","영어","탐1","탐2"]; // ✅ 화면은 5과목만

  // ✅ 학생 점수(원점수) + 백분위(p) 둘 다 뽑기
  function buildStudentMaps(row){
    const getFirst = (keys) => {
      for(const k of keys){
        const v = toNum(row?.[k]);
        if(v!=null) return v;
      }
      return null;
    };

    const KEYS = {
      "국어": { raw:["국어_raw","국어","국","국어점","국어점수"], pct:["국어_pct","국어p","국어P","국어백분위","국어 백분위"] },
      "수학": { raw:["수학_raw","수학","수","수학점","수학점수"], pct:["수학_pct","수학p","수학P","수학백분위","수학 백분위"] },
      "영어": { raw:["영어_raw","영어","영","영어점","영어점수"], pct:["영어_pct","영어p","영어P","영어백분위","영어 백분위"] },
      "탐1": { raw:["탐1_raw","탐1","탐구1","탐_1","탐구_1","생윤","윤리"], pct:["탐1_pct","탐1p","탐구1p","생윤_pct","생윤p","윤리_pct","윤리p"] },
      "탐2": { raw:["탐2_raw","탐2","탐구2","탐_2","탐구_2","사문","사회"], pct:["탐2_pct","탐2p","탐구2p","사문_pct","사문p","사회_pct","사회p"] },
    };

    const raw = {}; const pct = {};
    for(const k of SUBS){
      raw[k] = getFirst(KEYS[k].raw);
      pct[k] = getFirst(KEYS[k].pct);
    }
    return { raw, pct };
  }

  function fmtScore(raw, pct){
    const r = (raw==null) ? "-" : `${raw}점`;
    const p = (pct==null) ? "-" : `${pct}p`;
    return { r, p };
  }

  function renderLatestCards(latest, stuRaw, stuPct){
    $("#latestLabel").textContent = `최신 성적: ${roundLabel(latest)}`;

    const cards = SUBS.map(k=>{
      const {r,p} = fmtScore(stuRaw[k], stuPct[k]);
      return `
        <div class="scard">
          <div class="sc-top">
            <div class="sc-name">${esc(k)}</div>
            <div class="sc-pct">${esc(p)}</div>
          </div>
          <div class="sc-raw">${esc(r)}</div>
        </div>
      `;
    }).join("");
    $("#cards").innerHTML = cards;
  }

  function tdScore(raw, pct){
    const r = (raw==null) ? "-" : String(raw);
    const p = (pct==null) ? "-" : String(pct);
    return `${esc(r)}점 <span class="p">${esc(p)}p</span>`;
  }

  function renderHistory(rows){
    // 최신순
    const sorted = rows.slice().sort((a,b)=>{
      const ra = pickRound(a), rb = pickRound(b);
      if(ra!=null && rb!=null) return rb-ra;
      const da = pickDate(a), db = pickDate(b);
      if(da && db) return String(db).localeCompare(String(da));
      return 0;
    });

    // 최근 3회
    const recent = sorted.slice(0,3);
    $("#recentTbody").innerHTML = recent.map(r=>{
      const m = buildStudentMaps(r);
      return `
        <tr>
          <td class="round">${esc(roundLabel(r))}</td>
          <td>${tdScore(m.raw["국어"], m.pct["국어"])}</td>
          <td>${tdScore(m.raw["수학"], m.pct["수학"])}</td>
          <td>${tdScore(m.raw["영어"], m.pct["영어"])}</td>
          <td>${tdScore(m.raw["탐1"], m.pct["탐1"])}</td>
          <td>${tdScore(m.raw["탐2"], m.pct["탐2"])}</td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6" class="muted">표시할 데이터가 없습니다.</td></tr>`;

    // 전체 회차
    const sel = $("#jumpSel");
    sel.innerHTML = sorted.map((r,idx)=>{
      return `<option value="${idx}">${esc(roundLabel(r))}</option>`;
    }).join("");

    function renderAll(idx){
      const r = sorted[idx] || sorted[0];
      const m = buildStudentMaps(r);
      $("#allTbody").innerHTML = `
        <tr>
          <td class="round">${esc(roundLabel(r))}</td>
          <td>${tdScore(m.raw["국어"], m.pct["국어"])}</td>
          <td>${tdScore(m.raw["수학"], m.pct["수학"])}</td>
          <td>${tdScore(m.raw["영어"], m.pct["영어"])}</td>
          <td>${tdScore(m.raw["탐1"], m.pct["탐1"])}</td>
          <td>${tdScore(m.raw["탐2"], m.pct["탐2"])}</td>
        </tr>
      `;
    }
    sel.addEventListener("change", ()=>renderAll(Number(sel.value||0)));
    renderAll(0);

    // 회차가 3개 이하면 '최근 3회' 섹션 문구를 조금 바꿈
    $("#historyHint").textContent = sorted.length <= 3
      ? "이전 성적(전체)"
      : "이전 성적(최근 3회)";
  }

  async function main(){
    // 1) 학생 찾기
    const students = await loadJson("./students.json");
    if(!Array.isArray(students)) throw new Error("students.json is not an array");

    let student = null;
    if(isAdmin && idParam){
      student = students.find(s => norm(pickId(s)) === norm(idParam));
    }
    if(!student && tokenParam){
      student = students.find(s => norm(pickToken(s)) === norm(tokenParam));
    }
    if(!student){
      $("#hdrName").textContent = "접근 권한이 없습니다";
      $("#hdrMeta").innerHTML = `<div class="warn">학생 정보를 찾을 수 없습니다.</div>`;
      $("#main").style.display = "none";
      return;
    }

    const sid = norm(pickId(student));
    const stok = norm(pickToken(student));
    const name = pickName(student);

    // 2) 헤더
    $("#hdrName").textContent = sid ? `${name} (${sid})` : `${name}`;
    $("#hdrMeta").innerHTML = `
      <div class="kv">
        <div class="k">학교</div><div class="v">${esc(student.school||"-")}</div>
        <div class="k">진로</div><div class="v">${esc(student.career||"-")}</div>
        <div class="k">전형</div><div class="v">${esc(student.admission||"-")}</div>
      </div>
    `;
    $("#modeBadge").innerHTML = isAdmin
      ? `<span class="pill">관리자</span><span class="subpill">id 접속</span>`
      : `<span class="pill">학생/학부모</span><span class="subpill">토큰 접속</span>`;

    // 3) 버튼(항상 노출)
    const univHref = isAdmin
      ? `./univ_list.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(ADMIN_TOKEN)}`
      : `./univ_list.html?t=${encodeURIComponent(stok)}`;

    const progHref = isAdmin
      ? `./progress_detail.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(ADMIN_TOKEN)}`
      : `./progress_detail.html?t=${encodeURIComponent(stok)}`;

    const buttons = [];
    if(isAdmin){
      buttons.push(`<a class="btn ghost" href="./index.html?admin=${encodeURIComponent(ADMIN_TOKEN)}">학생 목록</a>`);
    }
    buttons.push(`<a class="btn" href="${univHref}">대학 상향/적정</a>`);
    buttons.push(`<a class="btn" href="${progHref}">진도 보기</a>`);
    $("#hdrButtons").innerHTML = buttons.join("");

    // 4) scores.json 로드
    const rawScores = await loadJson("./scores.json");
    const scores = normalizeArrayish(rawScores);

    const rows = scores
      .filter(r => norm(pickId(r)) === sid)
      .sort((a,b)=>{
        const ra = pickRound(a), rb = pickRound(b);
        if(ra!=null && rb!=null) return ra-rb;
        const da = pickDate(a), db = pickDate(b);
        if(da && db) return String(da).localeCompare(String(db));
        return 0;
      });

    if(!rows.length){
      $("#latestLabel").textContent = "성적 데이터 없음";
      $("#cards").innerHTML = `<div class="muted">scores.json에서 ${esc(sid)} 데이터를 찾지 못했습니다.</div>`;
      return;
    }

    const latest = rows[rows.length-1];
    const maps = buildStudentMaps(latest);

    renderLatestCards(latest, maps.raw, maps.pct);
    renderHistory(rows);
  }

  main().catch(err=>{
    $("#hdrName").textContent = "오류";
    $("#hdrMeta").innerHTML = `<div class="warn">로딩 오류</div><div class="muted">${esc(err.message)}</div>`;
    console.error(err);
  });
})();
