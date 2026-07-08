/* Math Hybrid Report Renderer v1.0 */
class MathHybridReportRenderer {
  static esc(v) { return String(v == null ? '' : v).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  static list(items) { return `<ol>${(items || []).map(x => `<li>${this.esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ol>`; }
  static pre(obj) { return `<pre>${this.esc(JSON.stringify(obj, null, 2))}</pre>`; }
  static card(title, body, kind = '') { return `<section class="card ${kind}"><h2>${this.esc(title)}</h2>${body}</section>`; }
  static renderExtraction(data) {
    if (!data) return '';
    const s = data.extraction_summary || {};
    const note = data.student_material_review?.lecture_note_review || {};
    const sol = data.student_material_review?.solution_review || {};
    return this.card('1차 AI 자료 분석', `
      <p><b>자료 품질:</b> ${this.esc(s.source_quality)} / <b>학생 수행 흔적:</b> ${this.esc(s.student_did_work_evidence)} / <b>확신도:</b> ${this.esc(s.confidence)}</p>
      <p><b>필기 이해 등급:</b> ${this.esc(note.understanding_level)} / <b>시청 흔적:</b> ${this.esc(note.watch_evidence)}</p>
      <p><b>풀이 과정 증거:</b> ${this.esc(sol.process_evidence)}</p>
      <h3>부족한 증거</h3>${this.list(note.missing_evidence)}
      <h3>오류 후보</h3>${this.list([...(sol.main_error_candidates||[]), ...(sol.concept_error_candidates||[])])}
    `, s.source_quality === 'clear' ? 'ok' : 'warn');
  }
  static renderVerificationQuestions(set) {
    if (!set) return '';
    const qhtml = (set.questions || []).map(q => `<div class="subcard"><h3>${this.esc(q.question_id)} · ${this.esc(q.question_type)}</h3><p>${this.esc(q.prompt)}</p><p><b>필수 요소:</b> ${(q.required_elements || []).map(x => `<span class="tag">${this.esc(x)}</span>`).join('')}</p><p class="muted"><b>교사용:</b> ${this.esc(q.teacher_note)}</p></div>`).join('');
    return this.card('학생 검수 문항', `<p>${this.esc(set.source_diagnosis)}</p>${qhtml}<p><b>판정 기준:</b> ${this.esc(set.teacher_decision_rule)}</p>`, '');
  }
  static renderAnswerReview(review) {
    if (!review) return '';
    const o = review.overall_result || {};
    return this.card('검수 답안 재검수', `
      <p><b>등급:</b> ${this.esc(o.level)} / <b>점수:</b> ${this.esc(o.score)} / <b>판정:</b> ${this.esc(o.decision)}</p>
      <p>${this.esc(o.summary)}</p>
      <h3>다시 시킬 과제</h3>${this.list(review.final_instruction?.redo_tasks)}
      <p><b>학생 안내:</b> ${this.esc(review.final_instruction?.student_message)}</p>
      <p><b>학부모 안내:</b> ${this.esc(review.final_instruction?.parent_message)}</p>
    `, o.level === 'A' || o.level === 'B' ? 'ok' : 'warn');
  }
  static renderFinalReport(report) {
    if (!report) return '';
    return this.card('최종 리포트', `
      <h3>학생용</h3><p>${this.esc(report.student_summary?.status)}</p>${this.list(report.student_summary?.next_action)}
      <h3>교사용</h3><p>${this.esc(report.teacher_summary?.diagnosis)}</p>${this.list(report.teacher_summary?.instruction_plan)}
      <h3>학부모용</h3><p>${this.esc(report.parent_summary?.plain_message)}</p>${this.list(report.parent_summary?.home_support)}
    `, 'ok');
  }
}
window.MathHybridReportRenderer = MathHybridReportRenderer;
