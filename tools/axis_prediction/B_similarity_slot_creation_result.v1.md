# 제출18 — 빈 슬롯 4개 생성 완료 · 재대조 결과

발신 Code탭 · 수신 검수 · 2026-08-21
회신 대상: **검수 판정 20차** (§0 승인 · §2 기록 · §3 pos 통일 · §4-1 등재 · §5 범위 · §7 보고항목)

---

## 0. 한 줄

```
4엔트리 생성 완료. NEWLABEL 35 -> 21 로 14건 전부 흡수.
연쇄 밀림은 풀리지 않았습니다. BASE 는 103 -> 104 로 하나 늘었고, 그 정체를 §3 에 적었습니다.
```

---

## 1. 생성 — 87 -> 91

```
파일    data/problem_types/m2_similarity_pythagoras.problem_types.v1.json
방식    ★전량 재직렬화 안 함. 텍스트 서지컬 삽입
        (ConvertTo-Json 왕복은 단일원소배열을 언랩시켜 손대지 않은 엔트리를 깨뜨립니다.
         실제로 response_formats 는 87종 중 22종이 단일원소입니다)
도구    add_catalog_entries.ps1 (신설. ASCII 전용 · 192행 · 자기검사 보유)
백업    tools/axis_prediction/_backup/...pre-add-4entries
sha256  3E56298B...D1D45F19E  ->  41E952F1...B9D73E9
```

### 1-1. 도구 내장 검증 5항 — 전항 통과
```
1 파싱          ok
2 엔트리수      87 -> 91  (count 필드도 87 -> 91)
3 필드 구성     14필드 · 기준 엔트리와 동일 순서
4 U+FFFD        0
5 ★역산         삽입 블록을 도로 들어내고 count 를 되돌리면 원본과 바이트 동일
```
★ 5번이 핵심입니다. "새로 넣은 것 말고는 아무것도 안 움직였다"를 **증명**합니다.
실패 시 자동 복원하도록 만들었고, 실제로 dry run 을 먼저 돌린 뒤 썼습니다.

### 1-2. 독립 검증 (도구 자기보고가 아님)
```
git diff --stat   77 insertions(+), 1 deletion(-)
                  = 4엔트리 x 19행 + count 1행 추가 / count 1행 삭제
삭제된 행 전량    "    "problem_type_count":  87,"  한 줄뿐
grep 엔트리수     91
U+FFFD (bash)     0
```
★ 기존 87종은 **한 줄도 바뀌지 않았습니다.**

### 1-3. 도구 3종 시험
```
① 정상 통과   dry run -> 5항 통과 -> 실제 쓰기 동일 결과
② 실패        없는 경로 / insert_before 앵커 부재 / 이미 존재하는 PT
               -> 각각 "input not found" · "REFUSED: successor not found" ·
                  "REFUSED: ... already exists in catalog"
③ 오판별      ★다른 단원 카탈로그(h1_common_math1_counting)를 물림
               -> "REFUSED: catalog field set differs ... catalog=...,course,..."
               조용히 삽입하지 않고 필드 구성 차이로 거부합니다
```

---

## 2. ★생성만으로는 아무것도 안 바뀝니다 — 맵의 출처를 확인했습니다

생성 직후 재대조를 돌렸더니 **결과가 한 글자도 안 바뀌었습니다**(718/333/103/35/11).
원인을 찾았습니다.

```
compare_pdf_label_to_assignment.ps1 의 라벨->슬롯 맵은
  ★인제스트 문항은행(set04/set09)에서만 만들어집니다.  카탈로그를 보지 않습니다
그런데 신규 4종은 set01~03 에만 인쇄된 유형이라 문항은행에 표본이 0건입니다
=> 카탈로그에 엔트리를 만들어도 영원히 NEWLABEL 로 남습니다
```

제출17 §5-2 에 "라벨→슬롯 맵 갱신(67→71)"이라고 적었던 단계가 **자동으로 되는 일이 아니었습니다.**

### 2-1. 해결 — `type_name_source` 가 여기서 일합니다
```
type_name_source = worksheet_label 인 엔트리는 base 이름이 곧 인쇄 라벨입니다
따라서 그 엔트리는 스스로 맵에 들어갈 수 있습니다. 추론이 아니라 문자열 동일성입니다
```
`compare_pdf_label_to_assignment.ps1` 에 시드 블록을 추가했습니다.
문항은행 맵을 먼저 만들고, **거기에 없는 라벨만** worksheet_label 엔트리로 보충합니다
(이미 매핑된 라벨은 건드리지 않고, 슬롯이 충돌하면 WARN 을 냅니다).

