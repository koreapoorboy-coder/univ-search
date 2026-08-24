# Code탭 회신 — 원의 성질 46칸 삽입 완료 (판정 55차 실행 보고)

2026-08-24 · 검수 판정 55차 (가) 승인 실행분

---

## 0. 결론

```
★46칸 삽입 완료.  47 -> 93.  검증 전항 통과
★BOM 확인 결과 = 원본에 BOM 없음.  UTF8Encoding($false) 가 맞았고 그대로 진행함
★역산 = 도구 내부(메모리) + Code탭 독립(디스크·백업 대조) ★둘 다 바이트 동일
★catalog_short 47 -> 93 재생성 완료
★무결성 재실행: entry 93 / decl 126 · C2,C5 FAIL 유지 (판정 55차 사전판정대로 정상)
★31슬롯 전부 filled=3 달성.  표 산출 완료 (판단 없음)
손대지 않은 것: EMPTY_SLOT 33칸 · 미등재 13종 · axis_map · raw_taxonomy · decl 126 · D1
```

---

## 1. 회신 항목 1 — 엔트리 수 · `problem_type_count`

```
카탈로그      public/math-weakness-engine/data/problem_types/m3_circle_properties.problem_types.v1.json
엔트리 수     47 -> ★93
problem_type_count   47 -> ★93        (도구가 count 행을 축자 치환)
decl(정식)    126 ★그대로. 낮추지 않았습니다
```

도구 출력
```
[tmpl] M3_CIRC_PT003   block 718 chars   indent 26
entries before : 47      entries to add : 46
template : M3_CIRC_PT003  fields 8
  (problem_type_id,unit_id,unit_name,type_name,type_name_source,concept_ids,default_difficulty,error_tags)
vary  : problem_type_id,type_name,default_difficulty,concept_ids
const : unit_id,unit_name,type_name_source,error_tags

VERIFY
  1 parse             : ok
  2 count             : 47 -> 93
  3 field set/order   : ok (8 fields, template order)
  3 constant fields   : ok (byte-equal to template)
  3 concept_ids shape : ok (1-element array)
  4 U+FFFD            : 0
  5 reversal          : ok (untouched bytes identical)
backup: .../\_backup/m3_circle_properties.problem_types.v1.json.pre-add-46entries
written: .../m3_circle_properties.problem_types.v1.json
```

---

## 2. 회신 항목 2 — 역산 · BOM · 파일 바이트 수

### 2-1. ★BOM 확인 (판정 55차 지시)

```
삽입 전 첫 3바이트   7b 0d 0a       = '{' CR LF
삽입 후 첫 3바이트   7b 0d 0a       ★동일
EF BB BF 여부        ★없음 (전·후 모두)
⇒ 도구의 UTF8Encoding($false) 가 이 파일에 맞습니다. 코드 변경 불요
⇒ 사라진 BOM 3바이트 없음 (애초에 없었으므로)
참고  닮음 카탈로그도 7b 0d 0a 로 BOM 없음 — 같은 계열입니다
```

★**지적이 정확했습니다.** 역산은 메모리 문자열끼리 비교하므로 BOM 유무를 구조적으로 못 봅니다.
BOM 이 있었다면 dry-run 통과와 무관하게 조용히 3바이트가 사라졌을 것입니다.

### 2-2. 파일 바이트 수

| 시점 | 바이트 | 비고 |
|---|---:|---|
| 삽입 전 | **36,398** | |
| 삽입 후 | **71,482** | +35,084 |
| 백업 `pre-add-46entries` | **36,398** | ★삽입 전과 동일 |
| ★디스크 역산 결과 | **36,398** | ★백업과 바이트 동일 |

### 2-3. 역산 — 두 경로 모두 통과

```
① 도구 내부 (메모리)
   삽입 블록을 들어내고 count 행 복원 -> 원본 문자열과 -cne 비교
   결과 : ok (untouched bytes identical)

② ★Code탭 독립 검증 (디스크 · 백업 대조)
   삽입된 파일을 다시 읽어 46블록을 들어내고 count 93->47 복원
   들어낸 블록 : 46 / 46
   역산 34,350자  vs  백업 34,350자
   문자열 동일(-ceq) : True
   ★바이트 동일       : True   (36,398 vs 36,398 바이트)
```
★②는 도구를 신뢰하지 않고 **결과물만 보고** 다시 계산한 것입니다.
도구가 "ok"를 잘못 출력하는 경우까지 걸러집니다.

