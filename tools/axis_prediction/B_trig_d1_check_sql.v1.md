# Code탭 회신 — 삼각비 D1 기투입 여부 확인 SQL

검수 판정문 `검수판정문_삼각비_프로브회신_20260823.md` §요청 대응 · 2026-08-23

---

## 0. 요약

```
판정 A~D  전부 수용. 조치 필요 항목 없음 (프로브 재생성 안 함 · set 번호 조사 중단 · 카탈로그 무접촉)
요청 1건  D1 기투입 확인 SQL -> ★§2 에 4개 제안
★정정 1건 검수 채팅에 도착한 부분본 CSV 는 ★Code탭 산출물이 아닙니다 — §3
```

---

## 1. 검수 SQL 을 그대로 쓰지 않는 이유

판정문이 제시한 쿼리는 이렇습니다.

```sql
SELECT bulk_batch_id, COUNT(*) FROM user_items
WHERE unit_id='M3_TRIGONOMETRIC_RATIO' GROUP BY bulk_batch_id;
```

목적에는 맞지만 두 가지가 빠져 있어 **그대로 쓰면 잘못된 안심을 줄 수 있습니다.**

### 구멍 ① 결과 0행이 두 가지를 뜻한다

삼각비가 D1 에 없으면 이 쿼리는 **빈 결과**를 냅니다. 그런데 빈 결과는

```
(가) 삼각비 문항이 정말 없다          <- 알고 싶은 것
(나) 쿼리가 안 돌았다 / unit_id 오타 / 붙여넣기 실패
```

를 구분하지 못합니다. 이 프로젝트의 상설 규칙이 **"산출 0건은 실패로 처리할 것 — 0 은 발견이
아니라 증상이다"**(판정 38차 §6, 최다 사고 유형)인데, 이 쿼리는 정확히 그 형태입니다.

⇒ **항상 1행을 반환하는 센티널 쿼리**를 먼저 돌려 "쿼리는 돌았다"를 증명하고 시작합니다.

### 구멍 ② `unit_id` 로만 걸면 잘못 들어간 문항을 못 본다

`unit_id` 가 틀린 채로 투입된 문항이 있으면 이 쿼리는 **0행을 반환하고**, 검수는 "없음"으로
읽고 전량 투입합니다. 그러면 중복이 생깁니다 — 판정문이 막으려던 바로 그 결과입니다.

★이 위험은 가정이 아닙니다. `M3_TRIGONOMETRY` 같은 그럴듯한 오타값이 실재할 수 있다는
것이 애초에 지시문 §요청 1이 경계한 지점입니다.

⇒ `unit_id` · `bulk_batch_id` · `unit_name` **세 각도로 동시에** 셉니다.

---

## 2. ★제안 SQL — D1 Console 에서 순서대로 실행

### 쿼리 1 — 센티널 (★반드시 먼저. 항상 정확히 1행이 나온다)

```sql
SELECT
  (SELECT COUNT(*) FROM user_items)                                        AS rows_all_units,
  (SELECT COUNT(DISTINCT unit_id) FROM user_items)                         AS units_present,
  (SELECT COUNT(*) FROM user_items WHERE unit_id='M3_TRIGONOMETRIC_RATIO') AS trig_by_unit_id,
  (SELECT COUNT(*) FROM user_items WHERE bulk_batch_id LIKE '%trig%')      AS trig_by_batch_name,
  (SELECT COUNT(*) FROM user_items WHERE unit_name LIKE '%삼각비%')         AS trig_by_unit_name;
```

**읽는 법**

```
rows_all_units 가 1,650 이상이어야 한다   ★닮음만으로 1,650 이다.
                                          이 값이 0 이거나 오류가 나면 ★쿼리가 안 돈 것이다.
                                          그 경우 나머지 0 은 "없다"의 근거가 되지 못한다
뒤 세 값이 전부 0     -> 삼각비 미투입 확정. 11파일 전량 신규 투입
하나라도 0 이 아님    -> 쿼리 2·3 으로 내역 확인
세 값이 서로 다름     -> ★unit_id 가 틀린 문항이 있다는 뜻. 쿼리 3 이 잡아낸다
```

### 쿼리 2 — 단원별 재고 (삼각비가 목록에 뜨는지 눈으로 확인)

```sql
SELECT unit_id, COUNT(*) AS n FROM user_items GROUP BY unit_id ORDER BY n DESC;
```
★이 쿼리는 데이터가 있는 한 반드시 여러 행을 냅니다. 결과가 비면 그것만으로 쿼리 실패입니다.

### 쿼리 3 — 내역 (쿼리 1의 뒤 세 값 중 하나라도 0 이 아닐 때만)

```sql
SELECT unit_id, bulk_batch_id, status, COUNT(*) AS n,
       MIN(CAST(question_no AS INTEGER)) AS q_min,
       MAX(CAST(question_no AS INTEGER)) AS q_max
FROM user_items
WHERE unit_id='M3_TRIGONOMETRIC_RATIO'
   OR bulk_batch_id LIKE '%trig%'
   OR unit_name LIKE '%삼각비%'
GROUP BY unit_id, bulk_batch_id, status
ORDER BY unit_id, bulk_batch_id, status;
```
★`unit_id` 를 **출력 컬럼에 넣었습니다.** 삼각비 문항이 엉뚱한 `unit_id` 로 들어가 있으면
여기서 그 값이 그대로 보입니다.

