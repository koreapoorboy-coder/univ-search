# Code탭 회신 — 문항별 라벨→슬롯 대응표 + D1 조인 가능성 (판정 56차 요청 1·2)

2026-08-24

---

## 0. 요약

```
요청 1  ★완료.  B_circle_item_label_slot_map.v1.csv   2,169행
        in_catalog YES 1,909 (88.0%) · NO 260 (12.0%)
        ★검수 인용값과 일치 확인 (1,909 / 260)
        NO 260건 전부 행으로 남겼습니다

요청 2  ★조인 가능합니다. 다만 ★두 경로가 있고 성격이 다릅니다
        경로 A  (bulk_batch_id, question_no) — 배치<->파일 대응표가 ★추가로 필요
        경로 B  ★D1 source_note 가 라벨을 이미 담고 있어 ★조인이 불필요할 수 있음
        ⇒ B 가 성립하면 요청 1 표는 다리가 아니라 ★교차검증용이 됩니다
        ★조인은 실행하지 않았습니다. 가능성만 보고합니다

커밋   65fff160  46칸 복원분 전량 (판정 56차 승인)
```

---

## 1. 요청 1 — 문항별 라벨→슬롯 대응표

산출 `B_circle_item_label_slot_map.v1.csv`

```
컬럼   source_file · question_no · source_type_label · matched_slot · in_catalog · base_name
행수   2,169   (프로브 전량. 표본 아님)
대조   카탈로그 base 31종 vs 프로브 라벨, ★-ceq 코드포인트 정확 비교 (정규화 없음)
```

| in_catalog | 문항 | 비율 | 라벨 종수 |
|---|---:|---:|---:|
| YES | **1,909** | 88.0% | 31 |
| NO | **260** | 12.0% | 13 |
| 합계 | 2,169 | 100% | 44 |

### 1-1. ★NO 260행의 `matched_slot` · `base_name` 은 빈 값입니다

```
이유  두 컬럼은 "카탈로그에서 어느 슬롯·어느 base 에 대응하는가"를 담습니다.
      미등재 13종은 ★카탈로그에 엔트리가 없으므로 대응할 슬롯도 base 도 없습니다
      ⇒ 값을 만들어 넣으면 근거 없는 배정이 됩니다. 비워 두었습니다
★판정 56차가 확정한 "13종은 13개의 독립 base" 라는 사실과 모순되지 않습니다.
  base 로서 존재하지만 ★카탈로그에 등재된 base 가 아니라는 뜻입니다.
  라벨 원문은 source_type_label 컬럼에 그대로 있습니다
```

### 1-2. NO 260건의 내역 (라벨별)

```
  82건 14파일  반원에서의 접선
  22건  6파일  원에 외접하는 사각형의 성질(1)
  20건  6파일  원의 접선과 반지름; 동심원
  20건  6파일  원주각과 중심각의 크기(3)
  18건  5파일  현의 길이(2); 내접하는 이등변삼각형
  17건  6파일  사각형이 원에 내접하기 위한 조건
  15건  5파일  원의 중심과 현의 수직이등분선(2)
  15건  4파일  원의 중심과 현의 수직이등분선(3); 활꼴
  13건  4파일  원의 접선의 성질(3); 넓이
  11건  3파일  원주각과 중심각의 크기(2)
  10건  3파일  접선과 현이 이루는 각; 중심각
  10건  4파일  원에 내접하는 사각형
   7건  2파일  원의 중심과 현의 수직이등분선(4); 원을 접은 경우
  ---
 260건        13종
```

---

## 2. 요청 2 — D1 과 이을 수 있는가

★**실행하지 않았습니다.** 아래는 "이을 수 있는지"와 "무엇이 더 필요한지"만입니다.

### 2-1. 키 형태 대조

