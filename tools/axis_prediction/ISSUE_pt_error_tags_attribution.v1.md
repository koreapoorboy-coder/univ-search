# ISSUE (별건 백로그) — pt.error_tags 병합의 귀속 문제 (2026-08-09)

> QF B회생(③, 커밋 `6489aa53`) 검증 중 표면화. **③이 만든 문제 아님** — 엔진 초기 파운데이션부터 있던 전역 설계 성질. QF가 그동안 死상태라 안 드러났다가 회생시켜 보니 나온 것. **push 차단 사유 아님으로 판정**(검수 2026-08-09), 별건 추적.

## 무엇
- `assets/math_weakness_engine.js:289` `_tagsFor(attempt,pt,instruction)` 가
  `pt.error_tags` ∪ `observedTagsOf(attempt)` ∪ `instruction.error_tags` 를 **합집합**으로 반환.
- 즉 오답의 진단 태그에 **학생/Worker가 내지 않은 `pt.error_tags`(문항유형별 카탈로그)가 항상 섞여 들어감.**
- 이 병합 태그가 `tagStats[t].wrong` 누적 → diagnosis_rules 발화(`trigger.error_tags_any` 합계 ≥ `wrong_min`) 및 축 집계(`observed_axes`)에 그대로 반영.

## 실질 효과 (귀속 문제)
- **"이 유형에서 틀림" → "이 오류를 실제로 냈음" 으로 귀속.** 학생이 내지 않은 신호가 진단에 들어감.
- **대가**: 한 문항유형이 `error_tags`를 여럿 가지면, 그 유형 오답 하나가 여러 태그에 동시 기여 → `wrong_min`(표준 2) 넘기기 쉬움. 여러 규칙이 한꺼번에 발화하면 "진단"이 아니라 "목록"이 될 위험.

## 근거 조사 결과 (조사 2)
- **명시된 문서·커밋 근거 없음.** `git log -S error_tags -- .../math_weakness_engine.js` = 초기 파운데이션 커밋(`ab647808` 전역 런타임 로더, `152702e8` 중1 코어데이터)만. `docs/`에 error_tags 의미 설명 없음. 289행 병합은 초기부터 존재.
- ⚠ **아래 "설계 의도"는 추론이며, 근거가 없음이 확인된 상태다.** 나중에 이 로직을 손댈 때 "명시적 의도가 있었다"고 오해하지 말 것.
  - (추론) `pt.error_tags` = 문항유형별 큐레이션된 "이 유형에서 흔한 오류" 카탈로그. Worker가 답안별 태그를 못 낼 때도 진단이 돌게 하는 **타입레벨 폴백/prior**.
  - (뒷받침 정황) `worker_skeleton/math_diagnosis_worker.js:369` 폴백이 `observed_error_tags: []` 기본 → 현재 프로덕션은 태그가 대체로 `pt.error_tags`에서만 옴. QF가 필드명 수정만으로 회생 가능했던 것도 트리거 태그가 pt.error_tags에서 왔기 때문.

## 팽창은 QF 특유가 아님 (조사 1 실측)
통제 실험 = 각 단원 **단독 로드**(실운영 방식), 첫 3 PT에 `observed_error_tags` 빈 채 3오답:

| 단원 | avg error_tags/PT | 발화 규칙수 | max wrong_count | 발화율 |
|---|---|---|---|---|
| QF (M3_QUADRATIC_FUNCTION) | 3.32 | 2 | 6 | 2/13 |
| NE (M2_NUMBER_EXPRESSION) | 2.59 | 1 | 3 | 1/18 |
| QE (M3_QUADRATIC_EQUATION) | 1.22 | 1 | 3 | 1/14 |
| RC (M3_REAL_NUMBER_CALC) | 1.39 | 1 | 3 | 1/11 |
| LE (M2_LINEAR_EQUATION) | 2.99 | **3** | 3 | **3/12** |

- 팽창(발화 용이성)은 **`태그/PT 밀도`에 비례하는 보편 성질**. 정상단원 **LE(밀도 2.99)가 QF보다 높은 발화율(3규칙)** → QF는 이상치 아님.
- "8개 동시 발화"(초기 debug.html 관측)는 **36단원 전체 로드 아티팩트**. 단독 로드 시 QF는 2규칙. 실운영은 시험범위(candidate_units, 보통 3~4단원)만 로드.
- ⇒ **34단원 공통 사안. QF 단독 wrong_min 조정은 부적절**(32단원 표준 2/1에서 벗어나 불일치만 생김). 2/1 유지 확정.

## ★ ② Worker 주입과의 연결 (중요)
- Worker가 **fine 태그를 실제로 내기 시작하면** `observed_error_tags`가 채워지고 `pt.error_tags` 의존이 줄어듦.
- **즉 ②(Worker fine태그 주입)는 배선 확대일 뿐 아니라 이 귀속 문제의 완화책이기도 함.**
- **할 일**: ② 실행 후 **팽창 지표를 재측정**(위 표와 동일 방식·같은 입력) → observed 채워진 상태에서 pt.error_tags 의존/발화 팽창이 실제로 완화되는지 확인.

## 손댈 경우의 방향 (지금 아님, 전역 사안)
- 후보: (a) `tagStats`에서 observed vs pt.error_tags 기여 **가중 분리**(관측 신호 우선), (b) 규칙 발화 시 pt.error_tags 단독 기여분 **감쇠/중복 억제**, (c) wrong_min을 태그밀도로 정규화.
- 어느 것이든 34단원 전역 영향 → 별도 설계·검수 트랙. QF 배선 시범과 분리.

## 관련
- ③ 실행·검증: 커밋 `6489aa53`. 인계문 `HANDOFF_B_RETAGGING.v1.md` ⭐⭐ 블록.
- 별건 이슈 `ISSUE_4unit_diagnosis_rule_schema_mismatch.v1.md`(QF·TR·GP·PB 스키마 불일치)와 인접(QF는 이 트랙에서 회생됨).
