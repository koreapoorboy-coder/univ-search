(function(global){
  const DIFFICULTY_WEIGHT={basic:1.35, core:1.0, advanced:0.8, high:0.65};
  function byId(list,key){const m={}; (list||[]).forEach(x=>m[x[key]]=x); return m;}
  function isCorrect(a){return a.correct===true || a.correct==='O' || a.correct==='o' || a.correct===1;}
  class MathWeaknessEngine{
    constructor(basePath='.') { this.basePath=basePath.replace(/\/$/,''); this.loaded=false; }
    async _json(path){ const res=await fetch(`${this.basePath}/${path}`); if(!res.ok) throw new Error(`load failed: ${path}`); return await res.json(); }
    async load(){
      this.manifest=await this._json('manifest.json');
      this.index=await this._json(this.manifest.data_index);
      this.units=this.index.units||[];
      const conceptPack=await this._json('data/math_concepts.v1.json');
      this.concepts=conceptPack;
      this.allProblemTypes=[]; this.allEdges=[]; this.allRules=[]; this.allRemediation=[]; this.unitData={};
      for(const u of this.units){
        const [pt,ed,ru,re]=await Promise.all([this._json(u.problem_types),this._json(u.edges),this._json(u.diagnosis_rules),this._json(u.remediation)]);
        this.unitData[u.unit_id]={unit:u,problemTypes:pt,edges:ed,rules:ru,remediation:re};
        this.allProblemTypes.push(...(pt.problem_types||[]));
        this.allEdges.push(...(ed.edges||[]));
        this.allRules.push(...(ru.rules||[]));
        this.allRemediation.push(...(re.remediation||[]));
      }
      this.conceptById=byId([...(conceptPack.concepts||[]),...(conceptPack.future_target_concepts||[])],'concept_id');
      this.problemTypeById=byId(this.allProblemTypes,'problem_type_id');
      this.remediationByConcept=byId(this.allRemediation,'concept_id');
      this.loaded=true;
      return this;
    }
    diagnose(attempts){
      if(!this.loaded) throw new Error('engine not loaded');
      const conceptScores={}; const directStats={}; const tagStats={}; const missing=[];
      const addScore=(cid,score,kind,source)=>{
        if(!conceptScores[cid]) conceptScores[cid]={concept_id:cid, score:0, direct:0, prerequisite:0, evidence:[]};
        conceptScores[cid].score+=score; conceptScores[cid][kind]=(conceptScores[cid][kind]||0)+score; conceptScores[cid].evidence.push(source);
      };
      (attempts||[]).forEach(a=>{
        const pt=this.problemTypeById[a.problem_type_id];
        if(!pt){missing.push(a); return;}
        const correct = isCorrect(a);
        const diff=(a.difficulty||pt.default_difficulty||'core');
        const w=DIFFICULTY_WEIGHT[diff]||1;
        (pt.error_tags||[]).forEach(t=>{ if(!tagStats[t]) tagStats[t]={tag:t,total:0,wrong:0}; tagStats[t].total++; if(!correct) tagStats[t].wrong++; });
        (pt.concept_ids||[]).forEach(cid=>{ if(!directStats[cid]) directStats[cid]={concept_id:cid,total:0,wrong:0}; directStats[cid].total++; if(!correct) directStats[cid].wrong++; });
        if(!correct){
          (pt.concept_ids||[]).forEach(cid=> addScore(cid, 10*w, 'direct', {question_no:a.question_no, problem_type_id:pt.problem_type_id, type_name:pt.type_name, reason:'direct_wrong'}));
          this.allEdges.filter(e=>(pt.concept_ids||[]).includes(e.to_concept_id)).forEach(e=>{
            addScore(e.from_concept_id, 10*w*(e.weight||0.5)*0.55, 'prerequisite', {question_no:a.question_no, from:e.from_concept_id, to:e.to_concept_id, reason:e.reason});
          });
        }
      });
      const conceptResults=Object.values(conceptScores).sort((a,b)=>b.score-a.score).map(x=>{
        const c=this.conceptById[x.concept_id]||{concept_name:x.concept_id, unit_name:''};
        return {...x, concept_name:c.concept_name, grade:c.grade, unit_name:c.unit_name, strand:c.strand, remediation:this.remediationByConcept[x.concept_id]||null};
      });
      const triggeredRules=[];
      for(const rule of this.allRules){
        const tags=rule.trigger.error_tags_any||[];
        const wrong=tags.reduce((acc,t)=>acc+((tagStats[t]||{}).wrong||0),0);
        const lowWrong=(attempts||[]).filter(a=>{
          const pt=this.problemTypeById[a.problem_type_id]; if(!pt) return false;
          const bad=!isCorrect(a);
          return bad && (a.difficulty==='basic' || pt.default_difficulty==='basic') && (pt.error_tags||[]).some(t=>tags.includes(t));
        }).length;
        if(wrong >= (rule.trigger.wrong_min||999) && lowWrong >= (rule.trigger.low_difficulty_wrong_min||0)) triggeredRules.push({...rule, wrong_count:wrong, low_difficulty_wrong_count:lowWrong});
      }
      const topIds=new Set(conceptResults.slice(0,12).map(c=>c.concept_id));
      const crossGrade=this.allEdges.filter(e=>(e.scope==='cross_grade' || e.scope==='cross_unit') && topIds.has(e.from_concept_id)).map(e=>({
        from:e.from_concept_id, from_name:(this.conceptById[e.from_concept_id]||{}).concept_name, to:e.to_concept_id, to_name:(this.conceptById[e.to_concept_id]||{}).concept_name, reason:e.reason, weight:e.weight, scope:e.scope
      }));
      return {
        summary:{attempt_count:(attempts||[]).length, wrong_count:(attempts||[]).filter(a=>!isCorrect(a)).length, missing_type_count:missing.length, loaded_unit_count:this.units.length},
        top_concepts:conceptResults.slice(0,12),
        triggered_rules:triggeredRules,
        cross_grade_risks:crossGrade,
        tag_stats:Object.values(tagStats).sort((a,b)=>b.wrong-a.wrong),
        missing
      };
    }
  }
  global.MathWeaknessEngine=MathWeaknessEngine;
})(window);