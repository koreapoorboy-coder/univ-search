# 배선 ② — Worker fine태그 주입 (QF 시범) 편집안 + 사용자 배포 절차 (2026-08-09)

> ②는 Worker가 학생 답안에서 **재태깅 관측 어휘(fine error_tags)**를 내도록 유도한다. 그러면 `observed_error_tags`가 fine태그로 채워지고, 엔진의 `observed_axes`(①b)가 **실데이터**로 산출되며, `pt.error_tags` 의존(별건 `ISSUE_pt_error_tags_attribution`)도 완화된다. **QF 한정 시범**. 코드 변경만으로는 무효 — **사용자가 Cloudflare에 배포해야 실효.**

## 무엇을 바꿨나 (worker_skeleton, 커밋됨)
파일: `public/math-weakness-engine/worker_skeleton/math_diagnosis_worker.js` (가산적 3곳, 스키마 무변경)

1. **`FINE_OVERLAY_BY_UNIT` + `fetchFineErrorTagOverlay()` 신설**: 단원별 fine 오버레이 경로 맵(현재 QF만) → `${engine_data_base}/data/axis_map/qf_pt_fine_error_tags.v1.json` fetch, `pt_fine_error_tags`(PT→fine태그) 반환. 실패/부재 시 `{}`(fail-open).
2. **`fetchUnitProblemTypes()`**: 각 PT에 `fine_error_tags` 필드 부착(오버레이 조회). 오버레이 없는 단원은 빈 배열 → 종전과 동일.
3. **`assignTypesForUnit()` 프롬프트**: 유형 메뉴에 `[후보 오류태그] ...` 줄 추가 + 규칙 추가("[후보 오류태그] 있으면 그 중 실제 관찰된 것 우선, 없는 것만 자연어로 최소 덧붙임"). **AI를 유도만 함(강제 아님)** → 부드럽고 안전.
4. VERSION `2026.07.22-five-states` → `2026.08.09-fine-error-tags`.

- **왜 안전**: 오버레이 없는 단원·부재 시 `fine_error_tags=[]` → 메뉴·동작 종전과 동일. `observed_error_tags` 스키마는 자유문자열 그대로(enum 강제 안 함). QF만 후보 주입.
- **문법 검증**: 브라우저 동적 import로 모듈 파싱·`default.fetch` 함수 확인 완료.

## ★ 선결 조건 (배포 전 확인)
오버레이 파일이 **`engine_data_base`에서 접근 가능**해야 한다. 파일은 리포에 커밋됨:
`public/math-weakness-engine/data/axis_map/qf_pt_fine_error_tags.v1.json`
→ `engine_data_base`가 이 리포의 `public/math-weakness-engine`(호스팅본)을 가리키면, **그 호스팅본을 이 커밋 이후로 갱신**해야 Worker가 파일을 받는다. (index.html·데이터 호스트가 GitHub Pages 등 별도면 그쪽도 배포 필요.)
확인법: 배포 후 브라우저에서 `https://<engine_data_base>/data/axis_map/qf_pt_fine_error_tags.v1.json` 직접 열어 200인지.

## 사용자 배포 절차 (Cloudflare Wrangler)
> Code탭은 배포 못 함(프로덕션·외부). 아래는 **사용자가** 실행.

작업 디렉터리: `public/math-weakness-engine/worker_skeleton/` (여기 `wrangler.toml`: name=`math-diagnosis-worker`, main=`math_diagnosis_worker.js`)

1. (최초 1회만) API 키 시크릿 — 이미 설정돼 있으면 건너뜀:
   ```
   wrangler secret put ANTHROPIC_API_KEY
   ```
2. 배포:
   ```
   wrangler deploy
   ```
3. 배포 확인 — VERSION이 올라갔는지:
   ```
   curl https://<worker-도메인>/health
   ```
   응답 `version`이 `2026.08.09-fine-error-tags`면 새 코드가 떠 있음.

## 배포 후 검증 (실효 확인)
1. QF가 시험범위(`scope.candidate_units`)에 포함된 실제(또는 샘플) 시험지를 Worker에 태움.
2. Worker 반환 attempts의 `observed_error_tags`에 **fine태그**(예: `quadratic_vertex_form_reconstruction_failure`, `parabola_coefficient_width_direction_confusion`)가 나오는지 확인. 종전엔 거친태그/빈값이었음.
3. 그 출력을 엔진에 넣어 `observed_axes`가 **실데이터**로 채워지는지(debug.html 또는 런타임).
4. **별건 백로그 재측정**: fine태그가 채워진 상태에서 `pt.error_tags` 의존/발화 팽창이 실제로 줄었는지 통제실험 재실행(`ISSUE_pt_error_tags_attribution` 참조).

## 롤백
- 리포: `git revert <이 커밋>` → skeleton 원복.
- 라이브: 이전 버전 코드로 `wrangler deploy` 재실행(또는 Cloudflare 대시보드 Deployments에서 이전 배포로 rollback). VERSION으로 확인.
- 오버레이 파일은 데이터라 그대로 둬도 무해(아무도 안 읽으면 no-op).

## 미결/주의
- ⚠ 오버레이 `qf_pt_fine_error_tags.v1.json`의 `purpose`/`join` 메타 문자열에 모지바케 잔존(①a PS5.1 ANSI 잔재). **데이터(pt_fine_error_tags, 영문)는 정상** → 기능 무해. 정리하려면 메타만 ASCII로 재작성.
- ② 유도는 소프트(프롬프트). 후보 준수율은 배포 후 실측으로 확인.
- 확대: 타 단원은 `FINE_OVERLAY_BY_UNIT`에 오버레이 추가 등록하면 동일 방식 적용(시범 QF 성과 확인 후).
