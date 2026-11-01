# 10: Associated Nurses directory

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Facility-scoped directory that lets a Manager or Admin find a Nurse who has claimed at the Facility, review current and historical Credential metadata, and download their documents.

**Blocked by:** 07 — Facility admin and invitation acceptance; 08 — Credentials and document access

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/nurses` lists only Associated Nurses for the Manager's Facility, or the selected Facility for an Admin, showing name and contact information.
- [ ] `/app/nurses/:nurseId` shows current and historical Credential metadata for that Nurse and offers authorized document downloads.
- [ ] Neither the list, the detail page, nor any filter can surface a non-associated Nurse or data from another Facility.
- [ ] A Nurse cannot reach either route at all.
- [ ] Loading, empty, permission, and error states are explicit; the list remains usable on narrow screens and from the keyboard.

**Spec:** `docs/specs/frontend.md`, `docs/specs/permissions.md`, `docs/specs/acceptance.md` (ACC-24)
