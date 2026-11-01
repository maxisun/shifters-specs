# 22: Audit Log query

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** A read-only, append-only Audit Log query for Managers and Admins, scoped before pagination, exposing the documented action vocabulary without copying Credential values into it.

**Blocked by:** 06 — Facilities and Manager invitations

**Status:** ready-for-agent

**Revision:** 1

- [ ] `listAuditLogs` filters by actor, the stable action vocabulary, resource type, resource identifier, and date range.
- [ ] A Manager sees only their own Facility; an Admin sees the selected Facility or all Facilities; a Nurse is denied (ACC-23, ACC-28).
- [ ] Facility scope is applied before filtering and pagination, and no query parameter can widen it.
- [ ] Entries expose actor, action, resource, Facility, timestamp, and relevant reason; Withdrawal entries expose manual versus automatic type but no eligibility or Credential field values.
- [ ] No endpoint can edit or delete an entry, and routine login and logout entries are not required (ACC-28, ACC-30).

**Spec:** `docs/specs/domain.md` (Audit Log), `docs/specs/permissions.md`, `docs/specs/acceptance.md` (ACC-28, ACC-30)
