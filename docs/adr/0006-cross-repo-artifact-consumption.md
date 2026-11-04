# Implementation repositories consume specs by tag and contract by release asset

`shifters-specs` is the sole authority for product specifications, work items, and the API contract. The backend and frontend repositories never clone it, never follow `main`, and never hold a writable copy. They take two independent pins from it:

- **Work specification and tickets:** read from the specs checkout, pinned by the annotated tag `tickets-mvp-vX.Y.Z` and its full commit SHA, and recorded in the consumer as `contracts/work-spec.lock.json`.
- **API contract:** published as an immutable, SemVer-versioned release, and consumed as an exact HTTPS tarball URL in `package.json`; the package-manager lockfile's `integrity` is the byte proof. The explicit four-field lock file is the equivalent shape for a non-Node consumer.

Each consumer adopts a new pin in its own reviewed pull request. Nothing updates in the background.

## Rejected alternatives

- **Git submodule.** Every consumer would carry the entire specs checkout, need extra commands after each clone, and still record a commit. A tag plus a release asset gives the same exactness with none of that.
- **Vendored copy or subtree.** Two writable copies of one contract. Drift is silent, and a consumer can patch its copy without changing the authority.
- **npm or GitHub Packages registry.** A registry is not needed once the release asset is an installable tarball. GitHub Packages requires authentication even for public packages and accepts only classic personal access tokens.
- **Generating the contract from backend annotations.** This inverts the authority: the frontend would wait for the backend to implement before it could generate, and the description would record what was built instead of deciding what to build. A backend-generated document is a diagnostic, compared against the pin, never published.
- **A custom download and sync script.** npm and pnpm already download the exact URL and fail closed when the bytes do not match the recorded `integrity`.

## Consequences

- The specifications repository must publish releases, which it does with the procedure in [`docs/specs/api/RELEASING.md`](../specs/api/RELEASING.md).
- Consumers follow [`docs/guides/contract-consumption.md`](../guides/contract-consumption.md); the pin format is owned by [`docs/specs/api/CONSUMER-PINS.md`](../specs/api/CONSUMER-PINS.md).
- A contract release and the consumer-facing guide must move together; `scripts/check-release-pins.mjs` enforces this in CI.
- Every contract change costs one release plus one adoption pull request per consumer. That is the price of a reviewable boundary.
- The frontend repository adopts the same pin once it exists.

Rationale and sources: [consuming a specifications repository](../research/specs-repo-consumption.md) and [the consumption flow](../research/spec-consumption-flow.md).
