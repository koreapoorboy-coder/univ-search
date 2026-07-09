/* Math Hybrid Report Renderer v1.4 · Patch 14 student workbook layout
 * Student view first, teacher/debug data collapsed.
 */
class MathHybridReportRenderer {
  static esc(v) {
    return String(v == null ? '' : v).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }
  static asArray(items) {
    if (!items) return [];
    if (Array.isArray(items)) return items.filter(x => x != null && String(typeof x === 'string' ? x : JSON.stringify(x)).trim());
    return [items].filter(x => x != null && String(x).trim());
  }
  static studentify(v) {
    let s = String(v == null ? '' : (typeof v === 'string' ? v : JSON.stringify(v)));
    const map = {
      problem_solving:'문제풀이 자료', wrong_answer_note:'오답노트 자료', concept_summary:'개념정리 자료', lecture_note:'수업 필기 자료', verification_answer:'재검수 답안 자료', mixed:'혼합 자료', unknown:'판별 보류',
      solve_diagnosis:'문제풀이 진단', concept_review:'개념정리 검수', mixed_diagnosis:'혼합 진단', verification_review:'재검수', insufficient:'자료 부족',
      confidence:'판단 근거', partially_clear:'일부 확인 가능', insufficient:'자료 부족', weak:'부족', some:'일부 있음', strong:'충분',
      definition:'개념 설명', process:'풀이 과정', self_explanation:'자기 설명', counterexample_generation:'반례 만들기', non_example_classification:'비예시 구분', example_generation:'예시 만들기', classification:'분류 판단', proof_explanation:'근거 설명', error_correction:'오류 수정',
      partial_understanding:'부분 이해', memorized_only:'암기 중심', needs_relearning:'재학습 필요', understood:'이해 완료'
    };
    for (const [k, val] of Object.entries(map)) s = s.replaceAll(k, val);
    s = s.replace(/\bVQ(\d+)\b/g, '문제 $1');
    s = s.replace(/확신도\s*[:：]?\s*0?\.\d+/g, '판단 근거는 교사용에서 확인');
    s = s.replace(/confidence\s*[:：]?\s*0?\.\d+/gi, '판단 근거는 교사용에서 확인');
    return s;
  }
  static list(items, empty = '확인된 항목이 아직 부족합니다.') {
    const arr = this.asArray(items).map(x => this.studentify(x)).filter(Boolean);
    if (!arr.length) return `<p class="muted">${this.esc(empty)}</p>`;
    return `<ol>${arr.map(x => `<li>${this.esc(x)}</li>`).join('')}</ol>`;
  }
  static plainList(items, empty = '확인된 항목이 아직 부족합니다.') {
    return this.list(items, empty);
  }
  static pre(obj) { return `<pre>${this.esc(JSON.stringify(obj, null, 2))}</pre>`; }
  static card(title, body, kind = '') { return `<section class="card ${kind}"><h2>${this.esc(title)}</h2>${body}</section>`; }
  static tags(items) { return this.asArray(items).map(x => `<span class="tag">${this.esc(this.studentify(x))}</span>`).join(''); }
  static details(title, body, open = false) { return `<details class="teacher-raw" ${open ? 'open' : ''}><summary>${this.esc(title)}</summary>${body}</details>`; }
  static badge(text, kind = '') { return `<span class="result-badge ${kind}">${this.esc(text)}</span>`; }

  static materialTypeKo(type) {
    return {
      problem_solving:'문제풀이 자료', wrong_answer_note:'오답노트 자료', concept_summary:'개념정리 자료', lecture_note:'수업 필기 자료', verification_answer:'재검수 답안 자료', mixed:'혼합 자료', unknown:'판별 보류'
    }[type] || '자료 확인 중';
  }
  static routeKo(route) {
    return {
      solve_diagnosis:'문제풀이 진단', concept_review:'개념정리 검수', mixed_diagnosis:'혼합 진단', verification_review:'재검수', insufficient:'자료 부족'
    }[route] || '진단 중';
  }
  static levelKo(level) {
    return { A:'통과 가능', B:'부분 이해', C:'암기 중심', D:'재정리 필요' }[level] || '판정 보류';
  }
  static questionTypeKo(type, index = 0) {
    return {
      definition:'개념 설명형', classification:'분류 판단형', process:'풀이 과정형', proof_explanation:'근거 설명형', error_correction:'오류 수정형', self_explanation:'자기 설명형', example_generation:'예시 만들기형', counterexample_generation:'반례 판단형', non_example_classification:'비예시 구분형'
    }[type] || `확인 문제 ${index + 1}`;
  }

