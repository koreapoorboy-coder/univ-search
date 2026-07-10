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
      this.units=this.index.units||[];
      const conceptPack=await this._json('data/math_concepts.v1.json');
      this.concepts=conceptPack;
      this.allProblemTypes=[]; this.allEdges=[]; this.allRules=[]; this.allRemediation=[]; this.unitData={};
      for(const u of this.units){
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
      if(!gl){this.globalLogicLoaded=false; return;}
      try{
        const display=gl.display||{}, routes=gl.routes||{}, diagnosis=gl.diagnosis||{}, relations=gl.relations||{}, remediation=gl.remediation||{};
        const [instructionManifest, actionPack, parentPack, futurePack, backtrackPack, futureRoutePack, crossPack, globalRulePack, scoringPack, schemaPack, globalRemediationPack]=await Promise.all([
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
          this._optionalJson(remediation.global_remediation_routes)
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
        this.globalLogicLoaded=true;
      }catch(err){
        this.globalLogicLoaded=false;
        this.globalLogicError=err.message;
        console.warn('[MathWeaknessEngine] global logic load failed:',err);
      }
    }
    _normalizeAttempts(input){
      const attempts=Array.isArray(input)?input:(input&&Array.isArray(input.attempts)?input.attempts:[]);
      return attempts.map((a,i)=>({...a,question_no:a.question_no||a.no||a.number||(i+1), correct:isCorrect(a)}));
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
      return {
        summary:{attempt_count:attempts.length,wrong_count:attempts.filter(a=>!a.correct).length,missing_type_count:missing.length,loaded_unit_count:this.units.length},
        global_logic_status:{loaded:this.globalLogicLoaded,error:this.globalLogicError,instruction_count:Object.keys(this.problemTypeInstructionById||{}).length,split_mode:!!(this.problemTypeInstructionManifest&&this.problemTypeInstructionManifest.split_mode),part_count:(this.problemTypeInstructionManifest&&this.problemTypeInstructionManifest.part_count)||0},
        top_concepts:conceptResults.slice(0,12),
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
