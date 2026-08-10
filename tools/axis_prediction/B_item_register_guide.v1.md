# 문항 등록 통로 배포 가이드 (item_bank · 2026-08-10)

> 코드는 커밋됨. 아래 **사용자 작업 2개**(D1 테이블 1회 + Worker 재배포 1회) 후 등록 페이지 사용 가능.
> 저장소=기존 D1(scstudy-axis, 바인딩 AXIS_DB) **재사용** — 새 바인딩·새 DB 불요. 테이블만 추가.

## 1) D1에 item_bank 테이블 생성 (1회)
1. Cloudflare 대시보드 → D1 → **scstudy-axis** 클릭 → **Console** 탭.
2. 리포 파일 `public/math-weakness-engine/data/db/item_bank.schema.v1.sql` 내용 전부 복사 → 붙여넣기 → **Execute**.
3. `item_bank` 테이블 + 인덱스 4개 생성됨(Tables 탭 확인). axis_records와 같은 DB 공유.

## 2) Worker 재배포 (새 코드)
- `worker_skeleton/math_diagnosis_worker.js`를 대시보드 Edit code에 붙여넣고 **Deploy**.
- **확인**: `https://<worker>/health` → `version` = **`2026.08.10-itembank-register`**.
- **item-bank 라우트 확인**: `https://<worker>/api/item-bank/health` → `has_db:true · has_key:true`.
  (has_db=false면 AXIS_DB 바인딩 확인, has_key=false면 RECORD_WRITE_KEY secret 확인 — axis-store와 동일 바인딩/시크릿 재사용.)

## 3) 등록 페이지 사용
URL(사이트 갱신 후):
```
https://koreapoorboy-coder.github.io/univ-search/public/math-weakness-engine/item_register.html
```
1. **연결 설정**(처음 1회): Worker 주소 · 데이터 base(`.../math-weakness-engine`) · 쓰기키 입력 → [설정 저장]. [연결 확인]으로 health 점검.
2. **단원 선택** → **원문 붙여넣기**(PDF 복사, 본문+정답+해설 함께 가능) → **[AI 구조화]** → 본문·정답·해설·난도·유형이 채워짐.
3. **검수·수정**: 유형은 AI 제안이 드롭다운에 선택돼 있음(직접 변경 가능). 개념(concept_ids)은 유형에서 자동. [미리보기]로 확인.
4. **[저장]** → D1 즉시 반영. 폼 비워지고 다음 문항 입력 가능.
5. **등록 목록**: 하단 [목록 새로고침]으로 확인·삭제(보관 처리=soft delete).

## 설계 메모
- **저장=D1**(git 불요, 매일 30문항·즉시반영). 정적 item_bank(3,364건)과 분리된 신규 레이어.
- **유형=AI 제안 후 사람 확정**(진단의 staged와 동일: 단원 유형 목록 enum). concept_ids 자동 상속.
- **1단계=등록/저장까지.** 진단 소비(선택형 출제)는 3단계에서 이 D1을 단원·유형으로 조회해 학생별 중복 회피 출제.
- 엔드포인트: `POST /api/item-bank/structure`(AI초안)·`/add`·`/list`·`/delete`, `GET /api/item-bank/health`. 전부 X-Write-Key.
