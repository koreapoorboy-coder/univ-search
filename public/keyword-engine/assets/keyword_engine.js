
// v36 - Report Navigation Engine (Simplified Concept Version)

function generateReport() {
  return `
  <div class="report-container">

    <h2>추천 주제</h2>
    <p>N형 반도체와 공정이 성능에 미치는 영향</p>

    <div class="guide">이 보고서는 아래 순서대로 작성하면 완성됩니다.</div>

    ${section("도입",
      "왜 이 주제를 선택했는지",
      "교과 개념 → 궁금증 흐름으로 작성",
      "이번 탐구에서는 교과서 개념을 확장하는 과정에서 궁금증이 생겨 해당 주제를 선택하게 되었다.",
      "교과서에서 배운 반도체 개념이 실제 기술에 어떻게 적용되는지 궁금해져 탐구를 시작하였다.",
      "교과 개념 → 궁금증 → 주제 선택"
    )}

    ${section("본문1",
      "핵심 개념 설명",
      "정의 → 특징 → 의미 순서",
      "먼저 해당 개념은 ○○한 특징을 가지며 중요한 역할을 한다.",
      "반도체는 전기적 성질을 조절할 수 있는 물질로 다양한 기술에 활용된다.",
      "정의 → 특징 → 의미"
    )}

    ${section("본문2",
      "사례 연결",
      "실제 사례 1개 연결",
      "이러한 개념은 실제 ○○ 사례에서 활용된다.",
      "이 개념은 반도체 제조 공정에서 실제로 활용되며 성능 향상에 영향을 준다.",
      "개념 → 사례 → 결과"
    )}

    ${section("결론",
      "배운 점 + 진로 연결",
      "이해 + 진로 연결 포함",
      "이번 탐구를 통해 개념이 실제에 적용됨을 이해했다.",
      "이번 탐구를 통해 교과 개념이 산업과 연결된다는 점을 이해했고 진로와도 관련이 있다고 느꼈다.",
      "이해 → 적용 → 진로"
    )}

    <div class="check">
      ✔ 도입 ✔ 개념 ✔ 사례 ✔ 결론 → 작성 완료 시 보고서 완성
    </div>

  </div>
  `;
}

function section(title, task, tip, start, example, pattern){
  return `
    <div class="section">
      <h3>${title}</h3>
      <p><b>할 일:</b> ${task}</p>
      <p class="tip">TIP: ${tip}</p>
      <p><b>시작 문장:</b> ${start}</p>
      <p><b>예시:</b> ${example}</p>
      <p class="pattern">구조: ${pattern}</p>
    </div>
  `;
}
