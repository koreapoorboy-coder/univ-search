# qnorm.v1 canonical 확정 — 결정 문서 (검수 대조용) 2026-08-14

> 매칭 빌드 첫 태스크. 정규화 정본 1벌 확정 → 워커 매처·backfill·클라 도구가 공유(드리프트=오매칭 위배 방지).
> ★검수 확인 전 live 도구·워커 변경·backfill 금지. 정본 오판 시 backfill 해시 전부 오염.

## 1. 정본 결정 = ocr_measure.html `norm` (NFKC형)

[코드확인] 리포에 정규화 구현 **3벌**이 있고 **서로 다름**:

| 출처 | 규칙 | `x²` 결과 | `x^2` 결과 | NFKC |
|---|---|---|---|---|
| **ocr_measure.html `norm`** (L60-63) | NFKC → \s제거 → **^제거** → [×·]→* → [−–]→- → [.,·、。]제거 → lower | `x2` | `x2` | ✅ |
| match_lab.html `normText` (L67-74) | **²→^2 수동** → [×·]→* → [−–]→- → [.,·、。]제거 → \s제거 → lower | `x^2` | `x^2` | ❌ |
| 임계값실험 perl (문서) | ²→^2, ³→^3 … → 기호통일 → 문장부호제거 → \s제거 → lower | `x^2` | `x^2` | ❌ |

**정본 = ocr_measure.html `norm`.** 근거:
1. **0.99 게이트를 실측한 도구** — `B_match_threshold_experiment.v1.md` §PDF실측 프로토콜 "절차: ocr_measure ?fresh=1 …", §확정 "10문항 재측정 … 1.0000". 검증된 라이브 동작이 곧 이것.
2. **검수 실측과 정합** — cm³=cm^3=1.0000(8/14 도형). NFKC가 ³→3, ^제거로 `cm3` 통일.
3. **근거3 spec과 일치** — `B_user_items_field_requirements.v1.md` 근거3 "NFKC → 공백제거 → ^제거 → …".
4. **NFKC가 더 견고** — match_lab 수동맵은 `²³¹⁴⁵`만 처리, `⁶⁷⁸⁹⁰ⁿ`·전각숫자·분수·합자 누락. NFKC는 전 호환분해 처리.

→ **match_lab `normText`·perl(문서)은 드리프트본.** 정본(NFKC)에 맞춤. "문서를 코드에 맞춘다"(검수) = 이 라이브 도구를 정본으로.

## 2. 제안 canonical qnorm.v1 (정본 그대로)

```js
// qnorm.v1 — canonical. ocr_measure.html norm(L60-63)과 byte-identical. 변경 시 버전 올림(qnorm.v2).
function qnormV1(s){
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/\^/g, '')
    .replace(/[×·]/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/[.,·、。]/g, '')
    .toLowerCase();
}
```
- 버전 문자열 `qnorm.v1` = `dedup_key_norm_version`에 각인.
- ★규칙 순서 고정: NFKC 먼저(상첨자·전각 분해) → \s → ^ → 기호 → 문장부호 → lower. 순서 바꾸면 출력 달라질 수 있음(예: NFKC 전에 ^제거하면 무의미).

## 3. 테스트 벡터 (검수 지정 + 보강 — 정본/드리프트 갈림 고정)

| 입력 A | 입력 B | qnorm.v1(정본) A=B? | match_lab normText A=B? | 비고 |
|---|---|---|---|---|
| `2 cm³` | `2 cm^3` | `2cm3` = `2cm3` ✅ | `2cm^3`=`2cm^3`✅(형만 다름) | 검수 실측 |
| `x²+1` | `x^2+1` | `x2+1`=`x2+1` ✅ | `x^2+1`=`x^2+1`✅ | 지수 |
| `a  b\tc` | `abc` | `abc`=`abc` ✅ | 동일 ✅ | 공백 |
| `1, 2. 3` | `123` | `123`=`123` ✅ | 동일 ✅ | 문장부호 |
| `3×4` | `3*4` | `3*4`=`3*4` ✅ | 동일 ✅ | 기호통일 |
| `x⁶` | `x6` | `x6`=`x6` ✅ | **`x^6`≠`x6` ❌** | ★NFKC만 처리(match_lab 누락) |

★마지막 행 = 정본(NFKC)과 match_lab이 **갈리는 결정적 케이스**. canonical 채택 시 `x⁶`도 `x6`으로 흡수.

## 4. 아키텍처 질의 (검수 결정 요망) — "사본 만들지 말 것"의 현실 제약

검수 요건 5 "워커·클라가 같은 canonical 참조·사본 금지". 그러나:
- **워커는 단일파일 paste-deploy**(Cloudflare 대시보드 붙여넣기) → `import`/`<script src>` 불가 → 함수 **인라인 불가피**.
- 클라 도구(ocr_measure·match_lab·admin)는 브라우저 → `<script src>` 로 공유 가능.

