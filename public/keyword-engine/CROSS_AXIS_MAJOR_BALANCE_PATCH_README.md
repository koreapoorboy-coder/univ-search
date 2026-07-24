# Assessment × Seed Cross-Axis / Major-Balance Patch v3

## 1. 목적

이 패치는 수행평가 데이터가 보고서의 제목과 본문 구조를 실제로 결정하도록 수정한다.

핵심 생성 순서는 다음과 같다.

1. 실제 수행평가 레코드의 과제명·원문·과목·학년을 일치시킨다.
2. 수행평가의 `topic_formula`, `structure_id`, `method_axis`, `output_axis`, `rubric_axis`, `avoid_modes`를 방법축으로 사용한다.
3. 실제 `seed-bank-v2` 레코드에서 교과와 선택 키워드에 맞는 내용축을 찾는다.
4. 방법축과 내용축을 교차해 구체적인 제목과 완성 보고서를 생성한다.
5. 학과·진로는 핵심 생성값이 아니라 최대 5%의 보조값으로만 사용한다.

## 2. Claude 검수안 반영 항목

- 수행평가 방법축과 보고서 시드 내용축을 분리한 뒤 교차한다.
- 과제 원문에 들어 있는 문항 수·자료 수·산출물 수 제약을 보존한다.
- 보고서 구조는 고정된 `서론-본론-결론`이 아니라 실제 `structure_id`를 따른다.
- 수행평가의 `avoid_modes`와 시드의 `badPatterns`, `mustNotDo`를 함께 회피한다.
- 산출물과 채점 요소를 본문·방법·결과에 반영한다.
- 자료가 없을 때 확인되지 않은 수치·출처·결과를 만들지 않는다.

## 3. 학과 검색 영향 제한

생성 우선순위는 다음과 같이 고정했다.

- 수행평가 원문 요구: 35%
- 교과 개념: 30%
- 선택 키워드와 내용 시드: 20%
- 수행 방법과 산출물: 10%
- 학과·진로 동점 보조: 5%

수행평가가 진로·학과 탐구를 직접 요구하지 않는 경우 학과 정보는 다음 항목에서 제외된다.

- 보고서 제목
- 핵심 탐구 질문
- 본론의 비교·분석 기준
- 핵심 결론
- 키워드 자동 대체

허용되는 위치는 동점 주제 후보 정렬, 고찰 마지막의 확장 한 문장, 후속 탐구 후보뿐이다.

## 4. 실제 엔진 파일 기준 규모

- 수행평가 기록: 7,131건
- 수행평가 기준 학교: 54개교
- 보고서 내용 시드: 294건
- 주제 생성 공식: 19종
- 보고서 구조: 17종

이 패치는 문서에 적힌 예상 수량이 아니라 저장소에 실제 존재하는 파일을 다시 읽어 런타임을 만든다.

## 5. 보고서 출력 변경

기존 출력:

- `발전의 사례 비교형 탐구`처럼 유형명이 제목이 됨
- 설계서·입력 안내·수정 문구가 본문에 섞임
- 학과명이 제목과 결론을 지배함
- 고정된 서론·본론·결론 중심

수정 출력:

- 대상·변인·조건·교과 개념이 드러나는 구체적 제목
- 실제 수행평가 `structure_id`별 보고서 섹션
- 원문 수량·문항·산출물 제약 반영
- 결과와 해석·고찰 분리
- 느낀 점과 참고자료 포함
- 학과는 후속 탐구에만 제한적으로 연결

검증 예시:

`확률과 통계 × 문제 조건 변형 수행평가 × 지반 붕괴 경보 시스템`

→ `지반 붕괴 경보 시스템의 오경보·미탐지 조건 재구성: 조건부확률·베이즈 정리·사건의 독립성을 중심으로`

동일 입력에서 학과를 환경공학과·컴퓨터공학과로 바꾸어도 핵심 제목은 바뀌지 않는다.

## 6. 적용 경로

ZIP을 압축 해제한 뒤 내부 파일과 폴더를 아래 위치에 그대로 덮어쓴다.

```text
univ-search/public/keyword-engine/
```

패치의 최상위 폴더 자체를 한 단계 더 넣지 않는다.

## 7. 데이터 추가 후 재생성

수행평가 레코드 또는 `seed-bank-v2`가 추가되면 저장소의 `public/keyword-engine` 위치에서 실행한다.

```bash
python build/build_assessment_seed_cross_axis_runtime.py
```

생성 파일:

```text
data/assessment/bridge/assessment_seed_cross_axis.v2.json
```

## 8. 주요 적용 파일

```text
index.html
assets/assessment_keyword_bridge_helper.js
assets/js/mini_payload_builder.js
assets/js/mini_worker_generate_bridge_v32.js
data/assessment/bridge/assessment_seed_cross_axis.v2.json
build/build_assessment_seed_cross_axis_runtime.py
```
