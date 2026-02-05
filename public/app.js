let rows = [];
let fuse = null;

async function init() {
  const res = await fetch('./univ_info.json', { cache: 'no-store' });
  rows = await res.json();

  // ✅ 검색은 "대학/학과"만 대상으로 (세부내용은 검색 대상에서 제외)
  fuse = new Fuse(rows, {
    threshold: 0.35,
    ignoreLocation: true,
    keys: ['대학', '학과']
  });

  const q = document.getElementById('q');
  q.addEventListener('input', () => render(q.value.trim()));

  render('');
}

function render(keyword) {
  const list = document.getElementById('list');

  const items = keyword
    ? fuse.search(keyword).map(x => x.item).slice(0, 50)
    : rows.slice(0, 50);

  // ✅ 목록에는 대학/학과만 보이게 만들고, 세부는 숨겨둠
  list.innerHTML = items.map((r, i) => `
    <div class="card" style="border:1px solid #ddd;padding:12px;margin:8px 0;border-radius:10px;">
      <div class="header" data-idx="${i}" style="cursor:pointer;font-weight:700;">
        ${r['대학']} / ${r['학과']}
        <span style="float:right;opacity:.6;">▼</span>
      </div>

      <div class="detail" style="display:none;margin-top:8px;line-height:1.6;">
        <div>핵심과목: ${r['핵심과목'] || '-'}</div>
        <div>권장과목: ${r['권장과목'] || '-'}</div>
        <div>전형변화2028: ${r['전형변화2028'] || '-'}</div>
      </div>
    </div>
  `).join('');

  // ✅ 클릭하면 detail 펼치기/접기
  list.querySelectorAll('.header').forEach(h => {
    h.addEventListener('click', () => {
      const card = h.parentElement;
      const detail = card.querySelector('.detail');
      const isOpen = detail.style.display === 'block';
      detail.style.display = isOpen ? 'none' : 'block';
    });
  });
}

init().catch(() => {
  document.getElementById('list').textContent = '데이터 로딩 실패: univ_info.json 확인 필요';
});