```
실측  라벨->슬롯 = 71 (문항 은행 67 + 카탈로그 worksheet_label 4)
```

★ 판정 20차 §4-1 이 "이름의 출처가 다르면 표식도 달라야 한다"고 한 것이, 표기 문제가 아니라
**대조가 동작하느냐 마느냐의 문제**였습니다. `variant_bank` 로 찍었으면 여기서 막혔습니다.
값 정의를 `ISSUE_type_name_source_values.v1.md` 에 등재했습니다(§4-1 요구).

### 2-2. 도구 회귀 — ★확장이 구 데이터에 무동작임을 증명
```
구 카탈로그(백업 87종)로 확장 도구 실행
  라벨->슬롯 = 67 (문항은행 67 + 카탈로그 worksheet_label 0)
  OK 718 / CELL 333 / BASE 103 / NEWLABEL 35 / NOID 11
후보 CSV sha256  74326716...1D81F996
제출14 채택본     74326716...1D81F996   ★바이트 동일
```

---

## 3. §7 보고 항목

### ① 연쇄 밀림 45→47→48→50 — ★풀리지 않았습니다
```
BASE 슬롯쌍 분포        생성 전    생성 후
  45 -> 47                8         8
  47 -> 48                9         9
  49 -> 50                6         6
  45 -> 50                2         2
  44 -> 46                0         1   <- 신규(§3-② 참조)
```
**전부 그대로입니다.** 그리고 원인을 보면 풀릴 수가 없었습니다.

```
연쇄를 이루는 행들의 슬롯쌍에 46 이 한 번도 등장하지 않습니다
(45→47 · 47→48 · 49→50 · 45→50)
따라서 슬롯 46 생성은 이 행들에 닿을 수 있는 경로가 없습니다
```
★ 인계문 §3 의 **"②는 빈 슬롯 46이 비어서 생긴 밀림으로 보인다"는 가설은 지지되지 않습니다.**
이번 조치로는 검증이 안 되는 게 아니라, **구조적으로 이 조치와 무관한 현상**입니다. 별도 원인 규명이 필요합니다.

### ② 생성 전후 BASE 차이 — 사라진 것 0 · 생긴 것 1
```
BASE  103 -> 104
```
```
사라진 좌표   없음
생긴 좌표     SCSTUDY-2026-08-18-m2-simpy-02  q092
              assigned 슬롯44 "닮은 평면도형의 넓이비"
              expected 슬롯46 "닮은 두 입체도형의 겉넓이의 비"
              DIFF-family (평면 vs 입체)
```
★ **생성이 무언가를 깬 것이 아닙니다.** 이 문항은 생성 전 NEWLABEL, 즉 "판정 불가" 통에 있었습니다.
슬롯 46 이 생기면서 판정이 가능해졌고, **평면↔입체 base 오배정이 드러난 것**입니다.
숨어 있던 오류가 보이게 된 것이지 새로 생긴 오류가 아닙니다.

### ③ NEWLABEL 35 -> 21 — 14건 전량 흡수 확인
```
바뀐 행   정확히 14행 (들어온 14 / 나간 14)
나머지    468행 무변경.  ★기존 판정이 뒤집힌 행은 0건입니다
흡수 내역 CELL 13건 + BASE 1건.  ★OK 는 0건
```
**OK 가 0건인 것이 정상입니다.** 이번 작업은 카탈로그에 자리를 만든 것이고,
D1 의 배정 자체는 아직 이웃 슬롯을 가리키고 있습니다. 재배정은 다음 단계(§7-6)입니다.

### ④ 슬롯 6·46 양방향 밀림 — 진단은 해소, 데이터는 그대로
```
슬롯 6   assigned 5(2건) · 7(3건)  ->  expected 6   전부 CELL same-family
슬롯 46  assigned 47(2건) · 44(1건) ->  expected 46  CELL 2 · BASE 1
```
양쪽 이웃으로 갈렸던 배정이 **하나의 목표 슬롯을 가리키게 됐습니다.**
판정 20차 §2 의 "밀림은 칸을 보존한다"가 양방향으로 다시 확인됩니다.
다만 **D1 배정값은 바뀌지 않았습니다.** 진단이 맞아진 것이지 데이터가 고쳐진 게 아닙니다.

