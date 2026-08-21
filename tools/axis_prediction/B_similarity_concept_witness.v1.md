# 제출10 — 개념층 증거 · difficulty 방향 대조 · +150 확정 · 도구 회계검사 (2026-08-21)

> 수신 검수 · 발신 Code탭 · 판정 12차 §7 순서 1·3·4 처리. **데이터 수정 없음.** 도구 1개 수정(3종 시험 완료).

---

## 0. 세 줄

```
1  §5 방향은 같습니다. 두 단원 다 basic → 첫칸입니다. 뒤집혀 있지 않습니다.
   그리고 72칸에는 default_difficulty 를 쓸 일이 없습니다 — 기존 87종도 안 갖고 있습니다.
2  ★개념층이 절단되지 않았습니다. 닮음 카탈로그가 참조하는 개념 최대번호가 C059 입니다.
   59 base × 3 = 177. 카탈로그 자신이 정식 종수를 증언합니다. 네 번째 독립 경로입니다.
3  +150 은 확정됐습니다. 그 커밋 제목이 "150 items" 입니다. 제 커밋 귀속이 틀렸던 것도 정정합니다.
```

---

## 1. ★★★ 개념층 증거 — 카탈로그가 스스로 177을 증언합니다

검수가 §1에서 "회계 증거"라 부른 것에 이어, **네 번째 독립 경로**가 나왔습니다.

### 슬롯 번호 = 개념 번호. 예외 0
```
닮음 87 엔트리 전수: 슬롯번호 != 개념번호 인 엔트리 = 0 / 87
  PT004(slot 2) -> M2_SIMPY_C002 · PT013(slot 5) -> C005 · PT177(slot 59) -> C059
```

### ★참조 개념 최대번호가 곧 base 수입니다
| 단원 | 카탈로그 참조 개념 | max | base(=max) | ×3 | 선언 | 일치 |
|---|---|---|---|---|---|---|
| **M2_SIMILARITY_PYTHAGORAS** | 53종 | **C059** | **59** | **177** | 177 | ✔ |
| M3_CIRCLE_PROPERTIES | 31종 | C042 | 42 | 126 | 126 | ✔ |
| M3_TRIGONOMETRIC_RATIO(대조군) | 36종 | C036 | 36 | 108 | 108 | ✔ |
| M3_STATISTICS | 23종 | C025 | 25 | **75** | 108 | ✘ (§1-③) |

⇒ **닮음 카탈로그는 87종만 담고 있지만, 그 87종이 참조하는 개념 번호는 C059까지 올라갑니다.**
⇒ 개념층은 유형층과 함께 잘리지 않았습니다. **잘린 파일 안에 잘리지 않은 눈금자가 남아 있었습니다.**

### ★★개념 결번 = 빈 슬롯. 두 단원 모두 완전 일치
```
닮음      개념 결번 = 1, 3, 6, 31, 36, 46
          빈 슬롯   = 1, 3, 6, 31, 36, 46        ★완전 일치
원의성질  개념 결번 = 2,3,4,6,10,14,19,20,34,35,37
          빈 슬롯   = 2,3,4,6,10,14,19,20,34,35,37   ★완전 일치 (11칸)
```
⇒ 제출7(이름 순서) · 제출8(문항 라벨 부재) · **제출10(개념 결번)** — **세 방법이 빈 슬롯 6개에서 같은 답**을 냅니다.
⇒ 원의 성질 11칸도 같은 방식으로 자동 재확인됩니다(검수가 이미 확정한 결과).

