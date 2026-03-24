// integrated_engine_bootstrap.js
// 기존 페이지에서 바로 붙여 쓸 수 있는 부트스트랩 예시

import { loadIntegratedEngine, runBasicRecommendation } from "./integrated_engine_loader.js";

export async function bootIntegratedEngine(taggedStudent, options = {}) {
  const integratedIndexPath = options.integratedIndexPath || "../integrated_engine_index.json";
  const engine = await loadIntegratedEngine(integratedIndexPath);
  const basic = runBasicRecommendation(taggedStudent, engine);

  // output_schema 형식에 맞춘 최소 출력 조립
  return {
    student_id: taggedStudent?.student_id || "",
    summary: [
      basic.matchedExtensions?.[0]
        ? `가장 강한 확장 추천은 ${basic.matchedExtensions[0].title}입니다.`
        : "강한 확장 추천이 아직 없습니다.",
      basic.matchedCases?.[0]
        ? `가장 유사한 합격생 패턴은 ${basic.matchedCases[0].university} ${basic.matchedCases[0].major}입니다.`
        : "유사 합격생 패턴이 아직 없습니다.",
      basic.diagnostics?.length
        ? basic.diagnostics[0]
        : "기본 진단 데이터를 더 보강할 필요가 있습니다."
    ],
    record_diagnosis: {
      one_line: basic.diagnostics?.join(" / ") || "기본 진단 결과 없음",
      strengths: basic.diagnostics || [],
      limits: []
    },
    curriculum_check: {
      fit: "점검 필요",
      selected_subjects_comment: "curriculum_guides와 실제 선택과목 데이터를 추가로 연결해야 함",
      sequence_comment: "심화 과목 선택 여부는 선행 과목과 함께 검토"
    },
    extension_recommendations: (basic.matchedExtensions || []).slice(0, 3).map((x, i) => ({
      template_id: x.template_id,
      title: x.title,
      reason: x.reason,
      priority: i + 1
    })),
    admission_case_matches: (basic.matchedCases || []).slice(0, 3).map(x => ({
      case_id: x.case_id,
      university: x.university,
      major: x.major,
      match_reason: x.reason,
      similarity_level: x.score >= 4 ? "상" : (x.score >= 2 ? "중" : "하")
    })),
    evaluation_interpretation: {
      academic: "기본 판정 전",
      career: "기본 판정 전",
      community: "기본 판정 전",
      overall: basic.diagnostics?.join(" / ") || "추가 해석 필요"
    },
    action_plan: [
      {
        step: 1,
        title: "학생 원문 태그 정교화",
        goal: "theme/method/thinking/major/evidence 태그 정확도 향상"
      },
      {
        step: 2,
        title: "상위 확장 템플릿 1~3개 검토",
        goal: "실제 학교 상황에 맞는 탐구안 선택"
      }
    ],
    report_design: [],
    notes: "이 출력은 bootstrap 단계의 최소 결과입니다. 기존 페이지 데이터와 연결하면 더 정교해집니다."
  };
}