### ⑤ 새로 생긴 BASE — 1건. §3-② 에 적었고, 생성 부작용이 아닙니다

### 전후 요약
```
             생성 전   생성 후    차이
OK             718      718        0
CELL           333      346      +13
BASE           103      104       +1
NEWLABEL        35       21      -14
NOID            11       11        0
OK share      0.598    0.598        0
라벨->슬롯      67       71       +4
```

---

## 4. 판정 20차 §2 요구 — 근거 강도 기록

`B_simpy_new_slot_entries_4.v1.csv` 에 컬럼 2개를 추가했습니다.
```
distinct_neighbour_bases   서로 다른 이웃 base 의 수 (건수가 아니라 이것을 셉니다)
pos_basis_strength         strong_bidirectional | weak_single_pt_observation
```
```
슬롯 6   이웃 base 2종(슬롯5·7)   strong_bidirectional
슬롯 46  이웃 base 2종(슬롯44·47) strong_bidirectional
슬롯 31  이웃 base 1종(슬롯28)    weak_single_pt_observation
슬롯 36  이웃 base 1종(슬롯37)    weak_single_pt_observation
```
★ 슬롯 31·36 은 **문항 2건·4건이지만 독립 관측은 1건**입니다. 07-10 투입 시 재확인 대상으로 남깁니다.

---

## 5. 판정 20차 §3 — pos 표기 전수 점검 결과

★ **불일치 2곳 발견. 지시대로 고치지 않고 목록으로 보고합니다.**

### 5-1. 도구 — 위험 없음
```
pos 를 계산하는 .ps1 이 ★한 곳도 없습니다.  전부 slot 만 씁니다 (Ceiling(n/3))
check_catalog_integrity.ps1:179 의 "% 3" 은 델타의 나눗셈 검사이고 pos 가 아닙니다
=> 도구 출력에는 pos 표기 문제가 존재하지 않습니다
```

### 5-2. CSV — 전부 표준
```
B_simpy_missing_cells_72.v1.csv        72/72 이 (PT-1)%3.  PT%3 매칭 0건
B_simpy_new_slot_entries_4.v1.csv      표준
B_simpy_new_slot_requiring_items_14.v1.csv  표준
```

### 5-3. 문서 — ★2곳이 PT mod 3 체계
```
HANDOFF_B_CATALOG_TRUNCATION.v1.md:41
  "통계는 23종 전부 pos 2(계산·해석)"
  통계 PT 는 3n-1 이므로 표준으로는 pos1 입니다. mod 3 이면 2 입니다
  ★같은 리포의 B_similarity_pathB_toolset.v1.md:25 는 "PT(3n-1), 즉 pos1" 로 표준을 씁니다.
    두 문서가 같은 대상을 다른 숫자로 부르고 있습니다

HANDOFF_B_CATALOG_TRUNCATION.v1.md:277
  "슬롯13 → pos1 '… - 개념·조건 판별' · pos0 '… - 복합 계산·증명'"
  ★접미사 대응이 뒤집혀 있습니다. 표준은 pos0=개념·조건 판별 / pos2=복합 계산·증명
```
표준을 쓰는 것으로 확인된 곳:
```
B_similarity_concept_witness.v1.md:80-82      첫째(pos0) 3n-2 / 둘째(pos1) 3n-1 / 셋째(pos2) 3n
B_similarity_empty_slot_inference.v1.md:150-152
B_similarity_manifest_and_dplan.v1.md:235-236  PT006 slot2 pos2 · PT010 slot4 pos0
HANDOFF_B_SIMPY_REASSIGN.v2.md §1-2
```

### 5-4. §3-① 요구 — 표준 pos 목록 재생성
```
B_simpy_catalog_pos_standard.v1.csv     91행
컬럼  problem_type_id, slot, pos, suffix, base_name, type_name_source, concept_ids
검증  pos <-> 접미사 1:1 유지  pos0 25 · pos1 41 · pos2 25 = 91
      (생성 전 24/39/24 = 87 에서 +1/+2/+1)
```
★ 검수 보유 "제출12 별첨 87종 목록"은 리포에 없습니다. 이 파일이 그 갱신본입니다(현재 91종).

---

## 6. 판정 20차 §5 — `representation_types` 오염 범위

★ **범위가 좁습니다. 40단원 중 1개 파일, 1개 필드입니다.**

