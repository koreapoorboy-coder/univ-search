# Codex 인계문 — 수학 진단엔진 프로젝트 합류 안내

작성 2026-08-24 · 대상: GPT Codex (신규 합류) · 작성자: Claude Code탭

> **이 문서만 읽고 시작할 수 있게 썼습니다. §0 → §1 → §6 순으로 읽고, 나머지는 필요할 때 찾아보십시오.**
> ★§6(함정)은 반드시 읽으십시오. 전부 이 프로젝트에서 실제로 밟은 것들입니다.

---

## 0. 가장 먼저 — 경로와 역할

### 0-1. ★리포 위치 (이것부터 확인)

```
정본   C:\Users\user\projects\scshstudy          ← ★여기. git 루트. 커밋 4,468
함정   C:\Users\user\OneDrive\바탕 화면\scshstudy  ← ★열지 마시오. 321커밋 뒤처진 사본
```

★**두 폴더 다 git 리포이고 이름이 같습니다.** OneDrive 쪽은 은퇴 대상인데 아직 남아 있습니다.
★**하위폴더로 링크하지 마십시오.** `public\math-weakness-engine` 만 잡으면
작업물 370여 개가 있는 `tools\axis_prediction` 이 안 보이고 git 커밋도 안 됩니다.

```
scshstudy\
├── public\math-weakness-engine\   엔진 데이터 (카탈로그·개념·규칙·처방·워커)
├── tools\axis_prediction\         ★작업 산출물·도구 370여 개. 판정 이력 전부 여기
├── docs\
└── admission_worker_skeleton\     (다른 프로젝트. 건드리지 않음)
```

### 0-2. 역할 구조

```
사용자    유일하게 ★D1 에 쓸 수 있는 주체. 브라우저 화면·SQL 콘솔 실행
검수      GPT 채팅. 판정을 내린다. ★리포 접근 없음 — 파일을 받아서 본다
Code탭    Claude. 리포 작업·도구 제작·검산. ★D1 쓰기 불가
Codex     ★신규. 아래 §7 참조
```

★**중요**: 검수는 리포를 못 봅니다. 넘길 파일은 `C:\Users\user\Downloads\` 에 복사해서
사용자가 전달합니다. 받는 것도 같은 경로입니다.

### 0-3. 작업 리듬

```
① 검수가 지시·요청을 낸다 (판정 N차)
② Code탭/Codex 가 조사·산출물 제작. ★데이터 변경은 승인 전까지 하지 않는다
③ 산출물을 Downloads 에 놓고 사용자가 검수에 전달
④ 검수가 재검산 후 승인 → 그때 쓰기·커밋
★승인 조건은 ★문자 그대로 지킵니다. 조건이 지목한 도구가 안 맞으면
  "이유는 충족한다"고 넘어가지 말고 ★멈추고 보고합니다 (판정 55차에서 이 판단이 옳았음)
```

---

## 1. 이 프로젝트가 무엇인가

**목적**: 학생이 새 문제와 풀이를 올렸을 때 **어디서 막혔는지 판정하는 진단 엔진**을 만드는 것.
문제은행을 키우는 게 아닙니다. 문항은 **판단 기준을 만들기 위한 표본**입니다.

### 1-1. 데이터 계층 (실측치, 2026-08-24)

```
39단원
  개념 (math_concepts)        4,146
  문제유형 (problem_types)   12,847     ← ★개념 x 3칸. 문항 목록이 아님
  진단규칙 (rules)            1,031
  처방 (remediation)          3,739
  선후관계 (relations edges)   37/40 단원 채워짐
```

★**유형 12,847 은 "문항 하나가 유형 하나"가 아닙니다.** `개념 × 3칸` 구조입니다.
19/39 단원이 정확히 비율 3.0 입니다.

```
슬롯(=개념) 하나에 칸 세 개
  pos0  기본 판별        basic
  pos1  조건 적용        concept
  pos2  종합 활용        advanced
  (단원마다 접미사 어휘가 다릅니다 — 닮음은 개념·조건 판별/비례식·정리 적용/복합 계산·증명)

PT 번호 <-> 슬롯 <-> 개념 대응
  slot = floor((PT-1)/3) + 1        pos = (PT-1) mod 3
  ★슬롯번호 = 개념번호   (원의 성질 93/93 불일치 0 검증분)
