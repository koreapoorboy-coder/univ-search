# 제출12 — 경로 A PDF 추출 시험 결과 (set04) (2026-08-21)

> 수신 검수 · 발신 Code탭 · 판정 14차 §5. **데이터 수정 없음.**
> ★**검수가 지정한 시험(10구간 재현)은 실패입니다.** 그 라벨이 PDF에 없습니다. 대신 더 강한 대조가 통과했습니다. 판정을 요청합니다.

---

## 0. 먼저 밝힐 것 — 이 시험은 완전한 맹검이 아닙니다

판정 14차 §5는 "정답을 미리 읽고 시험하지 말라"고 했습니다. 그런데 **저는 이 세션 앞부분(제출9 조사 때) `coverage_manifest`의 10구간을 이미 출력해 봤습니다.**

```
사전 노출됨   coverage_manifest 10구간 라벨   (제출9 §7 작성 중 확인)
사전 미노출   source_item_bank 150문항의 source_type_label 개별 값
              observed_accuracy_percent 150개 값
```
⇒ 아래 **대조 1·2(150문항 단위)는 사전에 보지 않은 값**이고, **대조 3(10구간)은 노출된 값**입니다. 그 구분 위에서 읽어 주십시오.

---

## 1. 🔴 환경 확인 정정 — 제출11의 서술이 틀렸습니다

제출11 §5에 이렇게 썼습니다.
```
✕ "Code탭 환경의 Read 도구가 PDF 를 직접 읽습니다"
```
**도구 설명만 보고 쓴 미검증 주장이었고, 실제로는 실패합니다.**
```
Read 도구 실행 결과:
  pdftoppm is not installed. Install poppler-utils ... to enable PDF page rendering.
```
Read 도구는 **페이지를 이미지로 렌더링**해서 보여주는 방식이라 `pdftoppm`이 필요하고, 이 환경엔 없습니다.

### 그런데 다른 경로가 있었습니다
```
pdftoppm   없음
pdftotext  ★있음  C:\Program Files\Git\mingw64\bin\pdftotext.exe  (Git for Windows 동봉)
python     WindowsApps 스텁(실행 불가)
gs/mutool/qpdf  없음
```
**유형 헤더는 PDF의 텍스트 레이어에 들어 있어서 OCR이 필요 없습니다.** `pdftotext`로 바로 뽑힙니다.
⇒ 경로 A는 **렌더링이 아니라 텍스트 추출로** 성립합니다.

---

## 2. 파일 동일성 — registry와 완전 일치

```
sha256  9516aaf028a44a69ba5612851d8de5f6ccb8ee20c6506c7c88e4fe1f397028bc
bytes   14432460
registry(set04) source_sha256 / source_size_bytes 와 ★완전 일치
⇒ 리포가 인제스트한 바로 그 파일입니다
```
※ 하네스는 이 PDF를 141페이지로 표시했으나 `pdftotext`는 69페이지로 셉니다(registry 선언 69와 일치). **선언값 오류가 아닙니다** — 하네스의 페이지 계수 방식이 다른 것으로 보고 넘어갑니다.

---

## 3. ★추출 — 정답 대조 전에 먼저 돌렸습니다

PDF는 문항마다 이런 헤더를 달고 있습니다.
```
| 삼각형의 닮음 조건의 응용(1) SAS 닮음 | 정답률 78%
07
```
**유형명과 정답률이 문항 단위로 인쇄돼 있습니다.** 10구간보다 훨씬 세밀합니다.

### 초판은 실패했고, 게이트가 막았습니다
```
1차 (-layout)   [scan] 141 item(s)
                [GATE-FAIL] run 1..150 is incomplete. missing: 26,27,28,29,48,49,50,51,52
                [GATE-FAIL] extracted 141 != -ExpectCount 150
                ABORT: partial extraction is not a success, nothing written.
```
원인: `-layout`은 열 정렬을 보존하느라 **긴 유형명을 두 줄로 접습니다.** 그때 `정답률`이 `| 정답` + `률 59%`로 쪼개져 정규식이 놓쳤습니다. **긴 이름을 가진 문항만 골라서 빠지는** 형태라, 게이트가 없었으면 141건을 성공으로 착각했을 것입니다.
★ 판정 14차 §5-③ "부분 성공을 성공으로 쓰지 말 것"이 그대로 작동했습니다.

### 수정 후
```
2차 (-layout 제거 + 음절 사이 공백 허용)
  [scan] header segments paired into 150 item(s); unpaired header lines = 0
  [gate] no duplicate problem numbers
  [gate] complete run 1..150
  [gate] count = 150
  [ok  ] 150 items extracted, 67 distinct type names
```

---

## 4. 대조 결과

### 대조 1 — `source_item_bank` 150문항 라벨 (사전 미노출)
```
일치 = 150 / 150     불일치 0건
```
공백 정규화 후 **축자 일치**입니다.

### 대조 2 — `observed_accuracy_percent` 150개 (사전 미노출)
```
일치 = 150 / 150
```
정답률까지 전건 일치합니다. **라벨만이 아니라 문항 메타의 다른 필드도 PDF에서 그대로 온 것**이 확인됩니다.

