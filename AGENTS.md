## Agent skills

### Issue tracker

Planning artifacts and implementation tickets are tracked as local Markdown files under `.scratch/`. Durable implementation-facing specifications live under `docs/specs/` and do not require per-requirement tickets. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.

### API contract

`docs/specs/api/openapi.yaml` is this repository's only machine-readable export, and this repository is its only authority.

- **Changing** the contract: `docs/specs/api/RELEASING.md` — pinned tools, waiver files, release steps.
- **Consuming** it: `docs/specs/api/CONSUMER-PINS.md` for the pin format, `docs/guides/contract-consumption.md` for the ordered adoption sequence.
- **Packaging** a release: `node scripts/build-contract-release.mjs --version X.Y.Z`.
- **Checking** that every pin still agrees: `node scripts/check-release-pins.mjs`.
- **Why** there are two pins and no submodule: `docs/adr/0006-cross-repo-artifact-consumption.md`.

### Toolchain

Node 24 and npm 11; no `gh`, `go`, `oasdiff`, or `actionlint` on a default machine. See `docs/agents/tooling.md`.
