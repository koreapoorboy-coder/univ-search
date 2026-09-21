// 입력 문이 막았을 때, 학생에게 **무엇을 해야 하는지** 한국어로 말해 준다.
//
// 막는 일 자체는 맞다. 문제는 화면에 「BLANK_TASK_DESCRIPTION」 같은 영어 낱말이 그대로 뜨는 것이다.
// 학생은 그 말을 읽고 무엇을 고쳐야 할지 알 수 없다(₩0 거친 입력 검사 2026-09-21, 22건 중 2건).
//
// 기계가 읽는 코드(`error`)는 그대로 둔다 — 계약 검사(N05·N23~N28)와 tools/check_connections.mjs 가
// 그 낱말을 본다. 사람이 읽는 문장은 `message` 로 따로 보낸다.
const MESSAGE = {
  // 화면이 보낼 것을 안 보냈다. 학생 잘못이 아니다.
  LIVE_INPUT_CANDIDATE_REQUIRED: '화면을 새로고침한 뒤 학교·학년·과목·과제 안내문을 다시 넣어 주세요.',
  LIVE_INTAKE_GATEWAY_REJECTED: '화면을 새로고침한 뒤 다시 눌러 주세요.',

  // 빈 칸.
  BLANK_SCHOOL: '학교 이름을 넣어 주세요.',
  BLANK_SUBJECT: '과목을 골라 주세요.',
  BLANK_SUBJECT_GROUP: '과목을 골라 주세요. 계열이 함께 정해져요.',
  BLANK_SELECTED_SUBJECT: '과목을 골라 주세요.',
  BLANK_SELECTED_SUBJECT_GROUP: '과목을 골라 주세요. 계열이 함께 정해져요.',
  BLANK_TASK_DESCRIPTION: '수행평가 안내문을 넣어 주세요. 선생님이 주신 글을 그대로 붙여 넣으면 돼요.',
  GRADE_INVALID: '학년을 고1·고2·고3 중에서 골라 주세요.',

  // 과목이 우리 목록에 없다.
  UNKNOWN_SUBJECT_OPTION: '목록에 있는 과목 중에서 골라 주세요.',
  AMBIGUOUS_SUBJECT_OPTION: '과목을 다시 골라 주세요. 같은 이름이 두 번 잡혔어요.',
  INVENTORY_GROUP_MISMATCH: '과목을 다시 골라 주세요. 과목과 계열이 서로 맞지 않아요.',
  RAW_METADATA_SUBJECT_MISMATCH: '과목을 다시 골라 주세요.',
  RAW_METADATA_GROUP_MISMATCH: '과목을 다시 골라 주세요.',

  // 화면이 오래됐다.
  INVENTORY_VERSION_MISMATCH: '화면이 오래됐어요. 새로고침한 뒤 다시 해 주세요.',
  CANDIDATE_VERSION_MISMATCH: '화면이 오래됐어요. 새로고침한 뒤 다시 해 주세요.',
  ARTIFACT_SHA_MISMATCH: '화면이 오래됐어요. 새로고침한 뒤 다시 해 주세요.',

  // 넣은 값과 보낸 값이 다르다.
  LIVE_INPUT_SCHOOL_CONFLICT: '학교 이름이 도중에 바뀌었어요. 새로고침한 뒤 다시 넣어 주세요.',
  LIVE_INPUT_GRADE_CONFLICT: '학년이 도중에 바뀌었어요. 새로고침한 뒤 다시 골라 주세요.',
  LIVE_INPUT_SUBJECT_CONFLICT: '과목이 도중에 바뀌었어요. 새로고침한 뒤 다시 골라 주세요.',
  LIVE_INPUT_SUBJECT_GROUP_CONFLICT: '계열이 도중에 바뀌었어요. 새로고침한 뒤 다시 골라 주세요.',
  LIVE_INPUT_TASK_DESCRIPTION_CONFLICT: '안내문이 도중에 바뀌었어요. 새로고침한 뒤 다시 붙여 넣어 주세요.',

  // 그 밖에 우리가 막은 모든 것.
  LIVE_INPUT_AUTHORITY_REJECTED: '넣은 내용을 다시 확인해 주세요. 학교·학년·과목·안내문이 모두 있어야 해요.',
};

// 코드에 맞는 한국어 문장. 모르는 코드면 마지막 한 문장으로 돌아간다 — 영어 낱말을 그대로 보이는 것보다 낫다.
export function messageForCode(code) {
  const key = String(code || '').trim();
  if (MESSAGE[key]) return MESSAGE[key];
  // 이름만 봐도 무슨 칸이 비었는지 아는 것들.
  if (/^BLANK_/.test(key)) return '빈 칸이 있어요. 학교·학년·과목·안내문을 모두 넣어 주세요.';
  if (/VERSION_MISMATCH$/.test(key)) return '화면이 오래됐어요. 새로고침한 뒤 다시 해 주세요.';
  return MESSAGE.LIVE_INPUT_AUTHORITY_REJECTED;
}

export const LIVE_INPUT_MESSAGE_CODES = Object.freeze(Object.keys(MESSAGE));
