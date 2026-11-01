# 11: Publish and edit Shifts

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Directly published, single-Nurse Shifts that a Facility Manager or Admin can create and, while still Open, reschedule — with Facility and reservation rules enforced server-side.

**Blocked by:** 06 — Facilities and Manager invitations

**Status:** ready-for-agent

**Revision:** 1

- [ ] `createShift` publishes an `OPEN` Shift immediately with a future start and an end after the start; there is no Draft state and no pay, Location, unit, specialty, or instruction data (ACC-11).
- [ ] A Manager's Facility is derived from their account and cannot be supplied by the client; an Admin must name the Facility explicitly.
- [ ] `updateOpenShift` edits start and end only while the Shift is `OPEN`, audits the changed fields, and refuses once the Shift is Filled; a Facility is immutable after creation (ACC-15).
- [ ] `listShifts` and `getShift` are role-scoped: a Manager sees their own Facility, an Admin any Facility, and a Nurse only Open Shifts or a Shift currently assigned to them.
- [ ] Shift responses never include another Nurse's identity except where an operational role is authorized to see the assignee.
- [ ] `SHIFT_CREATED` and `SHIFT_UPDATED` are audited, and `shift_created` and `shift_updated` are emitted after commit with `shift_id` and `facility_id` only.

**Spec:** `docs/specs/domain.md`, `docs/specs/workflows.md`, `docs/specs/permissions.md`, `docs/specs/acceptance.md` (ACC-11, ACC-15)
