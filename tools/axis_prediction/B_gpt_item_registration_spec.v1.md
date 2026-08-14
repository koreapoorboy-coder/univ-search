# GPT 문항등록 명세 v1 (2026-08-14) — PDF → 대량투입 JSON

> 역할: GPT가 시험지/학습지 PDF를 읽어 **[[B_bulk_injection_json_spec.v2.md]] §2 형식의 JSON**을 생성한다. 이 JSON을 검수가 dry-run→투입한다.
> ★이 명세는 GPT에게 그대로 주는 지침. 산출 JSON은 스펙 v2를 100% 따라야 함(구현이 헛돌지 않게).
> ★투입 후 소급 불가(비소급 필드·해시). 정확도가 최우선 — 못 하면 비우고 표기하되, **틀리게 채우지 말 것.**

## 0. 대원칙 3
1. **원문 그대로.** 요약·어휘변경·재작성 금지(§4).
2. **모르면 비우고 표기.** 유형 없으면 pending, 그림정보 없으면 명시(§3·§5). 조용한 누락·창작 금지.
3. **스펙 준수.** 넣지 말라는 필드(concept_ids·id·해시) 넣지 말 것(§6).

## 1. 산출 형식
[[B_bulk_injection_json_spec.v2.md]] §2 그대로. 한 배치 = 한 단원(unit_id) 기준. batch.provenance.extraction에 `gpt-<model>-pdf-<yyyymm>` 각인. 예:
```json
{ "batch": { "unit_id":"M2_SIMILARITY", "org_id":"SCSTUDY", "bulk_batch_id":"SCSTUDY-2026-08-14-sim-01",
    "engine_data_base":"https://.../math-weakness-engine",
    "provenance": { "ingest":"bulk", "extraction":"gpt-<model>-pdf-202608", "source":"<학습지명>", "at":"<ISO>" } },
  "items": [ { "question_no":"1", "unit_id":"M2_SIMILARITY", "problem_type_id":"M2_SIM_PT012",
    "question_text":"<원문 그대로>", "answer":"", "explanation":"", "difficulty":"core" } ] }
```

## 2. 유형 카탈로그 사용 (problem_type_id)
- ★**카탈로그 = 워커가 검증에 쓰는 그 파일**을 첨부받아 쓴다: `data/index.v1.json` → 해당 unit의 `problem_types` 경로 → `data/problem_types/<unit>.problem_types.v1.json`의 `problem_types[]`(필드 `problem_type_id`·`type_name`·`domain`·`subdomain`). **GPT는 이 목록의 `problem_type_id`만 쓴다.**
- ★**목록에 없으면 만들지 마라.** 맞는 유형이 없으면 `problem_type_id`를 **비우고**(→ 서버가 pending 저장) `source_note`에 `유형후보: <추정 설명>` 사유를 남긴다. **유형 창작은 pending 폭증보다 나쁘다**(잘못된 매칭 유발).
- ★**대형 단원 범주분할 제시**(레버 A 재사용): 유형이 많은 단원(예 M2_GEOM 140종)은 목록을 통째 훑으면 배정 정확도가 떨어진다(8/14 실측: 140종 단일 제시 시 AI 배정 90%). → 카탈로그를 `domain`/`subdomain`으로 **범주별로 좁혀** 후보를 고른다: ① 문항의 domain/subdomain 판단 → ② 그 범주의 유형만 대조 → ③ 없으면 비움. 전체 목록에서 즉답하지 말 것.

## 3. 그림 의존 문항 (★매칭 정확도 직결)
- 도형·그래프 문항은 **그림에만 있는 기호·수치가 본문에 안 들어오면 매칭 불가**(본문이 불완전).
- ★**그림에만 있는 정보를 question_text에 포함시켜라**: 점·선분·각의 이름, 그림 안 수치(변 길이·각도·좌표), "다음 그림에서"가 가리키는 대상.
  - 예: "△BFH에서…"인데 점 F·H가 본문에 없으면 → 그림에서 읽어 `점 F는 …, 점 H는 …` 형태로 본문에 보완.
- ★**보완 불가능하면**(원본 PDF 자체가 그림에만 표기·본문 정의 없음, 실제 사례 19번 △BFH 점H) → 지어내지 말고 `source_note`에 `그림의존: <무엇이 본문에 없는지>` 명시. 조용히 두지 말 것.
- 그림 자체(이미지)는 이번 체제에서 저장 안 함 → **텍스트로 옮길 수 있는 정보는 최대한 본문에**.