### 그리고 "개념 수 × 3 = 종수"는 원본 문서에 명시돼 있었습니다
`data/sources/*.source_manifest.v1.json` (2026-07-13, PATCH152):
```
m3_circle_properties     concept_count 42 · raw_section_count 42 · aligned_problem_type_count 126
m3_statistics            concept_count 36 · raw_section_count 36 · aligned_problem_type_count 108
m3_trigonometric_ratio   concept_count 36 · raw_section_count 36 · aligned_problem_type_count 108
alignment_mode = "new_canonical_unit_created_from_curriculum_scope_and_semantic_problem_types"
```
**42×3=126 · 36×3=108.** 3칸 슬롯 스킴이 *선언 문서에 산술로* 적혀 있습니다.
★ **닮음만 이 파일이 없습니다.** `m2_similarity_pythagoras.source_manifest.v1.json` = git 전 히스토리 **0건**(커밋 A에서 제거한 dangling 포인터가 바로 이것입니다). 있었다면 `concept_count 59`가 적혀 있었을 것이고, 개념 max C059가 그 자리를 대신 증언합니다.

### 177 = 정의 수 — 이제 네 경로
```
① docs      patch209/patch214 validation : canonical_problem_type_count 177
                                            matched 87 · new_problem_type_count 0
② 회계      manifest +519 = 177 + 126 + 108 + 108   (2026-07-19)
③ 개념      카탈로그 참조 개념 max = C059 -> 59 × 3 = 177     ← 신규
④ 구조      슬롯 규칙 59 base × 3칸
```

---

## 2. §5 difficulty ↔ pos 방향 — **같습니다. 뒤집혀 있지 않습니다**

검수 질문: *"닮음 basic → pos0(셋째칸 = 복합 계산·증명) / 원의 성질 basic → 첫칸(기본 판별). 방향이 반대인 것이 오기입니까?"*

**pos0은 첫째 칸입니다.** 값 단위로 대조합니다.

| 칸 | PT 번호 | 닮음 접미사 | 닮음 difficulty | 원의성질 접미사 | 원의성질 default_difficulty |
|---|---|---|---|---|---|
| **첫째(pos0)** | 3n−2 | 개념·조건 판별 (24) | **basic** (53건) | 기본 판별 (13) | **basic** |
| **둘째(pos1)** | 3n−1 | 비례식·정리 적용 (39) | **core** (155건) | 조건 적용 (24) | **concept** |
| **셋째(pos2)** | 3n | 복합 계산·증명 (24) | **advanced** (92건) | 종합 활용 (10) | **advanced** |

```
결론  방향 동일. basic -> 첫칸 · advanced -> 셋째칸. 두 단원 모두.
      오기 아님. 어휘만 중간값이 다름(core vs concept).
      "닮음 basic -> 셋째칸"은 pos 번호를 칸 순서와 반대로 읽으신 것입니다.
```

### ★그리고 72칸에는 `default_difficulty`를 쓸 일이 없습니다
```
닮음 카탈로그 87 엔트리 중 default_difficulty 보유 = 0 / 87
파일 자체가 pending 에 "default_difficulty" 를 올려두고 있음(미착수 항목)
엔트리 필드 = problem_type_id · grade · unit_id · unit_name · type_name · type_name_source
             · concept_ids · error_tags · response_formats · representation_types
             · problem_family_id · attested_item_ids · attested_in_sets · status
```
⇒ **72칸을 생성해도 기존 87종과 같은 필드 구성이면 되고, 그 안에 난이도 필드는 없습니다.**
⇒ 검수가 우려한 "방향이 뒤집혀 있으면 72칸이 전부 뒤집힌다"는 **발생하지 않습니다.** 채울 필드가 없기 때문입니다.

### 통계는 반례가 아니라 미결입니다 (정확히 구분)
```
통계 23종 = 전부 pos1(계산·해석) 하나뿐
그런데 default_difficulty 는 standard 8 / core 11 / advanced 4 로 갈림
```
pos 다양성이 0이라 **매핑을 시험할 수 없습니다**(반증도 입증도 아님). 다만 **pos 하나에 난이도 3값이 붙어 있다**는 사실은, 통계에서 이 필드가 다른 축으로 쓰였을 가능성을 보여줍니다. ⇒ **단원별 확인 후 사용**이라는 §17 단서가 필요한 이유입니다.

---

## 3. §1-③ +150 — 확정. 그리고 제 커밋 귀속을 정정합니다

