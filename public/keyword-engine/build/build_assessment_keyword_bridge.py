from __future__ import annotations
import json, re, pathlib, collections, datetime, hashlib, math, os, shutil, csv

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/assessment/bridge'
OUT.mkdir(parents=True, exist_ok=True)

KST = datetime.timezone(datetime.timedelta(hours=9))
NOW = datetime.datetime.now(KST).replace(microsecond=0).isoformat()

def load_json(path):
    return json.load(open(path, encoding='utf-8-sig'))

def read_jsonl(path):
    out=[]
    with open(path,encoding='utf-8') as f:
        for n,line in enumerate(f,1):
            line=line.strip()
            if not line: continue
            try: out.append(json.loads(line))
            except Exception as e: raise RuntimeError(f'bad jsonl line {n}: {e}')
    return out

def norm(s):
    s=str(s or '').lower()
    roman={'Ⅰ':'1','Ⅱ':'2','Ⅲ':'3','Ⅳ':'4','Ⅴ':'5','Ⅵ':'6'}
    for a,b in roman.items(): s=s.replace(a,b)
    return re.sub(r'[^0-9a-z가-힣]+','',s)

def top_values(records, field, limit=8):
    c=collections.Counter()
    for r in records:
        value=r.get(field)
        if isinstance(value,list):
            for x in value:
                if x: c[str(x)]+=1
        elif value not in (None,''):
            c[str(value)]+=1
    return [{'value':k,'count':v} for k,v in c.most_common(limit)]

def dist(records, field):
    c=collections.Counter()
    for r in records:
        v=r.get(field)
        if v is None or v=='': v='unknown'
        c[str(v)]+=1
    return dict(c.most_common())

def ratio_bucket(r):
    if r.get('ratio_bucket'): return r['ratio_bucket']
    w=r.get('weight')
    try: w=float(w)
    except: return 'unknown'
    if w<=10:return 'low_01_10'
    if w<=25:return 'medium_11_25'
    if w<=40:return 'high_26_40'
    if w<=60:return 'very_high_41_60'
    if w<=100:return 'full_61_100'
    return 'unknown'

def summarize(records, label=None):
    schools={r.get('school_name') for r in records if r.get('school_name')}
    sources={r.get('source_id') for r in records if r.get('source_id')}
    weights=[]
    rb=collections.Counter()
    for r in records:
        try: weights.append(float(r.get('weight')))
        except: pass
        rb[ratio_bucket(r)]+=1
    obj={
        'label': label,
        'evidence_record_count': len(records),
        'source_school_count': len(schools),
        'source_count': len(sources),
        'grade_distribution': dist(records,'grade'),
        'ratio_bucket_distribution': dict(rb.most_common()),
        'average_weight': round(sum(weights)/len(weights),2) if weights else None,
        'dominant_subjects': top_values(records,'subject_standard',10),
        'dominant_structures': top_values(records,'structure_id',8),
        'dominant_methods': top_values(records,'method_axis',8),
        'dominant_outputs': top_values(records,'output_axis',8),
        'dominant_rubric_tags': top_values(records,'rubric_axis',10),
        'dominant_report_modes': top_values(records,'report_mode',8),
        'dominant_content_axes': top_values(records,'content_axis',8),
        'dominant_topic_formulas': top_values(records,'topic_formula',5),
        'avoid_modes': top_values(records,'avoid_modes',6),
    }
    return obj

records=read_jsonl(ROOT/'data/assessment/records/assessment_tasks.v1.jsonl')
sources=load_json(ROOT/'data/assessment/sources/assessment_sources.v1.json').get('sources',[])
runtime_manifest=load_json(ROOT/'data/assessment/runtime_v2/assessment_runtime_manifest.v2.json')
report_rules=load_json(ROOT/'data/assessment/runtime_v2/assessment_report_matching_rules.v2.json')
interpreter=load_json(ROOT/'data/assessment/rules/task_interpreter_rules.v1.json')
topic_rules=load_json(ROOT/'data/assessment/rules/topic_generation_rules.v1.json')
keyword_index=load_json(ROOT/'seed/major-keyword-v30/global_keyword_index.json')
active_library=load_json(ROOT/'data/keyword_library.json')
aliases=load_json(ROOT/'data/keyword_alias.json')

