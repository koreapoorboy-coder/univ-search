# Code 탭 인계문 — 수학 약점진단 엔진 (MathFlat 45단원)

> 새 채팅(Code Claude)이 이 문서 하나로 이어받는다. 리포 루트 `C:\Users\user\Desktop\scshstudy`.
> 작성 시점 HEAD: `6e873f80` · 저장 단원 45/45 완료.
> 이 문서 + 리포만 있으면 데이터 받는 즉시 진행 가능하게 만들어졌다.

---

## 0. 새 세션 시작하는 법

새 채팅에서 이 파일부터 읽고, 아래를 확인한 뒤 시작한다.

```powershell
cd C:\Users\user\Desktop\scshstudy
git log --oneline -1
(Get-ChildItem public\math-weakness-engine\data\raw_taxonomy -Filter *.mathflat.v1.json | Where-Object {$_.Name -notlike '_pilot*'}).Count   # 45 기대
```

사용자가 **새 단원 xlsx를 주면** → §4 절차로 저장.
**규칙 v2(axis) / v4 스크립트를 주면** → §7 참조.
**정리 작업을 요청하면** → §8.

환경: Windows, PowerShell 5.1(BOM 필수·인라인 if 표현식 불가), **Python 없음**, Git Bash 병용,
`pdftotext`(Git 포함본)만 있고 PDF 렌더러 없음. 스크래치패드는 세션마다 새로 생기니 임시파일만.

---

## 1. 프로젝트 개요

MathFlat 화면 스크린샷을 전사한 검수완료 엑셀을 **단원별로** 엔진에 저장해, 옛 "12분할"(problem_types 12,631개)
가짜 분류를 새 45단원 체계로 교체하는 작업. **진단 단위는 "유형 묶음"(중간 수준)**, ID는 `MPLAT.{학기}.{단원코드}.G{nnn}`,
항목은 `...G{nnn}.I{nn}`. 데이터는 저장만 됐고 **진단 로직·index.v1.json에는 아직 연결 안 함**(§9).

학기 코드: 중등 M1S1~M3S2, 고1 H1S1/H1S2, 고2 대수 **H2AL**, 미적분Ⅰ **H2CA1**, 미적분Ⅱ **H3CA2**,
확률과통계 **H2PS**(잠정), 기하 **H3GE**.

---

## 2. 현재 상태 — 45단원 저장 완료

`public/math-weakness-engine/data/raw_taxonomy/*.mathflat.v1.json` (45개, 전부 커밋됨).

| 과정 | 단원(코드) |
|---|---|
| 중1 | 소인수분해(PF)·정수와유리수(IR)·문자와식(LE)·좌표평면과그래프(CG)·기본도형과작도(BG)·평면도형의성질(PG)·입체도형의성질(SG)·자료정리와해석(DA) |
| 중2 | 수와식(NE)·방정식(EQ)·부등식(IN)·함수(FN)·도형의성질(GP)·도형의닮음(GS)·확률(PB) |
| 중3 | 실수와그계산(RC)·다항식곱셈인수분해(PF)·이차방정식(QE)·이차함수(QF)·삼각비(TR)·원의성질(CP)·통계(ST) |
| 고1 공통1 | 다항식(CMP)·방정식과부등식(CMEI)·경우의수(CMC)·행렬(CMM) |
| 고1 공통2 | 도형의방정식(CM2GE)·집합과명제(CM2SP)·함수와그래프(CM2FG) |
| 고2 대수 | 지수와로그(EL)·지수함수와로그함수(AELF)·삼각함수(ATF)·수열(ASQ) |
| 미적분Ⅰ | 함수의극한과연속(M1LC)·미분(M1D)·적분(M1I) |
| 미적분Ⅱ | 수열의극한(M2SL)·미분법(M2D)·적분법(M2I) |
| 확률과통계 | 경우의수(PSC)·확률(PSP)·통계(PSS) — 3개 대단원 |
| 기하 | 벡터(GEV)·공간도형과공간좌표(GES)·이차곡선(GEC) |

전 단원 id 11,102개 중복 0. 각 단원 개수검증(count_check·item_check·detail_type_name_check) 통과.

