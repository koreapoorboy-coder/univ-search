# ISSUE: 진단 경로 결함 2건 — 입력없이 CORRECT 생성 / 유형 붕괴 (2026-08-11, request_id 20ea9e45)

> 검수 진단 JSON 감수 발견. 매칭 빌드보다 상위(진단 정확성·D1 오염). OPEN.

## ★차단1 — 학생 풀이 없음에도 20/20 CORRECT (D1 오염 직결)
증상: 같은 JSON서 `student_did_work_evidence:"none"`·`process_evidence:"not_visible"`·`student_work_text:""`(20)·`student_answer:""`(20)인데 `response_status:"CORRECT_COMPLETE"`(20)·`observed_error_tags:[]`(20). `file_purpose_review`는 "풀이 흔적 없음" 정확 판정.

**근본원인(코드 확인)**:
- `runAnalyze`(391): engine_adapter(A)·review(B)를 **병렬 2콜**(416). engine은 파일을 **독립적으로** 읽어 stage-1(`UNIT_ASSIGN`)에서 response_status 배정.
- 풀이 없는 문제지를 stage-1 모델이 `BLANK_UNKNOWN`(규칙 494) 대신 **CORRECT_COMPLETE로 오분류**(규칙 496 "채점 표시 없으면 풀이 결과로 판단"이 인쇄된 문제/해설을 정답으로 읽게 유도).
- `is_correct: a.response_status==='CORRECT_COMPLETE'`(697)로 파생.
- 병합(427) `{...review, ...engine}` = **단순 스프레드, 대조 없음** → review의 "풀이 없음"이 engine의 "전부 정답"을 못 막음.
- `recommended_engine_actions:['run_diagnoseWithGuidance',...]`(712) 항상 포함 → 소비 시 D1에 "전부 정답·오류 0" 저장.

**수정안**:
1. **병합 시점 가드**(427 근처): review.file_purpose_review가 풀이 부재 신호(`student_did_work_evidence==='none'` / `routing_decision!=='solve_diagnosis'` / `process_evidence==='not_visible'`)면 → engine_adapter.attempts를 **중립화**(is_correct=null, response_status='BLANK_UNKNOWN') **+ recommended_engine_actions에서 run_diagnoseWithGuidance 제거**(D1 오염 차단).
   - ★단 CORRECT_COMPLETE는 정상적으로 student_work_text 빈값 허용(600)이라, 가드 기준은 개별 문항의 빈 work가 아니라 **파일 레벨 "풀이 부재"** 신호여야 함(정상 정답 오탐 방지).
2. **stage-1 프롬프트 보강**: 학생 필적이 전혀 없으면 CORRECT로 기본값 금지, BLANK_UNKNOWN. 인쇄된 문제/해설을 학생 정답으로 읽지 말 것.

**D1 조회(오염 레코드)** — Code탭은 D1 접근 불가, 사용자가 D1 콘솔서 실행:
```sql
-- 전부 CORRECT·오류 0인 의심 레코드(풀이 부재 저장분). 표 컬럼명은 실제 스키마에 맞춰 조정.
SELECT id, student_code, date, exam_label
FROM axis_records
WHERE attempts LIKE '%CORRECT_COMPLETE%'
  AND attempts NOT LIKE '%WRONG_COMPLETE%'
  AND attempts NOT LIKE '%PARTIAL_STOP%';
```
※ 실사용 미램프(전환기준 미달)라 오염 레코드는 적을 것으로 예상. 건수·샘플 확인 후 삭제 여부 판단.

## ★차단2 — problem_type_id 3종 붕괴 · type_matched 거짓
증상: math_signal.problem_type_candidates는 유형별 정확(SIMILARITY_AREA_RATIO·MIDSEGMENT 등)하나 engine_adapter.attempts는 PT110/116/119로 붕괴. PT110에 축척·중점연결·직각·둔각·부피비 혼입. 그럼에도 `type_matched:20`(100%).

**근본원인(코드 확인)**:
- stage-2(`assignTypesForUnit` 561): 단원 유형 ≤ `MAX_ENUM_TYPES`(600)면 **단일 청크**(615), `split=false` → `allowNoMatch=false` → 스키마 enum에 **NO_MATCH 없음**(534) → 모델이 **모든 문항에 억지로 유형 선택**(confidence 필드도 없음).
- 그림 의존 도형 문항은 본문만으론 유형 구분이 어려워 **몇 종으로 붕괴**(억지 픽).
- `type_matched = attempts.filter(a=>a.problem_type_id).length`(700) = **비어있지 않음만 카운트** → 억지-오답 픽도 매칭으로 계수 → **100%는 거짓**.
- math_signal은 별개 출력(다른 프롬프트) → 정확할 수 있음. 두 경로 불일치.

**함의**: 매칭 1차 축소(unit+type)가 무력화 — 등록문항은 정확 유형인데 진단 attempts는 붕괴 유형이면 같은 후보집합으로 안 좁혀짐. **매칭 구현(4) 전 필수 선결.**

**수정안**:
1. 단일 청크 경로도 **NO_MATCH + confidence 허용**(현재 split일 때만). 모델이 억지픽 대신 "없음" 선택 가능 → 붕괴 대신 빈 유형(정직).
2. `type_matched` 지표를 **confidence 임계 이상 실매칭**으로 정정하거나 이름 변경(현재는 "유형ID 존재"일 뿐).
3. 그림 의존 유형은 본문 텍스트만으론 한계 → 도형 실측(차단1·JSON스펙)과 연동해 유형 배정 방식 재검토.

## 별건
- **비용**: 20문항 $0.8915(opus-4-8·effort high·3콜) = 인계문 §10 "$0.16"의 **5.6배**. staged 경로(stage1+단원별 stage2+review) 실측 반영 필요. §10 갱신.
- **difficulty enum**: 진단 스키마는 `['basic','core','advanced','high']`(536)인데 값 혼재 관측. **bulk 스펙 v2에 동일 enum 확정**.
- **cm³→cm^3**(14·18): 원본 표기 소실 = 차단2(source_text 원문보존) 실증.

## 상태
OPEN · 차단1·2는 진단 경로 수정(worker), 매칭 빌드와 별개·상위. 검수 승인 후 구현.
