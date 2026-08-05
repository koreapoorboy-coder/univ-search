# (B) 채점·판정 로직 — 착수 인계문 (새 채팅용)

> 팩 생산 라인(A)은 **45/45 종결**(v44, HEAD `b4878b38`). 이 문서는 그다음 단계 **(B) 채점·판정 로직**의
> 착수 조건 조사 결과다. 큰 인계는 `PACK_HANDOFF.md`(A라인 정본) + 메모리. 이 문서는 **B 전용**.
> 축 정의 원문은 이 묶음에 없음 — D3·검산 등 매핑 시 필요(검수측 보유). ⚠ "§10~11" 절 표기는 미확인(원본이 리포 밖이라 검증 불가).

---

## 0. 지금 어디

- (A) 팩 라인 종결: 45단원 전부 예측축 규칙 보유(`axis_rules.v44.json`). 총 9028항목·미매칭121·pack_gap687.
- 병행 완료: P0-01(unit_id authority `66461bdd`) · P0-02(fail-closed 보고서 `02a57408`).
- **(B) 착수 = 데이터 지형 조사까지 함(이 세션).** 아직 코드 작성 0.

## 1. ⭐ 핵심 발견 — 분류 체계가 **두 개** 공존

| | 새(MathFlat 45단원) | 옛(엔진 orig) |
|---|---|---|
| 팩(예측축) | **여기 붙음** ✅ | — |
| 단원코드 | AELF·EQ·DA·M2_LINEAR_EQUATION | ALG_EXPLOG_FOUNDATION |
| 유형ID | M2_LE_PT### · H1_CM1_* | ALG_EXPLOG_FND_PT_* |
| 문항데이터 | `source_item_links/`(아래) | `item_bank/algebra/` |
| 운명 | 채택 | **나중에 교체 대상(§9)** |

**둘의 유형 이름·번호가 완전히 다름.** 옛 item_bank/algebra는 옛 체계라 팩과 직접 안 이어짐.

## 2. 새 체계 문항 데이터 = `source_item_links/` (실측)

- **3,364 문항**, **14단원(중2·중3)만**. likely_error_tags **100% 채워짐**(평균 3.57개/문항, 최소1 최대11).
- 새 유형번호(`primary_problem_type_id: M2_LE_PT011` = 팩과 같은 체계)에 연결됨 ✅.
- 필드: item_id · unit_id · primary_problem_type_id · **likely_error_tags**(영어코드) · concept_ids ·
  expected_process_stages(RECOGNIZE→START→CONDITION→TRANSFORM→CALCULATE→VERIFY) · first_action_hint ·
  representation_type · condition_count · mapping_confidence · diagnosis_weight · review_status.
- **⚠ 태그 성격 = 문항 단위 "나올 법한 실수 목록"**, **답과 짝지음 아님**(answer/choices 필드 없음).
  → 답별 분기(진짜 오답예측표)는 아직 없음. 문항 단위까진 됨, 답 단위 분기가 빠짐.
- 단원별 개수: 삼각비372·원300·문자와식300·확률300·이차방정식300·이차함수300·닮음300·다항식300·
  일차방정식192·실수150·통계150·기하150·일차부등식150·일차함수100.
- **중1·고등(~31단원)은 새 체계 문항 0** — 옛 algebra만 있음. 이건 새로 구축해야 함.

## 3. predicted_axes 미배선

- `grep -rl predicted_axes public/.../data` = **0파일**. problem_type 구조에 axes 필드 자체 없음(concept_ids·error_tags뿐).
- 즉 팩이 만든 예측축이 **저장 데이터에 안 들어가 있음.** (B) 첫 배선 작업 = 팩 출력을 유형에 predicted_axes로 굽기(기계적).

## 4. EQ(연립방정식) 태그→축 매핑 실험 (초안, 미완 — 참고용)

