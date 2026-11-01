# 14: Atomic Claim

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** First-successful Claim of an Open Shift, where eligibility, availability, and assignment commit as one atomic decision, so two Nurses racing for the same Shift produce exactly one winner.

**Blocked by:** 13 — Nurse discovery and eligibility

**Status:** ready-for-agent

**Revision:** 1

- [ ] `claimShift` re-checks verified email, Open state, future start, every eligibility rule, and overlap inside the same atomic write that assigns the Nurse (ACC-13).
- [ ] Concurrent claims on one Shift yield exactly one success and one `409 SHIFT_NOT_OPEN`, with exactly one assignment and one claim Audit Log entry (ACC-13).
- [ ] An ineligible Claim returns `403 CREDENTIAL_INELIGIBLE` with the applicable reasons; an overlapping Claim returns `409 OVERLAPPING_SHIFT` (ACC-07, ACC-14).
- [ ] Overlap uses half-open intervals, so a Shift beginning exactly when another ends is not an overlap (ACC-14).
- [ ] A successful response carries the authoritative Shift state, and both parties are emailed; a delivery failure cannot roll the Claim back.
- [ ] `SHIFT_CLAIMED` is audited and `shift_claimed` is emitted after commit with `shift_id` and `facility_id` only.

**Spec:** `docs/specs/domain.md` (eligibility rules, transitions), `docs/specs/workflows.md`, `docs/specs/acceptance.md` (ACC-13, ACC-14)
