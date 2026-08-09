# ISSUE (별건) — index가 참조하는 problem_types 파일 부재 (circle_properties · statistics) (2026-08-09)

> 배선 확대 오버레이 생성 중 circle_properties에서 발견 → 전수 스캔으로 statistics도 동일 확인. 4단원 스키마 불일치(`ISSUE_4unit_diagnosis_rule_schema_mismatch`)와 같은 성격 — **프로덕션에 구멍이 있는데 아무도 몰랐던 것**. 배선과 무관·기존 문제. circle 오버레이는 이 파일 복구 전까지 보류.

## 무엇
- `data/index.v1.json`이 아래 두 단원 엔트리에서 **존재하지 않는 problem_types 파일**을 참조:
  - `M3_CIRCLE_PROPERTIES` → `data/problem_types/m3_circle_properties.problem_types.v1.json` **(없음)**
  - `M3_STATISTICS` → `data/problem_types/m3_statistics.problem_types.v1.json` **(없음)**
- 전 index 단원 problem_types 경로 전수 스캔 결과 **이 2건만** 부재(나머지 전부 존재).

## 조사 (검수 4항목)
1. **언제부터 참조?** index에 circle 경로 추가 = 커밋 `2f2d04e4`("ingest M3 circle properties worksheet set 07"). 워크시트 인제스트 때 **index 엔트리는 추가됐으나 PT 파일은 생성 안 됨**.
2. **삭제 vs 애초 부재?** `git log --all -- .../m3_circle_properties.problem_types.v1.json` = **전무** → **삭제 아니라 처음부터 안 만들어짐**(statistics도 동일 추정).
3. **circle 진단 현재 동작?** `fetchUnitProblemTypes`가 그 경로 fetch→404→`pack.problem_types` 없음→`runStagedEngineAdapter`에서 "유형 목록이 비어 있다" throw→**per-unit catch**(line 412)→문항이 `problem_type_id:''`로 반환(line 415). ⇒ **circle/statistics 문항은 단원만 배정되고 유형·개념 진단 없이 조용히 격하**(에러 안 뜸, 사용자 인지 어려움).
4. **다른 단원 동일 갭?** 전수 스캔 = **이 2건뿐**. 나머지 index 단원 PT 파일 전부 존재.

## 영향
- circle_properties·statistics 진단이 **유형레벨 이하로 조용히 격하**(단원 배정만). observed층·예측층 모두 이 두 단원은 PT 부재로 반쪽.
- 배선 관점: **circle 오버레이(생성됨, 47PT) 배선 불가**(PT 파일 없어 fine태그 부착 대상 없음). statistics는 재태깅 없어 오버레이도 없음.

## 처리 (별건 트랙)
- **PT 파일 복구**: circle·statistics의 problem_types.v1.json 생성(raw_taxonomy·item_bank가 있으니 거기서 파생 가능성 — `data/item_bank/m3_circle_properties/`·`data/raw_taxonomy` 존재 확인됨). 별도 작업.
- 복구 후: circle는 오버레이 이미 생성돼 있으니 즉시 배선 가능(index에 fine_error_tags_overlay 추가).
- ⚠ 배선 확대(9단원)와 **분리** — 이 트랙 없이 9단원 진행. **★9단원 배포본 확정 후 착수**(circle 복구가 index를 또 건드려 원인 판별 섞이지 않게).

## 🔴 관문 판정 (착수 조사 결과, 2026-08-09) — mathflat 파생 차단, 링크 재구성만 가능(라벨 없음)
검수 #2(파생 PT id 일치)가 **실패 방향으로 확정** → 진행 보류·보고:
- **circle mathflat에 `M3_CIRC_PT` id = 0개.** mathflat은 별도 택소노미(스크린샷 전사, 자체 토픽코드)라 M3_CIRC_PT### 소스 아님. **mathflat→problem_types 클린 파생 불가.**
- **M3_CIRC_PT### 47개(및 statistics M3_STAT_PT### 23개)는 links가 참조만, 정의는 어디에도 없음.** 정상 단원 PT = **큐레이션 산출**(한글 `type_name`·`description`·`error_tags` 보유, 예 "동위각과 엇각 혼동"). circle/statistics는 그 큐레이션이 **아예 안 됨**(ingest가 links만 생성, PT 정의 미생성).
- **links가 담는 것**: `primary_problem_type_id`·`concept_ids`·`likely_error_tags`(fine). **없는 것**: `type_name`·`description`(한글 라벨).
- statistics: reflection 없음 → fine 오버레이 불가(코어만 대상).

### 복구 경로 3안 (검수 결정 대기)
- **(A) 링크 재구성(스켈레톤)**: distinct PT id → {concept_ids(union), error_tags(likely_error_tags union), type_name=플레이스홀더}. **id 자동 일치**(links서 옴). **코어 진단(유형→개념→취약개념) 동작**, 한글 라벨만 없음(화면 표시 빈약). 저비용. circle은 기존 오버레이 즉시 부착.
- **(B) 정식 큐레이션**: 47+23 PT에 한글 type_name/description/error_tags 작성(검수 비전 or 수작업). 풍부하나 규모 큼(=중등 재태깅류 작업).
- **(C) 보류**: ingest가 왜 links만 만들고 PT 파일 미생성했는지(파이프라인 갭) 상류 규명 후 정식 생성.