```

### 1-2. ★지금 상태의 핵심 — 비어 있는 3단원

`edges` · `remediation` · `rules` 세 층에서 비어 있는 파일이 **정확히 같은 3단원**입니다.

```
★M2_SIMILARITY_PYTHAGORAS  (닮음)
★M3_CIRCLE_PROPERTIES      (원의 성질)
★M3_STATISTICS             (통계)
나머지 37단원은 채워져 있습니다
```

참고할 선례:
```
M2_GEOMETRY_PROPERTIES   유형 140 → rules 12 · remediation 18 · edges 58
```
★**압축 방법을 발명할 필요가 없습니다. 37단원에 작동하는 선례가 있습니다.**

### 1-3. ★없는 층 (진짜 결손)

카탈로그 엔트리에 **문제 구조·풀이 단계 필드가 없습니다.**
```
goal · given_form · required_transformations · expected_strategy
answer_form · constraints · solution_steps · failed_step
  → ★8개 전부 없음 (도형의성질·닮음·원의성질 확인)
실제 필드는 type_name 문자열 + concept_ids + error_tags 수준
```
★`solution_templates` 디렉터리는 **존재하지 않습니다.** (GPT 분석이 있다고 한 것은 오류)

---

## 2. 현재 진행 중인 것

```
닮음        ★트랙 종료 (2026-08-22). 종료 보고서 B_similarity_final_status.v1.md
            OK 985 · CELL 348 · BASE 1 · NEWLABEL 4 · NOID 312 · share 0.597
            ★다시 열지 마십시오

원의 성질   카탈로그 47 → ★93 복원 완료 (커밋 65fff160). 정식 126 중 93
            D1 2,168문항 16배치 투입 완료
            문항별 라벨→슬롯 대응표 2,169행 완성 (YES 1,909 / NO 260)
            ★유형 지정은 보류 — 이유는 pos 가 아니라 ★처방이 없어서 (판정 59차)

삼각비      착수 프로브 완료. 11파일 1,549문항 · 라벨 37종
            unit_id = M3_TRIGONOMETRIC_RATIO
            카탈로그 108/108 ★완결 — 슬롯 생성 불요
            ★전사 진행 중 (클로드 채팅). Code탭은 대기 중

학생 풀이   axis_records 테이블. ★규모 미확인 (D1 조회 필요)
            구조 조사 완료 → B_student_work_data_structure.v1.md
```

---

## 3. ★건드리면 안 되는 것 (판정 종결분)

```
★칸(pos) 배정 규칙을 세우지 말 것        판정 38차. 4회 시도 후 종결. 다섯 번째 가설 금지
  ※ 종결된 것은 "규칙으로 맞히기"이고, "데이터로 축을 찾기"는 다른 작업임 (판정 61차)
★계열 오배정 기제                        판정 25차. 2회 시도 후 종결
★닮음 트랙 전체                          종료. A_single_cell 149건 방식은 ★재사용 금지
  (그 방식은 "만들어진 칸 하나에 배정"이라 2/3 확률로 틀린 pos 배정이었음 — 판정 59차)
★원의성질 EMPTY_SLOT 11개(33칸)          문항이 요구할 때 그 자리만 만든다 (D안)
★미등재 13종                             판정 61차에서 ★재검토 대상으로 돌아감. 지시 대기
★44 != 42 규명                           보류
★문항수 1건 차이 (circle-09 149/150)     판정 50차 미규명 종결. 조사 금지
★raw_taxonomy 54                         진입점으로만 기록. 열지 말 것
★decl 126 을 93 으로 낮추지 말 것         C2/C5 FAIL 은 33칸이 남았다는 정확한 보고임
★circle-11 오타 13건                      나중에 한 번에 처리
★D1 쓰기                                  Code탭·Codex 는 불가. 사용자만
```

---

## 4. 상설 규칙 (어기면 도구가 실행을 거부합니다)

```
★.ps1 은 ASCII 전용            한글·★·§ 전부 금지. 자기검사가 throw 합니다
★한 글자 변수명 금지            최소 3자. PS 변수명이 대소문자 미구분이라 $s/$S 가 충돌
★PS 예약 변수에 대입 금지       $pid · $host · $true · $null 등
★산출 0건은 실패로 처리         0 은 발견이 아니라 증상. ★이 프로젝트 최다 사고 유형
★신규 도구는 EMPTY-RESULT GUARD 를 달고 나옵니다
★역산 검증 (reversal)          데이터 파일을 고쳤으면, 되돌린 결과가 원본과
                               ★바이트 동일한지 확인. "다른 데 안 건드렸다"의 증명
