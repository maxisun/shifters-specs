# 25: Inspector Export action

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The single export action on the Facility and Nurse screens, with a scope confirmation that says exactly which Nurses and documents are included, and honest handling when generation fails.

**Blocked by:** 07 — Facility admin and invitation acceptance; 10 — Associated Nurses directory; 24 — Inspector Export generation

**Status:** ready-for-agent

**Revision:** 1

- [ ] The action is scoped to one Facility and appears only for authorized Managers and Admins.
- [ ] The confirmation names the Facility and states that current and historical Credential documents for all Associated Nurses are included.
- [ ] Success opens only the short-lived authorized download returned by the backend; nothing is cached and no permanent link is constructed.
- [ ] A generation failure is shown as a failure, never as success and never by offering a partial or stale file.
- [ ] The action does not modify or appear to modify Credential or Shift state.

**Spec:** `docs/specs/frontend.md`, `docs/specs/acceptance.md` (ACC-27)