  static uniqueTop(items, n = 3) {
    const seen = new Set();
    const out = [];
    for (const raw of this.asArray(items)) {
      const s = this.studentify(raw).trim();
      if (!s || seen.has(s)) continue;
      seen.add(s); out.push(s);
      if (out.length >= n) break;
    }
    return out;
  }
  static getConceptName(state) {
    const ext = state?.extraction || state || {};
    const vq = state?.verificationSet || {};
    const fromVq = this.asArray(vq.target_concepts)[0];
    const fromMath = this.asArray(ext.math_signal?.concept_candidates).map(x => x?.concept_name || x?.concept_id).filter(Boolean)[0];
    const fromReview = this.asArray(ext.verification_need?.focus_concepts)[0];
    return fromVq || fromMath || fromReview || '핵심 개념';
  }
  static decideOutcome(data, noteReview = null) {
    const s = data?.extraction_summary || {};
    const purpose = data?.file_purpose_review || {};
    const note = data?.student_material_review?.lecture_note_review || {};
    const concept = data?.student_material_review?.concept_note_review || {};
    const sol = data?.student_material_review?.solution_review || {};
    const counter = concept.counterexample_review || {};
    const level = note.understanding_level || concept.connected_understanding_level || noteReview?.summary?.understanding_level || 'D';
    const sourceQuality = s.source_quality || '';
    const needsVerification = data?.verification_need?.needed;
    let verdict = '재정리 필요';
    let kind = 'danger';
    if (purpose.routing_decision === 'insufficient' || sourceQuality === 'insufficient') {
      verdict = '자료 부족 · 다시 제출 필요'; kind = 'danger';
    } else if (level === 'A' && !needsVerification) {
      verdict = '통과 가능'; kind = 'ok';
    } else if (level === 'A' || level === 'B') {
      verdict = '부분 이해 · 확인 문제 필요'; kind = 'warn';
    }
    const ptype = purpose.primary_material_type || '';
    let oneLine = '정답보다 개념을 언제 쓰는지, 왜 쓰는지까지 확인해야 합니다.';
    if (purpose.routing_decision === 'insufficient' || sourceQuality === 'insufficient') {
      oneLine = '사진이나 풀이 정보가 부족해서 정확한 판단을 하려면 자료를 다시 제출해야 합니다.';
    } else if (ptype === 'concept_summary' || ptype === 'lecture_note' || ptype === 'mixed') {
      if (counter.counterexample_present === 'missing') oneLine = '정의는 일부 적었지만, 조건·반례/비예시·문제 적용 기준까지 확인하는 증거가 부족합니다.';
      else oneLine = '개념 정리 흔적은 있으나, 자기 말 설명과 문제 적용 기준을 한 번 더 확인해야 합니다.';
    } else if (ptype === 'problem_solving' || ptype === 'wrong_answer_note') {
      oneLine = '풀이 흔적은 있으나, 왜 그 개념을 선택했는지와 중간 과정 설명이 부족합니다.';
    }
    const missing = this.uniqueTop([
      ...(note.missing_evidence || []),
      ...(concept.missing_links || []),
      ...(noteReview?.risk_flags || []).map(x => x?.message || x?.id || x),
      ...(noteReview?.redo_task || []),
      counter.counterexample_present === 'missing' ? '반례/비예시와 “왜 안 되는지” 이유가 없음' : '',
      '정의·조건·예시·반례를 한 묶음으로 다시 정리해야 함'
    ], 3);
    const risks = this.uniqueTop([
      ...(sol.main_error_candidates || []),
      ...(sol.concept_error_candidates || []),
      ...(concept.misuse_risks || []),
      data?.math_signal?.misconception_candidates?.[0]?.misconception,
      '정의를 외웠지만 적용 조건을 놓칠 가능성'
    ], 3);
    const reasons = this.uniqueTop([
      ptype ? `올린 자료는 ${this.materialTypeKo(ptype)} 성격으로 보입니다.` : '',
      note.understanding_level ? `현재 설명 수준은 ${this.levelKo(note.understanding_level)}에 가깝습니다.` : '',
      concept.summary_type && concept.summary_type !== 'not_present' ? '개념 정리는 보이지만 조건·반례·적용 기준이 충분히 드러나야 합니다.' : '',
      sol.process_evidence && sol.process_evidence !== 'not_visible' ? '풀이 과정 일부가 보이지만 이유 설명을 더 확인해야 합니다.' : '',
      needsVerification ? '확인 문제로 실제 이해 여부를 다시 보아야 합니다.' : ''
    ], 4);
    return { verdict, kind, oneLine, missing, risks, reasons, level };
  }

