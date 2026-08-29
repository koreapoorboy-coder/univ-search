# 원의 성질 2,168문항 D1 읽기 전용 확인 결과 v1

- 확인일: 2026-08-29
- 단원: `M3_CIRCLE_PROPERTIES`
- 실행 주체: 사용자 D1 Console
- D1 변경: 없음

## 1. 확인 결과

| 항목 | 결과 |
|---|---:|
| 등록 문항 | 2,168 |
| 고유 `user_items.id` | 2,168 |
| 빈 ID | 0 |
| 중복 ID 행 | 0 |
| 빈 문제 본문 | 0 |
| 빈 정답 | 0 |
| 빈 해설 | 0 |
| 최초 갱신 시각 | 2026-08-22T13:03:32.413Z |
| 최종 갱신 시각 | 2026-08-23T15:08:25.378Z |

`user_items.id`는 TEXT 기본키다. `unit_id`, `question_text`, `answer`, `explanation`, `content_hash`, `question_no`를 포함한 23개 컬럼을 확인했다.

## 2. D1 저장 구조 확인

예정 이름인 `item_axes`, `item_analysis_registry`, `user_item_analysis`, `failed_steps` 테이블·뷰는 존재하지 않는다. 이름에 `axis` 또는 `analysis`가 들어간 기존 객체는 `axis_records` 테이블 하나다.

따라서 승인된 1단계 구조를 유지한다.

- 문항별 축 정본: 프로그램에 포함된 정적 레지스트리
- 학생 풀이에서 생긴 Shadow 관측: 기존 `axis_records.attempts` JSON
- 별도 문항 축 D1 테이블: 만들지 않음
- 기존 학생 화면 출력: 하지 않음
- 학생 프로필·처방 반영: 하지 않음

## 3. 후속 처리

정적 Shadow 레지스트리를 최종 판정본으로 갱신했다.

- 레코드: 2,168
- 판정 완료: 2,168
- 미판정: 0
- `profile_eligible:true`: 0
- 레지스트리 SHA-256: `7F2B6A9B19B83FC61D13BD4D457B47CF65F94D2C1B016973887717F5B678A156`
- 자동검사 오류: 0
- D1 실제 쓰기: 0

다음 별도 게이트는 배포 전 최종 검토다. 배포 전까지 학생이 사용하는 운영 프로그램과 D1 데이터에는 영향이 없다.
