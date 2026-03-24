// student_tag_bridge.js
// 기존 학생 데이터(record_detail.json / school_record_raw.json 등)에서
// integrated engine용 taggedStudent를 만드는 브리지 수정본
// 핵심 수정: id, student_id 둘 다 허용

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load: ${path} (${res.status})`);
  return res.json();
}

function norm(v) {
  return String(v ?? "").trim();
}

function pickStudentFromRecordDetail(data, studentId) {
  const arr = Array.isArray(data?.students) ? data.students : [];
  return arr.find(s =>
    norm(s?.student_id) === norm(studentId) ||
    norm(s?.id) === norm(studentId)
  ) || null;
}

function collectYearSubjects(student) {
  const years = Array.isArray(student?.years) ? student.years : [];
  const out = [];
  for (const year of years) {
    const subjects = Array.isArray(year?.subjects) ? year.subjects : [];
    for (const subj of subjects) {
      out.push({
        year: year?.year || year?.year_label || "",
        subject: subj?.subject || subj?.subject_name || "",
        summary: subj?.summary || "",
        goal: subj?.subject_goal_focus || "",
        basis: subj?.current_activity_basis || subj?.analysis_basis || "",
        evidence: subj?.evidence_first?.evidence_summary || "",
        interpretation: subj?.evidence_first?.interpretation || "",
      });
    }
  }
  return out;
}

function collectRawRows(rawData, studentId) {
  const root =
    rawData?.[studentId] ||
    rawData?.raw_record ||
    rawData?.student ||
    {};
  const rows = Array.isArray(root?.rows) ? root.rows : [];
  return rows.map(r => ({
    term: r?.term || "",
    category: r?.category || "",
    subject: r?.subject || "",
    item: r?.item || "",
    text: r?.text || ""
  }));
}

function mergeTexts(subjectRows, rawRows) {
  const texts = [];
  for (const row of subjectRows) {
    if (row.subject) texts.push(`[${row.subject}]`);
    if (row.summary) texts.push(row.summary);
    if (row.goal) texts.push(row.goal);
    if (row.basis) texts.push(row.basis);
    if (row.evidence) texts.push(row.evidence);
    if (row.interpretation) texts.push(row.interpretation);
  }
  for (const row of rawRows) {
    if (row.subject || row.category) texts.push(`[${row.subject || row.category}]`);
    if (row.text) texts.push(row.text);
  }
  return texts.join(" ");
}

function addIfIncludes(text, words, targetSet, value) {
  if (words.some(word => text.includes(word))) targetSet.add(value);
}

function inferTagsFromText(text) {
  const themeTags = new Set();
  const methodTags = new Set();
  const thinkingTags = new Set();
  const majorTags = new Set();
  const evidenceTags = new Set();

  addIfIncludes(text, ["기후", "환경", "대기", "미세먼지", "오염"], themeTags, "환경");
  addIfIncludes(text, ["기후", "온난화", "탄소", "기온"], themeTags, "기후");
  addIfIncludes(text, ["생명", "세포", "효소", "면역", "항상성", "소화"], themeTags, "생명");
  addIfIncludes(text, ["배터리", "전지", "산화", "환원", "촉매"], themeTags, "화학/에너지");
  addIfIncludes(text, ["센서", "측정", "데이터", "그래프"], themeTags, "데이터");
  addIfIncludes(text, ["AI", "인공지능", "프로그래밍", "코딩", "정보", "머신러닝", "로봇"], themeTags, "AI/SW");
  addIfIncludes(text, ["신소재", "소재", "재료"], themeTags, "신소재");
  addIfIncludes(text, ["윤리", "생명윤리", "토론", "찬반", "프라이버시"], themeTags, "윤리");

  addIfIncludes(text, ["실험", "관찰", "배양", "측정"], methodTags, "실험");
  addIfIncludes(text, ["자료", "조사", "논문", "기사", "독서"], methodTags, "자료조사");
  addIfIncludes(text, ["데이터", "그래프", "회귀", "시각화", "분석"], methodTags, "데이터분석");
  addIfIncludes(text, ["모델링", "함수", "개형"], methodTags, "모델링");
  addIfIncludes(text, ["제작", "설계", "구현", "장치", "제어"], methodTags, "제작");
  addIfIncludes(text, ["발표", "설명", "토론"], methodTags, "발표/토론");
  addIfIncludes(text, ["논증", "비평", "찬반", "주장"], methodTags, "논증");

  addIfIncludes(text, ["구조", "구조화", "체계"], thinkingTags, "구조화");
  addIfIncludes(text, ["비교", "차이", "조건"], thinkingTags, "조건비교");
  addIfIncludes(text, ["변수", "통제"], thinkingTags, "변수통제");
  addIfIncludes(text, ["패턴", "규칙성"], thinkingTags, "패턴분석");
  addIfIncludes(text, ["해결", "개선", "적용"], thinkingTags, "문제해결");
  addIfIncludes(text, ["정량", "그래프", "수치", "분석"], thinkingTags, "정량분석");
  addIfIncludes(text, ["융합", "연계", "연결"], thinkingTags, "융합적사고");
  addIfIncludes(text, ["비판", "비평", "반박"], thinkingTags, "비판적사고");

  addIfIncludes(text, ["생명공학", "생명", "효소", "세포", "면역"], majorTags, "생명공학");
  addIfIncludes(text, ["환경공학", "기후", "환경", "오염", "대기"], majorTags, "환경공학");
  addIfIncludes(text, ["화학공학", "산화", "환원", "촉매", "화학"], majorTags, "화학공학");
  addIfIncludes(text, ["신소재", "소재", "재료"], majorTags, "신소재공학");
  addIfIncludes(text, ["AI", "인공지능", "프로그래밍", "코딩", "정보", "머신러닝", "로봇", "임베디드"], majorTags, "AI/SW");
  addIfIncludes(text, ["의학", "간호", "보건", "항상성", "생명윤리"], majorTags, "의약학");

  addIfIncludes(text, ["발표"], evidenceTags, "발표 주제/내용");
  addIfIncludes(text, ["근거", "주장"], evidenceTags, "주장과 근거");
  addIfIncludes(text, ["피드백"], evidenceTags, "피드백");
  addIfIncludes(text, ["실험", "관찰", "측정", "탐구"], evidenceTags, "탐구 과정");
  if (text.length > 0) evidenceTags.add("객관적 사실");

  return {
    theme_tags: [...themeTags],
    method_tags: [...methodTags],
    thinking_tags: [...thinkingTags],
    major_tags: [...majorTags],
    evidence_tags: [...evidenceTags]
  };
}

function inferActivityLevel(subjectRows, rawRows) {
  const joined = mergeTexts(subjectRows, rawRows);
  if (["모델링", "회귀", "점근선", "미분", "촉매", "윤리", "구현", "머신러닝", "로봇 제어"].some(k => joined.includes(k))) return "심화";
  if (["탐구", "실험", "비교", "분석"].some(k => joined.includes(k))) return "적용";
  return "기초";
}

function inferRecordQuality(subjectRows, rawRows) {
  const score =
    subjectRows.filter(r => r.summary || r.evidence || r.interpretation).length +
    rawRows.filter(r => r.text && r.text.length > 20).length;
  if (score >= 6) return "높음";
  if (score >= 3) return "보통";
  return "낮음";
}

export async function buildTaggedStudent(studentId, options = {}) {
  const recordDetailPath = options.recordDetailPath || "./record_detail.json";
  const rawRecordPath = options.rawRecordPath || "./school_record_raw.json";

  const [recordDetail, rawRecord] = await Promise.all([
    fetchJson(recordDetailPath),
    fetchJson(rawRecordPath)
  ]);

  const student = pickStudentFromRecordDetail(recordDetail, studentId);
  if (!student) {
    throw new Error(`student not found in record_detail.json: ${studentId}`);
  }

  const subjectRows = collectYearSubjects(student);
  const rawRows = collectRawRows(rawRecord, studentId);
  const mergedText = mergeTexts(subjectRows, rawRows);
  const inferred = inferTagsFromText(mergedText);

  return {
    student_id: student?.student_id || student?.id || studentId,
    record_type: "통합",
    subject: (subjectRows[0] && subjectRows[0].subject) || "",
    grade_level: (subjectRows[0] && subjectRows[0].year) || "",
    source_text: mergedText.slice(0, 3000),
    ...inferred,
    activity_level: inferActivityLevel(subjectRows, rawRows),
    record_quality: inferRecordQuality(subjectRows, rawRows),
    extension_fit: [],
    admission_fit: [],
    notes: "record_detail.json + school_record_raw.json 기반 자동 태그화 결과 (student_id 대응 수정본)"
  };
}