### 스키마 (한 파일 = 한 단원)
- 문서: `schema, version, semester, unit_id, unit_code, unit_name, chapter, status='raw_not_wired',
  problem_type_count, count_check, item_check, detail_type_check, legacy_audit, item_legacy_audit, problem_types[]`
- 유형(problem_type = 유형 묶음): `problem_type_id, source_group_id, semester, unit_id, 대영역, 중영역, type_name,
  topic_type_count(화면 배지·null이면 미표시), topic_type_actual, detail_type_count, detail_types_note,
  source_image, source_note(원문비고), concept_ids, error_tags(전부 null), prerequisite_ids(전부 빈), topic_types[]`
- 항목(topic_type = 주제유형): `item_id, source_code, no_in_group, name, review_status, source_note,
  detail_type_names_raw(세부유형층 신형식만·원문 문자열 그대로), concept_ids, legacy_*`

### 특수 케이스 (스키마 변형)
- **배지없음 단독 묶음**(경우의수 G031, 수열 G062, 삼각함수 G058, 지수함수 G052, 벡터 G045·G063 등):
  유형요약엔 있고 문항분류표 행 없음. `topic_type_count=null, topic_types=[]` → `item_check.unreadable_groups`.
- **배지없음+검증완료**(확률과통계 PSP/PSS/PSC 전 묶음): 배지 없지만 원본 대조로 행 유지 →
  `item_check.badge_less_verified_groups`.
- **group_only**(이차곡선 GEC): 스크린샷이 유형묶음 레벨에서 접혀 주제유형 이름 미수집. 46묶음+배지(183/727)만,
  `topic_depth='group_only'`, topic_types 전부 비움. **재캡처(펼침) 오면 46→183 채우면 됨.**
- **detail_type_names_raw**: 세부유형 이름을 원문 문자열로 저장(분리 안 함). EL은 쉼표 구분자(파이프 아님)라
  자동분할 불가 → §17-13 미결.

---

## 3. 빌드 툴체인 (`tools/mathflat_builder/`)

| 파일 | 역할 |
|---|---|
| `Read-Xlsx.ps1` | xlsx → TSV 덤프 (zip+XML, Python/Node 없이). `-Path <xlsx> [-ListSheets]` |
| `Build-Mathflat.ps1` | 덤프 → `*.mathflat.v1.json` 생성기. **열 이름으로 읽음**(위치 고정 아님). 개수검증·legacy 매칭 내장 |
| `units.ps1` | 45단원 설정 테이블(`$UNITS`). 재현 가능한 재빌드의 근거 |
| `Rebuild-All.ps1` | units.ps1 읽어 legacy 후보를 실측(기여도 기준)해 나은 쪽 자동선택 후 빌드. `-Only <CODE>` |
| `Run-AxisPrediction.ps1` | (교차검증용) 축 예측 규칙을 저장 JSON에 적용. 정본은 Python(§7) |

### ⚠ PowerShell 5.1 주의 (반복해서 물린 것)
- 스크립트는 매 실행 전 **UTF-8 BOM으로 재저장**해야 한글이 안 깨진다:
  `$t=Get-Content x.ps1 -Raw -Encoding UTF8; [IO.File]::WriteAllText('x.ps1',$t,(New-Object Text.UTF8Encoding($true)))`
- **인라인 if 표현식 금지**(`$x=@{k=(if(){}else{})}`, `$a = if(){@()}else{...}`): 빈 배열이 `{}`로 직렬화되거나
  `$_`가 오작동. 두 줄로 분리할 것.
- `$g:` 처럼 변수 뒤 콜론은 드라이브 참조로 파싱 → `${g}` 사용. 한글은 유효 식별자 → `${var}개` 필요.
- 파일 생성 시 native 인자에 큰따옴표 → `git commit -F <file>` 사용.

---

## 4. 새 단원 저장 절차 (사용자가 xlsx 주면)

이 순서를 항상 지킨다 — 과거에 구버전 파일·오독으로 여러 번 물렸다.

