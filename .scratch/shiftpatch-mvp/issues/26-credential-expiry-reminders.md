# 26: Credential expiry reminders

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Scheduled expiry email for each current Credential at 30, 7, and 1 day before expiry and once on expiry, each sent at most once, cancelled when the Credential is replaced.

**Blocked by:** 08 — Credentials and document access

**Status:** ready-for-agent

**Revision:** 1

- [ ] Each current Credential schedules a reminder at 30, 7, and 1 day before expiry, and one on the expiry date (ACC-10).
- [ ] Replacing a Credential cancels its pending reminders, and historical Credentials never generate reminders (ACC-10).
- [ ] Each scheduled reminder is sent at most once, and a restart or re-run does not duplicate an already-sent reminder.
- [ ] The expired email is sent once when a current Credential reaches expiry, and does not revoke or delete the record.
- [ ] A newly eligible replacement does not suppress reminders for other current Credentials.
- [ ] Reminders identify the affected Credential and its expiry, are sent to the Nurse only, and a delivery failure does not alter Credential state. The send time within the offset day is an implementation choice and is recorded in the backend repo.

**Spec:** `docs/specs/workflows.md` (notification matrix), `docs/specs/domain.md`, `docs/specs/acceptance.md` (ACC-10)
