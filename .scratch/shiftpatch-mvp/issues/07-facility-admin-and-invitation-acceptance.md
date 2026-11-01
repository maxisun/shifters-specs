# 07: Facility admin and invitation acceptance

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Admin screens that create and manage Facilities, plus the invitation acceptance page that turns an invited person into a Facility Manager.

**Blocked by:** 05 — Authentication screens; 06 — Facilities and Manager invitations

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/facilities` lists Facilities and creates one with name, jurisdiction, and time zone.
- [ ] `/app/facilities/:facilityId` edits the name only and shows jurisdiction and time zone as read-only, with no control that implies they can change.
- [ ] `/invitations/accept` works unauthenticated, collects full name and password, and lands the new Manager on their Facility's dashboard; an invalid or expired invitation shows a recoverable error.
- [ ] Admin-only routes are unreachable for Managers and Nurses, and a server-side rejection renders a permission state rather than a broken page.
- [ ] Empty, loading, validation, and error states are explicit, and the screens remain keyboard operable.

**Spec:** `docs/specs/frontend.md`, `docs/specs/acceptance.md` (ACC-01, ACC-02)
