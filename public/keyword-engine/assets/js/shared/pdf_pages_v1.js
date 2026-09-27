// **쪽이 많은 PDF 는 학생 브라우저에서 쪽마다 사진으로 바꿔 올린다.**
//
// 왜 필요한가(2026-09-27 실측). 학생은 생활기록부를 PDF 한 개로 올린다. 그런데 그 PDF 를
// 통째로 AI 에게 보내면 **앞쪽 몇 쪽만 닿는다** — 26쪽짜리 3년치 생기부로 재 보니 입력이
// 19,065 토큰에서 더 늘지 않았고, 교과를 넷(한 번에)·다섯(쪽 번호로 나눠)·아홉(학년으로 나눠)만
// 읽었다. 지시문으로는 못 넘는 벽이다.
// 같은 생기부를 **사진 8장**으로 올렸더니 교과 열세 개를 하나도 안 빠뜨리고 읽었다.
// 차이는 파일이 나뉘어 있느냐 하나뿐이다.
//
// 학생이 하는 일은 바뀌지 않는다. PDF 를 고르면 이 코드가 브라우저 안에서 쪽마다 그림을 떠서
// 대신 올린다. 바깥 서버로 나가는 것은 없다 — pdf.js 도 우리 서버에 두고 쓴다.
//
// 짧은 PDF(보고서)는 그대로 보낸다. 글자로 된 PDF 는 그대로가 더 싸고 정확하다.

export const PDF_SPLIT = Object.freeze({
  // 이보다 쪽이 적으면 바꾸지 않는다. 보고서는 보통 두세 쪽이고, 그 정도는 통째로 잘 읽힌다.
  minPages: 7,
  // 너무 많이 보내면 학생이 오래 기다리고 돈도 많이 든다. 생기부 3년치가 26쪽이었다.
  maxPages: 30,
  // 글자가 읽힐 만큼만 크게. 1.6 배면 A4 한 쪽이 긴 쪽 1,600px 안팎이 된다.
  scale: 1.6,
  quality: 0.72,
});

// pdf.js 가 어디 있는지는 **이 파일이 스스로 안다.** 부르는 쪽(고전 스크립트)에서 상대 경로를
// 넘기면 기준이 달라져 엉뚱한 곳을 찾는다.
const VENDOR = new URL('../vendor/', import.meta.url).href;
let loading = null;
// **필요할 때만 받아 온다.** pdf.js 는 1.7MB 라, PDF 를 안 올리는 학생에게까지 받게 하면 안 된다.
function loadPdfJs(base = VENDOR) {
  if (!loading) {
    loading = import(`${base}pdf_4.10.38.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${base}pdf_worker_4.10.38.min.mjs`;
      return lib;
    });
  }
  return loading;
}

export const isPdf = (file) => String(file?.type || '').toLowerCase() === 'application/pdf'
  || /\.pdf$/i.test(String(file?.name || ''));

// 쪽 수만 센다. 바꿀지 말지 정하는 데 쓴다.
export async function pdfPageCount(file, base = VENDOR) {
  try {
    const lib = await loadPdfJs(base);
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = doc.numPages;
    await doc.destroy();
    return pages;
  } catch (error) {
    console.error('pdf page count failed:', error);
    return 0;
  }
}

// PDF 한 개 → 쪽마다 사진 한 장. 못 바꾸면 null 이다(그때는 PDF 를 그대로 보낸다).
export async function pdfToImages(file, base = VENDOR, { onProgress } = {}) {
  try {
    const lib = await loadPdfJs(base);
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = Math.min(doc.numPages, PDF_SPLIT.maxPages);
    const out = [];
    for (let at = 1; at <= pages; at += 1) {
      const page = await doc.getPage(at);
      const view = page.getViewport({ scale: PDF_SPLIT.scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(view.width);
      canvas.height = Math.round(view.height);
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport: view }).promise;
      const blob = await new Promise((done) => canvas.toBlob(done, 'image/jpeg', PDF_SPLIT.quality));
      // 캔버스를 바로 비운다. 30쪽을 들고 있으면 폰에서 메모리가 모자란다.
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      if (!blob) continue;
      const name = `${String(file.name || 'record').replace(/\.pdf$/i, '')}-${String(at).padStart(2, '0')}.jpg`;
      out.push(new File([blob], name, { type: 'image/jpeg' }));
      if (typeof onProgress === 'function') onProgress(at, pages);
    }
    await doc.destroy();
    return out.length ? out : null;
  } catch (error) {
    console.error('pdf to images failed:', error);
    return null;
  }
}

// 올린 파일들 가운데 **쪽이 많은 PDF 만** 사진으로 바꾼다. 나머지는 그대로 둔다.
export async function splitLongPdfs(files, base = VENDOR, { onProgress } = {}) {
  const out = [];
  let changed = 0;
  for (const file of files) {
    if (!isPdf(file)) { out.push(file); continue; }
    const pages = await pdfPageCount(file, base);
    if (pages < PDF_SPLIT.minPages) { out.push(file); continue; }
    const images = await pdfToImages(file, base, { onProgress });
    if (!images) { out.push(file); continue; }
    // 워커는 한 번에 30개까지 받는다. 넘으면 앞에서부터 담는다 — 뒤쪽을 버리는 쪽이
    // 아무것도 못 보내는 것보다 낫고, 못 담은 쪽은 학생에게 말해 준다.
    for (const one of images) { if (out.length >= 28) break; out.push(one); }
    changed += 1;
  }
  return { files: out, changed };
}
