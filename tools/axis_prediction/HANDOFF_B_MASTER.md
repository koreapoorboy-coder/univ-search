# (B) 채점·판정 로직 — 마스터 인계문 (단일 진입점)

> **이 문서 하나로 (B)를 이어받는다.** 여러 시점 문서가 섞여 있어 이 세션에서 뒤집힌 게 많다 — 옛 문서 먼저 읽으면 틀린 걸 다시 밟는다.
> 큰 그림 `tools/HANDOFF.md`·`PACK_HANDOFF.md`(A라인). 축 원문 `axis_definitions_v10_orig.md`(내용만 확보 · 출처 "§11" 미확인).

## ⏱ 첫 5분 (여기부터)
- (A) 팩 라인 45/45 종결(v44). **(B) = 팩 예측축을 실제 문항에 잇고, 태그(관측축)와 대조하는 것.**
- **✅ 예측축 연결 완료 10단원** — 팩→문항 배선. `B_connect_<unit>.v1.json`.
- **✅ (B) 목표 도달**: predicted(팩) vs observed(태그) 문항 단위 대조 = `B_pred_vs_obs.v1.md`. **측정가능 겹침 59%.**
- **남은 것 전부 외부 입력 대기**(축 정의 원문·경계 판례 — 존재 확인 불가·검수측 보유 + A라인 회신). Code탭이 더 할 수 있는 건 거의 없음.
- 최신 상태 = `B_connect_STATUS_v2.md` + 이 문서. **옛 문서(아래 폐기 목록) 판단 무시.**

## ✅ 확정된 것
1. **연결 방법 = 단원마다 다름**(체계 한 벌 아님). **PT-다리**(문항 primary_problem_type_id↔raw_taxonomy topic_type legacy_problem_type_id, 러너 v5 로직) 5단원(LE·NE·QE·RC·LI, 평균 2.98축) + **이름매칭**(canonical_target_type_name, 축 누락 가능) 5단원(통계·확률·원·삼각비·LF, 평균 2.33축). 도구 `Connect-ItemsViaPT.ps1`(unit_code 조인·0%경고·falsepos 마킹).
2. **predicted vs observed 실측**(깨끗 548문항): 측정가능 겹침 **59%**. 합의축 **C1(식세우기)·E1(검산)**. 벌어짐 **D3·C2 태그≫팩·A2·B3·D2·E3 팩≫태그** = "요구 vs 실패" 실물.
3. **★ E1 확정**: 오탐(C-01) 걸러낸 clean E1 43/61(70%)이 태그와 겹침. **원문(참 축)+관측(부착) 양쪽에서 섬.** 가장 오래 의심받던 축이 닫힘.
4. **관측층 정본** = `B_tag_axis_map.v1.json`(86태그 축 레이블·오류절; 출처 "§11" 미확인). 보류 5(A2/D2·B1/C1·②·축없음).
5. **17축 원문**(내용 확보 · 출처 "§11" 미확인) = `axis_definitions_v10_orig.md`. E1=검산생략·A3=조건정리안함·D3=단순연산실수 등.

## ⛔ 막힌 것 + 왜
- **A2/D2·B1/C1 경계 미해소** → 보류 태그 3(146). 축 명칭표라 안 갈림. **경계 판례 필요(존재 확인 불가·검수측 보유).**
- **오탐 213부착 재판정**(E1 92·E3 121, C-01/C-10 단독 공급) → 공통규칙 수정=45단원 스윕+AELF=**A라인.**
- **🔴 4단원 856문항**(similarity·polynomial·quad_function·geometry) → raw_taxonomy 유형 부재 = **A라인**(유형추가+규칙신설+재검증).
- **답별 오답 분기**(진짜 병목) → 문제 본문·선택지 미저장(policy), **원천 PDF 리포 0개.**
- **"§10·v11 원문"** → **존재 확인 불가**(원본 인계문이 리포에 없음 — 전수 탐색 확인, 검수측 Downloads 보유; "없다"가 아니라 검증 불가). ~~§10 팩주도율 부분 재구성~~ **폐기** — 팩주도율 정의는 이미 리포에 확보(`PACK_HANDOFF.md §16-C`: 팩주도율=팩부착/전체, 지배축=전체≥50% AND 팩주도율>50%), 재구성할 원본 표가 애초에 없음.

