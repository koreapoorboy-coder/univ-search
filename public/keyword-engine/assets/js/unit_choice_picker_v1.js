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

  const VERSION = "unit-choice-picker-v1.0.0";
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

  // 차례: 안내문에서 읽어낸 것 → 전공(진로 칸) → 전공(대학 수업) → 계열 → 나머지.
  function rank({ subject, major, track, detected, limit = 5 }) {
    const list = (index?.subjects || {})[text(subject)] || [];
    const group = TRACK_GROUP[text(track)] || "";
    const found = plain(detected);
    return list.map((row) => {
      const fromTask = Boolean(found) && plain(row.c) === found;
      const byBridge = Boolean(major) && (row.b || []).includes(major);
      const byCourse = Boolean(major) && !byBridge && (row.m || []).includes(major);
      const byTrack = Boolean(group) && (row.g || []).includes(group);
      const why = fromTask ? "task" : byBridge ? "major" : byCourse ? "course" : byTrack ? "track" : "plain";
      const order = fromTask ? 0 : byBridge ? 1 : byCourse ? 2 : byTrack ? 3 : 4;
      return { concept: row.c, keywords: (row.k || []).slice(0, 5), topic: text(row.t), why, order };
    }).sort((a, b) => (a.order - b.order) || a.concept.localeCompare(b.concept, "ko")).slice(0, limit);
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
@media (max-width:640px){#unitChoiceBox .uc-words{font-size:13.5px}}`;
    document.head.appendChild(tag);
  }

  // 고른 것을 화면 상태에 적는다.
  //
  // 다리(mini_worker_generate_bridge)는 `.engine-chip[data-action="keyword"][data-value]` 가운데
  // is-active 인 것을 키워드로 읽고, `#selectedConcept` 를 단원으로 읽는다. 그래서 새 통로를 만들지
  // 않고 그 두 자리에 적는다.
  function apply(row, word) {
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

    for (const [id, value] of [["selectedConcept", row.concept], ["keyword", word]]) {
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
  }

  function render(list) {
    const anchor = $("interpretationActions");
    if (!anchor || !list.length) return;
    style();
    let box = $("unitChoiceBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "unitChoiceBox";
      anchor.parentNode.insertBefore(box, anchor);
    }
    box.innerHTML = "";
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
      button.className = `uc-item${at === 0 ? " is-on" : ""}`;
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
        apply(row, row.keywords[0] || row.concept);
      });
      wrap.appendChild(button);
    });
    box.appendChild(wrap);
    // 맨 위를 미리 골라 둔다 — 맞으면 학생은 아무것도 안 눌러도 된다.
    apply(list[0], list[0].keywords[0] || list[0].concept);
  }

  async function show({ subject, major, track, detected } = {}) {
    if (!text(subject)) return [];
    await load();
    if (text(detected)) global.__UNIT_CHOICE_DETECTED__ = text(detected);
    rows = rank({ subject: text(subject), major: text(major), track: text(track), detected: text(detected) });
    render(rows);
    return rows;
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
        major: text(global.__DECISION_FLOW_STATE__?.department || $("major")?.value),
        track: text(global.__DECISION_FLOW_STATE__?.category || $("subjectGroupCategory")?.value),
        detected,
      });
    };
    new MutationObserver(fire).observe(target, { childList: true, characterData: true, subtree: true });
    fire();
    return true;
  }

  // 계열·전공은 해석 뒤에 고르므로, 고르고 나면 차례를 다시 매긴다.
  function rewatch() {
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button[data-category], #majorStep button");
      if (!button || !$("unitChoiceBox")) return;
      setTimeout(() => {
        show({
          subject: text($("subject")?.value),
          major: text(global.__DECISION_FLOW_STATE__?.department || ""),
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
    load,
  };
})(window);
