# 24: Inspector Export generation

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** One action that gathers every current and replaced Credential document for a Facility's Associated Nurses into a privately stored ZIP with a metadata manifest, and hands back only a short-lived authorized download.

**Blocked by:** 08 — Credentials and document access; 16 — Withdrawal, Cancellation, No-show

**Status:** ready-for-agent

**Revision:** 1

- [ ] `createInspectorExport` scopes to exactly one Facility: an Admin names it, and a Manager's Facility is derived server-side.
- [ ] The Nurse population is every Nurse with at least one current or historical successful claim at that Facility, regardless of the Shift's later outcome (ACC-27).
- [ ] The ZIP contains every such Nurse's current and replaced Nursing License and TB Test Result documents plus a manifest of Nurse and Credential metadata.
- [ ] The ZIP is stored privately in Cloudflare R2 and returned only through a short-lived authorized download; no permanent public URL exists and no partial file is exposed.
- [ ] The export download link expires within fifteen minutes, and object keys are opaque and server-generated.
- [ ] Generation modifies no Credential or Shift state, and its failure cannot imply success.
- [ ] `INSPECTOR_EXPORT_CREATED` is audited without document contents or sensitive metadata, and `inspector_export_created` is emitted after storage succeeds with `facility_id` and `nurse_count` only.

**Spec:** `docs/specs/workflows.md`, `docs/specs/domain.md` (Inspector Export), `docs/specs/non-functional.md`, `docs/specs/acceptance.md` (ACC-27)
