# 제출21 — 블록 정렬 예측 기각 · 결손 80칸 갱신 · 형제 칸 8종 생성

발신 Code탭 · 수신 검수 · 2026-08-21
회신 대상: **검수 판정 24차 §1 · §3 · §4 · §6 · §7**

---

## 0. 한 줄

```
★검수의 블록 정렬 예측은 8/8 전부 기각됐습니다. 그리고 배치 3개는 부호가 반대입니다.
결손 목록은 80으로 갱신 후 생성분을 빼 72로, 산술은 99 + 72 + 6 = 177 로 닫힙니다.
형제 칸 8종 생성 완료. BASE 104건 전부 갈 칸이 생겼습니다(EXISTS 104 / MISSING 0).
```

---

## 1. §1 — 블록 정렬 예측: ★기각

### 1-1. 예측
```
(라벨 블록 수) − (슬롯 런 수)  ==  (목표 슬롯이 카탈로그에 없던 라벨 블록 수)
```
지시대로 **87종 기준**(신규 4슬롯 생성 이전 백업 카탈로그)으로 계산했습니다.

### 1-2. 결과 — 8/8 전부 불일치
```
batch      set     Lblk  Srun  short  SrunX  shortX  noid  absent  unmap  verdict
simpy-01   set01     76    75      1     75       1     0       4      5   MISS
simpy-02   set02     75    70      5     70       5     0       3      5   MISS
simpy-03   set03     70    56     14     56      14     0       1      2   MISS
simpy-04   set04     67    50     17     50      17     0       0      0   MISS
simpy-05   set05     65    60      5     60       5     0       0      0   MISS
simpy-06   set06     62    76    -14     71      -9     4       0      0   MISS
simpy-07   set07     57    68    -11     64      -7     6       0      0   MISS
simpy-08   set08     55    69    -14     68     -13     1       0      0   MISS
```
```
예측 성립  0 / 8
UNMAPPED 를 함께 세도  0 / 8
```
```
simpy-03 재현  70 − 56 = 14  ✔ (제출20 과 동일)
그러나 absent = 1, unmap = 2.  14 와 맞지 않습니다
simpy-04     short 17 인데 absent 0 · unmap 0.  ★가장 큰 미스
```

### 1-3. ★부호가 뒤집히는 배치가 셋 있습니다
```
simpy-06 · 07 · 08 은 슬롯 런이 라벨 블록보다 ★많습니다 (-14 · -11 · -14)
```
"빈 칸이 없어 인접 유형이 하나로 합쳐졌다"는 이야기는 **런을 줄이는 방향**입니다.
런이 늘어나는 배치는 그 이야기로 설명되지 않습니다.

### 1-4. 교란 통제 — NOID 를 먼저 배제했습니다
```
우려  problem_type_id 가 없는 문항(NOID)은 런을 인위적으로 쪼갭니다
      한 건이 하나의 런을 셋으로 나눌 수 있습니다
통제  NOID 행을 런 계산에서 이월 처리한 값 = SrunX / shortX
결과  -14 -> -9 · -11 -> -7 · -14 -> -13
      ★줄어들지만 부호는 그대로입니다. 교란 아티팩트가 아닙니다
```
★ 판정 24차 §10 이 "관측에서 반증 가능한 예측을 뽑고, 틀리면 관측도 버릴 것"이라 했으므로
**블록 4→5 어긋남 관측도 함께 폐기 대상으로 올립니다.** simpy-03 한 배치에서만 성립하는 형태이고,
다른 일곱 배치가 지지하지 않습니다.

★ **새 가설은 세우지 않았습니다.**

### 1-5. 산출
```
B_simpy_block_alignment_8batches.v1.csv    8행  배치별 세 값 + NOID 통제값
B_simpy_label_blocks_classified.v1.csv   537행  라벨 블록 전량 · 목표 슬롯 · 분류
                                                (TARGET_PRESENT / TARGET_ABSENT / UNMAPPED)
```

---

## 2. §3 — 결손 목록 갱신 + 산술 재출력

