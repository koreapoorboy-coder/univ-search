# Subject alias and dropdown validation

Validated against the Patch 1 runtime seed bank.

| UI selection | Lookup subject | Exact candidate count | Result |
|---|---|---:|---|
| 미적분1 | 미적분Ⅰ | 169 | PASS |
| 물리 | 물리학 | 102 | PASS |
| 융합과학 탐구 | 융합과학 탐구 | 278 | PASS |
| 과학과제 연구 | 과학과제 연구 | 170 | PASS |
| 데이터 과학 | 데이터 과학 | 149 | PASS |
| 화학 반응의 세계 | 화학 반응의 세계 | 147 | PASS |
| 인공지능 기초 | 인공지능 기초 | 58 | PASS |
| 생물의 유전 | 생물의 유전 | 41 | PASS |
| 확률과 통계 | 확률과 통계 | 162 | PASS — spacing preserved |

Additional checks:

- `subject_alias.js` is the first script in `index.html`.
- Existing option values `미적분1` and `물리` remain unchanged.
- Six new dropdown options are present in static HTML, inline fallback catalog, and strict filter catalog.
- All explicitly named held/thin subjects remain in the dropdown.
- The requested notice text is present.
- Subject selection is logged locally and posted to the existing `/collect` endpoint.
- JavaScript syntax checks passed.
- Every script referenced by the patched `index.html` exists after overlaying the patch on the engine.
- Generic route expansion is blocked for seed lookup; `인공지능 기초` remains 58 exact candidates rather than expanding to generic `정보` candidates.
