/* Math Hybrid Report Renderer v1.4 · Patch 15 proof-based concept diagnosis */
class MathHybridReportRenderer {
  static esc(v) { return String(v == null ? '' : v).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  static list(items) {
    const arr = (items || []).filter(x => x != null && String(typeof x === 'string' ? x : JSON.stringify(x)).trim());
    if (!arr.length) return '<p class="muted">확인된 항목이 아직 부족합니다.</p>';
    return `<ol>${arr.map(x => `<li>${this.esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ol>`;
  }
  static pre(obj) { return `<pre>${this.esc(JSON.stringify(obj, null, 2))}</pre>`; }
  static card(title, body, kind = '') { return `<section class="card ${kind}"><h2>${this.esc(title)}</h2>${body}</section>`; }
  static tags(items) { return (items || []).map(x => `<span class="tag">${this.esc(x)}</span>`).join(''); }
  static details(title, body, open = false) { return `<details class="teacher-raw" ${open ? 'open' : ''}><summary>${this.esc(title)}</summary>${body}</details>`; }
  static badge(text, kind = '') { return `<span class="result-badge ${kind}">${this.esc(text)}</span>`; }

  static materialTypeKo(type) {
    return {
      problem_solving:'문제풀이 자료', wrong_answer_note:'오답노트', concept_summary:'개념정리', lecture_note:'수업/인강 필기', verification_answer:'검수 답안', mixed:'혼합 자료', unknown:'판별 불가'
    }[type] || type || '자료';
  }
  static routeKo(route) {
    return { solve_diagnosis:'문제풀이 진단', concept_review:'개념정리 검수', mixed_diagnosis:'혼합 진단', verification_review:'재검수', insufficient:'자료 부족' }[route] || route || '진단';
  }
  static levelKo(level) {
    return { A:'증명 가능', B:'부분 증명 가능', C:'암기 중심', D:'재학습 필요' }[level] || level || '판정 보류';
  }
  static questionTypeKo(type) {
    return {
      definition: '정의 확인형',
      classification: '조건 판정형',
      process: '과정 증명형',
      proof_explanation: '증명 설명형',
      error_correction: '오류 수정형',
      self_explanation: '자기 설명형',
      example_generation: '예시 생성형',
      counterexample_generation: '반례 증명형',
      non_example_classification: '비예시 판정형'
    }[type] || type || '확인형';
  }
  static proofSignalText(data) {
    return JSON.stringify({
      verification: data?.verification_need,
      concept: data?.student_material_review?.concept_note_review,
      math: data?.math_signal,
      engine: data?.engine_adapter
    });
  }
  static buildProofPlan(data) {
    const text = this.proofSignalText(data);
    const focus = [
      ...(data?.verification_need?.focus_concepts || []),
      ...(data?.math_signal?.concept_candidates || []).map(x => x.concept_name).filter(Boolean),
      ...(data?.math_signal?.unit_candidates || []).map(x => x.unit_name).filter(Boolean)
    ];
    const conceptName = focus[0] || '핵심 개념';
    const looksIrrational = /무리수|유리수|순환소수|비순환|루트|제곱근|√|pi|π|분수 꼴|유한소수|무한소수/.test(text);
    if (looksIrrational) {
      return {
        title: '유리수·무리수 증명형 판정',
        thesis: '정답을 고르는 것이 아니라, 그 수가 왜 유리수인지 또는 왜 무리수인지 증명할 수 있는지를 확인합니다.',
        boundary: [
          '유리수임을 보이려면 정수/정수 꼴로 나타낼 수 있음을 보여야 합니다.',
          '무리수임을 보이려면 분수 꼴로 나타낼 수 없다는 근거를 제시해야 합니다.',
          '끝나지 않는 소수라도 반복되면 유리수입니다.',
          '루트가 있어도 값이 정수나 분수로 나오면 무리수가 아닙니다.'
        ],
        tasks: [
          { label: '유리수 증명', body: '0.333... 또는 0.121212...가 끝나지 않는데도 유리수인 이유를 분수 변환으로 증명하기' },
          { label: '무리수가 아님 증명', body: '√4, √9처럼 루트가 있어도 값이 정수로 나오면 유리수임을 증명하기' },
          { label: '무리수 증명', body: '√2가 유리수라고 가정했을 때 모순이 생기는 구조를 설명하기' },
          { label: '반례 증명', body: '“무한소수는 모두 무리수이다”, “루트가 있으면 모두 무리수이다”가 틀렸음을 반례로 보이기' }
        ],
        format: ['주장: 이 수는 유리수/무리수이다.', '근거: 분수 꼴 가능 여부 또는 조건을 보인다.', '반례/비예시: 헷갈리는 일반화를 깨뜨린다.', '결론: 따라서 왜 그렇게 판정되는지 한 문장으로 마무리한다.']
      };
    }
    const boundary = data?.student_material_review?.concept_note_review?.boundary_condition_review || {};
    const required = boundary.required_conditions || ['정의가 성립하는 조건', '공식을 적용할 수 있는 조건', '적용하면 안 되는 조건'];
    return {
      title: `${conceptName} 증명형 개념 판정`,
      thesis: '개념을 외웠는지가 아니라, 그 개념이 왜 성립하고 언제 성립하지 않는지를 근거로 설명할 수 있는지 확인합니다.',
      boundary: required,
      tasks: [
        { label: '성립 조건 증명', body: `${conceptName}이/가 성립하는 조건을 쓰고, 대표 예시가 그 조건을 만족함을 보이기` },
        { label: '비성립 조건 증명', body: `${conceptName}을/를 적용하면 안 되는 경우를 만들고, 어떤 조건이 깨졌는지 설명하기` },
        { label: '반례 증명', body: `틀린 일반화 문장 1개를 만들고, 반례로 왜 틀렸는지 보이기` },
        { label: '비교 설명', body: `겉모양이 비슷하지만 판정이 달라지는 두 예시를 비교하기` }
      ],
      format: ['주장', '조건 확인', '근거 또는 계산 과정', '반례/비예시', '결론']
    };
  }
  static decideOutcome(data) {
    const s = data?.extraction_summary || {};
    const purpose = data?.file_purpose_review || {};
    const note = data?.student_material_review?.lecture_note_review || {};
    const concept = data?.student_material_review?.concept_note_review || {};
    const sol = data?.student_material_review?.solution_review || {};
    const level = note.understanding_level || concept.connected_understanding_level || 'D';
    const confidence = Number(s.confidence || 0);
    const needsVerification = data?.verification_need?.needed;
    const purposeKo = this.materialTypeKo(purpose.primary_material_type);
    let verdict = '증명 확인 필요';
    let kind = 'warn';
    if (purpose.routing_decision === 'insufficient' || s.source_quality === 'insufficient') {
      verdict = '자료 부족 · 다시 제출 필요'; kind = 'danger';
    } else if (level === 'A' && confidence >= 0.7 && !needsVerification) {
      verdict = '증명 가능 수준'; kind = 'ok';
    } else if (level === 'B' || confidence >= 0.65) {
      verdict = '조건은 일부 이해 · 증명 확인 필요'; kind = 'warn';
    } else {
      verdict = '정의 암기 가능성 · 증명형 재정리 필요'; kind = 'danger';
    }
    const reasons = [];
    if (purpose.primary_material_type) reasons.push(`올린 자료는 ${purposeKo}로 판별되었습니다.`);
    if (note.understanding_level) reasons.push(`필기/정리 이해 수준은 ${this.levelKo(note.understanding_level)}입니다.`);
    if (concept.summary_type && concept.summary_type !== 'not_present') reasons.push(`개념 정리는 ${concept.summary_type} 형태이며, 연결 이해는 ${this.levelKo(concept.connected_understanding_level)}입니다.`);
    if (sol.process_evidence) reasons.push(`풀이 과정 증거: ${sol.process_evidence}`);
    const missing = [ ...(note.missing_evidence || []), ...(concept.missing_links || []) ].slice(0, 5);
    const risks = [ ...(sol.main_error_candidates || []), ...(sol.concept_error_candidates || []), ...(concept.misuse_risks || []) ].slice(0, 5);
    return { verdict, kind, purposeKo, routeKo: this.routeKo(purpose.routing_decision), level, reasons, missing, risks };
  }

  static renderProofPlan(plan) {
    const taskHtml = (plan.tasks || []).map((t, idx) => `
      <div class="proof-task">
        <div class="proof-step-no">${idx + 1}</div>
        <div><b>${this.esc(t.label)}</b><p>${this.esc(t.body)}</p></div>
      </div>`).join('');
    return `
      <section class="proof-diagnosis-box">
        <h3>${this.esc(plan.title)}</h3>
        <p>${this.esc(plan.thesis)}</p>
        <div class="proof-grid">
          <div class="proof-panel"><h4>판정 경계</h4>${this.list(plan.boundary)}</div>
          <div class="proof-panel"><h4>증명 답안 기본형</h4>${this.list(plan.format)}</div>
        </div>
        <h4>학생이 다시 제출해야 할 증명 과제</h4>
        ${taskHtml}
      </section>`;
  }

  static renderExtraction(data) {
    if (!data) return '';
    const s = data.extraction_summary || {};
    const purpose = data.file_purpose_review || {};
    const note = data.student_material_review?.lecture_note_review || {};
    const concept = data.student_material_review?.concept_note_review || {};
    const sol = data.student_material_review?.solution_review || {};
    const counter = concept.counterexample_review || {};
    const boundary = concept.boundary_condition_review || {};
    const rewrite = concept.concept_rewrite_template || {};
    const outcome = this.decideOutcome(data);
    const proofPlan = this.buildProofPlan(data);

    const detected = (purpose.detected_materials || []).map(m => `
      <div class="mini-row">
        <b>${this.esc(m.filename || '자료')}</b>
        <span>${this.esc(this.materialTypeKo(m.material_type))}</span>
      </div>`).join('');

    const rewriteOrder = rewrite.required_order?.length ? rewrite.required_order : ['개념 정의','성립 조건','성립하지 않는 조건','대표 예시 증명','반례/비예시 증명','비교 설명','최종 결론'];
    const redoPrompt = rewrite.student_rewrite_prompt || '강의 내용을 그대로 옮기지 말고, 이 개념이 왜 성립하는지와 언제 성립하지 않는지를 증명형 문장으로 다시 정리하세요.';
    const counterTask = counter.missing_counterexample_task || '틀린 일반화 문장을 하나 만들고, 반례 1개와 이유로 그 문장이 왜 틀렸는지 증명하세요.';

    return this.card('증명형 개념 진단 결과', `
      <div class="student-result-head ${outcome.kind}">
        <div class="result-label">오늘 판정</div>
        <div class="result-title">${this.esc(outcome.verdict)}</div>
        <div class="result-meta">자료 유형: ${this.esc(outcome.purposeKo)} · 진단 경로: ${this.esc(outcome.routeKo)}</div>
      </div>

      ${this.renderProofPlan(proofPlan)}

      <div class="result-grid">
        <div class="result-box">
          <h3>현재 확인된 것</h3>
          ${this.list(outcome.reasons)}
        </div>
        <div class="result-box">
          <h3>증명에서 비어 있는 부분</h3>
          ${this.list(outcome.missing)}
        </div>
        <div class="result-box">
          <h3>암기로 넘어갈 위험</h3>
          ${this.list(outcome.risks)}
        </div>
      </div>

      <section class="student-action-card proof-action-card">
        <h3>학생이 지금 다시 해야 할 것</h3>
        <p><b>재정리 순서:</b> ${rewriteOrder.map(x => `<span class="tag">${this.esc(x)}</span>`).join('')}</p>
        <p>${this.esc(redoPrompt)}</p>
        <p><b>반례 증명 과제:</b> ${this.esc(counterTask)}</p>
        <p><b>통과 기준:</b> 정의만 쓰면 통과가 아닙니다. 조건, 비조건, 반례, 비교 설명, 결론 중 최소 4개가 증명형 문장으로 보여야 합니다.</p>
      </section>

      <section class="result-box">
        <h3>자료별 판별</h3>
        ${detected || '<p class="muted">자료별 판별 정보가 부족합니다.</p>'}
      </section>

      ${concept.summary_type ? `
      <section class="result-box counter-box">
        <h3>조건·반례 검수 결과</h3>
        <p><b>반례 포함:</b> ${this.esc(counter.counterexample_present || 'unknown')} · <b>반례 품질:</b> ${this.esc(counter.student_counterexample_quality || 'unknown')}</p>
        <p><b>조건 오용 위험:</b> ${this.esc(boundary.condition_misuse_risk || '확인 필요')}</p>
        <p><b>확인해야 할 조건:</b> ${(boundary.required_conditions || []).map(x => `<span class="tag">${this.esc(x)}</span>`).join('') || '<span class="muted">조건 정보 부족</span>'}</p>
      </section>` : ''}

      ${this.details('교사용 상세 진단 열기', this.pre(data))}
    `, outcome.kind);
  }

  static renderEngineSummary(diagnosis) {
    if (!diagnosis) return '';
    const s = diagnosis.summary || {};
    const top = diagnosis.top_concepts || [];
    const wrong = diagnosis.wrong_answer_diagnoses || [];
    const risks = diagnosis.cross_grade_risks || [];
    return this.card('엔진 매칭 결과', `
      <p><b>오답:</b> ${this.esc(s.wrong_count || 0)}개 · <b>매칭 실패:</b> ${this.esc(s.missing_type_count || 0)}개 · <b>로드 단원:</b> ${this.esc(s.loaded_unit_count || '')}개</p>
      <h3>핵심 취약 후보</h3>${this.list(top.map(x => x.concept_name || x.concept_id || x))}
      <h3>주의할 연결</h3>${this.list([...(wrong || []).map(x => x.diagnosis || x.observed_error || x.problem_type_id), ...(risks || []).map(x => x.message || x.risk || x)])}
      ${this.details('교사용 엔진 JSON 보기', this.pre(diagnosis))}
    `, 'ok');
  }

  static renderNoteReviewSummary(review) {
    if (!review) return '';
    const s = review.summary || {};
    const flags = review.risk_flags || [];
    const qs = review.teacher_check_questions || [];
    const redo = review.redo_task || [];
    const kind = Number(s.understanding_score || 0) >= 70 ? 'ok' : 'warn';
    return this.card('필기/개념정리 증명 검수 결과', `
      <p><b>시청 흔적:</b> ${this.esc(s.watch_confidence_score)}점 · <b>이해:</b> ${this.esc(s.understanding_score)}점 · <b>등급:</b> ${this.esc(s.understanding_level)}</p>
      <h3>위험 신호</h3>${this.list(flags.map(x => x.message || x.id || x))}
      <h3>다시 할 증명 과제</h3>${this.list(redo)}
      <h3>교사가 확인할 질문</h3>${this.list(qs)}
      ${this.details('교사용 필기 검수 JSON 보기', this.pre(review))}
    `, kind);
  }

  static renderVerificationQuestions(set) {
    if (!set) return '';
    const qhtml = (set.questions || []).map((q, idx) => {
      const rubric = (q.rubric || []).map(r => `${r.score}점: ${r.condition}`);
      return `<div class="question-card proof-question-card">
        <div class="question-top"><span class="qnum">증명 문제 ${idx + 1}</span><span class="tag">${this.esc(this.questionTypeKo(q.question_type))}</span></div>
        <p class="question-prompt">${this.esc(q.prompt)}</p>
        <p><b>학생 답안에 꼭 들어갈 것:</b> ${(q.required_elements || []).map(x => `<span class="tag">${this.esc(x)}</span>`).join('')}</p>
        <details class="answer-key-box">
          <summary>정답/모범답안 확인</summary>
          <p><b>정답 기준:</b> ${this.esc(q.answer_key || '정답 기준 정보 부족')}</p>
          <h4>채점 기준</h4>${this.list(rubric)}
          <p><b>통과 기준:</b> ${this.esc(q.minimum_pass_score)}점 이상</p>
        </details>
        <details class="teacher-raw"><summary>교사용 출제 의도</summary><p>${this.esc(q.teacher_note || '')}</p></details>
      </div>`;
    }).join('');
    return this.card('학생 증명 확인 문제', `
      <p class="muted">아래 문제는 학생이 개념을 외웠는지가 아니라, 조건과 반례를 이용해 증명할 수 있는지 확인하는 문제입니다.</p>
      <p><b>진단 근거:</b> ${this.esc(set.source_diagnosis)}</p>
      ${qhtml}
      <section class="student-action-card"><h3>통과 기준</h3><p>${this.esc(set.teacher_decision_rule)}</p><p><b>다시 해야 할 때:</b> ${this.esc(set.redo_policy)}</p></section>
      ${this.details('검수 문항 전체 JSON 보기', this.pre(set))}
    `, '');
  }

  static renderAnswerReview(review) {
    if (!review) return '';
    const o = review.overall_result || {};
    const kind = o.level === 'A' || o.level === 'B' ? 'ok' : 'warn';
    return this.card('검수 답안 증명 결과', `
      <div class="student-result-head ${kind}"><div class="result-label">재검수 판정</div><div class="result-title">${this.esc(o.decision || o.level)}</div><div class="result-meta">점수 ${this.esc(o.score)} · 등급 ${this.esc(o.level)}</div></div>
      <p>${this.esc(o.summary)}</p>
      <h3>다시 시킬 증명 과제</h3>${this.list(review.final_instruction?.redo_tasks)}
      <p><b>학생 안내:</b> ${this.esc(review.final_instruction?.student_message)}</p>
      <p><b>학부모 안내:</b> ${this.esc(review.final_instruction?.parent_message)}</p>
      ${this.details('교사용 재검수 JSON 보기', this.pre(review))}
    `, kind);
  }

  static renderFinalReport(report) {
    if (!report) return '';
    return this.card('최종 리포트', `
      <h3>학생용 결과</h3><p>${this.esc(report.student_summary?.status)}</p>${this.list(report.student_summary?.next_action)}
      <h3>교사용 다음 수업 계획</h3><p>${this.esc(report.teacher_summary?.diagnosis)}</p>${this.list(report.teacher_summary?.instruction_plan)}
      <h3>학부모용 안내</h3><p>${this.esc(report.parent_summary?.plain_message)}</p>${this.list(report.parent_summary?.home_support)}
      ${this.details('최종 리포트 JSON 보기', this.pre(report))}
    `, 'ok');
  }
}
window.MathHybridReportRenderer = MathHybridReportRenderer;
