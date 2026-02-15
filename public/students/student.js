(() => {
  const $ = (s)=>document.querySelector(s);
  const esc = (s)=>String(s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const SUBS = ["국어","수학","영어","탐1","탐2"];

  async function loadJson(path){
    const r = await fetch(path, { cache:"no-store" });
    if(!r.ok) throw new Error(path+" load failed ("+r.status+")");
    return r.json();
  }

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

  function pickId(s){ return s.id ?? s.studentId ?? s.studentID ?? s["ID"] ?? s["학생ID"] ?? s["학번"] ?? null; }
  function pickToken(s){ return s.token ?? s.accessToken ?? s.key ?? s["token"] ?? s["토큰"] ?? null; }
  function pickName(s){ return s.studentName ?? s.studentname ?? s.name ?? s["학생명"] ?? s["이름"] ?? s["성명"] ?? s.id ?? "-"; }

  function pickRound(x){ const v = x?.round ?? x?.Round ?? x?.["회차"] ?? x?.["차수"]; return v==null?null:Number(v); }
  function pickDate(x){ return x?.date ?? x?.Date ?? x?.["날짜"] ?? x?.["일자"] ?? null; }

  function roundLabel(row){
    const r = pickRound(row);
    const d = pickDate(row);
    if(r!=null && d) return `#${r} (${d})`;
    if(r!=null) return `#${r}`;
    if(d) return String(d);
    return "-";
  }

  function buildMaps(row){
    const get = (...keys) => {
      for(const k of keys){
        const v = toNum(row?.[k]);
        if(v!=null) return v;
      }
      return null;
    };
    const raw = {
      "국어": get("국어_raw","국어","국"),
      "수학": get("수학_raw","수학","수"),
      "영어": get("영어_raw","영어","영"),
      "탐1": get("탐1_raw","탐1","탐구1","탐_1","탐구_1","생윤"),
      "탐2": get("탐2_raw","탐2","탐구2","탐_2","탐구_2","사문"),
    };
    const pct = {
      "국어": get("국어_pct","국어p","국어P"),
      "수학": get("수학_pct","수학p","수학P"),
      "영어": get("영어_pct","영어p","영어P"),
      "탐1": get("탐1_pct","탐1p","탐구1p","탐구1P","생윤_pct","생윤p","생윤P"),
      "탐2": get("탐2_pct","탐2p","탐구2p","탐구2P","사문_pct","사문p","사문P"),
    };
    return { raw, pct };
  }

  function cellHtml(raw, pct){
    const r = (raw==null) ? "-" : raw;
    const p = (pct==null) ? "-" : pct;
    return `<div class="cell"><span class="r">${esc(r)}점</span><span class="p">${esc(p)}p</span></div>`;
  }

  function renderCards(latest){
    const { raw, pct } = buildMaps(latest);
    $("#cards").innerHTML = SUBS.map(k=>{
      const r = raw[k], p = pct[k];
      const rawTxt = (r==null) ? "—" : `${r}`;
      const pctTxt = (p==null) ? "—" : `${p}p`;
      return `
        <div class="scard">
          <div class="scTop">
            <div class="sub">${esc(k)}</div>
            <div class="pct">${esc(pctTxt)}</div>
          </div>
          <div class="raw">${esc(rawTxt)}<small>점</small></div>
          <div class="hint">판정 기준은 백분위(p)</div>
        </div>
      `;
    }).join("");
  }

  function tableHtml(rows){
    const head = `
      <thead>
        <tr>
          <th>회차</th>
          <th class="num">국어</th>
          <th class="num">수학</th>
          <th class="num">영어</th>
          <th class="num">탐1</th>
          <th class="num">탐2</th>
        </tr>
      </thead>
    `;
    const body = rows.map(r=>{
      const { raw, pct } = buildMaps(r);
      const rid = `r_${String(pickRound(r) ?? "")}_${String(pickDate(r) ?? "")}`;
      return `
        <tr id="${esc(rid)}">
          <td>${esc(roundLabel(r))}</td>
          <td class="num">${cellHtml(raw["국어"], pct["국어"])}</td>
          <td class="num">${cellHtml(raw["수학"], pct["수학"])}</td>
          <td class="num">${cellHtml(raw["영어"], pct["영어"])}</td>
          <td class="num">${cellHtml(raw["탐1"], pct["탐1"])}</td>
          <td class="num">${cellHtml(raw["탐2"], pct["탐2"])}</td>
        </tr>
      `;
    }).join("");
    return `<table>${head}<tbody>${body}</tbody></table>`;
  }

  function fillJumpSelect(rows){
    const sel = $("#jumpSel");
    sel.innerHTML = "";
    rows.forEach((r, idx)=>{
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = roundLabel(r);
      sel.appendChild(opt);
    });
  }

  async function main(){
    const ctx = window.__STUDENT_CTX__ || {};
    const idParam = ctx.idParam;
    const tParam = ctx.tParam;
    const isAdmin = !!ctx.isAdmin;

    const students = await loadJson("./students.json");
    let student = null;

    if(idParam) student = students.find(s => String(pickId(s)) === String(idParam));
    if(!student && tParam) student = students.find(s => String(pickToken(s)) === String(tParam));

    if(!student){
      $("#nameLine").textContent = "접근 불가";
      $("#latestLine").textContent = "학생을 찾을 수 없습니다.";
      $("#cards").innerHTML = "";
      $("#recentBox").innerHTML = `<div class="muted" style="padding:14px">students.json에서 학생을 찾지 못했습니다.</div>`;
      $("#allDetails").style.display = "none";
      return;
    }

    const sid = String(pickId(student));
    const name = pickName(student);
    $("#nameLine").textContent = `${name} (${sid})`;

    if(isAdmin){
      $("#adminHdr").textContent = `${name} (${sid})`;
      $("#adminMeta").innerHTML = `
        학교: ${esc(student.school||"-")}<br>
        진로: ${esc(student.career||"-")}<br>
        전형: ${esc(student.admission||"-")}
      `;
      const ADMIN_TOKEN = ctx.ADMIN_TOKEN || "CHANGE_ME_ADMIN";
      $("#adminLinks").innerHTML = `
        <a class="btn" href="./index.html?admin=${encodeURIComponent(ADMIN_TOKEN)}">← 학생 목록</a>
        <a class="btn" href="./univ_list.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(ADMIN_TOKEN)}">대학 상향/적정</a>
        <a class="btn" href="./progress_detail.html?id=${encodeURIComponent(sid)}&admin=${encodeURIComponent(ADMIN_TOKEN)}">진도 상세</a>
      `;
    }

    const rawScores = await loadJson("./scores.json");
    const scores = normalizeArrayish(rawScores);
    const rows = scores
      .filter(r => String(r?.id ?? "") === sid)
      .sort((a,b)=>{
        const ra = pickRound(a), rb = pickRound(b);
        if(ra!=null && rb!=null) return ra - rb;
        const da = pickDate(a), db = pickDate(b);
        if(da && db) return String(da).localeCompare(String(db));
        return 0;
      });

    if(!rows.length){
      $("#latestLine").textContent = "성적 데이터가 없습니다.";
      $("#cards").innerHTML = "";
      $("#recentBox").innerHTML = `<div class="muted" style="padding:14px">scores.json에 ${esc(sid)} 데이터가 없습니다.</div>`;
      $("#allDetails").style.display = "none";
      return;
    }

    const latest = rows[rows.length-1];
    $("#latestLine").textContent = `최신 성적: ${roundLabel(latest)}`;

    const { raw, pct } = buildMaps(latest);
    const badgeText = (k)=> `${k} ${raw[k]==null?'-':raw[k]}점/${pct[k]==null?'-':pct[k]}p`;
    $("#badges").innerHTML = `
      <span class="badge">${esc(badgeText("국어"))}</span>
      <span class="badge">${esc(badgeText("수학"))}</span>
      <span class="badge">${esc(badgeText("영어"))}</span>
      <span class="badge">${esc(badgeText("탐1"))}</span>
      <span class="badge">${esc(badgeText("탐2"))}</span>
    `;

    renderCards(latest);

    const recent = rows.slice(-3).reverse();
    $("#recentBox").innerHTML = tableHtml(recent);

    const all = rows.slice().reverse();
    fillJumpSelect(all);
    $("#allBox").innerHTML = tableHtml(all);

    $("#jumpSel").addEventListener("change", (e)=>{
      const idx = Number(e.target.value);
      const target = all[idx];
      if(!target) return;

      const det = $("#allDetails");
      if(!det.open) det.open = true;

      const rid = `r_${String(pickRound(target) ?? "")}_${String(pickDate(target) ?? "")}`;
      const el = document.getElementById(rid);
      if(el){
        el.scrollIntoView({ behavior:"smooth", block:"center" });
        el.style.outline = "2px solid #111";
        setTimeout(()=>{ el.style.outline=""; }, 1200);
      }
    });
  }

  main().catch(err=>{
    $("#nameLine").textContent = "오류";
    $("#latestLine").textContent = err.message;
    $("#cards").innerHTML = "";
    $("#recentBox").innerHTML = `<div class="muted" style="padding:14px">${esc(err.message)}</div>`;
    $("#allDetails").style.display = "none";
  });
})();
