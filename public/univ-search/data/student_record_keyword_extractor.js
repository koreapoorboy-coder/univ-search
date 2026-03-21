(function () {
  "use strict";

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\/|·,:;()[\]{}"'`]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function unique(arr) {
    return [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))];
  }

  function ensureArray(value) {
    if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined);
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function collectTextDeep(node, out) {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach(v => collectTextDeep(v, out));
      return;
    }
    if (typeof node === "object") {
      Object.values(node).forEach(v => collectTextDeep(v, out));
      return;
    }
    const text = String(node).trim();
    if (text) out.push(text);
  }

  function collectSubjectTexts(subject) {
    const pool = [];
    const preferredKeys = [
      "raw_text", "raw", "original_text", "detail_text", "record_text", "content",
      "summary", "subject_goal_focus", "current_activity_basis", "analysis_basis",
      "observed_performance", "interpretation", "evaluation_meaning", "next_improvement",
      "admission_officer_view", "subject_judgment", "record_judgment", "overall_opinion",
      "structure_interpretation", "extension_interpretation"
    ];

    preferredKeys.forEach(k => {
      if (subject && subject[k]) collectTextDeep(subject[k], pool);
      if (subject?.evidence_first && subject.evidence_first[k]) collectTextDeep(subject.evidence_first[k], pool);
      if (subject?.judgment_block && subject.judgment_block[k]) collectTextDeep(subject.judgment_block[k], pool);
    });

    if (subject?.keywords) collectTextDeep(subject.keywords, pool);
    if (subject?.activity_framework) collectTextDeep(subject.activity_framework, pool);
    if (subject?.evaluation_priority) collectTextDeep(subject.evaluation_priority, pool);

    // 마지막 fallback
    collectTextDeep(subject, pool);

    return unique(pool);
  }

  function buildConceptDictionary(textbookMaster, keywordMap) {
    const dict = new Set();

    const textbookList = Array.isArray(textbookMaster?.subjects)
      ? textbookMaster.subjects
      : Array.isArray(textbookMaster)
        ? textbookMaster
        : [];

    textbookList.forEach(subjectEntry => {
      dict.add(subjectEntry?.subject || "");
      (subjectEntry?.units || []).forEach(unit => {
        dict.add(unit?.unit || "");
        (unit?.subunits || []).forEach(sub => {
          dict.add(sub?.name || "");
          ensureArray(sub?.core_concepts).forEach(v => dict.add(v));
          ensureArray(sub?.topic_seeds).forEach(v => dict.add(v));
          ensureArray(sub?.major_links).forEach(v => dict.add(v));
          ensureArray(sub?.record_seeds).forEach(v => dict.add(v));
        });
      });
    });

    function visit(node) {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node === "object") {
        Object.entries(node).forEach(([k, v]) => {
          dict.add(k);
          visit(v);
        });
        return;
      }
      dict.add(String(node));
    }
    visit(keywordMap);

    return unique([...dict].map(v => String(v).trim()).filter(v => v && v.length >= 2));
  }

  const BUILTIN_TERMS = [
    "배터리","이차전지","전고체","열폭주","리튬","전지","산화환원","전기화학","전해","전지 전위","반응속도",
    "촉매","활성화 에너지","엔탈피","깁스 자유 에너지","에너지","효율","전자기 유도","전동기","발전기",
    "파동","광학","회로","반도체","디스플레이","행렬","알고리즘","모델링","지수함수","로그함수","이차곡선",
    "세포","세포 호흡","atp","면역","항상성","유전","dna","단백질","대사","기후","탄소","해양","지질","재해"
  ];

  function extractMatchedTerms(corpusTexts, conceptDict) {
    const corpus = normalizeText(corpusTexts.join(" "));
    const matched = [];

    unique([...(conceptDict || []), ...BUILTIN_TERMS]).forEach(term => {
      const norm = normalizeText(term);
      if (!norm || norm.length < 2) return;
      if (corpus.includes(norm)) matched.push(term);
    });

    // 긴 표현 우선 / 너무 일반적인 것 과다 노출 방지
    matched.sort((a, b) => normalizeText(b).length - normalizeText(a).length);
    const filtered = [];
    matched.forEach(term => {
      const norm = normalizeText(term);
      if (!filtered.some(x => normalizeText(x).includes(norm) || norm.includes(normalizeText(x)))) {
        filtered.push(term);
      }
    });

    return filtered.slice(0, 80);
  }

  function detectTrackKeywords(corpus) {
    const text = normalizeText(corpus);
    const out = [];
    if (/배터리|이차전지|전고체|에너지|전기차|전기전자|리튬|전지|전해|열폭주/.test(text)) out.push("배터리","에너지","전기전자");
    if (/생명|의학|의생명|세포|유전|면역|항상성|단백질|효소|대사/.test(text)) out.push("생명·의생명");
    if (/환경|기후|지구|해양|재해|탄소|지질|대기/.test(text)) out.push("환경·지구");
    if (/ai|인공지능|정보|보안|알고리즘|데이터|행렬|모델링/.test(text)) out.push("AI·정보·보안");
    if (/반도체|전자기|회로|전자|광학|파동|소자|디스플레이/.test(text)) out.push("반도체·전자");
    return unique(out);
  }

  function detectStyleKeywords(corpus) {
    const text = normalizeText(corpus);
    const out = [];
    if (/실험|측정|변인|관찰|전해|반응|검증|조작|배양/.test(text)) out.push("실험형");
    if (/데이터|그래프|해석|통계|시각화|수치|경향/.test(text)) out.push("데이터형");
    if (/시스템|설계|구조|모델|최적화|회로|입력|출력/.test(text)) out.push("시스템형");
    if (/윤리|사회|책임|시민|영향|안전|지속가능/.test(text)) out.push("윤리·사회형");
    return unique(out);
  }

  function extractCurrentYearSubjects(student, currentYearIdx = 0) {
    const years = Array.isArray(student?.years) ? student.years : [];
    const year = years[currentYearIdx] || years[0] || {};
    return Array.isArray(year?.subjects) ? year.subjects : [];
  }

  async function buildStudentInputFromRecord(student, options = {}) {
    const {
      currentYearIdx = 0,
      textbookMaster = null,
      keywordMap = null,
      textbookPath = "../univ-search/data/textbook_master.json",
      keywordMapPath = "../univ-search/data/student_textbook_keyword_map.json"
    } = options;

    const [tm, km] = await Promise.all([
      textbookMaster ? Promise.resolve(textbookMaster) : fetch(textbookPath, { cache: "no-store" }).then(r => r.json()),
      keywordMap ? Promise.resolve(keywordMap) : fetch(keywordMapPath, { cache: "no-store" }).then(r => r.json())
    ]);

    const subjects = extractCurrentYearSubjects(student, currentYearIdx);
    const selectedSubjects = unique([
      ...(Array.isArray(student?.selected_subjects) ? student.selected_subjects : []),
      ...subjects.map(s => s.subject || s.subject_name).filter(Boolean)
    ]);

    const rawTexts = [];
    subjects.forEach(subject => {
      rawTexts.push(...collectSubjectTexts(subject));
    });

    const corpus = rawTexts.join(" ");
    const conceptDict = buildConceptDictionary(tm, km);
    const matchedTerms = extractMatchedTerms(rawTexts, conceptDict);

    return {
      student_id: student?.student_id || student?.id || "",
      selected_subjects: selectedSubjects,
      track_keywords: detectTrackKeywords(corpus),
      style_keywords: detectStyleKeywords(corpus),
      activity_keywords: matchedTerms.slice(0, 50),
      raw_keyword_pool: rawTexts.slice(0, 200),
      source_mode: "record_raw_text"
    };
  }

  window.StudentRecordKeywordExtractor = {
    normalizeText,
    collectSubjectTexts,
    buildConceptDictionary,
    extractMatchedTerms,
    buildStudentInputFromRecord
  };
})();
