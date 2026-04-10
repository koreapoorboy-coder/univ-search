[README_major_engine_install.md](https://github.com/user-attachments/files/26628969/README_major_engine_install.md)
# major-engine seed pack v1

이 ZIP은 `학과별 전공탐구 활동` 레이어를 엔진 폴더 구조에 맞춰 넣을 수 있게 정리한 1차 시드 묶음입니다.

## 만들 위치
프로젝트 루트가 `univ-search`라면 아래 위치에 폴더를 만들면 됩니다.

`public/keyword-engine/seed/major-engine/`

이 ZIP을 풀면 바로 그 구조로 들어가게 되어 있습니다.

## 핵심 파일
- `major_catalog_198.json` : 학과 198개 카탈로그
- `major_profiles_master_198.json` : 198개 학과 마스터. 1~4번 학과는 샘플 상세 입력이 반영됨
- `major_alias_map.json` : 학과명 별칭 매핑 스타터
- `major_engine_router.json` : 학과 입력 라우팅 규칙 스타터
- `major_to_book_bridge.json` : 현재 도서 엔진과 연결하는 브리지 스타터

## draft 폴더
`draft/` 안에는 작업용 원본을 따로 넣어 두었습니다.
- csv 카탈로그
- skeleton 원본
- 샘플 1~4 상세본
- starter 원본들

## 주의
- 아직 JS 연결은 하지 않은 상태입니다. 지금은 seed 구조만 맞춘 단계입니다.
- `major_profiles_master_198.json` 기준으로 이후 5~198번 학과를 계속 채워 넣으면 됩니다.
- 이미지형 PDF 기반 1차 정리라 후속 검수가 필요합니다.
