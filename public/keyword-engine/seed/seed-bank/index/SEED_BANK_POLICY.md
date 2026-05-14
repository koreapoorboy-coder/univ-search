# SEED_BANK_POLICY

작성일: 2026-05-14
상태: Stage 1 + Stage 2 seed-bank 운영 원칙

## 1. 핵심 원칙

이 seed-bank는 운영 엔진에 즉시 적용하는 파일이 아니다. 보고서 생성 품질 개선을 위해 코치님 보유 보고서의 문장이 아니라 **사고 구조**를 축적하는 공간이다.

## 2. 적용 금지 원칙

- 현재 학생용 운영 엔진에 자동 연결하지 않는다.
- seed 원문을 그대로 복사해 MINI 프롬프트에 넣지 않는다.
- RPT 코드, seedId, 내부 패턴명을 학생 화면에 노출하지 않는다.
- 참고문헌·수치·사례를 지어내지 않는다.
- 학과명 + 교과 개념 + 키워드를 단순 조합한 제목 생성을 피한다.

## 3. 추가 방식

1. 원본 보고서를 `raw-reports/original-xlsx/` 또는 원본 형식 폴더에 보관한다.
2. 보고서를 `report-seeds/stageN/`에 seed JSON/JS/MD로 변환한다.
3. `index/`의 통합 목록과 tag map, coverage map, duplicate check를 업데이트한다.
4. 운영 반영은 seed가 충분히 축적된 뒤 별도 matcher 작업에서 진행한다.

## 4. 현재 상태

- Stage 1: RPT-001~RPT-005 완료
- Stage 2: RPT-006~RPT-010 완료
- 운영 엔진 적용: 미적용