## ❌ 이 세션에서 뒤집힌 것 + 왜 (옛 문서 판단 폐기)
| 옛 판단 | 실제 | 왜 틀렸나 |
|---|---|---|
| 복원 조작정의(팩 why 기반) | 원문 축 명칭표로 교체 | A3·B3·C3·C4·**D1↔D3** 6축 어긋남. 해법절/오류절 혼동 |
| LI A3 = 팩 미예측 발견 | 철회→보류 | 오류절 재분류로 딜레마 소멸. 여섯 글자 레이블로 성급 판정 |
| 🔴 = 무거운 재분류 | 기계적 키 조인 | **필드 오류**(세부이름 매칭)+**팩 오류**(EX_LE→SE_EQ). 실제 PT-다리 75% |
| E1 = 유령축 의심 | 참 축 확정 | 원문 축 명칭표 E1=검산 + 관측 70% 확인 |
| linear_equation 6% | 75% | canonical_target_type_name(세부) 아니라 primary_problem_type_id(PT-다리) |
| 겹침 46% | 측정가능 59% | NE 관측0 122 희석(분모 오염) |

**공통 뿌리 = 식별자 불일치 3종이 전부 조용한 0**(유형이름 대푯값/대표값 · PT-id 유무 · unit_id M2_SIMILARITY_PYTHAGORAS vs M2_SIMILARITY). 에러 안 나서 발견이 우연. → 도구에 0%/저커버 경고 넣음.

## 📋 A라인 안건 (열릴 때 한 번에) — `B_redzone_Aline_안건.md`
1. 🔴 856문항 유형추가+규칙신설+45/45 재검증
2. D3 드리프트 7규칙→C4 재판정
3. 오탐 213부착 정밀화(스윕+AELF) — 현 대장 10건, **차기 대장(13건+형태③) 확보 후 재스윕**
4. 경계 판례·차기 대장 확보(존재 확인 불가·검수측 보유) → A2/D2 경계 + 오탐 3건 추가

## 🗂 파일 지도
```
정본(현재)
  HANDOFF_B_MASTER.md          ← 이 문서, 진입점
  B_connect_STATUS_v2.md       연결 방법정책·굽기 결과
  B_pred_vs_obs.v1.md          ★ (B) 목표: 예측vs관측 59%
  B_connect_<unit>.v1.json     10단원 연결(link_method·falsepos_rules)
  B_tag_axis_map.v1.json       관측층 정본(86태그)
  B_redzone_Aline_안건.md       A라인 상신 재료
  axis_definitions_v10_orig.md 17축 원문(출처 "§11" 미확인)
  Connect-ItemsViaPT.ps1       PT-다리 도구
참고(옛 상세, 판단은 위 정본 우선)
  HANDOFF_B_조사결과_시범매핑.md  초기 조사(복원본·D3정정 이력)
  B_trial_mapping_4units_v2_원문.md  86태그 재매핑 상세
  B_connect_13units_signal.md   신호등 초판(🔴 진단은 STATUS_v2가 대체)
  HANDOFF_B_채점로직.md          최초 착수 조사
```

## ⚠ 환경 함정 (반복 물림)
- PowerShell 5.1: **BOM 필수**(전각괄호 깨짐) · 예약변수 충돌(`$PID`·`$Matches`·`$_.obs` in Where) · `$var:` 콜론=드라이브(`${var}:`) · Remove-Item이 regex `\d+`에 샌드박스 차단(git rm 쓸 것).
- 리포 경로 = `C:\Users\user\OneDrive\바탕 화면\scshstudy`(OneDrive 해제됨, 옛 Desktop 경로 아님).
- 검수 워크플로우: 데이터=Code탭(나), 방법론=검수(GPT). **모든 산출물 리포 파일에 커밋**(채팅 유실 방지).
