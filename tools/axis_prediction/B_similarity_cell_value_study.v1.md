# 제출33 — mf#73 철회 · override 가드 · PT007 생성 · ★CELL 실익 조사

발신 Code탭 · 수신 검수 · 2026-08-22
회신 대상: **검수 판정 36차 §1 · §3 · §4 · §5 · §7**

---

## 0. 한 줄

```
★CELL 실익 조사 결과가 갈립니다.
  학생이 읽는 지시문   같은 base 라도 ★사실상 다른 글입니다 (유사도 0.091)
  엔진이 쓰는 error_code   ★60% 를 공유합니다 (다른 base 는 6.8%)
⇒ 칸이 틀리면 "지시문은 통째로 틀리고, 오류 코드는 절반쯤 맞는" 상태가 됩니다.
mf#73 철회 완료. 가드가 자동으로 잡습니다. PT007 생성 완료(100종).
```

---

## 1. §1 — mf#73 철회 + 가드

### 1-1. 가드 신설
```
규칙  override 행마다 그 라벨이 붙은 ★배정 보유 문항이 투표합니다
        agree > 0                 -> 반영
        agree == 0, disagree > 0  -> ★거부하고 보고
        배정 문항이 아예 없음       -> 반영하되 "미검증" 으로 보고
```
★ 가드를 켠 채 **mf#73 을 남겨두고** 돌려 실제로 걸리는지 먼저 봤습니다.
```
WARN label-override: REFUSED row: every assigned item disagrees (0 agree / 4 disagree)
                     slot 57 <- 피타고라스정리의활용(3)직사각형내부의점
WARN label-override: unverified row (no assigned item carries this label): slot 59 <- 각기둥에서의최단거리
WARN label-override: unverified row (no assigned item carries this label): slot 2 <- 항상닮은도형
```
그 뒤 판정대로 행도 제거했고(`overrides.v2.csv` 6행), **두 결과가 바이트 동일**했습니다.
⇒ 가드가 사람 손과 같은 일을 합니다.

### 1-2. 5지표
```
                 v6(7행)   v7(6행/가드)    차이
OK                   836        836          0
CELL                 348        348          0
BASE                ★  5      ★  1         -4
NEWLABEL            ★  0      ★  4         +4
NOID                 461        461          0
라벨->슬롯             78         77         -1
```
```
남은 BASE 1건    simpy-02 q005  다면체에서 닮음비의 응용  (slot44 -> slot4)
                 ★판정 36차 §6 대로 실제 오배정으로 두고, A 149 페이로드에 넣지 않았습니다
NEWLABEL 4건     피타고라스 정리의 활용(3) 직사각형 내부의 점
                 simpy-01 q137·q138 · simpy-02 q137·q138
```

### 1-3. ★검수 서술 하나만 정정합니다
```
판정 36차 §1  "그 4건은 override 이전에도 slot 53에 배정돼 있었고, ★OK 판정이었습니다"
실제          override 이전 판정은 ★NEWLABEL 이었습니다 (v5 의 NEWLABEL 21건에 포함)
              라벨이 맵에 없어 판정 자체가 불가였습니다
```
★ 배정이 slot 53 이었다는 것은 맞습니다. 다만 **"OK 였다"가 아니라 "판정 불가였다"** 입니다.
가드를 "OK -> BASE 뒤집기 감지"로 만들었으면 이 건을 못 잡았을 것이라, 실제로 작동하는
기준(**배정 문항의 투표**)으로 구현했습니다.

---

## 2. ★★ §3 — CELL 실익 조사

신규 도구 `measure_pos_prescription_gap.ps1`.
```
비교 대상   같은 base 의 다른 칸 쌍   37쌍
대조군      ★다른 base 쌍            3,704쌍
            (대조군 없이는 "0.6 이 높은가"를 말할 수 없습니다)
지표        error_code  error_checkpoints[].error_code 집합 Jaccard   <- 엔진이 키로 쓰는 값
            command     student_command 문자 바이그램 Jaccard          <- 학생이 읽는 글
            nature      problem_nature 문자 바이그램 Jaccard           <- 유형 규정
```

### 2-1. 결과
```
지표          같은 base 다른 칸        다른 base          배율
error_code    평균 0.605 (중앙 0.6)   평균 0.068 (중앙 0)   ★8.9배
command       평균 0.091 (중앙 0.075) 평균 0.047           1.9배
nature        평균 0.170              평균 0.098           1.7배
```

### 2-2. 무엇을 뜻하는가 — 두 축이 다릅니다
```
error_code   같은 base 의 칸끼리 ★60% 공유. 37쌍 중 7쌍은 집합이 완전 동일
             ⇒ 칸이 틀려도 오류 코드는 상당 부분 맞습니다
command      ★0.091. 사실상 겹치지 않습니다
             ⇒ 칸이 틀리면 학생이 받는 지시문은 통째로 다른 글이 됩니다
```

