const SERVICE_NAME = 'math-diagnosis-worker';
const DEFAULT_MODEL = 'gpt-4.1-mini';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));
      if (url.pathname === '/health') return json({ ok: true, service: SERVICE_NAME, hasOpenAIKey: Boolean(env.OPENAI_API_KEY), mode: env.ENGINE_MODE || 'development' });
      if (url.pathname === '/config') return json({ ok: true, service: SERVICE_NAME, model: env.OPENAI_MODEL || DEFAULT_MODEL, allowStub: String(env.ALLOW_STUB ?? 'true'), endpoints: ['/api/math-diagnose/analyze','/api/math-diagnose/generate-verification','/api/math-diagnose/review-verification','/api/math-diagnose/final-report'] });

      if (url.pathname === '/api/math-diagnose/analyze' && request.method === 'POST') {
        const { payload, files } = await parseHybridRequest(request);
        const prompt = buildAnalyzePrompt(payload);
        const result = await runJsonTask({ env, prompt, files, schemaName: 'math_ai_extraction', schema: AI_EXTRACTION_SCHEMA, fallback: () => buildAnalyzeFallback(payload) });
        return json(result);
      }
      if (url.pathname === '/api/math-diagnose/generate-verification' && request.method === 'POST') {
        const payload = await request.json();
        const prompt = buildVerificationPrompt(payload);
        const result = await runJsonTask({ env, prompt, files: [], schemaName: 'math_verification_questions', schema: VERIFICATION_QUESTION_SCHEMA, fallback: () => buildVerificationFallback(payload) });
        return json(result);
      }
      if (url.pathname === '/api/math-diagnose/review-verification' && request.method === 'POST') {
        const { payload, files } = await parseHybridRequest(request);
        const prompt = buildReviewPrompt(payload);
        const result = await runJsonTask({ env, prompt, files, schemaName: 'math_verification_answer_review', schema: ANSWER_REVIEW_SCHEMA, fallback: () => buildAnswerReviewFallback(payload) });
        return json(result);
      }
      if (url.pathname === '/api/math-diagnose/final-report' && request.method === 'POST') {
        const payload = await request.json();
        const prompt = buildFinalReportPrompt(payload);
        const result = await runJsonTask({ env, prompt, files: [], schemaName: 'math_final_report', schema: FINAL_REPORT_SCHEMA, fallback: () => buildFinalReportFallback(payload) });
        return json(result);
      }
      return json({ ok: false, error: 'Not found' }, 404);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: error?.message || 'Unknown error' }, 500);
    }
  }
};

async function parseHybridRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const payload = JSON.parse(String(form.get('payload') || '{}'));
    const files = [];
    for (const [key, value] of form.entries()) {
      if (value instanceof File) files.push(value);
    }
    return { payload, files };
  }
  return { payload: await request.json(), files: [] };
}

async function runJsonTask({ env, prompt, files, schemaName, schema, fallback }) {
  const allowStub = String(env.ALLOW_STUB ?? 'true').toLowerCase() === 'true';
  if (!env.OPENAI_API_KEY || allowStub) return fallback();
  try {
    return await callOpenAIJson({ env, prompt, files, schemaName, schema });
  } catch (error) {
    console.error('OpenAI JSON task failed:', error?.message || error);
    if (String(env.FALLBACK_ON_OPENAI_ERROR ?? 'true').toLowerCase() === 'true') return fallback();
    throw error;
  }
}

