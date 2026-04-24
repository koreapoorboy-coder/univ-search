# BOOK ENGINE STEP5-8 DRAFT

작성일: 2026-04-24

## 목적
현재 1~4번 선택 결과를 받아서 5번 도서 선택, 6번 보고서 전개 방식, 7번 관점, 8번 라인까지 자연스럽게 이어지게 하는 **도서 재료 카드 구조**를 만드는 초안입니다.

## 이번 결과물
1. `book_report_card_schema_v1.json`
   - 5~8번 공통 사용 스키마
2. `book_report_cards_active_draft_v1.json`
   - 현재 `book-engine.zip` 안 `status=active` 도서만 뽑아 초안 카드로 변환한 파일
   - 총 70권
3. `book_report_cards_active_draft_v1_summary.json`
   - subjects / concepts / modes / lines 분포 요약

## 사용 원칙
- 오픈 1차에서는 `active` 도서만 사용
- 5번은 책 추천이 아니라 **보고서 연결 근거 제공 단계**
- 6/7/8번은 5번 책을 다시 판단하는 단계가 아니라,
  이미 선택된 책의 `report_modes`, `perspectives`, `report_lines`를 기반으로 선택지를 좁히는 단계

## 추천 UI 연결 방식
### 5번
- 직접 일치 도서: `direct_match.subjects`, `direct_match.concepts`, `direct_match.keywords`
- 확장 참고 도서: `expand_reference.followup_axes`, `expand_reference.majors`

### 6번
- `report_modes` 사용
- principle / compare / data / case / major

### 7번
- `perspectives` 사용

### 8번
- `report_lines` 사용

## 주의
이 파일은 **draft_v1** 초안입니다.
즉시 UI 연결은 가능하지만, 아래는 2차에서 보강해야 합니다.
- concept 직접 매핑이 약한 도서 보강
- OCR 흔적이 남은 question_seeds 정제
- followup_axes 수동 보정
- direct_match / expand_reference 경계 미세 조정

## 바로 다음 추천 작업
1. `book_report_cards_active_draft_v1.json` 기준으로
   - 통합과학1
   - 통합과학2
   - 공통수학1
   - 정보
   이 4과목 먼저 샘플 연결 확인
2. 그 다음 direct_match 1권 + expand_reference 1권 규칙으로 5번 UI 연결
3. 2차 업데이트에서 question_seeds / axes / concept 매핑 정교화
