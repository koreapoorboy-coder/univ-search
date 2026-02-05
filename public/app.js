let rows = [];
let fuse = null;

async function init() {
  const res = await fetch('./univ_info.json', { cache: 'no-store' });
  rows = await res.json();
  fuse = new Fuse(rows, {
    threshold: 0.35,
    ignoreLocation: true,
    keys: ['대학', '학과', '핵심과목', '권장과목', '전형변화2028']
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

  list.innerHTML = items.map(r => `
    <div style="border:1px solid #ddd;padding:10px;margin:8px 0;border-radius:10px;">
      <b>${r['대학']} / ${r['학과']}</b><br/>
      핵심: ${r['핵심과목'] || '-'}<br/>
      권장: ${r['권장과목'] || '-'}<br/>
      전형변화2028: ${r['전형변화2028'] || '-'}
    </div>
  `).join('');
}

init().catch(() => {
 document.getElementById('list').textContent = '데이터 로딩 실패: univ_info.json 확인 필요';
});