### 2-4. 인코딩 부수 검사

```
U+FFFD (efbfbd)   0건
CRLF              1,310행
★단독 LF          0        (개행 혼입 없음)
```

### 2-5. ★git diff 가 삭제 151행을 보고합니다 — 데이터 손실이 아닙니다

```
git diff --numstat   795 추가 / ★151 삭제
```
순수 삽입이면 삭제는 count 행 1개여야 하므로 **확인이 필요한 수치입니다.**
단정하지 않고 직접 검사했습니다.

```
원인   삽입 블록이 기존 블록과 대부분 같은 줄을 공유합니다
       (unit_id · unit_name · type_name_source · error_tags · 괄호·들여쓰기 전부 동일)
       git 의 LCS 정렬이 공유 줄을 서로 짝지어 버리고, 구별되는 4줄
       (problem_type_id · type_name · concept id · default_difficulty)만
       delete+add 쌍으로 표시합니다. ★표시 방식의 문제이고 순증 행수는 맞습니다
```

**직접 검증 (백업 vs 현재, 객체 단위 전수 대조)**
```
백업 엔트리 47 · 현재 엔트리 93
★기존 47종 중 사라진 것        : 0
★기존 47종의 필드 값이 바뀐 것 : 0        (8필드 전건 -cne 비교, 배열은 원소 결합 비교)
★순증 엔트리                   : 46
93종 전체 concept_ids 원소 != 1 : 0
93종 전체 error_tags 비배열     : 0
```
★이미 §2-3 의 바이트 동일 역산이 같은 사실을 증명합니다 —
원본 행이 하나라도 지워졌다면 46블록을 들어낸 결과가 백업과 바이트 동일할 수 없습니다.
★**diff 를 눈으로 볼 검수를 위해 미리 적어 둡니다.**

---

## 3. 회신 항목 3 — `catalog_short` 실제 숫자

```
도구   make_catalog_short.ps1 -Unit M3_CIRCLE_PROPERTIES
출력   OK  M3_CIRCLE_PROPERTIES  types=93  -> M3_CIRCLE_PROPERTIES.catalog_short.v1.json
```

| 항목 | 재생성 전 | 재생성 후 |
|---|---:|---:|
| `count` 필드 | 47 | **93** |
| `types` 원소 수 | 47 | **93** |
| distinct `problem_type_id` | 47 | **93** |
| 파일 크기 | 9,961 바이트 | **19,392 바이트** |

신규 포함 확인 (표본): `PT001` True · `PT043` True · `PT124` True

★**닮음에서 87 에 정지해 있던 그 파생본이 이번에는 따라왔습니다.**
무결성 CHECK 10(카탈로그 vs short 대조)이 이를 독립 확인합니다 — §4.

---

## 4. 회신 항목 4 — `check_catalog_integrity.ps1`

전문은 `B_circle_integrity_after46.v1.txt` (134행)에 등재했습니다. 요지는 아래입니다.

### 4-1. 원의 성질 행 — 파일 전체에서 이 한 줄이 전부입니다

```
unit_id                             entry  maxId   decl  base*3   conc verdict
M3_CIRCLE_PROPERTIES                   93    126    126      93     31 FAIL C2,C5
```
★**C2,C5 FAIL 은 판정 55차 사전판정대로 정상입니다.**
```
C2  entry 93 != decl 126     -> 33칸이 남아 있다는 사실의 정확한 보고
C5  maxId 126 > entry 93     -> 같은 사실의 다른 표현
★decl 을 93 으로 낮추거나 count 를 126 으로 올리지 않았습니다
```
★**경고 59건 어디에도 M3_CIRCLE_PROPERTIES 가 없습니다.** 새로 만든 경고가 0건입니다.

### 4-2. 이번 삽입이 걸릴 수 있었던 검사들 — 전부 통과