### 2-1. 계보
```
B_simpy_missing_cells_72.v1.csv   53 base 점유 시점(87종). 신규 4슬롯 미포함 = 낡음
B_simpy_missing_cells_80.v2.csv   91종 시점. 72 + 신규 4슬롯 잔여 8칸
B_simpy_missing_cells.v3.csv      ★현행. 99종 시점. 80 − 생성 8 = 72
```
신규 8칸(80 목록에 추가된 분):
```
PT017 slot6  pos1 · PT018 slot6  pos2   두 삼각형이 닮음이기 위하여 필요한 조건 - …
PT091 slot31 pos0 · PT093 slot31 pos2   삼각형의 세 변의 중점을 연결한 삼각형 - …
PT106 slot36 pos0 · PT107 slot36 pos1   삼각형의 무게중심(2) △ABC, △GBC의 무게중심 - …
PT136 slot46 pos0 · PT138 slot46 pos2   닮은 두 입체도형의 겉넓이의 비 - …
```

### 2-2. 산술 (요구대로 재출력)
```
등재            99
결손 목록 v3    72     (base 이름 확정분)
슬롯 1·3         6     (base 이름 없음 → 목록 제외, 산술에는 별도 계상)
합계           177     ★정식 177 과 일치. 닫힙니다
중복             0
```
★ 목록의 정의를 **"아직 만들지 않은 칸"**으로 고정했습니다. 만들면 목록에서 빠집니다.
이 규칙을 인계문 §1-2 에 적었습니다.

---

## 3. §4 — 형제 칸 8종 생성

### 3-1. `type_name_source` — 형제 상속 적용
판정 24차 §4 지시대로 **해당 base 를 이미 가진 형제 엔트리의 값을 상속**했습니다.
```
PT041 slot14 <- variant_bank      PT139 slot47 <- variant_bank
PT068 slot23 <- variant_bank      PT141 slot47 <- variant_bank
PT071 slot24 <- variant_bank      PT150 slot50 <- variant_bank
PT079 slot27 <- variant_bank      PT164 slot55 <- variant_bank
```
8종 전부 `variant_bank` 입니다. **worksheet_label 로 찍은 것은 하나도 없습니다.**
ISSUE 문서에 "형제 칸은 출처를 상속한다"를 규칙으로 등재했습니다(§4-요구).

### 3-2. 생성 — 판정 20차와 동일 방식
```
방식    텍스트 서지컬 삽입 (add_catalog_entries.ps1). 전량 재직렬화 없음
검증    1 파싱 ok · 2 count 91 -> 99 · 3 14필드 기준 순서 · 4 U+FFFD 0
        5 ★역산 — 삽입분을 도로 들어내면 원본과 바이트 동일
백업    _backup/...pre-add-8entries
축약본  make_catalog_short.ps1 재생성 -> types=99.  CHECK 10 drift 0
무결성  CHECK 9 = 0 contaminated · CHECK 4·6·7 = 0 broken · concept 57
        (C2·C5 FAIL 은 기존 절단 조건. 등재 99 vs 정식 177)
```

### 3-3. ★재대조 — BASE 는 104 그대로입니다
```
생성 전  OK 718 · CELL 346 · BASE 104 · NEWLABEL 21 · NOID 11
생성 후  OK 718 · CELL 346 · BASE 104 · NEWLABEL 21 · NOID 11   ★무변화
```
**당연한 결과이고, 예상하지 못했던 것을 밝힙니다.**
```
이유  대조 도구의 판정은 ★슬롯 단위 비교입니다
      expected_slot(라벨) vs assigned_slot(D1). 칸(pos)은 판정에 들어가지 않습니다
      같은 슬롯 안에 칸을 하나 더 만드는 일은 두 값 중 어느 쪽도 바꾸지 않습니다
```
★ 제출20 §9-2 에 "생성 -> 재대조 -> BASE 104 -> 81 로 줄어드는지 확인"이라고 적었는데,
**그 기대 자체가 틀렸습니다.** 칸 생성은 BASE 건수를 줄이지 않습니다.

