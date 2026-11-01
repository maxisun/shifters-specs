# 21: Dashboard and reports screens

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The role-scoped landing dashboard and the operational reports page, both reading the summary endpoint, polling while visible, and refreshing immediately after any mutation.

**Blocked by:** 20 — Dashboard summary and reports

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app` shows role-relevant Shift counts, upcoming Shifts, pending Timesheets, and Credential exceptions, each linking to the corresponding filtered view.
- [ ] The Credential exception count is presented independently of the Shift date filters, matching the backend's 30-day rule.
- [ ] `/app/reports` shows Shifts by status, manual and automatic Withdrawal counts, No-show count, and final actual hours, with inclusive date filters and a Facility filter for Admins only.
- [ ] Active operational views poll at least every five seconds, pause while the tab is hidden, and refresh on becoming visible again (ACC-25).
- [ ] A mutation refreshes the affected detail, list, and dashboard immediately rather than waiting for the next poll.
- [ ] `dashboard_viewed` is emitted on a role-scoped dashboard load with `dashboard_role` only, and no prohibited data accompanies it.
- [ ] Loading, empty, error, and permission states are explicit, and there are no financial widgets or custom report builders.

**Spec:** `docs/specs/frontend.md`, `docs/specs/analytics.md`, `docs/specs/acceptance.md` (ACC-25, ACC-26, ACC-29)