```
CHECK 1  manifest 경로 존재        0 dangling / 384 경로
CHECK 6  slot integrity broken     ★0
CHECK 7  concept/slot 번호 불량    ★0        (슬롯번호 = 개념번호 유지)
CHECK 9  ★PS 배열 원소 오염        ★0 contaminated fields
         = concept_ids(원소 1개) · error_tags(빈 배열)가 ★스칼라로 붕괴하지 않았다
           승인 조건 ①의 목적이 바로 이것이었고, 그 목적이 달성됐습니다
CHECK 10 카탈로그 vs short drift    ★0        (93 = 93 확인)
```

### 4-3. 전역 요약 (이번 작업과 무관한 기존 상태)

```
=== SUMMARY : units audited 40 ===
  CHECK 2 declared-count mismatch : 3
  CHECK 3 declared not /3         : 3
  CHECK 4 concept 1:1 broken      : 6
  CHECK 5 truncated (maxId>entry) : 3
  CHECK 6 slot integrity broken   : 0
  CHECK 7 concept/slot number bad : 0
  CHECK 9  array-member contamination : 0 unit(s)
  CHECK 10 catalog/short drift        : 0
CHECK 8  accounting DOES NOT CLOSE - remainder 150   ← ★기존 이상값. 손대지 않았습니다
```
★CHECK 8 의 remainder 150 과 axis_map 의 `total_pt = 0` 은 판정 55차대로 **증거물로 남깁니다.**

---

## 5. 회신 항목 5 — ★31슬롯 완비 표

산출 `B_circle_slot_complete_31.v1.csv` (31행)
컬럼: `slot · concept_id · base_name · pos0_pt · pos0_type_name · pos1_pt · pos1_type_name · pos2_pt · pos2_type_name · filled`

```
★31슬롯 전부 filled = 3.  filled != 3 인 슬롯 0개
```

| slot | concept | base_name | pos0 | pos1 | pos2 |
|---:|---|---|:-:|:-:|:-:|
| 1 | C001 | 원의 중심과 현의 수직이등분선(1) | O | O | O |
| 5 | C005 | 현의 길이(1); 중심에서 같은 거리의 두 현 | O | O | O |
| 7 | C007 | 원의 접선과 반지름 | O | O | O |
| 8 | C008 | 원의 접선의 성질(1) | O | O | O |
| 9 | C009 | 원의 접선의 성질(2); 길이 | O | O | O |
| 11 | C011 | 원의 접선의 성질의 활용 | O | O | O |
| 12 | C012 | 삼각형의 내접원 | O | O | O |
| 13 | C013 | 직각삼각형의 내접원 | O | O | O |
| 15 | C015 | 원에 외접하는 사각형의 성질(2); 한 내각이 90˚인 경우 | O | O | O |
| 16 | C016 | 원에 외접하는 사각형의 성질의 활용(1); 직사각형 | O | O | O |
| 17 | C017 | 원에 외접하는 사각형의 성질의 활용(2); 그 외 | O | O | O |
| 18 | C018 | 원주각과 중심각의 크기(1) | O | O | O |
| 21 | C021 | 원주각의 성질(1); 한 호 | O | O | O |
| 22 | C022 | 원주각의 성질(2); 반원 | O | O | O |
| 23 | C023 | 원주각과 삼각비의 값(1) | O | O | O |
| 24 | C024 | 원주각과 삼각비의 값(2); 선분의 길이, 넓이 | O | O | O |
| 25 | C025 | 원주각의 크기와 호의 길이(1) | O | O | O |
| 26 | C026 | 원주각의 크기와 호의 길이(2) | O | O | O |
| 27 | C027 | 원주각의 크기와 호의 길이(3) | O | O | O |
| 28 | C028 | 네 점이 한 원에 있기 위한 조건 | O | O | O |
| 29 | C029 | 원에 내접하는 사각형의 성질(1) | O | O | O |
| 30 | C030 | 원에 내접하는 사각형의 성질(2) | O | O | O |
| 31 | C031 | 원에 내접하는 사각형과 외각의 성질 | O | O | O |
| 32 | C032 | 원에 내접하는 다각형 | O | O | O |
| 33 | C033 | 두 원에서 내접하는 사각형의 성질의 활용 | O | O | O |
| 36 | C036 | 접선과 현이 이루는 각; 원주각 | O | O | O |
| 38 | C038 | 접선과 현이 이루는 각의 활용(1); 현이 중심을 지나지 않는 경우 | O | O | O |
| 39 | C039 | 접선과 현이 이루는 각의 활용(2); 현이 중심을 지나는 경우 | O | O | O |
| 40 | C040 | 접선과 현이 이루는 각의 활용(3); 한 점에서 원에 그은 두 접선 | O | O | O |
| 41 | C041 | 두 원에서 접선과 현이 이루는 각(1) | O | O | O |
| 42 | C042 | 두 원에서 접선과 현이 이루는 각(2); 한 원이 다른 원의 내부에 있는 경우 | O | O | O |

