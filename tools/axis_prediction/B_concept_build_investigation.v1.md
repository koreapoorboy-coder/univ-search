# circle·statistics concept 빌드 — 착수 전 조사 (2026-08-10)

> 검수 4조사 요청 답. 결론: **개념명은 PDF/검수 없이 PT type_name에서 유도 가능**(PT 복구와 동일 패턴). 정식 큐레이션 필드(설명·진단신호·보강)만 별도.

## Q1. 정상 단원 concept 파일 형태 (예 M2_GEOM_C001)
`data/math_concepts.v1.json`(전 단원 공용, concept_id 키). 엔트리:
```
concept_id, grade, course, unit_id, unit_name, strand, sub_strand,
concept_name("평행선에서 동위각·엇각·맞꼭지각"),
description("평행선과 한 직선이 만날 때…"),
diagnostic_signals[]("동위각과 엇각 혼동"…),
remediation_keywords[]("동위각","엇각"…), source_orders[]
```
- **concept_name·description·diagnostic_signals·remediation_keywords = 큐레이션 산출(한글 수작업).** 파생 아님.

## Q2. circle/statistics 참조 concept id 종수
- **circle: 31종** M3_CIRC_C### (47 PT에 대응, 개념당 평균 1.52 PT·최대 2).
- **statistics: 26종** M3_STAT_C### (개념당 평균 1.0 PT = 완벽 1:1).
- links의 300문항 **전부 concept_ids 보유**(100%). 단 그 id의 **정의(이름 등)는 어디에도 없음**.

## Q3. type_variant_bank에 개념 정보?
- **없음.** PT 복구 때와 달리 bank엔 concept_id/concept_name 필드 자체가 없음. 재활용 불가.

## Q4. 개념명 출처 — ★ PDF/검수 불요, PT type_name서 유도
- M3_CIRC_C###/M3_STAT_C### 이름은 **어디에도 정의 안 됨**(links·source_item_bank는 id만 참조, source_items에도 concept_name 필드 없음).
- **그러나** links가 item마다 concept_ids + primary_problem_type_id를 **함께** 가짐 → concept_id ↔ PT type_name 조인 가능. 매핑이 **깔끔·주제 일관**:
  - M3_CIRC_C001 → "원의 중심과 현의 수직이등분선(1)" · C007 → "원의 접선과 반지름"
  - M3_STAT_C001 → "평균의 뜻과 성질(1)" · C003 → "중앙값의 뜻과 성질"
- 개념당 PT 1.0~1.52개라 **PT type_name에서 개념명 유도가 코드로 가능**(난이도 접미사 "- 종합 활용/기본 판별" 제거). **PDF·검수 불필요.**
- ⇒ **개념명 = 저비용 파생.** 큐레이션이 필요한 건 **description·diagnostic_signals·remediation_keywords**뿐(진단 스코어링엔 불요, 리포트·보강용).

## 규모·2단계 권고 (PT 복구와 동일 구조)
- **Tier 1 (skeleton·저비용·지금 가능, PDF/검수 0)**:
  1. concept 정의 57개(31+26) 생성 → math_concepts.v1.json에 {concept_id, unit_id/unit_name/grade(index), **concept_name(PT type_name 유도)**, concept_name_source:"pt_derived", description/signals/remediation 빈값}.
  2. circle/statistics **pt.concept_ids 채움**(현재 []로 비워둠 → links의 PT→concept 조인으로 채움). ← 엔진 concept 스코어링은 `pt.concept_ids`를 읽으므로 필수.
  - 결과: **취약개념 진단 작동 + 실제 한글 개념명 표시.** circle/statistics가 다른 9단원과 같은 수준(개념층까지).
- **Tier 2 (정식 큐레이션·나중·검수/PDF)**: description·diagnostic_signals·remediation_keywords 한글 작성. 57개. 진단 본체엔 불요(리포트 풍부화용). 고등 재태깅과 같은 버킷.

## 판단 요청
- **Tier 1(skeleton) 지금 착수?** (PT 복구와 동일 결정 — 파생 개념명·source 표시·스코어링 작동, 큐레이션은 뒤로)
- concept_name 유도 시 난이도 접미사 처리: "원의 접선의 성질(1) - 기본 판별" → **"원의 접선의 성질(1)"**(접미사 제거)로 할지, PT명 그대로 둘지?
- description 등 빈값 허용 확인(엔진은 concept_name·concept_ids만 있으면 스코어링·표시 동작, 나머지 graceful 부재).
