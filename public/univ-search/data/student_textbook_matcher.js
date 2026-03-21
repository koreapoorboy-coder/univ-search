(function () {
  "use strict";

  const DEFAULT_PATHS = {
    textbookMaster: "../../data/textbook_master.json",
    keywordMap: "../../data/student_textbook_keyword_map.json"
  };

  function loadJson(path) {
    return fetch(path, { cache: "no-store" }).then(res => {
      if (!res.ok) {
        throw new Error(`JSON 로드 실패: ${path} (${res.status})`);
      }
      return res.json();
    });
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\/|·,:;()[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ensureArray(value) {
    if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined);
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function unique(arr) {
    return [...new Set(ensureArray(arr).map(v => String(v).trim()).filter(Boolean))];
  }

  function flattenStringArrayDeep(input) {
    const out = [];
    function walk(value) {
      if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(walk);
      } else if (value !== null && value !== undefined && String(value).trim()) {
        out.push(String(value).trim());
      }
    }
    walk(input);
    return unique(out);
  }

  function includesAlias(haystackList, aliases) {
    const haystacks = ensureArray(haystackList).map(normalizeText).filter(Boolean);
    const aliasList = ensureArray(aliases).map(normalizeText).filter(Boolean);

    if (!haystacks.length || !aliasList.length) return false;

    for (const hay of haystacks) {
      for (const alias of aliasList) {
        if (!alias) continue;
        if (hay.includes(alias) || alias.includes(hay)) {
          return true;
        }
      }
    }
    return false;
  }

  function normalizeSubjectVariants(value) {
    const text = normalizeText(value);
    if (!text) return [];

    const set = new Set([text]);

    // 공통적으로 많이 쓰는 과목명 변형
    set.add(text.replace(/\s+/g, ""));
    set.add(text.replace(/ⅰ/g, "1"));
    set.add(text.replace(/ⅱ/g, "2"));
    set.add(text.replace(/Ⅰ/g, "1"));
    set.add(text.replace(/Ⅱ/g, "2"));

    // "물리학1" -> "물리학", "화학1" -> "화학"
    set.add(text.replace(/\s*1$/g, ""));
    set.add(text.replace(/\s*2$/g, ""));
    set.add(text.replace(/\s*ⅰ$/g, ""));
    set.add(text.replace(/\s*ⅱ$/g, ""));

    // "물리학" -> "물리학1", "물리학Ⅰ"
    if (!/[12ⅠⅡ]$/.test(text)) {
      set.add(text + " 1");
      set.add(text + " 2");
      set.add(text + "Ⅰ");
      set.add(text + "Ⅱ");
    }

    // 일반적인 축약 대응
    const replacements = [
      ["생명과학", ["생명", "생명과학1", "생명과학2", "생명과학Ⅰ", "생명과학Ⅱ"]],
      ["물리학", ["물리", "물리학1", "물리학2", "물리학Ⅰ", "물리학Ⅱ"]],
      ["화학", ["화학1", "화학2", "화학Ⅰ", "화학Ⅱ"]],
      ["지구과학", ["지구", "지구과학1", "지구과학2", "지구과학Ⅰ", "지구과학Ⅱ"]],
      ["공통수학", ["수학", "공통수학1", "공통수학2"]],
      ["대수", ["수학"]],
      ["기하", ["수학"]],
      ["고급생명과학", ["생명", "생명과학", "고급 생명과학"]],
      ["고급화학", ["화학", "고급 화학"]],
      ["고급물리학", ["물리", "고급 물리학"]],
      ["고급지구과학", ["지구", "고급 지구과학"]]
    ];

    replacements.forEach(([key, arr]) => {
      if (text.includes(key)) arr.forEach(v => set.add(normalizeText(v)));
    });

    return [...set].filter(Boolean);
  }

  function getAliasesForKeyword(keywordMap, keyword) {
    const target = normalizeText(keyword);
    if (!target || !keywordMap || typeof keywordMap !== "object") {
      return unique([keyword, ...normalizeSubjectVariants(keyword)]);
    }

    const found = new Set([String(keyword)]);
    normalizeSubjectVariants(keyword).forEach(v => found.add(v));

    function visit(node) {
      if (!node || typeof node !== "object") return;

      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }

      Object.entries(node).forEach(([key, value]) => {
        const normKey = normalizeText(key);

        if (normKey === target) {
          found.add(key);
          if (Array.isArray(value)) {
            value.forEach(v => found.add(String(v)));
          } else if (value && typeof value === "object") {
            Object.entries(value).forEach(([k2, v2]) => {
              found.add(k2);
              flattenStringArrayDeep(v2).forEach(x => found.add(x));
            });
          } else if (value !== null && value !== undefined) {
            found.add(String(value));
          }
        }

        if (value && typeof value === "object" && !Array.isArray(value)) {
          const possibleNames = unique([
            value.name,
            value.keyword,
            value.label,
            value.term
          ]).map(normalizeText);

          if (possibleNames.includes(target) || normKey === target) {
            found.add(key);
            flattenStringArrayDeep([
              value.aliases,
              value.alias,
              value.synonyms,
              value.terms,
              value.keywords,
              value.related,
              value.tags
            ]).forEach(x => found.add(x));
          }
        }

        visit(value);
      });
    }

    visit(keywordMap);
    return unique([...found, ...normalizeSubjectVariants(keyword)]);
  }

  function flattenStudentInput(student, keywordMap) {
    const trackKeywords = unique(student?.track_keywords || []);
    const activityKeywords = unique(student?.activity_keywords || []);
    const selectedSubjects = unique(student?.selected_subjects || []);
    const styleKeywords = unique(student?.style_keywords || []);

    return {
      student_id: student?.student_id || "",
      track_keywords: trackKeywords,
      activity_keywords: activityKeywords,
      selected_subjects: selectedSubjects,
      style_keywords: styleKeywords,
      expanded_track_aliases: unique(trackKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))),
      expanded_activity_aliases: unique(activityKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))),
      expanded_style_aliases: unique(styleKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))),
      expanded_subject_aliases: unique(selectedSubjects.flatMap(k => getAliasesForKeyword(keywordMap, k)))
    };
  }

  function buildSubunitTextPool(subjectName, unitName, subunit) {
    return unique([
      subjectName,
      unitName,
      subunit?.name,
      ...(subunit?.core_concepts || []),
      ...(subunit?.interpretation_points || []),
      ...(subunit?.topic_seeds || []),
      ...(subunit?.major_links || []),
      ...(subunit?.record_seeds || [])
    ]);
  }

  function subjectLooselyMatches(subjectName, aliases) {
    const subjectNorm = normalizeText(subjectName);
    const subjectVariants = normalizeSubjectVariants(subjectName);

    for (const aliasRaw of ensureArray(aliases)) {
      const alias = normalizeText(aliasRaw);
      if (!alias) continue;

      if (subjectNorm.includes(alias) || alias.includes(subjectNorm)) return true;

      for (const sv of subjectVariants) {
        if (sv.includes(alias) || alias.includes(sv)) return true;
      }
    }

    return false;
  }

  function scoreSubunit(subjectName, unitName, subunit, student, keywordMap) {
    let score = 0;
    const matchedKeywords = new Set();
    const scoreBreakdown = [];

    const subjectNorm = normalizeText(subjectName);
    const unitNorm = normalizeText(unitName);
    const subunitName = subunit?.name || "";
    const subunitNameNorm = normalizeText(subunitName);

    const coreConcepts = unique(subunit?.core_concepts || []);
    const topicSeeds = unique(subunit?.topic_seeds || []);
    const interpretationPoints = unique(subunit?.interpretation_points || []);
    const majorLinks = unique(subunit?.major_links || []);
    const recordSeeds = unique(subunit?.record_seeds || []);

    const coreConceptPool = coreConcepts.map(normalizeText);
    const topicSeedPool = topicSeeds.map(normalizeText);
    const majorLinkPool = majorLinks.map(normalizeText);
    const fullTextPool = buildSubunitTextPool(subjectName, unitName, subunit).map(normalizeText);

    // 1) 선택과목 일치 +3 (완화)
    for (const selectedSubject of student.selected_subjects) {
      const aliases = getAliasesForKeyword(keywordMap, selectedSubject);

      const matched =
        subjectLooselyMatches(subjectName, aliases) ||
        includesAlias([subjectNorm], aliases) ||
        includesAlias([unitNorm], aliases) ||
        includesAlias([subunitNameNorm], aliases);

      if (matched) {
        score += 3;
        matchedKeywords.add(selectedSubject);
        scoreBreakdown.push({
          type: "selected_subject_match",
          keyword: selectedSubject,
          score: 3
        });
      }
    }

    // 2) 진로 키워드 일치 +5 (강화)
    for (const trackKeyword of student.track_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, trackKeyword);

      const matchedMajor = includesAlias(majorLinkPool, aliases);
      const matchedText = includesAlias(fullTextPool, aliases);

      if (matchedMajor || matchedText) {
        score += 5;
        matchedKeywords.add(trackKeyword);
        scoreBreakdown.push({
          type: matchedMajor ? "track_major_link_match" : "track_keyword_match",
          keyword: trackKeyword,
          score: 5
        });
      }
    }

    // 3) 활동 키워드가 core_concepts 일치 +3
    for (const activityKeyword of student.activity_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, activityKeyword);
      const matchedCore = includesAlias(coreConceptPool, aliases);

      if (matchedCore) {
        score += 3;
        matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({
          type: "activity_core_concept_match",
          keyword: activityKeyword,
          score: 3
        });
        continue;
      }

      // 4) 활동 키워드가 topic_seeds 일치 +2
      const matchedTopic = includesAlias(topicSeedPool, aliases);
      if (matchedTopic) {
        score += 2;
        matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({
          type: "activity_topic_seed_match",
          keyword: activityKeyword,
          score: 2
        });
        continue;
      }

      // 5) interpretation / record / major_links 보조 매칭 +2
      const matchedExtended = includesAlias(
        [
          ...interpretationPoints,
          ...recordSeeds,
          ...majorLinks
        ].map(normalizeText),
        aliases
      );

      if (matchedExtended) {
        score += 2;
        matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({
          type: "activity_extended_match",
          keyword: activityKeyword,
          score: 2
        });
      }
    }

    // 6) 활동유형/스타일 보너스 +2
    for (const styleKeyword of student.style_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, styleKeyword);
      const matched = includesAlias(fullTextPool, aliases);

      if (matched) {
        score += 2;
        matchedKeywords.add(styleKeyword);
        scoreBreakdown.push({
          type: "style_match",
          keyword: styleKeyword,
          score: 2
        });
      }
    }

    return {
      subject: subjectName || "",
      unit: unitName || "",
      subunit: subunitName || "",
      score,
      matched_keywords: [...matchedKeywords],
      recommended_topics: topicSeeds,
      record_seeds: recordSeeds,
      core_concepts: coreConcepts,
      interpretation_points: interpretationPoints,
      major_links: majorLinks,
      score_breakdown: scoreBreakdown
    };
  }

  function matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options = {}) {
    const {
      minScore = 2,
      topN = 30,
      includeZeroScore = false
    } = options;

    const student = flattenStudentInput(studentInput, keywordMap);
    const textbookList = Array.isArray(textbookMaster?.subjects)
      ? textbookMaster.subjects
      : Array.isArray(textbookMaster)
        ? textbookMaster
        : Array.isArray(textbookMaster?.data)
          ? textbookMaster.data
          : Object.values(textbookMaster || {});

    const results = [];

    textbookList.forEach(subjectEntry => {
      const subjectName = subjectEntry?.subject || subjectEntry?.name || "";
      const units = Array.isArray(subjectEntry?.units) ? subjectEntry.units : [];

      units.forEach(unitEntry => {
        const unitName = unitEntry?.unit || unitEntry?.name || "";
        const subunits = Array.isArray(unitEntry?.subunits) ? unitEntry.subunits : [];

        subunits.forEach(subunit => {
          const scored = scoreSubunit(subjectName, unitName, subunit, student, keywordMap);
          if (includeZeroScore || scored.score >= minScore) {
            results.push(scored);
          }
        });
      });
    });

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, "ko");
      if (a.unit !== b.unit) return a.unit.localeCompare(b.unit, "ko");
      return a.subunit.localeCompare(b.subunit, "ko");
    });

    return results.slice(0, topN);
  }

  async function runStudentTextbookMatch(studentInput, options = {}) {
    const textbookPath = options.textbookPath || DEFAULT_PATHS.textbookMaster;
    const keywordMapPath = options.keywordMapPath || DEFAULT_PATHS.keywordMap;

    const [textbookMaster, keywordMap] = await Promise.all([
      loadJson(textbookPath),
      loadJson(keywordMapPath)
    ]);

    return matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toHtmlCards(results) {
    return ensureArray(results)
      .map(item => {
        const matched = unique(item.matched_keywords || []).join(", ");
        const topics = unique(item.recommended_topics || []).slice(0, 5).join(" · ");
        const seeds = unique(item.record_seeds || []).slice(0, 4).join(" · ");
        const majors = unique(item.major_links || []).slice(0, 4).join(" · ");

        return `
          <div class="tb-match-card" style="border:1px solid #ddd;border-radius:12px;padding:14px;margin:10px 0;background:#fff;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <div>
                <div style="font-weight:800;font-size:16px;">${escapeHtml(item.subject)}</div>
                <div style="margin-top:4px;color:#444;">${escapeHtml(item.unit)} / ${escapeHtml(item.subunit)}</div>
              </div>
              <div style="font-weight:900;font-size:18px;">${item.score}</div>
            </div>
            <div style="margin-top:10px;font-size:14px;line-height:1.6;">
              <div><b>매칭 키워드</b>: ${escapeHtml(matched)}</div>
              <div><b>추천 탐구</b>: ${escapeHtml(topics)}</div>
              <div><b>세특 씨앗</b>: ${escapeHtml(seeds)}</div>
              <div><b>관련 전공</b>: ${escapeHtml(majors)}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  window.StudentTextbookMatcher = {
    DEFAULT_PATHS,
    loadJson,
    normalizeText,
    includesAlias,
    flattenStudentInput,
    scoreSubunit,
    matchStudentToTextbook,
    runStudentTextbookMatch,
    toHtmlCards
  };
})();
