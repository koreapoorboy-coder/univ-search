/* Phase 6A Simple Live Intake: browser-side untrusted candidate only. */
(function(root, factory){
  "use strict";
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  root.Phase6SimpleLiveIntake = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  "use strict";

  const CANDIDATE_VERSION = "PHASE6_LIVE_INPUT_CANDIDATE_SIMPLE_V3";
  const INVENTORY_VERSION = "subject-option-inventory-v2_2f5b37986f9ef0e8cb614afd0b64f5ebf0efde96b3f61c5f3c769deb150be2b7";

  function text(value){ return String(value == null ? "" : value); }

  function buildCandidateFromValues(values){
    const input = values || {};
    return {
      candidate_version: CANDIDATE_VERSION,
      raw_authority: {
        school: text(input.school),
        grade: text(input.grade),
        subject_group: text(input.subject_group),
        subject: text(input.subject),
        task_description: text(input.task_description)
      },
      selected_option_metadata: {
        subject_value: text(input.selected_subject),
        subject_group: text(input.selected_subject_group),
        inventory_version: INVENTORY_VERSION
      },
      client_transport_metadata: {
        authority_class: "UNTRUSTED_TRANSPORT_METADATA",
        client_capture_digest: null,
        client_observed_at: null
      }
    };
  }

  function buildCandidateFromDocument(doc){
    const source = doc || (typeof document !== "undefined" ? document : null);
    if(!source) throw new Error("LIVE_INTAKE_DOCUMENT_REQUIRED");
    const school = source.getElementById("schoolName");
    const grade = source.getElementById("grade");
    const subject = source.getElementById("subject");
    const task = source.getElementById("taskDescription");
    const selected = subject && subject.options ? subject.options[subject.selectedIndex] : null;
    return buildCandidateFromValues({
      school: school ? school.value : "",
      grade: grade ? grade.value : "",
      subject: subject ? subject.value : "",
      subject_group: selected && selected.dataset ? selected.dataset.subjectGroup : "",
      task_description: task ? task.value : "",
      selected_subject: selected ? selected.value : "",
      selected_subject_group: selected && selected.dataset ? selected.dataset.subjectGroup : ""
    });
  }

  return Object.freeze({
    CANDIDATE_VERSION,
    INVENTORY_VERSION,
    buildCandidateFromValues,
    buildCandidateFromDocument
  });
});
