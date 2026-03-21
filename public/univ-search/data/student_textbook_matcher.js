(function () {
  "use strict";

  const DEFAULT_PATHS = {
    textbookMaster: "../../data/textbook_master.json",
    keywordMap: "../../data/student_textbook_keyword_map.json"
  };

  const SUBJECT_GROUPS = {
    chemistry: ["화학", "화학Ⅰ", "화학Ⅱ", "고급화학", "화학실험", "통합과학"],
    physics: ["물리", "물리학", "물리학Ⅰ", "물리학Ⅱ", "고급물리학", "물리학실험", "통합과학"],
    biology: ["생명", "생명과학", "생명과학Ⅰ", "생명과학Ⅱ", "고급생명과학", "생명과학실험", "통합과학"],
    earth: ["지구", "지구과학", "지구과학Ⅰ", "지구과학Ⅱ", "고급지구과학", "지구과학실험", "통합과학"],
    math: ["수학", "공통수학1", "공통수학2", "대수", "기하"]
  };

  const TRACK_PRIORITY = {
    battery_energy: ["고급화학", "화학실험", "화학Ⅰ", "고급물리학", "물리학Ⅰ", "통합과학", "대수", "공통수학1", "공통수학2", "기하"],
    bio_med: ["고급생명과학", "생명과학실험", "생명과학Ⅰ", "생명과학Ⅱ", "화학Ⅰ", "고급화학", "화학실험", "통합과학", "대수"],
    semiconductor_electronics: ["고급물리학", "물리학Ⅰ", "고급화학", "화학Ⅰ", "대수", "기하", "공통수학1", "공통수학2", "통합과학"],
    earth_environment: ["고급지구과학", "지구과학실험", "지구과학Ⅰ", "지구과학Ⅱ", "통합과학", "화학Ⅰ", "대수"],
    ai_data: ["대수", "공통수학1", "공통수학2", "기하", "물리학Ⅰ", "통합과학"],
    general_stem: ["통합과학", "화학Ⅰ", "물리학Ⅰ", "생명과학Ⅰ", "대수", "공통수학1", "기하"]
  };

  function loadJson(path) {
    return fetch(path, { cache: "no-store" }).then(res => {
      if (!res.ok) throw new Error(`JSON 로드 실패: ${path} (${res.status})`);
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
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
      else if (value !== null && value !== undefined && String(value).trim()) out.push(String(value).trim());
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
        if (hay.includes(alias) || alias.includes(hay)) return true;
      }
    }
    return false;
  }

  function normalizeSubjectVariants(value) {
    const text = normalizeText(value);
    if (!text) return [];
    const set = new Set([text]);
    set.add(text.replace(/\s+/g, ""));
    set.add(text.replace(/Ⅰ|ⅰ/g, "1"));
    set.add(text.replace(/Ⅱ|ⅱ/g, "2"));
    set.add(text.replace(/\s*1$/g, ""));
    set.add(text.replace(/\s*2$/g, ""));
    set.add(text.replace(/\s*Ⅰ$/g, ""));
    set.add(text.replace(/\s*Ⅱ$/g, ""));
    if (!/[12ⅠⅡ]$/.test(text)) {
      set.add(text + " 1");
      set.add(text + " 2");
      set.add(text + "Ⅰ");
      set.add(text + "Ⅱ");
    }
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
          if (Array.isArray(value)) value.forEach(v => found.add(String(v)));
          else if (value && typeof value === "object") {
            Object.entries(value).forEach(([k2, v2]) => {
              found.add(k2);
              flattenStringArrayDeep(v2).forEach(x => found.add(x));
            });
          } else if (value !== null && value !== undefined) {
            found.add(String(value));
          }
        }

        if (value && typeof value === "object" && !Array.isArray(value)) {
          const possibleNames = unique([value.name, value.keyword, value.label, value.term]).map(normalizeText);
          if (possibleNames.includes(target) || normKey === target) {
            found.add(key);
            flattenStringArrayDeep([
              value.aliases, value.alias, value.synonyms, value.terms,
              value.keywords, value.related, value.tags
            ]).forEach(x => found.add(x));
          }
        }

        visit(value);
      });
    }

    visit(keywordMap);
    return unique([...found, ...normalizeSubjectVariants(keyword)]);
  }

  function getSubjectGroup(subjectName) {
    const norm = normalizeText(subjectName);
    for (const [group, names] of Object.entries(SUBJECT_GROUPS)) {
      if (names.some(name => {
        const n = normalizeText(name);
        return norm.includes(n) || n.includes(norm);
      })) return group;
    }
    return "other";
  }

  function inferPrimaryTrack(student) {
    const text = normalizeText([
      ...(student.track_keywords || []),
      ...(student.activity_keywords || []),
      ...(student.selected_subjects || []),
      ...(student.raw_keyword_pool || [])
    ].join(" "));

    if (/배터리|전지|리튬|전고체|산화환원|전기화학|에너지|열폭주|전해/.test(text)) return "battery_energy";
    if (/생명|의생명|세포|유전|면역|항상성|의학|바이오|대사|단백질/.test(text)) return "bio_med";
    if (/반도체|전자|전자기|회로|소자|디스플레이|광학|파동/.test(text)) return "semiconductor_electronics";
    if (/환경|기후|지구|해양|재해|탄소|지질|대기/.test(text)) return "earth_environment";
    if (/ai|인공지능|알고리즘|정보|보안|데이터|행렬|모델링/.test(text)) return "ai_data";
    return "general_stem";
  }

  function getTrackPriorityBoost(track, subjectName) {
    const list = TRACK_PRIORITY[track] || [];
    const norm = normalizeText(subjectName);
    const idx = list.findIndex(item => {
      const n = normalizeText(item);
      return norm.includes(n) || n.includes(norm);
    });
    if (idx === -1) return 0;
    const boosts = [18, 16, 14, 12, 10, 8, 6, 5, 4, 3];
    return boosts[idx] || 2;
  }

  function getPrerequisiteBoost(track, subjectName) {
    const group = getSubjectGroup(subjectName);
    if (track === "battery_energy" && (group === "chemistry" || group === "physics")) return 8;
    if (track === "bio_med" && (group === "biology" || group === "chemistry")) return 8;
    if (track === "semiconductor_electronics" && (group === "physics" || group === "math" || group === "chemistry")) return 8;
    if (track === "earth_environment" && (group === "earth" || group === "chemistry")) return 7;
    if (track === "ai_data" && (group === "math" || group === "physics")) return 8;
    if (track === "general_stem" && group !== "other") return 4;
    return 0;
  }

  function getKeywordConcentrationBoost(student, subjectName) {
    const group = getSubjectGroup(subjectName);
    const text = normalizeText([
      ...(student.track_keywords || []),
      ...(student.activity_keywords || []),
      ...(student.raw_keyword_pool || [])
    ].join(" "));
    let boost = 0;

    if (group === "chemistry" && /산화환원|전지|전해|반응속도|촉매|엔탈피|전위/.test(text)) boost += 8;
    if (group === "physics" && /전자기|유도|전동기|발전기|파동|광학|운동/.test(text)) boost += 8;
    if (group === "biology" && /세포|대사|면역|항상성|유전|단백질/.test(text)) boost += 8;
    if (group === "earth" && /기후|탄소|해양|지질|재해|대기/.test(text)) boost += 8;
    if (group === "math" && /행렬|알고리즘|모델링|함수|지수|로그|이차곡선/.test(text)) boost += 8;

    return boost;
  }

  function getAntiNoisePenalty(track, subjectName) {
    const group = getSubjectGroup(subjectName);
    if (track === "battery_energy" && group === "math") return -5;
    if (track === "bio_med" && group === "math") return -4;
    if (track === "earth_environment" && group === "math") return -3;
    return 0;
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

  function flattenStudentInput(student, keywordMap) {
    const trackKeywords = unique(student?.track_keywords || []);
    const activityKeywords = unique(student?.activity_keywords || []);
    const selectedSubjects = unique(student?.selected_subjects || []);
    const styleKeywords = unique(student?.style_keywords || []);
    const rawKeywordPool = unique(student?.raw_keyword_pool || []);

    return {
      student_id: student?.student_id || "",
      track_keywords: trackKeywords,
      activity_keywords: activityKeywords,
      selected_subjects: selectedSubjects,
      style_keywords: styleKeywords,
      raw_keyword_pool: rawKeywordPool,
      expanded_track_aliases: unique(trackKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))),
      expanded_activity_aliases: unique(activityKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))),
      expanded_style_aliases: unique(styleKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))),
      expanded_subject_aliases: unique(selectedSubjects.flatMap(k => getAliasesForKeyword(keywordMap, k)))
    };
  }

  function buildSubunitTextPool(subjectName, unitName, subunit) {
    return unique([
      subjectName, unitName, subunit?.name,
      ...(subunit?.core_concepts || []),
      ...(subunit?.interpretation_points || []),
      ...(subunit?.topic_seeds || []),
      ...(subunit?.major_links || []),
      ...(subunit?.record_seeds || [])
    ]);
  }

  function shouldDisplayMatchedKeyword(keyword) {
    const k = normalizeText(keyword);
    if (!k) return false;
    if (["실험형", "데이터형", "시스템형", "윤리 사회형", "윤리·사회형"].map(normalizeText).includes(k)) return false;
    return true;
  }

  function scoreSubunit(subjectName, unitName, subunit, student, keywordMap) {
    let score = 0;
    const matchedKeywords = new Set();
    const scoreBreakdown = [];

    const track = inferPrimaryTrack(student);
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

    for (const selectedSubject of student.selected_subjects) {
      const aliases = getAliasesForKeyword(keywordMap, selectedSubject);
      const matched =
        subjectLooselyMatches(subjectName, aliases) ||
        includesAlias([subjectNorm], aliases) ||
        includesAlias([unitNorm], aliases) ||
        includesAlias([subunitNameNorm], aliases);
      if (matched) {
        score += 4;
        if (shouldDisplayMatchedKeyword(selectedSubject)) matchedKeywords.add(selectedSubject);
        scoreBreakdown.push({ type: "selected_subject_match", keyword: selectedSubject, score: 4 });
      }
    }

    for (const trackKeyword of student.track_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, trackKeyword);
      const matchedMajor = includesAlias(majorLinkPool, aliases);
      const matchedText = includesAlias(fullTextPool, aliases);
      if (matchedMajor || matchedText) {
        const addScore = matchedMajor ? 8 : 6;
        score += addScore;
        if (shouldDisplayMatchedKeyword(trackKeyword)) matchedKeywords.add(trackKeyword);
        scoreBreakdown.push({
          type: matchedMajor ? "track_major_link_match" : "track_keyword_match",
          keyword: trackKeyword,
          score: addScore
        });
      }
    }

    for (const activityKeyword of student.activity_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, activityKeyword);
      const matchedCore = includesAlias(coreConceptPool, aliases);
      if (matchedCore) {
        score += 4;
        if (shouldDisplayMatchedKeyword(activityKeyword)) matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({ type: "activity_core_concept_match", keyword: activityKeyword, score: 4 });
        continue;
      }

      const matchedTopic = includesAlias(topicSeedPool, aliases);
      if (matchedTopic) {
        score += 3;
        if (shouldDisplayMatchedKeyword(activityKeyword)) matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({ type: "activity_topic_seed_match", keyword: activityKeyword, score: 3 });
        continue;
      }

      const matchedExtended = includesAlias([...interpretationPoints, ...recordSeeds, ...majorLinks].map(normalizeText), aliases);
      if (matchedExtended) {
        score += 2;
        if (shouldDisplayMatchedKeyword(activityKeyword)) matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({ type: "activity_extended_match", keyword: activityKeyword, score: 2 });
      }
    }

    for (const styleKeyword of student.style_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, styleKeyword);
      const matched = includesAlias(fullTextPool, aliases);
      if (matched) {
        score += 1;
        scoreBreakdown.push({ type: "style_match", keyword: styleKeyword, score: 1 });
      }
    }

    const trackPriorityBoost = getTrackPriorityBoost(track, subjectName);
    if (trackPriorityBoost) scoreBreakdown.push({ type: "track_priority_boost", keyword: track, score: trackPriorityBoost });
    score += trackPriorityBoost;

    const prerequisiteBoost = getPrerequisiteBoost(track, subjectName);
    if (prerequisiteBoost) scoreBreakdown.push({ type: "prerequisite_boost", keyword: track, score: prerequisiteBoost });
    score += prerequisiteBoost;

    const concentrationBoost = getKeywordConcentrationBoost(student, subjectName);
    if (concentrationBoost) scoreBreakdown.push({ type: "keyword_concentration_boost", keyword: track, score: concentrationBoost });
    score += concentrationBoost;

    const noisePenalty = getAntiNoisePenalty(track, subjectName);
    if (noisePenalty) scoreBreakdown.push({ type: "anti_noise_penalty", keyword: track, score: noisePenalty });
    score += noisePenalty;

    const matchReason = buildMatchReasonText({
      subject: subjectName,
      unit: unitName,
      subunit: subunitName,
      matchedKeywords: [...matchedKeywords],
      majorLinks,
      coreConcepts,
      track
    });

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
      score_breakdown: scoreBreakdown,
      inferred_track: track,
      match_reason: matchReason
    };
  }

  function buildMatchReasonText(input) {
    const topKeywords = unique(input.matchedKeywords || []).slice(0, 4);
    const topConcepts = unique(input.coreConcepts || []).slice(0, 3);
    const topMajors = unique(input.majorLinks || []).slice(0, 2);
    const parts = [];
    if (topKeywords.length) parts.push(`${topKeywords.join(", ")} 키워드가 직접 연결됨`);
    if (topConcepts.length) parts.push(`${topConcepts.join(", ")} 개념 축과 맞물림`);
    if (topMajors.length) parts.push(`${topMajors.join(", ")} 전공 연결성 확보`);
    if (!parts.length) parts.push("단원-키워드-전공 연결성이 확인됨");
    return parts.join(" / ");
  }

  function matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options = {}) {
    const { minScore = 10, topN = 30, includeZeroScore = false } = options;
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
          if (includeZeroScore || scored.score >= minScore) results.push(scored);
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
    return ensureArray(results).map(item => {
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
              <div style="margin-top:4px;color:#666;font-size:13px;">${escapeHtml(item.match_reason || "")}</div>
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
    }).join("");
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
    toHtmlCards,
    inferPrimaryTrack
  };
})();
