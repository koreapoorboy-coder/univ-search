import mapping from "../reference/keyword_mapping_examples.json" assert { type: "json" };
import sentencePatterns from "../reference/record_sentence_patterns.json" assert { type: "json" };
import recordPatterns from "../reference/record_patterns.json" assert { type: "json" };

function pickSubKeyword(item) {
  if (!item?.sub_keywords || item.sub_keywords.length === 0) return "핵심 기술";
  return item.sub_keywords[0];
}

function buildTopic(keyword, item) {
  const sub = pickSubKeyword(item);
  const template = item.topic_templates?.[0] || `${keyword} 관련 탐구`;
  return template.replaceAll("{sub}", sub).replaceAll("{keyword}", keyword);
}

function buildDirections(item) {
  return item.record_sentences || [];
}

function buildFlow(item) {
  return item.activity_flow || "개념 이해 → 사례 조사 → 분석 → 결론 정리";
}

function buildRecordSentence(keyword, item) {
  const sentences = item.record_sentences || [];
  if (sentences.length > 0) return sentences.join(" ");
  const fallback = sentencePatterns.sample_structures[0] || "{keyword} 관련 탐구를 수행함.";
  return fallback.replaceAll("{keyword}", keyword);
}

function buildPatternGuide(item) {
  const patterns = item.patterns || [];
  return patterns.map((name) => ({
    pattern: name,
    guide: recordPatterns.pattern_buckets?.[name]?.[0] || ""
  }));
}

export function buildActivity(keyword) {
  const item = mapping[keyword];

  if (!item) {
    return {
      keyword,
      topic: `${keyword} 관련 탐구`,
      directions: [`${keyword}의 개념과 사례를 조사하고 탐구 방향을 정리함.`],
      flow: "개념 이해 → 사례 조사 → 분석 → 결론 정리",
      resultExamples: ["탐구 보고서", "발표 자료"],
      recordSentence: `${keyword}에 관한 개념을 이해하고 관련 사례를 조사하여 탐구 내용을 정리함.`,
      patternGuide: []
    };
  }

  return {
    keyword,
    topic: buildTopic(keyword, item),
    directions: buildDirections(item),
    flow: buildFlow(item),
    resultExamples: item.result_examples || [],
    recordSentence: buildRecordSentence(keyword, item),
    patternGuide: buildPatternGuide(item)
  };
}

export function buildActivitiesForKeywords(keywords = []) {
  return keywords.map((keyword) => buildActivity(keyword));
}
