# 08: Credentials and document access

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** A Nurse's current Nursing License and TB Test Result, each holding exactly one current record plus retained history, with privately stored documents that only authorized callers can download — and the Associated Nurse reads that make those documents reachable by the Facility's Managers.

**Blocked by:** 04 — Nurse accounts and sessions

**Status:** ready-for-agent

**Revision:** 1

- [ ] A Nurse can create or replace one current Credential of each type, supplying exactly the contract's metadata; the prior record and its document remain retrievable as history, and there is no delete operation (ACC-05).
- [ ] Documents live in a private Cloudflare R2 bucket with metadata in PostgreSQL; no document or export is ever publicly reachable.
- [ ] `getCredentialDownload` returns an authorized stream or a short-lived signed URL, never a permanent one, and applies the same check to current and historical documents.
- [ ] Credential download links expire within five minutes and are treated as bearer tokens: reusable until expiry, never logged, never audited, and never sent to analytics.
- [ ] Uploads are validated before storage: the declared type against the PDF/JPEG/PNG allowlist, a configured maximum size, and magic-byte inspection; original filenames never become storage keys or download filenames.
- [ ] `listAssociatedNurses`, `getNurseProfile`, and `getNurseCredentials` expose a Nurse only when that Nurse has a current or historical successful claim at the caller's Facility, and that access survives a later Withdrawal or Cancellation (ACC-24).
- [ ] A Nurse who has only browsed an Open Shift is invisible to that Facility's Managers, and a Manager cannot reach another Facility's Nurses regardless of supplied identifiers (ACC-23).
- [ ] Facility and association scope are applied before filtering and pagination.
- [ ] `CREDENTIAL_CREATED` and `CREDENTIAL_REPLACED` are audited without field values, and `credential_uploaded` is emitted after commit with `credential_type` and `is_replacement` only.
- [ ] Replacement does not yet reevaluate Filled Shifts — that hook belongs to 16, and no Filled Shift can exist through the product before 14 ships, so the replacement response correctly reports no withdrawals for every reachable state.

**Spec:** `docs/specs/domain.md`, `docs/specs/workflows.md`, `docs/specs/permissions.md`, `docs/specs/non-functional.md`, `docs/specs/acceptance.md` (ACC-05, ACC-23, ACC-24)
