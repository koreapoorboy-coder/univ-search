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

## ★ 선결 조건 — 오버레이가 engine_data_base에서 열리는지

### engine_data_base가 어느 주소인가 (리포에서 확인됨)
- 고정 설정 주소가 **아니다**. `index.html:542 engineDataBase()` = `new URL('.', location.href)` = **진단 페이지(index.html)가 열리는 그 디렉터리 URL 자체**. 요청 때 클라이언트가 Worker에 실어 보냄(541행 주석: 배포처 바뀌어도 어긋나지 않게 한 설계).
- **즉 = 진단 페이지를 여는 위치.** 예) 페이지가 `https://<호스트>/math-weakness-engine/index.html`이면 base=`https://<호스트>/math-weakness-engine`, 오버레이=`https://<호스트>/math-weakness-engine/data/axis_map/qf_pt_fine_error_tags.v1.json`.

### 확인 방법 (사용자)
1. 평소 진단 페이지(index.html)를 여는 주소에서 파일명만 바꿔 브라우저로 직접 연다:
   `<진단페이지 디렉터리>/data/axis_map/qf_pt_fine_error_tags.v1.json`
2. **성공 기준**: JSON이 뜨고 `"n_pt": 46` + `pt_fine_error_tags`에 `M3_QFUNC_PT###` 키들이 보이면 OK(200).
3. **404면**: 데이터 호스트가 이 커밋 이후로 갱신 안 된 것. 데이터 호스팅이 **GitHub Pages면 push 후 반영에 통상 1~2분** 지연(Actions 빌드 시간). Pages 배포 완료(리포 Actions 초록불) 뒤 재확인.
4. 진단 페이지와 데이터가 같은 정적 호스트(같은 리포 public)면 페이지가 뜨는 한 오버레이도 같이 떠 있음 — 별도 배포 불필요.

## fail-open 동작 (오버레이 못 읽어도 진단 안 죽음)
- `fetchFineErrorTagOverlay`는 경로 미등록·dataBase 없음·`!res.ok`(404 등)·JSON 파싱 실패·네트워크 예외 **전부 `{}` 반환**(try/catch).
- 그러면 `fetchUnitProblemTypes`에서 각 PT `fine_error_tags: []` → 메뉴가 ②이전과 **동일** → AI 동작 종전과 같음.
- **결정적**: 오버레이 fetch는 `problem_types` fetch 뒤 **독립 try/catch**. 오버레이 실패가 problem_types 로딩·유형배정·진단에 **전혀 영향 없음**. 진단은 정상 진행, fine 후보만 빠짐.
- ⇒ **오버레이는 순수 가산 강화. 실패 시 자동으로 ②이전 상태로 격하(graceful).** 배포 위험 낮음.

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

## 배포 후 검증 계획 (단계별 성공 판정 기준)

**1단계 — 배포 확인**
- 실행: `curl https://<worker-도메인>/health` (또는 `/config`).
- ✅ 성공: 응답 `version == "2026.08.09-fine-error-tags"`.
- ❌ 실패: 옛 version → 배포 안 됨. `wrangler deploy` 재실행·에러로그 확인.

**2단계 — 오버레이 접근** (위 "선결 조건" 확인법)
- ✅ 성공: 오버레이 URL 200 + `n_pt:46`.
- ❌ 실패: 404 → 데이터 호스트 갱신/Pages 반영 대기. (이 상태로 3단계 가면 fail-open으로 fine태그 안 나옴 = ②무효지만 진단은 정상.)

**3단계 — Worker가 fine태그를 내는가** (②의 핵심 실효)
- 실행: QF가 `scope.candidate_units`에 포함된 실제(또는 샘플) 시험지 1건을 Worker에 태움.
- ✅ 성공: 반환 attempts 중 QF 오답의 `observed_error_tags`에 **오버레이 fine태그가 1개 이상** 등장(예: `quadratic_vertex_form_reconstruction_failure`·`parabola_coefficient_width_direction_confusion`·`quadratic_translation_parameter_sign_confusion`). 즉 오버레이 vocab과 **문자열 일치**하는 태그가 나옴.
- ⚠ 부분: 거친태그·자연어만 나오고 fine태그 0 → 유도 실패(프롬프트 준수율 낮음). 후보 표시 강도/문구 재조정 대상. (진단 자체는 정상.)
- ❌ 실패: `observed_error_tags` 전부 빈배열 → 2단계(오버레이 404) 또는 Worker 미배포 의심.

**4단계 — observed_axes가 실데이터로 채워지는가** (①b와 연결)
- 실행: 3단계 Worker 출력(attempts)을 엔진 `diagnoseWithGuidance`에 투입(debug.html 붙여넣기 또는 런타임).
- ✅ 성공: `observed_axes`에 축(C1~ 등)이 **fine태그 유래로** 산출됨. fine태그가 `fine_tag_to_axis.v1.json`에 매핑된 만큼 축 분포가 나옴. (③ 활성이면 `triggered_rules`도 함께 확인 가능.)
- ❌ 실패: `observed_axes` 빈배열 → fine태그가 축맵에 없거나(오버레이-축맵 불일치) 3단계 fine태그 부재.

**5단계 — 팽창 재측정** (별건 백로그 `ISSUE_pt_error_tags_attribution` 검증)
- 실행: observed_error_tags가 fine태그로 **채워진** 실입력으로 통제실험(그 백로그 표와 동일 방식) 재실행. 대조군=observed 빈 입력(pt.error_tags만).
- ✅ 성공(완화 확인): observed 채운 쪽이 pt.error_tags 단독 대비 **발화가 관측신호에 더 정합**(엉뚱한 규칙 발화↓, wrong_count 팽창비↓). → ②가 귀속문제 완화책임을 실증.
- ❌ 완화 안 됨: 팽창 지표 그대로 → pt.error_tags 병합 자체를 손대는 전역 트랙(백로그 "손댈 경우의 방향") 필요.

## 롤백
- 리포: `git revert <이 커밋>` → skeleton 원복.
- 라이브: 이전 버전 코드로 `wrangler deploy` 재실행(또는 Cloudflare 대시보드 Deployments에서 이전 배포로 rollback). VERSION으로 확인.
- 오버레이 파일은 데이터라 그대로 둬도 무해(아무도 안 읽으면 no-op).

## 미결/주의
- ⚠ 오버레이 `qf_pt_fine_error_tags.v1.json`의 `purpose`/`join` 메타 문자열에 모지바케 잔존(①a PS5.1 ANSI 잔재). **데이터(pt_fine_error_tags, 영문)는 정상** → 기능 무해. 정리하려면 메타만 ASCII로 재작성.
- ② 유도는 소프트(프롬프트). 후보 준수율은 배포 후 실측으로 확인.
- 확대: 타 단원은 `FINE_OVERLAY_BY_UNIT`에 오버레이 추가 등록하면 동일 방식 적용(시범 QF 성과 확인 후).
