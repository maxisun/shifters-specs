# 15: Nurse discovery and Claim UI

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Nurse Shift marketplace: browse Open Shifts, read every reason a Claim is unavailable, claim when eligible, and recover cleanly when someone else wins the race.

**Blocked by:** 09 — Nurse Credentials screen; 13 — Nurse discovery and eligibility; 14 — Atomic Claim

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/shifts` shows Facility, local start and end with a time-zone label, and claim status, sorted soonest first.
- [ ] Facility, jurisdiction, and start-date-range filters refetch and preserve the other filters.
- [ ] Shift detail shows current eligibility and every applicable ineligibility reason, with the Claim action disabled and explained whenever the Nurse is ineligible.
- [ ] A successful Claim refreshes detail, list, and dashboard immediately; a `409` refreshes the list and states clearly that the Shift is no longer available.
- [ ] No pay, specialty, unit, recommendation score, application count, or other Nurse's identity is shown.
- [ ] Browsing and Claiming are usable at 320 CSS pixels with keyboard only, and status is never conveyed by color alone (ACC-31).

**Spec:** `docs/specs/frontend.md`, `docs/specs/acceptance.md` (ACC-12, ACC-13, ACC-31)