# Canonical UI subjects and aliases. Matching is against actual record subject_standard.
SUBJECT_ALIASES={
 '공통국어1':['공통국어1','공통국어','국어1','국어Ⅰ','국어'],
 '공통국어2':['공통국어2','공통국어','국어2','국어Ⅱ','국어'],
 '영어':['영어','공통영어','영어1','영어Ⅰ','영어2','영어Ⅱ'],
 '공통수학1':['공통수학1','공통수학','수학1','수학Ⅰ','수학'],
 '공통수학2':['공통수학2','공통수학','수학2','수학Ⅱ','수학'],
 '대수':['대수'],
 '확률과 통계':['확률과 통계','확률과통계'],
 '미적분1':['미적분1','미적분Ⅰ','미적분'],
 '기하':['기하'],
 '통합사회1':['통합사회1','통합사회','사회'],
 '통합사회2':['통합사회2','통합사회','사회'],
 '한국사':['한국사','한국사1','한국사Ⅰ','한국사2','한국사Ⅱ'],
 '통합과학1':['통합과학1','통합과학','과학'],
 '통합과학2':['통합과학2','통합과학','과학'],
 '과학탐구실험1':['과학탐구실험1','과학탐구실험 1','과학탐구실험'],
 '과학탐구실험2':['과학탐구실험2','과학탐구실험 2','과학탐구실험'],
 '물리':['물리','물리학','물리학1','물리학Ⅰ','물리학2','물리학Ⅱ','고급물리학','고급 물리학'],
 '화학':['화학','화학1','화학Ⅰ','화학2','화학Ⅱ','고급화학','고급 화학'],
 '생명과학':['생명과학','생명과학1','생명과학Ⅰ','생명과학2','생명과학Ⅱ','고급생명과학','고급 생명과학'],
 '지구과학':['지구과학','지구과학1','지구과학Ⅰ','지구과학2','지구과학Ⅱ','고급지구과학','고급 지구과학'],
 '역학과 에너지':['역학과 에너지'],
 '전자기와 양자':['전자기와 양자'],
 '물질과 에너지':['물질과 에너지'],
 '세포와 물질대사':['세포와 물질대사'],
 '지구시스템과학':['지구시스템과학','지구시스템과학Ⅰ','지구시스템과학1'],
 '정보':['정보','정보과학','인공지능 기초','프로그래밍'],
}
SUBJECT_GROUP={
 '공통국어1':'국어','공통국어2':'국어','영어':'영어',
 '공통수학1':'수학','공통수학2':'수학','대수':'수학','확률과 통계':'수학','미적분1':'수학','기하':'수학',
 '통합사회1':'사회','통합사회2':'사회','한국사':'사회',
 '통합과학1':'과학','통합과학2':'과학','과학탐구실험1':'과학','과학탐구실험2':'과학','물리':'과학','화학':'과학','생명과학':'과학','지구과학':'과학','역학과 에너지':'과학','전자기와 양자':'과학','물질과 에너지':'과학','세포와 물질대사':'과학','지구시스템과학':'과학',
 '정보':'정보'
}

def subject_match(rec, canonical):
    n=norm(rec.get('subject_standard'))
    aliases_n={norm(x) for x in SUBJECT_ALIASES[canonical]}
    if n in aliases_n: return True
    # Broad discipline matches only for the four science roots and information.
    if canonical=='물리' and ('물리학' in n or n.startswith('물리')): return True
    if canonical=='화학' and (n.startswith('화학') or '화학실험' in n): return True
    if canonical=='생명과학' and n.startswith('생명과학'): return True
    if canonical=='지구과학' and n.startswith('지구과학'): return True
    if canonical=='정보' and (n=='정보' or n.startswith('정보과학') or n.startswith('인공지능기초')): return True
    if canonical=='기하' and n=='기하': return True
    return False

subject_routes={}
for canonical in SUBJECT_ALIASES:
    matched=[r for r in records if subject_match(r,canonical)]
    s=summarize(matched,canonical)
    s['canonical_subject_group']=SUBJECT_GROUP[canonical]
    s['matched_subject_aliases']=SUBJECT_ALIASES[canonical]
    subject_routes[canonical]=s

