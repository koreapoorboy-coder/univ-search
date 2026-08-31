# 도형의 성질 최종 축 2,340건 D1 이관 dry-run v1

- 작성일: 2026-08-31
- 결과: **통과**
- 실제 D1 쓰기: **0건**
- 학생 화면·프로필·처방 변경: **없음**

## 1. 이관 방식

원의 성질과 같은 1단계 계약을 사용한다. 문항별 축 정본은 정적 JSON 후보이며, 별도 item_axes·item_analysis_registry·user_item_analysis·failed_steps D1 테이블을 만들지 않는다. 학생 풀이에서 생긴 Shadow 관측만 기존 axis_records.attempts JSON에 저장하는 구조다.

이번 dry-run은 정적 후보가 현재 D1 추출본의 user_items.id·unit_id·content_hash를 정확히 가리키는지만 확인했다. 정적 레지스트리의 운영 경로 반영은 다음 별도 게이트다.

## 2. 전량 대조 결과

| 항목 | 결과 |
|---|---:|
| D1 추출본 전체 | 2348 |
| 테스트·스모크 제외 | 8 |
| Shadow 대상 | 2340 |
| 원본(primary) | 2265 |
| 별칭(alias) | 75 |
| D1 ID 존재 | 2340 |
| 단원 일치 | 2340 |
| normalized_item_content.v1 재계산 일치 | 2340 |
| profile_eligible=false | 2340 |
| 원본 4축 계약 일치 | 2265 |
| 별칭 참조 계약 일치 | 75 |
| 비테스트 누락 | 0 |
| 오류 | 0 |

별칭 75건은 축을 복제하지 않고 각자의 content_hash와 axes_ref_user_item_id만 가진다. 참조 대상은 모두 2,265개 원본 중 하나다.

## 3. D1 읽기 전용 SQL

B_geometry_2340_D1_readonly_dryrun.v1.sql은 SELECT와 CTE만 포함한다. 콘솔 입력 크기를 줄이기 위해 2,340건을 4개 청크(585+585+585+585)로 나눴다.

- 단원 센티널 기대값: 전체 2,348, 고유 ID 2,348, 빈 ID 0
- 금지된 별도 축 테이블·뷰: 0행
- 각 청크: 누락 0, 단원 불일치 0

오프라인 D1 추출본에서는 위 조건이 전부 통과했다. D1의 기존 content_hash 컬럼은 qnorm.v1 중복검사용이므로 축 해시와 비교하지 않는다. 축 전용 normalized_item_content.v1 해시는 unit_id·question_text·answer·explanation에서 별도로 재계산해 2,340건 전부 확인했다. SQL을 라이브 D1에서 실행해도 쓰기는 발생하지 않는다.

운영 D1 읽기 전용 실측은 다음과 같다.

| 항목 | 결과 |
|---|---:|
| answer NULL / 빈 문자열 | 0 / 1 |
| explanation NULL / 빈 문자열 | 0 / 443 |
| pending | 0 |
| approved | 1,980 |
| archived | 368 |

따라서 도형의 성질 Shadow 운영 조회는 approved 문항만 대상으로 한다. archived 368건 중 8건은 테스트 문항이며, 나머지 360건은 정적 레지스트리에 보관하되 현재 조회에는 쓰지 않는다.

## 4. 경고와 해석

독립 검수 후 축 명세의 분포 요약도 최종 2,340건 결과와 동기화했다. 문항 레코드·축 값 계약·설명용 메타데이터 모두 경고 없이 통과했다.

## 5. 결론

- D1 INSERT 예정: **0건**
- D1 UPDATE 예정: **0건**
- D1 DELETE 예정: **0건**
- 정적 Shadow 후보로 연결 가능한 문항: **2340건**
- 다음 게이트: 정적 레지스트리 생성 및 Shadow 조회 경로 확장

실제 D1과 기존 학생 화면은 전혀 변경하지 않았다.