| | 프로브 | D1 `user_items` |
|---|---|---|
| 배치 식별 | `source_file` = `260711_원의 성질(1).pdf` | `bulk_batch_id` = `SCSTUDY-2026-08-22-m3-circle-02` |
| 문항 식별 | `question_no` = `001` (3자리 영패딩) | `question_no` = `01` (2자리) |

```
⇒ 문항 번호는 ★정수 정규화로 이어집니다 (닮음에서 쓴 것과 같은 처리)
⇒ 배치 식별은 ★직접 이어지지 않습니다. source_file <-> bulk_batch_id 대응표가 필요합니다
```

### 2-2. 경로 A — 배치↔파일 대응표를 만들어 잇는다

**현재 확보된 것: 16개 중 2개. 그것도 내용으로 확증된 것입니다.**

```
260711_원의 성질.pdf     (무접미사)  <->  SCSTUDY-2026-08-19-m3-circle-01
260711_원의 성질(1).pdf              <->  SCSTUDY-2026-08-22-m3-circle-02   (라벨·정답률 50/50)
⇒ (N) -> circle-(N+1) 오프셋. 닮음·삼각비에서 본 것과 같은 모양
```

★**그러나 선언 문자열로 대응표를 만들면 안 됩니다. 실제로 틀려 있습니다.**
```
circle-01 의 검산 기록:
  declared source: 260711_원의_성질.pdf      <- ★밑줄
  실제 파일       : 260711_원의 성질.pdf      <- 공백
  WARN  a batch can be internally consistent and still name the wrong file
        (판정 26차 §2)
```
★또한 배치ID의 날짜부가 배치마다 다릅니다(`2026-08-19`-circle-01 vs `2026-08-22`-circle-02).
**규칙으로 생성할 수 없습니다. 실제 배치ID를 열거해야 합니다.**

**경로 A 에 필요한 것**
```
① D1 의 원의 성질 배치ID 실목록      -> 사용자가 SQL 실행 (아래 §2-4)
② 배치 <-> 파일 대응의 ★내용 확증    -> 정답률 수열 대조
   삼각비에서 1.0000 vs 차순위 0.04~0.07 로 판별력이 확인된 방법입니다
③ 확증된 대응표를 파일로 등재         -> 닮음의 B_simpy_batch_set_pairing.v2.csv 대응물
   ★현재 원의 성질용 대응표는 리포에 ★없습니다 (확인함)
```

### 2-3. ★경로 B — 조인이 불필요할 수 있습니다

D1 행의 `source_note` 가 **PDF 유형명과 정답률을 이미 담고 있습니다.**

전사본 실물로 확인했습니다 (circle-02 의 50문항).
```
형식   "유형후보: <설명> | 메모: PDF 유형명 '<라벨>', 정답률 NN%"
정규식 PDF 유형명 '([^']+)', 정답률 (\d+)%
★추출 성공 50 / 50   실패 0
  q01  label="원의 중심과 현의 수직이등분선(1)"  rate=64
  q02  label="원의 중심과 현의 수직이등분선(1)"  rate=86
  q03  label="원의 중심과 현의 수직이등분선(1)"  rate=89
```

★**이것이 성립하면 라벨→슬롯 대응에 배치↔파일 대응표가 필요하지 않습니다.**
D1 행 자체에서 라벨을 읽어 슬롯으로 보내면 됩니다.
그 경우 요청 1 의 표는 **다리가 아니라 교차검증 자료**가 됩니다
(프로브가 PDF 를, source_note 가 D1 을 말하므로 서로 독립적인 두 증인).

★**전제**: 2,168행 ★전부가 이 형식을 지키는지는 확인되지 않았습니다.
제가 볼 수 있는 것은 circle-01(검산 기록)과 circle-02(전사본 50행)뿐입니다.
16배치가 서로 다른 시점에 서로 다른 전사자로 만들어졌으므로 **형식 이탈이 있을 수 있습니다.**

