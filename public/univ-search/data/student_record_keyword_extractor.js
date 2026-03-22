// Upgraded common keyword extractor
(function (global) {
  "use strict";

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function uniq(arr) {
    return [...new Set((arr || []).filter(Boolean))];
  }

  function joinTexts(rows) {
    return safeArray(rows)
      .map(r => [r.subject, r.item, r.text, r.category, r.term].filter(Boolean).join(" "))
      .join(" \n ");
  }

  function detectTrackKeywords(text) {
    const rules = {
      "배터리·에너지": /배터리|이차전지|전고체|리튬|전지|충방전|전해질|ESS|열폭주|폐배터리|에너지저장/i,
      "전기전자·반도체": /반도체|전자|전류|전압|회로|전자기|센서|전력반도체|모터|회생제동/i,
      "AI·정보·데이터": /AI|인공지능|알고리즘|데이터|모델링|최적화|경사하강법|프로그래밍|코딩/i,
      "생명·의생명": /생명|세포|유전|면역|항상성|단백질|효소|대사/i,
      "환경·지속가능": /환경|기후|탄소|오염|재활용|지속가능|생태|순환/i,
      "기계·모빌리티": /모빌리티|구동|동력|기계|유체|구조|회생제동|발전기/i,
      "수학·모델링": /그래프|함수|변화율|미분|적분|모델링|최적화|수식/i,
      "인문사회·정책": /윤리|정책|사회|책임|시민|제도|공공/i,
    };
    return Object.keys(rules).filter(k => rules[k].test(text));
  }

  function detectStyleKeywords(text) {
    const rules = {
      "실험형": /실험|측정|변인|통제|장치|관찰/i,
      "발표형": /발표|설명|토론|PPT|프레젠테이션/i,
      "모델링형": /모델링|그래프|함수|변화율|최적화/i,
      "설계형": /설계|구성|제작|프로토타입/i,
      "분석형": /분석|비교|평가|해석/i,
    };
    return Object.keys(rules).filter(k => rules[k].test(text));
  }

  function detectActivityKeywords(text) {
    const out = [];
    const patterns = [
      "실험", "발표", "탐구", "토론", "모델링", "분석", "설계", "제작",
      "그래프", "변화율", "전지", "배터리", "전해질", "전자기", "센서", "환경"
    ];
    patterns.forEach(p => { if (new RegExp(p, "i").test(text)) out.push(p); });
    return uniq(out);
  }

  function classifyTracks(corpus) {
    const text = String(corpus || "");
    const scores = {
      "배터리·에너지 시스템": 0,
      "전기전자·반도체": 0,
      "AI·정보·데이터": 0,
      "생명·의생명": 0,
      "환경·지속가능": 0,
      "기계·모빌리티": 0,
      "수학·모델링": 0,
      "인문사회 분석": 0,
    };

    if (/배터리|이차전지|전고체|리튬|전지|ESS|열폭주|충방전|전해질|폐배터리|에너지저장/i.test(text)) scores["배터리·에너지 시스템"] += 6;
    if (/반도체|전자|전류|전압|회로|전자기|전력반도체|센서|모터|회생제동/i.test(text)) scores["전기전자·반도체"] += 5;
    if (/AI|인공지능|알고리즘|데이터|모델링|행렬|최적화|경사하강법|프로그래밍|코딩/i.test(text)) scores["AI·정보·데이터"] += 4;
    if (/생명|세포|유전|면역|항상성|단백질|효소|대사/i.test(text)) scores["생명·의생명"] += 5;
    if (/환경|기후|탄소|순환|지속가능|오염|생태|재활용/i.test(text)) scores["환경·지속가능"] += 4;
    if (/모빌리티|구동|동력|기계|유체|구조|발전기|회생제동/i.test(text)) scores["기계·모빌리티"] += 4;
    if (/그래프|함수|변화율|미분|적분|모델링|최적화|수식/i.test(text)) scores["수학·모델링"] += 4;
    if (/윤리|정책|사회|책임|시민|제도|공공/i.test(text)) scores["인문사회 분석"] += 4;

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const main = ranked[0] && ranked[0][1] > 0 ? ranked[0][0] : "";
    const sub = ranked[1] && ranked[1][1] > 0 ? ranked[1][0] : "";
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

    return {
      main_track: main,
      sub_track: sub,
      track_scores: scores,
      track_confidence: ranked[0] ? Number((ranked[0][1] / total).toFixed(2)) : 0,
    };
  }

  function buildStudentInputFromRecord(student, rawRows, yearLabel, idx) {
    const rows = safeArray(rawRows);
    const corpus = joinTexts(rows);

    const selectedSubjects = uniq(rows.map(r => r.subject).filter(Boolean));
    const activityKeywords = detectActivityKeywords(corpus);
    const trackInfo = classifyTracks(corpus);

    return {
      student_id: student?.student_id || student?.id || "",
      selected_subjects: selectedSubjects,
      track_keywords: detectTrackKeywords(corpus),
      style_keywords: detectStyleKeywords(corpus),
      activity_keywords: activityKeywords,
      raw_keyword_pool: rows.map(r => r.text).filter(Boolean).slice(0, 200),
      source_mode: "record_raw_text",
      year_label: yearLabel || "",
      year_index: Number.isFinite(idx) ? idx : 0,
      ...trackInfo
    };
  }

  global.StudentRecordKeywordExtractor = {
    detectTrackKeywords,
    detectStyleKeywords,
    detectActivityKeywords,
    classifyTracks,
    buildStudentInputFromRecord,
  };
})(window);
