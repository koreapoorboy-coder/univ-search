# 유형 예측표 (predicted_axes) — 규칙 + 생성 스크립트

45단원 분류표의 각 유형에 대해 「여기서 잘 틀리는 축」을 규칙으로 예측한다.
분류표(어디에 속하는가)와 별개이며, **predicted_ 전용** — 학생 실측(observed_)과
절대 같은 필드에 저장하지 않는다.

## 파일

| 파일 | 내용 |
|---|---|
| `axis_rules.v2.json` | 규칙 68개 (공통 15 C-* + 단원팩 53 D-*: EL_AELF 9·PS 10·GE 11·CA2_M2D 23) |
| `axis_rules.v1.json` | 이전 버전(45개). 기록용 보관 — 스크립트는 v2 를 읽는다 |
| `build_axis_prediction.py` | 생성 스크립트 **v4** — 행별 폴백(v3) + 유형요약 방출 + `pack_gap` |

**규칙과 스크립트는 항상 같이 커밋한다.** 스크립트만으로는 재생성이 불가하다.

### v4 변경
- `유형요약` 시트를 읽어 배지없음 묶음(문항분류표 행 없음)을 묶음 이름으로 1행 방출
  (45단원 156건). 없으면 정본 산출물이 엔진 데이터보다 커버리지가 낮아진다.
- **`pack_gap` 시트**: 걸렸으나 단원팩(D-)을 하나도 못 짚고 공통규칙(C-)만 걸린 항목.
  「미매칭」은 안 걸린 것만 보여 과다매칭을 놓친다 — 팩 필요성의 실제 지표는 이쪽이다.
  (CMM 은 미매칭 2건(3%)인데 pack_gap 59건(97%). 46건이 오직 C-10 하나.)

## 실행 (Python + openpyxl) — 정본

```bash
python build_axis_prediction.py <분류표.xlsx> <PREFIX> [출력.xlsx]
```

`axis_rules.v2.json` 은 스크립트와 같은 폴더에 둔다. 출력 시트: `predicted_axes`
· `unmatched` · `pack_gap` · `warnings` · `rule_freq` · `meta`.

## 정본 / 역할 (안 A + 분업)

- **예측표 공식 생성**: Python 스크립트(검수 채팅). 이 리포지토리의 정본이다.
- **저장·git·결과관리 + 45단원 대량 실행**: Code 탭.
- 이 환경(Code 탭)에는 python3 가 없다. `tools/mathflat_builder/Run-AxisPrediction.ps1`
  이 **v4 를 저장 JSON 에 포팅한 대량 실행기**다 — xlsx 를 매번 검수 채팅에 올리는 것이
  비현실적이라, 45단원 전량은 여기서 돌리고 검수 채팅은 표본으로 교차검증한다.
  두 구현은 **AELF 에서 총353·적중96%·팩76%·gap20%·이름단독92%·요약전용1 로 완전 일치**
  (v2 `detect_layout` 의 단원단위 층선택 버그도 이 교차검증이 잡았다).

  ```powershell
  # 45단원 전량 (또는 -Only M2D 로 한 단원)
  tools\mathflat_builder\Run-AxisPrediction.ps1
  ```

  출력 CSV(임시폴더\axispred): `name_source_dist` · `unmatched_all` · `pack_gap_all` · `rule_over60`.

## depth 는 행 속성이다 (중요)

한 단원 안에서 행마다 이름 출처가 섞인다 — 예: AELF 353행 중 세부유형 79 · 주제유형
273 · 유형묶음 1. 따라서 `depth` 를 **단원 단위 필드로 굳히지 말 것.**
`index.v1.json` 45단원 교체 시 이 점을 반영한다(단원 하나가 group_only 인 경우는
GEC 처럼 전 행이 유형묶음일 때뿐이다).

## 미결

- **규칙 v3 재료**: `pack_gap` 이 팩 필요성의 진짜 지표. CMM(팩 없음, 46건 C-10-only)·
  IR(이름단독 35%)·NE(38%) 등 팩 우선순위는 적중률이 아니라 이름단독 낮은 순.
- **팩 넓은 규칙 점검**: PSS(D-PS-05 64%)·PSC(D-PS-09 61%)는 단원팩 규칙이 60% 초과 —
  변별력 재검토 대상. CA2_M2D 는 과다규칙 0 (M2D gap 7%로 잘 짚음).
- 단원별 정확도 검증 (대표 문항 실제 오답축 대조) — 44단원 미검증
- 중영역을 매칭 컨텍스트에서 뺄지 — 폴백 후 기여 4%p, 정확도 재측정 후 확정
- CA2_M2D 확장(M1D·M1LC·M2SL·M2I) — 해당 단원 이름 목록 확인 후 (규칙 `note` 참조)
