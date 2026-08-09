# B 이관 설계 (D1·이중쓰기) — 착수 3확인 답 + 전환기준 (2026-08-09, 코딩 전 확정)

> 검수 3결정: ①D1 ②observed_axes=JSON컬럼(axis_map_version 별도컬럼·date 인덱스) ③이중쓰기(A 소스오브트루스·Worker revert 롤백). 아래 3확인 + 전환기준 확정 후 코딩.

## D1 스키마 (결정 반영)
```sql
CREATE TABLE axis_records (
  id TEXT PRIMARY KEY,            -- 레코드 uuid (멱등 upsert)
  student_code TEXT NOT NULL,
  date TEXT NOT NULL,            -- ISO
  exam_label TEXT,
  scope_units TEXT,             -- JSON 배열
  observed_axes TEXT,          -- JSON (검수: JSON 컬럼. 축 미고정·재계산 대비)
  attempts TEXT,              -- JSON (원본 태그 = 축 재계산 소스)
  axis_map_version TEXT,     -- ★별도 컬럼(검수 필수: "v1으로 계산된 레코드만" 질의)
  schema_version INTEGER,
  created_at TEXT           -- 서버 수신시각(감사)
);
CREATE INDEX idx_student ON axis_records(student_code);
CREATE INDEX idx_date    ON axis_records(date);            -- ★검수: 학기단위 조회 대비
CREATE INDEX idx_amv     ON axis_records(axis_map_version); -- 버전별 질의
```

## ① /record 인증 (최소·사용자 관리형)
- 위협: 지금 CORS `*` + 인증 없음 → 누구나 POST → 오염.
- **제안(2겹, 소규모 내부도구에 비례)**:
  - **(a) 공유 쓰기키**(주): Worker secret `RECORD_WRITE_KEY`. 페이지가 `/record` POST에 `X-Write-Key` 헤더로 포함. 교사가 페이지에서 1회 입력(Worker URL처럼)→localStorage. Worker가 키 불일치 시 **401 거부**.
  - **(b) CORS 오리진 제한**(보강): `CORS_ALLOWED_ORIGINS`를 진단페이지 오리진으로 → 브라우저 교차오리진 차단(1차 방벽).
- ⚠ **한계 명시**: 페이지는 클라이언트라 키가 소스에 노출될 수 있음(진정한 인증 아님). 캐주얼·사고성 오염은 막으나 결정적 공격자는 못 막음. **소규모 내부도구엔 비례**; 강한 보안은 별도 인증 과제.
- **사용자 관리** = secret 1개 설정(대시보드) + 페이지 키입력 1회. `/profile`(읽기)은 키 불요(공개 조회) 또는 동일 키(택일 — 검수 판단).

## ② 실패 처리 (fire-and-forget 아님 → 재시도 큐, 조용한 유실 없음)
- 순수 fire-and-forget = 실패 시 조용히 유실 → 이중쓰기 검증 무의미(검수 지적 정확).
- **제안**: **localStorage 우선 쓰기(항상 성공)** + `/record` POST. 실패 시 레코드 id를 **pending 큐**(localStorage `scstudy_sync_pending`)에 넣음.
  - **재시도**: 다음 진단·페이지 로드·profile 열 때 pending 재전송(멱등 upsert라 중복 안전).
  - **가시화**: profile.html에 "서버 미동기 N건" + "지금 동기화" 버튼.
  - ⇒ **실패가 기록·재시도**(조용한 유실 0). 이중쓰기 검증 = localStorage 전체 vs 서버, **pending=차이**. 검증 가능.

## ③ 전환 기준 (이중쓰기 → 서버, 구체 수치 — Code탭 제안)
모두 충족 시 수동 플립:
1. **레코드 일치**: 기존 전체 + 신규 **≥20건**(총량 적으면 100%)이 localStorage↔서버 **id+내용 일치**.
2. **서버 쓰기 실패 0**: 최근 **≥10회 연속 진단**에서 pending 큐 0(재시도로도 안 남음).
3. **profile 서버경로 정상**: 서버모드 조회가 **≥3명 학생**에서 localStorage 렌더와 동일.
4. **최소 기간**: 이중쓰기 활성 후 **≥14일 또는 실사용 진단 ≥10회**(먼저 도달).
- **전환 = 수동 플립**(config `AXIS_STORE_MODE:"server"`), **가역**. 자동 아님(검수 판단). 플립 후에도 localStorage 쓰기는 백업으로 유지(완전 신뢰 전까지).

## ④ 사용자 작업 안내 (착수 후, 대시보드 단계별)
- D1 생성 → Worker 바인딩 → 스키마 SQL 1회 → secret `RECORD_WRITE_KEY` → Worker 배포 1회. **사용자 작업 시점에 화면 단계별로 안내**(지금은 스킵).

## 착수 순서 (사이트 갱신+circle 검증 먼저)
0. **★선행: 사용자 사이트 갱신 → overlay_tester로 circle 배포검증**(복구가 배포본서 확인돼야 다음).
1. D1 스키마 확정(위) →
2. Worker `/record`(키검증·upsert by id)·`/profile?student_code=`(records+집계) 추가 →
3. `math_axis_accumulation.js` 이중쓰기 + pending 재시도 큐 →
4. profile.html 서버우선 조회 + 미동기 N건 표시 + "서버로 이관" 버튼 →
5. 사용자: D1·바인딩·SQL·secret·배포 1회(가시화/unbuilt-detect Worker 변경도 이때) →
6. 검증: SC-STUDY-007 이관·2회차 진단·서버조회·pending 동작·롤백 폴백 → 전환기준 관측 시작.

## 판단 요청 (코딩 전)
- 위 스키마·인덱스 OK?
- 인증 = 공유키(+CORS) 최소안 OK? `/profile` 읽기는 키 불요(공개) vs 동일키?
- 실패 처리 = pending 재시도 큐 OK?
- 전환 기준 4수치(≥20건·≥10회 pending0·≥3명·≥14일/10회) OK?
