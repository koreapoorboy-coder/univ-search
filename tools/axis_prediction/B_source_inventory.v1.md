# 소스 재고 실측 — 문항 본문/정답/유형 전수 조사 (①③ 보류 전제 교정)

> 계기: ①③ 보류 사유가 "본문·정답 없음"이었으나, 대수 마스터의 `answer_key:null`만 보고 판단했던 것. 전수 조사 결과 **정답·유형·오류태그는 확보돼 있고, 본문·해설 원문·PDF만 부재**로 교정됨. 데이터 = Code탭 실측(HEAD `0ef59c4e` 시점).

## 확보 / 부재 (source_item_bank 3364문항 전수)
```
[확보] 정답  answer_key            3364/3364  (choice:N · value:… · label 등)
[확보] 유형  source_type_label · canonical_target_type_name · primary_problem_type_id  (856의 4단원 포함)
[확보] 오류태그  likely_error_tags   (문항별)
[확보] 방법메타  method_summary · first_action_hint · canonical_method_tags · expected_process_stages
[확보] 조인  source_item_bank ↔ source_item_links  3364/3364 = 100% (양쪽 고아 0)

[부재] 문제 본문   raw_problem_text_stored=false  0/3364
[부재] 선택지 텍스트  (정답 위치만 있음, 보기 문장 없음)
[부재] 해설 원문   full_solution_text_stored=false  0/3364
[부재] 원천 PDF   0개 (파일명·페이지 참조만, 파일 부재)
```

## 파일 위치 / 커버리지 / 문항 수
| 계열 | 위치 | 문항 | 내용 |
|---|---|---|---|
| **단원별 소스뱅크** | `data/source_item_bank/<14단원>/*.source_items.v1.json` (25파일) | **3364** | 정답·유형·오류태그·방법메타 (본문 X) |
| 축연결층 | `data/source_item_links/<14단원>/*.links.v1.json` | 3364 | item_id·likely_error_tags·first_action_hint (본문 X) |
| 대수 마스터 | `data/algebra/source_item_bank/algebra.source_items.master.v1.json` | 5819 | 메타만, answer_key=null |
| 대수 워크시트뱅크 | `data/item_bank/algebra/**/*.items.v1.json` | ~1400 | answer_key·error_tags 有, 본문 X |
| `item_bank/m2_*·m3_*` | 위 폴더들 | 0 | index 껍데기(0문항)뿐 |

14단원(3364) = 856의 4단원(similarity 300·polynomial 300·quad_function 300·geometry 150) 포함.

## 참조 원천 PDF 전수 (24개 · 리포 부재 · 본문 확보의 유일 경로)
> 파일명이 남아 있음 → 로컬/다른 곳에 실물이 있을 것. 검수측 GPT 텍스트화도 이 PDF들로 했다면 그 작업물이 열쇠.

| 단원 | PDF |
|---|---|
| m2_geometry_properties | `260710_도형의 성질(6).pdf` |
| m2_linear_equation | `260710_방정식(8).pdf` · `260710_방정식(13).pdf` |
| m2_linear_function | `260710_함수(5).pdf` · `260710_함수(8).pdf` |
| m2_linear_inequality | `260710_부등식(5).pdf` |
| m2_number_expression | `260710_수와 식(5).pdf` · `260710_수와 식(9).pdf` |
| m2_probability | `260711_경우의 수와 확률(5).pdf` · `(10).pdf` |
| m2_similarity_pythagoras | `260711_도형의 닮음(3).pdf` · `(8).pdf` |
| m3_circle_properties | `260711_원의 성질(6).pdf` · `(12).pdf` |
| m3_polynomial_mult_fact | `260711_다항식의 곱셈과 인수분해(5).pdf` · `(13).pdf` |
| m3_quadratic_equation | `260711_이차방정식(5).pdf` · `(11).pdf` |
| m3_quadratic_function | `260711_이차함수(3).pdf` · `(9).pdf` |
| m3_real_numbers | `260711_실수와 그 계산(6).pdf` |
| m3_statistics | `260711_통계(2).pdf` |
| m3_trigonometric_ratio | `260711_삼각비(6).pdf` · `(10).pdf` · `삼각비.pdf` |

## ③ 시범 — C-01 오탐 재판정 **후보 분류** (판정 아님, 정황)
> 방법: C-01 발화 & E1 예측 문항을 `likely_error_tags`의 E1착지태그(`verification_missing`·`solution_check`·`solution_set_omission`) 유무로 분류. 태그는 사람이 붙인 가공물이라 정황이지 판정 아님(태그 어휘 좁음 한계 = 팩과다 vs 태그부족 미구분 자리와 동일).

| 단원 | C-01&E1 | verif_missing 有 | E1착지태그 有 | E1태그 無(오탐후보) |
|---|---|---|---|---|
| m2_linear_equation | 41 | 23 | 23 | 18 |
| m2_linear_inequality | 24 | 1 | 4 | 20 |
| m2_number_expression | 17 | 6 | 6 | 11 |
| m3_quadratic_equation | 68 | 0 | 0 | 68 |
| m3_statistics | 21 | 0 | 0 | 21 |
| m3_trigonometric_ratio | 14 | 0 | 0 | 14 |
| m3_real_numbers | 3 | 0 | 0 | 3 |
| **합** | **188** | **30** | **33** | **155** |

**⚠ 한계 (중요):** 이 188 = **C-01 발화 전수**, 레드존의 **"E1 단독 92"가 아님.** `quadratic_equation 68`은 `이차방정식`→C-11(방정식→E1)도 발화라 **E1이 C-11에서도 와서 C-01이 오탐이어도 E1 안 사라짐** → 155 중 상당수는 실제 위험 아님. **진짜 위험 = "E1이 C-01 단독인 92"**, 정밀 분류는 규칙별 귀속 계산 필요(다음 단계 후보).

**기록 성격:** "재판정" 아님. **"재판정 후보 분류"** — 어느 쪽이 몇 건인지까지. 실제 수정 여부는 sole-92 정밀화 + 본문 확보 후 결정.

## ①③ 보류 사유 — 교정
- **① 856**: 유형(source_type_label·canonical_target_type_name)은 **소스뱅크에 확보**("유형 부재"는 raw_taxonomy 한정). 단 **축 부여는 여전히 소스 대기** — 팩 축("이 유형은 어디서 틀리게 돼 있나")과 태그("학생이 실제 뭘 틀렸나")는 다른 층(겹침 59%·D3/C2 태그≫팩·A2/B3 팩≫태그). 태그로 팩 축 만들면 관측=예측이 되어 predicted vs observed 비교가 무의미. **이름 이식까지만 가능, 축은 소스 대기.**
- **③ 오탐 213**: 정답·오류태그 확보로 **후보 분류는 가능**(위 시범). 단 sole-92 정밀화 + 본문 없이는 확정 판정 불가. **보류 유지, 후보 분류만 기록.**
- **공통**: 본문·해설 원문·PDF는 여전히 부재 확정. 본문 확보 경로 = 위 24개 PDF 실물(리포 밖).
