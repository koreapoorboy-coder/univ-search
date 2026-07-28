# 축예측 팩 생산 라인 인계문 (새 Code 세션 전용)

> 이 문서 하나로 팩 라인을 이어받는다. 리포 루트 `C:\Users\user\Desktop\scshstudy`.
> 규칙 **v20** · 스크립트 v5(포팅 v20) · 팩 **20개 / 25단원-행 커버**. HEAD `0f8d45ff`.
> 큰 그림은 `tools/HANDOFF.md`, 서브시스템 상세는 `tools/axis_prediction/README.md`(v3~v20 라운드 이력 전부).
> **순서 확정(사용자 지시)**: (A) 팩 생산 라인 §0~5 를 **먼저 끝낸 뒤** → (B) 채점·판정 로직 §6-B 로 넘어간다.
> 지금 할 일 = **(A) 계속. 다음은 QF 이차함수**(재료 발송됨). 검수 채팅이 QF 팩 블록 주면 v21로 반영.
> **QF는 `QF ← LF_FN 58%(19규칙·분산형)` 강한 공용 후보** — 검수 채팅이 119건 why 검증 중. 오면 `["FN","QF"]` 공용키 or 신규.

---

## 0. 지금 뭘 하고 있나 (한 줄)

검수 채팅(GPT, Python/xlsx 정본)이 **pack_gap 최다 단원**부터 진단축 규칙 팩을 한 세션에 하나씩 짜서
**채팅 본문 JSON**으로 넘긴다. Code 탭은 그걸 리포 규칙파일에 **텍스트 삽입**하고, **저장 JSON 45단원 대량 실행기**
(`Run-AxisPrediction.ps1`)로 재실행해 검수 채팅의 **예측치와 대조**한 뒤 커밋하고, **다음 단원 pack_gap 재료**를 뽑아 넘긴다.

## 1. 매 라운드 절차 (그대로 반복)

1. **블록 수령**: 검수 채팅이 `"XX_YYYY": { applies_to, note, rules[] }` JSON을 채팅 본문에 준다(파일 전송은 3회 중 2회 유실돼 본문이 유일 경로).
2. **블록 저장·검증**: 스크래치패드에 `blocks_*.txt`로 저장 → `{ ...블록... }`로 감싸 `ConvertFrom-Json` 파싱 확인, 규칙 수·id 고유·`\\(` 보존 확인.
3. **텍스트 삽입으로 v(n+1) 생성** (재직렬화 금지):
   - `axis_rules.v(n).json` 복사 → `"version"` 상향 → `domain` 끝(마지막 팩 `}` 뒤)에 `,` + 블록 삽입.
   - PowerShell: 파일 끝에서 root `}`·domain `}` 두 개를 떼고 블록 뒤에 다시 붙임(아래 스니펫).
4. **검증**: 체크섬(검수 채팅이 준 "공통 15 + 단원팩 NNN, domain 키 K개") 일치 + **기존 팩 전부 v(n)과 바이트 동일**(`ConvertTo-Json -Compress` 비교).
5. **포팅 갱신**: `Run-AxisPrediction.ps1`의 `RULES_PATH` → v(n+1), 헤더 팩목록에 추가. **BOM 재저장** 후 실행.
6. **예측 대조**: 해당 단원 총항목/적중/팩%/gap%/과다규칙이 예측치와 맞는지. **불변식**(기존 팩단원 수치 불변) 확인. AELF 353·96%·76%·20%는 항상 불변.
7. **커밋·push**: `git add` 관련 4파일 → `git commit -F <msg>` → `git fetch; git rebase origin/main; git push`.
8. **다음 재료**: 다음 pack_gap 최다 단원의 `중영역별 pack_gap+미매칭` tsv를 뽑아 Downloads 복사 + 발송. 회신 md도 함께.

### 삽입 스니펫 (검증된 방식)
```powershell
$inner = Get-Content blocks_X.txt -Raw -Encoding UTF8
$s = Get-Content axis_rules.vN.json -Raw -Encoding UTF8
$s = [regex]::Replace($s,'"version":\s*"vN"','"version": "vN1"',1)
$ind = (($inner -split "`n")|%{ if($_ -ne ''){"  $_"}else{$_} }) -join "`n"
$t = $s.TrimEnd(); $t=$t.Substring(0,$t.Length-1).TrimEnd(); $t=$t.Substring(0,$t.Length-1).TrimEnd()
[IO.File]::WriteAllText('axis_rules.vN1.json', $t+",`n"+$ind+"`n }`n}`n", (New-Object Text.UTF8Encoding($false)))
```
BOM 재저장(스크립트 실행 전): `$t=gc x.ps1 -Raw -Encoding UTF8; [IO.File]::WriteAllText('x.ps1',$t,(New-Object Text.UTF8Encoding($true)))`

