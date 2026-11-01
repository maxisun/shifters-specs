# 13: Nurse discovery and eligibility

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** A Nurse's view of Open Shifts — soonest first, filterable, and annotated with current eligibility and every applicable reason — served by one evaluator that Claim will reuse unchanged.

**Blocked by:** 08 — Credentials and document access; 11 — Publish and edit Shifts

**Status:** ready-for-agent

**Revision:** 1

- [ ] `listShifts` for a Nurse returns Open Shifts only, sorted by soonest start, filterable by Facility, jurisdiction, and start-date range (ACC-12).
- [ ] Each Shift carries `eligibility.eligible` and the complete set of applicable `EligibilityReason` values, including every reason that applies at once (ACC-12).
- [ ] Reasons cover a missing, expired, or not-valid-through-end License; jurisdiction mismatch; a missing, non-negative, or not-valid-through-end TB Test Result; and an overlapping Filled Shift (ACC-06, ACC-07, ACC-08).
- [ ] Expiry is valid through the end of the expiry date in the Facility's time zone, so a Shift ending on that date qualifies and one ending later does not (ACC-06).
- [ ] No other Nurse's identity, contact details, claim activity, or current Shift state is exposed.
- [ ] The evaluator lives behind one interface and is reused verbatim by the Claim path rather than reimplemented there.

**Spec:** `docs/specs/domain.md` (eligibility rules), `docs/specs/frontend.md`, `docs/specs/acceptance.md` (ACC-06, ACC-07, ACC-08, ACC-12)
