# 12: Operational Shift screens

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Facility Manager and Admin Shift workspace: a filtered operational list, a creation form with only reservation fields, and a detail page that explains what is and is not editable.

**Blocked by:** 07 — Facility admin and invitation acceptance; 11 — Publish and edit Shifts

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/shifts` shows the Manager's Facility Shifts, or all Facilities for an Admin, with status and date filters and a Facility filter in the Admin view.
- [ ] The creation form contains Facility (Admin only), start, and end, and nothing else; the Manager's Facility is shown read-only.
- [ ] Editing start and end is offered only while the Shift is `OPEN`, and a Filled Shift explains that material changes require Cancellation and a new Shift.
- [ ] Assigned Nurse identity appears only to authorized operational roles and never in the Nurse-facing views.
- [ ] Empty, loading, validation, permission, and error states are explicit; tables stay usable on narrow screens via cards or contained horizontal scrolling.

**Spec:** `docs/specs/frontend.md`, `docs/specs/acceptance.md` (ACC-11, ACC-15)