192문항, unit_code=EQ, 비교팩=SE_EQ(65규칙). 태그 21종.
- **태그→6축**: A3·B1·B3·B4·C1·D1. 미사용 11축.
- **⚠ `verification_missing`(93, 2위)이 17축에 집이 없음** — 검산 전용 축 부재 = **축 어휘의 구멍**(제일 중요한 발견).
- 다축 태그 약3종(거리속력·상대속력·농도관계 = C1+A3).
- **팩 예측축 vs 태그 실측축**:
  - 겹침5: B1·B3·B4·C1·D1 (핵심 일치 ✅)
  - 팩만6: B2·C2·C3·C4·D2·**E1** — E1은 팩이 이미 「유령축」 의심한 축 → **태그에 E1 없음 = 유령축 의심 반증(태그가 팩 검증)**
  - 태그만1: **A3**(식세우기) — 팩은 활용식세우기를 C1로 뭉뚱그림, 태그는 분리
  - 무게중심 다름: 팩=C1(활용)·C3(증명) 최다 / 태그=D1(계산223)·B1(검산149) 최다.
    → 버그 아님. 팩=문제가 뭘 요구(예측), 태그=학생이 뭘 실패(실측). **이 간극이 채점 로직의 핵심(predicted≠observed).**

## 5. 다음 할 일 (후보 — 사용자가 고름)

1. **verification류 축-미배정 태그**가 다른 단원에도 있는지 조사(축 어휘 구멍 크기 파악).
2. EQ 매핑 → **거친 채점 시제품 1문항 시연**("이 문항 틀리면 이런 약점 후보").
3. 14단원 태그→축 매핑 전체(거친 진단 커버).
4. **predicted_axes 배선** 설계·구현(팩→유형 데이터).
5. (진짜 병목) **답별 오답예측표** — 문항 답/풀이 읽고 분기.
6. **index.v1.json 원자 교체**(§9 절대규칙 — 옛/새 섞이면 안 됨).

## 6. 손대지 말 것 / 주의

- `index.v1.json`·진단워커·옛 12분할: 전부 완성 후 **한 번에 교체**(§9). 지금 진단은 옛 체계로 돎.
- `public/`는 GitHub Pages 서빙 — 학생 PII 금지.
- predicted_axes ≠ observed_axes 같은 필드 저장 금지.
- 검수 채팅에 **채점·판정 로직 v1 초안**(`채점판정로직_v1_초안.md`) 있음. 선행의존성 4건은 `PACK_HANDOFF.md §6-B` 참조.

## 7. 파일 경로 (빠른 참조)

```
팩 규칙      tools/axis_prediction/axis_rules.v44.json
러너         tools/mathflat_builder/Run-AxisPrediction.ps1   (RulesPath v44)
재료추출     tools/mathflat_builder/Export-PackGapMaterial.ps1 -Only <unit_code>
A라인 정본   tools/axis_prediction/PACK_HANDOFF.md
새 문항+태그  public/math-weakness-engine/data/source_item_links/   (14단원, 3364문항)
새 문항메타   public/math-weakness-engine/data/item_bank/m2_*·m3_*/
옛 문항       public/math-weakness-engine/data/item_bank/algebra/   (교체 대상)
엔진 코드     public/math-weakness-engine/assets/math_weakness_engine.js
플로우 코드   public/math-weakness-engine/assets/math_verification_flow.js  (P0-01 수정분)
렌더러       public/math-weakness-engine/assets/math_hybrid_report_renderer.js (P0-02 수정분)
raw 분류(새) public/math-weakness-engine/data/raw_taxonomy/*.mathflat.v1.json
```

## 8. 환경 함정 (반복 물림)

- PowerShell 5.1: BOM 필수 · 인라인 ternary 금지 · **`$rows`↔`$ROWS` 대소문자 충돌**(§4·§5) · `$N행`은 `${N행}`로 파싱(→`$($N)행`).
- Python·node 없음. JS는 Claude Browser file:// 실행(프로젝트 내만 JS 돎, 외부/localhost 차단, 스냅샷은 write시점 렌더 → `?v=` 캐시버스트).
- **검수 산출물 파일 유실 4회**(Downloads 동기화 정리) → 받은 재료·블록·게이트는 **첫 Read 직후 scratchpad 박제**.
- git: `show --stat` 막대값=삽입+삭제 합(오독주의, `--numstat` 쓸 것) · 새 `_*.html`은 `.gitignore` 예외 필요.
