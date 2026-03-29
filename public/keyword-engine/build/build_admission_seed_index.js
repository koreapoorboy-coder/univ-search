const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'seed', 'admission_case_seed.json');
const clusterPath = path.join(__dirname, '..', 'seed', 'admission_cluster_rules.json');
const outPath = path.join(__dirname, '..', 'reference', 'admission_seed_index.json');

const cases = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const clusters = JSON.parse(fs.readFileSync(clusterPath, 'utf8'));

const index = {
  totalCases: cases.length,
  clusters: clusters.map(c => ({
    cluster_id: c.cluster_id,
    label: c.label,
    case_count: cases.filter(x => x.major_cluster === c.label).length
  })),
  keywordIndex: {}
};

for (const item of cases) {
  const keywords = item.seed_tags?.keywords || [];
  for (const kw of keywords) {
    if (!index.keywordIndex[kw]) index.keywordIndex[kw] = [];
    index.keywordIndex[kw].push({
      case_id: item.case_id,
      major_cluster: item.major_cluster,
      target_major: item.target_major
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');
console.log('admission_seed_index.json generated');
