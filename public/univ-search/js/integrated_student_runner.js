// integrated_student_runner.js
import { buildTaggedStudent } from "./student_tag_bridge.js";
import { bootIntegratedEngine } from "./integrated_engine_bootstrap.js";

export async function runIntegratedStudent(studentId, options = {}) {
  const taggedStudent = await buildTaggedStudent(studentId, {
    recordDetailPath: options.recordDetailPath || "../student/record_detail.json",
    rawRecordPath: options.rawRecordPath || "../student/school_record_raw.json"
  });

  const output = await bootIntegratedEngine(taggedStudent, {
    integratedIndexPath: options.integratedIndexPath || "../integrated_engine_index.json"
  });

  return {
    taggedStudent,
    output
  };
}
