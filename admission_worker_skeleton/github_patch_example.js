async function requestGeneratedPlan(input) {
  const response = await fetch('https://YOUR-WORKER-DOMAIN.workers.dev/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error('생성 요청에 실패했습니다.');
  }

  return response.json();
}

// 사용 예시
// const result = await requestGeneratedPlan({
//   keyword: '이차전지',
//   grade: '고2',
//   track: '공학',
//   major: '신소재공학과',
//   activityLevel: '교과 연계 활동 해봄',
//   style: '데이터 분석형'
// });