### 🔴 먼저 정정
제출9 §1에서 커밋을 **틀리게 지목**했습니다.
```
✕ 제출9 서술   +519 = 1c51ace1(07-19) · +150 = fd0d740e(07-21)
○ 실제         +519 = 80cbaf13(2026-07-13) · +150 = 46c20f98(2026-07-19)
```
원인: manifest 이력을 **최신→과거 순으로 훑으면서 값이 바뀐 지점을 출력**했는데, 그러면 변경을 *도입한* 커밋이 아니라 *직전* 커밋이 찍힙니다. `git show fd0d740e`에서 13192가 변경줄(`+`)이 아니라 **문맥줄**로 나오는 것을 보고 발견했습니다.
★ **값(12523 / 13042 / 13192)과 산술은 전부 그대로입니다.** 귀속만 틀렸습니다.

### 정정된 이력 (시간순, manifest 커밋 46개 전수)
| 커밋 | 날짜 | ptc | uc | 커밋 제목 |
|---|---|---|---|---|
| `91d9f131` | 07-03 | (없음) | — | manifest 신설 |
| `7fd2953d` | 07-08 | **12523** | 35 | Add hybrid AI bridge |
| `80cbaf13` | 07-13 | **13042** | 39 | **Add Chunjae Ryu M3 textbook alignment metadata** |
| `46c20f98` | 07-19 | **13192** | 39 | **ingest M3 quadratic function worksheet set10 with 150 items** |

### ★+150의 출처 = 커밋 제목에 적혀 있습니다
```
46c20f98  "ingest M3 quadratic function worksheet set10 with 150 items"
          manifest problem_type_count  13042 -> 13192   (+150)
          그 학습지의 문항 수          150
```
**종수 자리에 문항 수를 더했습니다.** 가설이 아니라 커밋 제목이 근거입니다.
§7 함정 **"억제 건수 ≠ 카탈로그 종수"**와 같은 계열의 단위 혼동입니다.

### +519 커밋도 성격이 확인됩니다
`80cbaf13`이 추가한 feature 플래그:
```
m2_similarity_pythagoras_canonical_unit
m3_trigonometric_ratio_canonical_unit
m3_circle_properties_canonical_unit
m3_statistics_canonical_unit
```
**정확히 그 4단원**이고, 같은 커밋이 circle·statistics·trigonometric의 `source_manifest`(126/108/108 선언)를 신설했습니다. ⇒ **+519는 "이 4단원을 캐노니컬로 편입한다"는 선언의 산술 합계**입니다.

---

## 4. §1-④ 무결성 도구 — CHECK 7·8 추가 (3종 시험 완료)

```
CHECK 7  개념 증인   개념번호 == 슬롯번호 · 개념 max × 3 == 선언
CHECK 8  회계 대조   manifest 선언 총합 == index 실집계 + 절단 결손 합계
                     남는 값은 UNEXPLAINED 로 출력. 절대 흡수하지 않음
```

### 실행 결과 — 우리가 손으로 찾은 것을 도구가 자동 재현합니다
```
=== CHECK 8 : accounting reconciliation ===
  manifest declared total      : 13192
  actual in-index total        : 12788  (39 unit files; 1 excluded)
  truncation deficit (sum)     : 254
  unexplained remainder        : 150
  result: DOES NOT CLOSE - remainder is unaccounted for, do not absorb it
```
```
CHECK 7   M2_SIMILARITY_PYTHAGORAS  ok   (개념 max 59 × 3 = 177 = 선언)
          M3_CIRCLE_PROPERTIES      ok   (42 × 3 = 126)
          M3_TRIGONOMETRIC_RATIO    ok   (36 × 3 = 108)  ← 대조군
          M3_STATISTICS             FAIL (개념 max 25 × 3 = 75 != 선언 108)
```
★ **통계의 절단이 유형층보다 개념층에서 더 깊습니다.** 선언 36 base 중 개념은 25까지만 도달했습니다. (닮음·원의성질은 개념층이 온전한데 통계만 다릅니다 — 별도 조사 대상으로 등재해 두겠습니다.)

