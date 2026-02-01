# Root cause: backend vs extract.py path mismatch

Investigation followed the plan root_cause_backend_vs_extract_mismatch. Root causes and fixes are documented in `__docs/missing_images_20260201/root-cause-report.md`.

**Findings:**
- **Wrong prefix (`__t_`):** JSON was generated with `config.thumbPrefix === "__t_"`. Fix: set `thumbPrefix: "t__"` and regenerate JSON.
- **Spaces / un-normalized chars:** pathcomponent is passed to `getThumbTarget` without normalization; suffix can contain spaces. Fix: normalize pathcomponent (e.g. cleanup_uipathcomponent or filename-safe normalize) before building thumb/link targets; regenerate JSON.

**Documentation:** Frontend user guide `frontend/docs/user-guides/02-configuration.md` was corrected: thumbPrefix default and description now use `t__` (extract.py convention), not `__t_`.

**Artifacts in `__docs/missing_images_20260201/`:**
- root-cause-report.md (full report, integration table, hypotheses, defects, recommended fixes)
- extract-py-path-convention.md (one-page extract.py path convention)
- diagnostic-checklist.md (steps for future mismatch reports)
- sample-url-trace-procedure.md (how to find album/field for a failing URL)

**TODO:** No TODO task for this investigation existed in TODO.md or TODO-summarized.md; none removed.
