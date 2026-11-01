# 20: Dashboard summary and reports

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** One role-scoped read model serving both the dashboard and operational reporting: Shift counts by outcome, Withdrawal and No-show counts, final actual hours, pending Timesheets, and expiring Credentials.

**Blocked by:** 16 — Withdrawal, Cancellation, No-show; 18 — Timesheets: submit and finalize

**Status:** ready-for-agent

**Revision:** 1

- [ ] `getDashboardSummary` returns the counts, pending Timesheets, and expiring Credentials for the caller's permitted scope.
- [ ] The expiring-Credential count ignores Shift date filters and covers current Credentials expiring from the current UTC date through the next 30 calendar days, scoped to a Nurse's own Credentials, a Manager's Associated Nurses, or an Admin's selected Facility or all Facilities.
- [ ] With date parameters it returns Shifts by current status, manual and automatic Withdrawal counts, No-show count, and the sum of final Timesheet hours only (ACC-26).
- [ ] Date filters are inclusive and evaluated in each Shift's Facility-local time, including when an Admin aggregates across Facilities.
- [ ] A Manager is fixed to their own Facility and cannot override it; an Admin may filter by Facility; a Nurse receives only their own operational data.
- [ ] Facility scope is applied before filtering and aggregation.

**Spec:** `docs/specs/domain.md` (reporting definitions), `docs/specs/workflows.md`, `docs/specs/acceptance.md` (ACC-25, ACC-26)
