const fs = require('fs');
const path = require('path');

const patternPath = path.join(__dirname, '..', 'seed', 'admission_pattern_rules.json');
const bridgePath = path.join(__dirname, '..', 'seed', 'keyword_cluster_bridge.json');
const levelPath = path.join(__dirname, '..', 'seed', 'admission_grade_level_modifiers.json');
const outPath = path.join(__dirname, '..', 'reference', 'admission_engine_bridge_index.json');

const patterns = JSON.parse(fs.readFileSync(patternPath, 'utf8'));
const bridges = JSON.parse(fs.readFileSync(bridgePath, 'utf8'));
const levels = JSON.parse(fs.readFileSync(levelPath, 'utf8'));

const index = {
  clusterCount: patterns.clusters.length,
  keywordCount: bridges.length,
  gradeLevels: Object.keys(levels),
  byKeyword: {}
};

for (const item of bridges) {
  const cluster = patterns.clusters.find(c => c.cluster_id === item.primary_cluster);
  index.byKeyword[item.keyword] = {
    primary_cluster: item.primary_cluster,
    label: cluster?.label || item.primary_cluster,
    secondary_clusters: item.secondary_clusters || [],
    grade_profiles: item.grade_profiles || {}
  };
}

fs.writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');
console.log('admission_engine_bridge_index.json generated');
