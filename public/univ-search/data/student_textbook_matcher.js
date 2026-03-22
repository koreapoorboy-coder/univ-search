(function () {
  "use strict";

  const DEFAULT_PATHS = {
    textbookMaster: "../../data/textbook_master.json",
    keywordMap: "../../data/student_textbook_keyword_map.json"
  };

  const GLOBAL_BLOCKED_SUBJECTS = [
    "공통국어", "공통수학", "공통수학1", "공통수학2", "공통영어",
    "통합사회", "통합과학", "과학탐구실험", "창의체험활동"
  ];

  const SUBJECT_CANONICAL_MAP = {
    "물리": "물리학",
    "물리1": "물리학",
    "물리학1": "물리학",
    "물리Ⅰ": "물리학",
    "물리학Ⅰ": "물리학",
    "물리2": "물리학2",
    "물리학2": "물리학2",
    "물리Ⅱ": "물리학2",
    "물리학Ⅱ": "물리학2",
    "화학": "화학",
    "화학1": "화학",
    "화학Ⅰ": "화학",
    "화학2": "화학2",
    "화학Ⅱ": "화학2",
    "생명": "생명과학",
    "생명과학": "생명과학",
    "생명1": "생명과학",
    "생명과학1": "생명과학",
    "생명과학Ⅰ": "생명과학",
    "생명2": "생명과학2",
    "생명과학2": "생명과학2",
    "생명과학Ⅱ": "생명과학2",
    "지구과학": "지구과학",
    "지구과학1": "지구과학",
    "지구과학Ⅰ": "지구과학",
    "지구과학2": "지구과학2",
    "지구과학Ⅱ": "지구과학2",
    "대수": "대수",
    "미적분": "미적분",
    "미적분1": "미적분",
    "미적분Ⅰ": "미적분",
    "기하": "기하",
    "확률과통계": "확률과통계",
    "확률 통계": "확률과통계",
    "고급화학": "고급화학",
    "고급생명과학": "고급생명과학",
    "고급물리학": "고급물리학",
    "정보": "정보",
    "인공지능": "정보"
  };

  function loadJson(path) {
    return fetch(path, { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error(`JSON 로드 실패: ${path} (${r.status})`);
      return r.json();
    });
  }

  function normalizeText(v) {
    if (v == null) return "";
    return String(v)
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\/|·,:;()\[\]{}]+/g, " ")
      .replace(/ⅰ/g, "Ⅰ")
      .replace(/ⅱ/g, "Ⅱ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ensureArray(v) {
    if (Array.isArray(v)) return v.filter(x => x != null);
    if (v == null || v === "") return [];
    return [v];
  }

  function unique(arr) {
    return [...new Set(ensureArray(arr).map(v => String(v).trim()).filter(Boolean))];
  }

  function normalizeSubjectKey(value) {
    const raw = normalizeText(value)
      .replace(/\s+/g, "")
      .replace(/Ⅰ/g, "1")
      .replace(/Ⅱ/g, "2")
      .replace(/학$/g, "");
    return SUBJECT_CANONICAL_MAP[raw] || raw;
  }

  function normalizeSubjectLabel(value) {
    const key = normalizeSubjectKey(value);
    const reverse = {
      "물리학": "물리학",
      "물리학2": "물리학Ⅱ",
      "화학": "화학",
      "화학2": "화학Ⅱ",
      "생명과학": "생명과학",
      "생명과학2": "생명과학Ⅱ",
      "지구과학": "지구과학",
      "지구과학2": "지구과학Ⅱ",
      "대수": "대수",
      "미적분": "미적분",
      "기하": "기하",
      "확률과통계": "확률과통계",
      "고급화학": "고급화학",
      "고급생명과학": "고급생명과학",
      "고급물리학": "고급물리학",
      "정보": "정보"
    };
    return reverse[key] || String(value || "").trim();
  }

  function includesAlias(haystackList, aliases) {
    const haystacks = ensureArray(haystackList).map(normalizeText).filter(Boolean);
    const aliasList = ensureArray(aliases).map(normalizeText).filter(Boolean);
    for (const hay of haystacks) {
      for (const alias of aliasList) {
        if (hay.includes(alias) || alias.includes(hay)) return true;
      }
    }
    return false;
  }

  function normalizeSubjectVariants(value) {
    const label = normalizeSubjectLabel(value);
    const key = normalizeSubjectKey(value);
    const set = new Set([label, key, normalizeText(label)]);
    if (typeof key === "string" && key.endsWith("2")) {
      set.add(key.replace(/2$/, ""));
    }
    if (["물리학", "화학", "생명과학", "지구과학"].includes(key)) {
      set.add(key + "1");
    }
    return [...set].filter(Boolean);
  }

  function getAliasesForKeyword(keywordMap, keyword) {
    const found = new Set(normalizeSubjectVariants(keyword));
    const map = keywordMap || {};
    const buckets = [map.subject_aliases, map.subjectAliases, map.subject_map];
    for (const bucket of buckets) {
      if (!bucket || typeof bucket !== "object") continue;
      const key = Object.keys(bucket).find(k => normalizeSubjectKey(k) === normalizeSubjectKey(keyword));
      if (!key) continue;
      ensureArray(bucket[key]).forEach(v => found.add(v));
    }
    found.add(String(keyword || ""));
    return unique([...found]);
  }

  function subjectLooselyMatches(subjectName, aliases) {
    const subjectKey = normalizeSubjectKey(subjectName);
    const subjectNorm = normalizeText(subjectName);
    for (const aliasRaw of ensureArray(aliases)) {
      const aliasKey = normalizeSubjectKey(aliasRaw);
      const aliasNorm = normalizeText(aliasRaw);
      if (!aliasNorm) continue;
      if (subjectKey && aliasKey && (subjectKey === aliasKey || subjectKey.includes(aliasKey) || aliasKey.includes(subjectKey))) return true;
      if (subjectNorm.includes(aliasNorm) || aliasNorm.includes(subjectNorm)) return true;
    }
    return false;
  }

  function isGloballyBlockedSubject(subjectName, blocked = GLOBAL_BLOCKED_SUBJECTS) {
    const key = normalizeSubjectKey(subjectName);
    return blocked.some(v => normalizeSubjectKey(v) === key);
  }

  function flattenStudentInput(student) {
    return {
      student_id: student?.student_id || "",
      main_track: student?.main_track || "",
      sub_track: student?.sub_track || "",
      track_keywords: unique(student?.track_keywords || []),
      activity_keywords: unique(student?.activity_keywords || []),
      selected_subjects: unique(student?.selected_subjects || []).map(normalizeSubjectLabel),
      style_keywords: unique(student?.style_keywords || []),
      raw_keyword_pool: unique(student?.raw_keyword_pool || []),
      source_mode: student?.source_mode || "",
      year_label: student?.year_label || "",
      year_index: student?.year_index ?? null
    };
  }

  function dedupeMatches(items) {
    const map = new Map();
    for (const item of items) {
      const key = [normalizeSubjectKey(item.subject), normalizeText(item.unit), normalizeText(item.subunit)].join("::");
      const prev = map.get(key);
      if (!prev || Number(item.score || 0) > Number(prev.score || 0)) map.set(key, item);
    }
    return [...map.values()];
  }

  function scoreSubunit(subjectName, unitName, subunit, student) {
    let score = 0;
    const matched = new Set();
    const core = unique(subunit?.core_concepts || []);
    const topics = unique(subunit?.topic_seeds || []);
    const majors = unique(subunit?.major_links || []);
    const seeds = unique(subunit?.record_seeds || []);
    const pool = unique([subjectName, unitName, subunit?.name, ...core, ...topics, ...majors, ...seeds]);

    for (const s of student.selected_subjects) {
      if (subjectLooselyMatches(subjectName, [s])) {
        score += 12;
        matched.add(s);
      }
    }
    for (const t of student.track_keywords) {
      if (includesAlias(pool, [t])) { score += 7; matched.add(t); }
    }
    for (const a of student.activity_keywords) {
      if (includesAlias(pool, [a])) { score += 4; matched.add(a); }
    }
    for (const st of student.style_keywords) {
      if (includesAlias(pool, [st])) score += 2;
    }
    if (student.main_track && includesAlias(pool, [student.main_track])) score += 8;
    if (student.sub_track && includesAlias(pool, [student.sub_track])) score += 4;

    const reasonParts = [];
    if ([...matched].length) reasonParts.push(`${[...matched].slice(0,4).join(", ")} 키워드가 직접 연결됨`);
    if (core.length) reasonParts.push(`${core.slice(0,3).join(", ")} 개념 축과 맞물림`);
    if (majors.length) reasonParts.push(`${majors.slice(0,2).join(", ")} 전공 연결성 확보`);

    return {
      subject: normalizeSubjectLabel(subjectName || ""),
      subject_key: normalizeSubjectKey(subjectName || ""),
      unit: unitName || "",
      subunit: subunit?.name || "",
      score,
      matched_keywords: [...matched],
      recommended_topics: topics,
      record_seeds: seeds,
      core_concepts: core,
      major_links: majors,
      match_reason: reasonParts.join(" / ") || "단원-키워드-전공 연결성이 확인됨"
    };
  }

  function matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options = {}) {
    const { minScore = 10, topN = 30, restrictToSelectedSubjects = true, blockedSubjects = GLOBAL_BLOCKED_SUBJECTS } = options;
    const student = flattenStudentInput(studentInput);
    const textbookList = Array.isArray(textbookMaster?.subjects) ? textbookMaster.subjects : (Array.isArray(textbookMaster) ? textbookMaster : []);
    const results = [];

    textbookList.forEach(subjectEntry => {
      const subjectName = subjectEntry?.subject || subjectEntry?.name || "";
      if (!subjectName) return;
      if (isGloballyBlockedSubject(subjectName, blockedSubjects)) return;
      if (restrictToSelectedSubjects && student.selected_subjects.length && !student.selected_subjects.some(s => subjectLooselyMatches(subjectName, getAliasesForKeyword(keywordMap, s)))) return;
      (subjectEntry?.units || []).forEach(unit => {
        (unit?.subunits || []).forEach(sub => {
          const item = scoreSubunit(subjectName, unit?.unit || unit?.name || "", sub, student);
          if (item.score >= minScore) results.push(item);
        });
      });
    });

    return dedupeMatches(results).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, topN);
  }

  async function runStudentTextbookMatch(studentInput, options = {}) {
    const [textbookMaster, keywordMap] = await Promise.all([
      loadJson(options.textbookPath || DEFAULT_PATHS.textbookMaster),
      loadJson(options.keywordMapPath || DEFAULT_PATHS.keywordMap)
    ]);
    return matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options);
  }

  window.StudentTextbookMatcher = {
    DEFAULT_PATHS, GLOBAL_BLOCKED_SUBJECTS, SUBJECT_CANONICAL_MAP,
    loadJson, normalizeText, normalizeSubjectKey, normalizeSubjectLabel,
    normalizeSubjectVariants, includesAlias, flattenStudentInput,
    scoreSubunit, matchStudentToTextbook, runStudentTextbookMatch, isGloballyBlockedSubject
  };
})();