# Group records use UI-compatible definitions, not raw heterogeneous historical group labels.
def group_match(r,g):
    sg=str(r.get('subject_group') or '')
    subj=str(r.get('subject_standard') or '')
    if g=='국어': return sg.startswith('국어')
    if g=='영어': return sg.startswith('영어') or '영어' in subj
    if g=='수학': return sg.startswith('수학')
    if g=='사회': return sg.startswith('사회') or any(x in sg for x in ['역사','윤리'])
    if g=='과학': return sg=='과학' or sg.startswith('과학')
    if g=='정보': return '정보' in sg or any(x in subj for x in ['정보','인공지능','프로그래밍'])
    return False

group_routes={g:summarize([r for r in records if group_match(r,g)],g) for g in ['국어','영어','수학','사회','과학','정보']}

TASK_MATCHERS={
 '탐구보고서': lambda r: ('탐구보고서' in (r.get('output_axis') or []) or '연구보고서형' in (r.get('report_mode') or []) or '탐구' in str(r.get('raw_task_title') or '')),
 '실험보고서': lambda r: ('실험보고서' in (r.get('output_axis') or []) or str(r.get('structure_id') or '') in ['structure_experiment_analysis','structure_experiment_report','structure_experimental_analysis','structure_experiment_inquiry']),
 '자료조사 보고서': lambda r: (any(x in (r.get('output_axis') or []) for x in ['자료분석지','조사보고서','분석보고서']) or any(x in (r.get('method_axis') or []) for x in ['자료해석형','조사탐구형','비교분석형'])),
 '발표보고서': lambda r: ('발표자료' in (r.get('output_axis') or []) or any(x in (r.get('method_axis') or []) for x in ['구술발표형','발표형','발표설계형'])),
}
task_routes={}
for t,fn in TASK_MATCHERS.items():
    matched=[r for r in records if fn(r)]
    s=summarize(matched,t)
    s['input_task_type']=t
    task_routes[t]=s

