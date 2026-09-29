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

// **안내문이 요구했는데 우리가 못 붙인 자료**를 학생에게 뭐라고 말하고, 어디서 찾으라고 할 것인가.
// 「없어요」로 끝내면 학생은 할 일을 모른다. 찾는 곳을 이름까지 적어 준다.
const MISSING_WORD = { 논문: '논문', 대학연구: '연구 사례', 통계: '통계 자료', 책: '책' };
const MISSING_HOW = {
  논문: '논문 · KCI(kci.go.kr)에서 단원 이름으로 검색하고, 초록만 읽어도 돼요. 제목·저자·연도·학술지를 참고문헌에 적으세요.',
  대학연구: '연구 사례 · 대학 누리집의 「연구 성과」나 「연구 하이라이트」에서 단원과 이어지는 글을 하나 찾아 주소와 함께 적으세요.',
  통계: '통계 자료 · KOSIS(kosis.kr)나 공공데이터포털(data.go.kr)에서 찾으세요. 표 이름과 받은 날짜를 참고문헌에 적으세요.',
  책: '책 · 학교 도서관에서 단원과 이어지는 책을 한 권 찾아 읽고, 제목·지은이·읽은 쪽을 적으세요.',
};

export function buildReportGuide({ input = {}, data = {}, stats = null, sections = [], title = '', reviewLines = [], readMore = [], missing = [] } = {}) {
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
    input.textbookCitation ? '참고 자료의 교과서 줄에 **출판사와 쪽수**를 적어 주세요. 그건 내 교과서를 봐야 알 수 있어요.' : '',
    '표지의 이름·학번 칸을 채우세요.',
    readMore.length ? '아래 「보고서가 참고한 연구」는 참고문헌에 이미 들어가 있어요. 선생님이 물어보실 수 있으니 한 번 열어 보세요.' : '',
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
      // **안내문이 요구했는데 우리가 못 붙인 자료를 학생에게 말한다**(사용자 결정 2026-09-30).
      //
      // 조용히 넘어가면 학생은 자기 보고서가 안내문을 못 지켰다는 것을 모른다. 실제 과제 3,342건 가운데
      // 328건이 이 경우였다 — 「빅데이터를 분석하여 논술하기」라고 적힌 과제에 통계 한 줄 없이
      // 교과서만 나갔다. 「없어요」로 끝내지 않고 어디서 어떻게 찾는지까지 적는다.
      ...(missing.length ? [{
        head: '이 과제가 요구한 자료 — 직접 찾아야 해요',
        lines: [
          `안내문이 ${missing.map((one) => MISSING_WORD[one] || one).join('·')}을 요구했는데, 우리가 이 단원에 붙일 자료를 갖고 있지 않아요.`,
          '보고서는 교과서와 내가 적은 내용으로 만들었어요. 아래에서 하나만 찾아 넣으면 안내문을 지킬 수 있어요.',
          ...missing.map((one) => MISSING_HOW[one]).filter(Boolean),
        ],
      }] : []),
      // **보고서가 쓴 자료를 「찾아 읽는 법」과 함께 적는다**(사용자 지적 2026-09-28). 참고문헌에는 서지
      // 한 줄만 있어서, 학생이 그것을 어디서 어떻게 읽는지 모른다. 설명서는 제출하지 않으므로 여기에 적는다.
      ...(readMore.length ? [{ head: '보고서가 참고한 연구 — 읽어 두면 좋아요',
        lines: ['이 자료는 보고서의 배경이 된 것이고, 참고문헌에도 들어가 있어요.',
          '논문은 KCI(kci.go.kr)에서 제목으로 찾아 초록만 읽어도 돼요. 서울대 연구 글은 주소를 그대로 열면 돼요.',
          '읽고 나면 「무엇을 알게 되었나」를 두 줄로 적어 두세요. 발표나 면접에서 물어보면 그게 답이 돼요.',
          ...readMore] }] : []),
    ],
  };
}