  static buildRewriteRows(conceptName, data = {}) {
    const concept = data?.student_material_review?.concept_note_review || {};
    const rewrite = concept.concept_rewrite_template || {};
    const order = rewrite.required_order?.length ? rewrite.required_order : ['개념 이름','정의','사용 조건','대표 예시','반례/비예시','왜 반례인지','문제에서 언제 쓰는지'];
    const guide = {
      '개념 이름':'오늘 다시 정리할 개념명을 씁니다.',
      '정의':'교과서 문장을 그대로 베끼지 말고 자기 말로 씁니다.',
      '사용 조건':'이 개념을 써도 되는 조건을 씁니다.',
      '대표 예시':'조건을 만족하는 예시 1개를 씁니다.',
      '반례/비예시':'비슷해 보이지만 이 개념을 쓰면 안 되는 예시를 씁니다.',
      '왜 반례인지':'어떤 조건을 어겼는지 한 문장으로 씁니다.',
      '자주 하는 착각':'헷갈리기 쉬운 표현이나 잘못된 일반화를 씁니다.',
      '문제 적용 기준':'문제에서 어떤 말이 보이면 이 개념을 쓸지 씁니다.',
      '대표 문제 적용':'대표 문제에서 어느 줄에 이 개념을 썼는지 표시합니다.'
    };
    const normalized = order.includes('개념 이름') ? order : ['개념 이름', ...order];
    return normalized.map(label => ({ label, guide: guide[label] || '학생이 자기 말로 채워야 합니다.', seed: label === '개념 이름' ? conceptName : '' }));
  }
  static renderRewriteTable(conceptName, data) {
    const rows = this.buildRewriteRows(conceptName, data);
    return `<table class="workbook-table"><thead><tr><th>항목</th><th>학생이 써야 할 내용</th><th>작성칸</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${this.esc(this.studentify(r.label))}</b></td><td>${this.esc(this.studentify(r.guide))}</td><td class="blank-cell">${this.esc(r.seed || '')}</td></tr>`).join('')}</tbody></table>`;
  }

  static buildDefaultQuestions(conceptName) {
    return {
      set_id: 'student_workbook_default_questions',
      target_concepts: [conceptName],
      source_diagnosis: '학생 이해 확인 필요',
      questions: [
        { question_id:'Q1', question_type:'definition', prompt:`${conceptName}을/를 자기 말로 설명하고, 반드시 “언제 쓸 수 있는지” 조건을 1개 쓰세요.`, student_answer_format:'2~4문장', required_elements:['정의','사용 조건','대표 예시'], answer_key:'모범답안 기준: 개념의 뜻이 드러나야 하고, 그 개념을 적용할 수 있는 조건 1개와 조건을 만족하는 예시 1개가 함께 있어야 합니다.', rubric:[{score:3,condition:'정의·조건·예시가 모두 정확함'},{score:2,condition:'정의는 맞지만 조건 또는 예시가 부족함'},{score:1,condition:'용어만 반복함'}], minimum_pass_score:2, teacher_note:'개념어 암기와 실제 이해를 구분합니다.' },
        { question_id:'Q2', question_type:'counterexample_generation', prompt:`${conceptName}을/를 적용하면 안 되는 반례 또는 비예시를 1개 만들고, 왜 안 되는지 이유를 쓰세요.`, student_answer_format:'반례/비예시 + 이유', required_elements:['반례 또는 비예시','적용하면 안 되는 조건','왜 안 되는지 이유'], answer_key:'모범답안 기준: 겉으로 비슷하지만 개념의 조건을 어기는 예시여야 합니다. “왜 안 되는지”를 조건 위반으로 설명해야 통과입니다.', rubric:[{score:4,condition:'반례와 이유가 정확함'},{score:2,condition:'반례는 있으나 이유가 부족함'},{score:1,condition:'그냥 다른 예시를 반례로 착각함'}], minimum_pass_score:3, teacher_note:'반례 설명 가능 여부를 확인합니다.' },
        { question_id:'Q3', question_type:'process', prompt:'대표 문제 하나를 골라 풀이 과정을 처음부터 끝까지 쓰고, 중간에 사용한 개념 이름과 이유를 표시하세요.', student_answer_format:'단계별 풀이', required_elements:['시작식','중간 과정','사용한 개념','선택 이유','결론'], answer_key:'모범답안 기준: 시작식→중간 과정→사용한 개념→그 개념을 선택한 이유→결론이 순서대로 보여야 합니다. 정답만 쓰면 통과하지 않습니다.', rubric:[{score:4,condition:'과정과 이유가 모두 정확함'},{score:2,condition:'계산은 있으나 이유가 부족함'},{score:1,condition:'정답만 있음'}], minimum_pass_score:3, teacher_note:'풀이 과정과 근거를 확인합니다.' }
      ],
      teacher_decision_rule:'확인 문제 3개 중 2개 이상 통과해야 부분 이해 이상으로 봅니다. 반례/비예시 문항을 틀리면 개념정리를 다시 해야 합니다.',
      redo_policy:'통과하지 못한 문항은 같은 구조의 다른 예시로 다시 작성합니다.'
    };
  }
  static renderQuestionSet(set, conceptName) {
    const source = set || this.buildDefaultQuestions(conceptName);
    const questions = this.asArray(source.questions).length ? source.questions : this.buildDefaultQuestions(conceptName).questions;
    const html = questions.map((q, idx) => {
      const title = `문제 ${idx + 1}. ${this.questionTypeKo(q.question_type, idx)}`;
      const rubric = this.asArray(q.rubric).map(r => `${r.score}점: ${r.condition}`);
      return `<article class="question-card workbook-question">
        <div class="question-top"><span class="qnum">${this.esc(title)}</span></div>
        <p class="question-prompt">${this.esc(this.studentify(q.prompt || '문제 내용을 확인하세요.'))}</p>
        <p><b>답안에 꼭 들어갈 것:</b> ${this.tags(q.required_elements)}</p>
        <div class="student-answer-space">학생 답안 작성칸</div>
        <details class="answer-key-box"><summary>정답/모범답안 확인</summary>
          <p><b>모범답안 기준:</b> ${this.esc(this.studentify(q.answer_key || '정답 기준 정보가 부족합니다.'))}</p>
          <h4>채점 기준</h4>${this.list(rubric, '채점 기준 정보가 부족합니다.')}
          <p><b>통과 기준:</b> ${this.esc(q.minimum_pass_score || 2)}점 이상</p>
        </details>
        ${this.details('교사용 출제 의도', `<p>${this.esc(this.studentify(q.teacher_note || ''))}</p>`)}
      </article>`;
    }).join('');
    return `<section class="workbook-section"><h2>4. 확인 문제</h2><p class="muted">학생은 먼저 문제를 풀고, 그 다음 정답/모범답안을 열어 비교합니다.</p>${html}</section>`;
  }

  static renderTeacherPanel(state) {
    const data = {
      ai_extraction: state?.extraction || null,
      engine_diagnosis: state?.engineDiagnosis || null,
      note_review: state?.noteReview || null,
      verification_set: state?.verificationSet || null,
      answer_review: state?.answerReview || null,
      final_report: state?.finalReport || null
    };
    const ext = state?.extraction || {};
    const summary = ext.extraction_summary || {};
    const purpose = ext.file_purpose_review || {};
    return `<details class="teacher-diagnostic"><summary>교사용 상세 진단 열기</summary>
      <div class="teacher-mini-grid">
        <div><b>자료 품질</b><br>${this.esc(this.studentify(summary.source_quality || '확인 필요'))}</div>
        <div><b>파일 목적</b><br>${this.esc(this.materialTypeKo(purpose.primary_material_type))}</div>
        <div><b>진단 경로</b><br>${this.esc(this.routeKo(purpose.routing_decision))}</div>
      </div>
      ${this.details('JSON 원자료 보기', this.pre(data))}
    </details>`;
  }

  static renderAnswerReviewCompact(review) {
    if (!review) return '';
    const o = review.overall_result || {};
    const kind = o.level === 'A' || o.level === 'B' ? 'ok' : 'warn';
    return `<section class="workbook-section"><h2>재검수 결과</h2>
      <div class="student-result-head ${kind}"><div class="result-label">학생 답안 판정</div><div class="result-title">${this.esc(this.studentify(o.decision || this.levelKo(o.level)))}</div><div class="result-meta">등급 ${this.esc(o.level || '보류')}</div></div>
      <p>${this.esc(this.studentify(o.summary || '재검수 결과를 확인하세요.'))}</p>
      <h3>다시 할 과제</h3>${this.list(review.final_instruction?.redo_tasks)}
      <p><b>학생 안내:</b> ${this.esc(this.studentify(review.final_instruction?.student_message || ''))}</p>
    </section>`;
  }
  static renderFinalReportCompact(report) {
    if (!report) return '';
    return `<section class="workbook-section"><h2>최종 정리</h2>
      <h3>학생용 결과</h3><p>${this.esc(this.studentify(report.student_summary?.status || ''))}</p>${this.list(report.student_summary?.next_action)}
      <h3>학부모 안내</h3><p>${this.esc(this.studentify(report.parent_summary?.plain_message || ''))}</p>
    </section>`;
  }

  static renderStudentWorkbook(state) {
    const data = state?.extraction || state || null;
    if (!data) return '';
    const conceptName = this.getConceptName(state);
    const outcome = this.decideOutcome(data, state?.noteReview);
    const rewrite = data?.student_material_review?.concept_note_review?.concept_rewrite_template || {};
    const redoPrompt = rewrite.student_rewrite_prompt || '강의 내용을 그대로 옮기지 말고, 정의·조건·예시·반례·문제 적용 기준을 자기 말로 다시 정리하세요.';
    const counterTask = data?.student_material_review?.concept_note_review?.counterexample_review?.missing_counterexample_task || '반례/비예시 1개와 “왜 안 되는지” 이유를 반드시 작성하세요.';
    const submitRule = state?.verificationSet?.teacher_decision_rule || '정의, 사용 조건, 대표 예시, 반례/비예시, 문제 적용 기준 중 4개 이상이 보여야 통과입니다.';
    return `<section class="card workbook-card ${outcome.kind}">
      <div class="workbook-header">
        <div class="result-label">오늘 결과</div>
        <div class="result-title">${this.esc(outcome.verdict)}</div>
        <p class="workbook-one-line">${this.esc(outcome.oneLine)}</p>
      </div>
      <section class="workbook-section"><h2>1. 왜 이렇게 나왔나요?</h2>${this.list(outcome.reasons, '자료에서 확인되는 근거가 아직 부족합니다.')}</section>
      <section class="workbook-section"><h2>2. 지금 부족한 것 3개</h2>${this.list(outcome.missing, '부족한 부분을 확인하려면 자료를 다시 제출해야 합니다.')}</section>
      <section class="workbook-section"><h2>3. 다시 해야 할 정리 양식</h2>
        <p>${this.esc(this.studentify(redoPrompt))}</p>
        ${this.renderRewriteTable(conceptName, data)}
        <div class="student-action-card"><b>반례/비예시 과제</b><p>${this.esc(this.studentify(counterTask))}</p></div>
      </section>
      ${this.renderQuestionSet(state?.verificationSet, conceptName)}
      <section class="workbook-section"><h2>5. 재제출 기준</h2>
        <ul class="submit-checklist"><li>정의만 쓰면 통과가 아닙니다.</li><li>사용 조건과 대표 예시가 같이 있어야 합니다.</li><li>반례/비예시에는 반드시 “왜 안 되는지” 이유가 있어야 합니다.</li><li>문제에서 언제 이 개념을 쓰는지 1문장으로 써야 합니다.</li></ul>
        <p><b>통과 기준:</b> ${this.esc(this.studentify(submitRule))}</p>
      </section>
      ${this.renderAnswerReviewCompact(state?.answerReview)}
      ${this.renderFinalReportCompact(state?.finalReport)}
      ${this.renderTeacherPanel(state)}
    </section>`;
  }

  /* Legacy methods are kept for older pages. They now avoid exposing student-facing debug logs. */
  static renderExtraction(data) { return data ? this.renderStudentWorkbook({ extraction:data }) : ''; }
  static renderEngineSummary(diagnosis) {
    if (!diagnosis) return '';
    return this.details('교사용 엔진 매칭 결과', this.pre(diagnosis));
  }
  static renderNoteReviewSummary(review) {
    if (!review) return '';
    return this.details('교사용 필기/개념정리 검수 결과', this.pre(review));
  }
  static renderVerificationQuestions(set) { return set ? this.renderQuestionSet(set, this.getConceptName({ verificationSet:set })) : ''; }
  static renderAnswerReview(review) { return this.renderAnswerReviewCompact(review); }
  static renderFinalReport(report) { return this.renderFinalReportCompact(report); }
}
window.MathHybridReportRenderer = MathHybridReportRenderer;
