# 19: Timesheet screens

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Timesheet queue and forms for all three roles: a Nurse submitting or replacing their own hours, a Manager entering hours on a Nurse's behalf, and a Manager finalizing or correcting them.

**Blocked by:** 05 — Authentication screens; 18 — Timesheets: submit and finalize

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/timesheets` separates awaiting submission, submitted and awaiting finalization, and final, scoped to the caller's role and Facility.
- [ ] The Nurse form takes numeric hours greater than zero and an optional note, and can replace a non-final submission.
- [ ] On-behalf entry appears only when no submission exists and explains that an existing submission must be corrected during finalization rather than overwritten.
- [ ] Finalization shows scheduled hours separately, requires a visible reason for changed hours, and never calculates pay.
- [ ] A final Timesheet renders read-only, and the Nurse sees submitter, finalizer, final hours, and any correction reason.
- [ ] The submission flow is usable at 320 CSS pixels with keyboard only and states its outcome explicitly.

**Spec:** `docs/specs/frontend.md`, `docs/specs/acceptance.md` (ACC-19–ACC-22, ACC-31, ACC-33)
