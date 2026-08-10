# 팽창(pt.error_tags) 재측정 — fine 태그가 완화하는가 (2026-08-10)

> `ISSUE_pt_error_tags_attribution` 검증. 방법 (b) 엔진 통제 시뮬레이션(debug.html). 표본 부족(D1 1건)이라 실데이터 대신 **QF 46개 PT 통제 진단**. 변수 통제라 오히려 깨끗함.

## 측정 설계 (검수 3질문 답)
### 1) 무엇을 비교
같은 PT·같은 단일 오답, **observed_error_tags만 토글**:
- **C0**: `observed_error_tags = []` (fine 없음 → pt.error_tags만 활성)
- **C1**: `observed_error_tags = [그 PT의 실제 fine 오버레이 태그]`
- QF 46개 PT 각각 실행(coarse pt.error_tags·fine 오버레이 둘 다 있는 PT).

### 2) 지표
- **observed_axes 개수**(축층 = B저장소·취약축 파이프라인이 소비하는 층)
- **tag_stats 개수**(coarse 태그층)
- **triggered_rules 개수**
- **coarse가 fineTagToAxis에 있는 비율**(coarse가 축에 새는 구조적 누수)

### 3) 완화 판정 기준 (사전 정의)
축 파이프라인 기준 "완화(무력화)"로 본다 ⇔ **coarse의 축 누수 <5%** AND **C0 축층이 비어있음**(coarse만으로 거짓 축 안 뜸) AND **C1 축이 bounded**(fine 태그 축 수 이내, 폭발 없음).

## 결과 (QF 46 PT)
| 지표 | C0 (fine 없음) | C1 (fine 있음) |
|---|---|---|
| coarse가 축맵에 있는 비율 | **0.0%** (138 coarse 태그 중 0) | — |
| observed_axes 뜨는 PT | **0 / 46** | 46/46, 평균 **2.65**축(최대 9) |
| tag_stats 평균 | 3.37 | 7.22 |
| triggered_rules 평균 | 0.11 | 0.11 (불변) |

## 해석 — 팽창과 fine은 **서로소인 별개 층**
엔진 메커니즘(`math_weakness_engine.js` 529–554):
- `tagStats`(530): 오답 시 `_tagsFor`(pt.error_tags ∪ observed ∪ instruction)의 **모든 태그**가 wrong 크레딧. → **pt.error_tags 팽창은 여기 있음**(오답 1건이 coarse 3.37개 태그에 크레딧).
- `observed_axes`(531): `fineTagToAxis[t]` 있는 태그만 축 기여. **coarse는 fine어휘에 0%** → coarse는 축을 **하나도** 못 만듦.
- `triggered_rules`(548): coarse 어휘로 발화. fine 무관(0.11 불변).
- concepts: concept_ids만(태그 무관).

⇒ **팽창(coarse)은 tag_stats·triggered_rules(구식 coarse층)에 갇혀 있고, 축층(observed_axes)엔 못 들어온다.** fine은 축층을 정밀 채움. 둘의 어휘가 서로소(0% 겹침)라 구조적으로 격리됨.

## 판정 — 축 파이프라인 기준 **완화(무력화) 확정**
사전 기준 3개 모두 충족:
- coarse 축 누수 **0%** (<5%) ✅
- C0 축층 **0/46 비어있음**(coarse만으론 거짓 축 0) ✅
- C1 **bounded**(평균 2.65 = fine 태그의 축들, 폭발 없음) ✅

**검수 가설 정정·정밀화**: "fine이 팽창을 줄인다"는 tag_stats 기준으론 **틀림**(fine은 합집합이라 3.37→7.22로 오히려 늘어남). 그러나 **B 저장소·취약축 진단이 읽는 층은 observed_axes**이고, 그 층은 coarse 팽창에 **원천적으로 노출된 적이 없다**(어휘 서로소·0 누수). ⇒ 걱정한 "학생이 안 낸 신호가 축 진단에 들어가는" 일은 **축층에선 발생 불가**. 완화가 아니라 **애초에 격리**.

## 잔여(축층 밖)
- **tag_stats·triggered_rules(coarse층)**의 팽창은 **그대로 남음**(오답1→coarse 3.37 크레딧). 이 층을 소비하는 것 = 구식 렌더러·규칙 표시. `ISSUE_pt_error_tags_attribution`는 **이 층에 한해** 유효.
- 단 triggered_rules는 단일 오답 격리 시 거의 안 뜸(0.11) — 다PT 누적서야 임계 도달(과거 "8개 동시 발화"는 다PT 상황).
- concepts는 태그 무관이라 팽창 영향 없음.

## 함의 (권고)
- **관측축 파이프라인(B)**: 팽창 무관하게 안전. 그대로 진행.
- **coarse층 팽창**: 없애려면 fine이 아니라 **pt.error_tags 자체를 축소/비움**해야(합집합이라 fine 추가로는 안 줄음). 구식 tag_stats/rules 표시를 쓰는 곳이 있으면 그때 대응. 지금 급하지 않음(축·concept 안전).
- 표본 쌓이면(전환기준 진행) 실데이터로 재확인 가능하나, 통제 결과가 구조적 결론이라 값 바뀔 여지 적음.
