# Major Category Weight Validation

- runtime: `assessment-seed-cross-axis-v2.1.0-major-category-weighted`
- thin-category threshold: `10`
- candidate policy: subject pool is never reduced by major/category
- medical policy: medical and health remain one `medical` category

| subject | category | subject pool | category matches | fallback | effective pool |
|---|---:|---:|---:|---:|---:|
| 화학 | engineering | 188 | 175 | NO | 188 |
| 화학 | natural | 188 | 181 | NO | 188 |
| 화학 | medical | 188 | 115 | NO | 188 |
| 생명과학 | medical | 180 | 148 | NO | 180 |
| 지구시스템과학 | medical | 25 | 3 | YES | 25 |
| 기하 | medical | 34 | 10 | NO | 34 |

- Unicode filename decode: PASS
- Overall: PASS
