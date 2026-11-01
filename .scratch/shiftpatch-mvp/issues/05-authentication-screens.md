# 05: Authentication screens

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The public and authentication routes a Nurse meets before any operational screen, including the unverified-account redirect and the generic password-reset flow.

**Blocked by:** 03 — Frontend walking skeleton; 04 — Nurse accounts and sessions

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/`, `/login`, `/register/nurse`, `/verify-email`, `/forgot-password`, and `/reset-password` exist and match the purposes in the frontend requirements.
- [ ] Registration captures full name, email, and password only; there is no role selector and no privileged registration path.
- [ ] An authenticated but unverified user is directed to `/verify-email` and cannot reach role-based routes.
- [ ] The reset request shows identical copy whether or not the account exists, and invalid or expired verification and reset tokens produce a recoverable state with a resend action.
- [ ] There is no public Shift listing and no public Admin or Facility Manager registration.
- [ ] Forms are usable at 320 CSS pixels with keyboard only, have visible focus and labelled errors, and never place credentials, tokens, or email addresses in analytics or browser logs.

**Spec:** `docs/specs/frontend.md`, `docs/specs/non-functional.md`, `docs/specs/acceptance.md` (ACC-03, ACC-31)
