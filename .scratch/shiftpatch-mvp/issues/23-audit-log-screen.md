# 23: Audit Log screen

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Audit Log reader for Managers and Admins, with filters inside their permitted scope and rows that show what happened without exposing Credential values.

**Blocked by:** 22 — Audit Log query

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/audit-log` is reachable by Managers and Admins only and hidden entirely for Nurses.
- [ ] Actor, action, resource type, and date filters stay within the caller's Facility scope, and a filter cannot widen that scope.
- [ ] Rows show actor name and role, action, resource, timestamp, Facility, and reason, using the documented action vocabulary rather than free-form labels.
- [ ] Withdrawal rows show manual versus automatic type and never Credential field values, TB outcomes, license numbers, or document contents.
- [ ] There is no edit or delete control anywhere in the view.
- [ ] Empty, loading, error, and permission states are explicit, and the table remains usable on narrow screens.

**Spec:** `docs/specs/frontend.md`, `docs/specs/domain.md` (Audit Log), `docs/specs/acceptance.md` (ACC-28)
