(function(global){
  function escRegex(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function normText(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function hasPattern(text,pat){
    const t=normText(text).toLowerCase();
    const p=String(pat).toLowerCase();
    if(!p) return false;
    return t.includes(p) || new RegExp(escRegex(p).replace(/\\\.\\\.\\\./g,'.*'),'i').test(t);
  }
  function levelOf(score){
    if(score>=85) return 'A';
    if(score>=70) return 'B';
    if(score>=50) return 'C';
    return 'D';
  }
  function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n));}
  function uniq(arr){return Array.from(new Set((arr||[]).filter(Boolean)));}
  const Engine=global.MathWeaknessEngine;
  if(!Engine){console.warn('[MathWeaknessEvidence] MathWeaknessEngine not found'); return;}

  Engine.prototype.loadEvidenceLogic=async function(){
    const le=this.index&&this.index.global_logic&&this.index.global_logic.learning_evidence;
    this.learningEvidenceLoaded=false;
    this.learningEvidenceError=null;
    this.learningEvidence={};
    if(!le){return false;}
    try{
      const [schema,rubric,rules,checklist,feedback]=await Promise.all([
        this._optionalJson(le.student_note_input_schema),
        this._optionalJson(le.note_review_rubric),
        this._optionalJson(le.lecture_note_diagnosis_rules),
        this._optionalJson(le.concept_summary_checklist),
        this._optionalJson(le.student_note_feedback_templates)
      ]);
      this.learningEvidence={schema,rubric,rules,checklist,feedback};
      this.learningEvidenceLoaded=true;
      return true;
    }catch(err){
      this.learningEvidenceError=err.message;
      console.warn('[MathWeaknessEvidence] evidence logic load failed:',err);
      return false;
    }
  };

  Engine.prototype._ensureEvidenceDefaults=function(){
    if(this.learningEvidenceLoaded) return;
    this.learningEvidence={
      rules:{signal_rules:[
        {id:'definition_fraction_form',positive_score:14,patterns:['분수','a/b','b≠0','0이 아닌'],meaning:'정의의 핵심 조건을 적음'},
        {id:'rational_classification',positive_score:16,patterns:['정수','유한소수','순환소수','유리수'],meaning:'분류를 적음'},
        {id:'irrational_exclusion',positive_score:12,patterns:['비순환','무한소수','무리수','π','루트'],meaning:'무리수와 경계를 인식함'},
        {id:'repeating_decimal_example',positive_score:10,patterns:['0.121212','121212','순환마디','반복'],meaning:'순환소수 예시를 남김'},
        {id:'conversion_procedure',positive_score:18,patterns:['10x','100x','99x','분수로','기약분수','양변','빼면'],meaning:'분수 변환 절차가 있음'},
        {id:'own_explanation',positive_score:12,patterns:['왜냐하면','따라서','즉','정리하면','내 말로','기준은'],meaning:'자기 설명이 있음'},
        {id:'problem_application',positive_score:10,patterns:['예제','문제','풀이','확인','오답','검산'],meaning:'문제 적용 흔적이 있음'}
      ],risk_rules:[]},
      feedback:{parent_feedback_rules:[]}
    };
  };

  Engine.prototype.reviewStudentNote=function(input){
    this._ensureEvidenceDefaults();
    const note=(input&&input.student_note)?input.student_note:input;
    const text=normText((note&&note.note_text)||'');
    const observed=note&&Array.isArray(note.observed_items)?note.observed_items:[];
    const rules=(this.learningEvidence.rules&&this.learningEvidence.rules.signal_rules)||[];
    const riskRules=(this.learningEvidence.rules&&this.learningEvidence.rules.risk_rules)||[];
    const signals=[];
    let positive=0;
    rules.forEach(rule=>{
      const matched=(rule.patterns||[]).some(p=>hasPattern(text,p)) || observed.includes(rule.id) || observed.includes(rule.id.replace(/_/g,'-'));
      if(matched){signals.push({id:rule.id,score:rule.positive_score,meaning:rule.meaning}); positive+=Number(rule.positive_score||0);}
    });
    const ids=signals.map(s=>s.id);
    const riskFlags=[];
    let penalty=0;
    riskRules.forEach(rule=>{
      const presentOk=(rule.trigger_when_present||[]).length===0 || (rule.trigger_when_present||[]).some(id=>ids.includes(id));
      const missingBad=(rule.trigger_when_missing||[]).some(id=>!ids.includes(id));
      const allMissingBad=(rule.trigger_when_missing||[]).length>0 && missingBad;
      if((rule.trigger_when_missing||[]).length ? (presentOk&&allMissingBad) : false){
        riskFlags.push({id:rule.id,penalty:rule.penalty,message:rule.message}); penalty+=Number(rule.penalty||0);
      }
    });
    const watchScore=clamp(Math.round(40 + Math.min(45,positive*0.7) + Math.min(10,text.length/140) - Math.min(15,penalty*0.15)),0,100);
    const understandingScore=clamp(Math.round(25 + positive*0.9 - penalty*0.6),0,100);
    const level=levelOf(understandingScore);
    const teacherQuestions=[];
    if((note&&note.unit_id)==='m1_int_rational'||/유리수|순환소수/.test(text)){
      teacherQuestions.push('0.121212...가 유리수인 이유를 분수 변환 과정으로 설명해 봐.');
      teacherQuestions.push('유한소수, 순환소수, 비순환무한소수를 각각 하나씩 쓰고 유리수/무리수를 표시해 봐.');
      teacherQuestions.push('무한소수는 전부 무리수라고 말하면 왜 틀렸는지 설명해 봐.');
    }else{
      teacherQuestions.push('이 개념의 정의를 조건까지 포함해 한 문장으로 설명해 봐.');
      teacherQuestions.push('정답 예시와 헷갈리는 반례를 각각 하나씩 들어 봐.');
    }
    const redoTask=[];
    if(!ids.includes('conversion_procedure')) redoTask.push('대표 예시 1개를 골라 풀이 절차를 줄 단위로 다시 쓰기');
    if(!ids.includes('own_explanation')) redoTask.push('개념을 친구에게 설명하듯 자기 말 한 문장으로 다시 쓰기');
    if(!ids.includes('problem_application')) redoTask.push('기본 확인 문제 2개를 풀고 사용한 개념 표시하기');
    if(redoTask.length===0) redoTask.push('같은 개념의 변형 문제 2개로 적용 확인하기');
    const parentMap={A:'강의 핵심을 자기 설명과 문제 적용까지 연결한 상태입니다.',B:'강의는 본 것으로 보이나, 개념을 문제에 적용하는 근거가 조금 더 필요합니다.',C:'필기량은 있으나 이해 확인이 부족합니다. 분류 기준과 풀이 절차를 다시 확인해야 합니다.',D:'시청 여부보다 이해 산출물이 부족한 상태입니다. 재시청 후 필수 양식으로 다시 제출시키는 것이 좋습니다.'};
    return {
      summary:{unit_id:note&&note.unit_id,lesson_title:note&&note.lesson_title,watch_confidence_score:watchScore,understanding_score:understandingScore,understanding_level:level},
      evidence_signals:signals,
      risk_flags:uniq(riskFlags.map(r=>JSON.stringify(r))).map(s=>JSON.parse(s)),
      teacher_check_questions:teacherQuestions,
      redo_task:redoTask,
      parent_feedback:parentMap[level],
      engine_note:'사진만으로 실제 인강 시청 여부를 확정하지 않고, 필기 구조·개념 정확성·이유 설명·문제 적용 증거를 함께 평가합니다.'
    };
  };
})(window);
