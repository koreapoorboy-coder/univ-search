
(function () {
  "use strict";
  const DEFAULT_PATHS = {
    textbookMaster: "../../data/textbook_master.json",
    keywordMap: "../../data/student_textbook_keyword_map.json"
  };

  function loadJson(path) {
    return fetch(path, { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error(`JSON 로드 실패: ${path} (${r.status})`);
      return r.json();
    });
  }

  function normalizeText(v) {
    if (v == null) return "";
    return String(v).toLowerCase().normalize("NFC").replace(/[\/|·,:;()\[\]{}]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function ensureArray(v) {
    if (Array.isArray(v)) return v.filter(x => x != null);
    if (v == null || v === "") return [];
    return [v];
  }

  function unique(arr) {
    return [...new Set(ensureArray(arr).map(v => String(v).trim()).filter(Boolean))];
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
    const text = normalizeText(value);
    if (!text) return [];
    const set = new Set([text]);
    set.add(text.replace(/Ⅰ|ⅰ/g, "1").replace(/Ⅱ|ⅱ/g, "2"));
    set.add(text.replace(/\s*1$/g, "").replace(/\s*2$/g, "").replace(/\s*Ⅰ$/g, "").replace(/\s*Ⅱ$/g, ""));
    if (!/[12ⅠⅡ]$/.test(text)) {
      set.add(text + " 1"); set.add(text + " 2"); set.add(text + "Ⅰ"); set.add(text + "Ⅱ");
    }
    return [...set].filter(Boolean);
  }

  function getAliasesForKeyword(keywordMap, keyword) {
    const found = new Set([String(keyword)]);
    normalizeSubjectVariants(keyword).forEach(v => found.add(v));
    return unique([...found]);
  }

  function subjectLooselyMatches(subjectName, aliases) {
    const subjectNorm = normalizeText(subjectName);
    const variants = normalizeSubjectVariants(subjectName);
    for (const aliasRaw of ensureArray(aliases)) {
      const alias = normalizeText(aliasRaw);
      if (!alias) continue;
      if (subjectNorm.includes(alias) || alias.includes(subjectNorm)) return true;
      for (const sv of variants) {
        if (sv.includes(alias) || alias.includes(sv)) return true;
      }
    }
    return false;
  }

  function subjectMatchesSelected(subjectName, selectedSubjects, keywordMap) {
    const selected = unique(selectedSubjects || []);
    if (!selected.length) return true;
    return selected.some(sel => {
      const aliases = getAliasesForKeyword(keywordMap, sel);
      return subjectLooselyMatches(subjectName, aliases);
    });
  }

  function flattenStudentInput(student) {
    return {
      student_id: student?.student_id || "",
      track_keywords: unique(student?.track_keywords || []),
      activity_keywords: unique(student?.activity_keywords || []),
      selected_subjects: unique(student?.selected_subjects || []),
      style_keywords: unique(student?.style_keywords || []),
      raw_keyword_pool: unique(student?.raw_keyword_pool || []),
      source_mode: student?.source_mode || "",
      year_label: student?.year_label || "",
      year_index: student?.year_index ?? null
    };
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
        score += 8;
        matched.add(s);
      }
    }
    for (const t of student.track_keywords) {
      if (includesAlias(pool, [t])) { score += 6; matched.add(t); }
    }
    for (const a of student.activity_keywords) {
      if (includesAlias(pool, [a])) { score += 4; matched.add(a); }
    }
    for (const st of student.style_keywords) {
      if (includesAlias(pool, [st])) score += 1;
    }

    const reasonParts = [];
    if ([...matched].length) reasonParts.push(`${[...matched].slice(0,4).join(", ")} 키워드가 직접 연결됨`);
    if (core.length) reasonParts.push(`${core.slice(0,3).join(", ")} 개념 축과 맞물림`);
    if (majors.length) reasonParts.push(`${majors.slice(0,2).join(", ")} 전공 연결성 확보`);

    return {
      subject: subjectName || "",
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
    const { minScore = 10, topN = 30, restrictToSelectedSubjects = true } = options;
    const student = flattenStudentInput(studentInput);
    const textbookList = Array.isArray(textbookMaster?.subjects) ? textbookMaster.subjects : (Array.isArray(textbookMaster) ? textbookMaster : []);
    const results = [];

    textbookList.forEach(subjectEntry => {
      const subjectName = subjectEntry?.subject || subjectEntry?.name || "";
      if (restrictToSelectedSubjects && !subjectMatchesSelected(subjectName, student.selected_subjects, keywordMap)) return;
      (subjectEntry?.units || []).forEach(unit => {
        (unit?.subunits || []).forEach(sub => {
          const item = scoreSubunit(subjectName, unit?.unit || unit?.name || "", sub, student);
          if (item.score >= minScore) results.push(item);
        });
      });
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  async function runStudentTextbookMatch(studentInput, options = {}) {
    const [textbookMaster, keywordMap] = await Promise.all([
      loadJson(options.textbookPath || DEFAULT_PATHS.textbookMaster),
      loadJson(options.keywordMapPath || DEFAULT_PATHS.keywordMap)
    ]);
    return matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options);
  }

  window.StudentTextbookMatcher = {
    DEFAULT_PATHS, loadJson, normalizeText, includesAlias, flattenStudentInput,
    scoreSubunit, matchStudentToTextbook, runStudentTextbookMatch
  };
})();
