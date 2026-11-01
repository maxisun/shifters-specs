# 06: Facilities and Manager invitations

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Admin-created Facilities with a fixed jurisdiction and time zone, and Facility Manager accounts that arrive only by invitation and belong to exactly one Facility.

**Blocked by:** 04 — Nurse accounts and sessions

**Status:** ready-for-agent

**Revision:** 1

- [ ] An Admin creates a Facility with name, jurisdiction, and IANA time zone; jurisdiction and time zone are fixed thereafter and only the name is editable (ACC-01).
- [ ] Admin accounts exist only through an operational provisioning path; public registration cannot create one.
- [ ] `inviteFacilityManager` creates a single-use invitation bound to that Facility and role, and acceptance creates a verified Manager account bound to that Facility; the invitation cannot select another Facility or role (ACC-01).
- [ ] Two accepted Managers for one Facility have equal permissions, and neither can act on another Facility (ACC-02).
- [ ] Facility reads are scoped: an Admin sees any Facility, a Manager only their own, a Nurse only what Open Shift discovery needs.
- [ ] `FACILITY_CREATED`, `FACILITY_UPDATED`, `MANAGER_INVITED`, and `MANAGER_INVITATION_ACCEPTED` are audited, and `facility_created` and `facility_manager_invited` are emitted after commit.

**Spec:** `docs/specs/workflows.md`, `docs/specs/domain.md`, `docs/specs/permissions.md`, `docs/specs/acceptance.md` (ACC-01, ACC-02)
