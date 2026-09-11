# 탐구 엔진 연결 지도

2026-09-11 기준. 개발 중에는 두 가지 접속 길을 모두 열어 둔다. 완성 후 한쪽을 막을 예정이다.

## 구성 요소

| 이름 | 역할 | 코드 위치 | 운영 주소 |
|---|---|---|---|
| 사이트 (Pages `univ-search`) | 학생 화면, 보고서 표시·복사·다운로드 | `public/keyword-engine/` | https://univ-search.pages.dev/keyword-engine/ |
| gateway (`access-gateway`) | 접속 코드 확인, 사용 횟수 차감, 사이트 중계 | `access_gateway/worker.js` | https://access-gateway.koreapoorboy.workers.dev |
| Worker (`curly-base-a1a9`) | 입력 검증, 보고서 생성(AI 호출), 기록 저장 | `admission_worker_skeleton/worker.js` | https://curly-base-a1a9.koreapoorboy.workers.dev |
| 예시·seed 데이터 | Worker가 보고서 생성 때 읽는 자료 | `public/keyword-engine/seed/` | jsDelivr `@main` (GitHub `main` 브랜치) |
| 기록 저장소 (D1 `keyword-engine-db`) | 생성 요청 기록 | Worker 바인딩 `DB` | — |
| 횟수 저장소 (KV `ACCESS_KV`) | 접속 코드별 사용 횟수 | gateway 바인딩 | — |

## 길 A — 사이트 주소로 바로 접속 (횟수 차감 없음)

```
학생 브라우저 (univ-search.pages.dev/keyword-engine/)
  ├─ ① 입력 검증     → Worker /live-intake
  ├─ ② 기록 저장     → Worker /collect → D1
  └─ ③ 보고서 생성   → 사이트 /__mini/generate  (정적 사이트라 405)
                       → 자동 전환 → Worker /generate → AI → 보고서
```

## 길 B — 접속 코드 주소로 접속 (횟수 차감)

```
학생 브라우저 (access-gateway…/<접속코드>/)
  ├─ 화면           → gateway가 사이트 화면을 중계하고 접속 코드를 쿠키에 저장
  ├─ ① 입력 검증     → Worker /live-intake   (gateway를 거치지 않음)
  ├─ ② 기록 저장     → Worker /collect → D1  (gateway를 거치지 않음)
  └─ ③ 보고서 생성   → gateway /__mini/generate
                       → 접속 코드·남은 횟수 확인 → Worker /generate → AI
                       → 완성 보고서일 때만 1회 차감 (v241부터)
```

- 현재 접속 코드는 모두 만료되어 길 B는 막혀 있다. 최종 배포 때 새 코드를 발급한다.
- gateway 응답이 오류(403·502 등)이면 사이트는 Worker로 전환하지 않고 오류를 보여 준다. 그래서 길 B에서는 횟수 확인을 건너뛸 수 없다.

## 배포와 반영 경로

| 무엇을 바꾸면 | 어디에 반영되나 | 방법 |
|---|---|---|
| `public/keyword-engine/` 화면·bridge | 사이트 | `node tools/build_pages_deploy_dir.mjs <폴더>` 후 `wrangler pages deploy` (audit/·build/ 제외) |
| `admission_worker_skeleton/worker.js` | Worker | `wrangler deploy --config wrangler.production-report-v2.toml` |
| `access_gateway/worker.js` | gateway | `access_gateway`에서 `wrangler deploy` |
| `public/keyword-engine/seed/` 예시 데이터 | Worker가 읽는 자료 | GitHub `main`에 반영되어야 적용된다(jsDelivr `@main`). 사이트 배포만으로는 바뀌지 않는다. |

사이트 프로젝트는 GitHub와 연결되어 있다. `main` 푸시가 사이트에 영향을 줄 수 있으므로 푸시 전에 확인한다. 저장소에 자동 배포 설정(workflow)은 없다.

## 연결 점검

```
node tools/check_connections.mjs
```

사이트·gateway·Worker·예시 데이터를 한 번에 조회한다. 읽기만 하며, AI 호출이나 기록 저장은 일어나지 않는다. 결과의 "배포 대기"는 로컬이 운영보다 새 버전이라는 뜻이다.
