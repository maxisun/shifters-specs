# API contract validation and release procedure

The specifications repository owns the API contract. Every change to it is
validated by CI, and every accepted state that consumers pin is published as an
immutable, SemVer-versioned release. Consumers never follow `main`.

## Continuous validation

`.github/workflows/contract-validate.yml` runs on every pull request and on
every push to `main` that touches `docs/specs/api/**`, `docs/guides/**`, the
scripts, or the contract workflows. It performs five checks:

1. **Lint** — Redocly CLI with the checked-in `redocly.yaml` ruleset.
2. **Pin consistency** — `scripts/check-release-pins.mjs` proves the sidecar,
   the manifest, both sample locks, and the worked example in
   `CONSUMER-PINS.md` all describe the same bytes.
3. **Structure and references** — `oasdiff validate --fail-on WARN`.
4. **Breaking changes** — `oasdiff breaking --fail-on WARN` against the
   `openapi.yaml` inside the most recent published release. Before the first
   release exists, the step records that the change establishes the baseline
   instead of failing.
5. **Packager smoke test** — builds the release bundle in a temporary
   directory and installs it with npm, so a bundle that cannot be consumed
   cannot be merged.

A second job, **Lint workflows**, runs `actionlint` over every workflow file.

Nothing else in this repository is gated by CI.

## Pinned tools and validation

Use Redocly CLI **2.72.1** with the checked-in `redocly.yaml` ruleset and
oasdiff **1.35.0**. Do not substitute `latest`; update the pinned versions in
the workflows and review any changed findings deliberately.

```sh
npx --yes @redocly/cli@2.72.1 lint \
  --config docs/specs/api/redocly.yaml \
  docs/specs/api/openapi.yaml

oasdiff validate --fail-on WARN docs/specs/api/openapi.yaml
```

Redocly's `recommended` ruleset checks the style and API conventions. The
license rule is disabled because this API contract has no declared license;
the release process must not invent one. oasdiff validates OpenAPI structure
and reference resolution. Both commands must finish without findings before a
contract change is accepted.

## Compatibility review

The first release (`api-v1.0.0`) establishes the comparison baseline. For each
subsequent release, download and verify the most recent stable release bundle,
extract its `openapi.yaml`, and compare it with the candidate:

```sh
oasdiff breaking --fail-on WARN \
  previous/package/openapi.yaml docs/specs/api/openapi.yaml
```

`WARN` and `ERR` findings block the normal release path. A waiver has two
parts, and both belong in the same pull request:

1. A reviewed record at `docs/specs/api/waivers/<target-version>.md`, based on
   `TEMPLATE.md`. It must identify the exact oasdiff finding, the compatibility
   impact, the mitigation or migration plan, an expiry or revisit point, and
   the approving review.
2. The matching pattern in `docs/specs/api/waivers/err-ignore.txt` or
   `warn-ignore.txt`, which is what the CI gate reads.

Never suppress all findings with a blanket pattern. A waiver that changes the
released bytes still needs a SemVer-appropriate bump.

Use SemVer for `info.version` and the release tag: major for incompatible API
changes, minor for backward-compatible functionality, and patch for compatible
corrections. `openapi` remains `3.1.0` unless the pinned validator and intended
generators are known to support a newer dialect.

## Bundle shape

A release asset is an npm-installable tarball. Its `package/` root contains
`package.json`, `openapi.yaml`, `CHANGELOG.md`, `manifest.json`, and a short
`README.md`. The `package.json` exists so npm and pnpm can install the contract
as a dependency and verify its bytes through the lockfile `integrity` value; the
OpenAPI description remains the payload. A consumer that does not use npm can
untar the same asset.

`manifest.json` records `contractVersion`, `oasVersion`, the full 40-character
`sourceCommit`, the release tag, and every accepted work item with its revision
and full-commit permalink.

## Prepare and publish a release

1. Update `info.version` in `openapi.yaml` and add the entry to `CHANGELOG.md`.
2. Build the bundle from the repository root:

   ```sh
   node scripts/build-contract-release.mjs --version X.Y.Z
   ```

   The script reads `info.version` and refuses a version that does not match
   it. It writes `shiftpatch-api-X.Y.Z.tgz`, its `.sha256` sidecar, and
   `manifest.json` under `docs/specs/api/releases/api-vX.Y.Z/`. It refuses to
   overwrite an existing bundle unless `--force` is given, and `--force` is
   safe only before publication.
3. Commit the description, the changelog, and the built bundle in one pull
   request. The reviewed bytes are the published bytes.
4. Merge to protected `main` only after the required approval. Releases must
   never be cut from a branch or an unmerged commit.
5. Run the **Contract release** workflow from `main` with the version. The
   `contract-release` environment must require a reviewer. The workflow
   re-validates the description, verifies the committed checksum, refuses an
   existing tag or release, creates a draft with all assets, publishes it, and
   verifies the attestation and asset digest.

   GitHub release immutability must be enabled in the repository settings
   before the first release. Publishing a draft only after all assets are
   attached avoids an incomplete immutable release.
6. Update the consumer pins. Backend and frontend adopt the same release in
   their own reviewed changes; neither follows a moving branch or `latest`
   URL. See `CONSUMER-PINS.md`.

## Provider drift

The backend may export an OpenAPI document from its NestJS decorators, but that
document is a **diagnostic only**. It must never be published as, or treated
as, a second authority. Compare it against the pinned description when you want
to catch implementation drift:

```sh
oasdiff breaking --fail-on WARN \
  node_modules/@maxisun/shiftpatch-api/openapi.yaml generated/openapi.json
```

If the implementation disagrees with the contract, change the contract in this
repository, publish a new version, and adopt it. Do not patch a consumer copy.
