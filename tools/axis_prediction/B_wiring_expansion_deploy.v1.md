# 배선 확대 배포 안내 (9단원 → index 구동, 배포 1회) (2026-08-09)

> 확대 = 오버레이 9개 + index 10엔트리 등록 + Worker index-구동화. **이번 1회 배포 후로는 단원 추가가 데이터만(오버레이 파일 + index 엔트리)이라 Worker 재배포 영영 불요.**

## 사용자 작업 (2가지: Worker 1회 + 사이트 갱신 1회)

### 1) Worker 재배포 (Cloudflare) — 1회
`public/math-weakness-engine/worker_skeleton/` 에서:
```
wrangler deploy
```
확인:
```
curl https://<worker-도메인>/health
```
- ✅ `version` 이 **`2026.08.09-fine-overlay-index-driven`** 이면 새 코드 라이브.
- 변경 내용: 하드코딩 맵 제거 → `index.v1.json`의 단원 엔트리 `fine_error_tags_overlay`에서 오버레이 경로를 읽음. (QF도 이 경로로 전환 — 기존과 동일 동작.)

### 2) 사이트(데이터) 갱신 — 1회
- 이번 커밋들이 **진단 페이지 호스트(데이터 base)** 에 반영돼야 함(오버레이 9개 + 갱신된 `index.v1.json` + 새 테스터). GitHub Pages면 push 후 Actions 초록불(~1~2분).
- ✅ 확인: 아래 URL이 200 (예 similarity 오버레이)
  `<데이터 base>/data/axis_map/m2_similarity_pythagoras.pt_fine_error_tags.v1.json`
  그리고 `index.v1.json`에 `fine_error_tags_overlay`가 보이는지.

## 배포 후 검증 (테스터, 양극단 단원)
`<데이터 base>/overlay_tester.html` 를 연다(데이터와 같은 곳에 배포되므로 index·오버레이를 자동 로드).
1. **Worker 주소** 입력.
2. **단원 드롭다운**에서 선택 → 그 단원 fine 태그셋이 자동 로드(하단 메타에 종수·커버리지 표시).
3. **프리셋 버튼**으로 시험지 채움 → [진단 실행].

검수 지정 양극단 2개:
- **similarity (100% 커버리지)**: 단원=`M2_SIMILARITY_PYTHAGORAS`, 프리셋=[닮음 예시]. ✅ 성공=fine태그(예 `centroid_two_to_one_ratio_confusion`·`area_ratio_to_side_ratio_conversion_failure`) 검출.
- **geometry (19% 커버리지)**: 단원=`M2_GEOMETRY_PROPERTIES`, 프리셋=[도형의성질 예시]. ✅ 성공=fine태그(예 `circumcenter_equidistance_relation_failure`·`central_inscribed_angle_factor_confusion`) 검출. ⚠ **저커버리지라 문항이 미커버 PT에 배정되면 fine 0일 수 있음(정상)** — 여러 번/다른 문항으로 시도. 하나라도 fine 나오면 배선 성립.

- ✅ **판정**: 양극단 둘 다에서 fine태그 나오면 9단원 배선 확정. (테스터가 초록 배지로 표시.)
- ❌ fine 0(양쪽 다): 사이트 갱신 미반영(오버레이 404) 또는 Worker VERSION 옛것 → 위 1·2 재확인.

## 롤백
- Worker: 이전 버전 코드로 `wrangler deploy`(또는 대시보드 Deployments rollback). VERSION으로 확인.
- 데이터: `git revert` 로 index 엔트리·오버레이 제거 후 사이트 갱신. (오버레이는 데이터라 남겨둬도 무해 — index에서 참조 안 하면 no-op.)

## 보류/별건
- **circle_properties**: PT 파일 부재(별건 `ISSUE_missing_problem_types_files`) → 확대에서 제외. 복구 후 index 엔트리 1줄로 편입(배포 불요).
- **고등·기타 중등**: 재태깅 선행 필요(fine층 상한=중등 11단원).
