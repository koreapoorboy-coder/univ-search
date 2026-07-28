# 축예측 팩 생산 라인 인계문 (새 Code 세션 전용)

> 이 문서 하나로 팩 라인을 이어받는다. 리포 루트 `C:\Users\user\Desktop\scshstudy`.
> 규칙 **v10** · 스크립트 v5(포팅 v10) · 팩 **12개 / 17단원-행 커버**.
> 큰 그림은 `tools/HANDOFF.md`, 서브시스템 상세는 `tools/axis_prediction/README.md`.
> **순서 확정(사용자 지시)**: (A) 팩 생산 라인 §0~5 를 **먼저 끝낸 뒤** → (B) 채점·판정 로직 §6-B 로 넘어간다.
> 지금 할 일 = **(A) 계속, 다음은 FN**. (B)는 팩 완료 후 착수(선행 데이터작업 ①②부터).

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

## 4. 팩 재사용 (M1D에서 확립)

새 단원 시작 시 **기존 팩 커버율을 먼저 실측**하되(`-Only`로 후보 팩만 걸어 실행), **채택 기준은 커버율이 아니라 발화 규칙의 `why` 적합성**.
- M1D: CA2_M2D(미적분Ⅱ 미분)를 걸어 51%(147건) 커버 + 9규칙 why 전부 맞음 → `applies_to`에 M1D 추가 재사용. 나머지는 CA1_M1D.
- CM2SP: SQ_ASQ가 29% 커버였으나 71건이 범용 `개수`(D-ASQ-21) 하나가 만든 수치, why 불일치(부분집합 세기≠경계·중복) → **기각**.
- 다음: **M2I는 M1I와 묶어** 재사용 가능성 높음(미분 때처럼).

## 5. 현재 팩 로스터 (12개, v10)

| 팩 | 적용 | 규칙 | 결과 |
|---|---|---|---|
| EL_AELF | EL, AELF | 9 | AELF 353/96%/팩76%/gap20% |
| PS | PSC,PSP,PSS | 10 | (PSS/PSC 세분화 대기) |
| GE | GEV,GES,GEC | 11 | |
| CA2_M2D | **M2D, M1D** | 23 | M2D 406/99%/팩78%/gap22% |
| MM_CMM | CMM | 15 | 61/100%/팩93%/gap7% |
| PF_M1S1 | PF_M1S1 | 16 | 149/100%/팩89%/gap11% |
| EI_CMEI | CMEI | 38 | 540/적중539/팩87%/gap13% |
| SQ_ASQ | ASQ | 30 | 459/적중452/팩86%/gap13% |
| TF_ATF | ATF | 32 | 385/적중384/팩99%/gap1% |
| GE2_CM2GE | CM2GE | 41 | 282/적중282/팩100%/**gap0** |
| CA1_M1D | M1D | 24 | M1D 289/적중289/팩100%/gap0 |
| SP_CM2SP | CM2SP | 35 | 306/적중297/미매칭9/팩95%/gap2% |

전체(45단원, 46 unit-row): 미매칭 **1533** · pack_gap **4239** · 팩보유 **17/46**.

## 6. 열린 항목 (우선순위)

1. **CM2SP 미매칭 9건 결정 대기**: 기본 「명제·조건 판단」 그룹(CM2SP-194~199·209·210)+「항상 같은 집합」(125). 팩에 규칙 없어 정당.
   검수 채팅이 「명제·조건 판단」 규칙 추가할지 회신 예정 — 오면 SP_CM2SP에 넣어 재반영.
2. **다음 팩 큐(pack_gap 순)**: **FN 216**(재료 이미 발송) → BG 193 → M2I 181(+M1I 묶기) → …
3. **PSS/PSC 세분화**: D-PS-05 64%·D-PS-09 61% 삭제 아니라 이산/정규/이항으로 쪼갬(항목 적은 단원 60% 상한 금지).
4. **공통 60% 상한**: 중영역 제거 후 QE C-11 90%·EQ C-11 63% 등 8행 잔존. AELF·CMM에서 억제 규칙 0이라 미구현 — 도입 시 QE/EQ부터.
5. **정확도 검증(배포 게이트)**: 지금까지 전부 적중률·커버리지지 예측 축 정확도 아님. 근거 AELF 30문항 88% 하나. 팩 완료 후 단원별 대표 5~10문항 재측정 필요.
6. **검수 채팅 마스터 명세서** v4 갱신은 그쪽 작업(리포 문서는 매 라운드 최신).

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

## 7. 손대지 말 것

- `index.v1.json`·진단 워커·옛 12분할: 전 단원 저장·정리 끝나고 한 번에 교체(§9). 지금 진단은 옛 체계.
- `public/`는 GitHub Pages 서빙 — 학생 데이터·PII 금지(분류·툴은 무방).
- predicted_axes와 observed_axes를 같은 필드에 저장 금지.
- 규칙 파일 재직렬화 금지(§3).

## 8. 새 세션 시작 체크

```powershell
cd C:\Users\user\Desktop\scshstudy
git log --oneline -1                                  # ea9718a7 이상
(gci tools\axis_prediction\axis_rules.v*.json).Count  # v1~v10 = 9개(v5 없음)
tools\mathflat_builder\Run-AxisPrediction.ps1 -Only AELF   # 353·96·76·20·92·1 확인
```
검수 채팅이 **다음 팩(FN 등) 블록**을 주면 §1 절차로. **정리/규칙 질문**은 이 문서 + README + HANDOFF 참조.
