# 01: Contract baseline and consumer pin

**Repo:** `shifters-specs` · **Contract:** produces `api-v1.0.0`

**What to build:** Make the API description consumable by both implementation repos at a fixed revision: validate and lint it in CI, gate breaking changes, and publish `api-v1.0.0` as an immutable artifact with a documented consumer lock file, so backend and frontend pin the same bytes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Revision:** 1

- [ ] The description validates with no unresolved references or structural violations, and lints clean under a pinned ruleset on every change.
- [ ] CI diffs the description against the latest released contract and fails on breaking findings; any waiver is explicit and reviewable.
- [ ] `api-v1.0.0` is published as an immutable release containing the description bundle, a changelog, a manifest with `contractVersion`, `oasVersion`, and the full `sourceCommit`, and a SHA-256 checksum.
- [ ] `info.version` carries the contract version, and the dialect stays at 3.1.0 unless the pinned validators and generators support a newer one.
- [ ] The consumer lock-file format is documented and a sample pin is recorded for both consumers, including digest verification and the source commit.
- [ ] Releases publish only from protected main after approval.

**Spec:** `docs/research/specs-repo-consumption.md`, `docs/specs/api/openapi.yaml`
