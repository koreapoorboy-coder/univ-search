# ISSUE (별건) — index가 참조하는 problem_types 파일 부재 (circle_properties · statistics) (2026-08-09)

> 🔴 **2026-08-20: 이 ISSUE는 3단원 사안으로 확대됐다. 닮음(M2_SIMILARITY_PYTHAGORAS)이 같은 계열로 등재됐다 → 문서 맨 끝 「확대 등재」 절을 먼저 읽을 것.** 아래 본문의 "전수 확인 = circle·statistics 딱 2개"는 검사 축이 *파일 유무*였기 때문이며, 닮음은 파일이 있어 걸리지 않았다.

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

## ✅✅ 정정 (2026-08-09, 검수가 type_name 실재 지적) — "stub" 규정 철회
위 "stub·bare id" 판정은 **틀렸다.** `type_variant_bank`를 안 보고 내린 성급한 결론:
- **circle `type_variant_bank`에 M3_CIRC_PT### 63개 + 실제 한글 topic type_name** 완비(예 `M3_CIRC_PT003` → "원의 중심과 현의 수직이등분선(1) - 종합 활용"). **links 참조 id와 일치.** statistics도 동일(M3_STAT_PT### 23 + type_name "평균의 뜻과 성질(1)…").
- ⇒ **circle/statistics는 stub 아님. problem_types.json이 type_variant_bank에서 조립만 안 된 것.** ingest가 type_variant_bank·links·item_bank는 만들고 **problem_types 조립 + concept 정의만 빠뜨림.**
- **여전히 없는 것**: (1) 조립된 problem_types.json, (2) **concept 정의**(M3_CIRC_C###/M3_STAT_C### DB에 0; 정상단원 M2_GEOM_C001은 있음). type_variant_bank에도 concept_ids 없음.
- ★**problem_types의 type_name은 큐레이션 진단명**("a≠0 조건 확인 누락")이고 type_variant_bank는 **주제명**("이차함수의 뜻과 표준형")이라 의미가 다름 — 하지만 주제명이라도 bare id보다 훨씬 나음.

### 정정된 복구안 — type_variant_bank 조립(저비용·실 type_name)
- **circle/statistics problem_types 생성** = type_variant_bank의 {problem_type_id, type_name, difficulty, item 매핑} + unit_id/unit_name(index). **id 자동일치(변환뱅크서 옴)·실 한글 type_name.**
- **concept_ids**: type_variant_bank엔 없음. links의 M3_CIRC_C###는 정의 부재 → **비워두거나(권장, 개념 스코어링만 빠짐)** 별도 개념정의 트랙.
- **결과**: 유형배정 + 실 type_name + **observed_axes(circle 오버레이 이미 있음→fine축 즉시)**. 빠지는 것 = 취약**개념** 스코어링·instruction·rules(별개 층). ⇒ "조용한 실패"→**부분이지만 실질 진단**(축·유형), bare id 껍데기 아님.
- ⇒ **저비용에 실가치**. 내가 (가시화만으로 충분)이라 한 근거(복구=껍데기)가 무너짐 → 검수 재판단 요.

## ✅✅✅ 복구 완료 (2026-08-09, type_variant_bank 조립) — 검수 4확인 답
- **조립**: circle 47 + statistics 23 PT를 `type_variant_bank`서 생성(`B_wiring_assemble_pt.ps1`). 실 한글 type_name·id=links **완전일치**(comm 0).
- **로드 정상화**: 원인이던 edges/rules/remediation 부재도 최소 빈파일 6개로 해결(엔진 `_loadUnits`가 problem_types+edges+rules+remediation 4개 요구, 하나라도 404면 단원 skip이었음). circle 오버레이 재생성(9단원 커밋 때 삭제됐던것).
- **엔진 실측**: 로드 OK·skip 0·`missing_type_count=0`·circle type_name "원의 중심과 현의 수직이등분선(1)…"·**circle fine태그→observed_axes B1**·statistics 로드 정상(fine 없음). **조용한 실패 종료.**
- **index**: circle에 fine_error_tags_overlay 추가 + **build_status 제거(둘 다)** → 가시화 경고 사라짐(복구됨).

### 검수 4확인 답
1. **레시피 vs 정상단원(type_name_source)**: bank는 **주제명**("원의 중심과 현의 수직이등분선"), 정상단원 problem_types는 **큐레이션 진단명**("a≠0 조건 확인 누락"). 성격 다름은 맞으나 **주제명도 표시용으론 유효**(무엇에 관한 문제인지 전달, bare id보다 월등). ⇒ **무방**, `type_name_source:"variant_bank"`로 표시(큐레이션분과 구분·B트랙서 교체). 
2. **63 vs 47**: 내 "63"은 grep 아티팩트(broad M3_CIRC_PT 매칭이 비-PT필드 포함). **정확 = 47(bank)=47(links)=완전일치.** 불일치 없음.
3. **statistics 함께 복구**: 완료(23 PT). 재태깅 없어 fine 없음(정상)·유형배정 정상화.
4. **검증**: PT파일 유효·엔진 missing_type_count=0·problem_type_id 채워짐·circle fine→축·statistics fine없음(정상). (배포본 검증=사이트 갱신 후 overlay_tester circle.)

### 전수 확인(검수 요청): type_variant_bank 있는데 problem_types 없는 단원 = **circle·statistics 딱 2개**(다른 단원 없음).

### 남는 것(별도 트랙, 이번 조립과 분리)
- **concept 정의**(M3_CIRC_C###/M3_STAT_C### 미정의) → 취약**개념** 스코어링만 빠짐(유형·축은 됨). links가 concept_ids 참조하나 정의는 없음.
- **큐레이션 진단 type_name·error_tags·rules·edges·remediation·concepts** = 정식 빌드(B/재태깅 버킷). circle은 이미 fine층까지 돌므로 급하지 않음.

---
(이하 아래는 착수 전 조사 이력·정정 과정 기록. 위 "복구 완료"가 최종.)

## 복구 사전조사 (검수 4질문 답, 착수 전 확정 필요표시)
1. **PT 파생 레시피 = 다른 단원과 동일?** 소스 = `data/raw_taxonomy/m3_circle_properties.mathflat.v1.json`(schema `mathflat_problem_type.v1`, 유형묶음→topic_types). `_note`에 **"데이터 저장만·진단 로직 미연결"** 명시 → 다른 단원은 mathflat + runtime problem_types **둘 다 보유**(변환 선례 존재). ⚠**확정 필요**: mathflat→runtime problem_types 변환 레시피가 문서/스크립트로 있는지, 다른 단원 mathflat↔problem_types 대조로 역추적. (recovery 착수 시 첫 단계.)
2. **★핵심 리스크 — 파생 PT id가 links 참조와 일치?** links는 **`M3_CIRC_PT###` 47개** 기대(index가 이미 이 경로 참조). 파생 problem_types가 **정확히 이 id들**을 써야 붙음. mathflat에 M3_CIRC_PT id가 있는지, 없으면 부여 규칙(다른 단원 선례)을 확인해 **id 스킴 일치를 recovery 수용 기준**으로. 어긋나면 복구해도 여전히 안 붙음.
3. **statistics(재태깅 無)는 PT 복구만으로 정상화?** PT 복구 = problem_types 로드 → **유형→개념→취약개념 코어 진단 정상화**(PT 파일만으로 동작). observed_error_tags 기반 diagnosis_rules는 error_tags(거친)가 있어야 발화하나 **코어 진단은 무관**. **⇒ statistics는 PT 복구만으로 코어 정상화**(fine/observed축은 재태깅 필요=별개·미래). circle은 오버레이까지 있어 복구 후 fine층도 즉시.
4. **복구 검증(성공도 조용할 것)**: (a) 브라우저 `<base>/data/problem_types/m3_circle_properties.problem_types.v1.json` = **200**. (b) overlay_tester/debug로 circle·statistics 시험지 → 반환 attempts의 **`problem_type_id`가 채워지는지**(현재 `''`=실패 → 채워짐=PT 로드 성공). (c) circle은 fine태그도. **성공 신호 = problem_type_id 빈값→채워짐.**

---

## 🔴🔴🔴 확대 등재 (2026-08-20) — 닮음(M2_SIMILARITY_PYTHAGORAS)도 같은 계열이다

> 검수 판정 10차 §7-② 지시. **이 ISSUE는 "circle·statistics 2단원 사안"이 아니라 "조립본 3단원 사안"이다.**

### 무엇이 같은가
`ingest`가 `links`·`type_variant_bank`·`item_bank`는 만들고 **problem_types 조립 + concept 정의를 빠뜨린** 바로 그 갭이 닮음에도 적용된다. 닮음 카탈로그도 `type_variant_bank` 조립본이다(`1cda218e` "type_variant_bank가 정의", 커밋 `508f0d89` 계열).

| 단원 | 카탈로그 엔트리 | 정식(선언) | 결손 | 조립본 표식 |
|---|---|---|---|---|
| M2_SIMILARITY_PYTHAGORAS | 87 | 177 (59 base × 3) | 90 | ✅ 2026-08-20 추가(87/87) — **그전까지 없었음** |
| M3_CIRCLE_PROPERTIES | 47 | 126 (42 base × 3) | 79 | 처음부터 있었음(47/47) |
| M3_STATISTICS | 23 | 108 (36 base × 3) · 최대 ID 74 | 85 | 처음부터 있었음(23/23) |
| M2_GEOMETRY_PROPERTIES | 140 | 140 | 0 | 해당 없음(정식 큐레이션분) |

### 무엇이 달랐는가 — ★표식 부재가 실제 피해를 냈다
```
원의 성질·통계   이 ISSUE 문서에 "부분 복구"로 기록됨  → 완성으로 오해되지 않음
닮음             표식도 기록도 없이 "실 canonical"로 등재 → 처방 87종 완결 ·
                 커버리지 100% · M1 재태깅 비교표 끝점이 그 위에 세워짐
```
★ 같은 상태인데 하나만 완성본처럼 취급된 것이 이 사안의 핵심이다. 절단(결손 90)보다 **표식 부재**가 먼저 고칠 문제였다.

### 실측된 파급 (검수 9차 판정, 2026-08-20)
```
D1 1,200문항 중 405문항(34%)이 쪼개진 유형에 속함
가장 최근 배치(simpy-08)가 55%로 최악
PT131 = 문항 5번과 92번이 같은 유형으로 묶임
원의 성질도 같은 이유로 45문항이 유형 지정 불가 상태
```
⇒ **87종으로는 문항을 담을 수 없다는 것이 실측됐다.** "87종을 정식으로 확정"(C안)은 **405문항을 영구 유실**시키므로 기각됐다.

### 이 문서의 기존 서술 중 유효한 것 / 무효한 것
- **유효**: "problem_types 조립 + concept 정의만 빠뜨림"이라는 원인 규정. 닮음도 동일.
- **유효**: `type_name_source:"variant_bank"`로 큐레이션분과 구분한다는 표기 규약(2026-08-09 검수 4확인 답 §1). **닮음에 이 규약이 적용되지 않은 것이 누락**이었다.
- **부족했던 것**: "전수 확인 = circle·statistics 딱 2개"(같은 절 말미). 이 전수 확인은 **type_variant_bank는 있는데 problem_types 파일이 없는 단원**을 세었다. 닮음은 파일이 **있었으므로** 걸리지 않았다. ⇒ 검사 축이 "파일 유무"였고, "엔트리가 정식 종수를 채웠는가"는 재지 않았다. 후자는 `check_catalog_integrity.ps1` CHECK 5(절단)가 2026-08-20에 처음 측정했다.

### 복원 방침 = D안(문항 주도 복원) — 검수 판정 10차 §3
```
90종을 미리 만들지 않는다. 문항이 요구할 때 그 자리 하나만 만든다.
1  1,200문항(우선 405 의심분)을 base 단위로 재판정 (base 53종 + 추론 4종)
2  base 확정 후 그 문항의 접미사를 판정
3  필요한 칸이 비어 있으면 그때 엔트리 1개 생성 (이름은 base + 접미사로 기계 도출)
4  아무 문항도 요구하지 않은 칸은 만들지 않는다
```
원의 성질 편입도 **닮음에서 D안이 성립하면** 같은 방법을 적용한다(그전까지 보류 유지).

### 진입점
`tools/axis_prediction/HANDOFF_B_CATALOG_TRUNCATION.v1.md` (조사 경과 · 판정 · 다음 순서)

---

## 📒 별건 등재 (2026-08-21, 검수 판정 11차 §6) — `manifest.json` `problem_type_count` 드리프트

**판정: 고치지 마십시오.** 이 수치는 이제 증거물입니다.

```
public/math-weakness-engine/manifest.json  "problem_type_count": 13192
```

| 시점 | 값 | 그 시점 실집계 | 비고 |
|---|---|---|---|
| `7fd2953d` 2026-07-08 | 12523 | **12523** | 정확했음 |
| `80cbaf13` 2026-07-13 | 13042 | 12523 | **+519 = 신규 4단원 선언 종수 합**(177+126+108+108) |
| `46c20f98` 2026-07-19 | 13192 | 12631 | +150. ★커밋 제목이 "with 150 items" = 문항수를 종수에 더함 |
| 현재 2026-08-21 | 13192 | 12788(index 39단원) | — |

★ **13042 − 12788 = 254 = 절단 3단원 결손 합계**((177−87)+(126−47)+(108−23)).
⇒ manifest는 절단 이전의 기대치를 담고 있었고, **"177 = 정의 수" 판정을 독립 검증**합니다.
⇒ 같은 배치의 **삼각비(선언 108 → 실제 108/108)가 대조군**입니다.
⇒ +150 확정: 커밋 46c20f98 "ingest M3 quadratic function worksheet set10 with 150 items". 종수 자리에 문항수를 더한 단위 혼동.

상세 = `B_similarity_manifest_and_dplan.v1.md` §1

---

## 📒 별건 등재 2 (2026-08-21) — 통계는 개념층까지 절단됐다

`check_catalog_integrity.ps1` CHECK 7(개념 증인) 신설로 검출.

```
단원                        카탈로그 참조 개념 max   ×3     선언    판정
M2_SIMILARITY_PYTHAGORAS    C059                     177    177    ok
M3_CIRCLE_PROPERTIES        C042                     126    126    ok
M3_TRIGONOMETRIC_RATIO      C036                     108    108    ok  (대조군)
M3_STATISTICS               C025                      75    108    FAIL
```

★ **닮음·원의성질은 유형층만 잘리고 개념층은 온전**했다(그래서 개념 max가 정식 base 수를 증언한다).
★ **통계만 개념층도 함께 잘렸다** — 선언 36 base 중 개념 참조가 25까지만 도달한다. 최대 ID 74( = 25×3−1)와 정합.
⇒ 통계는 다른 두 단원과 절단 깊이가 다르므로, **닮음에서 확립한 복원 방법을 그대로 적용할 수 없다.** 별도 조사 필요.

상세 = `B_similarity_concept_witness.v1.md` §1·§4

### 🔴 위 절의 정정 (2026-08-21, 제출11 §0)

"통계만 개념층도 함께 잘렸다"는 **틀린 규정이었다.** 통계의 개념층 구조는 다른 두 단원과 동일하다.
```
M3_STAT  concept_ids 보유 23/23 · 길이 전부 1개 · 슬롯번호 = 개념번호
M3_CIRC  47/47 동일          M2_SIMPY  87/87 동일
```
다른 것은 **조립이 닿은 범위**다.
```
통계 PT번호 = 전부 PT(3n-1) = pos1 한 칸씩만 · 슬롯 1~22 와 25 · 23·24 건너뜀
최대 슬롯 25 < 선언 base 36  ⇒ 뒤쪽 11슬롯(26~36)에 문항이 하나도 없었을 뿐
```
⇒ **개념 max 는 정식 base 수의 "하한"만 증언한다.** 닮음(59=59)·원의성질(42=42)·삼각비(36=36)는 조립이 마지막 슬롯까지 닿아 선언을 뒷받침하고, 통계는 미달이라 **반증도 입증도 아니다.**
⇒ `check_catalog_integrity.ps1` CHECK 7 을 3분기(`초과=FAIL` / `일치=ok` / `미달=under`)로 고쳤다. 초판은 통계에 허위 FAIL 을 냈다.
