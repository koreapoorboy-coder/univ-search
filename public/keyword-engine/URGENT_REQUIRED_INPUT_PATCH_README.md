# Urgent required-input hotfix

Apply after patches 1–5 to:

```text
univ-search/public/keyword-engine/
```

Changed files:

- `index.html`
- `assets/keyword_engine.js`
- `assets/js/mini_worker_generate_bridge_v32.js`

Changes:

1. Front-end required fields are now only `subject`, `taskDescription`, and `career`.
2. Reset targets follow the three-decision screen.
3. A non-visible internal `grade: "고등학생"` compatibility value is sent only to legacy Worker validators until the Worker patch is deployed.
4. The keyword sent to a legacy Worker falls back to interpreted concept/subject and never restores a keyword input field.
5. Cache versions are incremented.

The internal compatibility value is not shown to the student and is not used as a school-name or grade selection criterion.
