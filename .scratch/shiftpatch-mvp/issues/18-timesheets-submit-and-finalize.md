# 18: Timesheets: submit and finalize

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Actual hours recorded against a Filled Shift — submitted by the Nurse or on their behalf, then finalized unchanged or corrected with a reason — with Completion happening only at finalization.

**Blocked by:** 14 — Atomic Claim

**Status:** ready-for-agent

**Revision:** 1

- [ ] The assigned Nurse submits positive actual hours with an optional note after the Shift ends, and may replace that submission until it is final, including one a Manager entered on their behalf (ACC-19).
- [ ] A Manager or Admin may submit on behalf only when no submission of any kind exists; otherwise the attempt returns `409 TIMESHEET_ALREADY_SUBMITTED` and the only path is finalization with a correction reason (ACC-21, ACC-33).
- [ ] Finalizing the submitted hours makes the Timesheet final and the Shift `COMPLETED`; finalizing different hours requires a correction reason and rejects without one (ACC-19, ACC-20).
- [ ] A final Timesheet is immutable, and the Nurse can read final hours, submitter, finalizer, and any correction reason (ACC-20).
- [ ] A Filled Shift whose end has passed does not become Completed on its own, and a Cancelled or No-show Shift can never finalize (ACC-22).
- [ ] `getTimesheet` and `listTimesheets` are scoped by role and Facility, and the queue distinguishes awaiting submission, submitted, and final.
- [ ] `TIMESHEET_SUBMITTED` and `TIMESHEET_FINALIZED` are audited; `timesheet_submitted` and `timesheet_finalized` are emitted after commit with only their allowed properties.

**Spec:** `docs/specs/domain.md` (Timesheet rules), `docs/specs/workflows.md`, `docs/specs/acceptance.md` (ACC-19–ACC-22, ACC-33)
