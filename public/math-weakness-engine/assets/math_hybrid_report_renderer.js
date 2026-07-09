/* Math Hybrid Report Renderer v2.0 · Patch 21 engine-locked output contract */
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
      engine: data?.engine_adapter,
      engineContext: data?._engine_context
    });
  }
  static buildProofPlan(data) {
    const engineFocus = [
      ...(data?._engine_context?.top_concepts || []).map(x => x.concept_name || x.concept_id || x).filter(Boolean),
      ...(data?._engine_context?.top_units || []).map(x => x.unit_name || x.unit_id || x).filter(Boolean)
    ];
    const aiFocus = [
      ...(data?.verification_need?.focus_concepts || []),
      ...(data?.math_signal?.concept_candidates || []).map(x => x.concept_name).filter(Boolean),
      ...(data?.math_signal?.unit_candidates || []).map(x => x.unit_name).filter(Boolean)
    ];
    const focus = (engineFocus.length ? engineFocus : aiFocus).filter(Boolean);
    const text = engineFocus.length ? JSON.stringify({ engine_locked_context: data?._engine_context }) : this.proofSignalText(data);
    const conceptName = focus[0] || '핵심 개념';
    const looksPowerRoot = /거듭제곱근|n제곱근|세제곱근|네제곱근|짝수\s*제곱근|홀수\s*제곱근|유리수\s*지수|분수\s*지수|지수법칙|a\^\(1\/n\)|1\/n\)|root/i.test(text);
    const looksIrrational = !looksPowerRoot && /유리수|무리수|순환소수|비순환|분수\s*꼴|유한소수|무한소수|정수\s*\/\s*정수|0\.333|0\.121212|π/.test(text);
    if (looksPowerRoot) {
      return {
        title: '거듭제곱근·유리수 지수 판정 기준 확인',
        oneLine: '거듭제곱근은 “몇 제곱해서 주어진 수가 되는가”와 함께 짝수/홀수 지수, 밑의 부호, 주값 조건을 확인해야 합니다.',
        problems: [
          { title: '거듭제곱근의 존재 조건 확인 부족', body: 'n이 짝수일 때 음수의 실수 n제곱근은 존재하지 않습니다. n이 홀수일 때는 음수도 하나의 실수 거듭제곱근을 가집니다.' },
          { title: '주값과 모든 해를 구분하는 기준 부족', body: '√a는 주값을 뜻하지만, x²=a의 해는 ±√a처럼 두 개가 될 수 있습니다. 기호의 의미와 방정식의 해를 구분해야 합니다.' },
          { title: '유리수 지수로 바꿀 때 조건 확인 부족', body: 'a^(m/n)은 n제곱근과 연결됩니다. 밑 a가 음수이거나 n이 짝수인 경우 실수 범위에서 정의 여부를 먼저 확인해야 합니다.' }
        ],
        connections: [
          { now: '거듭제곱근', next: '대수: 지수함수와 로그함수', why: '분수 지수 a^(m/n)을 해석하려면 n제곱근의 의미와 조건을 알아야 합니다.' },
          { now: '짝수/홀수 거듭제곱근 조건', next: '고등: 방정식과 부등식', why: 'x^n=a의 실수해 개수와 부호 조건을 판단해야 합니다.' },
          { now: '지수법칙 적용 조건', next: '고등: 함수의 정의역과 그래프', why: '밑의 범위와 정의역을 확인하지 않으면 지수함수·로그함수에서 잘못된 변형을 하게 됩니다.' }
        ],
        questionPolicy: '아래 10문항으로 거듭제곱근의 정의, 존재 조건, 주값, 유리수 지수 변환, 반례와 비교 설명까지 확인합니다.'
      };
    }
    if (looksIrrational) {
      return {
        title: '유리수·무리수 판정 기준 확인',
        oneLine: '유리수와 무리수는 소수의 모양이 아니라 “정수 a, b에 대해 a/b 꼴로 나타낼 수 있는가”를 기준으로 판단합니다.',
        problems: [
          { title: '유리수 판단 기준이 불명확함', body: '유리수는 정수/정수 꼴로 나타낼 수 있어야 합니다. 소수가 끝나거나 반복된다는 말만으로 끝내면 기준이 약합니다.' },
          { title: '순환소수가 왜 유리수인지 증명 부족', body: '0.333..., 0.121212...는 끝나지 않지만 반복됩니다. 반복되는 소수는 식을 세워 분수로 바꿀 수 있어야 합니다.' },
          { title: '루트가 있으면 모두 무리수라고 착각할 가능성', body: '√4=2이므로 유리수이고, √2는 정수/정수 꼴로 나타낼 수 없으므로 무리수입니다.' }
        ],
        connections: [
          { now: '유리수와 순환소수', next: '중2: 유리수와 순환소수', why: '순환소수를 분수 꼴로 바꾸어 유리수임을 증명해야 합니다.' },
          { now: '무리수와 실수', next: '중3: 제곱근과 실수', why: '√2, √3처럼 분수로 나타낼 수 없는 수를 구분해야 합니다.' },
          { now: '수의 범위 판단', next: '고등: 방정식·부등식, 함수의 정의역', why: '해가 정수·유리수·실수 중 어디인지에 따라 풀이와 답의 범위가 달라집니다.' }
        ],
        questionPolicy: '아래 10문항으로 유리수 판정, 무리수 판정, 반례, 비교 설명까지 확인합니다.'
      };
    }
    const boundary = data?.student_material_review?.concept_note_review?.boundary_condition_review || {};
    const missing = [
      ...(data?.student_material_review?.lecture_note_review?.missing_evidence || []),
      ...(data?.student_material_review?.concept_note_review?.missing_links || []),
      ...(data?.student_material_review?.concept_note_review?.misuse_risks || [])
    ];
    return {
      title: `${conceptName} 판정 기준 확인`,
      oneLine: `${conceptName}은(는) 이름을 외우는 것이 아니라, 적용 조건과 적용하면 안 되는 조건을 구분해 판단해야 합니다.`,
      problems: (missing.length ? missing : [
        { title: '정의의 적용 기준이 불명확함', body: '정의를 말하는 것과 실제 문제에서 그 조건을 확인하는 것은 다릅니다.' },
        { title: '반례·비예시 확인 부족', body: '그 개념을 쓰면 안 되는 경우를 구분해야 응용 문제에서 흔들리지 않습니다.' },
        { title: '풀이에서 조건 확인 과정 부족', body: '공식이나 개념을 적용하기 전에 왜 적용 가능한지 근거를 써야 합니다.' }
      ]).slice(0, 3),
      connections: [
        { now: `${conceptName}의 적용 조건`, next: '같은 단원의 대표 유형', why: '정의가 맞는 경우와 아닌 경우를 구분해야 풀이를 시작할 수 있습니다.' },
        { now: '반례·비예시 구분', next: '학교 서술형 조건 판단 문제', why: '문제에서 요구하는 조건을 빠뜨리면 계산이 맞아도 감점될 수 있습니다.' },
        { now: '증명형 설명', next: '상위 단원 개념 적용', why: '공식을 외워도 언제 쓰는지 설명하지 못하면 응용 문제에서 막힙니다.' }
      ],
      requiredConditions: boundary.required_conditions || [],
      questionPolicy: '아래 10문항으로 조건 판정, 반례, 비교 설명까지 확인합니다.'
    };
  }
  static isSolveDiagnosis(data) {
    const purpose = data?.file_purpose_review || {};
    const chosen = data?.analysis_options?.diagnosis_kind || data?._request?.analysis_options?.diagnosis_kind || '';
    return chosen === 'solve_diagnosis' || purpose.routing_decision === 'solve_diagnosis' || purpose.primary_material_type === 'problem_solving' || purpose.primary_material_type === 'wrong_answer_note';
  }
  static buildSolutionPlan(data) {
    const math = data?.math_signal || {};
    const unit = (math.unit_candidates || [])[0]?.unit_name || data?.learning_context?.unit_name || '현재 풀이 단원';
    const concepts = (math.concept_candidates || []).map(x => x.concept_name).filter(Boolean);
    const concept = concepts[0] || unit || '풀이 과정';
    const sol = data?.student_material_review?.solution_review || {};
    const mainErrors = (sol.main_error_candidates || []).filter(Boolean);
    const conceptErrors = (sol.concept_error_candidates || []).filter(Boolean);
    const calcErrors = (sol.calculation_error_candidates || []).filter(Boolean);
    const problems = [];
    if (mainErrors[0]) problems.push({ title: '풀이가 틀어진 위치 확인 필요', body: mainErrors[0] });
    if (conceptErrors[0]) problems.push({ title: '필요한 개념 연결 부족', body: conceptErrors[0] });
    if (calcErrors[0]) problems.push({ title: '계산 전개 또는 식 변형 확인 필요', body: calcErrors[0] });
    const fallback = [
      { title: '문제 조건을 식으로 바꾸는 단계 확인 필요', body: '문장 조건, 범위 조건, 그래프 조건을 풀이 첫 줄에서 정확히 식으로 옮겼는지 봐야 합니다.' },
      { title: '풀이 중간 단계의 근거 부족', body: '계산 결과보다 왜 그 식을 세웠는지, 왜 그 변형이 가능한지 설명이 필요합니다.' },
      { title: '답의 범위와 원래 조건 검산 부족', body: '구한 답이 정의역, 범위, 문제 조건을 실제로 만족하는지 마지막에 확인해야 합니다.' }
    ];
    return {
      title: '풀이 과정 진단',
      oneLine: `이 자료는 정답 여부보다 풀이가 어느 단계에서 틀어졌는지 확인해야 합니다. 핵심은 조건 해석 → 식 세우기 → 계산 전개 → 답 검산입니다.`,
      problems: (problems.length ? problems : fallback).slice(0, 3),
      connections: [
        { now: '조건 해석·식 세우기', next: '고1: 방정식과 부등식', why: '문제 문장을 식으로 바꾸는 단계가 틀리면 뒤 계산이 맞아도 답이 달라집니다.' },
        { now: '함수·그래프 조건 확인', next: '고1·고2: 함수와 그래프, 함수의 극한', why: '정의역, 치역, 그래프 조건을 확인해야 해가 실제 조건을 만족합니다.' },
        { now: `${concept} 풀이 근거`, next: unit ? `현재 단원: ${unit}` : '현재 풀이 단원', why: '같은 유형을 다시 풀 때 어떤 개념을 써야 하는지 기준이 됩니다.' }
      ],
      questionPolicy: '아래 10문항으로 오류 위치 찾기, 조건을 식으로 바꾸기, 계산 전개, 답 검산, 유사 유형 재풀이까지 확인합니다.'
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

  static renderStudentPdfCard(set) {
    const count = (set?.questions || []).length;
    const disabled = count ? '' : 'disabled';
    const help = count ? `${count}문항을 학생용 문제지로 열어 PDF 저장 또는 인쇄할 수 있습니다.` : '문항 생성 후 PDF 문제지를 만들 수 있습니다.';
    return `<section class="pdf-download-card student-action-card">
      <h3>학생용 PDF 문제지</h3>
      <p>${this.esc(help)}</p>
      <button type="button" class="pdf-open-btn" data-action="open-student-pdf" ${disabled}>학생용 PDF 문제지 열기/저장</button>
      <p class="muted small">새 창에서 열리면 인쇄 창에서 “PDF로 저장”을 선택하면 됩니다. 학생용 문제지에는 정답을 넣지 않습니다.</p>
    </section>`;
  }

  static renderTeacherDiagnostics(extraction, engineDiagnosis, noteReview) {
    if (!extraction && !engineDiagnosis && !noteReview) return '';
    const parts = [];
    if (engineDiagnosis) {
      const s = engineDiagnosis.summary || {};
      const top = engineDiagnosis.top_concepts || [];
      const wrong = engineDiagnosis.wrong_answer_diagnoses || [];
      const risks = engineDiagnosis.cross_grade_risks || [];
      parts.push(`<section class="result-box"><h3>엔진 매칭 결과</h3>
        <p><b>오답:</b> ${this.esc(s.wrong_count || 0)}개 · <b>매칭 실패:</b> ${this.esc(s.missing_type_count || 0)}개 · <b>로드 단원:</b> ${this.esc(s.loaded_unit_count || '')}개</p>
        <h4>핵심 취약 후보</h4>${this.list(top.map(x => x.concept_name || x.concept_id || x))}
        <h4>주의할 연결</h4>${this.list([...(wrong || []).map(x => x.diagnosis || x.observed_error || x.problem_type_id), ...(risks || []).map(x => x.message || x.risk || x)])}
        ${this.details('엔진 JSON 보기', this.pre(engineDiagnosis))}</section>`);
    }
    if (noteReview) {
      const s = noteReview.summary || {};
      const flags = noteReview.risk_flags || [];
      const qs = noteReview.teacher_check_questions || [];
      const redo = noteReview.redo_task || [];
      parts.push(`<section class="result-box"><h3>필기/개념정리 증명 검수 결과</h3>
        <p><b>시청 흔적:</b> ${this.esc(s.watch_confidence_score)}점 · <b>이해:</b> ${this.esc(s.understanding_score)}점 · <b>등급:</b> ${this.esc(s.understanding_level)}</p>
        <h4>위험 신호</h4>${this.list(flags.map(x => x.message || x.id || x))}
        <h4>다시 할 증명 과제</h4>${this.list(redo)}
        <h4>교사가 확인할 질문</h4>${this.list(qs)}
        ${this.details('필기 검수 JSON 보기', this.pre(noteReview))}</section>`);
    }
    if (extraction) parts.push(`<section class="result-box"><h3>1차 AI 분석 원자료</h3>${this.details('분석 JSON 보기', this.pre(extraction))}</section>`);
    return this.card('교사용 내부 데이터', this.details('엔진·필기 검수·JSON 열기', parts.join(''), false), 'info teacher-only-card');
  }

  static renderProofPlan(plan) {
    const issues = (plan.problems || []).slice(0, 3).map((x, idx) => {
      const title = typeof x === 'object' && x ? x.title : x;
      const body = typeof x === 'object' && x ? x.body : '';
      return `<div class="compact-issue"><span class="issue-no">${idx + 1}</span><p><b>${this.esc(title)}</b>${body ? `<br><span>${this.esc(body)}</span>` : ''}</p></div>`;
    }).join('');
    const rows = (plan.connections || []).slice(0, 3).map(c => `
      <tr><td>${this.esc(c.now)}</td><td>${this.esc(c.next)}</td><td>${this.esc(c.why)}</td></tr>`).join('');
    return `
      <section class="compact-diagnosis-box">
        <h3>${this.esc(plan.title)}</h3>
        <p class="one-line-diagnosis">${this.esc(plan.oneLine)}</p>
        <div class="compact-section-title">지금 문제점</div>
        <div class="compact-issues">${issues}</div>
        <div class="compact-section-title">이 개념이 연결되는 곳</div>
        <div class="connection-table-wrap">
          <table class="connection-table"><thead><tr><th>지금 확인하는 개념</th><th>연결되는 단원</th><th>왜 중요한가</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div class="ten-question-policy">${this.esc(plan.questionPolicy)}</div>
      </section>`;
  }

  static renderSolutionPlan(plan) {
    const issues = (plan.problems || []).slice(0, 3).map((x, idx) => {
      const title = typeof x === 'object' && x ? x.title : x;
      const body = typeof x === 'object' && x ? x.body : '';
      return `<div class="compact-issue"><span class="issue-no">${idx + 1}</span><p><b>${this.esc(title)}</b>${body ? `<br><span>${this.esc(body)}</span>` : ''}</p></div>`;
    }).join('');
    const rows = (plan.connections || []).slice(0, 3).map(c => `
      <tr><td>${this.esc(c.now)}</td><td>${this.esc(c.next)}</td><td>${this.esc(c.why)}</td></tr>`).join('');
    return `
      <section class="compact-diagnosis-box">
        <h3>${this.esc(plan.title)}</h3>
        <p class="one-line-diagnosis">${this.esc(plan.oneLine)}</p>
        <div class="compact-section-title">지금 문제점</div>
        <div class="compact-issues">${issues}</div>
        <div class="compact-section-title">이 풀이가 연결되는 곳</div>
        <div class="connection-table-wrap">
          <table class="connection-table"><thead><tr><th>현재 오류</th><th>연결되는 단원</th><th>왜 중요한가</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div class="ten-question-policy">${this.esc(plan.questionPolicy)}</div>
      </section>`;
  }
  static renderExtraction(data, engineDiagnosis = null) {
    if (!data) return '';
    if (engineDiagnosis) {
      data = { ...data, _engine_context: {
        top_concepts: engineDiagnosis.top_concepts || [],
        top_units: engineDiagnosis.top_units || [],
        summary: engineDiagnosis.summary || {}
      }};
    }
    const purpose = data.file_purpose_review || {};
    const concept = data.student_material_review?.concept_note_review || {};
    const counter = concept.counterexample_review || {};
    const boundary = concept.boundary_condition_review || {};
    const rewrite = concept.concept_rewrite_template || {};
    const outcome = this.decideOutcome(data);
    const isSolve = this.isSolveDiagnosis(data);
    const proofPlan = isSolve ? this.buildSolutionPlan(data) : this.buildProofPlan(data);
    const detected = (purpose.detected_materials || []).map(m => `
      <div class="mini-row">
        <b>${this.esc(m.filename || '자료')}</b>
        <span>${this.esc(this.materialTypeKo(m.material_type))}</span>
      </div>`).join('');
    const teacherSummary = `
      <section class="result-box"><h3>자료별 판별</h3>${detected || '<p class="muted">자료별 판별 정보가 부족합니다.</p>'}</section>
      <section class="result-box"><h3>확인된 근거</h3>${this.list(outcome.reasons)}</section>
      <section class="result-box"><h3>증명에서 비어 있는 부분</h3>${this.list(outcome.missing)}</section>
      <section class="result-box"><h3>암기로 넘어갈 위험</h3>${this.list(outcome.risks)}</section>
      ${concept.summary_type ? `<section class="result-box counter-box"><h3>조건·반례 검수 결과</h3><p><b>반례 포함:</b> ${this.esc(counter.counterexample_present || 'unknown')} · <b>반례 품질:</b> ${this.esc(counter.student_counterexample_quality || 'unknown')}</p><p><b>조건 오용 위험:</b> ${this.esc(boundary.condition_misuse_risk || '확인 필요')}</p><p><b>확인해야 할 조건:</b> ${(boundary.required_conditions || []).map(x => `<span class="tag">${this.esc(x)}</span>`).join('') || '<span class="muted">조건 정보 부족</span>'}</p><p><b>재정리 지시:</b> ${this.esc(rewrite.student_rewrite_prompt || '')}</p></section>` : ''}
      ${this.details('원본 AI JSON 보기', this.pre(data))}`;

    return this.card('학생용 진단 결과', `
      <div class="student-result-head ${outcome.kind}">
        <div class="result-label">오늘 한 줄 진단</div>
        <div class="result-title compact-result-title">${this.esc(outcome.verdict)}</div>
        <div class="result-meta">자료 유형: ${this.esc(outcome.purposeKo)} · 진단 경로: ${this.esc(outcome.routeKo)}</div>
      </div>
      ${isSolve ? this.renderSolutionPlan(proofPlan) : this.renderProofPlan(proofPlan)}
      ${this.details('교사용 상세 진단 열기', teacherSummary)}
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
    const questions = set.questions || [];
    const qhtml = questions.map((q, idx) => {
      const rubric = (q.rubric || []).map(r => `${r.score}점: ${r.condition}`);
      return `<div class="question-card proof-question-card">
        <div class="question-top"><span class="qnum">문제 ${idx + 1}</span><span class="tag">${this.esc(this.questionTypeKo(q.question_type))}</span></div>
        <p class="question-prompt">${this.esc(q.prompt)}</p>
        <p><b>답안에 꼭 들어갈 것:</b> ${(q.required_elements || []).map(x => `<span class="tag">${this.esc(x)}</span>`).join('')}</p>
        <details class="answer-key-box">
          <summary>정답/모범답안 확인</summary>
          <p><b>정답 기준:</b> ${this.esc(q.answer_key || '정답 기준 정보 부족')}</p>
          <h4>채점 기준</h4>${this.list(rubric)}
          <p><b>통과 기준:</b> ${this.esc(q.minimum_pass_score)}점 이상</p>
        </details>
        <details class="teacher-raw"><summary>교사용 출제 의도</summary><p>${this.esc(q.teacher_note || '')}</p></details>
      </div>`;
    }).join('');
    return this.card('오늘 풀 10문항', `
      <p class="muted">화면에서 끝내는 것이 목표가 아니라, PDF 문제지로 내려받아 풀이 과정 또는 증명 과정을 직접 쓰는 것이 목표입니다.</p>
      ${this.renderStudentPdfCard(set)}
      ${questions.length < 10 ? '<p class="warn-inline">주의: 현재 문항 수가 10개보다 적습니다. Worker 또는 로컬 fallback에서 10문항 생성을 확인하세요.</p>' : ''}
      ${qhtml}
      <section class="student-action-card"><h3>통과 기준</h3><p>${this.esc(set.teacher_decision_rule)}</p><p><b>다시 해야 할 때:</b> ${this.esc(set.redo_policy)}</p></section>
      ${this.details('교사용 검수 문항 JSON 보기', this.pre(set))}
    `, '');
  }

  static renderQuestionReviewTable(items) {
    const rows = (items || []).map((x, idx) => `<tr><td>${this.esc(x.question_id || idx + 1)}</td><td>${this.esc(x.status || '')}</td><td>${this.esc((x.missing_elements || []).join(', ') || x.feedback || '')}</td></tr>`).join('');
    if (!rows) return '';
    return `<h3>문항별 검수</h3><div class="connection-table-wrap"><table class="connection-table"><thead><tr><th>문항</th><th>판정</th><th>보완할 점</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  static renderAnswerReview(review) {
    if (!review) return '';
    const o = review.overall_result || {};
    const kind = o.level === 'A' || o.level === 'B' ? 'ok' : 'warn';
    return this.card('검수 답안 증명 결과', `
      <div class="student-result-head ${kind}"><div class="result-label">재검수 판정</div><div class="result-title">${this.esc(o.decision || o.level)}</div><div class="result-meta">점수 ${this.esc(o.score)} · 등급 ${this.esc(o.level)}</div></div>
      <p>${this.esc(o.summary)}</p>
      ${this.renderQuestionReviewTable(review.question_reviews)}
      <h3>다시 시킬 과제</h3>${this.list(review.final_instruction?.redo_tasks)}
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