★카탈로그 전량 재직렬화 금지    단일원소 배열이 스칼라로 붕괴합니다
                               엔트리 추가는 add_catalog_entries_by_template.ps1 로 텍스트 삽입
★검사기를 만들 때 ①검사 범위 ②비교 방식 ③제외 대상 을 먼저 명시
                               안 정하면 ★검사기가 검사 대상보다 먼저 틀립니다
★보고는 "했다"가 아니라 ★결과 수치로
실행은 반드시  powershell -File tools\axis_prediction\<도구>.ps1 ...
               (파이프 실행하면 ASCII 자기검사가 건너뛰어집니다)
```

---

## 5. 주요 도구 (`tools/axis_prediction/`)

```
extract_pdf_type_headers.ps1        학습지 PDF → question_no·정답률·유형명
                                    ★-ExpectCount 를 150 으로 고정하지 말 것. 파일마다 다름
compare_pdf_label_to_assignment.ps1 학습지 라벨 vs D1 배정 대조
verify_transcript_against_pdf.ps1   ★전사본 검산 필수. -SourceFile 없이 돌려 후보 전체 채점
add_catalog_entries_by_template.ps1 ★카탈로그 엔트리 추가 (레이아웃 하드코딩 없음)
add_catalog_entries.ps1             ★닮음 전용 구버전. 다른 단원은 필드셋 가드로 거부함
check_catalog_integrity.ps1         무결성 CHECK 1~10
make_catalog_short.ps1              catalog_short 파생본 재생성 (★잊으면 drift 발생)
build_reassign_payload.ps1          D1 재배정 페이로드 (id 조인. fail-closed 4항)
new_tool.ps1                        신규 도구 스캐폴더 (변수명·0건 가드 강제)
```

---

## 6. ★함정 — 전부 실제로 밟은 것입니다

### 6-1. 경로

```
★.NET API 는 상대경로를 PowerShell 의 위치가 아니라 ★프로세스 CWD 로 해석합니다
  [System.IO.File]::ReadAllText('tools\x.csv')  ← ★OneDrive 사본을 읽습니다
  이번 세션에 ★3회 물렸습니다. 파일을 엉뚱한 데 쓰거나 빈 문자열을 읽었습니다
  ⇒ ★절대경로를 쓰십시오. Set-Location 을 믿지 마십시오
```

### 6-2. 거짓 0

```
★예외가 난 뒤에도 스크립트가 끝까지 돌고 0 을 출력합니다
  이번 세션 실제 사례 3건
    ① 상대경로 실패 → "비ASCII 0바이트" (파일을 못 읽었을 뿐)
    ② manifest 만 보고 → "M3_CIRC_PT 0건" (실제 데이터는 parts 4파일에 있었음)
    ③ parts 가 객체 배열인데 문자열로 취급 → "0건" (4파일 전부 MISS)
  ⇒ ★0 이 나오면 먼저 "검사기가 대상을 실제로 읽었는가"를 확인하십시오
  ⇒ ★GUARD 를 넣으십시오: 읽은 행수가 기대값과 다르면 throw
```

### 6-3. PowerShell 5.1

```
★ConvertFrom-Json 은 최상위 JSON 배열을 파이프라인에 ★한 덩어리로 내보냅니다
  @($cmd | ConvertFrom-Json)   → ★1원소
  $var = $cmd | ConvertFrom-Json ; @($var)   → 정상
  ⇒ 149회 돌 루프가 1회 돌았고 배열을 해시 키로 쓰자 449개짜리 쓰레기가 나왔습니다

★Select-Object -First N 은 상류 파이프라인을 죽입니다
  도구를 그렇게 자르면 ★화면에는 결과가 다 찍히는데 파일이 안 쓰입니다
  (파일 기록이 마지막 단계라서) ⇒ > 파일 로 받으십시오

