(function(global){
  function norm(v){return String(v==null?'':v).trim().toLowerCase();}
  function arr(v){if(Array.isArray(v))return v.filter(Boolean); if(v==null||v==='')return []; return String(v).split(/[|,;\s]+/).filter(Boolean);}
  function uniq(v){return Array.from(new Set(v.filter(Boolean)));}
  function tokens(v){return uniq(norm(v).replace(/[^0-9a-zA-Z가-힣_]+/g,' ').split(/\s+/).filter(x=>x.length>1));}
  function overlapScore(a,b){const A=new Set(a),B=new Set(b); if(!A.size||!B.size)return 0; let n=0; A.forEach(x=>{if(B.has(x))n++;}); return n/Math.max(1,Math.min(A.size,B.size));}
  function clamp(v){return Math.max(0,Math.min(1,v));}
  class AlgebraMasterMatcher{
    constructor(engine){this.engine=engine; this.loaded=false;}
    async load(indexPath){
      const path=indexPath||'data/algebra/algebra.master_index.v1.json';
      this.index=await this.engine._json(path);
      const p=this.index.paths;
      const [c,t,e,v,l]=await Promise.all([this.engine._json(p.concept_map),this.engine._json(p.problem_type_bank),this.engine._json(p.error_pattern_bank),this.engine._json(p.type_variant_bank),this.engine._json(p.source_item_links)]);
      this.concepts=c.concepts||[]; this.problemTypes=t.problem_types||[]; this.errors=e.error_patterns||[]; this.variants=v.variants||[]; this.sourceLinks=l.links||[];
      this.ptById={}; this.problemTypes.forEach(x=>this.ptById[x.problem_type_id]=x);
      this.variantsByType={}; this.variants.forEach(x=>(this.variantsByType[x.problem_type_id]||(this.variantsByType[x.problem_type_id]=[])).push(x));
      this.sourceEvidenceCount={}; this.sourceLinks.forEach(x=>this.sourceEvidenceCount[x.problem_type_id]=(this.sourceEvidenceCount[x.problem_type_id]||0)+1);
      this.loaded=true; return this;
    }
    classify(extracted){
      if(!this.loaded)throw new Error('algebra master matcher not loaded');
      extracted=extracted||{};
      const units=arr(extracted.engine_unit_id||extracted.unit_id);
      const concepts=arr(extracted.concept_ids);
      const errors=arr(extracted.error_tags||extracted.observed_error_tags);
      const text=[extracted.problem_text,extracted.type_hint,extracted.question_form,extracted.condition_summary,extracted.expression_summary].filter(Boolean).join(' ');
      const qtok=tokens(text);
      const candidates=this.problemTypes.map(pt=>{
        if(units.length&&units.indexOf(pt.unit_id)<0)return null;
        const c=overlapScore(concepts,arr(pt.concept_ids));
        const e=overlapScore(errors,arr(pt.error_tags));
        const k=overlapScore(qtok,tokens([pt.type_name,pt.description,(pt.error_tags||[]).join(' ')].join(' ')));
        const unit=units.length?1:0;
        const evidence=Math.min(1,(this.sourceEvidenceCount[pt.problem_type_id]||0)/8);
        // Source evidence is intentionally capped and can never define the type by itself.
        const score=clamp(c*0.42+e*0.24+k*0.26+unit*0.08+evidence*Math.min(0.08,this.index.matching_policy.source_evidence_max_weight||0.08));
        return {problem_type_id:pt.problem_type_id,type_name:pt.type_name,unit_id:pt.unit_id,concept_ids:pt.concept_ids||[],confidence:Number(score.toFixed(3)),source_evidence_count:this.sourceEvidenceCount[pt.problem_type_id]||0};
      }).filter(Boolean).sort((a,b)=>b.confidence-a.confidence).slice(0,this.index.matching_policy.candidate_limit||5);
      const top=candidates[0]||null, second=candidates[1]||null;
      let status='blocked';
      if(top){
        if(top.confidence>=(this.index.matching_policy.minimum_registered_type_confidence||0.72) && (!second||top.confidence-second.confidence>=0.05)) status='registered_type_match';
        else if(top.confidence>=(this.index.matching_policy.minimum_variant_confidence||0.58)) status='variant_match';
        else if(top.confidence>=(this.index.matching_policy.blocked_below_confidence||0.42)) status='new_item_candidate';
        else if(qtok.length||concepts.length||errors.length) status='new_type_candidate';
      }
      return {status,confidence:top?top.confidence:0,matched_problem_type_id:(status==='registered_type_match'||status==='variant_match')&&top?top.problem_type_id:null,candidates,teacher_review_required:status!=='registered_type_match',student_safe:status==='registered_type_match'||status==='variant_match',source_disclosure_policy:'hidden_from_student_output'};
    }
    sanitizeStudentResult(result){
      const blocked=['source_id','source_question_no','book_id','problem_pdf_file','solution_pdf_file','source_name','source_item_id'];
      const walk=v=>{if(Array.isArray(v))return v.map(walk); if(v&&typeof v==='object'){const o={}; Object.keys(v).forEach(k=>{if(blocked.indexOf(k)<0)o[k]=walk(v[k]);}); return o;} return v;};
      return walk(result);
    }
  }
  global.AlgebraMasterMatcher=AlgebraMasterMatcher;
})(typeof window!=='undefined'?window:globalThis);