MAJOR_GROUP_RULES={
 '기계·모빌리티·건설': {
  'recommended_subject_groups':['과학','수학','정보'],
  'preferred_methods':['프로젝트형','자료해석형','보고서작성형'],
  'preferred_outputs':['설계보고서','탐구보고서','발표자료'],
  'preferred_report_modes':['공학설계형','원리적용형','자료해석형'],
  'assessment_focus':'구조·작동 원리·조건 변화·효율·안전성을 설계 기준으로 비교'
 },
 '생명·의료·생활': {
  'recommended_subject_groups':['과학','사회','수학'],
  'preferred_methods':['실험실습형','자료해석형','조사탐구형'],
  'preferred_outputs':['실험보고서','탐구보고서','자료분석지'],
  'preferred_report_modes':['실험분석형','자료해석형','연구보고서형'],
  'assessment_focus':'생명 현상의 구조·기능·기전과 건강·의료 적용을 근거 자료로 해석'
 },
 'AI·SW·전자': {
  'recommended_subject_groups':['정보','수학','과학'],
  'preferred_methods':['프로그래밍구현형','자료해석형','프로젝트형'],
  'preferred_outputs':['프로그램','탐구보고서','발표자료'],
  'preferred_report_modes':['프로그래밍구현형','자료해석형','공학설계형'],
  'assessment_focus':'데이터·알고리즘·회로·시스템의 입력-처리-출력과 성능 차이를 분석'
 },
 '신소재·에너지·산업': {
  'recommended_subject_groups':['과학','수학','정보'],
  'preferred_methods':['비교분석형','자료해석형','프로젝트형'],
  'preferred_outputs':['탐구보고서','자료분석지','설계보고서'],
  'preferred_report_modes':['원리적용형','자료해석형','공학설계형'],
  'assessment_focus':'소재·공정·에너지 변환의 구조, 성능, 경제성, 지속가능성을 같은 기준으로 비교'
 },
 '안전·환경': {
  'recommended_subject_groups':['과학','사회','수학'],
  'preferred_methods':['자료해석형','조사탐구형','문제해결형'],
  'preferred_outputs':['자료분석지','탐구보고서','정책제안서'],
  'preferred_report_modes':['자료해석형','사회문제분석형','정책제안형'],
  'assessment_focus':'환경·안전 문제의 측정 지표, 원인, 위험도, 해결 방안을 자료로 검증'
 },
 '기타': {
  'recommended_subject_groups':['과학','수학','사회','정보','국어','영어'],
  'preferred_methods':['자료해석형','보고서작성형','조사탐구형'],
  'preferred_outputs':['탐구보고서','자료분석지','발표자료'],
  'preferred_report_modes':['자료해석형','연구보고서형','개념해석형'],
  'assessment_focus':'교과 개념과 실제 사례를 비교 기준·자료·근거 중심으로 연결'
 }
}
CLUSTER_RULES={
 'core_principles': {'label':'원리·구조','focus':'핵심 원리와 구조가 조건에 따라 어떻게 달라지는지 분석','topic_noun':'원리와 구조','evidence':'개념 비교표와 조건별 차이'},
 'materials_devices': {'label':'소재·부품','focus':'소재 또는 부품의 특성이 성능·안정성·효율에 미치는 영향 비교','topic_noun':'소재 특성과 성능','evidence':'물성·성능 비교표'},
 'data_ai_software': {'label':'데이터·AI·소프트웨어','focus':'데이터 입력, 처리 기준, 결과와 오차를 분석','topic_noun':'데이터 처리와 결과','evidence':'데이터 표·그래프·오류 사례'},
 'design_manufacturing': {'label':'설계·제작·공정','focus':'설계 조건과 공정 선택이 결과물의 성능과 효율에 미치는 영향 평가','topic_noun':'설계 조건과 공정','evidence':'설계 기준표·공정 비교'},
 'control_systems': {'label':'제어·자동화·로봇','focus':'입력-판단-제어-피드백 구조와 조건별 반응 차이 분석','topic_noun':'제어와 피드백','evidence':'시스템 흐름도·조건별 반응'},
 'safety_environment': {'label':'안전·환경·지속가능','focus':'위험·환경 지표를 기준으로 원인과 개선 효과를 검증','topic_noun':'안전성과 지속가능성','evidence':'위험도·환경성 지표'},
 'bio_medical': {'label':'생명·의료','focus':'구조와 기능의 관계, 생명 기전, 건강·의료 적용을 분석','topic_noun':'생명 기전과 적용','evidence':'기전 흐름도·사례 자료'},
 'energy_mobility_space': {'label':'에너지·모빌리티·우주','focus':'에너지 전환, 효율, 시스템 안정성과 적용 조건을 비교','topic_noun':'에너지 전환과 효율','evidence':'효율·조건 비교 자료'},
 'human_society_policy': {'label':'사회·정책·사용자','focus':'이해관계, 영향, 판단 기준과 제도적 해결 방안을 분석','topic_noun':'사회적 영향과 정책 기준','evidence':'사례·통계·정책 비교'},
 'space_architecture_landscape': {'label':'공간·건축·도시·조경','focus':'공간 구조와 사용자·환경 조건이 기능과 경험에 미치는 영향 평가','topic_noun':'공간 구조와 사용자 조건','evidence':'공간 비교도·환경 지표'},
 'other': {'label':'기타·직접검토','focus':'핵심 개념을 비교 기준과 실제 자료로 구체화','topic_noun':'핵심 개념과 적용','evidence':'사례 비교표·근거 자료'},
}

def merge_unique(*seqs):
    out=[]
    for seq in seqs:
        for x in seq or []:
            if x not in out: out.append(x)
    return out

