// integrated_engine_loader.js
// 통합 엔진 index를 읽고 각 레이어 index.json을 순차 로드하는 스타터 코드

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load: ${path} (${res.status})`);
  }
  return res.json();
}

function resolvePath(basePath, relativePath) {
  const baseUrl = new URL(basePath, window.location.href);
  return new URL(relativePath, baseUrl).toString();
}

export async function loadIntegratedEngine(integratedIndexPath = "./integrated_engine_index.json") {
  const integratedIndex = await fetchJson(integratedIndexPath);
  const layers = integratedIndex.layers || {};

  const loaded = {
    integratedIndex,
    layerIndexes: {},
    layerData: {}
  };

  for (const [layerName, layerConfig] of Object.entries(layers)) {
    if (!layerConfig?.enabled || !layerConfig?.path) continue;

    const layerIndexPath = resolvePath(integratedIndexPath, layerConfig.path);
    const layerIndex = await fetchJson(layerIndexPath);
    loaded.layerIndexes[layerName] = layerIndex;

    const bucket = {};
    loaded.layerData[layerName] = bucket;

    // index.json 안의 배열형 키들을 따라 실제 파일 로드
    for (const [key, value] of Object.entries(layerIndex)) {
      if (Array.isArray(value)) {
        bucket[key] = [];
        for (const relPath of value) {
          const absPath = resolvePath(layerIndexPath, relPath);
          const data = await fetchJson(absPath);
          bucket[key].push({
            path: relPath,
            absPath,
            data
          });
        }
      } else if (typeof value === "string" && key.startsWith("active_")) {
        const absPath = resolvePath(layerIndexPath, value);
        bucket[key] = {
          path: value,
          absPath,
          data: await fetchJson(absPath)
        };
      }
    }
  }

  return loaded;
}

// 학생 태그 결과를 기준으로 최소 추천 결과를 만드는 예시 함수
export function runBasicRecommendation(taggedStudent, engineData) {
  const result = {
    student_id: taggedStudent?.student_id || "",
    matchedExtensions: [],
    matchedCases: [],
    diagnostics: []
  };

  const extLayer = engineData?.layerData?.extension_library;
  const caseLayer = engineData?.layerData?.admission_case_library;
  const evalLayer = engineData?.layerData?.evaluation_framework;
  const curriculumLayer = engineData?.layerData?.curriculum_guides;

  const templateLibrary = extLayer?.active_template_library?.data?.templates || [];
  const caseLibrary = caseLayer?.active_case_library?.data?.cases || [];
  const evalCriteria = evalLayer?.active_framework?.data?.criteria || [];
  const guideCriteria = curriculumLayer?.active_guide_library?.data?.guides || [];

  const themeTags = new Set(taggedStudent?.theme_tags || []);
  const methodTags = new Set(taggedStudent?.method_tags || []);
  const majorTags = new Set(taggedStudent?.major_tags || []);

  // 1) 확장 템플릿 간단 매칭
  for (const tpl of templateLibrary) {
    const tplThemes = tpl.theme_tags || [];
    const tplMethods = tpl.method_tags || [];
    const themeHit = tplThemes.filter(t => themeTags.has(t)).length;
    const methodHit = tplMethods.filter(t => methodTags.has(t)).length;
    const score = themeHit * 2 + methodHit;

    if (score > 0) {
      result.matchedExtensions.push({
        template_id: tpl.id,
        title: tpl.title,
        score,
        reason: `theme ${themeHit}개, method ${methodHit}개 매칭`
      });
    }
  }

  result.matchedExtensions.sort((a, b) => b.score - a.score);

  // 2) 합격생 케이스 간단 매칭
  for (const cs of caseLibrary) {
    const caseMajors = cs?.student_profile?.major_tags || [];
    const caseMethods = cs?.student_profile?.method_tags || [];
    const majorHit = caseMajors.filter(t => majorTags.has(t)).length;
    const methodHit = caseMethods.filter(t => methodTags.has(t)).length;
    const score = majorHit * 2 + methodHit;

    if (score > 0) {
      result.matchedCases.push({
        case_id: cs.id,
        university: cs.university,
        major: cs.major,
        score,
        reason: `major ${majorHit}개, method ${methodHit}개 매칭`
      });
    }
  }

  result.matchedCases.sort((a, b) => b.score - a.score);

  // 3) 평가 진단 문구 예시
  if ((taggedStudent?.evidence_tags || []).includes("객관적 사실")) {
    result.diagnostics.push("객관적 사실 중심 기록으로 해석 가능");
  }
  if ((taggedStudent?.thinking_tags || []).includes("구조화")) {
    result.diagnostics.push("구조화된 탐구 흐름이 드러남");
  }

  // 4) 교육과정 가이드 진단 예시
  if ((taggedStudent?.subject || "").includes("생명") && (taggedStudent?.activity_level === "심화")) {
    result.diagnostics.push("심화 생명과학 계열은 선행/위계 점검 필요");
  }

  result.meta = {
    loadedEvaluationCriteria: evalCriteria.length,
    loadedCurriculumGuides: guideCriteria.length
  };

  return result;
}
