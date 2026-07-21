(function(global){
  const DIFFICULTY_WEIGHT={basic:1.35,core:1.0,advanced:0.8,high:0.65};
  const DEFAULT_SEVERITY_BANDS=[
    {min:0.00,max:0.30,label:'단순 실수 가능',action:'같은 유형 1~2문항 재확인'},
    {min:0.31,max:0.60,label:'현재 단원 보강 필요',action:'현재 문항분류의 강제 풀이 양식 적용'},
    {min:0.61,max:0.80,label:'선행 개념 누수 가능성 높음',action:'backtrack route 1~2단계 보강'},
    {min:0.81,max:1.00,label:'구조적 취약',action:'하위 단원부터 재학습'}
  ];
  function byId(list,key){const m={}; (list||[]).forEach(x=>{if(x&&x[key]!=null)m[x[key]]=x;}); return m;}
  function norm(v){return String(v==null?'':v).trim().toLowerCase();}
  function isCorrect(a){
    const v=a.correct!==undefined?a.correct:(a.is_correct!==undefined?a.is_correct:(a.isCorrect!==undefined?a.isCorrect:a.result));
    if(v===true||v===1) return true;
    if(v===false||v===0) return false;
    const s=norm(v);
    return ['o','ok','true','correct','right','정답','맞음','맞았다','1'].includes(s);
  }
  function uniq(arr){return Array.from(new Set((arr||[]).filter(Boolean)));}
  function overlap(a,b){const bs=new Set(b||[]); return (a||[]).some(x=>bs.has(x));}
  function listOf(pack,key){return (pack&&Array.isArray(pack[key]))?pack[key]:[];}
  function clamp01(n){return Math.max(0,Math.min(1,n));}
  function ratio(n,d){return d>0?n/d:0;}
  function num(v,fallback=0){const n=Number(v); return Number.isFinite(n)?n:fallback;}
  function boolOrNull(v){if(v===true||v===false)return v; const s=norm(v); if(['true','yes','1','o','ok','있음','완료','성공'].includes(s))return true; if(['false','no','0','x','없음','미완료','실패'].includes(s))return false; return null;}
  const RESPONSE_STATUS_ALIASES={correct:'CORRECT_COMPLETE',correct_complete:'CORRECT_COMPLETE',wrong:'WRONG_COMPLETE',incorrect:'WRONG_COMPLETE',wrong_complete:'WRONG_COMPLETE',partial:'PARTIAL_STOP',partial_stop:'PARTIAL_STOP',stopped:'PARTIAL_STOP',blank:'BLANK_UNKNOWN',unknown_blank:'BLANK_UNKNOWN',blank_unknown:'BLANK_UNKNOWN',unanswered:'BLANK_UNKNOWN',answer_only:'ANSWER_ONLY',unknown:'UNKNOWN'};
  function responseStatusOf(a){
    const raw=norm(a&& (a.response_status||a.attempt_status||a.solution_status||a.status));
    if(raw){const upper=raw.toUpperCase(); if(['CORRECT_COMPLETE','WRONG_COMPLETE','PARTIAL_STOP','BLANK_UNKNOWN','ANSWER_ONLY','UNKNOWN'].includes(upper))return upper; if(RESPONSE_STATUS_ALIASES[raw])return RESPONSE_STATUS_ALIASES[raw];}
    if(a&&(a.is_blank===true||a.blank===true||a.unanswered===true))return 'BLANK_UNKNOWN';
    if(a&&(a.partial===true||a.stopped===true||a.incomplete===true))return 'PARTIAL_STOP';
    if(a&&(a.answer_only===true||norm(a.process_evidence)==='answer_only'))return 'ANSWER_ONLY';
    if(a&&(a.correct!==undefined||a.is_correct!==undefined||a.isCorrect!==undefined||a.result!==undefined))return isCorrect(a)?'CORRECT_COMPLETE':'WRONG_COMPLETE';
    return 'UNKNOWN';
  }
  function stripUndefined(obj){
    if(Array.isArray(obj)) return obj.map(stripUndefined);
    if(obj&&typeof obj==='object'){
      const out={};
      Object.keys(obj).forEach(k=>{if(obj[k]!==undefined) out[k]=stripUndefined(obj[k]);});
      return out;
    }
    return obj;
  }

  class MathWeaknessEngine{
    constructor(basePath='.'){
      this.basePath=basePath.replace(/\/$/,'');
      this.loaded=false;
      this.globalLogicLoaded=false;
      this.globalLogicError=null;
    }
    async _json(path){
      const res=await fetch(`${this.basePath}/${path}`);
      if(!res.ok) throw new Error(`load failed: ${path}`);
      return await res.json();
    }
    async _optionalJson(path){
      if(!path) return null;
      try{return await this._json(path);}catch(err){console.warn('[MathWeaknessEngine] optional load skipped:',path,err.message); return null;}
    }
    async load(){
      this.manifest=await this._json('manifest.json');
      this.index=await this._json(this.manifest.data_index);
      this.declaredUnits=this.index.units||[];
      this.units=[];
      this.unitLoadWarnings=[];
      this.skippedUnits=[];
      const conceptPack=await this._json('data/math_concepts.v1.json');
      this.concepts=conceptPack;
      this.allProblemTypes=[]; this.allEdges=[]; this.allRules=[]; this.allRemediation=[]; this.unitData={};
      for(const u of this.declaredUnits){
        try{
          const [pt,ed,ru,re]=await Promise.all([
            this._json(u.problem_types),
            this._json(u.edges),
            this._json(u.diagnosis_rules),
            this._json(u.remediation)
          ]);
          this.unitData[u.unit_id]={unit:u,problemTypes:pt,edges:ed,rules:ru,remediation:re};
          this.allProblemTypes.push(...(pt.problem_types||[]));
          this.allEdges.push(...(ed.edges||[]));
          this.allRules.push(...(ru.rules||[]));
          this.allRemediation.push(...(re.remediation||[]));
          this.units.push(u);
        }catch(err){
          const warning={unit_id:u.unit_id,unit_name:u.unit_name||u.unit_id,error:err.message||String(err)};
          this.unitLoadWarnings.push(warning);
          this.skippedUnits.push(u.unit_id);
          console.warn('[MathWeaknessEngine] unit load skipped:',warning);
        }
      }
      this.unitById=byId(this.units,'unit_id');
      this.conceptById=byId([...(conceptPack.concepts||[]),...(conceptPack.future_target_concepts||[])],'concept_id');
      this.problemTypeById=byId(this.allProblemTypes,'problem_type_id');
      this.remediationByConcept=byId(this.allRemediation,'concept_id');
      await this._loadGlobalLogic();
      await this._loadAlgebraMasterMatcher();
      this.loaded=true;
      return this;
    }

    async _loadAlgebraMasterMatcher(){
      this.algebraMasterMatcher=null;
      this.algebraMasterMatcherError=null;
      const cfg=this.index&&this.index.algebra_master_matching;
      if(!cfg||!global.AlgebraMasterMatcher) return;
      try{
        this.algebraMasterMatcher=new global.AlgebraMasterMatcher(this);
        await this.algebraMasterMatcher.load(cfg.index);
      }catch(err){
        this.algebraMasterMatcherError=err.message;
        console.warn('[MathWeaknessEngine] algebra master matcher load failed:',err);
      }
    }
    classifyAlgebraProblem(extracted){
      if(!this.algebraMasterMatcher) return {status:'blocked',confidence:0,teacher_review_required:true,student_safe:false,error:this.algebraMasterMatcherError||'algebra master matcher unavailable'};
      return this.algebraMasterMatcher.classify(extracted);
    }
    sanitizeStudentDiagnosis(result){
      return this.algebraMasterMatcher?this.algebraMasterMatcher.sanitizeStudentResult(result):result;
    }
    async _loadGlobalLogic(){
      const gl=this.index&&this.index.global_logic;
      this.globalLogic={raw:gl||null};
      this.problemTypeInstructionById={};
      this.studentActionTemplates=[];
      this.parentFeedbackTemplates=[];
      this.futureLearningUnits=[];
      this.futureLearningByUnitId={};
      this.futureExtensionRoutes=[];
      this.futureExtensionByUnitId={};
      this.backtrackRoutes=[];
      this.globalRemediationRoutes=[];
      this.crossUnitEdges=[];
      this.weaknessScoringRules=null;
      this.diagnosisOutputSchema=null;
      this.globalDiagnosisRules=null;
      this.studentSolutionBehaviorPatterns=[];
      this.studentSolutionBehaviorPatternById={};
      this.studentResponseAggregationRules=null;
      this.studentProfileInferenceRules=null;
      this.studentAnalysisOutputSchema=null;
      this.unitSolutionRoutines=[];
      this.unitSolutionRoutineById={};
      this.studentProfileFeedbackTemplates=[];
      this.studentProfileFeedbackById={};
      if(!gl){this.globalLogicLoaded=false; return;}
      try{
        const display=gl.display||{}, routes=gl.routes||{}, diagnosis=gl.diagnosis||{}, relations=gl.relations||{}, remediation=gl.remediation||{};
        const [instructionManifest, actionPack, parentPack, futurePack, backtrackPack, futureRoutePack, crossPack, globalRulePack, scoringPack, schemaPack, globalRemediationPack, behaviorPack, aggregationPack, inferencePack, behaviorSchemaPack, routinePack, profileFeedbackPack]=await Promise.all([
          this._optionalJson(display.problem_type_instruction_map),
          this._optionalJson(display.student_action_templates),
          this._optionalJson(display.parent_feedback_templates),
          this._optionalJson(display.future_learning_map),
          this._optionalJson(routes.backtrack_routes),
          this._optionalJson(routes.future_extension_routes),
          this._optionalJson(relations.cross_unit_edges),
          this._optionalJson(diagnosis.global_diagnosis_rules),
          this._optionalJson(diagnosis.weakness_scoring_rules),
          this._optionalJson(diagnosis.diagnosis_output_schema),
          this._optionalJson(remediation.global_remediation_routes),
          this._optionalJson(diagnosis.student_solution_behavior_patterns),
          this._optionalJson(diagnosis.student_response_aggregation_rules),
          this._optionalJson(diagnosis.student_profile_inference_rules),
          this._optionalJson(diagnosis.student_analysis_output_schema),
          this._optionalJson(display.unit_solution_routines),
          this._optionalJson(display.student_profile_feedback_templates)
        ]);
        this.problemTypeInstructionManifest=instructionManifest;
        let instructionList=[];
        const splitParts=(display.problem_type_instruction_map_parts||((instructionManifest&&instructionManifest.parts)||[]).map(p=>p.path));
        if((display.problem_type_instruction_map_split_mode||instructionManifest&&instructionManifest.split_mode) && splitParts.length){
          const parts=await Promise.all(splitParts.map(p=>this._optionalJson(p)));
          parts.forEach(part=>{instructionList.push(...listOf(part,'instructions'));});
        }else{
          instructionList=listOf(instructionManifest,'instructions');
        }
        this.problemTypeInstructions=instructionList;
        this.problemTypeInstructionById=byId(instructionList,'problem_type_id');
        this.studentActionTemplates=listOf(actionPack,'templates');
        this.parentFeedbackTemplates=listOf(parentPack,'templates');
        this.futureLearningUnits=listOf(futurePack,'units');
        this.futureLearningByUnitId=byId(this.futureLearningUnits,'unit_id');
        this.futureExtensionRoutes=listOf(futureRoutePack,'routes');
        this.futureExtensionRoutes.forEach(r=>{if(r.source_unit_id)this.futureExtensionByUnitId[r.source_unit_id]=r;});
        this.backtrackRoutes=listOf(backtrackPack,'routes');
        this.globalRemediationRoutes=listOf(globalRemediationPack,'routes');
        this.crossUnitEdges=listOf(crossPack,'edges');
        this.globalDiagnosisRules=globalRulePack;
        this.weaknessScoringRules=scoringPack;
        this.diagnosisOutputSchema=schemaPack;
        this.studentSolutionBehaviorPatterns=listOf(behaviorPack,'patterns');
        this.studentSolutionBehaviorPatternById=byId(this.studentSolutionBehaviorPatterns,'pattern_id');
        this.studentResponseAggregationRules=aggregationPack;
        this.studentProfileInferenceRules=inferencePack;
        this.studentAnalysisOutputSchema=behaviorSchemaPack;
        this.unitSolutionRoutines=listOf(routinePack,'units');
        this.unitSolutionRoutines.forEach(u=>{if(u.unit_id)this.unitSolutionRoutineById[u.unit_id]=u; (u.aliases||[]).forEach(a=>{this.unitSolutionRoutineById[a]=u;});});
        this.studentProfileFeedbackTemplates=listOf(profileFeedbackPack,'templates');
        this.studentProfileFeedbackById=byId(this.studentProfileFeedbackTemplates,'pattern_id');
        this.globalLogicLoaded=true;
      }catch(err){
        this.globalLogicLoaded=false;
        this.globalLogicError=err.message;
        console.warn('[MathWeaknessEngine] global logic load failed:',err);
      }
    }
    _normalizeAttempts(input){
      const attempts=Array.isArray(input)?input:(input&&Array.isArray(input.attempts)?input.attempts:[]);
      return attempts.map((a,i)=>{
        const response_status=responseStatusOf(a);
        const hasCorrect=(a.correct!==undefined||a.is_correct!==undefined||a.isCorrect!==undefined||a.result!==undefined);
        const correct=response_status==='CORRECT_COMPLETE'?true:response_status==='WRONG_COMPLETE'||response_status==='PARTIAL_STOP'||response_status==='BLANK_UNKNOWN'?false:(hasCorrect?isCorrect(a):false);
        return {...a,question_no:a.question_no||a.no||a.number||(i+1),response_status,correct};
      });
    }
    _difficultyOf(attempt,pt){return attempt.difficulty||pt.default_difficulty||'core';}
    _tagsFor(attempt,pt,instruction){return uniq([...(pt.error_tags||[]),...(attempt.observed_error_tags||[]),...(attempt.error_tags||[]),...(instruction&&instruction.error_tags||[])]);}
    _findBacktrackRoute(instruction,tags){
      const templateId=instruction&&instruction.matched_template_id;
      return this.backtrackRoutes.find(r=>
        (templateId&&overlap([templateId],r.trigger_template_ids_any||[])) || overlap(tags,r.trigger_error_tags_any||[])
      )||null;
    }
    _findGlobalRemediationRoute(instruction,tags,backtrackRoute){
      const routeId=backtrackRoute&&backtrackRoute.route_id;
      return this.globalRemediationRoutes.find(r=>
        (routeId&&r.linked_backtrack_route_id===routeId) || overlap(tags,r.trigger_error_tags_any||[])
      )||null;
    }
    _severityFor(attempt,pt,route){
      const diff=this._difficultyOf(attempt,pt);
      const multiplier=(this.weaknessScoringRules&&this.weaknessScoringRules.difficulty_multiplier)||{basic:1.0,core:0.85,advanced:0.7,high:0.6};
      const depth=(route&&route.backtrack_steps||[]).length;
      const observed=(attempt.observed_error_tags||attempt.error_tags||[]).length;
      const raw=0.28+(multiplier[diff]||0.75)*0.25+Math.min(depth,4)*0.08+Math.min(observed,4)*0.03;
      const score=clamp01(raw);
      const bands=(this.weaknessScoringRules&&this.weaknessScoringRules.severity_bands)||DEFAULT_SEVERITY_BANDS;
      let band=bands.find(b=>{
        if(b.range){const [lo,hi]=String(b.range).split('-').map(Number); return score>=lo&&score<=hi;}
        return score>=(b.min||0)&&score<=(b.max||1);
      })||bands[bands.length-1];
      return {score:Number(score.toFixed(2)),label:band.label,action:band.action};
    }
    getProblemInstruction(problemTypeId){
      return this.problemTypeInstructionById[problemTypeId]||null;
    }
    getWrongAnswerDiagnosis(attempt){
      if(!this.loaded) throw new Error('engine not loaded');
      const pt=this.problemTypeById[attempt.problem_type_id];
      if(!pt) return {problem_type_id:attempt.problem_type_id,missing:true};
      const instruction=this.getProblemInstruction(pt.problem_type_id);
      const tags=this._tagsFor(attempt,pt,instruction);
      const backtrackRoute=this._findBacktrackRoute(instruction,tags);
      const remediationRoute=this._findGlobalRemediationRoute(instruction,tags,backtrackRoute);
      const severity=this._severityFor(attempt,pt,backtrackRoute);
      return stripUndefined({
        question_no:attempt.question_no,
        problem_type_id:pt.problem_type_id,
        type_name:pt.type_name,
        visible_path:instruction&&instruction.visible_path,
        problem_nature:instruction&&instruction.problem_nature,
        required_thinking:instruction&&instruction.required_thinking,
        must_write_steps:instruction&&instruction.must_write_steps,
        common_wrong_actions:instruction&&instruction.common_wrong_actions,
        error_checkpoints:instruction&&instruction.error_checkpoints,
        student_command:instruction&&instruction.student_command,
        teacher_note:instruction&&instruction.teacher_note,
        parent_message:instruction&&instruction.parent_message,
        matched_template_id:instruction&&instruction.matched_template_id,
        backtrack_route:backtrackRoute,
        global_remediation_route:remediationRoute,
        severity
      });
    }
    getLearningConnection(unitId){
      const unit=this.unitById[unitId]||{};
      const futureMap=this.futureLearningByUnitId[unitId]||null;
      const futureRoute=this.futureExtensionByUnitId[unitId]||null;
      if(!futureMap&&!futureRoute&&!unit.unit_id) return null;
      return stripUndefined({
        unit_id:unitId,
        unit_name:(futureMap&&futureMap.unit_name)||unit.unit_name,
        grade:(futureMap&&futureMap.grade)||unit.grade,
        course:(futureMap&&futureMap.course)||unit.course,
        current_learning_action:futureMap&&futureMap.current_learning_action,
        current_must_do:futureMap&&futureMap.current_must_do,
        why_it_matters_now:futureMap&&futureMap.why_it_matters_now,
        future_routes:futureRoute&&futureRoute.future_routes,
        route_id:(futureRoute&&futureRoute.route_id)||(futureMap&&futureMap.route_id),
        coverage_status:futureMap&&futureMap.coverage_status
      });
    }
    _processFlag(attempt,key){
      const pf=attempt&& (attempt.process_flags||attempt.process_stage_status||attempt.process||{});
      const aliases={
        recognized:['recognized','recognize','type_recognized'],
        start_action:['start_action','started_correctly','first_action_correct'],
        condition_written:['condition_written','condition_checked','wrote_condition'],
        transformation_correct:['transformation_correct','transform_correct','converted_correctly'],
        calculation_complete:['calculation_complete','calculation_finished','completed_calculation'],
        returned_to_original_variable:['returned_to_original_variable','returned_to_x','variable_returned'],
        verification_done:['verification_done','checked_answer','verified']
      };
      for(const k of (aliases[key]||[key])){const v=boolOrNull(pf&&pf[k]); if(v!==null)return v; const direct=boolOrNull(attempt&&attempt[k]); if(direct!==null)return direct;}
      return null;
    }
    _errorCount(attempts,patterns){
      const ps=(patterns||[]).map(norm);
      return attempts.reduce((sum,a)=>sum+(a.observed_error_tags||a.error_tags||[]).some(t=>ps.some(p=>norm(t).includes(p)))?1:0,0);
    }
    _groupAccuracy(attempts,key){
      const groups={};
      attempts.forEach(a=>{
        const k=norm(a&&a[key]); if(!k||a.response_status==='BLANK_UNKNOWN'||a.response_status==='UNKNOWN'||a.response_status==='PARTIAL_STOP')return;
        if(!groups[k])groups[k]={total:0,correct:0}; groups[k].total++; if(a.correct)groups[k].correct++;
      });
      Object.keys(groups).forEach(k=>groups[k].accuracy=ratio(groups[k].correct,groups[k].total));
      return groups;
    }
    _recommendedRoutines(unitIds,profiles){
      const ids=new Set((profiles||[]).map(p=>p.pattern_id));
      const out=[];
      uniq(unitIds||[]).forEach(uid=>{
        const unit=this.unitSolutionRoutineById[uid]; if(!unit)return;
        const matched=(unit.routines||[]).filter(r=>!r.linked_profiles||!r.linked_profiles.length||(r.linked_profiles||[]).some(x=>ids.has(x)));
        (matched.length?matched:(unit.routines||[])).slice(0,4).forEach(r=>out.push({unit_id:uid,unit_name:unit.unit_name,routine_id:r.routine_id,visible_trigger:r.visible_trigger,steps:r.steps}));
      });
      return out.slice(0,6);
    }
    analyzeStudentBehavior(input,normalizedAttempts){
      const attempts=normalizedAttempts||this._normalizeAttempts(input);
      const supplied=(input&& (input.response_summary||input.student_response_summary))||{};
      const statusCounts={CORRECT_COMPLETE:0,WRONG_COMPLETE:0,PARTIAL_STOP:0,BLANK_UNKNOWN:0,ANSWER_ONLY:0,UNKNOWN:0};
      attempts.forEach(a=>{statusCounts[a.response_status]=(statusCounts[a.response_status]||0)+1;});
      const pick=(key,status)=>num(supplied[key],statusCounts[status]);
      const correctCount=pick('correct_complete_count','CORRECT_COMPLETE');
      const wrongCount=pick('wrong_complete_count','WRONG_COMPLETE');
      const partialCount=pick('partial_stop_count','PARTIAL_STOP');
      const blankCount=pick('blank_unknown_count','BLANK_UNKNOWN');
      const answerOnlyCount=pick('answer_only_count','ANSWER_ONLY');
      const unknownCount=pick('unknown_count','UNKNOWN');
      const reportedCount=correctCount+wrongCount+partialCount+blankCount+answerOnlyCount+unknownCount;
      const total=Math.max(num(input&&input.total_question_count,0),num(supplied.total_question_count,0),reportedCount,attempts.length);
      const unreportedCount=Math.max(0,total-reportedCount);
      const effectiveUnknownCount=unknownCount+unreportedCount;
      const attempted=correctCount+wrongCount+partialCount+answerOnlyCount;
      const completed=correctCount+wrongCount;
      const coverageDeclared=Boolean(num(input&&input.total_question_count,0)||num(supplied.total_question_count,0)||attempts.some(a=>['CORRECT_COMPLETE','PARTIAL_STOP','BLANK_UNKNOWN','ANSWER_ONLY'].includes(a.response_status)));
      const hasCoverageEvidence=coverageDeclared&&total>0&&unreportedCount===0;
      const flagKeys=['recognized','start_action','condition_written','transformation_correct','calculation_complete','returned_to_original_variable','verification_done'];
      const flagStats={};
      flagKeys.forEach(k=>flagStats[k]={observed:0,yes:0,no:0});
      attempts.forEach(a=>flagKeys.forEach(k=>{const v=this._processFlag(a,k); if(v!==null){flagStats[k].observed++; if(v)flagStats[k].yes++; else flagStats[k].no++;}}));
      const variantGroups=this._groupAccuracy(attempts,'variant_level');
      const basicVals=['basic','core'].map(k=>variantGroups[k]).filter(Boolean);
      const variantVals=['standard','variant','advanced','complex','challenge'].map(k=>variantGroups[k]).filter(Boolean);
      const avg=g=>g.length?g.reduce((s,x)=>s+x.accuracy,0)/g.length:0;
      const basicAcc=avg(basicVals), variantAcc=avg(variantVals);
      const basicVariantGap=(basicVals.length&&variantVals.length)?Math.max(0,basicAcc-variantAcc):0;
      const repGroups=this._groupAccuracy(attempts,'representation_type');
      const repAcc=Object.values(repGroups).filter(g=>g.total>0).map(g=>g.accuracy);
      const representationGap=repAcc.length>=2?Math.max(...repAcc)-Math.min(...repAcc):0;
      const complexAttempts=attempts.filter(a=>num(a.condition_count,0)>=3);
      const complexFail=complexAttempts.filter(a=>['BLANK_UNKNOWN','PARTIAL_STOP','WRONG_COMPLETE'].includes(a.response_status)).length;
      const metrics={
        attempt_rate:Number(ratio(attempted,total).toFixed(3)),
        attempted_accuracy:Number(ratio(correctCount,completed).toFixed(3)),
        overall_resolution_rate:Number(ratio(correctCount,total).toFixed(3)),
        blank_rate:Number(ratio(blankCount,total).toFixed(3)),
        partial_stop_rate:Number(ratio(partialCount,total).toFixed(3)),
        answer_only_rate:Number(ratio(answerOnlyCount,total).toFixed(3)),
        process_completion_rate:Number(ratio(flagStats.calculation_complete.yes,flagStats.calculation_complete.observed).toFixed(3)),
        return_rate:Number(ratio(flagStats.returned_to_original_variable.yes,flagStats.returned_to_original_variable.observed).toFixed(3)),
        verification_rate:Number(ratio(flagStats.verification_done.yes,flagStats.verification_done.observed).toFixed(3)),
        start_action_failure_rate:Number(ratio(flagStats.start_action.no,flagStats.start_action.observed).toFixed(3)),
        condition_failure_rate:Number(ratio(flagStats.condition_written.no,flagStats.condition_written.observed).toFixed(3)),
        basic_variant_gap:Number(basicVariantGap.toFixed(3)),
        representation_gap:Number(representationGap.toFixed(3)),
        complex_condition_failure_rate:Number(ratio(complexFail,complexAttempts.length).toFixed(3))
      };
      const errors={
        surface_pattern:this._errorCount(attempts,['surface_pattern','겉모양','pattern_matching']),
        transfer_failure:this._errorCount(attempts,['transfer_failure','전이','representation_gap']),
        variable_role:this._errorCount(attempts,['variable_role','치환변수','원래 변수','return_to_original']),
        condition:this._errorCount(attempts,['condition_missing','진수 조건','t>0','base_condition']),
        verification:this._errorCount(attempts,['verification_missing','검산','final_check']),
        multi_condition:this._errorCount(attempts,['multi_condition','복합 조건','condition_overload'])
      };
      const candidates=[];
      const add=(id,score,evidence)=>{const base=this.studentSolutionBehaviorPatternById[id]||{pattern_id:id,label:id,student_label:id,primary_direction:''}; const fb=this.studentProfileFeedbackById[id]||{}; candidates.push({...base,...fb,confidence:Number(clamp01(score).toFixed(2)),evidence:evidence.filter(Boolean)});};
      if(hasCoverageEvidence&&total>=8&&metrics.attempted_accuracy>=0.70&&metrics.attempt_rate<=0.60)add('HIGH_ACCURACY_LOW_COVERAGE',0.82,[`시도 문항 정답률 ${Math.round(metrics.attempted_accuracy*100)}%`,`전체 시도율 ${Math.round(metrics.attempt_rate*100)}%`]);
      if(hasCoverageEvidence&&total>=8&&((metrics.blank_rate+metrics.partial_stop_rate)>=0.45||metrics.start_action_failure_rate>=0.45))add('START_PROCEDURE_ABSENT',0.80,[`빈칸·중단 비율 ${Math.round((metrics.blank_rate+metrics.partial_stop_rate)*100)}%`,metrics.start_action_failure_rate?`첫 행동 실패율 ${Math.round(metrics.start_action_failure_rate*100)}%`:null]);
      if(hasCoverageEvidence&&total>=8&&metrics.attempted_accuracy>=0.70&&metrics.attempt_rate<=0.65&&(metrics.basic_variant_gap>=0.30||metrics.representation_gap>=0.35||errors.surface_pattern>=2||errors.transfer_failure>=2))add('FRAGMENTED_RECALL_DEPENDENCE',0.88,[`시도 정답률과 전체 해결률 차이 ${Math.round((metrics.attempted_accuracy-metrics.overall_resolution_rate)*100)}%p`,metrics.basic_variant_gap?`기본형-변형형 격차 ${Math.round(metrics.basic_variant_gap*100)}%p`:null,metrics.representation_gap?`표현별 격차 ${Math.round(metrics.representation_gap*100)}%p`:null]);
      if(metrics.basic_variant_gap>=0.30||errors.surface_pattern>=2)add('SURFACE_PATTERN_MATCHING',0.78,[metrics.basic_variant_gap?`기본형-변형형 격차 ${Math.round(metrics.basic_variant_gap*100)}%p`:null,errors.surface_pattern?`겉모양 의존 오류 ${errors.surface_pattern}회`:null]);
      if(metrics.representation_gap>=0.35||errors.transfer_failure>=2)add('TRANSFER_FAILURE',0.78,[metrics.representation_gap?`그래프·방정식·부등식 해결률 격차 ${Math.round(metrics.representation_gap*100)}%p`:null,errors.transfer_failure?`전이 실패 신호 ${errors.transfer_failure}회`:null]);
      if(metrics.partial_stop_rate>=0.12||flagStats.calculation_complete.no>=2)add('PROCEDURE_INCOMPLETE',0.74,[`풀이 중단 ${partialCount}문항`,flagStats.calculation_complete.no?`계산 미완결 ${flagStats.calculation_complete.no}회`:null]);
      if(flagStats.returned_to_original_variable.no>=2||errors.variable_role>=1)add('VARIABLE_ROLE_CONFUSION',0.82,[flagStats.returned_to_original_variable.no?`원래 변수 복귀 실패 ${flagStats.returned_to_original_variable.no}회`:null,errors.variable_role?`변수 역할 혼동 신호 ${errors.variable_role}회`:null]);
      if(metrics.condition_failure_rate>=0.30||errors.condition>=2)add('CONDITION_CHECK_MISSING',0.76,[metrics.condition_failure_rate?`조건 확인 실패율 ${Math.round(metrics.condition_failure_rate*100)}%`:null,errors.condition?`조건 누락 신호 ${errors.condition}회`:null]);
      if((flagStats.verification_done.observed>=3&&metrics.verification_rate<=0.35)||errors.verification>=2)add('FINAL_VERIFICATION_MISSING',0.70,[flagStats.verification_done.observed?`검산 수행률 ${Math.round(metrics.verification_rate*100)}%`:null,errors.verification?`검산 누락 신호 ${errors.verification}회`:null]);
      if((complexAttempts.length>=3&&metrics.complex_condition_failure_rate>=0.60)||errors.multi_condition>=2)add('MULTI_CONDITION_OVERLOAD',0.76,[complexAttempts.length?`복합 조건 문항 실패율 ${Math.round(metrics.complex_condition_failure_rate*100)}%`:null,errors.multi_condition?`복합 조건 과부하 신호 ${errors.multi_condition}회`:null]);
      const priority=(this.studentProfileInferenceRules&&this.studentProfileInferenceRules.priority_order)||[];
      candidates.sort((a,b)=>b.confidence-a.confidence||(priority.indexOf(a.pattern_id)-priority.indexOf(b.pattern_id)));
      const profiles=candidates.filter((p,i,arr)=>arr.findIndex(x=>x.pattern_id===p.pattern_id)===i).slice(0,5);
      const ptUnits=attempts.map(a=>{const pt=this.problemTypeById[a.problem_type_id]; return (pt&&pt.unit_id)||a.unit_id;}).filter(Boolean);
      const unitIds=uniq([...(input&&input.unit_id?[input.unit_id]:[]),...ptUnits]);
      const recommendedRoutines=this._recommendedRoutines(unitIds,profiles);
      const strengths=[];
      if(metrics.attempted_accuracy>=0.70&&completed>=3)strengths.push(`시도해 끝까지 푼 문항의 정답률은 ${Math.round(metrics.attempted_accuracy*100)}%입니다.`);
      if(correctCount>0)strengths.push(`정답까지 완결한 문항이 ${correctCount}개 있습니다.`);
      if(!strengths.length)strengths.push('현재 자료에서는 안정적으로 반복되는 강점을 더 확인해야 합니다.');
      const blockers=profiles.slice(0,3).map(p=>p.student_message||p.student_label||p.label);
      if(!blockers.length){if(blankCount>0)blockers.push('빈칸 문항에서 무엇부터 해야 하는지 확인이 필요합니다.'); else if(wrongCount>0)blockers.push('오답이 발생한 풀이 단계를 문항별로 확인해야 합니다.'); else blockers.push('현재 자료만으로 반복되는 풀이 습관을 확정하기 어렵습니다.');}
      const main=profiles[0];
      const oneLine=main?(main.student_message||main.student_label||main.label):(hasCoverageEvidence?'반복되는 풀이 습관을 더 확인해야 합니다.':'전체 문항과 빈칸 정보가 없어 풀이 범위 성향은 판정 보류입니다.');
      const training=uniq(profiles.flatMap(p=>p.training_sequence||[]).concat(profiles.map(p=>p.teacher_direction||p.primary_direction).filter(Boolean))).slice(0,6);
      const unknownRate=ratio(effectiveUnknownCount,total);
      const confidence=Number(clamp01((total>=20?0.9:total>=8?0.75:0.5)-(unknownRate>0.3?0.2:0)-(hasCoverageEvidence?0:0.18)).toFixed(2));
      const limitations=[];
      if(unreportedCount>0)limitations.push(`전체 문항 중 response_status가 기록되지 않은 문항이 ${unreportedCount}개 있어 시도율·기억 의존형 판정을 보류합니다.`);
      else if(!hasCoverageEvidence)limitations.push('오답 문항만 입력된 경우 시도율·기억 의존형 판정은 보류됩니다.');
      return {
        evidence_status:{coverage_available:hasCoverageEvidence,total_question_count:total,reported_question_count:reportedCount,unreported_question_count:unreportedCount,unknown_rate:Number(unknownRate.toFixed(3)),confidence,limitations},
        response_summary:{total_question_count:total,correct_complete_count:correctCount,wrong_complete_count:wrongCount,partial_stop_count:partialCount,blank_unknown_count:blankCount,answer_only_count:answerOnlyCount,unknown_count:effectiveUnknownCount,unreported_count:unreportedCount,attempted_count:attempted},
        metrics,profiles,
        student_view:{one_line_diagnosis:oneLine,strengths,blockers,first_rules:recommendedRoutines.slice(0,3).map(r=>`${r.visible_trigger}: ${(r.steps||[]).join(' → ')}`)},
        teacher_view:{training_direction:training,evidence_notes:profiles.flatMap(p=>p.evidence||[]).slice(0,8),scoring_note:'정답률과 전체 시도율을 분리하고 빈칸·중단을 독립 반응으로 처리함'},
        recommended_routines:recommendedRoutines
      };
    }

    diagnose(input){
      if(!this.loaded) throw new Error('engine not loaded');
      const attempts=this._normalizeAttempts(input);
      const conceptScores={}; const directStats={}; const tagStats={}; const missing=[];
      const addScore=(cid,score,kind,source)=>{
        if(!conceptScores[cid]) conceptScores[cid]={concept_id:cid,score:0,direct:0,prerequisite:0,evidence:[]};
        conceptScores[cid].score+=score; conceptScores[cid][kind]=(conceptScores[cid][kind]||0)+score; conceptScores[cid].evidence.push(source);
      };
      attempts.forEach(a=>{
        const pt=this.problemTypeById[a.problem_type_id];
        if(!pt){missing.push(a); return;}
        const correct=a.correct;
        const diff=this._difficultyOf(a,pt);
        const w=DIFFICULTY_WEIGHT[diff]||1;
        const instruction=this.getProblemInstruction(pt.problem_type_id);
        const tags=this._tagsFor(a,pt,instruction);
        tags.forEach(t=>{if(!tagStats[t]) tagStats[t]={tag:t,total:0,wrong:0}; tagStats[t].total++; if(!correct) tagStats[t].wrong++;});
        (pt.concept_ids||[]).forEach(cid=>{if(!directStats[cid]) directStats[cid]={concept_id:cid,total:0,wrong:0}; directStats[cid].total++; if(!correct) directStats[cid].wrong++;});
        if(!correct){
          (pt.concept_ids||[]).forEach(cid=>addScore(cid,10*w,'direct',{question_no:a.question_no,problem_type_id:pt.problem_type_id,type_name:pt.type_name,reason:'direct_wrong'}));
          this.allEdges.filter(e=>(pt.concept_ids||[]).includes(e.to_concept_id)).forEach(e=>{
            addScore(e.from_concept_id,10*w*(e.weight||0.5)*0.55,'prerequisite',{question_no:a.question_no,from:e.from_concept_id,to:e.to_concept_id,reason:e.reason});
          });
        }
      });
      const conceptResults=Object.values(conceptScores).sort((a,b)=>b.score-a.score).map(x=>{
        const c=this.conceptById[x.concept_id]||{concept_name:x.concept_id,unit_name:''};
        return {...x,concept_name:c.concept_name,grade:c.grade,unit_name:c.unit_name,unit_id:c.unit_id,strand:c.strand,remediation:this.remediationByConcept[x.concept_id]||null};
      });
      const triggeredRules=[];
      for(const rule of this.allRules){
        const tags=(rule.trigger&&rule.trigger.error_tags_any)||[];
        const wrong=tags.reduce((acc,t)=>acc+((tagStats[t]||{}).wrong||0),0);
        const lowWrong=attempts.filter(a=>{
          const pt=this.problemTypeById[a.problem_type_id]; if(!pt) return false;
          const bad=!a.correct;
          return bad&&(a.difficulty==='basic'||pt.default_difficulty==='basic')&&this._tagsFor(a,pt,this.getProblemInstruction(pt.problem_type_id)).some(t=>tags.includes(t));
        }).length;
        if(wrong>=(rule.trigger&&rule.trigger.wrong_min||999)&&lowWrong>=(rule.trigger&&rule.trigger.low_difficulty_wrong_min||0)) triggeredRules.push({...rule,wrong_count:wrong,low_difficulty_wrong_count:lowWrong});
      }
      const topIds=new Set(conceptResults.slice(0,12).map(c=>c.concept_id));
      const crossGrade=this.allEdges.filter(e=>(e.scope==='cross_grade'||e.scope==='cross_unit')&&topIds.has(e.from_concept_id)).map(e=>({
        from:e.from_concept_id,from_name:(this.conceptById[e.from_concept_id]||{}).concept_name,to:e.to_concept_id,to_name:(this.conceptById[e.to_concept_id]||{}).concept_name,reason:e.reason,weight:e.weight,scope:e.scope
      }));
      const wrongAnswerDiagnoses=attempts.filter(a=>!a.correct).map(a=>this.getWrongAnswerDiagnosis(a)).filter(x=>!x.missing);
      const attemptedUnitIds=uniq(attempts.map(a=>{const pt=this.problemTypeById[a.problem_type_id]; return pt&&pt.unit_id;}));
      const weakUnitIds=uniq(conceptResults.slice(0,8).map(c=>c.unit_id));
      const learningConnections=uniq([...attemptedUnitIds,...weakUnitIds]).map(uid=>this.getLearningConnection(uid)).filter(Boolean);
      const unitCounts={}; attempts.forEach(a=>{const pt=this.problemTypeById[a.problem_type_id]; const uid=(pt&&pt.unit_id)||a.unit_id; if(uid)unitCounts[uid]=(unitCounts[uid]||0)+1;});
      const topUnits=Object.keys(unitCounts).sort((a,b)=>unitCounts[b]-unitCounts[a]).slice(0,5).map(uid=>({unit_id:uid,unit_name:(this.unitById[uid]||{}).unit_name||uid,count:unitCounts[uid]}));
      const studentBehaviorAnalysis=this.analyzeStudentBehavior(input,attempts);
      return {
        summary:{attempt_count:attempts.length,wrong_count:attempts.filter(a=>!a.correct&&a.response_status!=='BLANK_UNKNOWN'&&a.response_status!=='UNKNOWN').length,blank_count:attempts.filter(a=>a.response_status==='BLANK_UNKNOWN').length,partial_stop_count:attempts.filter(a=>a.response_status==='PARTIAL_STOP').length,answer_only_count:attempts.filter(a=>a.response_status==='ANSWER_ONLY').length,missing_type_count:missing.length,loaded_unit_count:this.units.length,declared_unit_count:(this.declaredUnits||this.units||[]).length,skipped_unit_count:(this.skippedUnits||[]).length},
        unit_load_status:{declared_count:(this.declaredUnits||this.units||[]).length,loaded_count:this.units.length,skipped_units:[...(this.skippedUnits||[])],warnings:[...(this.unitLoadWarnings||[])]},
        global_logic_status:{loaded:this.globalLogicLoaded,error:this.globalLogicError,instruction_count:Object.keys(this.problemTypeInstructionById||{}).length,split_mode:!!(this.problemTypeInstructionManifest&&this.problemTypeInstructionManifest.split_mode),part_count:(this.problemTypeInstructionManifest&&this.problemTypeInstructionManifest.part_count)||0},
        top_concepts:conceptResults.slice(0,12),
        top_units:topUnits,
        student_behavior_analysis:studentBehaviorAnalysis,
        wrong_answer_diagnoses:wrongAnswerDiagnoses,
        learning_connections:learningConnections,
        triggered_rules:triggeredRules,
        cross_grade_risks:crossGrade,
        tag_stats:Object.values(tagStats).sort((a,b)=>b.wrong-a.wrong),
        missing
      };
    }
    diagnoseWithGuidance(input){return this.diagnose(input);}
  }
  global.MathWeaknessEngine=MathWeaknessEngine;
})(window);
