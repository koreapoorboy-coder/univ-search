/* student_result_output_bridge.js
 * v28: 학생용 결과 생성 빈 화면 방지 + 6~8번 선택값 기반 최종 출력
 */
(function(global){
  "use strict";
  const VERSION = "student-result-output-bridge-v29-selection-hydration";
  global.__STUDENT_RESULT_OUTPUT_BRIDGE_VERSION__ = VERSION;

  const $ = (id) => document.getElementById(id);
  const arr = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
  const val = (v) => String(v == null ? "" : v).trim();
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  const MODE = { principle:"원리 파악형", compare:"비교 분석형", data:"데이터 확장형", application:"사례 적용형", major:"전공 확장형", book:"도서 근거형" };
  const LINE = { basic:"기본형", standard:"확장형", advanced:"심화형" };
  const AXIS = { measurement_data_modeling:"수리·데이터 모델링 축", physics_system:"물리·시스템 해석 축", earth_environment_data:"지구·환경 데이터 해석 축", science_measurement:"과학 방법·측정 일반 축" };

  function form(id){ return val($(id)?.value); }
  function activeAttr(selector, attr){
    const el = document.querySelector(selector);
    return val(el?.getAttribute?.(attr) || "");
  }
  function activeText(selector){
    const el = document.querySelector(selector);
    return val(el?.textContent || "");
  }
  function compactTrackTitle(text){
    const v = val(text).replace(/\s+/g, " ");
    if (!v) return "";
    const m = v.match(/^[^0-9\n]+?축/);
    return val(m ? m[0] : v.replace(/\s*1순위.*$/,"").replace(/\s*직접 연계.*$/,""));
  }
  function domState(){
    const concept = form("selectedConcept") || activeAttr(".engine-concept-card.is-active[data-concept]", "data-concept");
    const keyword = form("keyword") || activeAttr(".engine-chip.is-active[data-action='keyword'][data-value]", "data-value");
    const track = form("linkedTrack") || activeAttr(".engine-track-card.is-active[data-track]", "data-track");
    const trackLabel = compactTrackTitle(activeText(".engine-track-card.is-active .engine-track-title")) || track;
    return {
      subject: form("subject"),
      career: form("career"),
      majorSelectedName: form("career"),
      concept,
      selectedConcept: concept,
      keyword,
      selectedKeyword: keyword,
      linkTrack: track,
      followupAxisId: track,
      axisLabel: trackLabel,
      selectedBook: form("selectedBookId"),
      selectedBookTitle: form("selectedBookTitle"),
      reportMode: form("reportMode"),
      reportView: form("reportView"),
      reportLine: form("reportLine")
    };
  }
  function state(){
    const base = global.__TEXTBOOK_HELPER_STATE__ || {};
    const dom = domState();
    const out = { ...base };
    Object.keys(dom).forEach(k => { if (val(dom[k])) out[k] = dom[k]; });
    return out;
  }
  function payload(){
    try { return typeof global.__BUILD_MINI_REPORT_PAYLOAD__ === "function" ? global.__BUILD_MINI_REPORT_PAYLOAD__() : null; }
    catch(e){ console.error(e); return null; }
  }
  function cleanAxis(raw){
    const v = val(raw); if(!v) return "";
    const id = v.split(/\s+/).find(x => AXIS[x]);
    if(id) return AXIS[id];
    const m = v.match(/[가-힣A-Za-z0-9·\/\- ]+축/);
    return m ? m[0].trim() : (AXIS[v] || v);
  }

  function ensureStyle(){
    if($("studentResultV28Style")) return;
    const style = document.createElement("style");
    style.id = "studentResultV28Style";
    style.textContent = `
      #studentFinalOutputV28{margin-top:18px}
      .student-final-v28{border:1px solid #cfe0ff;border-radius:22px;background:#fff;box-shadow:0 16px 44px rgba(15,23,42,.06);padding:20px}
      .student-final-head-v28{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e8eefb;padding-bottom:16px;margin-bottom:16px}
      .student-final-kicker-v28{display:inline-flex;border-radius:999px;background:#edf4ff;color:#275fe8;padding:6px 10px;font-size:12px;font-weight:900}
      .student-final-title-v28{margin:10px 0 8px;font-size:24px;line-height:1.35;color:#111827;font-weight:950}
      .student-final-sub-v28{color:#52617b;line-height:1.65;font-size:14px;margin:0}
      .student-final-actions-v28{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
      .student-final-btn-v28{border:1px solid #b8c8ee;background:#fff;color:#275fe8;border-radius:999px;padding:9px 13px;font-size:13px;font-weight:900;cursor:pointer}
      .student-final-btn-v28.primary{background:#2f66ff;color:#fff;border-color:#2f66ff}
      .student-final-grid-v28{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .student-final-card-v28{border:1px solid #dbe6fb;border-radius:18px;background:#fbfdff;padding:15px}
      .student-final-card-v28 h4{margin:0 0 9px;color:#172033;font-size:15px}
      .student-final-card-v28 p,.student-final-card-v28 li{color:#44546f;font-size:13px;line-height:1.75}
      .student-final-card-v28 ul,.student-final-card-v28 ol{margin:8px 0 0;padding-left:20px}
      .student-final-card-v28.full{grid-column:1/-1}
      .student-final-chiprow-v28{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .student-final-chip-v28{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;background:#eef4ff;color:#275fe8;font-size:12px;font-weight:900}
      .student-section-list-v28{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}
      .student-section-item-v28{border:1px solid #e0e8f7;background:#fff;border-radius:14px;padding:12px}
      .student-section-item-v28 strong{display:block;color:#111827;margin-bottom:5px;font-size:14px}
      .student-section-item-v28 span{color:#475569;font-size:13px;line-height:1.7}
      .student-alert-v28{border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:14px;padding:12px 14px;line-height:1.6;font-size:13px;margin-top:12px}
      .student-operator-v28{margin-top:14px;border:1px dashed #b9c7e7;border-radius:14px;background:#fbfdff;padding:10px 12px}
      .student-operator-v28 summary{cursor:pointer;font-weight:900;color:#334155}
      .student-pre-v28{max-height:260px;overflow:auto;white-space:pre-wrap;background:#111827;color:#f8fafc;border-radius:12px;padding:12px;font-size:12px;line-height:1.55;margin-top:10px}
      @media(max-width:900px){.student-final-grid-v28{grid-template-columns:1fr}.student-final-head-v28{flex-direction:column}.student-final-actions-v28{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function ctx(p){
    const st=state(), s=p?.selectionPayload||{}, g=p?.reportGenerationContext||{}, c=g.reportChoices||{};
    const mode=val(s.reportMode||st.reportMode||c.mode), view=val(s.reportView||st.reportView||c.view), line=val(s.reportLine||st.reportLine||c.line);
    const axisRaw=val(s.selectedFollowupAxis||s.followupAxis||st.linkTrack);
    return {
      p,st,g,c,mode,view,line,
      modeLabel:val(c.modeLabel)||MODE[mode]||mode,
      lineLabel:val(c.lineLabel)||LINE[line]||line,
      subject:val(s.subject||st.subject||form("subject")),
      major:val(s.department||st.career||st.majorSelectedName||form("career")),
      concept:val(s.selectedConcept||st.concept||form("selectedConcept")),
      keyword:val(s.selectedKeyword||s.selectedRecommendedKeyword||st.keyword||form("keyword")),
      axis:cleanAxis(axisRaw),
      book:val(p?.selectedBook?.title||st.selectedBookTitle||form("selectedBookTitle")),
      sections:arr(g.targetStructure).length?arr(g.targetStructure):["추천 주제","탐구 동기","핵심 개념 정리","교과목 연계 및 이론적 설명","느낀점","세특 문구 예시"]
    };
  }

  function missing(p){
    const st=state(), s=p?.selectionPayload||{}, g=p?.reportGenerationContext||{}, out=[];
    if(!form("schoolName")) out.push("학교명");
    if(!form("grade")) out.push("학년");
    if(!val(s.subject||st.subject||form("subject"))) out.push("과목");
    if(!form("taskName")) out.push("활동 과제 이름");
    if(!form("taskType")) out.push("결과물 유형");
    if(!val(s.department||st.career||st.majorSelectedName||form("career"))) out.push("학과");
    if(!val(s.selectedConcept||st.concept||st.selectedConcept||form("selectedConcept"))) out.push("3번 교과 개념");
    if(!val(s.selectedKeyword||s.selectedRecommendedKeyword||st.keyword||st.selectedKeyword||form("keyword"))) out.push("3번 추천 키워드");
    if(!val(s.selectedFollowupAxis||s.followupAxis||st.axisLabel||st.linkTrack||st.followupAxisId||form("linkedTrack"))) out.push("4번 후속 연계축");
    if(!p?.selectedBook&&!st.selectedBook&&!form("selectedBookId")&&!form("selectedBookTitle")) out.push("5번 도서");
    if(!val(s.reportMode||st.reportMode||g.reportChoices?.mode||form("reportMode"))) out.push("6번 보고서 전개 방식");
    if(!val(s.reportView||st.reportView||g.reportChoices?.view||form("reportView"))) out.push("7번 보고서 관점");
    if(!val(s.reportLine||st.reportLine||g.reportChoices?.line||form("reportLine"))) out.push("8번 보고서 라인");
    return out;
  }

  function showError(list){
    const msg=`아직 선택되지 않은 항목이 있습니다: ${list.join(", ")}`;
    const e=$("errorMessage");
    if(e){ e.innerHTML=`<strong>확인 필요</strong><br>${esc(msg)}`; e.style.display="block"; }
    else alert(msg);
    ($("engineFlowSection")||e)?.scrollIntoView?.({behavior:"smooth",block:"start"});
  }
  function hideError(){ const e=$("errorMessage"); if(e){ e.innerHTML=""; e.style.display="none"; } }

  function title(c){
    if(c.mode==="data") return `${c.keyword}을 자료로 해석하는 ${c.concept} 탐구`;
    if(c.mode==="compare") return `${c.keyword}의 기준을 비교해 보는 ${c.concept} 탐구`;
    if(c.mode==="application") return `${c.keyword}을 실제 사례에 적용한 ${c.concept} 탐구`;
    if(c.mode==="major") return `${c.keyword}와 ${c.major}을 연결한 ${c.concept} 탐구`;
    if(c.mode==="book") return `『${c.book}』를 근거로 확장한 ${c.keyword} 탐구`;
    return `${c.keyword}의 핵심 원리와 실제 적용 중심으로 보기`;
  }

  function body(name,c){
    const n=val(name), S=c.subject, M=c.major, C=c.concept, K=c.keyword, A=c.axis, B=c.book, V=c.view, ML=c.modeLabel;
    if(/중요성/.test(n)) return `${K}은 ${S}의 ${C}을 실제 문제와 연결해 설명할 수 있는 출발점이다. ${M} 관점에서는 단순 개념 암기가 아니라 현상을 해석하고 판단하는 기준으로 활용될 수 있다.`;
    if(/추천 주제|주제/.test(n)) return title(c);
    if(/관련 키워드|키워드/.test(n)) return `${C}, ${K}, ${A}, ${M}, 『${B}』를 핵심 연결어로 삼고, 원인·기준·사례·한계의 흐름으로 묶는다.`;
    if(/탐구 동기/.test(n)) return `${S}에서 배운 ${C}이 실제로 어떤 상황에서 쓰이는지 궁금해졌고, ${K}을 중심으로 자료와 사례를 연결하면 진로와도 이어질 수 있다고 판단했다.`;
    if(/느낀점/.test(n)) return `교과 개념은 단순 정의가 아니라 문제를 바라보는 기준이 된다는 점을 확인했다. ${V} 관점으로 정리하면서 같은 주제라도 해석 방식에 따라 보고서의 깊이가 달라진다는 점을 알게 되었다.`;
    if(/세특/.test(n)) return `${C}과 관련된 ${K}을 주제로 ${ML} 보고서를 구성하고, 선택 도서 『${B}』의 관점을 참고하여 ${A} 방향으로 교과 개념의 적용 가능성을 탐색함.`;
    if(/왜 알아야|생기부/.test(n)) return `${C}은 ${S}의 핵심 내용을 실제 탐구로 옮기는 연결 지점이다. ${K}과 연결하면 학생의 관심이 다음 과목과 진로로 확장되는 흐름을 보여줄 수 있다.`;
    if(/무엇이며|원리/.test(n)) return `${C}의 핵심은 현상을 설명하는 기준을 세우는 데 있다. 먼저 ${K}의 의미를 정리하고, 그 원리가 어떤 조건에서 작동하는지 단계적으로 설명한다.`;
    if(/문제.*해결|왜 중요한/.test(n)) return `${K}은 실제 사회·기술·학문 영역에서 판단 기준을 세우는 데 쓰일 수 있다. ‘무엇을 안다’보다 ‘이 개념으로 어떤 문제를 다르게 볼 수 있는가’를 중심으로 서술한다.`;
    if(/실제 적용|문제 해결 과정/.test(n)) return `『${B}』에서 얻은 관점이나 사례를 활용해 ${K}이 실제 상황에서 어떻게 해석되는지 설명한다. 사례 제시 → 교과 개념 연결 → 한계 또는 개선 방향 순서로 정리한다.`;
    if(/교과목 연계|이론적 설명/.test(n)) return `${S}의 ${C}에서 출발해 ${A}으로 확장한다. 후속 과목에서는 자료 해석, 모델링, 비교 분석, 사례 적용 중 선택한 관점에 맞춰 탐구 수준을 높일 수 있다.`;
    if(/심화 탐구/.test(n)) return `${K}과 관련된 실제 자료를 2개 이상 비교하거나, ${A}에 맞는 변수·조건·사례를 추가해 더 정교한 분석으로 발전시킨다.`;
    if(/참고문헌|자료/.test(n)) return `선택 도서 『${B}』, ${S} 교과서의 ${C} 관련 단원, 공신력 있는 기관 자료나 통계·그래프 자료를 함께 사용한다.`;
    return `${n}에서는 ${C}과 ${K}의 연결을 ${V} 관점으로 정리하고, 『${B}』를 단순 요약이 아니라 보고서의 근거로 활용한다.`;
  }

  function reportText(c){
    return [`[탐구주제] ${title(c)}`,`과목: ${c.subject}`,`학과: ${c.major}`,`교과 개념: ${c.concept}`,`추천 키워드: ${c.keyword}`,`후속 연계축: ${c.axis}`,`선택 도서: ${c.book}`,`보고서 구조: ${c.modeLabel} / ${c.view} / ${c.lineLabel}`,"",...c.sections.map((s,i)=>`${i+1}. ${s}\n${body(s,c)}`),"",`[세특 문구 예시]\n${body("세특 문구 예시",c)}`].join("\n\n");
  }
  function miniPrompt(c){
    return [`아래 payload와 학생 선택값을 기준으로 고등학생 수행평가용 MINI 보고서 초안을 작성해줘.`,
      `교과 개념 → 추천 키워드 → 후속 연계축 → 선택 도서 → 보고서 구조가 이어지도록 작성해줘.`,"",
      `주제: ${title(c)}`,`과목: ${c.subject}`,`학과: ${c.major}`,`교과 개념: ${c.concept}`,`추천 키워드: ${c.keyword}`,`후속 연계축: ${c.axis}`,`선택 도서: ${c.book}`,`보고서 전개 방식: ${c.modeLabel}`,`보고서 관점: ${c.view}`,`보고서 라인: ${c.lineLabel}`,"","작성 구조:",c.sections.map((s,i)=>`${i+1}. ${s}`).join("\n"),"","payload:",JSON.stringify(c.p||{},null,2)].join("\n");
  }

  function render(c){
    const result=$("resultSection"); if(!result) return;
    result.style.display="block";
    Array.from(result.children).forEach(ch=>{ if(ch.id!=="studentFinalOutputV28") ch.style.display="none"; });
    let mount=$("studentFinalOutputV28");
    if(!mount){ mount=document.createElement("div"); mount.id="studentFinalOutputV28"; result.appendChild(mount); }
    const bookUse=c.g?.selectedBookUse||{}, roles=arr(bookUse.reportRoleLabels||c.p?.selectedBook?.selectedBookContext?.reportRoleLabels).join(" / "), pattern=c.g?.examplePattern||{};
    mount.style.display="block";
    mount.innerHTML=`<div class="student-final-v28">
      <div class="student-final-head-v28">
        <div><div class="student-final-kicker-v28">학생용 최종 보고서 설계 결과</div>
          <h2 class="student-final-title-v28">${esc(title(c))}</h2>
          <p class="student-final-sub-v28">6~8번에서 선택한 <b>${esc(c.modeLabel)}</b> · <b>${esc(c.view)}</b> · <b>${esc(c.lineLabel)}</b> 구조를 반영했습니다.</p>
          <div class="student-final-chiprow-v28"><span class="student-final-chip-v28">${esc(c.subject)}</span><span class="student-final-chip-v28">${esc(c.major)}</span><span class="student-final-chip-v28">${esc(c.concept)}</span><span class="student-final-chip-v28">${esc(c.keyword)}</span><span class="student-final-chip-v28">${esc(c.axis)}</span><span class="student-final-chip-v28">『${esc(c.book)}』</span></div>
        </div>
        <div class="student-final-actions-v28"><button type="button" class="student-final-btn-v28 primary" data-v28-copy="report">보고서 구조 복사</button><button type="button" class="student-final-btn-v28" data-v28-copy="prompt">MINI 요청문 복사</button><button type="button" class="student-final-btn-v28" data-v28-copy="payload">payload 복사</button></div>
      </div>
      <div class="student-final-grid-v28">
        <div class="student-final-card-v28"><h4>보고서 선택 구조</h4><ul><li>전개 방식: ${esc(c.modeLabel)}</li><li>관점: ${esc(c.view)}</li><li>라인: ${esc(c.lineLabel)}</li><li>참고 패턴: ${esc(pattern.label||"선택값 기반 패턴")}</li></ul></div>
        <div class="student-final-card-v28"><h4>선택 도서 활용 위치</h4><p>『${esc(c.book)}』는 단순 독후감용이 아니라 보고서의 근거·비교 관점·한계 논의에 활용합니다.</p><p>${esc(roles||bookUse.recommendationReason||"선택 도서의 핵심 관점을 본문 근거로 활용합니다.")}</p></div>
        <div class="student-final-card-v28 full"><h4>보고서 본문 구조</h4><div class="student-section-list-v28">${c.sections.map((s,i)=>`<div class="student-section-item-v28"><strong>${i+1}. ${esc(s)}</strong><span>${esc(body(s,c))}</span></div>`).join("")}</div></div>
        <div class="student-final-card-v28"><h4>세특 문구 예시</h4><p>${esc(body("세특 문구 예시",c))}</p></div>
        <div class="student-final-card-v28"><h4>심화 탐구 발전 방안</h4><ul><li>${esc(c.keyword)} 관련 실제 자료를 2개 이상 비교한다.</li><li>${esc(c.axis)}에 맞춰 후속 과목에서 다룰 변수나 사례를 추가한다.</li><li>선택 도서의 관점을 그대로 요약하지 말고 교과 개념의 해석 근거로 재구성한다.</li></ul></div>
        <div class="student-final-card-v28 full"><h4>참고문헌 및 자료</h4><ul><li>선택 도서: 『${esc(c.book)}』</li><li>${esc(c.subject)} 교과서: ${esc(c.concept)} 관련 단원</li><li>추가 자료: 공신력 있는 기관의 통계·그래프·사례 자료</li></ul><div class="student-alert-v28">중복 방지 기준: 같은 ${esc(c.keyword)} 주제라도 6번 전개 방식, 7번 관점, 8번 라인을 바꾸면 본문 순서와 강조점이 달라져야 합니다.</div></div>
      </div>
      <details class="student-operator-v28"><summary>운영/분석용 payload 보기</summary><pre class="student-pre-v28">${esc(JSON.stringify(c.p||{},null,2))}</pre></details>
    </div>`;
    global.__STUDENT_RESULT_OUTPUT_LAST_CONTEXT__=c;
    const hidden=$("miniNavigationPayload"); if(hidden) hidden.value=JSON.stringify(c.p||{});
    setTimeout(()=>mount.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }

  async function copy(v){
    try{ await navigator.clipboard.writeText(v); return true; }
    catch(e){ const t=document.createElement("textarea"); t.value=v; document.body.appendChild(t); t.select(); try{document.execCommand("copy");}catch(x){} t.remove(); return true; }
  }
  function installCopy(){
    if(global.__STUDENT_RESULT_COPY_V28__) return;
    global.__STUDENT_RESULT_COPY_V28__=true;
    document.addEventListener("click",async e=>{
      const b=e.target.closest?.("[data-v28-copy]"); if(!b) return;
      const c=global.__STUDENT_RESULT_OUTPUT_LAST_CONTEXT__; if(!c) return;
      e.preventDefault();
      const type=b.getAttribute("data-v28-copy");
      const v=type==="payload"?JSON.stringify(c.p||{},null,2):type==="prompt"?miniPrompt(c):reportText(c);
      await copy(v);
      const old=b.textContent; b.textContent="복사 완료"; setTimeout(()=>b.textContent=old,1200);
    },true);
  }
  function generate(e){
    const b=e.target.closest?.("#generateBtn");
    if(!b || !$("engineFlowSection")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    ensureStyle();
    hideError();
    const p=payload();
    const m=missing(p);
    if(m.length){ showError(m); return false; }
    render(ctx(p));
    return false;
  }
  function boot(){
    ensureStyle();
    installCopy();
    if(!global.__STUDENT_RESULT_CLICK_GUARD_V28__){
      global.__STUDENT_RESULT_CLICK_GUARD_V28__=true;
      document.addEventListener("click",generate,true);
    }
  }
  global.__RENDER_STUDENT_FINAL_OUTPUT_V28__=function(){
    const p=payload(), m=missing(p);
    if(m.length) return {ok:false,missing:m};
    const c=ctx(p); render(c); return {ok:true,context:c};
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})(typeof window !== "undefined" ? window : globalThis);
