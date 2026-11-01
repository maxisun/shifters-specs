# 04: Nurse accounts and sessions

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Email and password accounts for Nurses, including verification, sign-in, sign-out, session read, and password reset, with the verified-email gate that every later role-based resource depends on.

**Blocked by:** 02 — Backend walking skeleton

**Status:** ready-for-agent

**Revision:** 1

- [ ] `registerNurse` creates a Nurse and only a Nurse; a request carrying Admin or Facility Manager intent grants nothing (ACC-04).
- [ ] Role-based resources reject an authenticated but unverified account until verification succeeds (ACC-03).
- [ ] `login`, `logout`, and `getSession` work with secure session handling; if cookie sessions are used they are `HttpOnly`, `Secure` in the deployed environment, appropriately `SameSite`, and unsafe methods require CSRF protection.
- [ ] Verification and reset tokens are single-use, expiring, stored hashed, and never written to logs or analytics.
- [ ] Password-reset requests and verification resends return the same generic response whether or not the account exists (ACC-03).
- [ ] Authentication provider failures never prevent already committed staffing operations from remaining committed.
- [ ] `nurse_registered` and `email_verified` are emitted only after their operation commits, with no event-specific properties.

**Spec:** `docs/specs/workflows.md`, `docs/specs/permissions.md`, `docs/specs/analytics.md`, `docs/specs/acceptance.md` (ACC-03, ACC-04)
