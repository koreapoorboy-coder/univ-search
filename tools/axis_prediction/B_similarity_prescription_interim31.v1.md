# 닮음(M2_SIMPY) 처방 — 30종 중간제출 (누적 31/87) v1 (2026-08-16)

> 배치1(6·무게중심) + B2(10) + B3(7) + B4(8) = **31종**. 검수가 고정한 확인 항목 순서대로 보고.
> 정본 = `tools/axis_prediction/m2_simpy_prescriptions.draft.v1.json` · 배치계획 = `B_similarity_prescription_batch_plan.v1.md` · 규격 = `B_similarity_prescription_prep.v1.md`.
> 롤링 백업 `_backup/m2_simpy_prescriptions.draft.v1.lastgood.json` 갱신 완료.

## 0. 이번 제출분 (B3·B4 = 15종)
| 배치 | 개념 | problem_type_id |
|---|---|---|
| B3 | 직각삼각형 닮음(공통각·같은 예각·비례중항)·종이접기 | PT028,029,031,033,035,036,038 |
| B4 | 평행선과 선분비(공통각·맞꼭지각·응용·역판정·여러 평행선·사다리꼴) | PT040,042,044,047,049,051,065,067 |

## 1. 기계 검증 결과 [실측]
| # | 항목 | 결과 |
|---|---|---|
| 1 | JSON 파싱 | OK |
| 2 | 엔트리 수 | **31** (배치계획과 정확 일치 — 누락·초과 0) |
| 3 | 13필드 완비 | OK (누락 0 · 규격 외 필드 0) |
| 4 | checkpoint 상한 | **2~4** (상한 4 준수 · 0-cp 0) |
| 5 | checkpoint 4필드(error_code·label·diagnosis·student_fix) | OK |
| 6 | nonnull (matched_template_id·match_score) | **0** (전건 null) |
| 7 | observed_basis 전건 true · draft true · revision 1 | OK |
| 8 | category_ledger 합 | **31 = 엔트리 수** (중복 0) |
| 9 | concept_map 커버 | **31** (중복 0) |
| 11 | label_map 일관성 | OK — 전건 일치 |
| 13 | progress.authored | 31 |

## 2. tier 분해 [실측]
```
tier-1 (자기 유형 overlay)      87
tier-2 (단원 overlay 87)         0
tier-3 (dict v2 §5닮음13+§2도형공통32)  0
tier-4 (신설)                    0
```
- 사용된 error_code 총 87개(31종 × 평균 2.8)가 **전부 tier-1**. 규격 §4의 "overlay 100%라 신설 거의 0이 정상"과 일치.
- ★**M2_GEOM 첫 배치 재사용 43% 대비**: 닮음은 첫 배치부터 tier-1 100%. 차이의 원인은 저작 방식이 아니라 **관측 커버리지**(M2_GEOM overlay 27/140 vs 닮음 87/87)입니다. 최종 보고에 "관측 커버리지가 재사용률 상한을 결정한다"는 대조 자료로 남깁니다. `_meta.reuse_note`에 기록.

## 3. checkpoint 절삭 — ★배치1 미기록 1건 발견·소급 기록
31종 중 overlay가 5개인 유형은 **PT105 1종**(배치1 저작분)뿐이고, 나머지 30종은 overlay ≤4라 **절삭 없이 전건 채택**.
- **PT105**: overlay 5 → checkpoint 4. 탈락 = `segment_partition_tracking_failure`.
- ★**배치1 시점에 탈락 사유가 기록되지 않았던 것**을 이번 31종 검증에서 발견해 `_meta.trimmed_checkpoints`에 소급 기록(`recorded_retroactively: true`). 태그 자체는 overlay에 남아 관측 손실은 없습니다.
- 이후 배치(B7·B8·B9·B10·B11)에는 절삭 대상 10종이 남아 있으며, 배치계획 §4의 기준(유형명 핵심 → 개념 국소 → 전역 빈발 후순위)과 탈락분 기록을 그대로 적용합니다.

## 4. 개념 내 골격 공유 — 표본 2건
★먼저 **정본 규칙을 확인**했습니다. M2_GEOM `_meta.concept_map`은 개념→id 매핑이 아니라 **골격 공유 규칙 명세**이고, 명시적으로 *"완전 동일 문자열 아님 — 변형축: 오류형/조건적용/계산추론/증명서술"* 입니다.
→ 닮음 파일의 `concept_map`(개념→id, 커버리지 검증용)과 이름은 같고 의미가 달라, `_meta.concept_map_semantics`로 차이를 명기하고 정본 규칙을 `_meta.skeleton_sharing`으로 승계했습니다.