## 2. 실행기와 대조 지표

```powershell
tools\mathflat_builder\Run-AxisPrediction.ps1        # 45단원 전량, [-Only <PREFIX>]
```
- 입력: 저장 JSON `public/math-weakness-engine/data/raw_taxonomy/*.mathflat.v1.json` (정본 Python은 xlsx, 이건 포팅).
- 매칭 컨텍스트 = **유형묶음 + 유형이름**(중영역 제외, v5). 이름은 행별 세부→주제→묶음 폴백.
- 출력 CSV(임시\axispred): `name_source_dist`(단원표) · `unmatched_all` · `pack_gap_all` · `rule_over60`. PF는 학기열로 분리.
- **pack_gap = 걸렸으나 공통규칙(C-)만 걸리고 단원팩(D-)을 못 짚은 항목** = 팩 필요성 실제 지표(미매칭 아님).
- 교차검증 앵커: **AELF 353·적중96%·팩76%·gap20%·이름단독92%·요약전용1** — 매 실행 자동 출력, 틀리면 뭔가 깨진 것.

## 3. 규칙 파일 규약 (물린 것들)

- 팩 규칙 id는 **`D-` 접두**(pack_gap 판정이 이걸로 갈림), 공통은 `C-`. 축코드는 인계문 §10 진단축 16개(A/B/C/D/E 계열).
- 정규식 `\\(`는 JSON에서 `\(`가 됨 → **두 백슬래시 그대로**. 하나로 줄이면 파싱 깨짐. (여러 팩에 있음)
- **재직렬화 금지**: `ConvertTo-Json`은 한글 escape·키순서·공백을 바꿔 기존 팩 바이트동일성을 깬다. 반드시 텍스트 삽입.
- **기존 팩 수정 예외(v9 CA2_M2D)**: 바이트동일 불변식을 그 팩만 완화 — 지정 필드(`applies_to`·`note`)만 치환(매치 수=1 확인), `rules`는 바이트 동일, 나머지 팩 완전 동일, 영향 단원(M2D) 실행 불변을 재실행 확인.
- **PF 코드충돌**: unit_code=PF 두 단원(M1S1 소인수분해·M3S1 다항식곱셈)은 포팅이 `PF → PF_$학기`로 갈라 팩키 `PF_M1S1`/`PF_M3S1`로 선택. 규칙 `applies_to`도 `["PF_M1S1"]`.

## 4. 팩 재사용 (M1D·적분에서 확립)

새 단원 시작 시 **기존 팩 커버율을 먼저 실측**, **채택 기준은 커버율이 아니라 발화 규칙의 `why` 적합성**(커버율은 후보 탐색용).
- ⚠⚠ **선측정 스크립트 버그(여러 번 물림, 근본원인 확정)**: PowerShell 변수 **대소문자 무시**라 `$R`(규칙객체) 살아있을 때
  `foreach($r in $common)`을 돌리면 `$r`==`$R`로 `$R`이 덮여 `$R.domain.$pk`=null → 재사용 커버율 **전부 거짓 0%**.
  **`$r`·`$p` 같은 1글자 루프변수 금지, `$row`·`$rule`·`$pk`만.** 검증된 측정 스니펫:
  ```powershell
  foreach($row in $rows){ $ctx="$($row.묶음) $($row.이름)"; $hit=$false
    foreach($rule in $Rules.domain.$pk.rules){ if($ctx -match $rule.pattern){$hit=$true; $fired[$rule.id]=1} }; if($hit){$cov++} }
  ```
  (커밋된 `Run-AxisPrediction.ps1`은 무관 — `$rule`/`$R`만 씀. 팩 결과는 전부 정확.)
- **채택 실례**: M1D←CA2_M2D 51%(9규칙 why 맞음, applies_to 확장) · M1I/M2I←IN1_M1I(처음부터 `["M1I","M2I"]` 공용키, M2I 69%).
- **기각 실례**: CM2SP←SQ_ASQ 29%(범용 `개수` 한 규칙) · FN·CM2FG←(적분·이차 why) · GS←LF_FN 33%(넓이 등 범용) · **TR←TF_ATF 74%**(D-ATF-32 `삼각비` 주제어 하나가 82% 부풀림, 중3은 삼각함수 미학습).
- **「커버÷발화규칙수」 지표는 기각**: 채택 M1D 16.3 > 기각 GS←BF_BG 5.8로 안 갈림. 유효한 건 **단일규칙 집중도**(한 규칙이 커버 70%+면 의심). 최종은 항상 why.

