# 17: My Shifts and terminal actions

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Nurse's own claim history, and the Withdraw, Cancel, and No-show actions that appear on Shift detail according to role and state — each with the consequence stated before it is taken.

**Blocked by:** 12 — Operational Shift screens; 15 — Nurse discovery and Claim UI; 16 — Withdrawal, Cancellation, No-show

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/my-shifts` shows Facility, start and end, and the caller's own outcome of `ACTIVE`, `WITHDRAWN`, `CANCELLED`, `COMPLETED`, or `NO_SHOW`, plus the actions currently permitted.
- [ ] A Withdrawn claim shows whether the Withdrawal was manual or automatic and, when automatic, its eligibility reasons.
- [ ] If another Nurse later fills the same Shift, this screen still shows the caller's `WITHDRAWN` outcome and reveals neither the new assignee nor the Shift's current status.
- [ ] Withdraw appears only for the assigned Nurse before start; Cancel and No-show appear only for authorized Managers and Admins in the states that allow them.
- [ ] Destructive and terminal actions require confirmation that states the consequence before submission.
- [ ] After any transition, the detail view, list, and dashboard refresh immediately rather than waiting for the next poll.

**Spec:** `docs/specs/frontend.md`, `docs/specs/domain.md` (claim history), `docs/specs/acceptance.md` (ACC-16, ACC-17, ACC-18)
