/* unit_choice_picker_v1.js — 「이렇게 이해했어요」 화면에서 학생이 **탐구할 낱말**을 짚게 한다.
 *
 * 왜 필요한가. 지금 화면은 주제 칸에 **과목 이름**을 보낸다(keyword: "물리"). 엔진은 학생이 무엇을
 * 탐구할지 모르는 채로 쓰고, 그래서 같은 과제를 두 번 돌리면 「보호필름 정전기」와 「투명 전극 저항」
 * 처럼 매번 다른 주제가 나온다(유료 확인 2026-09-21). 단원을 알아낸 과제도 마찬가지다 — 단원만
 * 알고 주제는 비어 있다.
 *
 * 학생에게 빈칸을 주면 못 쓴다. 단원 이름도 모른다. 그래서 **낱말을 몇 개 보여 주고 짚게** 한다.
 * 「물질의 전기적 특성」은 몰라도 「전기 회로」는 안다.
 *
 * 새 화면을 만들지 않는다. 「이렇게 이해했어요」 카드 안에 줄 하나로 넣는다 — 그래야 학생이 원래
 * 누르던 「맞아요」 하나로 끝난다.
 *
 * 맨 위 낱말은 **미리 골라 둔다.** 맞으면 학생은 아무것도 안 눌러도 된다. 대신 왜 그것이 위에
 * 있는지 한 줄 적는다 — 안 읽고 넘기는 것을 조금이라도 막으려는 것이다.
 */