1. **파일 판별(verify-before-store)**: mtime + 사용자가 준 마커(예: "H22=xA+yB 소문자", "G058 배지없음")로
   구버전 아닌지 확인. `Read-Xlsx.ps1`로 덤프 → 헤더(문항분류표/유형요약 칼럼)·주제코드 범위·특수문자 확인.
2. **개수 검산**: 유형요약 묶음수 / 문항분류표 행수 / 세부유형 배지합 / COUNTIF 검증열. 사용자가 준 기대값과 대조.
   배지≠실제면 `KnownSourceMismatch`(accepted_source_errors)로 근거와 함께 수용. **원본이미지목록 합계로 검산 금지.**
3. **legacy 실측**: raw_taxonomy vs problem_types를 묶음 층에서 실측해 concept/error_tags 기여 높은 쪽 선택
   (Rebuild-All이 항목 층은 자동). 없으면 skip(concept null). **억지 연결 금지 — 근거 없으면 비움.**
4. `units.ps1`에 `$UNITS` 항목 추가 (§5 필드). BOM 재저장 후 `Rebuild-All.ps1 -Only <CODE>`.
5. **검증**: count_check.match / item_check.match / 전 단원 id 충돌 0 확인.
6. **회귀**: 기존 단원 하나 재빌드해 `git diff` 0바이트 확인(빌더 수정했을 때 필수).
7. `git commit -F <메시지파일>` (끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`), rebase 후 push.
   원격에 다른 작업 라인 커밋이 자주 올라오니 `git fetch; git rebase origin/main; git push`.

---

## 5. units.ps1 항목 필드

```
@{ code='TR'; out='m3_trigonometric_ratio'; id='M3_TRIG_RATIO'; name='삼각비'; ch='3-2 삼각비';
   dump='3-2_삼각비'; zip='...'; exp=38; sem='M3S2'; semn='중3 2학기';
   lg=(PT 'm3_trigonometric_ratio'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id';
   alt=(RT 'm3_trigonometric_ratio'); altArr='sections'
   known=@('G024'); knownNote='배지오류 근거...';   # 선택
   expNames=88;      # 세부유형 이름 있는 신형식(안내 시트 '표시 세부유형 이름 수' 총계)
   grouponly=$true;  # 이차곡선처럼 주제유형 미수집
   excl=@('...');    # source_exclusions
   codeNote='...' }  # PF 충돌 등
```
`RT n` = raw_taxonomy 경로, `PT n` = problem_types 경로 (units.ps1 상단 함수). `dump`는 scratchpad의 TSV 이름
(xlsx에서 Read-Xlsx로 재생성). Build-Mathflat 파라미터 전체는 스크립트 param 블록 참조.

---

## 6. 표준 규칙 (사용자가 반복 강조)

- 진단 단위 = 유형 묶음(중간 수준). 165개 세부수준 아님.
- 옛 12분할(raw_taxonomy/problem_types) **지우지 말고 나란히 유지**. prerequisite_ids 비움(선생님이 지정).
- error_tags 전부 미배정(null). legacy에서 참고만(legacy_error_tags_ref). 배정은 나중 별도 단계.
- 화면에 글자로 보이는 것만 입력. **안 보이면 지어내지 않고 null/빈칸**("모름"이지 "없음"이 아님).
- 이름 기반 매핑 금지 — group_id·source_code로 구분. 단원 내 이름 중복은 ambiguous_duplicate_name 가드가 상속 보류.
- 커밋은 요청 시. main 브랜치 직접 push 중(사용자 승인됨). LF→CRLF 경고는 무시 가능.

---

## 7. 유형 예측표 서브시스템 (`tools/axis_prediction/`)

> **팩 생산 라인이 활발히 도는 중 — 새 세션은 `tools/axis_prediction/PACK_HANDOFF.md` 부터 읽는다.**
> 매 라운드 절차·삽입 스니펫·팩 로스터·열린 항목이 그 문서에 전부 있다. 아래는 요약.

각 유형에 "여기서 잘 틀리는 진단축"을 규칙으로 예측(predicted_axes). 분류표와 별개, **predicted_ 전용**
(학생 실측 observed_와 절대 같은 필드 금지).

- `axis_rules.v15.json`: 규칙 447개(공통 15 + 단원팩 432: …·BF_BG 46·IN1_M1I 35·IN2_M2I 19). IN1_M1I 는 M1I+M2I 공용, CA2_M2D 는 M2D+M1D 공용, SP_CM2SP 37.
  v1~v14 는 기록용 보관(v5는 검수 채팅 내부번호). 스크립트는 v15 를 읽음. **커밋됨.**
  **파일전송 불안정** → 규칙 블록을 채팅 본문 JSON 으로 받아 텍스트 삽입(재직렬화 금지, 바이트 보존). `\\(`는 그대로.
  **PF 코드충돌**: unit_code=PF 두 단원은 팩키 `PF_M1S1`/`PF_M3S1` 로 갈라 호출(포팅은 `PF → PF_$학기` 매핑, 규칙 applies_to=["PF_M1S1"]).
- `build_axis_prediction.py`: 생성기 **v5**(행별 폴백 + 유형요약 방출·pack_gap + **중영역 제거**). **Python 필요.**
- 정본 = **안 A + 분업**: 공식 생성은 검수 채팅(Python/xlsx), **45단원 대량 실행 + git·저장은 Code 탭.**
  `Run-AxisPrediction.ps1` 이 **v5 를 저장JSON 에 포팅한 대량 실행기**. AELF 에서 Python v5 와
  완전 일치(총353·적중96%·팩76%·gap20%·이름단독92%·요약전용1) — 교차검증이 v1/v2 `detect_layout` 버그도 잡음.
  실행: `tools\mathflat_builder\Run-AxisPrediction.ps1 [-Only <CODE>]` → CSV(임시\axispred): name_source_dist·unmatched_all(학기열)·pack_gap_all(학기열)·rule_over60.

### 검수 채팅과의 현재 루프 상태 (진행 중)
- v1 규칙 45단원 실행 결과: 적중률 81%(9,028행). 미매칭 1,680건이 규칙 v2 재료.
- 확정된 것: PSP 27(인계문 28은 오기, **872**가 맞음). GEV 227→226은 `GEV-034`(G007) placeholder(주제유형명==묶음명).
  AELF 352/338/324(제 수치가 정답, 인계문 90%가 v2 버그 인공물). AELF-141 세부이름은 **저장본 완전**(xlsx 셀 표시 절단).
  EL은 **쉼표 구분자 실재**(§17-13 유효), AELF는 쉼표=문장부호(§17-13 무관).
- **name-only 적중률** 발견: 중영역이 컨텍스트에 들어가 EQ·IN 등 100%가 부풀음. 팩 우선순위는 적중률이 아니라
  이름단독 낮은 순(CMM 33·IR 35·PB 36·NE 38·CMP 41).
- **완료**: 규칙 v2 + 스크립트 v4 수령·반영·커밋(33c07c78). 45단원 대량 실행함(총9,028행·미매칭1,545·pack_gap6,410).
  M2D 검증: 406항목·적중100%·팩92%·gap7%·**과다규칙 0**(우려한 연속·미분가능·접선 넓은패턴 60% 안 넘김). CMM 61항목 이름 전량 추출 전달.
- **pack_gap = 팩 필요성 진짜 지표**(신규): 미매칭은 과다매칭을 못 봄. CMM 미매칭 2건인데 pack_gap 59건(46건이 C-10-only).
  팩 우선순위는 적중률 아니라 **이름단독 낮은 순**: CMM 33·IR 35·PB 36·NE 38·CMP 41(전부 팩 없음).
  팩 넓은규칙 점검: PSS D-PS-05 64%·PSC D-PS-09 61%(단원팩이 60%초과 — 변별력 재검토).
- **완료(v3/v5)**: 행렬 팩 MM_CMM 15개(CMM 0%→93%, 미매칭2 회수) + C-09 오탐 수정(최대공약수·최소공배수 91건→0) + **중영역 제거**.
  45단원 재실행: 미매칭 1545→1919(+374, 설계대로)·pack_gap 6410→6088·과다규칙 15→8행. **적중률 하락 = 중영역 제거 반영 확인.**
  AELF 353·96%·팩76%·gap20% 불변(중영역 영향 0). 회신 5건(rule_over60·pack_gap상위10·CMM100/93/7·미매칭prefix별·PF학기분리) 전달.
- **완료(v4)**: 소인수분해 팩 PF_M1S1 16개. PF_M1S1 149·적중100%·팩89%·gap11%(예측 일치). PF 팩키 분리 정상.
- **완료(v6)**: EI_CMEI 38 + SQ_ASQ 30. CMEI 540/적중539/팩87%/gap13%, ASQ 459/적중452/팩86%/gap13%.
- **완료(v7·v8)**: TF_ATF 32(ATF 385/384/팩99%/gap1%) + GE2_CM2GE 41(CM2GE 282/282/팩100%/**gap0**/과다없음, 첫 완전회수).
  불변식 유지. 전체 미매칭 →1658·pack_gap →4693. 팩 보유 15/46 unit-row. 전부 채팅 본문 패치(파일전송 불안정).
- **완료(v9)**: CA1_M1D 24 + CA2_M2D 를 M1D 공용 확장. M1D 289/적중289/팩100%/gap0%, **M2D 완전 불변**(applies_to 검증 통과). 팩 재사용 첫 사례(51% 공짜).
- **완료(v10)**: SP_CM2SP 35(집합과 명제). CM2SP 306/적중297/미매칭9/팩95%/gap2%. 미매칭9=기본 명제·조건 판단 그룹(팩 미포함). SQ_ASQ 재사용은 why 불일치로 기각.
  **팩 재사용 판정 = 커버율 아니라 발화 규칙 `why` 적합성**(README 반영). 불변식 8개 유지. 전체 미매칭 →1533·pack_gap →4239. 팩 17/46.
- **완료(v11)**: LF_FN 46(일차함수). FN 267/적중266/팩100%/gap0%/미매칭1(G030, 의도)/요약전용2. 재사용후보 GE2·CA1 0%·EI_CMEI 9%(이차 why) 전부 기각→신규. 불변식 유지. 전체 미매칭 →1483·pack_gap →4023. 팩 18/46.
- **버전 주의**: 검수 채팅 계획은 v11=CM2SP(D-SP-36·37 추가)·v12=FN 이었으나 **D-SP-36·37 미수령**이라 FN 을 v11 로 먼저 반영. CM2SP 수정은 그 2규칙 오면 v12 로(SP_CM2SP §3 예외 수정).
- **완료(v12·v13)**: SP_CM2SP += D-SP-36·37(§3 예외) + BF_BG 46(기본도형과작도). BG 223/적중223/팩100%/gap0/미매칭0 예측 일치.
  ⚠ **CM2SP 예측 어긋남**: D-SP-36 패턴 `명제.{0,3}조건 판단`이 실제 이름(명제인지 판단·구분·참,거짓)에 안 걸려 미매칭 9→**8**(예측 0). D-SP-37만 CM2SP-125 회수. 검수 채팅 D-SP-36 수정 대기(오면 v14).
  불변식 유지. 전체 미매칭 →1452·pack_gap →3830. 팩 19/46.
- **완료(v14·v15)**: D-SP-36 패턴 교체(CM2SP 미매칭 8→0, 적중306, gap7 유지) + IN1_M1I 35(M1I·M2I 공용)·IN2_M2I 19(M2I). M1I·M2I 둘 다 100%/gap0.
  **IN1 단독→M2I 팩172(69%) 실측** = 적분 두 과목 공용 근거(미분팩은 0%). 불변식 유지(M2D 불변). 전체 미매칭 →1345·pack_gap →3492. 팩 21/46.
- **팩 재사용 2례**: CA2_M2D(M2D→M1D 51%, 공용확장) · IN1_M1I(M1I→M2I 69%, 처음부터 공용키). 둘 다 why 적합·타단원 0오발화 실측 후 채택.
- **대기**: 다음 팩 pack_gap 순 잔여. PSS/PSC 세분화, 공통 60% 상한 열림.
- **배포 게이트**: 팩 9개 신규 → 단원별 대표 5~10문항으로 **예측 축 정확도** 재측정 필요(§8-C). 지금 수치는 전부 적중률·커버리지지 정확도 아님.
- depth는 **행 속성**(단원 아님) — AELF 한 단원에 세부79·주제273 섞임. index 교체 때 group_only를 단원필드로 굳히지 말 것.

---

## 8. 남은 일

### 8-A. 데이터
- **이차곡선(GEC) 재캡처**: 주제유형 펼친 스크린샷으로 다시 뽑아 group_only→46/183 채우기(선택). 진단엔 지장 없음.
- **EL §17-13**: EL 세부유형 쉼표→파이프 변환을 GPT가 원본에서 해줘야 EL 세부층(현재 14 giant string) 사용 가능.
- **확통 원본 대조**: PSC·PSS는 원본 미대조(원문비고에 미결 기록). PSP만 대조 완료. zip 확보 시 확인.
- **벡터 G055·G057**: 배지<실제 미결(accepted, source_note에 기록). 원본 대조 시 64→66 될 수 있음.

### 8-B. 정리(진단 로직 교체 전) — 명세서 §3
- **PF 코드 충돌**: 소인수분해(M1S1)와 다항식곱셈(M3S1)이 둘 다 PF. id는 학기로 구분되나 코드만으로 찾으면 섞임.
  **학생 데이터 투입 전** 한쪽 변경.
- **`_pilot_h2_calculus1_differentiation...`**: ✅ **완료** — `raw_taxonomy/_archive/`로 이동(사유는 그 폴더 README).
  정본 M1D(79유형)로 대체된 시범추출본. 빌더 글롭(비재귀)이 하위폴더를 안 훑어 집계에서 빠짐.
- **index.v1.json 45단원 등록 + 진단 로직 새 체계 전환** — 핵심. depth는 행 속성 반영(§7).
  `observed_accuracy_percent`→`estimated_accuracy_percent`(GPT 시뮬값). 교체 직후 30문항 시험 재실행.
- **데이터 형태 3종**(index 설계 시 수용): ① 유형+주제유형 이름/세부는 배지만(기하·미적분) ② 세부이름 있고 배지없음
  (확통 §16 예외) ③ group_only(이차곡선).

### 8-C. 축 예측 정확도
- 44단원 정확도 미검증(AELF만 민서 30문항 88%였으나 v3 폴백으로 재측정 대기). 배포 전 단원별 대표문항 대조 필요.

---

## 9. 절대 건드리지 말 것

- **`index.v1.json`·진단 워커(worker_skeleton)·옛 12분할 경로**: 전 단원 저장·정리 끝나고 **한 번에** 교체.
  지금 진단은 여전히 옛 체계로 돈다.
- **`public/`는 GitHub Pages 서빙**: 학생 데이터·명단·harness 절대 넣지 말 것. 학생 ID는 불투명/랜덤, 개인정보 파생 금지.
  (분류 데이터·툴은 무방 — 이미 raw_taxonomy·tools에 있음)
- **API 키**: 사용자 User 환경변수(ANTHROPIC_API_KEY). 채팅에 붙여넣지 말 것. 코드에서 읽되 디스크에 안 씀.
- predicted_axes와 observed_axes를 같은 필드에 저장 금지.

---

## 10. 파일 지도

```
public/math-weakness-engine/
  data/raw_taxonomy/*.mathflat.v1.json     45단원 (신 체계, 저장 완료)
  data/raw_taxonomy/*.raw_taxonomy.v1.json  옛 12분할 (legacy, 유지)
  data/problem_types/*.problem_types.v1.json 옛 problem_types (legacy)
  data/index.v1.json                        옛 체계 인덱스 (아직 신 체계 미반영)
  worker_skeleton/math_diagnosis_worker.js  진단 워커 (아직 옛 경로)
tools/
  mathflat_builder/   Read-Xlsx·Build-Mathflat·units·Rebuild-All (+axis 포팅)
  axis_prediction/    axis_rules.v1.json · build_axis_prediction.py(v3) · README
  classification_probe/  분류 정확도 시험 harness (격리)
  HANDOFF.md          ← 이 문서
```

새 세션은 이 문서 §0으로 시작. 사용자가 무엇을 주든(단원 xlsx / 규칙 / 정리 요청) 해당 절로 바로 간다.