**표본 1 — C010 직각삼각형 닮음·공통각 구조** (`PT028` 판별 / `PT029` 비례식·정리 적용)
```
공유 골격(required_thinking·must_write_steps, 4단계 동일 구조)
  ① 직각·공통각 표시 → ② 두 쌍 확보로 AA 선언 → ③ 대응 순서 확정 → ④ 검산
변형축(유형명 접미에 대응)
  PT028 판별   : ③에서 "겹친 삼각형을 떼어 그려 대응 확인"으로 종료
  PT029 계산   : ③이 "대응변으로 닮음비를 수로 확정"으로 바뀌고, ④에 넓이비(제곱)·수직 검산 추가
구분 필드
  student_command  PT028 "직각 □·공통각 ● 두 쌍 확보, 겹친 삼각형은 떼어 그려라"
                   PT029 "길이는 비로, 넓이는 비의 제곱으로. 수직인 밑변·높이만 공식에"
  parent_message   PT028 그림 다시 그리기 / PT029 길이비와 넓이비의 구분
```

**표본 2 — C017 역으로 평행선 판정하기** (`PT049` 판별 / `PT051` 복합 계산·증명)
```
공유 골격
  ① 비교할 두 비를 같은 기준으로 → ② 분수 정리 → ③ 비교/연립 → ④ 결론·조건 확인
변형축
  PT049 판별 : ③이 "두 값이 같은가" 비교, ④가 "평행이다/아니다" 결론 문장
  PT051 복합 : ③이 "등식을 연립해 미지수 확정", ④가 "길이 양수·그림 조건으로 거르기"
구분 필드
  student_command  PT049 "기약분수로 정리해 '같으므로 평행하다'까지 써라"
                   PT051 "'평행하려면 두 비가 같다'를 등식으로 세우고 분모를 곱해 방정식으로"
  parent_message   PT049 결론 문장 쓰기 / PT051 조건을 식으로 바꾸기
```

**전수 실측**: 31종에서 `problem_nature`·`student_command`·`teacher_note`·`parent_message` **완전중복 0건**, 개념 내 `required_thinking`·`must_write_steps`도 완전동일 문장 0(구조만 공유) — 정본 규칙과 일치합니다.

## 5. ★predicted_observed_gaps — (a)/(b) 판정
**답: (a) 수집했고 결과가 0.** 단, 배치1의 `[]`는 그 시점에 **측정 기록이 없었습니다** — 검수의 의심이 맞습니다. 이번에 31/31종 기계 대조로 소급 근거를 붙였습니다(`_meta.gaps_measured`).

**왜 0인가 — 구조적 강제**
1. M2_GEOM 정본 기준 = "**예측층 유형(observed_basis:false)** 에 배치한 error_code 중 같은 개념의 관측 유형 태그 합집합에 없는 것"만 갭으로 기록.
2. M2_SIMPY는 **overlay 87/87 → observed_basis 전건 true → 예측층 유형이 0개**. 갭 판정의 **입력 자체가 존재하지 않습니다**.
3. 게다가 사용된 87개 error_code가 **전부 tier-1**(그 유형 자신의 관측 overlay) → "관측에 없는 코드"가 원리상 발생 불가.
⇒ 0은 미수집이 아니라 **구조적으로 강제된 값**입니다.

**★부수 발견 — 배치1의 gaps_criterion 문구는 실행 불가** [코드확인 2026-08-16]
배치1 `_meta.gaps_criterion`은 *"예측 유형어 regex 발화 vs overlay 관측"* 이라고 적혀 있으나, `axis_rules.v44.json`은 `domain.<key>.rules[].axes` 로 **17축(A1~E3)만 예측**하며 fine error_code를 예측하지 않습니다. 따라서 **태그 수준 "예측 vs 관측" 대조는 이 단원에서 성립하지 않고**, 축 수준 대조는 별도 트랙(predicted/observed 축 대조·D2 갭 계열) 소관입니다. 문구를 정본 기준으로 교체하고 사유를 `gaps_measured.criterion_text_correction`에 남겼습니다.

**함의**: 닮음 87종에서는 M2_GEOM식 발견(갭 5계열)이 **원리상 나오지 않습니다**. 이 단원의 기여는 대신 "관측 완비 단원의 재사용률 상한 = tier-1 100%" 실측치입니다.

## 6. 남은 진행
| 배치 | 개념 | n | 절삭 대상 |
|---|---|---|---|
| B5 | 각의 이등분선(내각·외각, 변비·넓이비) | 7 | 0 |
| B6 | 사다리꼴 대각선·평행선 종합 | 4 | 0 |
| B7 | 중점연결정리 | 6 | 1 (PT083) |
| B8 | 무게중심 응용·평행사변형 | 11 | 1 (PT128) |
| B9 | 넓이비·부피비·실생활 | 9 | 2 (PT148,149) |
| B10 | 피타고라스 기본 | 8 | 3 (PT152,158,159) |
| B11 | 피타고라스 활용·역·입체 | 11 | 4 (PT166,167,171,174) |
| — | **잔여 합계** | **56** | **11** |

이후 배치에도 동일 검증 세트를 적용하며, 검수 지시대로 **label_map 대조를 상시 검증 항목에 포함**합니다(신규 error_code는 맵에 먼저 등록 후 사용).