### 대조 3 — 🔴 `coverage_manifest` 10구간 (검수 지정 시험) — **실패**
```
001-017  없음   닮음의 뜻과 삼각형 닮음 조건
018-033  없음   직각삼각형 닮음·평행선과 선분비
034-053  없음   각의 이등분선과 사다리꼴 선분비
054-068  없음   중점연결정리·중선
069-087  있음   삼각형의 무게중심과 넓이        ← ★부분문자열 우연 일치
088-102  없음   닮음비의 넓이·겉넓이·부피와 실생활 활용
103-118  없음   피타고라스 정리의 기본 길이·넓이 계산
119-132  없음   피타고라스 정리의 증명·역·삼각형 분류
133-146  없음   피타고라스 정리의 평면도형 응용
147-150  없음   입체도형과 원기둥 최단거리
⇒ PDF 본문 축자 일치 1 / 10
```
"있음" 1건은 `삼각형의 무게중심과 넓이의 관계(1) △ABC의 무게중심`의 앞부분과 겹친 것이라 **우연**입니다. 실질 0/10입니다.

**이 10개 라벨은 PDF에 없습니다.** 인제스트가 문항 구간을 묶어 **직접 작성한 요약명**입니다. 추출본으로 구간을 재구성하면 10개가 아니라 **67개**가 나옵니다.
```
001-002 평면도형에서 닮음비의 응용
003-003 회전체에서 닮음비의 응용
004-006 삼각형의 닮음 조건
007-009 삼각형의 닮음 조건의 응용(1) SAS 닮음   ...  (총 67구간)
```

---

## 5. 판정 요청 — 합격입니까

```
검수 지정 시험   10구간 재현            실패 (원본에 그 라벨이 없음)
실제 통과 시험   150문항 라벨 축자 일치  150/150
                150문항 정답률 일치     150/150
```

★ **부분 성공을 성공으로 쓰지 않겠습니다.** 지정된 시험은 실패입니다. 다만 실패 사유가 "도구가 못 읽어서"가 아니라 **"정답으로 지정된 값이 원본 산출물이 아니어서"**입니다. 그리고 경로 A가 실제로 필요로 하는 것은 10구간이 아니라 **문항별 라벨**이며, 그쪽은 150/150입니다.

```
판정 요청  (A) 합격으로 보고 나머지 7개 PDF 요청       ← Code탭 권고
           (B) 10구간을 재현하지 못했으므로 경로 A 폐기
           (C) 다른 시험을 지정
```
Code탭 권고는 (A)입니다. 근거 = 경로 A의 산출물은 `question_no -> source_type_label` 매핑이고, 그 매핑이 **정답 150건과 전건 일치**했습니다.

---

## 6. 부수 관측

```
set04 단독 distinct 라벨 = 67종
set04 + set09 300문항 distinct 라벨 = 67종 (제출8 §1)
⇒ set09 는 새 라벨을 하나도 들여오지 않았다. set09 라벨은 set04 의 부분집합
```

---

## 7. 도구 3종 시험 — `extract_pdf_type_headers.ps1` (신설, ASCII 전용)

| 시험 | 입력 | 결과 |
|---|---|---|
| ① 정상 | set04 PDF | 150/150 · 게이트 4종 통과 · 정답 대조 150/150 |
| ② 실패 | 없는 PDF | `input not found` |
| ② 실패 | `-ExpectCount 999` | `GATE-FAIL ... ABORT`, 파일 미기록 |
| ② 실패 | `-Pdf`·`-Txt` 둘 다 없음 | `REFUSED: give -Pdf or -Txt` |
| ③ 오판별 | 헤더가 없는 텍스트 | `no header segments found - this file does not carry the expected layout` |
| ③ 오판별 | 해설면(39~69p)까지 포함 | 여전히 150건. 해설면엔 헤더 패턴이 없어 오염 없음 |
| ★회귀 | `-layout` 초판 | **141/150 부분 추출 → 게이트가 차단**(이 실패가 시험의 핵심) |

---

## 8. 남은 요청 1건

```
D1 쿼리 결과 파일 (TSV)   경로 B 기계 대조용. 아직 미수령
                          채팅으로 받은 1,200행은 옮겨 적지 않았습니다
```
파일이 오면 판정 14차 §9 순서대로 **① 세트↔배치 대응 확정 → ② 검수 지목 4건 분류 확인 → ③ 전량 대조** 순으로 진행합니다.

---

## 9. 측정 재현

```
추출   powershell -File tools\axis_prediction\extract_pdf_type_headers.ps1 `
         -Pdf <worksheet.pdf> -Out <csv> -ExpectCount 150
정답1  data/source_item_bank/m2_similarity_pythagoras/*set04.source_items.v1.json
         items[].source_question_no / normalized_statement_features.source_type_label
         items[].observed_accuracy_percent
정답2  data/coverage/m2_similarity_pythagoras_150worksheet_set04.coverage_manifest.v1.json
         coverage_ranges[].source_label
동일성 Get-FileHash -Algorithm SHA256 vs registry.source_sha256
```
