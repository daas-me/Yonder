# Yonder Release Validation Evidence

**Date:** 2026-11-09  
**Scope:** Local implementation and release checks, excluding Supabase migration and Vercel deployment.

## ClickUp task evidence

| Task | Result | Evidence |
|---|---|---|
| YON-15 — Sorted overview and budget calculations | Implemented | Trip overview, chronological activity ordering, and budget totals are implemented. Frontend tests, type-check, and production build pass. |
| YON-19 — README setup instructions | Updated | The frontend instructions now say to open a new PowerShell terminal at the repository root before running `Set-Location .\frontend`, avoiding the incorrect root `npm run dev` command. |
| YON-20 — Final review/build evidence | Verified locally; not committed | Backend: `.\mvnw.cmd test` passed (11 tests). Frontend: `corepack pnpm test` passed (4 tests), `corepack pnpm exec tsc --noEmit` passed, and `corepack pnpm run build` passed. `git diff --check` passed. Changes remain uncommitted in the worktree. |
| YON-21 — Acceptance demo rehearsal | Partial; repeat required for Maps | In an isolated H2-backed local app, created a new account, confirmed the starter trip appeared, opened its budget, logged PHP 100 actual spending and confirmed it remained after reload, deleted the sample trip and confirmed the empty state, then deleted the temporary account. Google Maps requests returned HTTP 503 during the rehearsal because the project quota is exhausted; map-dependent acceptance should be rehearsed again after quota access is restored. |
| YON-28 — Budget breakdown, actual spending, and CSV export | Implemented and regression-tested | Cancelled activities now export a budgeted amount of PHP 0.00 and calculate variance against that amount, consistent with budget totals. A regression test verifies cancelled rows and the total row. The UI export action was exercised, but the integrated browser did not expose a download event. |
| YON-30 — Manual browser, responsive, and accessibility evidence | Preliminary checks pass; full accessibility audit remains | The trip and budget-modal screens had no horizontal document overflow at 320px and 375px; the account screen had no horizontal overflow at 320px. The starter cover loaded. The budget breakdown is exposed as a named dialog and Escape closes it; account-page buttons checked had accessible names. No screen-reader or full color-contrast audit was performed. |

## Follow-up needed

- Rehearse the full acceptance demo, including map behavior, after the Google Maps quota is available.
- Complete a screen-reader and color-contrast review before recording YON-30 as a comprehensive accessibility pass.
- Attach this evidence to the corresponding ClickUp tasks and update their statuses. ClickUp was not accessible from this workspace, so no task statuses or comments were changed.

YON-31 (Supabase migration) and YON-32 (Vercel deployment) were intentionally out of scope.
