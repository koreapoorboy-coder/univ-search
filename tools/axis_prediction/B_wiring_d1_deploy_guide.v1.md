# B 이관 배포 가이드 (D1 · 대시보드 단계별) (2026-08-10)

> 코드는 커밋됨. 아래는 **사용자 작업**(Cloudflare 대시보드 클릭 위주, D1 처음이라 상세). Worker 배포도 새 코드(`2026.08.10-axis-store-v2`)로 1회. 순서대로.

## 1) D1 데이터베이스 생성 (대시보드)
1. Cloudflare 대시보드 → 좌측 **Workers & Pages** → **D1 SQL Database** (또는 Storage & Databases > D1).
2. **Create database** → 이름 `scstudy-axis` → Create.
3. 생성되면 **Database ID**가 보임(나중에 wrangler 쓸 때만 필요, 대시보드 바인딩이면 불요).

## 2) 스키마 실행 (테이블 생성, 1회)
1. 방금 만든 `scstudy-axis` 클릭 → 상단 **Console**(콘솔) 탭.
2. 리포 파일 `data/db/axis_records.schema.v1.sql` 내용을 **전부 복사** → 콘솔에 붙여넣기 → **Execute**(실행).
3. 성공하면 `axis_records` 테이블 + 인덱스 3개 생성됨. (Tables 탭에서 확인.)

## 3) Worker에 D1 바인딩 (대시보드)
1. 대시보드 → **Workers & Pages** → 진단 Worker(math-diagnosis-worker) 클릭.
2. **Settings** → **Bindings**(또는 Variables and Bindings) → **Add binding** → **D1 database**.
3. **Variable name**에 정확히 `AXIS_DB` 입력(코드가 이 이름을 씀) → **D1 database**에서 `scstudy-axis` 선택 → Save.

## 4) 쓰기 키 secret (대시보드)
1. 같은 Worker → **Settings** → **Variables and Secrets**(또는 Environment Variables) → **Add**.
2. 이름 `RECORD_WRITE_KEY`, 값 = **교사가 정한 아무 문자열**(예: 길고 추측 어려운 것). **Type: Secret(암호화)** 선택 → Save.
   - ⚠ 이 값이 진단 페이지·profile에 넣을 "쓰기 키"와 **같아야** 함(뒤 7번).
3. (권장) `CORS_ALLOWED_ORIGINS` 변수에 진단 페이지 주소(오리진, 예 `https://호스트`) 추가 → 브라우저 교차오리진 차단 보강.

## 5) Worker 재배포 (새 코드)
- 지난 Worker 배포와 동일 방법으로 **바뀐 `worker_skeleton/math_diagnosis_worker.js`** 를 올림(대시보드 Edit code → 붙여넣기 → Save and deploy).
- **확인**: `https://<worker-도메인>/health` → `version` = **`2026.08.10-fixA-work-text-preserve`**(axis-store D1 + GET + usage로깅 + review-hardening + **Fix-A 풀이원문 보존** 전부 번들).
- **Fix-A 검증**: 오답 있는 시험지 진단 후 profile.html에서 해당 시험 attempts에 `student_work_text`·`student_answer`·`tag_rationale`가 채워지는지 확인(정답·빈칸 문항은 비어있어야 정상). D1 콘솔 `SELECT attempts FROM axis_records ORDER BY created_at DESC LIMIT 1;`로도 확인 가능.

## 6) 사이트 갱신
- 이번 커밋(store·profile 변경)이 진단 페이지 호스트에 반영되게 사이트 갱신(GitHub Pages ~1~2분).

## 7) profile에서 서버 연결 + 기존 데이터 이관
1. `<base>/profile.html` 열기 → **"서버 저장 (D1) · 동기화"** 카드.
2. **Worker 주소** 입력 + **쓰기 키**에 4번의 `RECORD_WRITE_KEY` **같은 값** 입력 → **서버 설정 저장**.
   - 하단에 "서버 설정됨 · 미동기 0건" 뜨면 연결 OK. (401 뜨면 키 불일치 → 값 확인.)
3. **[기존 로컬 → 서버 이관]** 클릭 → localStorage의 기존 레코드(예 SC-STUDY-007) 서버로 멱등 전송.

