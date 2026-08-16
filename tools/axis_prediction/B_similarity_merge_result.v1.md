# 닮음(M2_SIMPY) 처방 87 — part04 병합·게이트 해제 결과 보고 v1 (2026-08-16)

> 검수 병합 승인분 실행 결과. 커밋 `decd6c7c`(병합) + `d439d90a`(후처리), push 확인.
> 백업 = `tools/axis_prediction/_backup/part04.pre-simpy-append.b83632f3.json` (6,470,163 bytes).

## 0. 먼저 — 보고 수치 정정 1건 (검수 확인 1)
**`concept_map`**: 최종 제출 보고의 "concept_map 87"은 **나열된 유형 수**였습니다. 정정 표기:
> **concept_map 커버 87/87 (개념 52종)** — 중복 배정 0 · concept_map에만 있는 id 0 · 미커버 유형 0 [실측]

`category_ledger`는 **18 카테고리 · 합 87**입니다.

## 1. 병합 실행 내용
- **방식**: 텍스트 서지컬 append. 기존 엔트리는 **재직렬화하지 않음**(§6 "손대지 말 것" 준수 — part04 재편집 없음).
- **part04**: 2023 → **2110** 엔트리 (6,470,163 → 6,807,795 bytes).
- **신설 엔트리 필드 = 23** (M2_GEOM 정본 26필드 − `concept_ids`·`source_orders`·`raw_section_id` 생략, 승인된 규격 §1).
  필드 출처: 카탈로그(id·grade·unit_id·unit_name·type_name) / `index.v1.json`(course=중학수학 2) / overlay(error_tags) / 기본값(default_difficulty=core) / 저작분(8 처방) / null·true·1(matched·score·draft·revision·observed_basis).
- **매니페스트**: `problem_type_count` 12523→**12610** · `instruction_total_count` 12523→**12610** · part04 `instruction_count` 2023→**2110** · `instruction_end_index` 12522→**12609** · `source_problem_type_files`에 `m2_similarity_pythagoras.problem_types.v1.json` 추가(35→36).
- **게이트**: `template_unit_map.v1.json` `no_template_units` **12 → 11단원**(M2_SIMILARITY_PYTHAGORAS 제거).

## 2. 검증 7항목 — 전부 PASS [실측]
| # | 항목 | 수치 | 판정 |
|---|---|---|---|
| 1 | 총수 | part01~03 각 3500 · part04 **2110** · 합 **12610** = 매니페스트 합 = `instruction_total_count` = `problem_type_count` | PASS |
| 2 | M2_GEOM 140 무변경 | pre 140 / post 140 / **엔트리 해시 diff 0** | PASS |
| 3 | 타 단원 1883 무변경 | pre 1883 / post 1883 / **엔트리 해시 diff 0** | PASS |
| 4 | 신설 87 필드 완비 | 필드 누락·초과 0 · cp 필드조합 이탈 0 · error_tags 빈값 0 · draft/revision/observed_basis 위반 0 · matched/score nonnull 0 | PASS |
| 5 | id 중복 | 4파트 전체 12610 = distinct 12610, **중복 0** | PASS |
| 6 | 게이트 | `no_template_units` 11 · M2_SIMPY 잔존 False | PASS |
| 7 | 로드 확인 | 카탈로그 **87/87** 병합맵 존재. 표본 PT104 → `visible_path` = 중학수학 2 > 도형의 닮음과 피타고라스 정리 > 삼각형의 무게중심 기본 성질 > 비례식·정리 적용 · cp 2건 · error_tags 2건 | PASS |

**해시 대조 방식**: 병합 전 백업과 병합 후 파일을 각각 파싱해 **엔트리별 정규 직렬화(SHA-256)** 를 비교. 동일 직렬화기를 양쪽에 적용했으므로 직렬화 특성은 상쇄되고 내용 차이만 검출됩니다.

## 3. ★작업 중 사고 2건 — 발생·수리 (전부 해소)
### ① PS5.1 한글 리터럴 오염 (인계문 §7 기재 함정)
- **원인**: 병합 스크립트에 `course = '중학수학 2'` 를 **직접 리터럴로 기재**. BOM 없는 `.ps1`을 PS5.1이 ANSI로 읽어 문자열이 깨진 채 87 엔트리에 기록됨.
- **범위**: **261건 = 87 × 3** (`course` · `taxonomy_levels.course` · `visible_path[0]`). 다른 한글 필드(unit_name·type_name·처방 8필드)는 **JSON에서 UTF-8로 읽은 값**이라 무사.
- **수리**: 스크립트 리터럴을 쓰지 않고 **같은 파일의 정상 엔트리(M2_GEOM)에서 읽은 문자열로 치환** → 261 → **0**.
- **사후 전수 검사**: 신설 87엔트리 **U+FFFD(대체문자) 0건** · **draft 원문 대조 불일치 0**(problem_nature·student_command·teacher_note·parent_message 전문 일치, required_thinking·error_checkpoints 개수 및 student_fix 전건 일치).
- **재발 방지**: 검증·병합 스크립트는 **ASCII 전용**, 한글은 반드시 데이터 파일에서 읽어 쓸 것(§7 규칙 재확인).

### ② draft `_meta` 문구 수정 중 JSON 파손
- **원인**: 문구에 이스케이프하지 않은 큰따옴표(`" - "`)를 넣어 JSON 문법 깨짐.
- **수리**: 작은따옴표로 교체 → 파싱 복구. 87종 검증 14항목 재통과 확인.

### 부수: 줄바꿈 혼재 정리
신설 87엔트리가 LF, 기존 2023엔트리가 CRLF였음 → **CRLF로 통일**(내용 무변경). 통일 후 검증 7항목 재실행, 해시 diff 0 유지 확인.

## 4. ★판단 1건 — `taxonomy_levels` 분해형 채택 (prep 규격 §6-2 대기 항목)
검수 판정 대기 상태였던 항목입니다. 병합 시점에 값이 확정되어야 해서 **측정 근거로 결정**했습니다.

**측정**: type_name **87/87이 `' - '` 구분자 보유**. 마지막 구분자 기준 분해 시 세부가 **정확히 3종**으로 분류 —
```
비례식·정리 적용 39 · 복합 계산·증명 24 · 개념·조건 판별 24
```
이는 저작에서 골격 변형축으로 쓴 축과 **동일**합니다(`_meta.skeleton_sharing`).

**채택**: M2_GEOM 정본과 같은 분해형.
```
strand = sub_strand = representative_type = (앞부분)
detail_type = (뒷부분)
visible_path = [course, unit_name, representative_type, detail_type]
```
draft `_meta.authoring_rule`의 옛 "단순형" 문구도 근거와 함께 정정했습니다.

**되돌리는 법**(검수가 단순형을 원할 경우): 백업에서 part04 복원 → 병합 스크립트의 분해 로직만 교체해 재실행 → 검증 7항목 재실행. 스크립트 보유 중이라 추가 저작 없이 가능합니다.

## 5. 남은 것
- **실사용 대조 = 보류**(닮음 답안이 생길 때). 백로그 "닮음 해석층 실측 미완"과 함께 관리.
- 이후 트랙 = **M1 기하 재태깅**(사용자 GPT 작업 대기). 명세 `B_m1_geometry_retag_spec.v1.md` r4 + 패킷 5종 완비 상태.
