(function(){
  function qs(name){ return new URLSearchParams(location.search).get(name); }
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function addButtons(){
    const navRow = document.getElementById('navRow');
    if(!navRow) return false;
    if(navRow.dataset.recordLinksInjected === '1') return true;

    const params = new URLSearchParams(location.search);
    const admin = (params.get('admin') || '').trim();
    const id = (params.get('id') || '').trim();
    const t = (params.get('t') || params.get('token') || '').trim();

    let recHref = '';
    let rawHref = '';

    if(admin && id){
      recHref = `./record_detail.html?id=${encodeURIComponent(id)}&admin=${encodeURIComponent(admin)}`;
      rawHref = `./record_raw_detail.html?id=${encodeURIComponent(id)}&admin=${encodeURIComponent(admin)}`;
    } else if(t){
      recHref = `./record_detail.html?t=${encodeURIComponent(t)}`;
      rawHref = `./record_raw_detail.html?t=${encodeURIComponent(t)}`;
    } else {
      return false;
    }

    // 이미 같은 링크가 있으면 중복 추가 방지
    const existsRecord = Array.from(navRow.querySelectorAll('a')).some(a => (a.getAttribute('href')||'').includes('record_detail.html'));
    const existsRaw = Array.from(navRow.querySelectorAll('a')).some(a => (a.getAttribute('href')||'').includes('record_raw_detail.html'));

    if(!existsRecord){
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = recHref;
      a.textContent = '생활기록부 분석 보기';
      navRow.appendChild(a);
    }

    if(!existsRaw){
      const a2 = document.createElement('a');
      a2.className = 'btn';
      a2.href = rawHref;
      a2.textContent = '생기부 원문 보기';
      navRow.appendChild(a2);
    }

    navRow.dataset.recordLinksInjected = '1';
    return true;
  }

  ready(function(){
    if(addButtons()) return;
    // student.html 내부 렌더 후 navRow가 생기는 경우 대비
    let tries = 0;
    const tm = setInterval(function(){
      tries += 1;
      if(addButtons() || tries >= 40) clearInterval(tm);
    }, 200);
  });
})();