(function (global) {
  "use strict";

  const VERSION = "unit-choice-picker-v1.5.0";
  global.__UNIT_CHOICE_PICKER_VERSION__ = VERSION;

  const INDEX_URL = "seed/engine-index/unit_choices.v1.json";
  const TRACK_GROUP = {
    engineering: "공학", natural: "자연", medical: "의약", social: "사회", humanities: "인문",
  };
  const WHY_LABEL = {
    task: "선생님 안내문에서 읽었어요",
    major: "전공과 이어지는 단원이에요",
    course: "전공이 대학에서 배우는 단원이에요",
    track: "고른 계열과 이어지는 단원이에요",
    plain: "",
  };

  let index = null;
  let rows = [];
  let picked = null;

  const $ = (id) => document.getElementById(id);
  // 전공은 상태 어디에도 이름으로 남지 않는다(major 엔진은 계열만 받는다). 눌린 단추의 글자가 이름이다.
  function pickedMajor() {
    // 눌린 단추에 data-major 로 이름이 들어 있다(「아직 못 정했어요」는 빈 값이다).
    const on = document.querySelector("#majorStep button.is-active[data-major], #majorStep button.is-on[data-major], #majorStep button.active[data-major], #majorStep button.selected[data-major]");
    return String(on?.dataset?.major || "").trim();
  }
  const text = (value) => String(value == null ? "" : value).trim();
  const plain = (value) => text(value).replace(/\s+/g, "");

  async function load() {
    if (index) return index;
    try {
      const res = await fetch(INDEX_URL, { cache: "force-cache" });
      if (!res.ok) throw new Error(String(res.status));
      index = await res.json();
    } catch (error) {
      console.warn("unit choices load failed:", error);
      index = { subjects: {} };
    }
    return index;
  }

  // 안내문 **글자**에서도 단원을 찾는다.
  // 화면의 해석이 단원을 못 집어내면 차례가 가나다순이 되고, 정작 맞는 단원은 다섯 줄 밖으로
  // 밀려 아예 안 보였다 — 물리 「역학 수레에 작용하는 힘을 달리하며 가속도를 측정… 뉴턴 운동
  // 제2법칙」 과제에 자기장·전기·빛의 이중성·상대성·열이 떴다(운영 검사 2026-09-22).
  // 「힘과 운동」은 ㅎ 이라 맨 끝이었다.
  // 한 글자 낱말은 세지 않는다 — 「일」 같은 말은 아무 글에나 들어 있다.
  function hits(row, task) {
    if (!task) return 0;
    let count = 0;
    if (row.c && row.c.length > 1 && task.includes(row.c)) count += 2;
    for (const word of row.k || []) if (word && word.length > 1 && task.includes(word)) count += 1;
    return count;
  }

  // 차례: 안내문에서 읽어낸 것 → 전공(진로 칸) → 전공(대학 수업) → 계열 → 나머지.
  function rank({ subject, major, track, detected, task, limit = 5 }) {
    const list = (index?.subjects || {})[text(subject)] || [];
    const group = TRACK_GROUP[text(track)] || "";
    const found = plain(detected);
    const words = text(task || $("taskDescription")?.value);
    return list.map((row) => {
      const score = hits(row, words);
      // 「안내문에서 읽었어요」라고 **말하는** 것은 근거가 셀 때만이다 — 단원 이름이 그대로 있거나,
      // 낱말이 둘 이상 맞을 때. 한 낱말만 스치면(「그래프」 같은 말) 차례만 위로 올리고, 어디서
      // 왔는지는 원래대로 말한다. 없는 근거를 댈 바에는 아무 말도 안 하는 편이 낫다.
      const fromTask = (Boolean(found) && plain(row.c) === found) || score >= 2;
      const byBridge = Boolean(major) && (row.b || []).includes(major);
      const byCourse = Boolean(major) && !byBridge && (row.m || []).includes(major);
      const byTrack = Boolean(group) && (row.g || []).includes(group);
      const why = fromTask ? "task" : byBridge ? "major" : byCourse ? "course" : byTrack ? "track" : "plain";
      const order = fromTask ? 0 : byBridge ? 1 : byCourse ? 2 : byTrack ? 3 : 4;
      return { concept: row.c, keywords: (row.k || []).slice(0, 5), topic: text(row.t), why, order, score };
    }).sort((a, b) => (a.order - b.order) || (b.score - a.score) || a.concept.localeCompare(b.concept, "ko")).slice(0, limit);
  }

  function style() {
    if ($("unitChoiceStyle")) return;
    const tag = document.createElement("style");
    tag.id = "unitChoiceStyle";
    tag.textContent = `
#unitChoiceBox{margin:14px 0 4px;padding:13px 15px;border:1px solid #d9e0ee;border-radius:10px;background:#f8fafc}
#unitChoiceBox .uc-head{font-weight:700;font-size:14px;color:#111827;margin-bottom:4px}
#unitChoiceBox .uc-sub{font-size:12.5px;color:#667085;margin-bottom:10px;line-height:1.6}
#unitChoiceBox .uc-list{display:flex;flex-direction:column;gap:7px}
#unitChoiceBox .uc-item{display:block;width:100%;text-align:left;border:1px solid #d1d9e6;background:#fff;border-radius:9px;padding:10px 12px;cursor:pointer;font:inherit;line-height:1.55}
#unitChoiceBox .uc-item:hover{border-color:#2563eb}
#unitChoiceBox .uc-item.is-on{border-color:#2563eb;background:#eff5ff;box-shadow:inset 0 0 0 1px #2563eb}
#unitChoiceBox .uc-words{font-weight:600;font-size:14px;color:#111827}
#unitChoiceBox .uc-why{display:block;font-size:12px;color:#2563eb;margin-top:3px}
#unitChoiceBox .uc-why.is-plain{color:#98a2b3}
#unitChoiceBox .uc-unit{color:#667085;font-weight:500}
#unitChoiceBox .uc-fill{margin-top:11px;padding-top:10px;border-top:1px dashed #d1d9e6;font-size:12.5px;color:#475569;line-height:1.6}
@media (max-width:640px){#unitChoiceBox .uc-words{font-size:13.5px}}`;
    document.head.appendChild(tag);
  }

  // 고른 것을 화면 상태에 적는다.
  //
  // 다리(mini_worker_generate_bridge)는 `.engine-chip[data-action="keyword"][data-value]` 가운데
  // is-active 인 것을 키워드로 읽고, `#selectedConcept` 를 단원으로 읽는다. 그래서 새 통로를 만들지
  // 않고 그 두 자리에 적는다.
  // 학생이 손으로 눌렀는가. 미리 골라 둔 것은 **우리 추천일 뿐**이라, 과제 글이 말한 단원을
  // 덮어쓰면 안 된다(₩0 전수 검사에서 78건이 그렇게 망가졌다). 워커가 이 값을 보고 판단한다.
  let touched = false;
  function apply(row, word, byHand) {
    if (byHand) touched = true;
    picked = { concept: row.concept, keyword: word };
    let hidden = $("unitChoiceChips");
    if (!hidden) {
      hidden = document.createElement("div");
      hidden.id = "unitChoiceChips";
      hidden.hidden = true;
      document.body.appendChild(hidden);
    }
    hidden.innerHTML = "";
    const chip = document.createElement("span");
    chip.className = "engine-chip is-active";
    chip.dataset.action = "keyword";
    chip.dataset.value = word;
    chip.textContent = word;
    hidden.appendChild(chip);

    for (const [id, value] of [["selectedConcept", row.concept], ["keyword", word], ["conceptPicked", touched ? "true" : "false"]]) {
      let field = $(id);
      if (!field) {
        field = document.createElement("input");
        field.type = "hidden";
        field.id = id;
        document.body.appendChild(field);
      }
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    try {
      global.dispatchEvent(new CustomEvent("keyword-engine:unit-choice", { detail: { ...picked, why: row.why } }));
    } catch (error) { /* 알림이 실패해도 고른 것은 남는다 */ }
    guard();
  }

  // 해석을 그리는 코드(decision_flow_v1)가 미리보기를 다시 그릴 때마다 이 두 칸을 덮어쓴다.
  // 그래서 비워지면 **학생이 고른 것으로 되돌린다.** 학생이 짚은 것이 마지막 말이어야 한다.
  let guarding = false;
  function guard() {
    if (guarding) return;
    guarding = true;
    setInterval(() => {
      if (!picked) return;
      if ($("selectedConcept") && $("selectedConcept").value !== picked.concept) $("selectedConcept").value = picked.concept;
      if ($("keyword") && $("keyword").value !== picked.keyword) $("keyword").value = picked.keyword;
      if ($("conceptPicked")) $("conceptPicked").value = touched ? "true" : "false";
    }, 400);
  }

  // **학생이 무엇을 채우게 될지 미리 알려 준다.**
  //
  // 이 판정은 실제 과제 3,440건으로 재어 86.3% 맞는다 — 여섯 번에 한 번 틀린다. 유료로 나가는
  // 프로그램에서 한 번 틀리면 그 과제를 받은 학생 모두가 틀린다. 그러니 **틀린 것이 보여야** 하고,
  // 보이면 학생이 「다르게 잡을래요」로 되돌릴 수 있다. 조용히 틀리는 것이 제일 나쁘다.
  const FILL_LABEL = {
    measurement: "직접 잰 숫자를 표에 적게 돼요",
    survey: "친구들에게 물어본 답을 적게 돼요",
    dataset: "공개된 자료를 찾아 표에 옮기게 돼요",
    reading: "읽은 자료의 제목과 내 해석을 적게 돼요",
    none: "따로 적을 것 없이 바로 보고서가 나와요",
  };
  // **워커와 같은 규칙을 쓴다.** 예전에는 여기에 짧은 규칙을 따로 두고 「수행평가 방식」 배지만 봤다.
  // 그래서 생명과학 「우리 반 학생들을 대상으로 … 설문으로 조사」 과제에 화면은 「공개된 자료를 찾아
  // 표에 옮기게 돼요」라고 적었는데, 워커는 설문으로 잡았다(운영 검사 2026-09-22). 학생에게 한 말과
  // 실제가 다르면 「틀리면 보이게 한다」는 약속이 무너진다.
  // 규칙은 collection_kind_v1.js 한 군데에 있고, index.html 이 그것을 창에 올려 둔다.
  function fillKind() {
    const shared = global.__COLLECTION_KIND__?.resolve;
    // 「다르게 잡을래요」를 학생이 **실제로 누른** 때에만 그 말이 먼저다. correctionMethod 칸에는
    // 우리가 읽어 낸 값이 미리 들어 있어서, 그것을 학생의 말로 치면 과제 글이 통째로 밀린다
    // (생명과학 설문 과제가 「자료해석형」 배지 때문에 공개 자료로 뒤집혔다).
    const byHand = text($("methodPicked")?.value) === "true";
    const fixed = byHand ? text($("correctionMethod")?.value) : "";
    if (typeof shared === "function") {
      return shared({
        taskDescription: text($("taskDescription")?.value),
        taskName: text($("taskName")?.value),
        subject: text($("subject")?.value),
        subjectGroup: text($("subjectGroup")?.value),
        reportMode: text($("interpretedModes")?.textContent),
        // 학생이 「다르게 잡을래요」로 고쳤을 때만 그 말이 먼저다 — 워커와 같은 조건이다.
        methodPicked: byHand && Boolean(fixed),
        correctionMethod: fixed,
      });
    }
    // 공유 규칙이 아직 안 올라왔을 때만 쓰는 짧은 길. 여기서 멈추면 줄이 아예 안 나온다.
    const method = `${fixed} ${text($("interpretedModes")?.textContent)}`;
    if (/실험|실습|측정|관찰/.test(method)) return "measurement";
    if (/설문/.test(method)) return "survey";
    if (/자료해석|자료분석|통계|데이터/.test(method)) return "dataset";
    if (/문헌|자료조사|독서/.test(method)) return "reading";
    return "none";
  }

  function render(list) {
    const anchor = $("interpretationActions");
    if (!anchor || !list.length) return;
    // 학생이 이미 손으로 짚었으면, 목록을 다시 그려도 그 단원을 그대로 둔다.
    // 전공을 고르면 차례가 바뀌는데, 그때마다 맨 위가 다시 골라지면서 학생이 짚은 단원을 조용히
    // 덮었다. 게다가 conceptPicked 는 true 로 남아서, **우리가 고른 것을 학생이 고른 것처럼**
    // 워커에 알렸다 — 워커는 그 값을 믿고 과제 글의 단원까지 밀어낸다
    // (운영 검사 2026-09-22, 통합사회1: 학생이 「인구 변화」를 짚었는데 행정학과를 고르자
    //  「사회 정의와 불평등」으로 바뀌었다).
    let keepAt = touched && picked ? list.findIndex((row) => row.concept === picked.concept) : -1;
    // 과목이 바뀌어 짚은 단원이 목록에서 사라졌다면, 더는 「학생이 골랐다」고 말하지 않는다.
    if (touched && keepAt < 0) touched = false;
    style();
    let box = $("unitChoiceBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "unitChoiceBox";
      anchor.parentNode.insertBefore(box, anchor);
    }
    box.innerHTML = "";
    box.hidden = false;
    const head = document.createElement("div");
    head.className = "uc-head";
    head.textContent = "무엇으로 탐구할까요?";
    const sub = document.createElement("div");
    sub.className = "uc-sub";
    sub.textContent = list[0].why === "task"
      ? "안내문에서 읽어낸 것을 맨 위에 두었어요. 그대로면 그냥 「맞아요」를 누르세요."
      : "안내문에 주제가 없어서 저희가 골라 두었어요. 수업에서 배운 것과 가까운 쪽을 눌러 주세요.";
    box.appendChild(head);
    box.appendChild(sub);
    const wrap = document.createElement("div");
    wrap.className = "uc-list";
    list.forEach((row, at) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `uc-item${at === (keepAt >= 0 ? keepAt : 0) ? " is-on" : ""}`;
      const words = document.createElement("span");
      words.className = "uc-words";
      words.textContent = row.keywords.slice(0, 4).join(" · ");
      const why = document.createElement("span");
      why.className = `uc-why${row.why === "plain" ? " is-plain" : ""}`;
      why.textContent = `${WHY_LABEL[row.why] ? `${WHY_LABEL[row.why]} · ` : ""}${row.concept} 단원`;
      button.appendChild(words);
      button.appendChild(why);
      button.addEventListener("click", () => {
        wrap.querySelectorAll(".uc-item").forEach((one) => one.classList.remove("is-on"));
        button.classList.add("is-on");
        apply(row, row.keywords[0] || row.concept, true);
      });
      wrap.appendChild(button);
    });
    box.appendChild(wrap);
    // 무엇을 채우게 될지 한 줄. 틀렸으면 「다르게 잡을래요」로 바꾸라고 함께 적는다.
    const fill = document.createElement("div");
    fill.className = "uc-fill";
    fill.textContent = `이 과제는 ${FILL_LABEL[fillKind()]}. 아니면 아래 「다르게 잡을래요」에서 수행평가 방식을 바꿔 주세요.`;
    box.appendChild(fill);
    // 학생이 짚은 것이 있으면 그것을, 없으면 맨 위를 미리 골라 둔다 — 맞으면 아무것도 안 눌러도 된다.
    if (keepAt >= 0) apply(list[keepAt], picked.keyword || list[keepAt].keywords[0] || list[keepAt].concept, true);
    else apply(list[0], list[0].keywords[0] || list[0].concept);
  }

  // 과목이나 안내문이 바뀌면 **앞 과제의 선택은 버린다.**
  // 운영 검사 2026-09-22(5번 생명과학 설문 → 6번 지구과학 별의 등급): 「처음부터 다시」를 누르고
  // 새 과목·새 안내문을 넣었는데 목록에 앞 과제의 단원(면역과 백신)이 그대로 있었고, 숨은 칸도
  // 「병원체 / 면역과 백신」을 물고 있었다. 지켜보는 쪽이 해석 결과 **글자**만 보는데, 두 과제의
  // 보고서 유형이 똑같이 「자료해석형」이라 글자가 안 바뀌어 아무 일도 일어나지 않았다.
  let lastInput = "";
  function forget() {
    picked = null;
    touched = false;
    lastInput = "";
    const box = $("unitChoiceBox");
    if (box) { box.innerHTML = ""; box.hidden = true; }
    for (const id of ["selectedConcept", "keyword"]) { const field = $(id); if (field) field.value = ""; }
    const flag = $("conceptPicked");
    if (flag) flag.value = "false";
  }

  async function show({ subject, major, track, detected } = {}) {
    if (!text(subject)) return [];
    await load();
    const signature = `${plain(subject)}|${plain($("taskDescription")?.value)}`;
    if (signature !== lastInput) {
      // 새 과제다 — 학생이 앞 과제에서 짚은 것은 이 과제의 답이 아니다.
      picked = null;
      touched = false;
      lastInput = signature;
    }
    if (text(detected)) global.__UNIT_CHOICE_DETECTED__ = text(detected);
    rows = rank({ subject: text(subject), major: text(major), track: text(track), detected: text(detected) });
    render(rows);
    return rows;
  }

  // 과목·안내문이 바뀌면 다시 짠다. 해석 결과 글자가 같을 때도 움직여야 한다.
  let redrawTimer = null;
  function redraw() {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(() => {
      if (!$("unitChoiceBox")) return;   // 아직 해석 전이면 목록을 띄우지 않는다
      show({
        subject: text($("subject")?.value),
        major: pickedMajor(),
        track: text(global.__DECISION_FLOW_STATE__?.category || ""),
        detected: text(global.__UNIT_CHOICE_DETECTED__ || ""),
      });
    }, 250);
  }

  // 해석 결과가 채워지는 순간 목록을 띄운다. 새 화면을 만들지 않으려고 화면을 지켜보는 쪽을 골랐다 —
  // 해석을 그리는 코드(decision_flow_v1)가 알림을 주지 않기 때문이다.
  function watch() {
    const target = $("interpretedModes");
    if (!target) return false;
    let last = "";
    const fire = () => {
      const now = text(target.textContent);
      if (!now || now === last) return;
      last = now;
      // **우리가 덮어쓰기 전에** 안내문에서 읽어낸 단원을 집어 둔다. 맨 위에 두고 표시하려는 것이다.
      const detected = text($("selectedConcept")?.value);
      show({
        subject: text($("subject")?.value),
        major: pickedMajor(),
        track: text(global.__DECISION_FLOW_STATE__?.category || ""),
        detected,
      });
    };
    new MutationObserver(fire).observe(target, { childList: true, characterData: true, subtree: true });
    fire();
    return true;
  }

  // 계열·전공은 해석 뒤에 고르므로, 고르고 나면 차례를 다시 매긴다.
  function rewatch() {
    for (const id of ["subject", "taskDescription"]) {
      const field = $(id);
      if (!field) continue;
      field.addEventListener("change", redraw);
      field.addEventListener("input", redraw);
    }
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button[data-category], #majorStep button");
      if (!button || !$("unitChoiceBox")) return;
      setTimeout(() => {
        show({
          subject: text($("subject")?.value),
          major: pickedMajor(),
          track: text(global.__DECISION_FLOW_STATE__?.category || button.dataset.category || ""),
          detected: text(global.__UNIT_CHOICE_DETECTED__ || ""),
        });
      }, 120);
    }, true);
  }

  function install() {
    if (watch()) { rewatch(); return true; }
    return false;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else if (!install()) setTimeout(install, 600);

  global.__UNIT_CHOICE__ = {
    version: VERSION,
    show,
    rank: (input) => rank(input),
    chosen: () => picked,
    fillKind,
    forget,
    load,
  };
})(window);
