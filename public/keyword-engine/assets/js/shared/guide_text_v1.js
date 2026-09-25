// **안내문이 너무 짧으면 보고서를 만들지 않는다.** 화면과 워커가 같은 규칙을 본다.
//
// 왜 필요한가(2026-09-25). 지금은 안내문이 **비어 있지만 않으면** 통과한다.
// 「가」 한 글자, 「1234567890」, 이모지 넷으로도 유료 보고서가 그대로 나간다.
// 돈을 내고 아무 근거 없는 글을 받는 것이 제일 나쁘다 — 학생은 그것이 나쁜 줄도 모른다.
//
// 기준은 **실제 과제 7,131건의 길이를 재서** 정했다.
//   가장 짧은 것 4자 · 1% 20자 · 가운데 99자 · 95% 514자
//   글자 8자 미만은 10건(0.14%)이고 거의 다 체육·음악 실기다(「축구 실기」·「말하기 2」).
//   우리 과목에서 가장 짧은 것은 「전기화학 실험평가」(한글 8자)라 그것은 살린다.
// 그래서 **한글·영문 글자 수 8자**를 바닥으로 잡는다. 숫자·기호·이모지는 세지 않는다 —
// 「1234567890」은 열 글자지만 과제에 대해 아무것도 말하지 않는다.

const LETTERS = /[가-힣a-zA-Z]/g;

export const GUIDE = Object.freeze({ EMPTY: 'empty', TOO_SHORT: 'tooShort', THIN: 'thin', OK: 'ok' });

// 과제에 대해 말하는 글자만 센다.
export const letterCount = (text) => (String(text || '').match(LETTERS) || []).length;

const FLOOR = 8;   // 이보다 적으면 만들지 않는다
const THIN = 25;   // 이보다 적으면 만들되 「짧다」고 말한다

export function guideLevel(text) {
  const letters = letterCount(text);
  if (!String(text || '').trim()) return GUIDE.EMPTY;
  if (letters < FLOOR) return GUIDE.TOO_SHORT;
  if (letters < THIN) return GUIDE.THIN;
  return GUIDE.OK;
}

// 학생에게 할 말. **무엇을 하면 되는지**까지 말한다.
export function guideMessage(text) {
  const level = guideLevel(text);
  if (level === GUIDE.EMPTY) return '수행평가 안내문을 넣어 주세요. 선생님이 주신 글을 그대로 붙여 넣으면 돼요.';
  if (level === GUIDE.TOO_SHORT) {
    return '안내문이 너무 짧아요. 이대로는 무엇을 조사할 과제인지 알 수 없어서 보고서를 만들지 않았어요.'
      + ' 선생님이 나눠 준 안내문을 <b>통째로</b> 붙여 넣어 주세요 — 평가 방법과 채점 기준까지 있으면 가장 좋아요.';
  }
  if (level === GUIDE.THIN) {
    return '안내문이 짧아요. 이대로도 만들 수 있지만, 선생님이 주신 글을 <b>통째로</b> 붙여 넣으면 결과가 크게 달라져요.';
  }
  return '';
}

export const guideBlocks = (text) => {
  const level = guideLevel(text);
  return level === GUIDE.EMPTY || level === GUIDE.TOO_SHORT;
};

// **학생의 개인정보는 AI에게 보내지 않는다.**
// 안내문을 통째로 붙여 넣으라고 했으므로 이름·학번·전화번호·메일이 섞여 들어온다
// (실제 기록에도 있다). 그대로 보내면 보고서에 나올 수 있고, 학생은 미성년자다.
// 과제를 이해하는 데 필요한 정보도 아니다.
export function scrubPersonal(text) {
  return String(text || '')
    .replace(/01[016789][-. ]?\d{3,4}[-. ]?\d{4}/g, '')                 // 휴대전화
    .replace(/0\d{1,2}[-. ]\d{3,4}[-. ]\d{4}/g, '')                      // 집·학교 전화
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')                            // 메일
    .replace(/\d{6}[-\s]?[1-4]\d{6}/g, '')                               // 주민등록번호
    .replace(/\d{1,2}\s?학년\s?\d{1,2}\s?반\s?\d{1,2}\s?번\s?[가-힣]{2,4}/g, '')  // 3학년 2반 17번 홍길동
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
