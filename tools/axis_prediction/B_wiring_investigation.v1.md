# 배선(wiring) 조사 — 관측층을 런타임에 어떻게 꽂나 (2026-08-07)

> 배경: 재태깅 321종 ∩ 런타임 어휘 = 0~1종(완전 분리). 병합해도 꽂을 자리 없음 → 배선 선결. 검수 조사 3건.
> 스크립트 scratchpad `wiring2.ps1`.

## [3] 17축 런타임 부재 — **재확인: 완전 부재**
- `public/math-weakness-engine/assets/*.js`·`*.html`: `observed_axes`·`axes`·`predicted_axes` grep **0건**.
- `data/rules/*`·`data/diagnosis/*`: 17축 코드(C1/D2/E1…) **0건**.
- 런타임 코드 `axis_rules` 참조 **0건**(빌드전용 재확인). ⇒ **17축 체계는 런타임에 존재하지 않음.** 관측층(17축)은 신설 소비처 없이는 못 꽂힘.

## [2] diagnosis_rules 성격·사문화
- **36 파일 · 1031 규칙.** 984 = `trigger.error_tags_any`(태그 트리거), 47 = 기타(비태그 트리거), 0 = wrong_min-only.
- **트리거 태그 1199종 중 97%(1160)가 정적 problem_types error_tags(1492종)에 뒷받침** → 트리거는 유령 아님, 어휘가 정합. 39종만 Worker 자유생성 의존.
- **★내 4단원(GP·PB·QF·TR)은 error_tags 트리거 규칙이 0개.** 이 단원 진단규칙(47건 전부)은 error_tag를 안 씀 = **error-tag 채널 자체가 이 4단원엔 미사용.** ⇒ 이 단원은 관측 오류태그를 꽂아도 규칙이 소비 안 함.
- 나머지 단원(NE·QE·RC·LE 등)은 태그 트리거 규칙 있음(예 QE r=14 전부 태그). 단 어휘 = 거친 단일(patch232 계열, `sqrt_definition_property`).
- **사문화 판정**: "실제 발화율"은 런타임 학생데이터 없어 불가. 확인된 것 = (a)트리거는 정적어휘 뒷받침 97%(구조적 사문화 낮음) (b)단 4단원은 error-tag 채널 미사용 (c)Worker 자유생성이라 실제 산출 태그가 트리거와 맞는지는 런타임 밖.

## [1] 배포 Worker 프롬프트 — 🔴 리포 밖 (사용자 확인 대기)
- 리포엔 참조본 `public/math-weakness-engine/worker_skeleton/math_diagnosis_worker.js`만. 배포본(Cloudflare)은 외부.
- 스켈레톤 기준: observed_error_tags = enum 없는 자유생성(허용목록 없음). problem_type_id·response_status는 enum 통제.
- **미확인**: 배포 Worker 실제 시스템 프롬프트에 허용태그·candidate가 주입됐는지. 사용자 접근 가능 여부 확인 중. 이게 없으면 배선 선택지 (b)스키마 개정 논의 불가.

## [항목3 심화] 4단원 진단 실태 = 규칙 스키마 3변형 (2026-08-07 추가)
GP·PB·QF·TR "error_tag 채널 미사용"의 실체 = **규칙 스키마가 달라 엔진 diagnose()가 안 읽는 정황**:
| 스키마 | 필드 | 단원 | 엔진 소비? |
|---|---|---|---|
| A(정본) | `trigger.error_tags_any`(중첩) | NE·QE·RC·LE·다수 | ✅ diagnose() line 544 소비 |
| B | `trigger_error_tags`(최상위·`_any` 없음)·`diagnosis_message`·`primary_concept_ids` | **QF·TR** | ❓ line 544는 `rule.trigger.error_tags_any` 찾음 → 필드 불일치·**미소비 정황** |
| C | `if_observed_signals`·`then_diagnosis_concept_ids`·`teacher_confirmation_prompt` | **GP·PB** | ❓ 엔진 grep 0 → **미소비 정황** |
- 셋 다 `status:curated_diagnosis_rule`(deprecated 아님). 엔진 line 544는 error_tags_any만, line 298·307은 route용 `trigger_error_tags_any`(remediation) — **QF/TR·GP/PB 진단규칙 스키마와 안 맞음.**
- ⇒ **4단원 진단규칙은 "태그를 안 씀"이 아니라 "스키마가 달라 현 diagnose()가 미소비"일 가능성**(사문화 정황). ⚠엔진 정규화/다른 경로 여부는 엔진 코드 정독(진행중) 확정 대기.
- **함의**: 관측층 배선 시 이 4단원은 규칙 스키마 통일이 선행돼야 할 수도. 관측층 최대 수혜 대상일 수 있음(현재 태그 진단 공백).

## 종합 — 배선 선택지 3안 평가 (★검수 정리: 배타 아님)
- **검수 판정: (a) 배제 후보**(4단원 무소비+정보손실+17축 부재). **(b)+(c) 병행 필요**(Worker가 세분태그 내도 소비처 없으면 무용·소비처 만들어도 Worker가 옛어휘 내면 불일치). 진짜 질문 = "어느 안이냐"가 아니라 **"어디부터 손대느냐"**.
| 안 | 내용 | 평가 |
|---|---|---|
| **(a) 재태깅 321 → 거친태그 매핑** | 세분 태그를 런타임 거친 태그(1199)로 사상해 기존 채널 재사용 | 4단원(GP·PB·QF·TR)은 error-tag 규칙 자체가 없어 매핑해도 무소비. 17축도 여전히 런타임 부재. 부분해 |
| **(b) Worker 스키마/프롬프트 개정** | Worker가 세분 태그·17축을 내도록 | ★배포 프롬프트 접근 필요(item1 미확인). 접근 가능해야 논의 |
| **(c) 17축 별도 소비처 신설** | 엔진에 observed_axes 소비 경로 신설(축 기반 진단·리포트) | 런타임에 17축 아예 없으므로 신설=가장 큰 작업이나 관측층 가치를 온전히 씀. 근본해 |

**Code탭 관찰(판정 아님)**: 관측층(17축·321종)은 런타임 거친 태그 체계와 **설계 층위가 다름**(진단축 vs 오류태그). (a)매핑은 정보 손실+4단원 무소비, (b)는 외부 접근 선결, (c)는 크나 관측층 설계의도(17축 진단)에 맞음. **결정 전 item1(Worker 접근) 확인이 관건.**