async function callOpenAIJson({ env, prompt, files, schemaName, schema }) {
  const content = [{ type: 'input_text', text: prompt }];
  for (const file of files || []) {
    const mime = file.type || 'application/octet-stream';
    const base64 = await fileToBase64(file);
    if (mime.startsWith('image/')) {
      content.push({ type: 'input_image', image_url: `data:${mime};base64,${base64}` });
    } else {
      content.push({ type: 'input_file', filename: file.name || 'upload.pdf', file_data: `data:${mime};base64,${base64}` });
    }
  }
  const body = {
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    input: [{ role: 'user', content }],
    text: { format: { type: 'json_schema', name: schemaName, schema, strict: true } }
  };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
  const text = data.output_text || extractOutputText(data);
  if (!text) throw new Error('OpenAI response has no output_text');
  return JSON.parse(text);
}
function extractOutputText(data) {
  const out = data?.output || [];
  for (const item of out) for (const c of item.content || []) if (c.text) return c.text;
  return '';
}
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
function buildAnalyzePrompt(payload) {
  return `너는 수학 취약유형 진단 AI Bridge다. 학생 자료를 읽고 JSON schema에 맞춰 구조화하라.\n\n중요 원칙:\n- 학생이 인강을 봤는지 단정하지 말고, 확인된 흔적/부족한 증거를 구분한다.\n- 풀이 사진과 필기 사진에서 개념 이해, 과정 누락, 오류 후보를 뽑는다.\n- math-weakness-engine에 넣을 student_attempt와 note_review_input을 만들어라.\n\n입력 payload:\n${JSON.stringify(payload, null, 2)}`;
}
function buildVerificationPrompt(payload) {
  return `1차 진단 결과를 바탕으로 학생에게 풀릴 검수 문항 세트를 생성하라. 문항은 학생이 빠뜨린 개념을 확인해야 한다. 각 문항에는 필수 요소와 교사용 판정 기준을 포함하라.\n\n입력:\n${JSON.stringify(payload, null, 2)}`;
}
function buildReviewPrompt(payload) {
  return `학생이 검수 문항에 작성한 답안을 재검수하라. 정답 여부뿐 아니라 정의 연결, 풀이 과정, 핵심 근거, 예시 적용 가능성을 기준으로 A/B/C/D 판정하라.\n\n입력:\n${JSON.stringify(payload, null, 2)}`;
}
function buildFinalReportPrompt(payload) {
  return `AI 분석, 수학 엔진 진단, 검수 문항, 학생 답안 재검수 결과를 합쳐 학생용/학부모용/교사용 최종 리포트를 작성하라.\n\n입력:\n${JSON.stringify(payload, null, 2)}`;
}

