// 새 단원에 붙일 **공공데이터 검색어**를 실제 API로 재 본다. ₩0 (공공데이터포털은 무료).
//
// public_data_terms.v1.json 의 규칙을 그대로 따른다: 「낱말 75개를 하나씩 실제 API로 재 본 뒤,
// 0건인 말과 엉뚱한 것을 물어 오는 말을 버렸다.」 짐작으로 적지 않는다.
//
//   node tools/test_public_data_terms_2026_09.mjs <후보 json> <나갈 json>
import { readFileSync, writeFileSync } from 'node:fs';
import { usable } from '../admission_worker_skeleton/public_data_v1.mjs';

const BASE = 'https://api.odcloud.kr/api/15077093/v1/open-data-list';   // public_data_v1.mjs 와 같은 곳
const KEY_FILE = 'C:/Users/korea/OneDrive/문서/카카오톡 받은 파일/인증키 관련 데이터.txt';
// 아홉째 줄이 공공데이터포털 인증키다. 값은 절대 찍지 않는다.
const key = readFileSync(KEY_FILE, 'utf8').split(/\r?\n/)[8]?.trim() || '';
if (!key) { console.error('인증키를 못 읽었습니다.'); process.exit(1); }

const terms = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/public_data_terms.v1.json', 'utf8'));
const want = JSON.parse(readFileSync(process.argv[2], 'utf8'));

async function ask(word) {
  const url = `${BASE}?page=1&perPage=20&cond%5Btitle%3A%3ALIKE%5D=${encodeURIComponent(word)}&serviceKey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { n: 0, titles: [] };
    const body = await res.json();
    const rows = (body?.data || []).filter((row) => usable(row, terms));
    return { n: rows.length, titles: rows.slice(0, 3).map((r) => String(r.제목 || r.title || r.list_title || '').slice(0, 42)) };
  } catch { return { n: 0, titles: [] }; }
}

const kept = {};
let asked = 0;
for (const [unit, words] of Object.entries(want)) {
  const good = [];
  for (const word of words) {
    const { n, titles } = await ask(word);
    asked += 1;
    const mark = n >= 3 ? '✔' : n > 0 ? '△' : '✗';
    console.log(`  ${mark} ${String(n).padStart(2)}건  ${word.padEnd(12)} ${titles[0] || ''}`);
    if (n >= 3) good.push(word);
  }
  if (good.length) kept[unit] = good.slice(0, 2);
}
writeFileSync(process.argv[3], JSON.stringify(kept, null, 1), 'utf8');
console.log(`\n재 본 낱말 ${asked}개 · 남긴 단원 ${Object.keys(kept).length}개`);
