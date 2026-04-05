[README.md](https://github.com/user-attachments/files/26487529/README.md)
# major keyword v30 restructure

이 패키지는 기존 `major_keyword.json`을 학생 선택형 엔진에 넣기 쉬운 형태로 1차 재구조화한 버전입니다.

## 포함 파일
- `major_keyword_restructured.json`
  - 학과별 키워드를 엔진용 클러스터로 재정리
- `global_keyword_index.json`
  - 키워드가 어떤 학과에 중복 등장하는지 확인
- `career_selector_seed.json`
  - 진로/계열 → 학과 → 추천 키워드 구조
- `noise_keywords_removed.json`
  - 학년/과목명 같은 엔진 노이즈 목록
- `catalog_summary.json`
  - 전체 요약

## 추천 사용 순서
1. 학생이 `진로/계열` 선택
2. 그 안에서 `학과` 선택
3. 그 학과의 `추천 키워드` 5~8개 노출
4. 더 보고 싶으면 `클러스터별 키워드` 확장
5. 학생이 선택한 키워드 2~3개를 조합해 탐구 방향 생성

## 핵심 포인트
- 같은 학과라도 키워드 선택지가 넓어져 결과 겹침을 줄이기 위한 구조
- 완성 보고서 생성보다, 학생이 조합하게 하는 선택형 UI에 적합
- 이번 분류는 1차 자동 재구조화이므로 일부 키워드는 `기타·직접검토`에 남을 수 있음
