/* Math Verification Flow v1.3 · Patch 16 compact 10-question student output
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
  _proofQuestion(id, type, prompt, format, required, answer, pass = 3, note = '') {
    return {
      question_id: id,
      question_type: type,
      prompt,
      student_answer_format: format,
      required_elements: required,
      answer_key: answer,
      rubric: [
        { score: pass + 1, condition: '조건과 근거, 결론이 모두 정확함' },
        { score: pass, condition: '핵심 방향은 맞지만 설명 일부가 부족함' },
        { score: 1, condition: '정답만 쓰거나 암기 문장만 있음' }
      ],
      minimum_pass_score: pass,
      teacher_note: note
    };
  }
  _buildRationalIrrationalProofSet(focus, reason) {
    const questions = [
      this._proofQuestion('Q1','proof_explanation','0.5가 유리수임을 증명하세요.','분수 변환 → 정수/정수 꼴 확인 → 결론',['0.5=5/10=1/2','분자와 분모가 정수','분모가 0이 아님','유리수 결론'],'0.5=5/10=1/2이다. 1과 2는 정수이고 2는 0이 아니다. 따라서 0.5는 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',3,'유한소수가 유리수임을 분수 변환으로 확인한다.'),
      this._proofQuestion('Q2','proof_explanation','-3이 유리수임을 증명하세요.','정수 → 분수 꼴 → 결론',['-3=-3/1','분자와 분모가 정수','분모가 0이 아님','유리수 결론'],'-3=-3/1이다. -3과 1은 정수이고 1은 0이 아니다. 따라서 -3은 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',3,'정수도 유리수에 포함됨을 확인한다.'),
      this._proofQuestion('Q3','process','0.333...이 유리수임을 x를 이용해 증명하세요.','x로 놓기 → 10x 만들기 → 빼기 → 분수 결론',['x=0.333...','10x=3.333...','9x=3','x=1/3','유리수 결론'],'x=0.333...이라고 하자. 10x=3.333...이므로 10x-x=3, 9x=3, x=1/3이다. 따라서 0.333...은 정수/정수 꼴로 나타낼 수 있으므로 유리수이다.',3,'순환소수의 분수 변환 과정을 확인한다.'),
      this._proofQuestion('Q4','process','0.121212...가 유리수임을 x를 이용해 증명하세요.','x로 놓기 → 100x 만들기 → 빼기 → 분수 결론',['x=0.121212...','100x=12.121212...','99x=12','x=4/33','유리수 결론'],'x=0.121212...라고 하자. 100x=12.121212...이므로 100x-x=12, 99x=12, x=12/99=4/33이다. 따라서 0.121212...는 유리수이다.',3,'반복 자리수에 맞게 10, 100 등을 선택하는지 확인한다.'),
      this._proofQuestion('Q5','proof_explanation','0.333...은 끝나지 않는데 왜 무리수가 아닌지 설명하세요.','끝나지 않음 → 반복됨 → 분수 꼴 → 유리수 결론',['끝나지 않는 소수','3이 반복됨','순환소수','1/3로 표현 가능','무리수가 아님'],'0.333...은 끝나지 않지만 3이 반복되는 순환소수이다. 또한 0.333...=1/3로 나타낼 수 있다. 따라서 무리수가 아니라 유리수이다.',3,'끝나지 않는다=무리수라는 오개념을 확인한다.'),
      this._proofQuestion('Q6','non_example_classification','√4가 무리수가 아닌 이유를 증명하세요.','루트 값 계산 → 분수 꼴 → 결론',['√4=2','2=2/1','정수/정수 꼴','유리수','무리수가 아님'],'√4=2이고, 2=2/1로 나타낼 수 있다. 따라서 √4는 루트가 있지만 정수/정수 꼴로 나타낼 수 있으므로 유리수이고 무리수가 아니다.',3,'루트 기호가 아니라 실제 값으로 판정하는지 확인한다.'),
      this._proofQuestion('Q7','non_example_classification','√9가 무리수가 아닌 이유를 증명하세요.','루트 값 계산 → 분수 꼴 → 결론',['√9=3','3=3/1','정수/정수 꼴','유리수','무리수가 아님'],'√9=3이고, 3=3/1로 나타낼 수 있다. 따라서 √9는 루트가 있지만 유리수이고 무리수가 아니다.',3,'완전제곱수의 제곱근은 유리수임을 확인한다.'),
      this._proofQuestion('Q8','proof_explanation','√2가 무리수인 이유를 설명하세요. 가능하면 “유리수라고 가정하면 모순”의 구조를 사용하세요.','가정 → 제곱 → 짝수성 → 모순 → 결론',['√2=a/b 가정','a²=2b²','a와 b가 모두 짝수','서로소 가정과 모순','무리수 결론'],'√2=a/b(a,b는 서로소)라고 가정한다. 제곱하면 a²=2b²이므로 a는 짝수이다. a=2k를 대입하면 b도 짝수이다. 그러면 a,b가 둘 다 짝수라 서로소라는 가정과 모순이다. 따라서 √2는 유리수가 아니며 무리수이다.',4,'무리수의 의미를 모순법 구조로 확인한다.'),
      this._proofQuestion('Q9','counterexample_generation','“끝나지 않는 소수는 모두 무리수이다”가 틀렸음을 반례로 증명하세요.','틀린 문장 → 반례 → 이유 → 결론',['0.333... 또는 0.121212...','끝나지 않음','반복됨','분수 꼴 가능','문장 반박'],'반례는 0.333...이다. 이 수는 끝나지 않는 소수이지만 3이 반복되고 1/3로 나타낼 수 있다. 따라서 끝나지 않는 소수라고 해서 모두 무리수는 아니다.',3,'반례를 만들 수 있어야 개념 경계를 이해한 것으로 본다.'),
      this._proofQuestion('Q10','proof_explanation','√4와 √2는 둘 다 루트가 있는데 왜 하나는 유리수이고 하나는 무리수인지 비교하세요.','공통점 → 차이 조건 → 각각 판정 → 결론',['둘 다 루트가 있음','√4=2','√2는 분수 꼴 불가능','루트 여부가 아니라 분수 꼴 가능 여부','판정 결론'],'√4와 √2는 둘 다 루트가 있다. 그러나 √4=2이고 2=2/1로 나타낼 수 있으므로 유리수이다. 반면 √2는 정수/정수 꼴로 정확히 나타낼 수 없으므로 무리수이다. 즉 루트가 있는지가 아니라 분수 꼴 가능 여부가 기준이다.',3,'겉모양이 비슷한 수를 조건으로 비교하는지 확인한다.')
    ];
    return {
      set_id: `local_proof_vq_${Date.now()}`,
      target_concepts: Array.from(new Set(focus.concat(['유리수와 무리수의 증명형 판정']))).slice(0, 5),
      source_diagnosis: reason,
      questions,
      teacher_decision_rule: '10문항 중 7문항 이상 통과하면 부분 이해 이상으로 본다. Q5, Q9, Q10 중 2개 이상 틀리면 개념 경계가 약한 것으로 판정한다.',
      redo_policy: '틀린 문항은 같은 구조로 다른 수를 넣어 다시 증명하게 한다. 정답만 쓰면 통과하지 않는다.'
    };
  }
  _buildGenericProofSet(concept, focus, reason) {
    const q = (id, type, prompt, required, answer, pass = 3, note = '') => this._proofQuestion(id, type, prompt, '주장 → 조건 확인 → 근거/계산 → 결론', required, answer, pass, note);
    const questions = [
      q('Q1','proof_explanation',`${concept}의 정의를 쓰고, 이 정의가 성립하기 위한 조건을 설명하세요.`,['정의','성립 조건','조건의 의미','결론'],'정의만 반복하지 말고, 그 개념이 성립하기 위해 반드시 필요한 조건을 함께 써야 한다.'),
      q('Q2','proof_explanation',`${concept}이/가 성립하는 대표 예시 1개를 만들고, 그 예시가 조건을 만족함을 증명하세요.`,['대표 예시','조건 확인','근거','결론'],'예시가 단순히 맞는 답이 아니라, 왜 조건을 만족하는지 설명해야 한다.'),
      q('Q3','non_example_classification',`${concept}을/를 적용하면 안 되는 비예시 1개를 만들고, 어떤 조건이 깨졌는지 설명하세요.`,['비예시','깨진 조건','적용 불가 이유','결론'],'비예시는 그 개념을 적용하면 안 되는 경우여야 하며, 조건 위반 이유가 있어야 한다.'),
      q('Q4','counterexample_generation',`${concept}에 대한 틀린 일반화 문장을 하나 만들고, 반례로 반박하세요.`,['틀린 문장','반례','반례가 되는 이유','결론'],'반례는 틀린 문장을 실제로 깨뜨리는 예시여야 한다.'),
      q('Q5','proof_explanation',`겉모양은 비슷하지만 ${concept} 적용 여부가 달라지는 두 예시를 비교하세요.`,['비교 예시 2개','공통점','차이 조건','판정 결론'],'비슷해 보이는 두 예시를 조건 차이로 구분해야 한다.'),
      q('Q6','process',`${concept}이/가 쓰이는 대표 문제의 풀이 과정을 쓰고, 각 단계에서 왜 그 조건을 쓰는지 설명하세요.`,['풀이 단계','조건 사용 이유','계산 과정','결론'],'계산 결과만 아니라 조건을 왜 쓰는지 보여야 한다.'),
      q('Q7','error_correction',`${concept}을/를 잘못 적용한 풀이를 하나 가정하고, 어디가 왜 틀렸는지 고치세요.`,['오류 위치','틀린 이유','바른 조건','수정 결론'],'오류 수정은 개념 적용 조건을 알고 있는지 확인하는 문항이다.'),
      q('Q8','example_generation',`${concept}을/를 확인할 수 있는 새 예시를 직접 만들고, 답까지 증명하세요.`,['새 예시','조건 확인','답 또는 결론','근거'],'새 예시에 적용할 수 있어야 이해로 본다.'),
      q('Q9','classification',`${concept}을/를 쓸 수 있는 경우와 쓸 수 없는 경우를 각각 1개씩 쓰고 비교하세요.`,['사용 가능 예시','사용 불가 예시','조건 차이','비교 결론'],'적용 조건과 비적용 조건을 나란히 비교해야 한다.'),
      q('Q10','self_explanation',`이 개념이 다음 단원이나 융합 문제에서 왜 필요한지 한 문단으로 설명하세요.`,['현재 개념','연결 단원','필요한 이유','자기 말 설명'],'학년이 올라가서 어디에 쓰이는지 연결할 수 있어야 한다.',2,'학생 동기와 개념 연결성을 확인한다.')
    ];
    return {
      set_id: `local_proof_vq_${Date.now()}`,
      target_concepts: Array.from(new Set(focus)).slice(0, 5),
      source_diagnosis: reason,
      questions,
      teacher_decision_rule: '10문항 중 7문항 이상 통과하면 부분 이해 이상으로 본다. 반례·비예시·비교 설명 문항 중 2개 이상 틀리면 암기형으로 본다.',
      redo_policy: '틀린 문항은 주장-조건-근거-반례/비예시-결론 순서로 다시 작성한다.'
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