**제안(현실적 등가물)**: *literal 단일 런타임*은 불가하나, *단일 정의원 + 강제 검증*으로 드리프트 차단:
1. `public/math-weakness-engine/js/qnorm.v1.js` — canonical 1벌(브라우저 global `window.qnormV1` + 테스트벡터 self-check).
2. 클라 도구 3종 → 인라인 norm 삭제, `<script src="js/qnorm.v1.js">` 참조(진짜 무사본).
3. 워커 → 인라인 사본 1개(불가피) + 주석 `// MUST match js/qnorm.v1.js @ qnorm.v1` + **동일 테스트벡터를 워커 기동/헬스에서 실행**(불일치 시 경보). = 사본이되 검증강제로 드리프트 불가.
4. 테스트벡터(§3)를 별도 `qnorm.testvec.json`으로 두어 양쪽이 같은 벡터로 self-check.

→ ★검수 결정: (a) 이 "단일정의+검증강제" 채택? (b) 아니면 워커 인라인도 허용범위로 보고 벡터검증만? (c) 다른 형태?

## 5. 이후 배선·backfill 계획 (정본·아키텍처 확정 후)
1. `qnorm.v1.js` 생성 + 테스트벡터 통과.
2. match_lab `normText`·ocr_measure `norm` → canonical 참조로 교체(ocr_measure는 이미 정본이라 동작불변, match_lab은 동작변경=드리프트 해소).
3. 워커에 qnorm.v1 인라인 + content_hash/dedup_key 계산(SHA256=`crypto.subtle.digest`) — **/add-bulk·매칭·backfill 공유**.
4. **백로그11 backfill**: 기존 2행 + 테스트 34633203 = **3행**. content_hash/dedup_key/dedup_key_norm_version 채움. UNIQUE 위반 시 실패 말고 목록보고.
5. 해시 구성(정본, `user_items.schema.v3.1.sql` 상단): `content_hash=sha256(qnorm(question_text)|unit_id|problem_type_id|answer|explanation|difficulty)` · `dedup_key=qnorm(question_text)|unit_id`.

## 6. ★ 확정 (검수 승인 2026-08-14) + 정제 4건
- **정본 = ocr_measure `norm`(NFKC형) 승인.** 근거(1) 결정적: 0.99를 실측한 도구 = 이것, 다른 구현 정본삼으면 0.99 무효.
- **아키텍처 = (a) 단일정의 + 검증강제 승인.** 워커 인라인 불가피 인정.
- **★정제① self-check 위치 변경** — /health가 아니라 **해시 계산경로에서 실행**. content_hash·dedup_key 계산 직전 벡터 self-check → 불일치 시 **계산 중단·에러 반환(저장 금지)**. 경보 아닌 **차단**(차단2·게이트 원칙: 틀린 값 저장하느니 안 함). 인스턴스당 1회 캐시(6+벡터라 무시가능). ★/health엔 `qnorm_selfcheck:"pass"|"fail"` 필드 별도 유지(운영 표시). **차단=계산경로, 표시=/health, 둘 다.**
- **★정제② 벡터 보강** — §3에 7(전각 `ＡＢＣ１２３`→`abc123`)·8(빈값 `null`/`''`→`''`) 추가(qnorm.v1.js 반영 완료). ★**빈 본문은 해시 계산 자체 금지**(qnorm이 ''이면 null 유지) — 빈문자열 해시 다행 UNIQUE 충돌 방지. §5 구현 규칙에 포함.
- **★정제③ backfill 체크포인트** — §5-4(3행 backfill) 실행 **전** 검수 확인. 3행 SELECT 결과 보고 → 검수 확인 후 진행. 눈검증 가능한 마지막 규모.
- **★정제④ match_lab 이전/이후** — 교체는 동작변경(`x^2`→`x2`). 그 도구 과거 측정값은 재현 안 됨. "match_lab 결과는 qnorm.v1 이전/이후 구분" 명기(파일 주석 반영 완료).

## 7. 구현 진행 (§5 순서)
- ✅ **Step1** `js/qnorm.v1.js` 생성 — CANONICAL CORE 블록(워커 인라인용)+브라우저 글루+로드시 self-check. 벡터 11건(정제② 반영).
- ✅ **Step2** 클라 배선 — `ocr_measure.html`(정본이라 동작불변)·`match_lab.html`(드리프트 해소·동작변경 주석) → `<script src="js/qnorm.v1.js">` + `norm/normText`를 `qnormV1` 참조.
- ⏳ **Step3** 워커 — qnormV1 CORE 인라인 + hash 헬퍼(`crypto.subtle` SHA-256) + **계산경로 self-check 차단** + /health `qnorm_selfcheck` + backfill 엔드포인트(`WHERE content_hash IS NULL OR dedup_key_norm_version != 'qnorm.v1'`, UNIQUE위반 목록보고, 빈본문 skip). ★단건 /add는 해시 미계산 유지(검수 §5는 add-bulk·매칭·backfill 공유 — 단건 제외). 배포 게이트: 스키마 라이브 후(이미 완료).
- ⏳ **Step4** backfill 3행(기존2+테스트34633203) — ★실행 전 검수 확인(정제③). 3행 SELECT 보고.
- ⏳ 이후 bulk spec v2 → /add-bulk → 매칭.
