# B 이관 사전 assessment (A localStorage → Cloudflare 서버) (2026-08-09, 착수 전 확인)

> 누적 저장소를 A(브라우저 localStorage)에서 서버로 이관. 레코드는 이미 DB행 스키마(id·schema_version·student_code·date·exam_label·scope_units·observed_axes·attempts·axis_map_version). 아래 4확인 후 착수.

## 1) KV vs D1 — **D1 권장**
| | KV | D1 (SQLite) |
|---|---|---|
| 성격 | key-value | 관계형(SQL) |
| 우리 데이터 적합 | 레코드를 student_code키에 배열로 저장 가능하나 **쿼리·집계 불가**(학생목록·축합산 수동) | **레코드=행 그대로**. `WHERE student_code=`·`GROUP BY`로 profile 조회·축합산 SQL 한 방 |
| 조회화면(profile) | key 나열·수동 집계 | SQL로 자연스러움 |
| 무료 한도 | 넉넉 | **5GB·읽기 5M/일·쓰기 10만/일** — 학원 규모(학생 수백×시험 수십×작은레코드)엔 압도적 여유 |
- **결론: D1.** 레코드가 이미 행 형태이고, profile 조회(학생 필터+축 합산)가 본질적으로 관계형이라 SQL이 맞음. KV는 집계가 수동이라 부적합. **비용=무료 한도 안(사실상 0).**

### 스키마(초안)
```sql
CREATE TABLE axis_records (
  id TEXT PRIMARY KEY,            -- 레코드 uuid(멱등 dedup)
  student_code TEXT NOT NULL,
  date TEXT NOT NULL,
  exam_label TEXT,
  scope_units TEXT,              -- JSON
  observed_axes TEXT,           -- JSON (또는 별도 axis_rows 테이블로 정규화 가능)
  attempts TEXT,                -- JSON
  axis_map_version TEXT,
  schema_version INTEGER
);
CREATE INDEX idx_student ON axis_records(student_code);
```
(observed_axes를 별도 테이블로 정규화하면 SQL 축합산이 더 깔끔하나, JSON 컬럼 + Worker 집계로도 충분. 착수 시 결정.)

## 2) 사용자 작업 범위 — 대시보드 위주, Worker 재배포 1회
- (a) **D1 DB 생성**: 대시보드 Workers & Pages → D1 → Create (클릭).
- (b) **바인딩**: 대시보드 Worker Settings → Bindings → D1 추가(클릭) — 또는 `wrangler.toml`에 `[[d1_databases]]` 한 블록.
- (c) **테이블 생성**: 대시보드 D1 콘솔에 위 SQL 붙여넣기 1회.
- (d) **Worker 배포**: 신규 엔드포인트(`/record`·`/profile`) 담은 코드로 **재배포 1회**.
- ⇒ **거의 대시보드 클릭 + 재배포 1회.** wrangler.toml 편집은 선택(대시보드 바인딩으로 대체 가능).

## 3) 기존 A 데이터 이관 — export/import + 멱등 push
- 지금 localStorage(SC-STUDY-007 1건)는 **레코드 id(uuid) 보유** → `/record`가 id로 dedup(멱등).
- 이관 = profile.html에 **"서버로 이관" 버튼**: localStorage 레코드 전부 `/record`에 POST(재실행해도 중복 0). 또는 기존 export JSON을 서버 import로.
- ⇒ **1건도, 나중에 쌓인 것도 안전 이관.**

## 4) 롤백 (B→A) — 비파괴·가역
- **이관 방식 = 이중쓰기/읽기폴백**(전환기): store가 localStorage에 **그대로 쓰고** + `/record`에 fire-and-forget POST. profile은 `/profile`(서버) 우선, 실패 시 localStorage 폴백.
- ⇒ **A(localStorage)를 소스오브트루스로 유지하며 B를 나란히 검증** → 안정되면 B로 전환. B에 문제 나면 Worker 엔드포인트 revert(재배포)만 하면 프론트는 localStorage로 계속 동작. **D1 데이터는 남겨도 무해.** 롤백 clean.

## 착수 계획(확인 후)
1. D1 스키마 확정(JSON컬럼 vs 정규화) →
2. Worker `/record`(upsert by id)·`/profile?student_code=`(records+집계) 추가 →
3. `math_axis_accumulation.js` 이중쓰기·읽기폴백 →
4. profile.html "서버로 이관" 버튼 + 서버 우선 조회 →
5. 사용자: D1 생성·바인딩·스키마·배포 1회(가시화 Worker 변경도 이때 함께 나감) →
6. 검증: SC-STUDY-007 이관·2회차 진단·서버 조회·롤백 시 폴백 확인.

## 판단 요청
- **D1으로 확정?** (KV보다 조회·집계 적합·무료한도 여유)
- observed_axes **JSON 컬럼** vs **정규화 테이블**?
- 이중쓰기 전환 방식 OK? (A 유지하며 B 병행 → 안정 후 전환)
