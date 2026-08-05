# (B) 팩→문항 연결 — 최종 상태 v2 (방법 정책·굽기 완료·A라인 안건)

> `B_connect_13units_signal.md`의 🔴 진단(“무거운 재분류”)을 **정정·대체**한다. 원인은 재분류가 아니라 식별자 불일치+유형 부재였음.

## 방법 정책 (커버율 아닌 로직)
축은 **문항→유형→팩축** 링크로 붙는다. 링크 방법이 단원마다 다름(체계가 한 벌 아님):
- **PT-다리** = 문항 `primary_problem_type_id` ↔ raw_taxonomy topic_type `legacy_problem_type_id` → 러너 v5 로직으로 축. **완전.**
- **이름매칭** = 팩규칙을 `canonical_target_type_name`(세부 한 줄)에 직접. PT-다리 없는 단원의 유일 대안. **축 누락 가능.**
- **단원 단위로 방법 고정**(문항마다 섞지 않음). `link_method` 필드에 기록.

## 굽기 완료 — 10단원 (파일: `B_connect_<unit>.v1.json`)
### PT-다리 5단원 (link_method: pt_id)
| 단원 | code | 커버 | 평균축 |
|---|---|---|---|
| quadratic_equation | QE | 300/300 | 3.9 |
| real_numbers | RC | 150/150 | 2.4 |
| number_expression | NE | 293/300 | 2.5 |
| linear_inequality | IN | 114/150 | 3.2 |
| linear_equation | EQ | 144/192 | 2.9 |

### 이름매칭 5단원 (link_method: name_match + 캐비엇)
| 단원 | code | 커버 | 평균축 |
|---|---|---|---|
| probability | PB | 300/300 | 3.02 |
| circle | CP | 300/300 | 2.49 |
| trig | TR | 354/372 | 2.24 |
| statistics | ST | 150/150 | 2.19 |
| linear_function | FN | 82/100 | 1.7 |

**캐비엇(원문, name_match 파일 meta에 기록):** "이름매칭 = 세부이름 한 줄(canonical_target_type_name)에만 규칙 적용. PT-다리 대비 축 누락 가능. PT 비교 대상 없어 검증 불가(PT 0~32%)."

## ② 방법별 문항당 평균축 (섞지 말 것)
- **이름매칭 5단원: 평균 2.33축** (2.19/3.02/2.49/2.24/1.7)
- **PT-다리 5단원: 평균 2.98축** (2.9/2.5/3.9/2.4/3.2)
- → 방법 차이가 실재. 14단원 축분포 볼 때 **두 집단을 분리**해야 방법차를 단원차로 오독 안 함.

## ⑤ 6% 경위 정정 (기록)
`linear_equation` 6%는 노동 크기가 아니라 **내 두 오류**였다:
1. **필드 오류**: 팩규칙을 세부이름(canonical_target_type_name="거리 구하기")에 때림 → 문항엔 유형 키(primary_problem_type_id)가 따로 있어 그걸로 이어야 함.
2. **팩 오류**: unit_name 추측으로 EX_LE 매핑 → 실제 unit_code=EQ=**SE_EQ**. (도구는 unit_code로 자동선택해 방지.)
→ PT-다리+올바른 팩으로 **6% → 75%**. 대조군(PT-키 상한 72%)과 일치해 도구 검증됨.

## ⚠ 식별자 불일치 3종 (전부 조용한 0 — 에러 안 남)
1. **유형 이름**: 대푯값/대표값 (철자) · 세부이름 vs 묶음명
2. **유형 키**: legacy_problem_type_id 있는 단원(LE)·null 단원(통계)
3. **단원 ID**: 문항 `M2_SIMILARITY_PYTHAGORAS` vs raw `M2_SIMILARITY` · `M3_TRIGONOMETRIC_RATIO` vs `M3_TRIG_RATIO`
→ **도구에 커버 0%/저커버 경고 추가**(조용한 0 방지). unit_id 대조 출력 내장.

## ③ 진짜 🔴 4단원 = A라인 안건 (규모 실측)
raw_taxonomy에 유형이 없어 PT-다리가 안 닿음(=팩 입력 부재). **이름·PT 둘 다 낮음.**
| 단원 | 이름% | PT% | **키없음(유형부재)** | 성격 |
|---|---|---|---|---|
| similarity_pythagoras | 34 | 0 | 300/300 | PT-다리 구조 부재 + 이름 저매칭 |
| polynomial | 26 | 22 | 233/300 | raw_taxonomy 유형 부재 |
| quadratic_function | 5 | 23 | 232/300 | raw_taxonomy 유형 부재 |
| geometry_properties | 7 | 39 | 91/150 | raw_taxonomy 유형 부재(부분) |
| **합** | | | **856 문항** | |

**A라인 재개 판단용 규모: 856문항이 팩 입력에 유형 없음.** 연결하려면 raw_taxonomy에 유형 추가 → 팩 규칙 신설 가능성 → sha256 재검증 동반(45/45 영향). **Code탭 결정 아님, A라인 상신.**

## 연결 총계
- **연결 완료 10단원**(PT 5 + 이름 5): 🟢7·🟡3. 문항 축부여 ~2,281.
- **A라인 안건 4단원**: 856문항 유형 부재.
- 엔진 미연결(데이터만, §9). 태그(observed) 층 별개. 공통규칙 오탐(C-01·06·09·10)은 이미 포함됨 — 별도 정밀화 필요.