function buildAnalyzeFallback(payload) {
  const ctx = payload?.learning_context || {};
  const noteText = payload?.submission?.text_inputs?.lecture_note_text || '';
  const solutionText = payload?.submission?.text_inputs?.student_solution_text || '';
  const wrongs = ctx.wrong_question_numbers || [];
  const known = ctx.known_problem_type_ids || [];
  const hasNote = noteText.length > 20;
  const hasProcess = /\=|따라서|왜냐하면|풀이|과정|x\s*=/.test(solutionText);
  return {
    ok: true,
    extraction_summary: { source_quality: 'partially_clear', student_did_work_evidence: hasNote || hasProcess ? 'some' : 'weak', confidence: 0.45, missing_materials: ['OpenAI API 미연결 fallback 결과'] },
    student_material_review: {
      lecture_note_review: { watch_evidence: hasNote ? 'possibly_watched' : 'not_enough_evidence', understanding_level: hasNote ? 'C' : 'D', confirmed_concepts: [ctx.unit_name].filter(Boolean), missing_evidence: ['자기 말 설명 또는 풀이 과정 추가 확인 필요'], risk_flags: ['fallback_mode'], teacher_observation: '정밀 검수 전 임시 판단입니다.' },
      solution_review: { process_evidence: hasProcess ? 'partial_process' : 'not_visible', main_error_candidates: ['정밀 분석 필요'], calculation_error_candidates: [], concept_error_candidates: [], quoted_student_steps: [] }
    },
    math_signal: { unit_candidates: [{ unit_id: ctx.unit_id || '', unit_name: ctx.unit_name || '', confidence: 0.5 }], problem_type_candidates: wrongs.map((q,i) => ({ question_no:q, problem_type_id: known[i] || '', problem_type_hint: known[i] || 'unknown', confidence: known[i] ? 0.7 : 0.2, evidence:'user_input' })), concept_candidates: [{ concept_id:'', concept_name: ctx.unit_name || '핵심 개념', evidence:'user_context' }], misconception_candidates: [{ misconception:'풀이 과정 또는 개념 설명 확인 필요', why_it_matters:'필기/풀이만으로 이해 여부를 확정할 수 없음', severity:'medium' }] },
    engine_adapter: { student_attempt: { attempts: wrongs.map((q,i) => ({ question_no:q, problem_type_id: known[i] || '', is_correct:false, difficulty:'core', observed_error_tags:['ai_bridge_fallback'] })) }, note_review_input: { student_note: { unit_id: ctx.unit_id || '', lesson_title: ctx.lesson_title || ctx.unit_name || '', note_text: noteText } }, recommended_engine_actions: ['run_diagnoseWithGuidance','run_reviewStudentNote','generate_verification_questions'] },
    verification_need: { needed: true, reason:'정밀 이해 확인 필요', focus_concepts:[ctx.unit_name || '핵심 개념'], must_check_actions:['정의 설명','풀이 과정 작성','자기 말 설명'] }
  };
}
function buildVerificationFallback(payload) {
  const focus = payload?.ai_extraction?.verification_need?.focus_concepts || ['핵심 개념'];
  const concept = focus[0] || '핵심 개념';
  return { set_id:`fallback_vq_${Date.now()}`, target_concepts:focus, source_diagnosis:'AI fallback 검수 문항', questions:[{ question_id:'VQ1', question_type:'definition', prompt:`${concept}의 뜻을 자기 말로 설명하고 예시를 1개 쓰세요.`, student_answer_format:'서술형', required_elements:['정의','예시','이유'], answer_key:'정의와 예시가 정확해야 한다.', rubric:[{score:3,condition:'정의와 예시 정확'},{score:1,condition:'용어만 반복'}], minimum_pass_score:2, teacher_note:'암기와 이해를 구분' },{ question_id:'VQ2', question_type:'process', prompt:'대표 문제 하나를 풀이 과정 전체로 다시 쓰세요.', student_answer_format:'단계별 풀이', required_elements:['시작식','중간 과정','결론'], answer_key:'과정이 생략되지 않아야 한다.', rubric:[{score:4,condition:'과정 정확'},{score:1,condition:'정답만 있음'}], minimum_pass_score:3, teacher_note:'과정 누락 확인' }], teacher_decision_rule:'과정 문항을 통과하지 못하면 재학습 처리', redo_policy:'틀린 문항은 다른 예시로 다시 작성' };
}
function buildAnswerReviewFallback(payload) {
  const txt = payload?.student_answer_text || payload?.student_upload?.submission?.text_inputs?.verification_answer_text || '';
  const hasReason = /왜냐하면|이유|정의|때문/.test(txt);
  const hasProcess = /=|따라서|과정|풀이/.test(txt);
  const score = (hasReason?4:0)+(hasProcess?4:0)+(txt.length>80?2:0);
  const level = score>=8?'A':score>=6?'B':score>=3?'C':'D';
  return { review_id:`fallback_review_${Date.now()}`, overall_result:{ level, score, decision: score>=6?'partial_understanding':'needs_relearning', summary:'fallback 재검수 결과입니다.' }, question_reviews:[], final_instruction:{ student_message: score>=6?'방향은 맞지만 더 명확한 설명이 필요합니다.':'풀이 과정과 이유를 다시 작성해야 합니다.', teacher_action:'구두 확인 후 재작성 지시', redo_tasks:['정의-과정-결론 3단계로 다시 작성'], parent_message:'학생 답안에서 과정과 이유 설명을 추가 확인해야 합니다.' } };
}
function buildFinalReportFallback(payload) {
  const name = payload?.student_upload?.student_profile?.student_name || '학생';
  return { report_id:`fallback_report_${Date.now()}`, report_type:'full_cycle', student_summary:{ status:`${name}의 임시 진단 결과입니다.`, what_is_understood:[], what_is_missing:['정밀 AI 분석 또는 교사 확인 필요'], next_action:['검수 문항 답안을 과정 중심으로 다시 작성'] }, teacher_summary:{ diagnosis:'fallback 리포트입니다. Worker/OpenAI 연결 후 정밀 분석하세요.', evidence:['입력 payload 기반'], instruction_plan:['검수 문항 재작성','오답 문항 풀이 과정 확인'], watch_points:['개념어 암기와 실제 이해 구분'] }, parent_summary:{ plain_message:'학생이 학습한 흔적은 자료로 확인해야 하며, 현재는 정밀 분석 전 임시 결과입니다.', home_support:['정답보다 풀이 과정과 이유를 말로 설명하게 해주세요.'] }, next_plan:{ redo_tasks:['검수 문항 답안 재작성'], verification_required_again:true, recommended_due_date_hint:'다음 수업 전' } };
}

