# 관측 태그 통합 사전 v1 (TAG_DICTIONARY)

> 재태깅으로 나온 오류형 태그(observed likely_error_tags)를 17진단축에 매핑한 **통합 대장**. 검수-Code탭 공동 관리. 새 단원 태깅 시 **먼저 이 사전을 조회**해 같은 오류에 새 이름을 붙이지 말 것(재사용률 유지).
> ⚠ 관측층(OBSERVED). PREDICTED(팩) 축과 별개 필드. 두 층이 같아지면 predicted vs observed 대조가 무의미(§9).

## §1 축 정의 원본
`axis_definitions_v10_orig.md` 17축(A1·A2·A3·B1~B4·C1~C4·D1~D3·E1~E3). 내용 유효, 출처 절 미확인.

## §2 태그→축 맵 파일 (정본 소스)
| 파일 | 단원 | 태그수 |
|---|---|---|
| `B_tag_axis_map_M2NE.v1.json`(v3) | 수와식(5) | 91 |
| `B_tag_axis_map_M3CP.v2.json` | 원의성질(12+6 통합) | 55 |
| `B_tag_axis_map_M3TR_new.v1.json` | 삼각비(6) 신규 | 54 |
| **통합 고유** | 3단원 | **~197** (재사용 중복 제외) |

## §3 축 커버리지 (3단원 4워크시트 누적)
**관측 15/17축.** 미등장 2축: **A1**(의미해석없이 계산부터)·**E2**(해 타당성 미확인).
- 수와식 = D편중(D1·D3), 원의성질 = C편중(C3), 삼각비 = 광폭(12축, A2·D2·E3 첫 규모)
- A2(암기형) 첫 실측 = 삼각비 `special_angle_trig_value_recall_error`(특수각 값 암기)
- E3(답 마무리) 확정 = 원의성질/삼각비 (answer_format·final_form_reduction·rounding·ratio_direction)
- → 단원마다 다른 축 편중 = 진단축 변별력 실증

## §4 중복 후보 · 통합 결정 (누적)

### 삼각비(6) 세션 확정 (2026-08)
| 신규 이름 | → 통합 대상 | 축 | 판정 |
|---|---|---|---|
| `auxiliary_perpendicular_construction_failure` | `auxiliary_line_construction_failure` | C3 | 검수확정 |
| `external_altitude_construction_failure` | `auxiliary_line_construction_failure` | C3 | 검수확정 |
| `regular_polygon_auxiliary_triangle_construction_failure` | `auxiliary_line_construction_failure` | C3 | 검수확정 |
| `pythagorean_side_completion_error` | `pythagorean_setup_failure` | C1 | 검수확정 |
| `requested_coefficient_extraction_failure` | `answer_format_mismatch` | E3 | 검수확정 |
| `maximum_area_right_angle_condition_overlooked` | `maximum_area_condition_overlooked` | B1 | 검수확정 |
| `composite_area_decomposition_failure` | `composite_area_subtraction_failure` | C1 | 검수확정 |
| `angle_correspondence_transfer_failure` | `angle_correspondence_chain_failure` | C3 | 검수확정 |
| `special_angle_side_ratio_direction_error` | `trig_ratio_side_role_confusion` | C2 | 검수확정(ratio_direction 아님 — 시점 다름) |

### 중복 아님으로 정정 (신규 유지)
| 태그 | 이유 |
|---|---|
| `area_ratio_to_side_ratio_conversion_failure` | `area_ratio_from_similarity_failure`는 길이비→넓이비(제곱), 이건 넓이비→길이비(√) 역방향. 학생 조작·오류 방식 다름. 신규 유지(C4) |

### 이전 세션 통합(수와식↔원의성질)
| 태그 | 축 | 결정 |
|---|---|---|
| `ratio_direction_inversion` | E3 | B4→E3 통일(수와식·원의성질). "몇 배 답 방향 뒤집기"=답 마무리. 수와식 E3 0→1(Q77) |

## §5 유형당 태그 수 규율
- 1문항 유형도 근거가 독립적이면 3태그 유지(예 삼각비 Q82: 식세우기·표값선택·반올림).
- 근거 부수적이면 축소(예 삼각비 Q137: midpoint_length 제거→2태그).

## §6 재사용률 기준 (검수)
- 같은/인접 단원(원12→원6): 66.7% 정상.
- 교차 도메인(원→삼각비): 12.9% — 도메인 거리로 일부 설명되나 **20% 실패선 유지**. 사전이 커지면 재사용률도 올라야 정상. 닮음(원·삼각비 양쪽 인접)에서 20% 초과 재확인 예정.

## §7 중기 과제 — 경계(boundary) 일괄 재검토
- boundary 비율 3단원 연속 40%대: **수와식 33% · 원12 48% · 삼각비 44%**.
- 누적되면 predicted vs observed 대조에서 절반이 흔들림.
- **단원 3~4개 더 쌓이면 경계 전체를 한 번에 재검토하는 자리 마련.** 같은 경계선(C1/C3, C2/C4)끼리 묶어 보면 판례가 생김. (검수 지시, 지금은 반영 그대로 진행)
- 개별 재검토 대기: `triangle_area_sine_factor_omitted`(D3 유지, ½누락이 공식기억 C2에 가까움 — 유사사례 시).
