# 01: Contract baseline and consumer pin

**Repo:** `shifters-specs` · **Contract:** produces `api-v1.0.0`

**What to build:** Make the API description consumable by both implementation repos at a fixed revision: validate and lint it in CI, gate breaking changes, and publish `api-v1.0.0` as an immutable artifact with a documented consumer lock file, so backend and frontend pin the same bytes.

**Blocked by:** None (can start immediately)

**Status:** done

**Revision:** 1

- [x] The description validates with no unresolved references or structural violations, and lints clean under a pinned ruleset on every change.
- [x] CI diffs the description against the latest released contract and fails on breaking findings; any waiver is explicit and reviewable.
- [x] `api-v1.0.0` is published as an immutable release containing the description bundle, a changelog, a manifest with `contractVersion`, `oasVersion`, and the full `sourceCommit`, and a SHA-256 checksum.
- [x] `info.version` carries the contract version, and the dialect stays at 3.1.0 unless the pinned validators and generators support a newer one.
- [x] The consumer lock-file format is documented and a sample pin is recorded for both consumers, including digest verification and the source commit.
- [x] Releases publish only from protected main after approval.

## Comments

**2026-11-03 — implementation**

Repository work is complete; publication needs repository settings and credentials
that only a maintainer holds.

Delivered:

- `.github/workflows/contract-validate.yml` — Redocly 2.72.1 lint, oasdiff 1.35.0
  validate, breaking gate against the latest published release, waiver ignore
  files, and a packager smoke test that installs the bundle with npm.
- `.github/workflows/contract-release.yml` — `workflow_dispatch` restricted to
  `main`, gated by the `contract-release` environment, verifies the committed
  digest, refuses an existing tag or release, publishes draft-then-final, and
  verifies the attestation and asset.
- `scripts/build-contract-release.mjs` — builds the npm-installable bundle, its
  `.sha256`, and a manifest listing all 27 work items with revisions and
  permalinks.
- `docs/specs/api/RELEASING.md`, `CONSUMER-PINS.md`, and waiver ignore files
  updated to match.
- `api-v1.0.0` rebuilt in npm-pack shape and repinned.

Verified locally: Redocly lint clean; `oasdiff validate --fail-on WARN` clean;
`npm install` of the built asset installs `@maxisun/shiftpatch-api@1.0.0` with a
lockfile `integrity`; the installed manifest reports 27 work items.

Remaining before this ticket closes:

1. Enable immutable releases in the repository settings.
2. Create the `contract-release` environment with a required reviewer.
3. Protect `main`.
4. Push `main` and the `tickets-mvp-v1.0.0` tag.
5. Run the **Contract release** workflow with version `1.0.0`.

The bundle is built from the commit that contains this ticket update, so no
revision bump is needed.

**2026-11-04 — closed**

- `api-v1.0.0` published as an immutable release from `d008f98` with assets
  `shiftpatch-api-1.0.0.tgz`, its `.sha256` sidecar, and `manifest.json`.
- Contract validation and Contract release both succeeded on `main`.
- The public asset was downloaded and verified: its SHA-256 is
  `c4488a519ad42d6e52df15a51dfc159c8baf04ac0d099a68e51b5c254c52cc51`, matching the
  committed sidecar and both sample pins. Its manifest reports contract `1.0.0`,
  dialect `3.1.0`, 27 work items.
- The `pr-to-main` ruleset is active, and the release job runs only from
  `refs/heads/main` after the `contract-release` environment approves it.
- Ticket 02 is unblocked.

The `tickets-mvp-v1.0.0` tag points at `d008f98`, before this status change. It
remains the published work-breakdown package; the dependency is satisfied by
the published release, not by this checkbox.

**Spec:** `docs/research/specs-repo-consumption.md`, `docs/specs/api/openapi.yaml`
