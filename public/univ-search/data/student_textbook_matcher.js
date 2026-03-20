(function () {
  "use strict";

  const DEFAULT_PATHS = {
    textbookMaster: "../../data/textbook_master.json",
    keywordMap: "../../data/student_textbook_keyword_map.json"
  };

  /**
   * JSON 로드
   */
  async function loadJson(path) {
    const res = await fetch(path, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`JSON 로드 실패: ${path} (${res.status})`);
    }

    return await res.json();
  }

  /**
   * 텍스트 정규화
   * - 소문자
   * - 공백/특수문자 단순화
   * - 한글/영문/숫자만 남기되 비교 친화적으로 처리
   */
  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\/|·,:;()[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * 비교용 토큰화
   */
  function tokenize(value) {
    const normalized = normalizeText(value);
    if (!normalized) return [];
    return normalized.split(" ").filter(Boolean);
  }

  /**
   * 배열 보정
   */
  function ensureArray(value) {
    if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined);
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  /**
   * 중복 제거
   */
  function unique(arr) {
    return [...new Set(ensureArray(arr).map(v => String(v).trim()).filter(Boolean))];
  }

  /**
   * 문자열 배열 펼치기
   */
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

  /**
   * alias 포함 여부 검사
   * haystackList 안의 문자열 중 하나라도 aliases와 매칭되면 true
   */
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

  /**
   * keywordMap에서 특정 키워드의 alias 후보 수집
   * 구조가 조금 달라도 최대한 유연하게 읽음
   */
  function getAliasesForKeyword(keywordMap, keyword) {
    const target = normalizeText(keyword);
    if (!target || !keywordMap || typeof keywordMap !== "object") {
      return [keyword];
    }

    const found = new Set([String(keyword)]);

    function visit(node, parentKey) {
      if (!node || typeof node !== "object") return;

      if (Array.isArray(node)) {
        node.forEach(item => visit(item, parentKey));
        return;
      }

      Object.entries(node).forEach(([key, value]) => {
        const normKey = normalizeText(key);

        // 1) key 자체가 keyword인 경우
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

        // 2) 객체 내부에 alias류 필드가 있는 경우
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

        visit(value, key);
      });
    }

    visit(keywordMap, "");

    return unique([...found]);
  }

  /**
   * 학생 입력값 평탄화
   */
  function flattenStudentInput(student, keywordMap) {
    const trackKeywords = unique(student?.track_keywords || []);
    const activityKeywords = unique(student?.activity_keywords || []);
    const selectedSubjects = unique(student?.selected_subjects || []);
    const styleKeywords = unique(student?.style_keywords || []);

    const expandedTrackAliases = unique(
      trackKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))
    );
    const expandedActivityAliases = unique(
      activityKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))
    );
    const expandedStyleAliases = unique(
      styleKeywords.flatMap(k => getAliasesForKeyword(keywordMap, k))
    );
    const expandedSubjectAliases = unique(
      selectedSubjects.flatMap(k => getAliasesForKeyword(keywordMap, k))
    );

    return {
      student_id: student?.student_id || "",
      track_keywords: trackKeywords,
      activity_keywords: activityKeywords,
      selected_subjects: selectedSubjects,
      style_keywords: styleKeywords,
      expanded_track_aliases: expandedTrackAliases,
      expanded_activity_aliases: expandedActivityAliases,
      expanded_style_aliases: expandedStyleAliases,
      expanded_subject_aliases: expandedSubjectAliases
    };
  }

  /**
   * subunit에서 비교용 텍스트 풀 생성
   */
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

  /**
   * keywordMap 안에서 스타일 관련 보너스 후보 추출
   */
  function getStyleReferencePool(keywordMap, styleKeyword) {
    const aliases = getAliasesForKeyword(keywordMap, styleKeyword);
    return unique(aliases);
  }

  /**
   * subunit 점수 계산
   *
   * 기본 규칙
   * - 선택과목 일치: +5
   * - 진로 키워드 일치: +4
   * - 활동 키워드가 core_concepts 일치: +3
   * - 활동 키워드가 topic_seeds 일치: +2
   * - 활동유형/스타일 보너스: +2
   */
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
    const fullTextPool = buildSubunitTextPool(subjectName, unitName, subunit).map(normalizeText);

    // 1) 선택과목 일치 +5
    for (const selectedSubject of student.selected_subjects) {
      const aliases = getAliasesForKeyword(keywordMap, selectedSubject);
      const matched =
        includesAlias([subjectNorm], aliases) ||
        includesAlias([unitNorm], aliases) ||
        includesAlias([subunitNameNorm], aliases);

      if (matched) {
        score += 5;
        matchedKeywords.add(selectedSubject);
        scoreBreakdown.push({
          type: "selected_subject_match",
          keyword: selectedSubject,
          score: 5
        });
      }
    }

    // 2) 진로 키워드 일치 +4
    for (const trackKeyword of student.track_keywords) {
      const aliases = getAliasesForKeyword(keywordMap, trackKeyword);
      const matched = includesAlias(fullTextPool, aliases);

      if (matched) {
        score += 4;
        matchedKeywords.add(trackKeyword);
        scoreBreakdown.push({
          type: "track_keyword_match",
          keyword: trackKeyword,
          score: 4
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

      // 보조 규칙: interpretation / record / major_links에 걸리면 +1
      const matchedExtended = includesAlias(
        [
          ...interpretationPoints,
          ...recordSeeds,
          ...majorLinks
        ].map(normalizeText),
        aliases
      );

      if (matchedExtended) {
        score += 1;
        matchedKeywords.add(activityKeyword);
        scoreBreakdown.push({
          type: "activity_extended_match",
          keyword: activityKeyword,
          score: 1
        });
      }
    }

    // 5) 활동유형/스타일 보너스 +2
    for (const styleKeyword of student.style_keywords) {
      const aliases = getStyleReferencePool(keywordMap, styleKeyword);
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

  /**
   * textbookMaster를 순회하며 전체 매칭
   */
  function matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options = {}) {
    const {
      minScore = 1,
      topN = 30,
      includeZeroScore = false
    } = options;

    const student = flattenStudentInput(studentInput, keywordMap);

    const textbookList = Array.isArray(textbookMaster)
      ? textbookMaster
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

  /**
   * 브라우저에서 바로 실행하는 런너
   */
  async function runStudentTextbookMatch(studentInput, options = {}) {
    const textbookPath = options.textbookPath || DEFAULT_PATHS.textbookMaster;
    const keywordMapPath = options.keywordMapPath || DEFAULT_PATHS.keywordMap;

    const [textbookMaster, keywordMap] = await Promise.all([
      loadJson(textbookPath),
      loadJson(keywordMapPath)
    ]);

    return matchStudentToTextbook(studentInput, textbookMaster, keywordMap, options);
  }

  /**
   * 결과를 화면 렌더링용 HTML로 가볍게 변환하는 보조 함수
   */
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