## 5. 현재 팩 로스터 (20개, v20 · 규칙 693=공통15+단원팩678)

| 팩 | 적용 | 규칙 | 단원 결과(적중/팩%/gap) |
|---|---|---|---|
| EL_AELF | EL, AELF | 9 | AELF 353/96%/76%/gap20 (앵커) |
| PS | PSC,PSP,PSS | 10 | (PSS/PSC 세분화 대기) |
| GE | GEV,GES,GEC | 11 | |
| CA2_M2D | **M2D, M1D** | 23 | M2D 406/99%/78%/gap22 |
| MM_CMM | CMM | 15 | 61/100%/93%/gap7 |
| PF_M1S1 | PF_M1S1 | 16 | 149/100%/89%/gap11 |
| EI_CMEI | CMEI | 38 | 540/100%/87%/gap13 |
| SQ_ASQ | ASQ | 30 | 459/98%/86%/gap13 |
| TF_ATF | ATF | 32 | 385/100%/99%/gap1 |
| GE2_CM2GE | CM2GE | 41 | 282/100%/100%/gap0 |
| CA1_M1D | M1D | 24 | M1D 289/100%/100%/gap0 |
| SP_CM2SP | CM2SP | 37 | 306/100%/98%/gap7 (D-SP-36 v14 수정) |
| LF_FN | FN | 46 | 267/100%/100%/gap0 (미매칭1=G030 의도) |
| BF_BG | BG | 46 | 223/100%/100%/gap0 |
| IN1_M1I | **M1I, M2I** | 35 | 적분 공용 |
| IN2_M2I | M2I | 19 | M1I 187·M2I 250 둘 다 100%/gap0 |
| FG_CM2FG | CM2FG | 60 | 284/100%/100%/gap0 |
| CR_CP | CP | 49 | 212/100%/100%/gap0 |
| SM_GS | GS | 74 | 239/100%/100%/gap0 |
| TB_TR | TR | 63 | 152/100%/100%/gap0 (C-15 66% 공통과다) |

전체(45단원, 46 unit-row): 미매칭 **1164** · pack_gap **2786** · 팩보유 **25/46**.

**지배축 표(누적, (B) 채점로직용)**: CM2FG C4 45 · BG C2 52 · M2I D2 72 · CP C3 75 · GS D2 54 · **TR 없음**(균등, CM2FG와 정확도검증 대조군). 팩마다 갱신.

## 6. 열린 항목 (우선순위)

1. **다음 팩 큐(pack_gap 순, 팩 없는 21단원)**: **QF 205**(재료 발송, LF_FN 58% 재사용 후보) → LE 문자와식 165(순수 신규) → M2SL 143 → QE 140 → RC 137 → PF_M3S1 132 → …
2. **C-15 60% 억제 (스크립트 몫, 팩라인 후 (B)와 도입)**: TR C-15 66%·GS 51% 등 기하단원은 C-15가 거의 전 항목 발화. 「팩 커버 100% unit-row에서만 60%초과 공통규칙 억제」안 — 실측상 미매칭 0 유지되나 **AELF 회귀 기준선이 함께 이동**하고 팩 없는 21단원엔 적용 금지. 지금 미구현.
3. **공통 60% 상한(팩 규칙)**: QE C-11 90%·EQ C-11 63% 등 8행(묶음 이름이 주제어). AELF·CMM에서 억제 규칙 0이라 미구현 — 도입 시 QE/EQ부터.
4. **PSS/PSC 세분화**: D-PS-05 64%·D-PS-09 61% 삭제 아니라 이산/정규/이항으로 쪼갬(항목 적은 23·56단원 60% 상한 금지).
5. **기존 팩 짧은 한자어 토큰 오탐 점검**: `D-GE-08 중심`(⊂무게중심)·`D-BG-36 대각`(⊂대각선)이 부분문자열 오발화. GEV/GES/GEC·BG **자체** 발화 점검(GS엔 무영향).
6. **정확도 검증(배포 게이트)**: 지금까지 전부 적중률·커버리지지 예측 축 정확도 아님. 근거 AELF 30문항 88% 하나. 팩 완료 후 단원별 대표 5~10문항 재측정. **균등단원 CM2FG·TR을 대조군으로.**
7. **검수 채팅 마스터 명세서** 갱신은 그쪽 작업(리포 문서는 매 라운드 최신).

