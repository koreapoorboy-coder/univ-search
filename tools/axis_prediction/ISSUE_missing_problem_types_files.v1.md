# ISSUE (별건) — index가 참조하는 problem_types 파일 부재 (circle_properties · statistics) (2026-08-09)

> 배선 확대 오버레이 생성 중 circle_properties에서 발견 → 전수 스캔으로 statistics도 동일 확인. 4단원 스키마 불일치(`ISSUE_4unit_diagnosis_rule_schema_mismatch`)와 같은 성격 — **프로덕션에 구멍이 있는데 아무도 몰랐던 것**. 배선과 무관·기존 문제. circle 오버레이는 이 파일 복구 전까지 보류.

## 무엇
- `data/index.v1.json`이 아래 두 단원 엔트리에서 **존재하지 않는 problem_types 파일**을 참조:
  - `M3_CIRCLE_PROPERTIES` → `data/problem_types/m3_circle_properties.problem_types.v1.json` **(없음)**
  - `M3_STATISTICS` → `data/problem_types/m3_statistics.problem_types.v1.json` **(없음)**
- 전 index 단원 problem_types 경로 전수 스캔 결과 **이 2건만** 부재(나머지 전부 존재).

## 조사 (검수 4항목)
1. **언제부터 참조?** index에 circle 경로 추가 = 커밋 `2f2d04e4`("ingest M3 circle properties worksheet set 07"). 워크시트 인제스트 때 **index 엔트리는 추가됐으나 PT 파일은 생성 안 됨**.
2. **삭제 vs 애초 부재?** `git log --all -- .../m3_circle_properties.problem_types.v1.json` = **전무** → **삭제 아니라 처음부터 안 만들어짐**(statistics도 동일 추정).
3. **circle 진단 현재 동작?** `fetchUnitProblemTypes`가 그 경로 fetch→404→`pack.problem_types` 없음→`runStagedEngineAdapter`에서 "유형 목록이 비어 있다" throw→**per-unit catch**(line 412)→문항이 `problem_type_id:''`로 반환(line 415). ⇒ **circle/statistics 문항은 단원만 배정되고 유형·개념 진단 없이 조용히 격하**(에러 안 뜸, 사용자 인지 어려움).
4. **다른 단원 동일 갭?** 전수 스캔 = **이 2건뿐**. 나머지 index 단원 PT 파일 전부 존재.

## 영향
- circle_properties·statistics 진단이 **유형레벨 이하로 조용히 격하**(단원 배정만). observed층·예측층 모두 이 두 단원은 PT 부재로 반쪽.
- 배선 관점: **circle 오버레이(생성됨, 47PT) 배선 불가**(PT 파일 없어 fine태그 부착 대상 없음). statistics는 재태깅 없어 오버레이도 없음.

## 처리 (별건 트랙)
- **PT 파일 복구**: circle·statistics의 problem_types.v1.json 생성(raw_taxonomy·item_bank가 있으니 거기서 파생 가능성 — `data/item_bank/m3_circle_properties/`·`data/raw_taxonomy` 존재 확인됨). 별도 작업.
- 복구 후: circle는 오버레이 이미 생성돼 있으니 즉시 배선 가능(index에 fine_error_tags_overlay 추가).
- ⚠ 배선 확대(9단원)와 **분리** — 이 트랙 없이 9단원 진행.
