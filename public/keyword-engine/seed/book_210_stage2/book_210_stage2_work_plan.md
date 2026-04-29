# 5번 도서 연결 Stage2 작업 순서

## 원칙

도서 추천은 절대 학과 단독 추천이나 일반 도서 추천으로 가면 안 된다.  
반드시 아래 payload를 상속해야 한다.

```txt
과목 → 학과 → 3번 선택 개념 → 추천 키워드 → 4번 후속 연계축 → 5번 도서 추천
```

## Step 1. 도서 데이터 통합

입력:
- `book_210_stage1_integrated_master.json`

출력:
- `book_source_master_210.json`
- `book_matching_index_210.json`

처리:
- 제목, 저자, source_id, 기존 book_id 분리
- title_alias 후보 정리
- 관련 교과, 관련 학과, 핵심 키워드, MINI 활용 메모 정규화
- 직접 일치 도서 / 확장 참고 도서 분류 기준 유지

## Step 2. 도서 매칭 점수 설계

추천 점수는 단일 키워드가 아니라 payload 누적값으로 계산한다.

권장 점수 구조:

```txt
선택 개념 직접 일치        +40
추천 키워드 직접 일치      +35
4번 후속 연계축 일치       +30
학과/전공군 일치           +15
과목/교과군 일치           +10
확장 참고 적합성           +5~15
```

중요:
- 학과만 맞는 도서는 직접 일치 도서로 올리지 않는다.
- 교과 개념 또는 추천 키워드와 연결되지 않으면 확장 참고 이하로만 둔다.
- 4번 후속 연계축이 바뀌면 5번 도서 결과도 바뀌어야 한다.

## Step 3. Payload adapter 추가

필수 입력값:
```js
{
  subject,
  department,
  selectedConcept,
  selectedRecommendedKeyword,
  axisPayload,
  followupAxis,
  reportIntent
}
```

필수 출력값:
```js
{
  directBooks: [],
  expansionBooks: [],
  selectedBookSummary: {},
  inheritedPayload: {}
}
```

## Step 4. UI 유지

현재 구조는 유지한다.

```txt
직접 일치 도서
- 선택 키워드와 직접 맞는 도서 우선

확장 참고 도서
- 보고서 확장에 참고할 수 있는 도서
```

우측 선택 도서 요약 카드도 유지한다.

## Step 5. 검수 기준

정상 기대값:
- 3번 선택 개념을 바꾸면 추천 키워드가 바뀐다.
- 추천 키워드를 바꾸면 4번 후속 연계축이 바뀐다.
- 4번 후속 연계축이 바뀌면 5번 도서 추천이 바뀐다.
- 학과만 입력해도 도서가 바로 뜨면 안 된다.
- 도서는 항상 기존 payload 근거를 표시해야 한다.

오류 판단:
- 모든 학과에서 같은 책이 반복됨
- 학과만으로 책이 뜸
- 3번/4번 선택과 무관한 책이 뜸
- 직접 일치와 확장 참고 구분이 사라짐
- 기존 3번·4번 UI/로직이 깨짐