```
스캔 대상   data/problem_types/*.problem_types.v1.json  40개 파일
마커        Count · IsFixedSize · IsReadOnly · IsSynchronized ·
            Length · LongLength · Rank · SyncRoot
```
```
오염 파일   m2_similarity_pythagoras.problem_types.v1.json  ← 1개뿐
오염 필드   representation_types  ← 1개뿐
            오염 원소 528개 = 66엔트리 x 8개.  정상 원소 91개
```
### 6-1. §5-② 요구 — 다른 배열 필드 확인
```
concept_ids          오염 0   (애초에 배열이 아니라 문자열입니다)
error_tags           오염 0   (91/91 null)
response_formats     오염 0
attested_item_ids    오염 0
attested_in_sets     오염 0
```
### 6-2. 데이터 트리 전역 확인
```
data/ 전체에서 마커 검색 -> problem_types/ 밖에는 0건
problem_types_short · source_item_bank · source_item_links · coverage · axis_map  전부 0건
```
★ 즉 **"같은 스크립트가 만든 다른 파일도 같은 상태"는 아니었습니다.** 이 파일 이 필드 한정입니다.

### 6-3. §5-③ 요구 — CHECK 9 신설
```
아직 안 만들었습니다. 수정 판정 전에 검사부터 넣을지, 수정과 함께 넣을지 지시해 주십시오
★신규 4종은 [] 이라 결함을 상속하지 않았습니다(확인 완료)
```

---

## 7. ★판정 필요 — 파생 산출물이 정지해 있습니다

생성으로 카탈로그가 91이 됐는데, 파생 산출물이 87에 멈춰 있습니다.
**승인 범위 밖이라 손대지 않았습니다.**

```
data/problem_types_short/M2_SIMILARITY_PYTHAGORAS.catalog_short.v1.json
  엔트리 87 · "count": 87
  재생성 도구 있음 -> tools/axis_prediction/make_catalog_short.ps1
```
```
요청  재생성할지, 별건으로 둘지 판정해 주십시오
      ★같은 커밋에 넣는 편이 낫다고 봅니다. 카탈로그와 축약본이 서로 다른 종수를 말하는
        상태로 커밋이 남으면, 나중에 어느 쪽이 정본인지 다시 다투게 됩니다
```
그 밖에 `coverage_note`("87 types attested by set04+set09")와 `pending` 문구도 87 기준입니다.
문장이 거짓이 된 것은 아니어서(그 87종에 대한 서술은 여전히 참) 손대지 않았습니다. 판정해 주십시오.

---

## 8. 산출물

```
data/problem_types/m2_similarity_pythagoras.problem_types.v1.json   87 -> 91  ★유일한 데이터 수정
tools/axis_prediction/_backup/...pre-add-4entries                   백업

add_catalog_entries.ps1                       신설 도구
_patch_simpy_new_slots_4.v1.json              값 패치(UTF-8)
compare_pdf_label_to_assignment.ps1           worksheet_label 시드 블록 추가
ISSUE_type_name_source_values.v1.md           §4-1 값 정의 등재
B_simpy_catalog_pos_standard.v1.csv           91행 · §3-① 표준 pos 목록
B_simpy_assignment_candidates.v2.csv          482행 · 재대조 후보
B_simpy_base_candidates_104.v2.csv            104행 · BASE 후보(좌표 완비)
B_simpy_compare_report.v2.txt                 재대조 리포트 원문
B_simpy_new_slot_entries_4.v1.csv             근거 강도 컬럼 추가(§2)
```

---

## 9. 커밋

```
지시   미push 커밋 위에 하나만 쌓을 것
이행   이번 작업 전량을 커밋 1개로 묶었습니다.  origin/main 대비 ahead 3
```

---

## 10. 다음

```
Code탭 대기
  1  파생 산출물 재생성 판정 (§7)
  2  representation_types 수정 착수 판정 · CHECK 9 시점 (§6-3)
  3  pos 표기 불일치 2곳 정정 판정 (§5-3)  ★조용히 고치지 않았습니다

검수 판정 대기
  4  BASE 104건 후보 판정 -> 재배정안
  5  라벨 vs 풀이법 불일치율 (set06 150행 송부분)

원인 미규명
  6  ★연쇄 밀림 45→47→48→50.  슬롯 46 가설이 기각됐으므로 새 가설이 필요합니다
```
