# 16: Withdrawal, Cancellation, No-show

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Every way a Claim ends before or instead of Completion: the Nurse's own Withdrawal, the automatic Withdrawal caused by a Credential replacement, Facility Cancellation, and No-show — plus the privacy-preserving claim projection the Nurse reads them through.

**Blocked by:** 08 — Credentials and document access; 14 — Atomic Claim

**Status:** ready-for-agent

**Revision:** 1

- [ ] A Nurse withdraws a Filled Shift before its start; it returns to `OPEN`, the assignment clears, history is retained, the Manager is emailed, and the action is audited (ACC-16).
- [ ] Replacing a Credential that breaks eligibility for a future Filled Shift withdraws it automatically before the start, records the reason, audits both events, and emails the Nurse and Manager (ACC-09).
- [ ] A Manager or Admin cancels an Open or Filled Shift before its start; it becomes terminal `CANCELLED`, and an assigned Nurse is emailed (ACC-17).
- [ ] A Manager or Admin records No-show at or after the start on a Filled Shift; it becomes terminal `NO_SHOW`, no Timesheet can finalize it, and the Nurse is emailed (ACC-18).
- [ ] Withdrawal and Cancellation are unavailable at or after the start, and every transition is atomic with its guards.
- [ ] `listMyNurseShifts` returns only the caller's own claim projection — Facility, times, and `MyClaimOutcome` with withdrawal type and reasons — and never reveals a later assignee or the Shift's current status (ACC-16).
- [ ] Withdrawal audits store `withdrawalType` as typed metadata and no Credential field values; `shift_withdrawn`, `shift_cancelled`, and `shift_no_show_recorded` are emitted after commit with only their allowed properties.

**Spec:** `docs/specs/domain.md` (transitions, claim history), `docs/specs/workflows.md`, `docs/specs/acceptance.md` (ACC-09, ACC-16, ACC-17, ACC-18)
