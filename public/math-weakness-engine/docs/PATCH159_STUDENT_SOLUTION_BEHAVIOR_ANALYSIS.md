# PATCH159 — Student Solution Behavior Analysis

## Purpose

This patch adds a multi-item analysis layer above the existing problem-type diagnosis. It distinguishes correct completion, wrong completion, partial stop, blank/unknown, and answer-only responses, then infers repeated student solution behaviors.

## Main profiles

- Fragmented recall dependence
- High accuracy / low coverage
- Surface pattern matching
- Missing start procedure
- Transfer failure
- Incomplete procedure
- Variable-role confusion
- Missing condition checks
- Missing final verification
- Multi-condition overload

## Student output

The student result card shows only:

1. What the student can currently do
2. Where the student stops
3. A short solution routine to use next

Internal profile IDs, detailed metrics, and evidence remain in the teacher section.

## AI extraction contract

For visible problem-solving material, the worker should include all visible questions where possible, not only wrong answers. Each item should use one response status:

- CORRECT_COMPLETE
- WRONG_COMPLETE
- PARTIAL_STOP
- BLANK_UNKNOWN
- ANSWER_ONLY
- UNKNOWN

## Upload

Upload the folders and files in this patch ZIP to the repository root while preserving paths.
