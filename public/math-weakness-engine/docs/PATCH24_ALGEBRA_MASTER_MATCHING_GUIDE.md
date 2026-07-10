# Patch24 — Algebra Master Problem-Type Matching

## Purpose
Student-uploaded problems are classified against the algebra master problem-type bank. Book data is used only as example, variant, and weak supporting evidence.

## Runtime
- `assets/algebra_master_matcher.js`
- `MathWeaknessEngine.classifyAlgebraProblem(extracted)`
- `MathWeaknessEngine.sanitizeStudentDiagnosis(result)`

## Status policy
- `registered_type_match`: stable master-type match
- `variant_match`: existing type, new/uncertain variant
- `new_item_candidate`: teacher review required
- `new_type_candidate`: possible new master type
- `blocked`: insufficient or conflicting evidence

## Student output
Source book names, source IDs, source question numbers, and PDF filenames must not be displayed.