keyword_routes={}
for keyword,meta in keyword_index.items():
    groups=meta.get('major_groups') or ['기타']
    rules=[MAJOR_GROUP_RULES.get(g,MAJOR_GROUP_RULES['기타']) for g in groups]
    cl=meta.get('primary_cluster') or 'other'
    cr=CLUSTER_RULES.get(cl,CLUSTER_RULES['other'])
    route={
        'keyword': keyword,
        'major_count': meta.get('major_count',0),
        'majors': (meta.get('majors') or [])[:12],
        'major_groups': groups,
        'primary_cluster': cl,
        'primary_cluster_label': meta.get('primary_cluster_label') or cr['label'],
        'recommended_subject_groups': merge_unique(*(r['recommended_subject_groups'] for r in rules))[:6],
        'preferred_methods': merge_unique(*(r['preferred_methods'] for r in rules))[:6],
        'preferred_outputs': merge_unique(*(r['preferred_outputs'] for r in rules))[:6],
        'preferred_report_modes': merge_unique(*(r['preferred_report_modes'] for r in rules))[:6],
        'assessment_focus': cr['focus'],
        'topic_noun': cr['topic_noun'],
        'recommended_evidence': cr['evidence'],
        'route_confidence': 'high' if meta.get('major_count',0)>=2 and cl!='other' else ('medium' if cl!='other' or meta.get('major_count',0)>=2 else 'base'),
    }
    # Active hand-authored library enrichments are retained as preferred examples.
    if keyword in active_library:
        lib=active_library[keyword]
        route['active_library']=True
        route['related_subjects']=lib.get('related_subjects',[])
        route['related_keywords']=lib.get('related_keywords',[])
        route['plan_types']=[p.get('type') for p in lib.get('plans',[]) if p.get('type')]
    keyword_routes[keyword]=route

# Search aliases include legacy aliases and normalized exact lookup.
search_aliases=dict(aliases)
for k in active_library:
    search_aliases.setdefault(k,k)

bridge={
 'version':'assessment-keyword-bridge-v1.0.0',
 'generated_at':NOW,
 'purpose':'키워드 엔진의 전공·키워드 데이터와 누적 수행평가 데이터의 과목·방법·산출물·채점요소를 연결해 실제 수행평가형 탐구 주제와 구조를 생성한다.',
 'runtime_principle':[
   '학교명은 출처 검증 레이어에만 보존하고 추천 결과에는 사용하지 않는다.',
   '입력은 교과/세부과목 + 수행평가명·안내문 + 결과물 유형 + 학과/키워드를 사용한다.',
   '키워드의 전공군·탐구클러스터와 실제 수행평가 기록의 방법·산출물·채점요소를 교차한다.',
   '주제는 대상 + 조건/변인 + 교과 개념 + 분석 방법 + 결과 방향이 보이도록 생성한다.'
 ],
 'source_baseline':{
   'school_count':len({r.get('school_name') for r in records if r.get('school_name')}),
   'record_count':len(records),
   'source_count':len(sources),
   'latest_school':runtime_manifest.get('latest_added_school'),
   'runtime_manifest_version':runtime_manifest.get('version'),
   'note':'업로드된 실제 엔진 기준. 인계문상의 59개교 예상치가 아니라 숙명여고까지 54개교 baseline이다.'
 },
 'subject_aliases':SUBJECT_ALIASES,
 'subject_routes':subject_routes,
 'subject_group_routes':group_routes,
 'task_output_routes':task_routes,
 'keyword_major_group_rules':MAJOR_GROUP_RULES,
 'keyword_cluster_rules':CLUSTER_RULES,
 'keyword_routes':keyword_routes,
 'keyword_aliases':search_aliases,
 'task_interpreter_rules':interpreter.get('rules',[]),
 'report_matching_rules':report_rules.get('items',[]),
 'topic_generation_rules':topic_rules,
}

