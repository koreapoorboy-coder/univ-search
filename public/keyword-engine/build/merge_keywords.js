const fs = require('fs');
const path = require('path');

const keywordsDir = path.join(__dirname, '..', 'data', 'keywords');
const outputFile = path.join(__dirname, '..', 'data', 'keyword_library.json');

function loadKeywordFiles() {
  const files = fs.readdirSync(keywordsDir).filter((name) => name.endsWith('.json'));
  const result = {};

  files.sort().forEach((file) => {
    const fullPath = path.join(keywordsDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const item = JSON.parse(raw);

    if (!item.keyword) {
      throw new Error(`${file}에 keyword 필드가 없습니다.`);
    }

    const keyword = item.keyword;
    const copy = { ...item };
    delete copy.keyword;

    result[keyword] = copy;
  });

  return result;
}

function build() {
  const merged = loadKeywordFiles();
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`완료: ${Object.keys(merged).length}개 키워드를 ${outputFile}로 병합했습니다.`);
}

build();
