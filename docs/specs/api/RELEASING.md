# API contract validation and release procedure

The specifications repository remains source-only: it has no CI/CD workflow or
test suite. Maintainers run the checks and publish releases manually, attaching
the command output and compatibility decision to the reviewed change.

## Pinned tools and validation

Use Redocly CLI **2.72.1** with the checked-in `redocly.yaml` ruleset and
oasdiff **1.35.0**. Do not substitute `latest`; update the pinned versions and
review any changed findings deliberately.

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
  previous/openapi.yaml docs/specs/api/openapi.yaml
```

`WARN` and `ERR` findings block the normal release path. Fix them or record an
individual, reviewable waiver in
`docs/specs/api/waivers/<target-version>.md`. A waiver must identify the exact
oasdiff finding, explain the compatibility impact and rationale, state the
mitigation or migration plan, name an expiry/revisit point, and link to the
review that approved it. Never suppress all findings with a blanket waiver.
Include the compatibility report and any approved waiver in the release review.

Use SemVer for `info.version` and the release tag: major for incompatible API
changes, minor for backward-compatible functionality, and patch for compatible
corrections. `openapi` remains `3.1.0` unless the pinned validator and intended
generators are known to support a newer dialect.

## Prepare and publish a release

1. Update `info.version` and `CHANGELOG.md`; validate the candidate and review
   its compatibility report as described above.
2. Submit the change for review and merge it to protected `main` only after the
   required approval. Releases must never be cut from a branch or unmerged
   commit.
3. From the approved `main` commit, prepare
   `shiftpatch-api-X.Y.Z.tar.gz` containing the complete description bundle,
   `CHANGELOG.md`, and `manifest.json`. The manifest must contain
   `contractVersion`, `oasVersion`, and the full 40-character `sourceCommit`.
   Compute a SHA-256 checksum over the final archive and include the checksum
   sidecar as a release asset.
4. Create a draft GitHub release tagged `api-vX.Y.Z` at that exact source
   commit, attach the archive and checksum, review the assets, then publish.
   Enable GitHub release immutability in the repository settings before the
   first release. Publishing a draft only after all assets are attached avoids
   an incomplete immutable release.
5. Update the backend and frontend consumer lock files with the same release
   URL, archive digest, and source commit. Consumers adopt the pin in their own
   reviewed changes; neither follows a moving branch or `latest` URL.

For `api-v1.0.0`, the source contract and release bundle are prepared in this
repository. The GitHub release itself must be published from the protected
`main` commit after its required approval; adding release files here does not
publish or imply that remote release exists.