### 3종 시험
| 시험 | 입력 | 결과 |
|---|---|---|
| ① 정상 | 40단원 전수 | CHECK 2~6 결과 **불변**(3/3/6/3/0 = 회귀 통과) · CHECK 7 1건 · CHECK 8 remainder 150 |
| ② 실패 | 존재하지 않는 `-Repo` | `data dir not found` 명시적 실패, exit 1 |
| ③ 오판별 | `-Unit` 지정 | CHECK 8 **미출력**(부분 합계로 결론 내지 않음) |
| ③ 오판별 | manifest에 선언값 없음 | `SKIPPED (no declared total)` + WARN. **거짓 CLOSES 안 냄** |
| ③ 오판별 | 개념 번호 체계가 다른 3단원 | **초판이 허위 FAIL 3건**을 냈음 → `c4 ok`일 때만 판정하고, 불일치율 >50%면 **n/a + WARN**으로 격하하도록 수정 |

★ 마지막 항목을 기록합니다. **초판이 `H1_COMMON_MATH1_EQUATION_INEQUALITY`·`H1_COMMON_MATH1_POLYNOMIAL`·`M2_PROBABILITY`에 허위 FAIL을 냈습니다.** 이 세 단원은 유형당 개념을 여러 개 붙이는 다른 규약을 쓰는데, 초판이 그걸 결함으로 읽었습니다. 도구 초판이 슬롯 스킴을 전 단원에 가정했던 것과 **같은 실패**이고, 이번에도 시험 ③이 잡았습니다.

---

## 5. §3 경로 B — 제가 D1을 조회할 수 없습니다. 쿼리를 드립니다

```
/api/user-items/list 는 X-Write-Key 필요 (교사 전용)
Code탭은 키를 다루지 않습니다 → 조회 불가
```

`user_items` 테이블에 필요한 컬럼이 **전부 있습니다**(worker 스키마 확인):
```
question_no · problem_type_id · source_note · bulk_batch_id · difficulty · unit_id · unit_name
```

### 사용자께 요청 — Cloudflare D1 콘솔(또는 wrangler)에서 1회 실행
```sql
SELECT bulk_batch_id, question_no, problem_type_id, difficulty, source_note
FROM user_items
WHERE unit_id = 'M2_SIMILARITY_PYTHAGORAS'
ORDER BY bulk_batch_id, CAST(question_no AS INTEGER);
```
결과를 CSV/JSON으로 내려 주시면 **87종 base와 기계 대조**해 base 충돌 후보를 뽑겠습니다.
★ PDF가 없어도 이 경로로 진행됩니다(판정 12차 §3 "PDF를 기다리느라 멈추지 마십시오").

---

## 6. 회신 요청

| # | 사안 | Code탭 권고 |
|---|---|---|
| A | §5 방향 = 동일 확인. `default_difficulty`는 72칸에 **쓰지 않음**(기존 87종도 없음) | 확인 요청 |
| B | 통계 개념층 절단(개념 max 25 vs 선언 36 base) — 별건 등재 | 등재 |
| C | 경로 B용 D1 쿼리 결과 — 사용자 실행 필요(§5) | 요청함 |
| D | `m2_similarity_pythagoras.source_manifest.v1.json` 부재 확정(git 0건). 다른 3단원은 존재하며 `concept_count×3` 선언을 담고 있음 | 기록 |

---

## 7. 측정 재현

```
개념 증인       problem_types[].concept_ids 의 숫자 꼬리 vs ceil(PT번호/3)
                결번 = 1..max 중 참조되지 않은 번호
선언 원문       data/sources/{m3_circle_properties,m3_statistics,m3_trigonometric_ratio}
                .source_manifest.v1.json  concept_count / aligned_problem_type_count
manifest 이력   git log --reverse -- .../manifest.json  (46커밋 전수, 시간순)
도구            powershell -File tools\axis_prediction\check_catalog_integrity.ps1
                CHECK 7 = 개념 증인 · CHECK 8 = 회계 대조
```
