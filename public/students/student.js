(() => {
  const ADMIN_TOKEN = "CHANGE_ME_ADMIN";
  const norm = (v) => String(v ?? "").trim();

  const qs = new URLSearchParams(location.search);
  const adminParam = qs.get("admin");
  const idParam = qs.get("id");
  const tParam = qs.get("t") || qs.get("token");

  const isAdmin = (norm(adminParam) === norm(ADMIN_TOKEN));

  const $ = (s) => document.querySelector(s);
  const esc = (s)=>String(s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

  async function loadJson(path){
    const r = await fetch(path, { cache:"no-store" });
    if(!r.ok) throw new Error(`${path} load failed (${r.status})`);
    return r.json();
  }

  function pickName(s){ return s.studentName ?? s.studentname ?? s.name ?? s["학생명"] ?? s["이름"] ?? s["성명"] ?? s.id ?? "-"; }
  function pickId(s){ return s.id ?? s.studentId ?? s.studentID ?? s["ID"] ?? s["학생ID"] ?? s["학번"] ?? null; }
  function pickToken(s){ return s.token ?? s.accessToken ?? s.key ?? s["token"] ?? s["토큰"] ?? null; }
  function pickRound(x){ const v = x?.round ?? x?.Round ?? x?.["회차"] ?? x?.["차수"]; return v==null?null:Number(v); }
  function pickDate(x){ return x?.date ?? x?.Date ?? x?.["날짜"] ?? x?.["일자"] ?? null; }

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

  function roundLabel(row){
    const r = pickRound(row);
    const d = pickDate(row);
    if(r!=null && d) return `#${r} (${d})`;
    if(r!=null) return `#${r}`;
    if(d) return String(d);
    return "-";
  }

  // 표시 과목 순서 (요청: 5과목)
  const SUBS = ["국어","수학","영어","탐1","탐2"];

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

  // ✅ 과목별 원점수/백분위/컷(1등급컷) 키를 폭넓게 허용
  function buildMaps(row){
    const getFirst = (keys) => {
      for(const k of keys){
        const v = toNum(row?.[k]);
        if(v!=null) return v;
      }
      return null;
    };

    const KEYS = {
      "국어": { raw:["국어","국","국어점수","국어_raw"], pct:["국어p","국어_pct","국어백분위"], cut:["국어컷","국어_cut","국어cut","국어_1컷","국어1컷","국어1컷점수"] },
      "수학": { raw:["수학","수","수학점수","수학_raw"], pct:["수학p","수학_pct","수학백분위"], cut:["수학컷","수학_cut","수학cut","수학_1컷","수학1컷","수학1컷점수"] },
      "영어": { raw:["영어","영","영어점수","영어_raw"], pct:["영어p","영어_pct","영어백분위"], cut:["영어컷","영어_cut","영어cut","영어_1컷","영어1컷","영어1컷점수"] },
      "탐1": { raw:["탐1_raw","탐1","탐구1","탐구1_raw","생윤","생윤점수","tam1_raw"], pct:["탐1p","탐1_pct","탐1백분위","생윤p","생윤_pct"], cut:["탐1컷","탐1_cut","탐1cut","탐구1컷","탐구1_cut","생윤컷","생윤_cut"] },
      "탐2": { raw:["탐2_raw","탐2","탐구2","탐구2_raw","사문","사문점수","tam2_raw"], pct:["탐2p","탐2_pct","탐2백분위","사문p","사문_pct"], cut:["탐2컷","탐2_cut","탐2cut","탐구2컷","탐구2_cut","사문컷","사문_cut"] },
    };

    const raw = {}, pct = {}, cut = {};
    for(const k of SUBS){
      raw[k] = getFirst(KEYS[k].raw);
      pct[k] = getFirst(KEYS[k].pct);
      cut[k] = getFirst(KEYS[k].cut);
    }
    return { raw, pct, cut };
  }

  // ✅ 현재 규칙: 회차별 1등급 컷(원점수 기준)만 입력한다고 가정
  // raw >= cut => 1등급, 아니면 2등급
  function gradeFromCut(raw, cut){
    if(raw==null || cut==null) return ""; // 컷이 없으면 표시 안 함
    return (raw >= cut) ? "1등급" : "2등급";
  }

  function showErr(title, msg){
    $("#errCard").style.display = "block";
    $("#scoreCard").style.display = "none";
    $("#errTitle").textContent = title;
    $("#errMsg").textContent = msg;
  }

  async function main(){
    const students = await loadJson("./students.json");
    if(!Array.isArray(students)) throw new Error("students.json is not an array");

    // ✅ 보안: 학생모드는 token만 / 관리자만 id 허용
    let student = null;
    if(isAdmin && idParam){
      student = students.find(s => norm(pickId(s)) === norm(idParam));
    }
    if(!student && tParam){
      student = students.find(s => norm(pickToken(s)) === norm(tParam));
    }
    if(!student){
      $("#hdr").textContent = "접근 권한이 없습니다.";
      $("#meta").innerHTML = `
        <div class="warn">학생을 찾을 수 없습니다.</div>
        <div class="muted">관리자: student.html?id=학생ID&admin=관리자토큰 / 학생: student.html?t=개별토큰</div>
      `;
      return;
    }

    const sid = norm(pickId(student));
    const stok = norm(pickToken(student));
    const name = pickName(student);

    $("#hdr").innerHTML = `${esc(name)} (${esc(sid)})`;

    const meta = [];
    meta.push(`학교: ${esc(student.school||"-")}`);
    meta.push(`진로: ${esc(student.career||"-")}`);
    meta.push(`전형: ${esc(student.admission||"-")}`);
    $("#meta").innerHTML = meta.join("<br>");

    $("#modeRow").innerHTML = isAdmin
      ? `<span class="pill">관리자</span><span class="pill" style="border-color:#ddd;font-weight:800">id 접속</span>`
      : `<span class="pill">학부모/학생</span><span class="pill" style="border-color:#ddd;font-weight:800">토큰 접속</span>`;

    const univHref = isAdmin
      ? `./univ_list.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(adminParam)}`
      : `./univ_list.html?t=${encodeURIComponent(stok)}`;

    const progHref = isAdmin
      ? `./progress_detail.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(adminParam)}`
      : `./progress_detail.html?t=${encodeURIComponent(stok)}`;

    const nav = [];
    if(isAdmin) nav.push(`<a class="btn" href="./index.html?admin=${encodeURIComponent(adminParam)}">학생 목록</a>`);
    nav.push(`<a class="btn" href="${univHref}">대학 상향/적정</a>`);
    nav.push(`<a class="btn" href="${progHref}">진도 보기</a>`);
    $("#navRow").innerHTML = nav.join("");

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
      showErr("성적 데이터 없음", `scores.json에서 id=${sid} 데이터를 찾지 못했습니다.`);
      return;
    }

    // 최신 회차
    const latest = rows[rows.length - 1];
    const { raw, pct, cut } = buildMaps(latest);

    $("#scoreCard").style.display = "block";
    $("#scoreTitle").textContent = `최신 성적: ${roundLabel(latest)}`;
    $("#scoreRound").textContent = roundLabel(latest);

    // 최신 카드 렌더
    $("#latestGrid").innerHTML = SUBS.map(k => {
      const r = raw[k];
      const p = pct[k];
      const c = cut[k];
      const g = gradeFromCut(r, c);

      const pctTxt = (p==null) ? "-" : `${p}p`;
      const rawTxt = (r==null) ? "-" : `${r}`;
      const gradeTxt = g ? `<span class="grade">${esc(g)}</span>` : "";
      return `
        <div class="scoreItem">
          <div class="scoreTop">
            <div class="k">${esc(k)}</div>
            <div class="pct">${esc(pctTxt)}</div>
          </div>
          <div class="bigline">
            <div class="big">${esc(rawTxt)}<span class="unit">점</span></div>
            ${gradeTxt}
          </div>
        </div>
      `;
    }).join("");

    // 이전 성적
    if(rows.length >= 2){
      const past = rows.slice(0, -1).reverse(); // 최신 이전부터
      $("#pastBox").style.display = "block";
      $("#pastList").innerHTML = past.map(r => {
        const m = buildMaps(r);
        const chips = SUBS.map(k=>{
          const rr = m.raw[k]; const pp = m.pct[k]; const cc = m.cut[k];
          const gg = gradeFromCut(rr, cc);
          const left = `${k}`;
          const right = `${rr==null?'-':rr}점/${pp==null?'-':pp}p${gg?` · ${gg}`:''}`;
          return `<div class="pastChip"><span>${esc(left)}</span><span class="p">${esc(right)}</span></div>`;
        }).join("");
        return `
          <div class="pastRow">
            <div class="r">${esc(roundLabel(r))}</div>
            <div class="g">${chips}</div>
          </div>
        `;
      }).join("");
    }
  }

  main().catch(err=>{
    showErr("로딩 오류", err.message || String(err));
  });
})();