★New-Object 'HashSet[string]' $set  → 컬렉션이 인자로 펼쳐져 실패
★비교 연산자 -eq/-contains/-match 는 ★대소문자 미구분. 값 비교는 -ceq/-ccontains
```

### 6-4. 데이터

```
★선언 문자열을 믿지 말 것
  전사본이 "이 PDF 에서 왔다"고 적은 파일명이 ★실제로 여러 번 틀렸습니다
  닮음 9회 · 삼각비 태깅본 3/3 · circle-01 (밑줄 vs 공백)
  ⇒ ★내용으로 식별하십시오. 정답률 수열 대조가 1.0000 vs 0.04 로 갈라냅니다

★git diff 의 삭제 행수에 놀라지 말 것
  삽입 블록이 기존과 대부분 같으면 LCS 가 재정렬해 delete+add 쌍으로 표시합니다
  46칸 삽입에 삭제 151행이 떴는데 실제 손실 0이었습니다 (객체 단위 전수 대조로 확인)

★BOM  UTF8Encoding($false) 로 쓰면 BOM 이 사라집니다
  ★역산 검증은 이걸 못 잡습니다 — 메모리 문자열 비교라 BOM 이 이미 떨어진 뒤입니다
  ⇒ 쓰기 전에 원본 첫 3바이트를 확인하십시오 (현재 카탈로그들은 BOM 없음: 7b 0d 0a)

★파생본을 세십시오
  카탈로그를 고치면 catalog_short 도 재생성해야 합니다
  닮음에서 catalog_short 가 87 에 정지해 있던 사고가 있었습니다

★산출 파일 버전 번호를 인계문만 보고 정하지 말 것
  인계문이 v2 를 현행이라 적었는데 리포에는 v7 까지 있었습니다
  v3·v5 로 써서 과거 기록 2개를 덮어썼습니다 (git 에서 복구)
  ⇒ ★git ls-files 로 실제 버전을 세고 다음 번호를 쓰십시오
```

---

## 7. Codex 에게 권하는 역할 분담 (제안 · 검수 판정 대상)

★아직 검수가 정하지 않았습니다. Code탭의 제안입니다.

```
겹치면 위험한 것
  ★같은 데이터 파일을 두 에이전트가 동시에 고치는 것
  ★버전 번호를 각자 매기는 것 (§6-4 사고와 같은 형태)
  ⇒ 데이터 쓰기는 ★한 쪽만. 다른 쪽은 조사·검산·도구

겹쳐도 좋은 것 — 오히려 권장
  ★서로의 산출물을 독립 재계산하는 것
   이번 세션에 검수가 그렇게 해서 Code탭 오류를 2회 잡았습니다
   (§5 "46칸 복원이 길을 닫았다" 규정 오류 · A_single_cell "유일해" 규정 오류)
```

### ★Codex 가 합류하면서 먼저 확인해야 할 것

```
1  링크가 C:\Users\user\projects\scshstudy 인가 (하위폴더 아님 · OneDrive 아님)
2  git log 최상단이 b0763c5e 인가 (아니면 OneDrive 사본일 가능성)
3  §3 의 종결 목록을 읽었는가 — 여기 있는 것을 다시 조사하면 라운드가 낭비됩니다
```

---

## 8. 진입점 문서

```
tools/axis_prediction/
  HANDOFF_CODEX.v1.md                     ★이 문서
  B_similarity_final_status.v1.md         닮음 종료 보고서 (종결 항목·재개 조건)
  B_circle_catalog_restore_materials.v1.md 원의성질 카탈로그 현황·126 근거 5경로
  B_circle_add46_applied.v1.md            46칸 복원 실행 기록·검증
  B_circle_item_map_and_join.v1.md        문항↔D1 조인 경로 (경로 B 확정)
  B_circle_pos_wall_investigation.v1.md   ★pos 가 코드에서 어디를 가르는가
  B_student_work_data_structure.v1.md     ★학생 풀이 스키마 (axis_records)
  B_trig_probe_reply.v1.md                삼각비 착수 프로브
  HANDOFF_B_SIMPY_REASSIGN.v2.md          닮음 트랙 상세 (배경 참조용)
  HANDOFF_검수_20260811.md                역할·URL
```

★**시작 전에 §3(종결 목록)과 §6(함정)을 읽으십시오.**
이 프로젝트에서 반복된 실패 유형은 **한 층만 보고 결론을 낸 것**입니다.
숫자가 재현돼도 해석은 따로 검증해야 합니다 — 산술이 맞았는데 규정이 틀린 사례가 있었습니다.
