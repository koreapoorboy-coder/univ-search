수행평가 탐구엔진 keyword-engine 이어서 진행한다.

이번 채팅 범위는 3번·4번이다.

현재 상태:
- 보고서 구조/틀 완료
- mini로 데이터 넘기는 구조 완료
- 학과 라우팅 1차 잠금 완료
- 도서 추천/보고서 생성 구조는 이번 채팅에서 수정하지 않는다.
- 지금은 새 데이터를 만드는 단계가 아니다.
- 실제로 들어 있는 기존 데이터만 기준으로 정렬 로직과 우선순위를 조정한다.

3번·4번 작업 범위:
- 교과 개념 추천
- 추천 키워드 정렬
- 4번 후속 연계축 정렬
- 횡단 연결
- 종단 연결
- 교과 간 연결
- 전공 보정
- 선택값이 mini payload로 정확히 넘어가는지 확인

수정 가능 파일:
- assets/textbook_concept_helper.js
- seed/textbook-v1/subject_concept_engine_map.json
- seed/followup-axis/major_followup_axis.json
- seed/followup-axis/subject_bridge_point.json
- seed/followup-axis/*_concept_longitudinal_map.json

수정 금지:
- 학과 라우팅
- 보고서 구조
- mini worker 구조
- 도서 추천 구조
- UI 구조
- major_search_fast_guard.js 재추가

현재 A묶음 상태:
- A-2 완료
- A-3 완료
- A-4 완료
- A-5 완료
- A-1만 보정 필요
- A-1에서 지수함수와 로그함수의 활용 선택 시 1번 계열과 3번 계열의 1순위 축이 잘못 나옴
- 새 데이터 추가가 아니라 기존 3개 축의 우선순위만 수정해야 함

작업 방식:
1. 먼저 zip 내부에서 3번·4번 관련 파일만 확인한다.
2. 전체 구조를 다시 분석하지 않는다.
3. 실제 존재하는 데이터만 기준으로 판단한다.
4. 화면에 없는 기대값을 새로 만들지 않는다.
5. 미흡 항목만 최소 패치한다.
6. 정상 확인되면 A묶음을 잠근다.

전체 파일을 주는게 아니라 패치파일만 제공한다.