⇒ **진행하지 않고 보고**(검수 지시). 링크 재구성(A)이 저비용·id일치·코어정상화라 유력하나 한글 라벨 부재가 트레이드오프 → 검수 판단 요.

## 🔴🔴 (A) 착수 중 확대 발견 (2026-08-09) — stub 단원, "파일 하나 누락" 아님
(A) 재구성 착수 시 concept 층까지 확인한 결과, 갭이 PT 파일보다 훨씬 큼:
- **circle/statistics 개념도 미정의**: `M3_CIRC_C###`=DB에 **0**, `M3_STAT_C###`=**0** (QF는 `M3_FUNC_C` 44개 존재=DB 정상). links는 `M3_CIRC_C001` 등을 참조(300건)하나 그 스킴이 concepts DB에 없음.
- circle **diagnosis_rules도 없음**.
- ⇒ **circle/statistics = links만 자동생성된 stub 단원.** links가 **계획된 택소노미(M3_CIRC_PT###·M3_CIRC_C###)를 참조하나 PT·개념·규칙 전부 미materialize.** ingest가 links만 만들고 canonical 층 전체를 안 만든 것.
- **(A)가 실제 주는 것(수정)**: problem_type_id는 채워짐(유형배정 실패 멈춤) BUT **concept_ids가 미정의 → 취약개념이 bare id**(conceptById fallback, 이름·remediation·prereq edges 없음). ②의 concept-derived type_name도 **bare id**가 됨(개념명 자체가 없어서). ⇒ **(A) 효과 = "조용한 실패"를 "껍데기 진단"으로 바꿈**(유형은 뜨나 개념 진단 공허).
- **재분류**: 이건 "깨진 파일 고치기(저비용)"가 아니라 **미구축 단원의 canonical 층 생성(PT+개념+규칙)** = (B) 큐레이션/고등 재태깅과 같은 **빌드 작업 버킷**. 저비용 전제가 무너짐 → 우선순위 재판단 필요.

### 수정 옵션 (검수 재결정)
- **(A-thin) 그대로 진행**: PT id만 채움(유형배정 실패 멈춤), 개념은 bare id. 저비용이나 가치 얕음(개념 진단 공허).
- **(가시화만)**: 미구축을 **조용한 격하 → 명시적 통지**로만 전환(예 진단 화면에 "이 단원 미구축" 표시). 초저비용, 정직성 확보, 빌드는 별도.
- **(정식 빌드)**: circle/statistics 개념+PT+규칙 생성 = (B) 버킷·재태깅류 규모 → 뒤로.
⇒ 권고: **저비용 전제 무너졌으므로 circle/statistics를 "1순위 저비용 수정"에서 빼고**, (가시화만) 초저비용 정직성 처리 후 정식 빌드는 (B)/고등과 함께. **다음 실작업 = B 이관으로 이동** 제안.

## 복구 사전조사 (검수 4질문 답, 착수 전 확정 필요표시)
1. **PT 파생 레시피 = 다른 단원과 동일?** 소스 = `data/raw_taxonomy/m3_circle_properties.mathflat.v1.json`(schema `mathflat_problem_type.v1`, 유형묶음→topic_types). `_note`에 **"데이터 저장만·진단 로직 미연결"** 명시 → 다른 단원은 mathflat + runtime problem_types **둘 다 보유**(변환 선례 존재). ⚠**확정 필요**: mathflat→runtime problem_types 변환 레시피가 문서/스크립트로 있는지, 다른 단원 mathflat↔problem_types 대조로 역추적. (recovery 착수 시 첫 단계.)
2. **★핵심 리스크 — 파생 PT id가 links 참조와 일치?** links는 **`M3_CIRC_PT###` 47개** 기대(index가 이미 이 경로 참조). 파생 problem_types가 **정확히 이 id들**을 써야 붙음. mathflat에 M3_CIRC_PT id가 있는지, 없으면 부여 규칙(다른 단원 선례)을 확인해 **id 스킴 일치를 recovery 수용 기준**으로. 어긋나면 복구해도 여전히 안 붙음.
3. **statistics(재태깅 無)는 PT 복구만으로 정상화?** PT 복구 = problem_types 로드 → **유형→개념→취약개념 코어 진단 정상화**(PT 파일만으로 동작). observed_error_tags 기반 diagnosis_rules는 error_tags(거친)가 있어야 발화하나 **코어 진단은 무관**. **⇒ statistics는 PT 복구만으로 코어 정상화**(fine/observed축은 재태깅 필요=별개·미래). circle은 오버레이까지 있어 복구 후 fine층도 즉시.
4. **복구 검증(성공도 조용할 것)**: (a) 브라우저 `<base>/data/problem_types/m3_circle_properties.problem_types.v1.json` = **200**. (b) overlay_tester/debug로 circle·statistics 시험지 → 반환 attempts의 **`problem_type_id`가 채워지는지**(현재 `''`=실패 → 채워짐=PT 로드 성공). (c) circle은 fine태그도. **성공 신호 = problem_type_id 빈값→채워짐.**
