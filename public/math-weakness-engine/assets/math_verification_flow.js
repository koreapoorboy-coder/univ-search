/* Math Verification Flow v1.4 · Patch 14 student workbook fallback questions
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
        use_existing_math_engine: true
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
      ...(noteReview?.risk_flags || []).map(r => r.message || r.id).filter(Boolean)
    ];
    const concept = focus[0] || '핵심 개념';
    const reason = missing[0] || aiExtraction?.verification_need?.reason || '학생 이해 확인 필요';
    return {
      set_id: `local_vq_${Date.now()}`,
      target_concepts: Array.from(new Set(focus)).slice(0, 5),
      source_diagnosis: reason,
      questions: [
        {
          question_id: 'Q1',
          question_type: 'definition',
          prompt: `${concept}의 뜻을 자기 말로 설명하고, 언제 쓸 수 있는지 조건을 1개 쓰세요.`,
          student_answer_format: '2~4문장 서술',
          required_elements: ['정의', '사용 조건', '대표 예시'],
          answer_key: '모범답안 기준: 개념의 뜻, 적용 가능한 조건 1개, 조건을 만족하는 예시 1개가 함께 있어야 한다. 용어만 반복하면 통과하지 않는다.',
          rubric: [{ score: 3, condition: '정의와 예시가 모두 정확함' }, { score: 2, condition: '방향은 맞지만 이유가 부족함' }, { score: 1, condition: '용어만 반복함' }],
          minimum_pass_score: 2,
          teacher_note: '개념어 암기와 이해 설명을 구분한다.'
        },
        {
          question_id: 'Q2',
          question_type: 'counterexample_generation',
          prompt: `${concept}을/를 적용하면 안 되는 반례 또는 비예시를 1개 만들고, 왜 안 되는지 이유를 쓰세요.`,
          student_answer_format: '반례/비예시 + 이유 서술',
          required_elements: ['반례 또는 비예시', '적용 불가 조건', '왜 안 되는지 설명'],
          answer_key: '모범답안 기준: 반례/비예시는 그 개념의 조건을 어기는 경우여야 하며, 왜 적용하면 안 되는지 조건 위반 이유를 함께 써야 한다.',
          rubric: [{ score: 4, condition: '반례와 이유 모두 정확함' }, { score: 2, condition: '반례는 있으나 이유가 부족함' }, { score: 1, condition: '다른 예시를 반례로 착각함' }],
          minimum_pass_score: 3,
          teacher_note: '반례/비예시 구분으로 복붙 정리와 실제 이해를 구분한다.'
        },
        {
          question_id: 'Q3',
          question_type: 'process',
          prompt: '대표 문제 하나를 골라 풀이 과정을 처음부터 끝까지 쓰고, 중간에 사용한 개념 이름과 이유를 표시하세요.',
          student_answer_format: '단계별 풀이',
          required_elements: ['시작식', '중간 과정', '사용한 개념', '선택 이유', '결론'],
          answer_key: '모범답안 기준: 시작식, 중간식, 사용한 개념, 그 개념을 선택한 이유, 결론이 순서대로 보여야 한다. 정답만 쓰면 통과하지 않는다.',
          rubric: [{ score: 4, condition: '과정과 이유 모두 정확함' }, { score: 2, condition: '계산은 맞지만 이유 설명이 부족함' }, { score: 1, condition: '정답만 있음' }],
          minimum_pass_score: 3,
          teacher_note: '과정 생략이 많으면 다시 풀이하게 한다.'
        }
      ],
      teacher_decision_rule: '확인 문제 3개 중 2개 이상 통과해야 부분 이해 이상으로 본다. 반례/비예시 문항을 통과하지 못하면 개념정리를 다시 해야 한다.',
      redo_policy: '통과하지 못한 문항은 정의-조건-예시-반례 순서로 다시 정리한 뒤 같은 구조의 다른 예시로 재작성한다.'
    };
  }
  buildFallbackAnswerReview(verificationSet, answerText) {
    const hasProcess = /(=|따라서|왜냐하면|과정|x\s*=|답)/.test(answerText || '');
    const hasReason = /(이유|왜냐하면|정의|분수|조건|때문)/.test(answerText || '');
    const score = (hasProcess ? 4 : 1) + (hasReason ? 3 : 0) + ((answerText || '').length > 80 ? 2 : 0);
    const level = score >= 7 ? 'B' : score >= 4 ? 'C' : 'D';
    return {
      review_id: `local_review_${Date.now()}`,
      overall_result: {
        level,
        score,
        decision: score >= 7 ? 'partial_understanding' : 'needs_relearning',
        summary: score >= 7 ? '풀이 또는 이유 설명 일부가 확인되지만 교사 확인이 필요합니다.' : '답안에서 과정과 핵심 근거가 부족합니다.'
      },
      question_reviews: (verificationSet?.questions || []).map(q => ({
        question_id: q.question_id,
        status: score >= 7 ? 'partial' : 'incorrect',
        score: Math.min(score, 10),
        confirmed_understanding: hasReason ? ['핵심 근거를 쓰려는 시도 있음'] : [],
        missing_elements: [!hasProcess && '풀이 과정 부족', !hasReason && '이유 설명 부족'].filter(Boolean),
        misconceptions: [],
        feedback: 'AI 정밀 검수 전 로컬 임시 판정입니다. 실제 판정은 Worker 연결 후 다시 확인하세요.'
      })),
      final_instruction: {
        student_message: score >= 7 ? '방향은 맞지만 풀이 과정과 이유를 더 명확히 쓰세요.' : '정답만 쓰지 말고 왜 그렇게 되는지 과정과 이유를 다시 쓰세요.',
        teacher_action: '검수 문항 답안을 보고 과정 설명을 구두로 한 번 더 확인합니다.',
        redo_tasks: ['틀린 문항을 같은 구조의 다른 예시로 다시 작성', '정의-과정-결론 3단계로 재정리'],
        parent_message: '학생이 다시 작성한 답안에서 과정과 이유 설명이 아직 부족하여 추가 확인이 필요합니다.'
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