bridge_path=OUT/'assessment_keyword_bridge.v1.json'
json.dump(bridge,open(bridge_path,'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))

# Compact manifest and audit
ids=[r.get('task_id') for r in records]
source_ids={s.get('source_id') for s in sources}
missing=[r.get('task_id') for r in records if r.get('source_id') not in source_ids]
active_covered=sum(1 for k in active_library if k in keyword_routes)
ui_subject_covered=sum(1 for k,v in subject_routes.items() if v['evidence_record_count']>0)
audit={
 'version':'assessment-keyword-connection-audit-v1.0.0',
 'generated_at':NOW,
 'baseline':bridge['source_baseline'],
 'validation':{
  'records_jsonl_total_lines':len(records),
  'school_count':len({r.get('school_name') for r in records if r.get('school_name')}),
  'source_count':len(sources),
  'duplicate_task_id_count':len(ids)-len(set(ids)),
  'missing_source_reference_count':len(missing),
  'keyword_route_count':len(keyword_routes),
  'active_keyword_library_count':len(active_library),
  'active_keyword_route_covered_count':active_covered,
  'ui_subject_route_count':len(subject_routes),
  'ui_subject_route_with_evidence_count':ui_subject_covered,
  'task_output_route_count':len(task_routes),
 },
 'largest_subject_routes':sorted([{'subject':k,'records':v['evidence_record_count'],'schools':v['source_school_count']} for k,v in subject_routes.items()],key=lambda x:x['records'],reverse=True),
 'task_route_evidence':[{'task_type':k,'records':v['evidence_record_count'],'schools':v['source_school_count']} for k,v in task_routes.items()],
 'known_baseline_gap':{
  'handoff_expected_school_count':59,
  'uploaded_engine_school_count':bridge['source_baseline']['school_count'],
  'missing_from_uploaded_engine':[name for name in ['영동고','영동일고','영파여고','오금고','위례한빛고'] if name not in {r.get('school_name') for r in records}],
  'connection_patch_behavior':'추가 학교 패치를 적용한 뒤 build/build_assessment_keyword_bridge.py를 다시 실행하면 동일 구조로 자동 재집계된다.'
 }
}
json.dump(audit,open(OUT/'assessment_keyword_connection_audit.v1.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)

manifest={
 'version':'assessment-keyword-bridge-manifest-v1.0.0',
 'generated_at':NOW,
 'files':[
  'assessment_keyword_bridge.v1.json',
  'assessment_keyword_connection_audit.v1.json',
  'assessment_keyword_connection_samples.v1.json',
  'export/keyword_assessment_routes.v1.csv',
  'export/subject_assessment_evidence.v1.csv',
  'export/task_output_evidence.v1.csv'
 ],
 'source_baseline':bridge['source_baseline'],
 'counts':audit['validation'],
 'runtime_helper':'assets/assessment_keyword_bridge_helper.js',
 'rebuild_script':'build/build_assessment_keyword_bridge.py'
}
json.dump(manifest,open(OUT/'assessment_keyword_bridge_manifest.v1.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)

# Samples are generated from the same route data, without school names.
def sample(keyword,subject,task_type,career,desc):
    kr=keyword_routes[keyword]
    sr=subject_routes[subject]
    tr=task_routes[task_type]
    method=(tr['dominant_methods'][0]['value'] if tr['dominant_methods'] else kr['preferred_methods'][0])
    output=(tr['dominant_outputs'][0]['value'] if tr['dominant_outputs'] else kr['preferred_outputs'][0])
    rubrics=[x['value'] for x in sr['dominant_rubric_tags'][:4]]
    title=f"{keyword}의 {kr['topic_noun']}를 {subject} 개념으로 분석하고 {method}으로 검증"
    return {
      'input':{'keyword':keyword,'subject':subject,'task_type':task_type,'career':career,'task_description':desc},
      'connection':{
       'recommended_topic':title,
       'assessment_focus':kr['assessment_focus'],
       'recommended_method':method,
       'recommended_output':output,
       'rubric_focus':rubrics,
       'evidence_record_count':sr['evidence_record_count'],
       'source_school_count':sr['source_school_count'],
       'school_names_exposed':False
      }
    }
samples=[
 sample('이차전지','화학','탐구보고서','신소재공학','구조·안정성·효율·경제성을 비교하는 보고서'),
 sample('반도체','물리','자료조사 보고서','전자공학','교과 개념과 실제 소자 사례를 연결한 자료조사'),
 sample('인공지능','정보','발표보고서','컴퓨터공학','데이터와 알고리즘의 적용 사례를 발표'),
 sample('미세먼지','통합과학1','실험보고서','환경공학','측정 자료와 기상 조건을 비교하고 결과를 해석'),
]
json.dump({'version':'assessment-keyword-connection-samples-v1.0.0','generated_at':NOW,'samples':samples},open(OUT/'assessment_keyword_connection_samples.v1.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)

# Human-readable aggregate exports for inspection and downstream processing.
EXPORT = OUT / 'export'
EXPORT.mkdir(parents=True, exist_ok=True)

def flatten_values(items):
    values=[]
    for item in items or []:
        if isinstance(item,dict): values.append(str(item.get('value','')))
        else: values.append(str(item))
    return ' | '.join(v for v in values if v)

with open(EXPORT/'keyword_assessment_routes.v1.csv','w',encoding='utf-8-sig',newline='') as f:
    fields=['keyword','major_count','majors','major_groups','primary_cluster','primary_cluster_label','recommended_subject_groups','preferred_methods','preferred_outputs','preferred_report_modes','assessment_focus','topic_noun','recommended_evidence','route_confidence']
    writer=csv.DictWriter(f,fieldnames=fields); writer.writeheader()
    for key,route in sorted(keyword_routes.items(), key=lambda kv: kv[0]):
        writer.writerow({
          'keyword':key,'major_count':route.get('major_count',0),'majors':' | '.join(route.get('majors',[])),
          'major_groups':' | '.join(route.get('major_groups',[])),'primary_cluster':route.get('primary_cluster',''),
          'primary_cluster_label':route.get('primary_cluster_label',''),'recommended_subject_groups':' | '.join(route.get('recommended_subject_groups',[])),
          'preferred_methods':' | '.join(route.get('preferred_methods',[])),'preferred_outputs':' | '.join(route.get('preferred_outputs',[])),
          'preferred_report_modes':' | '.join(route.get('preferred_report_modes',[])),'assessment_focus':route.get('assessment_focus',''),
          'topic_noun':route.get('topic_noun',''),'recommended_evidence':route.get('recommended_evidence',''),'route_confidence':route.get('route_confidence','')
        })

with open(EXPORT/'subject_assessment_evidence.v1.csv','w',encoding='utf-8-sig',newline='') as f:
    fields=['subject','canonical_subject_group','evidence_record_count','source_school_count','source_count','average_weight','dominant_methods','dominant_outputs','dominant_rubrics','dominant_report_modes','dominant_content_axes','avoid_modes']
    writer=csv.DictWriter(f,fieldnames=fields); writer.writeheader()
    for key,route in subject_routes.items():
        writer.writerow({
          'subject':key,'canonical_subject_group':route.get('canonical_subject_group',''),'evidence_record_count':route.get('evidence_record_count',0),
          'source_school_count':route.get('source_school_count',0),'source_count':route.get('source_count',0),'average_weight':route.get('average_weight',''),
          'dominant_methods':flatten_values(route.get('dominant_methods')),'dominant_outputs':flatten_values(route.get('dominant_outputs')),
          'dominant_rubrics':flatten_values(route.get('dominant_rubric_tags')),'dominant_report_modes':flatten_values(route.get('dominant_report_modes')),
          'dominant_content_axes':flatten_values(route.get('dominant_content_axes')),'avoid_modes':flatten_values(route.get('avoid_modes'))
        })

with open(EXPORT/'task_output_evidence.v1.csv','w',encoding='utf-8-sig',newline='') as f:
    fields=['task_type','evidence_record_count','source_school_count','source_count','average_weight','dominant_subjects','dominant_methods','dominant_outputs','dominant_rubrics','dominant_report_modes','avoid_modes']
    writer=csv.DictWriter(f,fieldnames=fields); writer.writeheader()
    for key,route in task_routes.items():
        writer.writerow({
          'task_type':key,'evidence_record_count':route.get('evidence_record_count',0),'source_school_count':route.get('source_school_count',0),
          'source_count':route.get('source_count',0),'average_weight':route.get('average_weight',''),'dominant_subjects':flatten_values(route.get('dominant_subjects')),
          'dominant_methods':flatten_values(route.get('dominant_methods')),'dominant_outputs':flatten_values(route.get('dominant_outputs')),
          'dominant_rubrics':flatten_values(route.get('dominant_rubric_tags')),'dominant_report_modes':flatten_values(route.get('dominant_report_modes')),
          'avoid_modes':flatten_values(route.get('avoid_modes'))
        })

print(json.dumps(audit,ensure_ascii=False,indent=2))