### 쿼리 4 — 배치ID 충돌 검사 (판정 B-3 표의 11개와 대조)

```sql
SELECT bulk_batch_id, COUNT(*) AS n FROM user_items
WHERE bulk_batch_id IN (
  'SCSTUDY-2026-08-23-m3-trig-00','SCSTUDY-2026-08-23-m3-trig-01',
  'SCSTUDY-2026-08-23-m3-trig-02','SCSTUDY-2026-08-23-m3-trig-03',
  'SCSTUDY-2026-08-23-m3-trig-04','SCSTUDY-2026-08-23-m3-trig-05',
  'SCSTUDY-2026-08-23-m3-trig-06','SCSTUDY-2026-08-23-m3-trig-07',
  'SCSTUDY-2026-08-23-m3-trig-08','SCSTUDY-2026-08-23-m3-trig-09',
  'SCSTUDY-2026-08-23-m3-trig-10')
GROUP BY bulk_batch_id ORDER BY bulk_batch_id;
```
★여기서는 **빈 결과가 곧 "충돌 없음"이고, 그렇게 읽어도 됩니다** — 쿼리 1이 이미
"쿼리가 돈다"를 증명했기 때문입니다. 순서를 지키는 것이 이 쿼리의 전제입니다.

---

## 3. ★정정 — 검수 채팅에 도착한 부분본은 Code탭 산출물이 아닙니다

판정문 §0 "전달 파일 주의" 항목에 대한 답입니다.

```
Code탭이 만든 프로브 CSV 는 ★1개뿐입니다
  B_trig_pdf_headers_probe.v1.csv   1,549행 · 6컬럼
지시문의 4컬럼 이름 버전은 ★만든 적이 없습니다
```

문제의 파일을 실물로 확인했습니다 (`Downloads\B_trig_pdf_headers_probe.v1 (1).csv`).

```
행수    150            무접미사 파일 1개분
컬럼    source_file, question_no, pdf_label, correct_rate   ← ★지시문에 적힌 이름 그대로
생성    Code탭이 본체를 낸 뒤에 만들어짐
```

★**즉 누군가 지시문의 컬럼 사양을 그대로 따라 별도로 만든 파일**입니다.
판정문 §다음단계의 "클로드 새 채팅"이 유력하지만 Code탭은 단정하지 않습니다.

**데이터 자체는 정상입니다.** 제 본체의 무접미사 150행과 대조했습니다.

```
라벨 + 정답률 불일치 : 0 / 150
제 프로브에 없는 문항 : 0
```
검수의 "불일치 0건" 판정과 같은 결론입니다.

### ★그런데 이름이 위험합니다

```
본체      B_trig_pdf_headers_probe.v1.csv
부분본    B_trig_pdf_headers_probe.v1 (1).csv     ← ★브라우저 사본 접미사 형태
```

파일명만 보면 **본체의 복사본으로 보입니다.** 실제로는 행수도 컬럼도 다른 별개 산출물입니다.
★공교롭게도 이것은 §5에서 보고하고 판정 C 로 채택된 그 사고 유형 —
**"내용은 멀쩡한데 선언(이름)이 틀린다"** 와 정확히 같은 모양입니다.
닮음 9회 + 삼각비 태깅본 3/3 에 이어, 이번엔 프로브 산출물에서 났습니다.

**권고**
```
① 부분본을 폐기하거나 이름을 바꿀 것
   예: B_trig_headers_partial_set00_4col.v1.csv  (부분본임이 이름에 드러나게)
② 앞으로 산출물을 여러 채팅이 동시에 만들면 ★파일명 접두사를 분리할 것
   Code탭 산출물만 B_ 접두사를 쓰는 등
③ 검수는 받은 CSV 의 ★행수를 먼저 셀 것. 1,549 가 아니면 본체가 아니다
```

---

## 4. 판정 수용 확인

```
판정 A  컬럼명 유지          ✔ 재생성하지 않았습니다
판정 B  배치ID 표 확정        ✔ 수용. set 번호 (가)/(나) 조사 ★중단했습니다
        ★무접미사=00, (N)=N. 오프셋 없음. 산술이 개입하지 않는 규칙이라 더 안전합니다
판정 C  §5 권고 3항 채택      ✔
판정 D  라벨 단조감소의 쓰임   ✔ 식별에 쓰지 않습니다. 정답률 수열로만 식별합니다
        ★원의 성질 근거가 16파일 중 4개뿐이라는 한계도 접수했습니다
```

**하지 말 것 재확인**
```
✔ set 번호 조사 중단          판정 B-1 로 종결
✔ 카탈로그 무접촉             108/108 완결. 손대지 않았습니다
✔ 전사 시작 안 함             본문 한 건도 읽지 않았습니다
✔ D1 쓰기 없음                이 문서는 SQL 제안이고 실행은 사용자 몫입니다
✔ 프로브 CSV 재생성 안 함     판정 A
```

---

## 5. 대기 상태

```
Code탭은 지금 착수 가능한 작업이 없습니다. 다음 둘 중 하나가 오면 재개합니다.
  ① 위 쿼리 1~4 결과      -> 기투입 여부 판정 + 필요 시 중복 대응
  ② 검수의 다음 지시
★판정문대로 급하지 않습니다. 첫 배치 투입 직전까지만 ① 이 나오면 됩니다
```
