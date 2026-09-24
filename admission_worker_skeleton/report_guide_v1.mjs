// **보고서 설명서** — 학생에게 「이게 무슨 보고서이고 어떻게 만들어졌는지」 알려 주는 글.
//
// 사용자 결정 2026-09-23: 학생에게 두 가지를 준다.
//   ① 그대로 낼 수 있는 완성된 보고서
//   ② 이게 무슨 보고서인지 알려 주는 설명서   ← 이 파일
// 「그냥 보고서만 주면 무슨 내용인지 모를 수 있으니까」가 그 이유다.
//
// **AI를 부르지 않는다.** 여기 들어가는 것은 전부 우리가 이미 아는 사실이다 — 과목, 단원,
// 수집 방식, 학생이 적은 값의 개수, 자료원, 절 이름. 지어낼 여지가 없고 돈도 안 든다.
//
// 그리고 이 설명서는 **보고서 본문에 들어가지 않는다.** 보고서는 학생이 쓴 글로 읽혀야 한다.
import { COLLECTION } from '../public/keyword-engine/assets/js/shared/collection_kind_v1.js';

const KIND_WORD = {
  [COLLECTION.MEASUREMENT]: '직접 재서 얻은 숫자로 쓰는 실험 보고서',
  [COLLECTION.SURVEY]: '설문으로 받은 응답 수로 쓰는 보고서',
  [COLLECTION.DATASET]: '공개된 자료의 수치를 옮겨 적어 해석하는 보고서',
  [COLLECTION.READING]: '자료를 읽고 정리해 쓰는 문헌 탐구 보고서',
  [COLLECTION.NONE]: '모아 올 자료 없이 교과 개념으로 쓰는 보고서',
};

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function buildReportGuide({ input = {}, data = {}, stats = null, sections = [], title = '', reviewLines = [] } = {}) {
  const kind = input.collectionKind || COLLECTION.NONE;
  const rows = (stats?.rows || []).filter((one) => (one?.values || []).length);
  const filled = rows.reduce((sum, one) => sum + one.values.length, 0);
  const notes = (data.conditions || []).map((one) => clip(one?.note, 60)).filter(Boolean);
  const datasets = (input.referenceDatasets || []).filter((one) => one?.title);
  const cards = (data.sourceCards || []).filter((one) => one?.title);

  const what = [
    `과목 · ${clip(input.subject, 30) || '적지 않음'}${input.grade ? ` · ${clip(input.grade, 6)}` : ''}`,
    input.selectedConcept || input.keyword ? `단원 · ${clip(input.selectedConcept || input.keyword, 40)}` : '',
    `보고서 종류 · ${KIND_WORD[kind] || KIND_WORD[COLLECTION.NONE]}`,
    sections.length ? `절 구성 · ${sections.map((one) => clip(one?.title, 20)).filter(Boolean).join(' → ')}` : '',
  ].filter(Boolean);

  const how = [];
  if (rows.length) {
    how.push(`표에 든 값 · ${filled}칸 (${rows.length}개 조건: ${rows.map((one) => clip(one.label, 14)).join(', ')})`);
  }
  if (notes.length) how.push(`내가 적은 출처 메모 · ${notes.join(' / ')}`);
  for (const one of datasets.slice(0, 3)) how.push(`자료원 · ${clip(one.title, 60)}${one.org ? ` (${clip(one.org, 20)})` : ''}`);
  for (const one of cards.slice(0, 3)) how.push(`내가 적은 자료 · ${clip(one.title, 50)}`);
  if (input.textbookCitation) how.push(`교과서 · ${clip(input.textbookCitation, 60)}`);
  if (!how.length) how.push('이 보고서는 교과 개념만으로 썼어요. 따로 모아 온 자료는 없어요.');

  const numbers = rows.length ? [
    '표의 값 · 내가 적은 값 그대로예요.',
    '평균 · 흔들림 · 차이 · 변화율 · 그 값으로 프로그램이 계산했어요. AI가 지어낸 숫자가 아니에요.',
    '그 밖의 숫자 · 본문에 못 들어가게 막아 두었어요.',
  ] : ['이 보고서에는 내가 잰 숫자가 없어요. 숫자가 나오면 교과서에 나오는 값이에요.'];

  const check = [
    datasets.length || notes.length ? '자료원을 한 번 열어 보세요. 선생님이 「이 자료 봤니?」 하고 물을 수 있어요.' : '',
    '「느낀 점」이 내 생각과 같은지 읽어 보세요. 다르면 고쳐 주세요.',
    '표지의 이름·학번 칸을 채우세요.',
    '이 설명서는 제출하지 않아요. 보고서만 내면 돼요.',
  ].filter(Boolean);

  return {
    title: clip(title, 120),
    blocks: [
      { head: '이 보고서는 무엇인가요', lines: what },
      { head: '무엇으로 만들었나요', lines: how },
      { head: '숫자는 어디에서 왔나요', lines: numbers },
      // 검수에서 고친 것을 학생에게 알려 준다. 조용히 고치면 학생이 자기 글로 읽을 수 없다.
      ...(reviewLines.length ? [{ head: '검수에서 고친 것', lines: reviewLines }] : []),
      { head: '내기 전에 볼 것', lines: check },
    ],
  };
}
