# 문항 관리(등록) 배포·사용 가이드 (user_items · admin_items.html · 2026-08-10)

> 검수 3결정 반영: ①유형 미매칭=pending 보류저장(방치방지·나중 승격) ②등록만(활용 분리) ③별도 페이지 `admin_items.html`. 테이블=`user_items`(schema.v2).
> 저장소=기존 D1(scstudy-axis, 바인딩 AXIS_DB) **재사용** — 새 바인딩·새 DB·새 시크릿 불요. 테이블만 추가.

## 사용자 수동 작업 = 총 2번 (그 후 계속 브라우저만)
| 작업 | 어디서 | 반복? |
|---|---|---|
| ① `user_items` 테이블 생성 | D1 콘솔에서 SQL 1회 실행 | **1회만** |
| ② Worker 재배포 | 대시보드 Edit code → Deploy | **1회만**(코드 바뀔 때만) |
그 뒤 문항 등록은 **전부 브라우저(admin_items.html)** 에서 — D1 테이블 추가나 재배포 **반복 불요**.

## ① D1에 user_items 테이블 생성 (1회)
Cloudflare → D1 → **scstudy-axis** → **Console** → `data/db/user_items.schema.v2.sql` 내용 전부 붙여넣고 **Execute**.
→ `user_items` 테이블 + 인덱스4 생성(axis_records와 같은 DB 공유).

## ② Worker 재배포
`worker_skeleton/math_diagnosis_worker.js` → Edit code 붙여넣고 **Deploy**.
- 확인: `/health` → version = **`2026.08.10-user-items`**.
- 라우트 확인: `/api/user-items/health` → `has_db:true · has_key:true`.

## 쓰기 키 (질문 2)
등록도 **`RECORD_WRITE_KEY`를 그대로 사용**(axis-store와 동일 키). 별도 키 아님 — 둘 다 교사측 쓰기라 하나로 통일. (분리가 필요해지면 나중에 secret 하나 추가하면 됨.)

## 페이지 사용 (URL: 사이트 갱신 후)
```
https://koreapoorboy-coder.github.io/univ-search/public/math-weakness-engine/admin_items.html
```
1. **연결 설정**(1회): Worker 주소·데이터 base(`…/math-weakness-engine`)·쓰기키 → [설정 저장] → [연결 확인].
2. **단원 선택** → PDF **원문 붙여넣기** → **[AI 구조화]** → 본문·정답·해설·난도·유형 자동.
3. **검수·수정** → **[저장]**. 유형 있으면 **승인(approved)**, 없으면 **보류(pending)** 저장.
4. **등록 목록**: 상단에 **승인/보류/보관 건수 상시 표시**(보류>0이면 빨강 강조). 필터 [보류만]으로 pending 모아보기 → 행 **[유형지정]** 클릭 → 폼에 로드 → 유형 선택 후 [저장] = **승인 승격**.

## 검증 방법 (질문 3)
**화면**: 저장 후 하단 목록에 뜨는지 + 상단 건수 증가 확인. 보류는 [보류만] 필터.
**D1 콘솔 SQL**:
```sql
-- 최근 등록 5건
SELECT id, status, unit_id, problem_type_id, substr(question_text,1,40) AS q FROM user_items ORDER BY created_at DESC LIMIT 5;
-- 상태별 건수(보류 방치 점검)
SELECT status, COUNT(*) FROM user_items GROUP BY status;
```

## 설계 메모
- **pending 흐름**: 유형 미매칭 문항이 pending으로 쌓임 → 나중 일괄 유형지정. ★pending이 쌓이면 새 유형/태그 세분화의 근거가 됨(사용자 최종목표와 같은 흐름).
- **등록/활용 분리**: 1단계는 저장까지. 진단 노출(선택형 출제)은 등록 안정 후 3단계에서 붙임.
- 엔드포인트: `/api/user-items/structure·add·list·delete·health`(전부 X-Write-Key). concept_ids는 선택 유형에서 자동 상속.
