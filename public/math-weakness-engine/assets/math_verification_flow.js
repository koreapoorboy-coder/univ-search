/* Math Verification Flow v1.2 · Patch 15 proof-based concept diagnosis
 * Local orchestration helpers for hybrid math diagnosis.
 */
class MathVerificationFlow {
  constructor({ engine = null, bridge = null } = {}) {
    this.engine = engine;
    this.bridge = bridge;
  }
  buildStudentUploadFromForm(form) {
    const wrongs = String(form.wrongQuestionNumbers || '')
      .split(/[,\s]+/).map(v => v.trim()).filter(Boolean)
      .map(v => /^\d+$/.test(v) ? Number(v) : v);
    const knownTypes = String(form.knownProblemTypeIds || '')
      .split(/[,\s]+/).map(v => v.trim()).filter(Boolean);
    return {
      request_id: form.requestId || `math_${Date.now()}`,
      student_profile: {
        student_name: form.studentName || '',
        grade_label: form.gradeLabel || '',
        school_name: form.schoolName || '',
        class_group: form.classGroup || '',
        teacher_memo: form.teacherMemo || ''
      },
      learning_context: {
        course: form.course || '',
        unit_id: form.unitId || '',
        unit_name: form.unitName || '',
        lesson_title: form.lessonTitle || '',
        exam_title: form.examTitle || '',
        wrong_question_numbers: wrongs,
        known_problem_type_ids: knownTypes,
        teacher_focus: String(form.teacherFocus || '').split(/\n+/).map(v => v.trim()).filter(Boolean)
      },
      submission: {
        text_inputs: {
          student_solution_text: form.studentSolutionText || '',
          lecture_note_text: form.lectureNoteText || '',
          verification_answer_text: form.verificationAnswerText || '',
          student_self_reflection: form.studentSelfReflection || ''
        },
        file_manifest: Array.from(form.files || []).map(file => ({
          file_role: this._guessFileRole(file.name),
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          page_or_question_hint: '',
          student_note: ''
        }))
      },
      analysis_options: {
        mode: form.mode || 'balanced',
        output_targets: ['student', 'parent', 'teacher'],
        generate_verification_questions: true,
        review_verification_answer: Boolean(form.verificationAnswerText),
        use_existing_math_engine: true,
        proof_based_concept_check: true
      }
    };
  }
  async runLocalEngineDiagnosis(aiExtraction) {
    if (!this.engine || !aiExtraction?.engine_adapter?.student_attempt) return null;
    if (this.engine.load && !this.engine.loaded) await this.engine.load();
    if (this.engine.diagnoseWithGuidance) return this.engine.diagnoseWithGuidance(aiExtraction.engine_adapter.student_attempt);
    return null;
  }
  async runLocalNoteReview(aiExtraction) {
    if (!this.engine || !aiExtraction?.engine_adapter?.note_review_input) return null;
    if (this.engine.loadEvidenceLogic) await this.engine.loadEvidenceLogic();
    if (this.engine.reviewStudentNote) return this.engine.reviewStudentNote(aiExtraction.engine_adapter.note_review_input);
    return null;
  }
  buildFallbackVerificationQuestions(aiExtraction, engineDiagnosis, noteReview) {
    const focus = [
      ...(aiExtraction?.verification_need?.focus_concepts || []),
      ...(engineDiagnosis?.top_concepts || []).slice(0, 2).map(c => c.concept_name).filter(Boolean)
    ];
    const missing = [
      ...(aiExtraction?.student_material_review?.lecture_note_review?.missing_evidence || []),
      ...(aiExtraction?.student_material_review?.concept_note_review?.missing_links || []),
      ...(noteReview?.risk_flags || []).map(r => r.message || r.id).filter(Boolean)
    ];
    const concept = focus[0] || '핵심 개념';
    const reason = missing[0] || aiExtraction?.verification_need?.reason || '학생 이해 확인 필요';
    const text = JSON.stringify({ focus, missing, aiExtraction, engineDiagnosis });
    const isIrrational = /무리수|유리수|순환소수|비순환|루트|제곱근|√|π|분수 꼴|유한소수|무한소수/.test(text);
    if (isIrrational) return this._buildRationalIrrationalProofSet(focus, reason);
    return this._buildGenericProofSet(concept, focus, reason);
  }
  _buildRationalIrrationalProofSet(focus, reason) {
    return {
      set_id: `local_proof_vq_${Date.now()}`,
      target_concepts: Array.from(new Set(focus.concat(['유리수와 무리수의 증명형 판정']))).slice(0, 5),
      source_diagnosis: reason,
      questions: [
        {
          question_id: 'Q1',
          question_type: 'proof_explanation',
          prompt: '0.333...은 끝나지 않는 소수인데도 왜 무리수가 아닌지 증명하세요.',
          student_answer_format: '주장 → 분수 변환 과정 → 결론',
          required_elements: ['0.333... = 1/3 변환', '분수 꼴 가능', '유리수 결론', '무리수가 아님'],
          answer_key: 'x=0.333...이라 두면 10x=3.333..., 10x-x=3, 9x=3, x=1/3이다. 따라서 0.333...은 정수/정수 꼴로 나타낼 수 있으므로 유리수이고, 무리수가 아니다.',
          rubric: [{ score: 4, condition: '분수 변환 과정과 결론이 모두 정확함' }, { score: 3, condition: '분수 꼴 가능 근거는 있으나 과정 일부 생략' }, { score: 1, condition: '순환소수라서 유리수라는 말만 있음' }],
          minimum_pass_score: 3,
          teacher_note: '끝나지 않는 소수=무리수라는 착각을 깨는지 확인한다.'
        },
        {
          question_id: 'Q2',
          question_type: 'non_example_classification',
          prompt: '√4는 루트가 있는데 왜 무리수가 아닌지 증명하세요.',
          student_answer_format: '계산 → 분수 꼴 확인 → 결론',
          required_elements: ['√4 = 2', '2 = 2/1', '유리수', '루트가 있어도 무리수 아님'],
          answer_key: '√4=2이고, 2는 2/1로 나타낼 수 있다. 따라서 √4는 루트가 있지만 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',
          rubric: [{ score: 4, condition: '값 계산과 분수 꼴 근거가 정확함' }, { score: 2, condition: '√4=2만 쓰고 분수 꼴 근거가 약함' }, { score: 1, condition: '루트는 무리수라고 일반화함' }],
          minimum_pass_score: 3,
          teacher_note: '겉모양이 아니라 값과 조건으로 판정하는지 확인한다.'
        },
        {
          question_id: 'Q3',
          question_type: 'proof_explanation',
          prompt: '√2가 무리수임을 “유리수라고 가정하면 모순”이 생기는 구조로 설명하세요.',
          student_answer_format: '가정 → 제곱 → 짝수성 → 모순 → 결론',
          required_elements: ['√2=a/b 가정', 'a²=2b²', 'a와 b가 모두 짝수', '서로소 가정과 모순', '무리수 결론'],
          answer_key: '√2=a/b(a,b는 서로소)라고 가정한다. 제곱하면 a²=2b²이므로 a², a는 짝수이다. a=2k라 두면 b²=2k²가 되어 b도 짝수이다. 그러면 a,b가 둘 다 짝수라 서로소라는 가정과 모순이다. 따라서 √2는 유리수가 아니며 무리수이다.',
          rubric: [{ score: 5, condition: '모순법 흐름이 완전함' }, { score: 3, condition: '가정과 결론은 맞지만 짝수성 논리가 일부 부족함' }, { score: 1, condition: '√2는 외워서 무리수라고만 씀' }],
          minimum_pass_score: 4,
          teacher_note: '중등 심화 증명으로 무리수의 의미를 확인한다.'
        },
        {
          question_id: 'Q4',
          question_type: 'counterexample_generation',
          prompt: '“끝나지 않는 소수는 모두 무리수이다”가 틀렸음을 반례로 증명하세요.',
          student_answer_format: '틀린 문장 → 반례 → 왜 반례인지 → 결론',
          required_elements: ['0.333... 또는 0.121212...', '끝나지 않음', '반복됨', '분수 꼴 가능', '문장 반박'],
          answer_key: '반례는 0.333...이다. 이 수는 끝나지 않는 소수이지만 3이 반복되며 1/3로 나타낼 수 있다. 따라서 끝나지 않는 소수라고 해서 모두 무리수는 아니다.',
          rubric: [{ score: 4, condition: '반례와 반박 이유가 정확함' }, { score: 2, condition: '반례는 맞지만 왜 반례인지 설명 부족' }, { score: 1, condition: '무리수 예시를 반례로 잘못 듦' }],
          minimum_pass_score: 3,
          teacher_note: '반례를 만들 수 있어야 개념 경계를 이해한 것으로 본다.'
        }
      ],
      teacher_decision_rule: 'Q1, Q2, Q4 중 2개 이상과 Q3의 핵심 흐름을 통과하면 부분 이해 이상으로 본다. 반례 문항을 못 하면 암기형으로 판정한다.',
      redo_policy: '틀린 문항은 같은 구조로 다른 수를 넣어 다시 증명하게 한다. 정답만 쓰면 통과하지 않는다.'
    };
  }
  _buildGenericProofSet(concept, focus, reason) {
    return {
      set_id: `local_proof_vq_${Date.now()}`,
      target_concepts: Array.from(new Set(focus)).slice(0, 5),
      source_diagnosis: reason,
      questions: [
        {
          question_id: 'Q1',
          question_type: 'proof_explanation',
          prompt: `${concept}이/가 성립하는 조건을 쓰고, 대표 예시 1개가 그 조건을 만족함을 증명하세요.`,
          student_answer_format: '조건 → 예시 → 조건 확인 → 결론',
          required_elements: ['성립 조건', '대표 예시', '조건 확인', '결론'],
          answer_key: '개념의 정의를 반복하는 것이 아니라, 그 정의가 성립하기 위한 조건을 쓰고 예시가 그 조건을 만족하는지 보여야 한다.',
          rubric: [{ score: 4, condition: '조건과 예시 검증이 정확함' }, { score: 2, condition: '정의는 맞지만 조건 검증이 약함' }, { score: 1, condition: '용어만 반복함' }],
          minimum_pass_score: 3,
          teacher_note: '개념 정의 암기와 조건 판정을 구분한다.'
        },
        {
          question_id: 'Q2',
          question_type: 'counterexample_generation',
          prompt: `${concept}을/를 적용하면 안 되는 반례 또는 비예시를 1개 만들고, 어떤 조건이 깨졌는지 증명하세요.`,
          student_answer_format: '반례/비예시 → 깨진 조건 → 결론',
          required_elements: ['반례 또는 비예시', '적용 불가 조건', '왜 틀리는지 설명'],
          answer_key: '반례/비예시는 그 개념을 적용하면 안 되는 경우여야 하며, 조건 위반 이유가 함께 있어야 한다.',
          rubric: [{ score: 4, condition: '반례와 이유가 정확함' }, { score: 2, condition: '반례는 있으나 이유 부족' }, { score: 1, condition: '다른 예시를 반례로 착각' }],
          minimum_pass_score: 3,
          teacher_note: '반례를 통해 복붙 정리와 실제 이해를 구분한다.'
        },
        {
          question_id: 'Q3',
          question_type: 'proof_explanation',
          prompt: `겉모양은 비슷하지만 ${concept} 적용 여부가 달라지는 두 예시를 비교하여 설명하세요.`,
          student_answer_format: '예시 A → 예시 B → 차이 조건 → 결론',
          required_elements: ['비교 예시 2개', '공통점', '차이 조건', '판정 결론'],
          answer_key: '두 예시의 겉모양이 아니라 조건 차이를 기준으로 판정이 달라진다는 설명이 있어야 한다.',
          rubric: [{ score: 4, condition: '두 예시와 조건 차이가 정확함' }, { score: 2, condition: '예시는 있으나 차이 조건이 약함' }, { score: 1, condition: '느낌이나 암기로 분류' }],
          minimum_pass_score: 3,
          teacher_note: '융합 문제에서 조건 전이를 할 수 있는지 확인한다.'
        }
      ],
      teacher_decision_rule: '성립 조건 증명, 반례 증명, 비교 설명 중 2개 이상 통과해야 부분 이해 이상으로 본다.',
      redo_policy: '틀린 문항은 주장-조건-근거-반례-결론 순서로 다시 작성한다.'
    };
  }
  buildFallbackAnswerReview(verificationSet, answerText) {
    const hasProcess = /(=|따라서|가정|모순|제곱|과정|x\s*=|답)/.test(answerText || '');
    const hasReason = /(이유|왜냐하면|정의|분수|조건|때문|근거|반례|비예시|성립|아님)/.test(answerText || '');
    const hasProofShape = /(주장|가정|조건|근거|반례|결론|따라서)/.test(answerText || '');
    const score = (hasProcess ? 4 : 1) + (hasReason ? 3 : 0) + (hasProofShape ? 2 : 0) + ((answerText || '').length > 80 ? 1 : 0);
    const level = score >= 8 ? 'B' : score >= 5 ? 'C' : 'D';
    return {
      review_id: `local_review_${Date.now()}`,
      overall_result: {
        level,
        score,
        decision: score >= 8 ? 'partial_understanding' : score >= 5 ? 'memorized_only' : 'needs_relearning',
        summary: score >= 8 ? '증명 구조 일부가 확인되지만 교사 확인이 필요합니다.' : '답안에서 조건·근거·반례 중심의 증명 구조가 부족합니다.'
      },
      question_reviews: (verificationSet?.questions || []).map(q => ({
        question_id: q.question_id,
        status: score >= 8 ? 'partial' : 'incorrect',
        score: Math.min(score, 10),
        confirmed_understanding: hasReason ? ['핵심 근거를 쓰려는 시도 있음'] : [],
        missing_elements: [!hasProcess && '증명 과정 부족', !hasReason && '이유/조건 설명 부족', !hasProofShape && '주장-근거-결론 구조 부족'].filter(Boolean),
        misconceptions: [],
        feedback: 'AI 정밀 검수 전 로컬 임시 판정입니다. 실제 판정은 Worker 연결 후 다시 확인하세요.'
      })),
      final_instruction: {
        student_message: score >= 8 ? '방향은 맞지만 조건과 결론을 더 명확히 쓰세요.' : '정답만 쓰지 말고 왜 그런지 주장-근거-반례-결론 구조로 다시 쓰세요.',
        teacher_action: '검수 문항 답안을 보고 증명 구조를 구두로 한 번 더 확인합니다.',
        redo_tasks: ['틀린 문항을 같은 구조의 다른 예시로 다시 증명', '정의-조건-반례-결론 4단계로 재정리'],
        parent_message: '학생 답안에서 개념어 암기보다 조건과 근거를 설명하는 힘을 추가 확인해야 합니다.'
      }
    };
  }
  _guessFileRole(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('concept') || n.includes('개념') || n.includes('정리') || n.includes('summary')) return 'concept_summary_image';
    if (n.includes('오답') || n.includes('wrong') || n.includes('review')) return 'wrong_answer_note_image';
    if (n.includes('note') || n.includes('필기') || n.includes('인강')) return 'lecture_note_image';
    if (n.includes('solution') || n.includes('풀이')) return 'solution_image';
    if (n.includes('answer') || n.includes('검수')) return 'verification_answer_image';
    if (n.endsWith('.pdf')) return 'exam_pdf';
    return 'other';
  }
}
window.MathVerificationFlow = MathVerificationFlow;