function json(data, status = 200) { return withCors(new Response(JSON.stringify(data, null, 2), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })); }
function withCors(res) { const h = new Headers(res.headers); h.set('Access-Control-Allow-Origin','*'); h.set('Access-Control-Allow-Methods','GET,POST,OPTIONS'); h.set('Access-Control-Allow-Headers','Content-Type,Authorization'); return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h }); }

const AI_EXTRACTION_SCHEMA = {
  type:'object', additionalProperties:false, required:['ok','extraction_summary','student_material_review','math_signal','engine_adapter','verification_need'], properties:{
    ok:{type:'boolean'},
    extraction_summary:{type:'object',additionalProperties:false,required:['source_quality','student_did_work_evidence','confidence','missing_materials'],properties:{source_quality:{type:'string',enum:['clear','partially_clear','hard_to_read','insufficient']},student_did_work_evidence:{type:'string',enum:['strong','some','weak','none']},confidence:{type:'number'},missing_materials:{type:'array',items:{type:'string'}}}},
    student_material_review:{type:'object',additionalProperties:false,required:['lecture_note_review','solution_review'],properties:{lecture_note_review:{type:'object',additionalProperties:false,required:['watch_evidence','understanding_level','confirmed_concepts','missing_evidence','risk_flags','teacher_observation'],properties:{watch_evidence:{type:'string',enum:['likely_watched','possibly_watched','copied_terms_only','not_enough_evidence']},understanding_level:{type:'string',enum:['A','B','C','D']},confirmed_concepts:{type:'array',items:{type:'string'}},missing_evidence:{type:'array',items:{type:'string'}},risk_flags:{type:'array',items:{type:'string'}},teacher_observation:{type:'string'}}},solution_review:{type:'object',additionalProperties:false,required:['process_evidence','main_error_candidates','calculation_error_candidates','concept_error_candidates','quoted_student_steps'],properties:{process_evidence:{type:'string',enum:['full_process','partial_process','answer_only','not_visible']},main_error_candidates:{type:'array',items:{type:'string'}},calculation_error_candidates:{type:'array',items:{type:'string'}},concept_error_candidates:{type:'array',items:{type:'string'}},quoted_student_steps:{type:'array',items:{type:'string'}}}}}},
    math_signal:{type:'object',additionalProperties:false,required:['unit_candidates','problem_type_candidates','concept_candidates','misconception_candidates'],properties:{unit_candidates:{type:'array',items:{type:'object',additionalProperties:false,required:['unit_id','unit_name','confidence'],properties:{unit_id:{type:'string'},unit_name:{type:'string'},confidence:{type:'number'}}}},problem_type_candidates:{type:'array',items:{type:'object',additionalProperties:false,required:['question_no','problem_type_id','problem_type_hint','confidence','evidence'],properties:{question_no:{type:['string','number']},problem_type_id:{type:'string'},problem_type_hint:{type:'string'},confidence:{type:'number'},evidence:{type:'string'}}}},concept_candidates:{type:'array',items:{type:'object',additionalProperties:false,required:['concept_id','concept_name','evidence'],properties:{concept_id:{type:'string'},concept_name:{type:'string'},evidence:{type:'string'}}}},misconception_candidates:{type:'array',items:{type:'object',additionalProperties:false,required:['misconception','why_it_matters','severity'],properties:{misconception:{type:'string'},why_it_matters:{type:'string'},severity:{type:'string',enum:['low','medium','high']}}}}}},
    engine_adapter:{type:'object',additionalProperties:false,required:['student_attempt','note_review_input','recommended_engine_actions'],properties:{student_attempt:{type:'object',additionalProperties:true},note_review_input:{type:'object',additionalProperties:true},recommended_engine_actions:{type:'array',items:{type:'string'}}}},
    verification_need:{type:'object',additionalProperties:false,required:['needed','reason','focus_concepts','must_check_actions'],properties:{needed:{type:'boolean'},reason:{type:'string'},focus_concepts:{type:'array',items:{type:'string'}},must_check_actions:{type:'array',items:{type:'string'}}}}
  }
};
const VERIFICATION_QUESTION_SCHEMA = { type:'object', additionalProperties:false, required:['set_id','target_concepts','source_diagnosis','questions','teacher_decision_rule','redo_policy'], properties:{ set_id:{type:'string'}, target_concepts:{type:'array',items:{type:'string'}}, source_diagnosis:{type:'string'}, questions:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','question_type','prompt','student_answer_format','required_elements','answer_key','rubric','minimum_pass_score','teacher_note'],properties:{question_id:{type:'string'},question_type:{type:'string',enum:['definition','classification','process','proof_explanation','error_correction','self_explanation','example_generation']},prompt:{type:'string'},student_answer_format:{type:'string'},required_elements:{type:'array',items:{type:'string'}},answer_key:{type:'string'},rubric:{type:'array',items:{type:'object',additionalProperties:false,required:['score','condition'],properties:{score:{type:'number'},condition:{type:'string'}}}},minimum_pass_score:{type:'number'},teacher_note:{type:'string'}}}}, teacher_decision_rule:{type:'string'}, redo_policy:{type:'string'} } };
const ANSWER_REVIEW_SCHEMA = { type:'object',additionalProperties:false,required:['review_id','overall_result','question_reviews','final_instruction'],properties:{ review_id:{type:'string'}, overall_result:{type:'object',additionalProperties:false,required:['level','score','decision','summary'],properties:{level:{type:'string',enum:['A','B','C','D']},score:{type:'number'},decision:{type:'string',enum:['understood','partial_understanding','memorized_only','needs_relearning']},summary:{type:'string'}}}, question_reviews:{type:'array',items:{type:'object',additionalProperties:false,required:['question_id','status','score','confirmed_understanding','missing_elements','misconceptions','feedback'],properties:{question_id:{type:'string'},status:{type:'string',enum:['correct','partial','incorrect','unanswered']},score:{type:'number'},confirmed_understanding:{type:'array',items:{type:'string'}},missing_elements:{type:'array',items:{type:'string'}},misconceptions:{type:'array',items:{type:'string'}},feedback:{type:'string'}}}}, final_instruction:{type:'object',additionalProperties:false,required:['student_message','teacher_action','redo_tasks','parent_message'],properties:{student_message:{type:'string'},teacher_action:{type:'string'},redo_tasks:{type:'array',items:{type:'string'}},parent_message:{type:'string'}}} } };
const FINAL_REPORT_SCHEMA = { type:'object',additionalProperties:false,required:['report_id','report_type','student_summary','teacher_summary','parent_summary','next_plan'],properties:{ report_id:{type:'string'}, report_type:{type:'string',enum:['initial_diagnosis','after_verification_review','full_cycle']}, student_summary:{type:'object',additionalProperties:false,required:['status','what_is_understood','what_is_missing','next_action'],properties:{status:{type:'string'},what_is_understood:{type:'array',items:{type:'string'}},what_is_missing:{type:'array',items:{type:'string'}},next_action:{type:'array',items:{type:'string'}}}}, teacher_summary:{type:'object',additionalProperties:false,required:['diagnosis','evidence','instruction_plan','watch_points'],properties:{diagnosis:{type:'string'},evidence:{type:'array',items:{type:'string'}},instruction_plan:{type:'array',items:{type:'string'}},watch_points:{type:'array',items:{type:'string'}}}}, parent_summary:{type:'object',additionalProperties:false,required:['plain_message','home_support'],properties:{plain_message:{type:'string'},home_support:{type:'array',items:{type:'string'}}}}, next_plan:{type:'object',additionalProperties:false,required:['redo_tasks','verification_required_again','recommended_due_date_hint'],properties:{redo_tasks:{type:'array',items:{type:'string'}},verification_required_again:{type:'boolean'},recommended_due_date_hint:{type:'string'}}} } };