### 2-4. 확인용 SQL (사용자가 D1 Console 에서 실행 · Code탭 실행 아님)

경로 A·B 를 한 번에 가릅니다. **센티널을 먼저 두어 0행이 두 뜻으로 읽히지 않게 했습니다.**

```sql
SELECT
  (SELECT COUNT(*) FROM user_items)                                              AS rows_all_units,
  (SELECT COUNT(*) FROM user_items WHERE unit_id='M3_CIRCLE_PROPERTIES')         AS rows_circle,
  (SELECT COUNT(DISTINCT bulk_batch_id) FROM user_items
     WHERE unit_id='M3_CIRCLE_PROPERTIES')                                       AS batches_circle,
  (SELECT COUNT(*) FROM user_items WHERE unit_id='M3_CIRCLE_PROPERTIES'
     AND source_note LIKE '%PDF 유형명%')                                          AS with_pdf_label;
```
```
읽는 법
  rows_all_units 가 4,000 이상이어야 쿼리가 돈 것입니다 (닮음 1,650 + 원의성질 2,168 + 그 외)
  rows_circle    = 2,168 기대
  batches_circle = 16 기대
  ★with_pdf_label = 2,168 이면 경로 B 성립 -> 배치<->파일 대응표 불요
                  < 2,168 이면 부족분만 경로 A 로 메웁니다
```

경로 A 가 필요할 때 배치 목록:
```sql
SELECT bulk_batch_id, COUNT(*) AS n,
       MIN(CAST(question_no AS INTEGER)) AS q_min,
       MAX(CAST(question_no AS INTEGER)) AS q_max
FROM user_items WHERE unit_id='M3_CIRCLE_PROPERTIES'
GROUP BY bulk_batch_id ORDER BY bulk_batch_id;
```
★배치별 건수를 `B_circle_worksheet_item_counts.v1.csv` 16행과 맞추면
**어느 배치가 어느 파일인지의 1차 후보**가 나옵니다(건수 119·85·15 는 파일이 유일하게 특정됩니다).
그 뒤 정답률 수열로 확증합니다.

### 2-5. 결론

```
★이을 수 있습니다.
  question_no  정수 정규화로 즉시
  배치 식별    경로 B 가 성립하면 ★불요, 아니면 경로 A 로 대응표를 만들어야 함
★어느 쪽인지는 위 센티널 SQL 한 번으로 갈립니다
★대응표를 만들 때는 선언 문자열을 쓰지 말고 ★내용(정답률 수열)으로 확증합니다
  circle-01 의 선언이 실제로 틀려 있는 것이 근거입니다
```

---

## 3. 하지 말라신 것 — 준수 확인

```
✔ 칸(pos) 배정 안 함        matched_slot 은 ★슬롯 번호만입니다. pos·PT 번호를 넣지 않았습니다
                            (판정 38차 종결. 다섯 번째 가설 세우지 않았습니다)
✔ 유형 지정 페이로드 없음    대응표만 냈습니다. problem_type_id 를 배정한 컬럼이 없습니다
✔ 조인 미실행               §2 는 가능성 보고이고 SQL 은 사용자 실행분입니다
✔ EMPTY_SLOT 33칸           손대지 않았습니다
✔ 미등재 13종               카탈로그에 넣지 않았습니다. 표에 빈 값으로 남겼습니다
✔ axis_map · raw_taxonomy   열지 않았습니다
✔ decl 126 · D1 쓰기        무접촉
```

---

## 4. 산출

```
tools/axis_prediction/B_circle_item_label_slot_map.v1.csv   2,169행  요청 1
tools/axis_prediction/B_circle_item_map_and_join.v1.md               이 문서
```

## 5. 대기

```
★센티널 SQL 결과가 오면 경로 A/B 가 갈립니다. 그 뒤 지시를 기다립니다
★유형 지정 실행은 검수 판정 후입니다. Code탭이 먼저 만들지 않습니다
```