## 8) 검증 (이중쓰기 동작)
- 진단 페이지에서 새 진단 1건(학생코드) → profile 열어 그 코드 조회 → 헤더에 **"조회 서버"** 뜨면 서버 저장·조회 정상.
- profile "미동기 N건"이 0이면 이중쓰기 성공. (N>0이면 [지금 동기화] → 사유 확인: 401=키, network=주소/배포.)
- ※ 진단 페이지는 profile에서 저장한 서버 설정을 **같은 브라우저 localStorage로 공유** → 별도 설정 불필요.

## 9) 전환 판단 (수동·가역)
이중쓰기로 병행하며 4기준 **모두** 충족 시 서버 모드로 플립(가역, 플립 후에도 localStorage 백업 유지):
1. 레코드 ≥20건(적으면 전량) 로컬↔서버 일치 · 2. 최근 ≥10회 진단 미동기 0 · 3. profile 서버조회 ≥3명 정상 · 4. **≥14일 그리고 진단 ≥10회(둘 다)**.

## 트러블슈팅 — "Failed to fetch"(서버 통신 실패)
**원인(확정·수정됨)**: Worker CORS `Access-Control-Allow-Headers`에 `X-Write-Key`가 없어 브라우저 preflight(OPTIONS)가 그 헤더를 거부 → 실제 요청 차단. `/health`·`/analyze`는 커스텀 헤더가 없어 됐던 것. **수정: Allow-Headers에 X-Write-Key 추가, VERSION `2026.08.10-axis-store-v2`.**
→ **조치: Worker 재배포**(위 5) 후 `/health` version이 `2026.08.10-axis-store-v2`인지 확인 + **사이트 갱신**(store/profile 수정 반영).

### ★ 주소창으로 즉시 확인 (가장 빠름 · v2 이상)
- `https://<worker>/api/axis-store/health` → **200** `{route:"registered", has_db:true, has_key:true, version:"...v2"}` 이면 **라우트·D1바인딩·키 전부 OK**. `has_db:false`면 바인딩, `has_key:false`면 secret 재확인. **404면 아직 v2 미배포**(재배포 필요).
- `https://<worker>/api/axis-store/profile?student_code=SC-STUDY-007` → **401**(unauthorized)이면 **라우트 정상**(키가 없어 막힌 것 = 당연, 주소창은 헤더 못 실음). **404면 미배포.**
- ※ 이전에 이 주소로 404가 난 건 **경로 불일치가 아니라** /record·/profile이 **POST 전용**이었고 주소창은 GET이라 안 걸린 것. v2에서 /profile GET·/health를 열어 주소창 확인이 되게 함.

### F12로 직접 확인(사용자)
1. profile.html에서 F12 → **Network** 탭 열어둔 채 [기존 로컬→서버 이관] 클릭.
2. `record` 요청 두 줄이 보임:
   - **OPTIONS** `axis-store/record` — 상태 **204**여야 정상(preflight 통과). 여기서 실패(빨강·CORS error)면 Allow-Headers 문제 → Worker 재배포 확인.
   - **POST** `axis-store/record` — **200**이면 저장 성공. **401**=쓰기키 불일치(profile 키 = secret 값 확인). **네트워크 오류**=Worker 주소/배포 확인.
3. 요청 클릭 → **Headers**에서 Request가 `/api/axis-store/record`로 가는지(주소 오타 확인), `X-Write-Key`가 실려 있는지 확인.
4. **Console** 탭에 `CORS`·`blocked` 문구 있으면 Allow-Headers/오리진 문제.

### "미동기 0건" 오표시(수정됨)
- 이전: 서버설정 前 로컬 레코드는 한 번도 POST 안 돼 pending에 없음 → 실패인데 "미동기 0"으로 보였음.
- **수정: 서버 확정(200) id를 따로 추적. 미동기 = 서버 미확정 전부(실패 + 미시도).** 이제 이관 전엔 "미동기 1/1건(미시도 1)"처럼 정직하게 뜸. 사이트 갱신 후 반영.

## 롤백
- 서버 문제 시: profile "서버 저장" 칸 비우고 저장 → 로컬만(A)로 즉시 복귀. Worker는 그대로 둬도 무해(엔드포인트 미사용). D1 데이터도 남겨도 무해.
- 완전 되돌리기: `git revert` 후 사이트 갱신 + 이전 Worker 재배포.