### 2-3. 표본 — slot 5 의 두 칸
```
PT013 (pos0)  규정  주어진 조건이 SSS·SAS·AA 중 어느 닮음 조건인지 판별하는 유형
              지시  "변·각의 개수를 세고, 각이 두 변 사이에 있는지 확인한 뒤
                     SSS·SAS·AA 중 하나를 ★이름까지 써서 답하라"
              코드  law_selection_error / similar_triangle_correspondence_setup_failure

PT015 (pos2)  규정  여러 조건을 결합해 닮음을 증명하거나 미지수 값을 구하는 복합 유형
              지시  "쓸 조건을 먼저 이름으로 선언하고, 대응을 세로로 적은 뒤
                     조건을 번호로 나열해 ★모두 만족하는 값만 남겨라"
              코드  위 2개 + multi_constraint_intersection_failure
```
★ **오류 코드는 2/3 공유, 지시문은 하는 일이 아예 다릅니다.**
`판별하고 이름 쓰기` 와 `증명 쓰고 값 남기기` 는 학생 행동이 다릅니다.

### 2-4. ★Code탭은 판정하지 않습니다
검수가 제시한 두 갈래에 그대로 대면 이렇습니다.
```
"거의 같으면 -> 실익 적다"    error_code 쪽은 이에 가깝습니다(0.605)
"크게 다르면 -> 70.9%로는 못 붙인다"   command 쪽은 이에 가깝습니다(0.091)
```
**한 갈래로 안 떨어집니다.** 어느 축을 기준으로 실익을 볼지가 판정 사항입니다.
```
참고  진단이 error_code 로 굴러가면 칸 오류의 비용이 작습니다
      학생에게 지시문을 그대로 노출하면 칸 오류의 비용이 큽니다
      ★어느 쪽인지는 파이프라인 설계 문제라 Code탭이 단정하지 않습니다
```
파일: `B_simpy_pos_prescription_gap.v1.csv` (3,741쌍 전량)

---

## 3. §4·§5 — PT007 생성 완료

```
생성    M2_SIMPY_PT007  slot 3 · pos 0 · worksheet_label · C003
        입체도형에서 닮음의 성질 - 개념·조건 판별
검증    파싱 ok · 99 -> 100 · 14필드 · U+FFFD 0 · ★역산 ok
백업    _backup/...pre-add-1entries
축약본  types=100 재생성 · CHECK 9 오염 0 · CHECK 10 drift 0
★PT008 은 만들지 않았습니다. q007·q008 2건은 NOID(D 분류)로 그대로 둡니다
```

---

## 4. §2 — A 149 사전 스냅샷

파일: `B_simpy_A149_pre_snapshot.v1.csv` (149행)
```
컬럼  bulk_batch_id · question_no · current_problem_type_id · current_status
      target_problem_type_id · target_type_name · slot
```
```
현재 problem_type_id 빈 값   ★149 / 149
현재 status                  ★pending 149 / 149
목표 PT 종수                 21
★목표 PT 카탈로그 실재       149 / 149  (카탈로그 100종)
```
★ **id 가 아직 없어 좌표 단위 스냅샷입니다.** id 조회분이 오면 그대로 id 키로 바꿉니다.

---

## 5. §7 — status 확인 (새 export 도착분)

```
export  consol0822(1).txt  6컬럼 (status 포함). 1,650행
```
### 5-1. 현재 분포
```
기존 1,200   approved 1,189 · pending 11
신규   450   pending 450
⇒ ★approved 1,189 = 배정 보유분과 정확히 일치. pending 461 = NOID 461 과 정확히 일치
```
### 5-2. approved 가 무엇을 여는가 — ★독립 플래그가 아닙니다
```js
// 검수 결정 B: 유형 미매칭이면 조용히 approved로 두지 않고 pending으로 보류한다
const status = hasType ? 'approved' : 'pending';
```
```
⇒ status 는 ★"유형이 붙었는가"에서 파생되는 값입니다
⇒ A 149 배정으로 pending -> approved 가 되는 것은 부작용이 아니라 ★설계된 불변식입니다
   기존 1,189건도 전부 같은 경로로 approved 가 됐습니다
```
★ 판정 36차 §7-③ 의 "status 가 바뀌는 것이 문제가 되는지"에 대한 답은 **문제 없음**입니다.

---

## 6. 산출

```
compare_pdf_label_to_assignment.ps1        ★override 투표 가드 추가
B_simpy_label_slot_overrides.v2.csv        6행 (mf#73 제거)
B_simpy_assignment_candidates.v7.csv       현행 후보
B_simpy_compare_report.v7.txt
measure_pos_prescription_gap.ps1           ★신설. 한 글자 변수 0
B_simpy_pos_prescription_gap.v1.csv        3,741쌍
_patch_simpy_slot3_pt007.v1.json           PT007 패치
B_simpy_A149_pre_snapshot.v1.csv           149행 사전 스냅샷
카탈로그 99 -> 100 · 축약본 100
```

---

## 7. 남은 것

```
검수 판정 필요
  1  ★CELL 실익 — error_code 축이냐 command 축이냐 (§2-4)
     이 판정이 CELL 348 · B 판별형 38 둘 다의 향방을 정합니다
  2  A 149 id 조회 요청 -> 페이로드
  3  NEWLABEL 4건(피타고라스 활용(3)) 처리 — 라벨이 어느 슬롯인지 미정
  4  BASE 1건(simpy-02 q005) 재배정 시점

사용자 조치
  5  A 149 id 조회 (검수 요청 예정)
  6  push  ★미push 2건

보류
  7  B 판별형 38 · CELL 348 · 원의 성질
```