## 6-B. 병행 스레드 — 채점·판정 로직 v1 초안 (검수 채팅, §17-3)

검수 채팅이 팩 라인과 별개로 **채점·판정 로직 v1 초안**(`채점판정로직_v1_초안.md`)을 냈다. 학생 제출 → 답 판독 →
채점 → observed_axes 판정 → 약점 지도. **설계는 견고**하고 핵심 불변식(predicted ≠ observed 분리)을 정확히 지킴.
Code 탭이 리포로 대조해 확인한 **선행 데이터 의존성 4건**(이게 이 로직의 실제 착수 조건):

1. **predicted_axes 실체화 안 됨**: 규칙(v10)으론 있으나 저장 데이터엔 없음(`grep predicted_axes public/`=0, 분류표 `raw_not_wired`).
   문서 "1층은 이미 있다"는 과장. 채점 시점 조회하려면 규칙 출력을 엔진 데이터에 배선(§17-7·index.v1.json, Code 탭) 선행.
2. **오답예측표(문항별 오답값→축) 거의 미구축 = 진짜 병목**: `predicted_axes`(유형별, 팩이 만듦)와 다른 층.
   L1은 오답예측표에 의존 → 파일럿 30문항 외엔 없어 **첫 배포 때 L1 거의 빔 → observed_axes 대부분 `[]`**. 문항마다 표 채우는 게 최대 작업량.
3. **"AELF 52묶음 중 14 출제"의 14 재확인 필요**: 52는 맞음. 14가 하필 AELF 세부유형 보유 행 수와 같아 혼동 의심 — 검수 채팅 확인.
4. **옛 진단 서브시스템 공존**: `public/math-weakness-engine/data/diagnosis/`·worker_skeleton 이 자체 observed/rules 로 이미 돎.
   이 v1 구현 = §17-7 "index.v1.json 한 번에 교체"와 맞물림(§9 절대규칙).

→ 결론: 문서 §7의 열린 결정 3건 + **위 ①②가 이 로직의 선행 데이터 작업**. ①②없이 L1 안 돎.
**착수 시점 = 팩 라인(§0~5) 완료 후**(사용자 지시 순서). 그전엔 손대지 않고 대기.

**추가 발견 — 지배축 과소진단(팩 라인에서 나온 (B) 재료).** 단원마다 한 축이 항목의 50~75%를 차지한다
(CM2FG C4 45%·BG C2 52%·M2I D2 72%·CP C3 75%, 팩마다 갱신 중). 채점 초안의 축별 판정 `confirmed/exposed`는
지배축의 exposed가 사실상 전 항목이라 오답 10건이어도 rate가 낮아 **「양호」로 과소진단**된다. 수정안:
①`dominant_axes`(단원 50%+ 축) 기록 후 그 축은 rate 아닌 절대건수로 보거나 판정보류, ②지배축은 §10 P3(조건 하나 깨기)
증명문항으로만 판정. (B) 착수 시 반영. 팩 회신마다 지배축을 남겨 45단원 지배축 표를 미리 완성해 둘 것.

## 7. 손대지 말 것

- `index.v1.json`·진단 워커·옛 12분할: 전 단원 저장·정리 끝나고 한 번에 교체(§9). 지금 진단은 옛 체계.
- `public/`는 GitHub Pages 서빙 — 학생 데이터·PII 금지(분류·툴은 무방).
- predicted_axes와 observed_axes를 같은 필드에 저장 금지.
- 규칙 파일 재직렬화 금지(§3).

## 8. 새 세션 시작 체크

```powershell
cd C:\Users\user\Desktop\scshstudy
git log --oneline -1                                  # 0f8d45ff 이상
tools\mathflat_builder\Run-AxisPrediction.ps1 -Only AELF   # 353·96·76·20·92·1 확인 (앵커)
tools\mathflat_builder\Run-AxisPrediction.ps1 -Only TR     # 152·100%·100%·gap0 (v20 최신팩)
```
검수 채팅이 **QF 팩 블록**을 주면 §1 절차로 v21 반영. **QF는 LF_FN 58% 재사용 후보** — 검수 채팅이 공용키(`["FN","QF"]`)로 줄 수도, 신규로 줄 수도 있으니 블록의 `applies_to`를 그대로 따를 것(공용키면 §3 예외 절차: LF_FN.applies_to에 QF 추가 + QF 전용 보충팩).
**정리/규칙 질문**은 이 문서 + README(라운드 이력) + HANDOFF 참조.