### 3-4. 실제로 바뀐 것 — 실행 가능성
```
생성 전  EXISTS  81 · MISSING_LISTED 23 · UNLISTED 0
생성 후  EXISTS 104 · MISSING_LISTED  0 · UNLISTED 0
```
★ **104건 전부 옮겨 놓을 칸이 생겼습니다.** 판정 24차 §2 의 재배정 착수 조건이 해소됐습니다.
```
B_simpy_base104_target_cell_status.v2.csv   104행 · 전부 EXISTS
B_simpy_assignment_candidates.v3.csv        482행 · 재대조 후보(현행)
```

---

## 4. §7 — 단원 접두사 가드 전 도구 적용

```
report_reassign_readiness.ps1        신설 시 적용 완료 (제출20)
report_block_alignment.ps1           신설 시 적용 완료 (이번)
compare_pdf_label_to_assignment.ps1  ★추가
match_d1_hints_to_base.ps1           ★추가
```
```
회귀   compare 정상 입력 -> 후보 CSV 가 v3 와 ★바이트 동일. 산출 불변
가드   통계 카탈로그 투입 -> "REFUSED: catalog/D1 unit mismatch.
       catalog ids look like M3_STAT_PTnnn but D1 ids look like M2_SIMPY_PTnnn"
ASCII  두 파일 모두 비ASCII 0바이트 유지
```

---

## 5. §6 — 파일명 유지 + 구 명칭 표기

```
유지  B_simpy_chain_shift_series_25.v1.csv  파일명 그대로 (판정 24차 §6 승인)
표기  인계문 §3 에 "구 명칭 연쇄 밀림 -> 현 명칭 계열 오배정" 블록으로 남김
      + §5 산출 데이터 목록에도 한 줄
```

---

## 6. ★이번에 Code탭이 밟은 것

### 6-1. PS 변수 대소문자 함정 — 한 세션에서 두 번
```
1회  report_block_alignment.ps1 에서 루프 카운터 $S 가 세트명 $s 를 덮음
     -> $setLbl[$s] 가 null. "cannot call a method on a null-valued expression"
2회  패치 생성 스크립트에서 $t(목표 PT)가 $T(디렉터리)를 덮음
     -> 파일이 "…\M2_SIMPY_PT164\…" 경로로 저장 시도되며 실패
```
★ **제가 두 턴 전에 인계문에 등재한 바로 그 항목입니다.**
등재만으로는 안 잡힙니다. 짧은 변수명($s/$S, $t/$T)을 쓰지 않는 쪽이 실효적입니다.
```
조치  해당 스크립트의 카운터를 $blocks/$runs 로, 목표 변수를 $tgt 로 개명
요청  ★"한 글자 변수명 금지"를 함정 목록에 추가할지 판정해 주십시오
```

### 6-2. 재대조 기대가 틀렸음 (§3-3)
칸 생성이 BASE 를 줄일 것처럼 적었는데, 대조가 슬롯 단위라 그럴 수 없었습니다.
**결과를 보고 나서야 알았습니다.** 미리 확인했어야 합니다.

---

## 7. 커밋

```
(이번) 1개.  카탈로그 91 -> 99 + 축약본 + 도구 4종 + 문서
```

---

## 8. 남은 것

```
검수 판정 대기
  1  ★재배정 81 -> 104건 착수 여부. 이제 전부 갈 칸이 있습니다
     ★단 D1 을 고치는 일이라 지금까지의 카탈로그 편집과 성격이 다릅니다
  2  블록 정렬 관측 폐기 확인 (§1-4)
  3  "한 글자 변수명 금지" 등재 여부 (§6-1)
  4  simpy-03 q050 단건 (판정 24차 §5)
  5  라벨 vs 풀이법 예외 2건 개별 판정 (판정 23차 §0)

사용자 조치
  6  push  ★미push 2건
  7  07-10 450문항 GPT 전사 (지시서 0710 판)
```