★3칸의 `type_name` 축자 전문은 CSV 에 있습니다. 위 표는 점유 여부만 표시한 것입니다.
★**판단하지 않았습니다.** 44 != 42 에 대해 어떤 해석도 적지 않았습니다.

---

## 6. 손대지 않은 것

```
✔ EMPTY_SLOT 11개 33칸   슬롯 2,3,4,6,10,14,19,20,34,35,37.  PT 4~12,16~18,28~30,
                          40~42,55~60,100~105,109~111 은 여전히 결번입니다
✔ 미등재 13종            건드리지 않았습니다
✔ axis_map               판정 55차 ①대로 무접촉. n_pt=47 · total_pt=0 그대로
✔ raw_taxonomy (54)      열지 않았습니다
✔ decl 126               낮추지 않았고 count 를 126 으로 올리지도 않았습니다
✔ CHECK 8 remainder 150  증거물로 남겼습니다
✔ add_catalog_entries.ps1  무수정 ((나) 기각 준수)
✔ D1                     접근 없음
```

---

## 7. 산출 · 변경 파일

### 변경 (데이터)
```
public/math-weakness-engine/data/problem_types/m3_circle_properties.problem_types.v1.json
    47 -> 93 엔트리 · problem_type_count 93 · 36,398 -> 71,482 바이트
public/math-weakness-engine/data/problem_types_short/M3_CIRCLE_PROPERTIES.catalog_short.v1.json
    count 47 -> 93 · 9,961 -> 19,392 바이트
public/math-weakness-engine/data/problem_types/_backup/
    m3_circle_properties.problem_types.v1.json.pre-add-46entries   36,398 바이트 (롤백본)
```

### 신규 (도구·기록)
```
tools/axis_prediction/add_catalog_entries_by_template.ps1     신규 도구 (판정 55차 승인)
tools/axis_prediction/B_circle_add46_patch.v1.json            46건 패치 (실행 입력)
tools/axis_prediction/B_circle_slot_complete_31.v1.csv        31슬롯 완비 표
tools/axis_prediction/B_circle_integrity_after46.v1.txt       무결성 전문 134행
tools/axis_prediction/B_circle_add46_blocker_and_dryrun.v1.md 보류 경위 + dry-run 기록
tools/axis_prediction/B_circle_add46_applied.v1.md            이 문서
```

### 롤백 방법
```
Copy-Item public\math-weakness-engine\data\problem_types\_backup\m3_circle_properties.problem_types.v1.json.pre-add-46entries `
          public\math-weakness-engine\data\problem_types\m3_circle_properties.problem_types.v1.json -Force
powershell -File tools\axis_prediction\make_catalog_short.ps1 -Unit M3_CIRCLE_PROPERTIES
★백업이 삽입 전과 바이트 동일함을 §2-3 에서 확인했으므로 그대로 되돌아갑니다
```

## 8. 다음 (검수 판정 대기)

```
1  이 보고 검수 -> 커밋 승인
2  ★44 != 42 판단 — 31슬롯 완비 표본이 이제 있습니다 (판정 53차가 "그때 본다"고 한 시점)
   진입점 = B_circle_slot_complete_31.v1.csv + raw_taxonomy 54
3  EMPTY_SLOT 33칸 · 미등재 13종 — 판정 대기
★Code탭은 지시 없이 위 어느 것도 열지 않습니다
```
