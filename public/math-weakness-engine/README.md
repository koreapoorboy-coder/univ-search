[README.md](https://github.com/user-attachments/files/29625904/README.md)
# 수학 취약유형 진단 엔진 v0.1

## 적용 위치
이 폴더를 GitHub 저장소의 `public/math-weakness-engine/` 경로에 그대로 업로드합니다.

업로드 후 GitHub Pages 또는 정적 호스팅에서 다음 경로로 확인합니다.

`/math-weakness-engine/`

## 이번 패치 범위
- 단원: 중1 수학 `정수와 유리수`
- 원천 이미지: 114개 보존
- 개념 노드: 30개
- 문항 유형: 47개
- 개념 연결 edge: 41개
- 진단 규칙: 7개
- 보강 매핑: 10개

## 핵심 파일
| 파일 | 역할 |
|---|---|
| `data/math_concepts.v1.json` | 정수와 유리수 개념 노드 DB |
| `data/problem_types/m1_int_rational.problem_types.v1.json` | 문항 유형 분류 DB |
| `data/relations/m1_int_rational.edges.v1.json` | 개념 선행·후행 연결 DB |
| `data/rules/m1_int_rational.diagnosis_rules.v1.json` | 오답 패턴 진단 규칙 DB |
| `data/remediation/m1_int_rational.remediation_map.v1.json` | 보강 순서 추천 DB |
| `data/sources/m1_int_rational.source_manifest.v1.json` | 원천 이미지 파일 매니페스트 |
| `assets/math_weakness_engine.js` | 브라우저에서 실행되는 진단 로직 |
| `index.html` | 테스트 화면 |

## 학생 시험 데이터 입력 형식
```json
{
  "student_id": "S001",
  "student_grade": "중2",
  "test_name": "1학기 중간고사",
  "attempts": [
    {"question_no": 1, "problem_type_id": "M1_IR_PT024", "correct": false, "difficulty": "basic"},
    {"question_no": 2, "problem_type_id": "M1_IR_PT027", "correct": false, "difficulty": "core"}
  ]
}
```

## 다음 확장 순서
1. 중1 `문자와 식`
2. 중1 `일차방정식`
3. 중1 `좌표평면과 그래프`
4. 중2 `식의 계산`, `일차방정식`, `일차함수`

이 순서로 확장하면 중2 학생의 오답을 중1 취약 개념으로 역추적하는 기능이 안정화됩니다.
