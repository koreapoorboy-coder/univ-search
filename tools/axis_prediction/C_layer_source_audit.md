# C층 원천 소스 감사 — 문항 본문·정답 전수 탐색 (검수 5문항 + §5-③)

read-only 조사. 목적: 답별 오답예측표(후보5) 착수 조건 = 문제 본문/정답/선택지/해설 실재 여부.

## ⭐ 헤드라인 정정: "792문항에 답 필드 없음"은 틀렸다
`answer_key`가 **source_item_bank에 3,364/3,364(100%) 실재**하고 source_item_links와 **item_id 1:1 조인(100%, 고아 0)**. 정오답 판정은 지금 가능. **단** 선택지 텍스트·본문·distractor→오류 매핑은 미저장이라 "오답 선택지별 분기"는 여전히 원천 PDF 필요(리포에 0개).

---

## 1. 문항 본문 텍스트 소스 전수 탐색
| 소스 | 파일/커버 | 본문 텍스트 | 정답/방법 |
|---|---|---|---|
| `source_item_links/` | 25파일·14단원·3364 | ❌ (policy: source text not stored) | ❌ (태그·stages·hint만) |
| **`source_item_bank/`** | 50파일(json+csv)·14단원·3364 | ❌ **raw_problem_text_stored=false(전량)** | ✅ **answer_key·method·difficulty·PDF 페이지참조** |
| `algebra/`(옛 체계) | 병렬 구조(answer_key_items·error_pattern_bank·source_item_bank/links) | (별도 namespace, 교체 대상) | — |
| 원천 워크시트 PDF | `source_file` 참조만(260710_방정식(8).pdf 등) | — | **리포 내 .pdf = 0개** |

→ **본문·해설 전문은 리포 어디에도 없음.** 유일한 원천 텍스트는 외부 PDF(리포 부재). `full_solution_text_stored=false`(전량).

## 2. ★ 키 조인율 실측
- source_item_bank distinct item_id = **3,364** · source_item_links = **3,364**
- **교집합(조인) = 3,364 (100%)** · links-only(정답 없음) = **0** · bank-only = **0**
- **완전 1:1 조인.** item_id 형식 동일(M2_LE_150_S08_Q001).

## 3. 필드 확인 (본문/선택지/정답/해설)
| 필드 | 실재 | 상세 |
|---|---|---|
| 본문(problem text) | ❌ | raw_problem_text_stored=false 전량 |
| 선택지(choices 텍스트) | ❌ | response_format=single_choice이나 선택지 문구 미저장 |
| **정답(answer_key)** | ✅ **100%** | choice(단일) 1571 · value(수치/기호) 1515 · 기타(도형명 등) 270 · multiple_choice 8 |
| 정답 근거 | ✅ | answer_evidence(quick_answer_pages)·verification_status 전량 cross_checked |
| 해설(full solution) | ❌ 전문 / ✅ 구조 | full_solution_text_stored=false, 단 method_summary·canonical_method_tags·solution_method_evidence·solution_page 존재 |
| 부가 | ✅ | difficulty·observed_accuracy_percent·observed_challenge_band(경험적 난이도) · requires_visual_reading(1545/3364=46% true) |

## 4. 커밋 이력·검증 기록
- source_item_bank: **25 커밋**(단원 세트별 ingest, 예: "feat: ingest M3 statistics SET03 150-item worksheet data").
- **verification_status 전량 기재**: `method_structure_verified_from_solution`(892)·`cross_checked_quick_answer_and_full_solution`(450+442)·`quick_answer_transcribed_from_rendered_answer_table`(600+) 등 → 정답이 원천 답표·해설과 **교차검증됨**.

## 5-③. taxonomy ctx ↔ problem_type 조인 (§5 감사)
- links.primary_problem_type_id distinct = **920** · problem_types 정의 = 12,631(전 학년)
- **조인(정의 존재) = 763 (83%)** · **고아(정의 없음) = 157 (17%)** — 예: M2_SIMPY_PT004·005·011(닮음·피타고라스)
- type_name 12,631개 정의 존재(유형이름 커버 충분). **단 14단원 참조 유형의 17%가 problem_types에 미정의** — §5-③ 열린 항목.

---

## 결론 — C층 상한 이동
- **가능해진 것:** answer_key 100%+조인 100% → **정오답 판정·경험적 난이도·방법태그 기반 진단**. "문항 단위 거친 진단만"이라던 상한이 올라감.
- **여전히 막힌 것(후보5 진짜 병목):** 선택지 텍스트·본문·**distractor→오류 매핑** 미저장. answer_key는 "정답=4번"까지, "2번 고른 학생의 실수"는 없음. 그 분기는 **원천 PDF OCR** 필요 → **PDF가 리포에 0개**(외부 보유 여부 = 검수측 확인 사항).
- **§5-③:** primary_problem_type_id 17% 고아 = 별도 열린 항목.

## 다음 판단(검수)
1. 원천 PDF 외부 접근 가능? → 가능하면 OCR로 선택지·본문 확보 → 진짜 답별 오답표. 불가하면 C층 상한 = "정오답+난이도+방법태그"로 확정.
2. answer_key 기반 진단(정오답·난이도 가중)은 PDF 없이도 지금 설계 가능 — 후보5의 축소판.
