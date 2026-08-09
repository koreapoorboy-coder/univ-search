# 9단원 확대 — 배포·확인 절차 (브라우저 위주) (2026-08-09)

> ★ similarity/geometry 첫 검증은 **로컬 검증서버(localhost:8731)** 였음 — 배포본 아님. **배포본에서 다시 통과해야 확대가 실제로 끝남.** circle 복구가 index를 또 건드리므로, 이 배포 확정 전엔 circle 착수 안 함(원인 판별 분리).

## 사용자 작업 = 2가지 (Worker 1회 + 사이트 갱신)

### A. Worker 재배포 (지난 Worker 배포와 동일 방법)
- 지난번(fine-error-tags) 배포한 그 방법 그대로 — **바뀐 파일** `worker_skeleton/math_diagnosis_worker.js` 를 올린다.
  - Cloudflare 대시보드 사용 시: Workers & Pages → 해당 Worker → Edit code → 새 파일 내용 붙여넣기 → **Save and deploy**.
- **브라우저 확인**: 주소창에 `https://<worker-도메인>/health` 입력 → 응답 JSON의 `version` 이
  **`2026.08.09-fine-overlay-index-driven`** 이면 새 코드 라이브. (옛 버전이면 배포 안 됨.)

### B. 사이트(데이터) 갱신
- Code탭이 커밋·push는 마침. 진단 페이지 호스트가 **GitHub Pages면 자동 빌드**(~1~2분). 저장소 Actions 초록불 뜨면 반영됨. (수동 호스팅이면 그쪽 동기화.)
- **브라우저 확인 2가지**:
  1. 주소창에 `<데이터 base>/data/axis_map/m2_similarity_pythagoras.pt_fine_error_tags.v1.json` → **JSON이 뜨고 `n_pt` 보이면 200 OK**. (404면 아직 반영 전 → 대기 후 재시도.)
  2. `<데이터 base>/data/index.v1.json` 열고 `Ctrl+F` 로 `fine_error_tags_overlay` 검색 → **여러 건 나오면 갱신됨.**
  - ※ `<데이터 base>` = 평소 진단 페이지(index.html) 여는 그 디렉터리.

## 배포본 재검증 (★ 로컬 아닌 배포 URL에서)
1. 주소창에 **`<데이터 base>/overlay_tester.html`** 입력. (URL이 `localhost` 가 아니라 실제 사이트 주소여야 함 — 이게 "배포본에서 검증"의 핵심.)
2. **Worker 주소** 입력. **단원 드롭다운**이 index에서 10단원 자동으로 채워지면 사이트 갱신 정상.
3. **similarity**: 단원 `M2_SIMILARITY_PYTHAGORAS` + [닮음 예시] → 실행 → ✅ fine태그 검출.
4. **geometry**: 단원 `M2_GEOMETRY_PROPERTIES` + [도형의성질 예시] → 실행 → ✅ fine태그 검출(저커버라 미커버 PT면 0 가능·재시도).
- **둘 다 fine 나오면 = 배포본에서 9단원 확대 확정.** (이게 끝나야 circle 착수.)

## 실패 시 (브라우저)
- `/health` 옛 버전 → Worker 미배포. A 재실행.
- 오버레이 URL 404 → 사이트 미반영. Actions 완료 대기 후 B 재확인.
- 드롭다운이 10단원 미만/비어있음 → index 미반영 또는 오버레이 404.
- fine 0(양쪽) → 위 셋 중 하나. `overlay_tester` 하단 메타의 fine 종수·오버레이 경로 확인.

## 이 확정 후 → circle·statistics 복구 착수 (별도)
