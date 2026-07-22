/* Math Hybrid Report Renderer v2.1 · Patch 22 diagnosis-first question-generation split */
class MathHybridReportRenderer {
  static esc(v) { return String(v == null ? '' : v).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  static list(items) {
    const arr = (items || []).filter(x => x != null && String(typeof x === 'string' ? x : JSON.stringify(x)).trim());
    if (!arr.length) return '<p class="muted">확인된 항목이 아직 부족합니다.</p>';
    return `<ol>${arr.map(x => `<li>${this.esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ol>`;
  }
  static pre(obj) { return `<pre>${this.esc(JSON.stringify(obj, null, 2))}</pre>`; }

  // AI에게 백슬래시·LaTeX를 금지시켰더니(JSON이 깨져서) x^2, log_2, <= 같은 평문이 화면에
  // 그대로 나왔다. 학생이 읽는 화면이므로 눈에 익은 형태로 바꿔 준다.
  // esc()를 먼저 돌린 뒤 우리가 만든 태그만 덧붙이므로, 자료의 HTML은 여전히 무력화된다.
  static mathText(v) {
    let s = this.esc(v);
    if (!s) return s;
    // 순서가 중요하다. +/- 와 sqrt()를 먼저 처리해야 분수 인식이 그 슬래시·괄호를 건드리지
    // 않고, 분수를 먼저 쌓아야 그 안의 지수까지 sup으로 올라간다.
    s = s.replace(/&lt;=/g, '≤').replace(/&gt;=/g, '≥')
         .replace(/!=/g, '≠').replace(/\+\/-/g, '±')
         .replace(/\bsqrt\(([^()]{1,24})\)/g, '√$1');
    s = this.stackFractions(s);
    s = s.replace(/\^\(([^()]{1,24})\)/g, '<sup>$1</sup>')      // x^(n+1)
         .replace(/\^(-?\d+|[A-Za-z])/g, '<sup>$1</sup>')       // x^2, 2^x, x^-1
         .replace(/_\(([^()]{1,24})\)/g, '<sub>$1</sub>')       // a_(n+1)
         .replace(/_(\d+|[A-Za-z])/g, '<sub>$1</sub>');         // log_2, a_n
    return s;
  }

  // a/b를 위아래로 쌓는다. 슬래시가 전부 분수인 것은 아니라서 조건을 좁게 잡는다.
  // 자료에 실제로 나온 "9의 개수/0의 개수", "정수/정수 꼴"은 분수가 아니고,
  // 2026/07/22 같은 날짜도 아니다. 그래서 양쪽이 수식 토큰일 때만 쌓는다.
  //   허용: 숫자, 문자, 지수 붙은 것(2^x), 괄호식((123-1))
  //   제외: 한글이 닿은 경우, 슬래시가 연달아 있는 경우(날짜·경로)
  static stackFractions(s) {
    // 변수는 한 글자만 받는다. 여러 글자 알파벳을 허용하면 "and/or", "true/false" 같은
    // 평범한 단어가 분수로 쌓인다. 수식의 변수는 x, a, n처럼 한 글자다.
    const EXP = '(?:\\^(?:\\([^()]{1,12}\\)|-?[A-Za-z0-9]+))?';
    const OPERAND = `(?:√?\\([^()]{1,30}\\)|√?\\d+(?:\\.\\d+)?${EXP}|√?[A-Za-z]${EXP})`;
    // 앞 글자 제외 목록에 √를 넣어야 sqrt(2)/2에서 √가 분자와 떨어지지 않는다.
    const re = new RegExp(`(^|[^A-Za-z0-9/^_√])(${OPERAND})\\/(${OPERAND})(?![\\/A-Za-z0-9])`, 'g');
    // 괄호로 감싼 분자·분모는 쌓고 나면 괄호가 군더더기다. (123-1)/99 → 123-1 위 99.
    const bare = t => (t.length > 2 && t[0] === '(' && t[t.length - 1] === ')') ? t.slice(1, -1) : t;
    let out = s, prev;
    // 한 번에 인접한 분수를 다 못 잡는 경우가 있어 변화가 없을 때까지 돌린다.
    let guard = 0;
    do {
      prev = out;
      out = out.replace(re, (m, lead, num, den) =>
        `${lead}<span class="mfrac"><span class="mnum">${bare(num)}</span><span class="mden">${bare(den)}</span></span>`);
    } while (out !== prev && ++guard < 4);
    return out;
  }
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
  static signalText(data) {
    const fileNames = (data?.file_purpose_review?.detected_materials || [])
      .map(m => [m.filename, m.material_type, m.evidence].filter(Boolean).join(' '));
    const request = data?._request || {};
    const ctx = request.learning_context || data?.learning_context || {};
    return JSON.stringify({
      files: fileNames,
      request_context: ctx,
      proof: JSON.parse(this.proofSignalText(data) || '{}'),
      runtime: data?._runtime,
      meta: data?._meta
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
    const conceptName = focus[0] || '핵심 개념';
    const boundary = data?.student_material_review?.concept_note_review?.boundary_condition_review || {};
    const missing = [
      ...(data?.student_material_review?.lecture_note_review?.missing_evidence || []),
      ...(data?.student_material_review?.concept_note_review?.missing_links || []),
      ...(data?.student_material_review?.concept_note_review?.misuse_risks || [])
    ];
    return {
      title: `${conceptName} 판정 기준 확인`,
      studentVerdict: `${conceptName}의 적용 조건과 반례 확인 필요`,
      oneLine: `${conceptName}은(는) 이름을 외우는 것이 아니라, 적용 조건과 적용하면 안 되는 조건을 구분해 판단해야 합니다.`,
      problems: (missing.length ? missing : [
        { title: '정의의 적용 기준이 불명확함', body: '정의를 말하는 것과 실제 문제에서 그 조건을 확인하는 것은 다릅니다.' },
        { title: '반례·비예시 확인 부족', body: '그 개념을 쓰면 안 되는 경우를 구분해야 응용 문제에서 흔들리지 않습니다.' },
        { title: '풀이에서 조건 확인 과정 부족', body: '공식이나 개념을 적용하기 전에 왜 적용 가능한지 근거를 써야 합니다.' }
      ]),
      requiredConditions: boundary.required_conditions || [],
      actionSteps: this.actionStepsFrom(data),
      questionPolicy: '보강 문제가 필요하면 2차 보강 문제 생성에서 조건 판정, 반례, 비교 설명을 확인하는 10문항을 만듭니다.'
    };
  }
  static isSolveDiagnosis(data) {
    const purpose = data?.file_purpose_review || {};
    const chosen = data?.analysis_options?.diagnosis_kind || data?._request?.analysis_options?.diagnosis_kind || '';
    return chosen === 'solve_diagnosis' || purpose.routing_decision === 'solve_diagnosis' || purpose.primary_material_type === 'problem_solving' || purpose.primary_material_type === 'wrong_answer_note';
  }
  static buildSolutionPlan(data) {
    const math = data?.math_signal || {};
    const requestCtx = data?._request?.learning_context || data?.learning_context || {};
    // 엔진이 확정한 단원을 먼저 쓴다. AI 후보와 교사 입력이 모두 없을 때만 일반 표현으로 떨어진다.
    const engineUnit = (data?._engine_context?.top_units || [])[0];
    const unit = (engineUnit?.unit_name || engineUnit?.unit_id)
      || (math.unit_candidates || [])[0]?.unit_name
      || requestCtx.unit_name
      || '현재 풀이 단원';
    const concepts = (math.concept_candidates || []).map(x => x.concept_name).filter(Boolean);
    const concept = concepts[0] || unit || '풀이 과정';
    const sol = data?.student_material_review?.solution_review || {};
    // AI는 오류 후보를 배열로 돌려주는데 예전에는 각 배열의 [0]만 꺼내 썼다. 문항 60개를
    // 읽고 찾아낸 내용이 3줄로 잘려 나가던 이유다. 전부 싣는다.
    const labelled = [
      ...(sol.main_error_candidates || []).filter(Boolean).map(x => ({ title: '풀이가 틀어진 위치', body: x })),
      ...(sol.concept_error_candidates || []).filter(Boolean).map(x => ({ title: '개념 연결 오류', body: x })),
      ...(sol.calculation_error_candidates || []).filter(Boolean).map(x => ({ title: '계산·식 변형 오류', body: x })),
      // 학생 풀이를 그대로 인용한 근거. 진단의 출처를 보여주는 가장 강한 자료인데
      // 화면에서 한 번도 쓰인 적이 없었다.
      ...(sol.quoted_student_steps || []).filter(Boolean).map(x => ({ title: '학생 풀이에서 확인된 지점', body: typeof x === 'string' ? x : (x.step || x.text || JSON.stringify(x)) }))
    ];
    const fallback = [
      { title: '문제 조건을 식으로 바꾸는 단계 확인 필요', body: '문장 조건, 범위 조건, 그래프 조건을 풀이 첫 줄에서 정확히 식으로 옮겼는지 봐야 합니다.' },
      { title: '풀이 중간 단계의 근거 부족', body: '계산 결과보다 왜 그 식을 세웠는지, 왜 그 변형이 가능한지 설명이 필요합니다.' },
      { title: '답의 범위와 원래 조건 검산 부족', body: '구한 답이 정의역, 범위, 문제 조건을 실제로 만족하는지 마지막에 확인해야 합니다.' }
    ];
    return {
      title: '풀이 과정 진단',
      studentVerdict: `${concept} 풀이의 조건 해석·식 세우기·검산 확인 필요`,
      oneLine: `이 자료는 정답 여부보다 풀이가 어느 단계에서 틀어졌는지 확인해야 합니다. 핵심은 조건 해석 → 식 세우기 → 계산 전개 → 답 검산입니다.`,
      problems: labelled.length ? labelled : fallback,
      actionSteps: this.actionStepsFrom(data),
      questionPolicy: '보강 문제가 필요하면 2차 보강 문제 생성에서 오류 위치 찾기, 조건을 식으로 바꾸기, 계산 전개, 답 검산, 유사 유형 재풀이를 확인하는 10문항을 만듭니다.'
    };
  }

  // "학생이 바로 할 일"은 그동안 자료와 무관한 고정 3줄이었다. AI가 must_check_actions와
  // next_rewrite_task로 이 학생이 확인해야 할 것을 이미 돌려주는데 아무도 읽지 않았다.
  // 실제 값이 있으면 그걸 쓰고, 없을 때만 일반 문구로 내려간다.
  static actionStepsFrom(data) {
    const fromAi = [
      ...(data?.verification_need?.must_check_actions || []),
      data?.student_material_review?.concept_note_review?.next_rewrite_task,
      data?.student_material_review?.concept_note_review?.concept_rewrite_template?.student_rewrite_prompt
    ].filter(x => typeof x === 'string' && x.trim());
    if (fromAi.length) return Array.from(new Set(fromAi));
    return [
      '오류가 의심되는 줄을 표시하고 그 줄에서 확인해야 할 조건을 씁니다.',
      '문제 문장을 식·범위·그래프 조건으로 다시 바꿔 씁니다.',
      '구한 답을 원래 조건에 대입해 검산합니다.'
    ];
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
      const behavior = engineDiagnosis.student_behavior_analysis || {};
      const br = behavior.response_summary || {};
      const bm = behavior.metrics || {};
      const bp = behavior.profiles || [];
      parts.push(`<section class="result-box"><h3>엔진 매칭 결과</h3>
        <p><b>오답 완결:</b> ${this.esc(s.wrong_count || 0)}개 · <b>빈칸:</b> ${this.esc(s.blank_count || 0)}개 · <b>중단:</b> ${this.esc(s.partial_stop_count || 0)}개 · <b>매칭 실패:</b> ${this.esc(s.missing_type_count || 0)}개</p>
        ${behavior.student_view ? `<h4>학생 풀이 행동 분석</h4><p>${this.esc(behavior.student_view.one_line_diagnosis || '')}</p><p><b>시도율:</b> ${this.esc(Math.round((bm.attempt_rate || 0) * 100))}% · <b>시도 문항 정답률:</b> ${this.esc(Math.round((bm.attempted_accuracy || 0) * 100))}% · <b>전체 해결률:</b> ${this.esc(Math.round((bm.overall_resolution_rate || 0) * 100))}%</p><h4>판정 성향</h4>${this.list(bp.map(x => `${x.label || x.pattern_id} (${Math.round((x.confidence || 0) * 100)}%)`))}<h4>교사용 훈련 방향</h4>${this.list(behavior.teacher_view?.training_direction || [])}` : ''}
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

  // 연결은 엔진이 future_extension_routes에서 실제로 찾아낸 것만 쓴다.
  // 이전에는 plan.connections에 박아둔 고정 3줄이 자료와 무관하게 항상 나갔다.
  // 연결이 없는 단원(수열·행렬·집합 등)은 없는 채로 두는 것이 맞다.
  static engineConnections(engineDiagnosis) {
    const conns = (engineDiagnosis && engineDiagnosis.learning_connections) || [];
    const rows = [];
    for (const c of conns) {
      const from = c.unit_name || c.unit_id;
      for (const f of c.future_routes || []) {
        if (!f.target_unit_hint) continue;
        rows.push({ now: from, next: f.target_unit_hint, why: f.used_as || f.future_scene || '' });
      }
    }
    return rows;
  }

  static renderConnectionTable(rows) {
    if (!rows || !rows.length) return '';
    const body = rows.slice(0, 5).map(c => `
      <tr><td>${this.esc(c.now)}</td><td>${this.esc(c.next)}</td><td>${this.esc(c.why)}</td></tr>`).join('');
    return `<div class="compact-section-title">이 개념이 연결되는 곳</div>
      <div class="connection-table-wrap">
        <table class="connection-table">
          <thead><tr><th>지금 확인하는 개념</th><th>연결되는 단원</th><th>왜 중요한가</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  static renderProofPlan(plan, engineConnections = []) {
    const issues = (plan.problems || []).slice(0, 8).map((x, idx) => {
      const title = typeof x === 'object' && x ? x.title : x;
      const body = typeof x === 'object' && x ? x.body : '';
      return `<div class="compact-issue"><span class="issue-no">${idx + 1}</span><p><b class="issue-title">${this.esc(title)}</b>${body ? `<span class="issue-body">${this.mathText(body)}</span>` : ''}</p></div>`;
    }).join('');
    const rows = engineConnections;
    const actions = (plan.actionSteps || []).slice(0, 8).map((x, idx) => `<div class="compact-action"><span class="issue-no">${idx + 1}</span><p>${this.mathText(x)}</p></div>`).join('');
    return `
      <section class="compact-diagnosis-box">
        <h3>${this.esc(plan.title)}</h3>
        <p class="one-line-diagnosis">${this.esc(plan.oneLine)}</p>
        <div class="compact-section-title">지금 문제점</div>
        <div class="compact-issues">${issues}</div>
        ${actions ? `<div class="compact-section-title">학생이 바로 할 일</div><div class="compact-actions">${actions}</div>` : ''}
        ${this.renderConnectionTable(rows)}
        <div class="ten-question-policy"><b>문제 생성 안내:</b> ${this.esc(plan.questionPolicy)}</div>
      </section>`;
  }

  static renderSolutionPlan(plan, engineConnections = []) {
    const issues = (plan.problems || []).slice(0, 8).map((x, idx) => {
      const title = typeof x === 'object' && x ? x.title : x;
      const body = typeof x === 'object' && x ? x.body : '';
      return `<div class="compact-issue"><span class="issue-no">${idx + 1}</span><p><b class="issue-title">${this.esc(title)}</b>${body ? `<span class="issue-body">${this.mathText(body)}</span>` : ''}</p></div>`;
    }).join('');
    const rows = engineConnections;
    const actions = (plan.actionSteps || []).slice(0, 8).map((x, idx) => `<div class="compact-action"><span class="issue-no">${idx + 1}</span><p>${this.mathText(x)}</p></div>`).join('');
    return `
      <section class="compact-diagnosis-box">
        <h3>${this.esc(plan.title)}</h3>
        <p class="one-line-diagnosis">${this.esc(plan.oneLine)}</p>
        <div class="compact-section-title">지금 문제점</div>
        <div class="compact-issues">${issues}</div>
        ${actions ? `<div class="compact-section-title">학생이 바로 할 일</div><div class="compact-actions">${actions}</div>` : ''}
        ${this.renderConnectionTable(rows)}
        <div class="ten-question-policy"><b>문제 생성 안내:</b> ${this.esc(plan.questionPolicy)}</div>
      </section>`;
  }
  static renderStudentBehaviorAnalysis(diagnosis) {
    const b = diagnosis?.student_behavior_analysis;
    if (!b) return '';
    const view = b.student_view || {};
    const summary = b.response_summary || {};
    const strengths = (view.strengths || []).slice(0, 3);
    const blockers = (view.blockers || []).slice(0, 3);
    const rules = (view.first_rules || []).slice(0, 3);
    return `<section class="compact-diagnosis-box behavior-analysis-box">
      <h3>풀이 습관 분석</h3>
      <p class="one-line-diagnosis">${this.esc(view.one_line_diagnosis || '풀이 습관을 확인하고 있습니다.')}</p>
      <div class="result-meta">정답 완결 ${this.esc(summary.correct_complete_count || 0)} · 오답 완결 ${this.esc(summary.wrong_complete_count || 0)} · 풀이 중단 ${this.esc(summary.partial_stop_count || 0)} · 빈칸 ${this.esc(summary.blank_unknown_count || 0)}</div>
      <div class="compact-section-title">현재 가능한 것</div>${this.list(strengths)}
      <div class="compact-section-title">현재 막히는 지점</div>${this.list(blockers)}
      <div class="compact-section-title">앞으로 사용할 규칙</div>${this.list(rules)}
    </section>`;
  }

  // 워커는 AI 호출이 실패해도 seed fallback을 HTTP 200으로 돌려준다. 그러면 화면은
  // 정상처럼 그려지지만 업로드한 자료를 읽은 결과가 아니다. 응답에 남는 _runtime.note를
  // 표면으로 끌어올려 그 상황이 조용히 지나가지 않게 한다.
  static runtimeNoteKo(note) {
    const n = String(note || '');
    if (n.startsWith('ai_error_fallback')) {
      return { title: 'AI 판독이 실패했습니다', detail: n.slice('ai_error_fallback:'.length).trim() || '원인 미상' };
    }
    if (n === 'missing_api_key_stub_fallback') {
      return { title: 'API 키가 설정되지 않았습니다', detail: 'Cloudflare Worker에 ANTHROPIC_API_KEY Secret을 등록하세요.' };
    }
    if (n.startsWith('stub_mode')) {
      return { title: 'stub 모드로 동작 중입니다', detail: 'Worker 환경변수 ENGINE_MODE와 ALLOW_STUB을 확인하세요.' };
    }
    return { title: '예비 결과가 반환되었습니다', detail: n };
  }

  static renderRuntimeNotice(...results) {
    const notes = results.filter(Boolean)
      .map(r => r && r._runtime && r._runtime.note)
      .filter(Boolean);
    if (!notes.length) return '';
    const body = [...new Set(notes)].map(n => {
      const k = this.runtimeNoteKo(n);
      return `<p><b>${this.esc(k.title)}</b><br><span class="muted small">${this.esc(k.detail)}</span></p>`;
    }).join('');
    return this.card('아래 내용은 업로드한 자료를 읽고 만든 결과가 아닙니다', `
      ${body}
      <p class="muted small">예비 문구가 표시되고 있습니다. 학생에게 전달하기 전에 원인을 해결한 뒤 다시 진단하세요.</p>
    `, 'warn');
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
        <div class="result-title compact-result-title">${this.esc(proofPlan.studentVerdict || outcome.verdict)}</div>
        <div class="result-meta">자료 유형: ${this.esc(outcome.purposeKo)} · 진단 경로: ${this.esc(outcome.routeKo)}</div>
      </div>
      ${isSolve ? this.renderSolutionPlan(proofPlan, this.engineConnections(engineDiagnosis)) : this.renderProofPlan(proofPlan, this.engineConnections(engineDiagnosis))}
      ${this.renderStudentBehaviorAnalysis(engineDiagnosis)}
      ${this.details('교사용 상세 진단 열기', teacherSummary)}
    `, outcome.kind);
  }

  // 오답에서 선행 단원까지 내려가는 경로를 그린다.
  // 엔진은 backtrack_route.backtrack_steps를 계산해 두고도 화면에 쓰지 않고 있었다.
  // unit_hint는 "미적분1 적분"처럼 '과정 단원' 형태라 첫 토큰을 과정 칩으로 분리한다.
  static splitUnitHint(hint) {
    const text = String(hint || '').trim();
    if (!text) return { course: '', unit: '' };
    const i = text.indexOf(' ');
    return i < 0 ? { course: text, unit: '' } : { course: text.slice(0, i), unit: text.slice(i + 1) };
  }

  static renderBacktrackChain(item) {
    const route = item && item.backtrack_route;
    const steps = (route && route.backtrack_steps) || [];
    if (!steps.length) return '';
    const nodes = steps.map((s, i) => {
      const { course, unit } = this.splitUnitHint(s.unit_hint);
      const last = i === steps.length - 1 ? ' is-last' : '';
      return `<li class="chain-node${last}">
        <div class="chain-head">
          ${course ? `<span class="chain-course">${this.esc(course)}</span>` : ''}
          ${unit ? `<span class="chain-unit">${this.esc(unit)}</span>` : ''}
        </div>
        <div class="chain-focus">${this.esc(s.concept_focus)}</div>
        ${s.student_action ? `<div class="chain-act">${this.esc(s.student_action)}</div>` : ''}
      </li>`;
    }).join('');
    const depthFrom = this.splitUnitHint(steps[0].unit_hint).course;
    const depthTo = this.splitUnitHint(steps[steps.length - 1].unit_hint).course;
    return `<div class="chain-block">
      <div class="chain-stuck">
        <div class="chain-stuck-tag">지금 막힌 지점</div>
        <div class="chain-stuck-txt">${this.esc(route.current_weakness || item.type_name || '')}</div>
        ${item.question_no ? `<div class="chain-stuck-q">${this.esc(item.question_no)}번 · ${this.esc(item.type_name || '')}</div>` : ''}
      </div>
      <div class="chain-lead"><span>선행 단원 ${steps.length}단계</span><i></i></div>
      <ol class="chain">${nodes}</ol>
      ${route.student_summary ? `<div class="chain-summary"><b>진단 요약</b><p>${this.esc(route.student_summary)}</p></div>` : ''}
      ${depthFrom && depthTo ? `<div class="chain-depth"><span>추적 깊이</span><b>${this.esc(depthFrom)} → ${this.esc(depthTo)} · ${steps.length}단계</b></div>` : ''}
    </div>`;
  }

  static renderBacktrackChains(diagnosis) {
    const wrong = (diagnosis && diagnosis.wrong_answer_diagnoses) || [];
    const blocks = wrong.map(w => this.renderBacktrackChain(w)).filter(Boolean);
    if (!blocks.length) return '';
    return this.card('이 오답이 내려가는 곳', blocks.join(''));
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
