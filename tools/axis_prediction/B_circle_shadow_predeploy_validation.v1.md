# 원의 성질 Shadow 운영 배포 전 검증 v1

- 검증일: 2026-08-29
- 단원: `M3_CIRCLE_PROPERTIES`
- D1 실제 쓰기: 0건
- 검증 결과: PASS

## 데이터 계약

| 항목 | 결과 |
|---|---:|
| D1 등록 문항 | 2,168 |
| 고유 ID | 2,168 |
| ID 누락·중복 | 0 |
| 문제·정답·해설 누락 | 0 |
| 정적 Shadow 레지스트리 | 2,168 |
| 축 판정 완료 | 2,168 |
| 미판정 | 0 |
| 잘못된 ID·단원·해시 | 0 |
| `profile_eligible:true` | 0 |

## 자동검사

| 검사 | 통과 | 실패 |
|---|---:|---:|
| Shadow 런타임 계약 | 1 | 0 |
| 기존 다단원 문항 결합 | 49 | 0 |
| 실제 데이터 다단원 진단 | 11 | 0 |
| fail-closed 커버리지 화면 | 17 | 0 |
| item axis v1 명세 | 1 | 0 |
| item axis v2 회귀 | 1 | 0 |

학생용 첫 화면에서 `shadow`, `item_axes`, `diagnostic_authority` 내부 문구와 원본 JSON이 보이지 않는 것을 브라우저로 확인했다.

기존 회귀 픽스처가 `M3_CIRCLE_PROPERTIES`를 자료 없는 단원으로 사용하던 가정은 폐기했다. 원의 성질 자료가 실제로 구축됐기 때문이다. 자료 결손 fail-closed 검사는 인덱스에만 등록된 합성 결손 단원으로 교체해 같은 계약을 독립 검증했다.

## 안전장치

- `student_output:false`
- `profile_eligible:false`
- `diagnostic_authority:false`
- `remediation_enabled:false`
- 문항 축은 정적 레지스트리에서 지연 조회
- 실제 학생 관측만 기존 `axis_records.attempts[].shadow_analysis`에 저장
- 별도 D1 문항 축 테이블을 생성하지 않음

## 배포 경계

정적 웹 파일은 GitHub Pages 배포 대상이다. Worker 변경은 Cloudflare Worker에 별도 배포해야 실제 문항 연결과 Shadow 관측 저장이 작동한다. 운영 Worker 배포 후 `/health`의 버전이 `2026.08.28-circle-shadow-v1`인지 확인한다.