## 4. 전사 정확도 (원문 그대로 · 어휘변경 금지)
- **question_text·answer·explanation은 원문을 글자 그대로.** 요약·바꿔쓰기·정규화 금지(no-lexchange 취지). 매칭이 정규화 유사도 0.99로 도는데, 어휘가 바뀌면 같은 문항이 안 붙는다.
- ★**실제 오독 사례(ISSUE_ai_ocr_misread) — 이런 걸 내지 마라**:
  - 부호 오독: `-(a + b)`를 `-(a - b)`로 (문항4, 0.9873). **부호 하나가 다른 문항이 됨.**
  - 글자 전치: `제1,2,3사분면`을 `사면분`으로 (문항15). **글자 순서를 지켜라.**
- 수식은 **평문 표기**(LaTeX·백슬래시 금지): `1/3`, `루트2`, `x^2`, `<=`, `(123-1)/99`. (참고: 정규화가 `x^2`↔`x²`, 공백·문장부호를 흡수하므로 표기 세부보다 **글자·숫자·부호의 정확성**이 중요.)
- 원문에 없는 정답·해설은 만들지 말 것 → `answer`/`explanation` 빈 문자열.

## 5. 필드별 작성 규칙 (스펙 v2 §3 요약)
| 필드 | 규칙 |
|---|---|
| `question_no` | ✅ 필수. PDF의 문항 번호 그대로(매칭키는 아니나 추적·pending 후처리용). |
| `unit_id` | ✅ 배치 단원. 한 배치에 섞이면 항목별 override. |
| `question_text` | ✅ 원문 그대로·평문수식. 그림정보 보완(§3). qnorm→빈값 되면 안 됨(내용 있어야). |
| `problem_type_id` | 카탈로그 목록값만(§2). 없으면 비움(→pending)+사유. **창작 금지.** |
| `difficulty` | `basic`\|`core`\|`advanced`\|`high` 중 하나(기본 `core`). ★이 4값만. 다른 난도 체계 쓰지 말 것. |
| `source_text` | 있으면(구조화 이전 원문) 넣고, 없으면 **넣지 마라**(서버가 복사 안 함). question_text로 대신 채우지 말 것. |
| `answer`·`explanation` | 원문에 있으면 그대로, 없으면 `""`. |
| `source_note` | 유형 미배정 사유·그림의존 표기 등 메모(선택). |

## 6. 넣지 말 것 (서버가 처리/거부)
- `concept_ids` — 넣지 마라(런타임 조인, 서버 무시).
- `id`·`content_hash`·`dedup_key`·`dedup_key_norm_version`·`org_id`·`bulk_batch_id`(항목레벨)·`provenance`(항목레벨) — 서버가 생성/각인. 항목에 넣지 말 것.
- LaTeX·마크다운·HTML 태그 — 평문만.
- 유형 창작·정답 창작·그림정보 창작.

## 7. ★ 자가검산 체크리스트 (출력 전 GPT가 스스로 확인 — 하나라도 아니오면 고쳐서 출력)
1. [ ] 모든 항목에 `question_no`·`unit_id`·`question_text` 있는가.
2. [ ] `problem_type_id`는 **첨부 카탈로그의 목록값**인가(창작 0). 없으면 비웠고 `source_note`에 사유 있는가.
3. [ ] `question_text`가 **원문 그대로**인가(요약·어휘변경 0). 부호·글자순서 재확인했는가(§4 오독사례).
4. [ ] 그림의존 문항은 그림 정보를 본문에 넣었거나, 불가 시 `source_note`에 `그림의존:` 표기했는가.
5. [ ] `difficulty`가 4값(`basic/core/advanced/high`) 중 하나인가.
6. [ ] `source_text`를 question_text로 복사하지 않았는가(없으면 생략).
7. [ ] 금지 필드(`concept_ids`·`id`·해시류·항목레벨 provenance/org_id)를 넣지 않았는가.
8. [ ] 수식이 평문(LaTeX·백슬래시 0)인가.
9. [ ] JSON이 유효한가(스펙 v2 §2 구조·batch+items).
10. [ ] 한 배치 = 한 단원 원칙을 지켰는가(섞였으면 항목 unit_id override).

## 8. 산출 후 흐름 (참고)
GPT 산출 JSON → 검수 **dry-run**(would_pending·중복·근접중복 미리보기) → 사용자 투입 → **pending 후처리**(§6 spec v2: 일괄 유형지정). 즉 유형을 못 정해 pending이 되어도 **나중에 일괄 지정**하므로, **정확성 > 완결성** — 애매하면 비우고 표기하는 편이 안전하다.
