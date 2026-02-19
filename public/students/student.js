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

  // 세션 키(학생/학부모 모드에서 URL 파라미터가 빠져도 복구)
  const SS_T = \"__STU_TOKEN__\";
  const SS_ID = \"__STU_ID__\";

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
// ✅ 학생 점수(원점수) + 백분위(p) + 등급(grade) 뽑기
function buildStudentMaps(row){
  const getFirst = (keys) => {
    for(const k of keys){
      const v = toNum(row?.[k]);
      if(v!=null) return v;
    }
    return null;
  };

  const KEYS = {
    "국어": {
      raw:["국어","국","국어점","국어점수","국어 원점수","국어원점수","kor","korean","국어_raw"],
      pct:["국어p","국어P","국어_pct","국어백분위","국어 백분위","국어퍼센타일","국어percentile","kor_p","kor_pct"],
      grade:["국어g","국어G","국어_grade","국어등급","국어 등급","kor_g","kor_grade"]
    },
    "수학": {
      raw:["수학","수","수학점","수학점수","수학 원점수","수학원점수","math","수학_raw"],
      pct:["수학p","수학P","수학_pct","수학백분위","수학 백분위","math_p","math_pct"],
      grade:["수학g","수학G","수학_grade","수학등급","수학 등급","math_g","math_grade"]
    },
    "영어": {
      raw:["영어","영","영어점","영어점수","영어 원점수","영어원점수","eng","english","영어_raw"],
      pct:["영어p","영어P","영어_pct","영어백분위","영어 백분위","eng_p","eng_pct"],
      grade:["영어g","영어G","영어_grade","영어등급","영어 등급","eng_g","eng_grade"]
    },
    "탐1": {
      raw:["탐1","탐구1","탐_1","탐구_1","탐1점","탐1점수","탐1 원점수","탐1원점수","탐1_raw",
           "생윤","생윤점","생윤점수","윤리","윤리점수","윤리점"],
      pct:["탐1p","탐구1p","탐1_pct","탐1백분위","탐1 백분위","탐구1_pct",
           "생윤p","생윤P","생윤_pct","생윤백분위","윤리p","윤리_pct"],
      grade:["탐1g","탐1G","탐1_grade","탐1등급","탐1 등급","탐구1등급","탐구1_grade","탐구1 등급",
             "생윤g","생윤_grade","생윤등급","윤리g","윤리_grade","윤리등급"]
    },
    "탐2": {
      raw:["탐2","탐구2","탐_2","탐구_2","탐2점","탐2점수","탐2 원점수","탐2원점수","탐2_raw",
           "사문","사문점","사문점수","사회","사회점수","사회점"],
      pct:["탐2p","탐구2p","탐2_pct","탐2백분위","탐2 백분위","탐구2_pct",
           "사문p","사문P","사문_pct","사문백분위","사회p","사회_pct"],
      grade:["탐2g","탐2G","탐2_grade","탐2등급","탐2 등급","탐구2등급","탐구2_grade","탐구2 등급",
             "사문g","사문_grade","사문등급","사회g","사회_grade","사회등급"]
    },
  };

  const raw = {};
  const pct = {};
  const grade = {};
  for(const k of SUBS){
    raw[k] = getFirst(KEYS[k].raw);
    pct[k] = getFirst(KEYS[k].pct);
    grade[k] = getFirst(KEYS[k].grade);
  }
  return { raw, pct, grade };
}

function fmtScore(raw, pct, grade){
  const r = (raw==null) ? "-" : `${raw}점`;
  const p = (pct==null) ? "-" : `${pct}p`;
  const gNum = toNum(grade);
  const g = (gNum==null) ? null : `${gNum}등급`;
  return {r,p,g};
}

  function renderLatestCards(latest, stuRaw, stuPct, stuGrade){
    $("#latestLabel").textContent = `최신 성적: ${roundLabel(latest)}`;

    const cards = SUBS.map(k=>{
      const {r,p,g} = fmtScore(stuRaw[k], stuPct[k], stuGrade?.[k]);
      return `
        <div class="scard">
          <div class="sc-top">
            <div class="sc-name">${esc(k)}</div>
            <div class="sc-pct">${esc(p)}</div>
          </div>
          <div class="sc-mid">
            <div class="sc-raw">${esc(r)}</div>
            ${g?`<div class="sc-grade">${esc(g)}</div>`:""}
          </div>
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
          <td>${tdScore(m.raw["국어"], m.pct["국어"], m.grade["국어"])}</td>
          <td>${tdScore(m.raw["수학"], m.pct["수학"], m.grade["수학"])}</td>
          <td>${tdScore(m.raw["영어"], m.pct["영어"], m.grade["영어"])}</td>
          <td>${tdScore(m.raw["탐1"], m.pct["탐1"], m.grade["탐1"])}</td>
          <td>${tdScore(m.raw["탐2"], m.pct["탐2"], m.grade["탐2"])}</td>
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
          <td>${tdScore(m.raw["국어"], m.pct["국어"], m.grade["국어"])}</td>
          <td>${tdScore(m.raw["수학"], m.pct["수학"], m.grade["수학"])}</td>
          <td>${tdScore(m.raw["영어"], m.pct["영어"], m.grade["영어"])}</td>
          <td>${tdScore(m.raw["탐1"], m.pct["탐1"], m.grade["탐1"])}</td>
          <td>${tdScore(m.raw["탐2"], m.pct["탐2"], m.grade["탐2"])}</td>
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

    // 세션에 저장 (페이지 이동 시 파라미터 누락 대비)
    try{
      if(sid) sessionStorage.setItem(SS_ID, sid);
      const tokToStore = norm(tokenParam) || stok;
      if(tokToStore) sessionStorage.setItem(SS_T, tokToStore);
    }catch(e){}

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
    const tokForLink = norm(tokenParam) || stok;
    const univHref = isAdmin
      ? `./univ_list.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(ADMIN_TOKEN)}`
      : `./univ_list.html?t=${encodeURIComponent(tokForLink)}`;

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

    renderLatestCards(latest, maps.raw, maps.pct, maps.grade);
    renderHistory(rows);
  }

  main().catch(err=>{
    $("#hdrName").textContent = "오류";
    $("#hdrMeta").innerHTML = `<div class="warn">로딩 오류</div><div class="muted">${esc(err.message)}</div>`;
    console.error(err);
  });
})();
