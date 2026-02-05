let rows = [];
let fuse = null;

async function init() {
  const res = await fetch('./univ_info.json', { cache: 'no-store' });
  rows = await res.json();

  // ✅ 검색은 "대학/학과"만
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

  // ✅ 화면에는 "대학/학과"만 먼저 보이고, 클릭하면 아래 3개가 펼쳐지게
  list.innerHTML = items.map((r, i) => `
    <div class="card" data-i="${i}"
         style="border:1px solid #ddd;padding:12px;margin:8px 0;border-radius:10px;cursor:pointer;">
      <b>${r['대학']} / ${r['학과']}</b>
      <div class="detail" style="margin-top:8px; display:none; line-height:1.6;">
        <div>핵심과목: ${r['핵심과목'] || '-'}</div>
        <div>권장과목: ${r['권장과목'] || '-'}</div>
        <div>전형변화: ${r['전형변화2028'] || '-'}</div>
      </div>
    </div>
  `).join('');

  // 클릭 토글(펼치기/접기)
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const d = card.querySelector('.detail');
      d.style.display = (d.style.display === 'none') ? 'block' : 'none';
    });
  });
}

init().catch(() => {
  document.getElementById('list').textContent =
    '데이터 로딩 실패: public/univ_info.json 파일명/경로 확인 필요';
});
