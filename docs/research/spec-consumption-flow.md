# Consuming the ShiftPatch specifications and API contract at a pinned version

**Date:** 2026-11-03  
**Scope:** The three-repository ShiftPatch setup: `shifters-specs` (durable Markdown specifications, the 27 MVP tickets, and the hand-authored OpenAPI 3.1.0 contract), `shifters-be` (NestJS + pnpm, GitHub remote `maxisun/shifter-be`), and `shifters-fe` (Vite + React 19 + npm, not yet a Git repository). Covers transport, private-repository mechanics, the two artefact classes, frontend bootstrap order, generated-code policy, the concrete day-one flow for tickets 02 and 03, GitHub-native options, and risks.  
**Terminology below:** “Sourced fact” describes what a standard, vendor, or tool documents or what the three repositories actually contain on 2026-11-03. “Recommendation” is the proposed ShiftPatch policy and its trade-offs. Where documentation is silent, that is stated explicitly rather than filled in.

## Executive recommendation

**Recommendation:** keep the prior research’s model — an immutable, SemVer-versioned contract release plus a separate, commit-pinned work specification — but change the transport. Because both consumers are TypeScript and the specifications repository is **public**, publish the contract release asset as an **npm-installable tarball** and consume it as an **exact HTTPS tarball-URL dependency** in `package.json`. Let npm and pnpm record the URL and `integrity` in their committed lockfiles. Do **not** write a custom download/sync script for the public path, and do **not** create a GitHub Packages registry. The private-repository fallback in §3.2 is the exception, and it is a condition, not the default.

This is a change from `docs/research/specs-repo-consumption.md`, which left one door open: “If both consumers are JavaScript/TypeScript and a private registry already exists, an exactly pinned npm package … may be simpler than custom artifact download code.” There is no private registry, and GitHub Packages is not a neutral substitute: it requires authentication even for public packages and only supports classic personal access tokens. The simpler path is not a registry at all — it is the existing GitHub release asset, repackaged so npm and pnpm can install it natively. The only repository-owned command that remains is a small verify-and-generate wrapper; it does not download anything.

The prior research’s core rules still hold: released bytes never change; each consumer pins an exact version and updates by reviewed pull request; no consumer follows `main` or `latest`; the specifications repository remains the only authority; work specifications and API contracts are versioned separately.

| Decision | Recommendation |
|---|---|
| Contract transport | Exact HTTPS tarball URL in `package.json`; integrity in `package-lock.json` / `pnpm-lock.yaml` |
| Registry | None. Reject GitHub Packages for this setup. |
| Contract release | `api-vX.Y.Z`, immutable release, npm-pack tarball + SHA-256 sidecar + manifest |
| Contract pin | URL in `package.json`; `integrity` in the lockfile; provenance in the bundle’s `manifest.json` |
| Work-spec pin | Annotated tag plus full commit SHA in `contracts/work-spec.lock.json`; no submodule |
| Generated code | Committed; CI uses `openapi-typescript --check` to fail on any drift |
| Codegen | `openapi-typescript` **7.13.0** in both repos; `openapi-fetch` **0.17.0** for the frontend client. No Java, no OpenAPI Generator runtime. |
| Private-repository fallback | `gh release download` + SHA-256 + GitHub App token with `Contents: read` and `Attestations: read` |
| Frontend bootstrap | Git init → baseline CI → TypeScript conversion → contract pin |
| Update automation | None on day one; paired manual pull requests. Revisit Renovate only if release cadence rises. |

### Answers at a glance

| # | Question | Answer |
|---|---|---|
| 1 | Transport | Exact HTTPS tarball-URL dependency; npm/pnpm lockfile `integrity`; no registry and no custom downloader. |
| 2 | Private release mechanics | GitHub App token with `Contents: read` and `Attestations: read`, `gh release download`, SHA-256 check, `gh release verify-asset`; `GITHUB_TOKEN` cannot cross repositories. |
| 3 | Two artefact classes | Contract: URL + lockfile `integrity` + manifest. Work spec: annotated tag + full commit + permalink. The manifest records the work-spec pin; `contract verify` enforces it. |
| 4 | Frontend bootstrap | Specs release → backend proof → FE Git init/CI → TypeScript conversion → the same contract pin. |
| 5 | Generated code | Commit `schema.d.ts`; `openapi-typescript --check` fails the build on drift. |
| 6 | Day-one flow | §6: specs changes first, then backend ticket 02, then frontend ticket 03. |
| 7 | GitHub-native | Use immutable releases and release attestations; reject Packages, reusable/composite workflows, Dependabot for the contract, and submodules. |
| 8 | Risks | §9: local auth, offline builds, token scope, tag immutability, pin drift, codegen drift, extra-repository cost. |

### The four facts that force this answer

1. **The specifications repository is public.** The unauthenticated GitHub API returns `"private": false` for `maxisun/shifters-specs`; the same is true for `maxisun/shifter-be`. A public release asset can be downloaded anonymously by curl, npm, pnpm, and CI. A GitHub Packages npm package still requires a token even when the package is public ([GitHub Packages permissions](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages)).
2. **Both consumers are JavaScript/TypeScript.** npm and pnpm both understand an HTTPS tarball URL and both record a content integrity value in their committed lockfiles. No language-specific packaging is being forced on a non-JS consumer.
3. **The current release bundle is not an npm package.** It contains `openapi.yaml`, `CHANGELOG.md`, and `manifest.json` at the archive root, with no `package.json`. `npm install` on it fails with `ENOENT … package.json` (observed). The specs repository must add a packaging step before either consumer can use the npm-native flow.
4. **Nothing is actually published yet.** `main` is nine commits ahead of `origin/main`; the remote has zero releases and zero tags; the checked-in `api-v1.0.0` bundle and `CONSUMER-PINS.md` return 404 from `raw.githubusercontent.com` on `main`; `tickets-mvp-v1.0.0` exists only locally. Ticket 01 is not done in the sense that matters to consumers, so tickets 02 and 03 are still blocked.

## 1. What is actually true today

**Sourced fact.** These are direct observations of the three working copies and the public GitHub API on 2026-11-03, not assumptions.

| Item | Actual state |
|---|---|
| `shifters-specs` remote | `git@github.com:maxisun/shifters-specs.git`; public (`private: false`) |
| `shifters-specs` local `main` | `## main...origin/main [ahead 9]` |
| Remote releases / tags | `GET /repos/maxisun/shifters-specs/releases` returns `[]`; `GET /tags` returns `[]`; `git ls-remote --tags origin` is empty |
| Contract tag | No `api-v1.0.0` Git tag exists locally or remotely; `gh release create` would create it |
| Local work-spec tag | Annotated `tickets-mvp-v1.0.0` at commit `829bec263436ad42ca6ceefeafdede27e7ab6285`; `git push --dry-run` reports it as a new tag |
| Contract bundle | `docs/specs/api/releases/api-v1.0.0/` contains `shiftpatch-api-1.0.0.tar.gz` (SHA-256 `7066ab64…a77fa8f6`), its `.sha256`, and `manifest.json` |
| Bundle contents | `openapi.yaml`, `CHANGELOG.md`, `manifest.json` — no `package.json` |
| Bundle provenance | `manifest.json` says `sourceCommit: 8e2237be651a6d1a997f86a545bcb30a0b7f8154`; the bundled `openapi.yaml` is byte-identical to `openapi.yaml` at that commit (verified by SHA-256) |
| Remote visibility of the bundle | `CONSUMER-PINS.md` and the bundle at `main` return HTTP 404 from `raw.githubusercontent.com`; the release URL in the sample locks returns 404 because no release exists |
| `shifters-be` | Is a Git repository with remote `git@github.com:maxisun/shifter-be.git`; `.github/workflows/ci.yml` runs only `pnpm install --frozen-lockfile` and `pnpm run test:cov`; no OpenAPI/contract references in `src/` or `test/` |
| `shifters-fe` | Not a Git repository (`fatal: not a git repository`); Vite + React 19 + npm; `package-lock.json` lockfile v3; `src/App.jsx` and `src/main.jsx`; no CI |
| Public remotes | Both existing remotes are public (`private: false` from the unauthenticated API) |

**Consequences.**

- Ticket 02’s first checkbox — “The directory is a git repository with a remote … it currently is not one” — is already satisfied for the backend and is stale. Do not `git init` an existing repository; mark the item done or delete it.
- Ticket 03’s second checkbox is accurate: the frontend has no Git repository and no CI.
- Ticket 01’s acceptance criteria are not met until the release is published and both sample pins resolve. The local tag and the committed tarball are preparation, not publication.
- The `CONSUMER-PINS.md` sample URL is currently a dead link. A consumer that follows it today fails at download time, not at code review.

## 2. Transport: exact tarball URL vs GitHub Packages vs custom sync

### 2.1 What npm and pnpm record for a remote tarball

**Sourced fact.** npm’s package specifier syntax explicitly includes `<tarball url>` ([npm package spec](https://docs.npmjs.com/cli/v11/using-npm/package-spec)). In `package-lock.json`, a package entry’s `resolved` field is “the place where the package was actually resolved from … a url to a tarball,” and `integrity` is “a `sha512` or `sha1` Standard Subresource Integrity string for the artifact that was unpacked in this location” ([npm package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json)).

**Sourced fact, observed with npm 11.16.0.** Installing `https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz` wrote:

```json
{
  "dependencies": {
    "is-number": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz"
  }
}
```

and the lock entry:

```json
"node_modules/is-number": {
  "version": "7.0.0",
  "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
  "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng=="
}
```

**Sourced fact, observed with pnpm 12.14.0.** The same URL dependency wrote the URL as the importer `specifier` and the integrity in `packages`:

```yaml
importers:
  .:
    dependencies:
      is-number:
        specifier: https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz
        version: 7.0.0
packages:
  is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
```

pnpm’s lockfile documentation states that the `integrity` of a package tarball entry pins the resource at its tarball URL after HTTP content decoding ([pnpm lockfile](https://pnpm.io/lockfile)).

**Sourced fact, observed.** Both package managers fail closed when the bytes change under a fixed URL:

- npm: `npm error code EINTEGRITY … wanted sha512-41Cif… but got sha512-CQpnW…`.
- pnpm: “The downloaded tarball does not match the integrity recorded in the lockfile.”

This is the property the custom sync script was going to implement. The package managers already implement it, including cache behavior and install-time verification.

**Sourced fact, observed on the actual bundle.** `npm install ./shiftpatch-api-1.0.0.tar.gz` fails:

```text
npm error code ENOENT
npm error path …/package.json
npm error enoent Could not read package.json
```

The bundle cannot be consumed as an npm dependency in its current shape. It must be repacked with a root `package.json` (the standard `npm pack` layout places files under `package/`).

**Sourced fact, observed.** Repacking the same bundle with a `package.json` and running `npm pack` twice with npm 11.16.0 produced the same SHA-256 both times. `npm pack` also accepts a tarball URL and copies the fetched package into the working directory as `<name>-<version>.tgz` ([npm-pack](https://docs.npmjs.com/cli/v11/commands/npm-pack)). Determinism across different npm versions is not guaranteed; the published SHA-256, not rebuild reproducibility, is the pin.

### 2.2 GitHub Packages

**Sourced fact.** GitHub Packages’ npm registry only supports scoped npm packages (`@NAMESPACE/PACKAGE-NAME`) ([Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)). It supports private packages, but:

- For personal-access-token authentication, “GitHub Packages only supports authentication using a personal access token (classic)”; fine-grained PATs are not supported. This is repeated in the registry guide and the permissions guide ([permissions for GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages)).
- “In most registries, to pull a package, you must authenticate with a personal access token or `GITHUB_TOKEN`, regardless of whether the package is public or private.” The npm registry is one of those registries.
- In GitHub Actions, `GITHUB_TOKEN` can publish packages associated with the workflow repository. To install packages associated with another private repository, the docs call for a classic PAT with at least `read:packages`, unless the repository has been granted read access to the package through the package’s access settings ([Introduction to GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/about-github-packages); [configuring package access](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)).
- Local developers need `//npm.pkg.github.com/:_authToken=TOKEN` in `~/.npmrc`, a classic PAT with `read:packages`, and `npm login --auth-type=legacy --registry=https://npm.pkg.github.com` if they use the login flow.

**Sourced fact.** Billing on GitHub Free includes 500 MB of Packages storage and 1 GB of data transfer per month; storage is shared with Actions artifacts; package downloads that authenticate with `GITHUB_TOKEN` from GitHub Actions do not count against the hosting repository’s data-transfer allowance ([GitHub Packages billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages)).

**Recommendation: reject GitHub Packages for this setup.** A contract tarball is roughly 10 KB, so the monetary cost is effectively zero. The real cost is authentication: every local developer and every CI job needs a credential even though the specifications repository is public and the release asset is anonymously readable. A classic PAT is broader than a repository-scoped `Contents: read` token, must be rotated, and is exactly the kind of long-lived secret the rest of this flow avoids. GitHub Packages also adds a second publication target and a package lifecycle to keep aligned with the GitHub release.

**Where GitHub Packages would make sense:** if the specs repository must be private, a package registry begins to compete with the private-release fallback; if a third consumer in another language appears; or if the team already standardizes on GitHub Packages for internal libraries. None of those conditions is true today.

### 2.3 The custom sync script

**Sourced fact.** A custom sync script can be made correct: authenticate, download the exact asset URL, compare SHA-256 to the lock, extract, cache by digest, and fail on mismatch. The prior research described exactly that.

**Recommendation: do not make it the default.** It re-implements download, caching, and integrity verification that npm and pnpm already provide, and it must be maintained in both consumer repositories (or extracted into a shared action, which adds another cross-repository dependency). Its correct role is the fallback for a private specifications repository or a non-JavaScript consumer, where the package manager cannot participate.

### 2.4 The recommendation, with conditions

**The custom-sync variant no longer wins for this setup.** It is the right fallback when the repository is private or the consumer is not JavaScript, but it is not the default when both consumers are TypeScript and the asset can be npm-shaped.

**Default — public specifications repository, both consumers TypeScript:**

1. Publish each contract release as an npm-pack tarball, e.g. `shiftpatch-api-1.0.0.tgz`, attached to the immutable GitHub release `api-v1.0.0`.
2. In each consumer, depend on the exact HTTPS URL:

   ```json
   {
     "dependencies": {
       "@maxisun/shiftpatch-api": "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
     }
   }
   ```

3. Commit the package-manager lockfile. npm records `resolved` + `integrity`; pnpm records the URL `specifier` + `resolution.integrity`.
4. Verify provenance from the installed package’s `manifest.json` (`contractVersion`, `oasVersion`, `sourceCommit`, `workSpec`) in a small `contract verify` step. Do not add a download sync step.

**Condition A — the specifications repository becomes private.** The npm URL path is no longer dependable: npm’s documented authentication is registry-scoped (`//registry/:_authToken`), and neither npm nor GitHub documents authenticated installation from a private release-asset URL. Fall back to the release-asset download flow in §3.2: GitHub App token with `Contents: read`, `gh release download`, SHA-256 check, `gh release verify-asset`. Do not attempt to teach npm to authenticate to `github.com` release assets.

**Condition B — a third, non-JavaScript consumer appears.** Keep the npm-pack release asset as the canonical artefact and give that consumer a thin downloader. Do not move all consumers to a registry just to serve one.

**Condition C — release cadence becomes high or consumers proliferate.** Revisit a registry. Compare a generic registry (or the public npm registry) against GitHub Packages on authentication, not just price. GitHub Packages’ classic-PAT requirement is a real downgrade for this team.

**Never:** ranges, `latest`, branch URLs, mutable assets, per-consumer edits to `openapi.yaml`, or a second generated contract derived from backend annotations.

| Criterion | Release asset + custom sync | GitHub Packages | Exact tarball URL |
|---|---|---|---|
| Custom code in each consumer | Download, SHA-256, extract, cache | None | None; npm/pnpm do it |
| Local-developer auth (public specs) | None | Classic PAT with `read:packages` | None |
| CI auth (public specs) | None | `GITHUB_TOKEN` only if the repository is granted package access; otherwise a classic PAT | None |
| Integrity | Custom SHA-256 check | Registry + lockfile `integrity` | Lockfile `integrity` |
| Offline build | Custom digest cache | Package-manager cache | Package-manager cache |
| Private specs repository | Works with an App token | Works, with package access and PATs | No documented auth path |
| Automatic update PRs | Custom | Dependabot/Renovate | None documented |
| **Verdict** | **Fallback** | **Reject** | **Default** |

### 2.5 Why this is not “just a tarball”

The npm-pack shape does not make the artefact JavaScript-only. It is still a gzipped tar containing `openapi.yaml`, `CHANGELOG.md`, `manifest.json`, and a thin `package.json`. A non-npm consumer can untar it. The `package.json` exists so npm and pnpm can treat the release as a first-class dependency and verify its bytes; the OpenAPI document remains the payload.

## 3. If release asset: exact mechanics

### 3.1 Public repository (the current state)

**Sourced fact.** A public release asset is readable without authentication. The GitHub REST API documents that a release asset’s binary content can be fetched from `browser_download_url`, or from the API asset endpoint with `Accept: application/octet-stream`, handling either `200` or `302` ([REST API endpoints for release assets](https://docs.github.com/en/rest/releases/assets)).

Download and verify without a token:

```sh
curl -fL -o shiftpatch-api-1.0.0.tgz \
  https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz

# macOS
shasum -a 256 shiftpatch-api-1.0.0.tgz
# Linux
sha256sum shiftpatch-api-1.0.0.tgz

# Compare to the sidecar (or to the lock file)
shasum -a 256 -c shiftpatch-api-1.0.0.tgz.sha256   # macOS
sha256sum -c shiftpatch-api-1.0.0.tgz.sha256       # Linux
```

**Sourced fact.** `gh release download` downloads assets by tag and supports `--repo`, `--pattern`, `--dir`, and `--clobber` ([gh release download](https://cli.github.com/manual/gh_release_download)). `gh release verify` checks that a release has a valid attestation and prints the assets and digests; `gh release verify-asset` checks a local file against a release attestation ([gh release verify](https://cli.github.com/manual/gh_release_verify); [gh release verify-asset](https://cli.github.com/manual/gh_release_verify-asset)).

```sh
gh release verify api-v1.0.0 --repo maxisun/shifters-specs
gh release verify-asset api-v1.0.0 ./shiftpatch-api-1.0.0.tgz \
  --repo maxisun/shifters-specs
```

Run these at release time in the specifications repository, and optionally in a scheduled consumer job. They are not needed on every pull request: the package manager’s `integrity` check already covers byte drift on every install.

### 3.2 Private repository

**Sourced fact.** `GITHUB_TOKEN` is “limited to the repository that contains your workflow” ([GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)). It cannot read a release in `maxisun/shifters-specs` from a workflow in `maxisun/shifter-be`. Adding `permissions: contents: read` to the consumer workflow does not change that; the block controls the built-in token’s access to the consumer repository, not to another repository. GitHub’s own guidance for cross-repository access is a GitHub App installation token, or a personal access token with the necessary repository access ([Making authenticated API requests with a GitHub App in a GitHub Actions workflow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow)).

**Recommendation: GitHub App, not a PAT.** Register one App, install it on `maxisun`, grant it access to `shifters-specs` only, and give it `Contents: read` and `Attestations: read`. The attestation lookup endpoint is `GET /repos/{owner}/{repo}/attestations/{subject_digest}`, which is listed under the `Attestations: read` permission for both GitHub Apps and fine-grained PATs ([GitHub App permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps)). The workflow mints a short-lived installation token with `actions/create-github-app-token@v3`:

```yaml
permissions:
  contents: read          # the consumer repository's own contents

steps:
  - name: Mint a token for the specifications repository
    id: specs
    uses: actions/create-github-app-token@v3
    with:
      client-id: ${{ vars.SPECS_APP_CLIENT_ID }}
      private-key: ${{ secrets.SPECS_APP_PRIVATE_KEY }}
      owner: maxisun
      repositories: shifters-specs
      permission-contents: read
      permission-attestations: read

  - name: Download and verify the pinned contract
    env:
      GH_TOKEN: ${{ steps.specs.outputs.token }}
    run: |
      SHA256="$(node -p "require('./contracts/shiftpatch-api.lock.json').sha256")"
      mkdir -p .contract
      gh release download api-v1.0.0 \
        --repo maxisun/shifters-specs \
        --pattern shiftpatch-api-1.0.0.tgz \
        --dir .contract \
        --clobber
      gh release verify api-v1.0.0 --repo maxisun/shifters-specs
      gh release verify-asset api-v1.0.0 \
        .contract/shiftpatch-api-1.0.0.tgz \
        --repo maxisun/shifters-specs
      printf '%s  %s\n' "$SHA256" \
        .contract/shiftpatch-api-1.0.0.tgz | sha256sum -c -
```

`actions/create-github-app-token@v3` accepts `owner`, `repositories`, and per-permission inputs such as `permission-contents`; the token is masked and revoked at the end of the job unless `skip-token-revoke` is set ([actions/create-github-app-token](https://github.com/actions/create-github-app-token)).

The snippet reads the digest from the four-field fallback lock (`contracts/shiftpatch-api.lock.json`). The public npm path does not need that file: the package-manager lock is the byte pin.

A fine-grained PAT is the smaller fallback: select only `maxisun/shifters-specs`, grant `Contents: read` and `Attestations: read`, and store it as `SPECS_READ_TOKEN`. GitHub’s fine-grained permission reference lists `GET /repos/{owner}/{repo}/releases`, `/releases/{id}`, `/releases/tags/{tag}`, and `/releases/assets/{asset_id}` under `Contents: read`, and `GET /repos/{owner}/{repo}/attestations/{subject_digest}` under `Attestations: read` ([Permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)). It is long-lived and user-owned, so the App is preferable.

**Caching.** If the private path is used, cache the downloaded archive by its SHA-256, not by the tag:

```yaml
- uses: actions/cache@v6
  with:
    path: .contract
    key: shiftpatch-api-${{ hashFiles('contracts/shiftpatch-api.lock.json') }}
```

Then still run the SHA-256 check after restoring. GitHub’s cache documentation warns that restored files must be treated as untrusted input and that a job must always be able to re-download or regenerate if the cache misses ([Dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)).

**Failure modes when bytes drift.**

| Situation | Public npm-URL path | Private `gh` path |
|---|---|---|
| Asset replaced with different bytes | npm/pnpm `integrity` mismatch; install fails before codegen | `gh release verify-asset` digest mismatch; SHA-256 check fails |
| Tag moved to another commit | Immutable release blocks the move | Immutable release blocks the move |
| Release deleted and recreated with the same tag | Immutable release blocks tag-name reuse | Same |
| Asset deleted | Download 404; build fails | Download 404; build fails |
| Lockfile `integrity` changed to match malicious bytes | Pull-request review is the control; attestation verification is the backstop | `gh release verify-asset` is the backstop |
| Cache serves stale bytes | `integrity` check fails | SHA-256 check fails |

### 3.3 Immutable releases and attestations

**Sourced fact.** When release immutability is enabled:

- the Git tag is locked to a commit and cannot be moved or deleted while the release exists;
- release assets cannot be modified or deleted;
- publishing automatically generates a **release attestation** — a cryptographically verifiable record of the tag, commit SHA, and assets.

GitHub recommends creating a draft, attaching all assets, then publishing. Immutability applies only to future releases. If an immutable release is deleted, its tag can be deleted but the tag name cannot be reused ([Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases); [Preventing changes to your releases](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)). The verification commands are documented in [Verifying the integrity of a release](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity).

**Recommendation:** enable immutability in `shifters-specs` **before** publishing `api-v1.0.0`. It only protects future releases, and there is no reason to publish the first contract release unprotected. Publish from a draft with the tarball and checksum already attached, then verify with `gh release verify` and `gh release verify-asset`.

**Two commits, not one.** The current bundle illustrates a subtlety that must be documented:

- `manifest.json.sourceCommit` = `8e2237b…`, the commit whose `openapi.yaml` is inside the archive. This is the *contract source*.
- The release tag should point at the commit that contains the **final bundle bytes** (the repacked tarball and its checksum). That commit may be later than `sourceCommit`; the current tarball was rebuilt after `8e2237b` while its `openapi.yaml` still matches `8e2237b`.

Both identifiers are legitimate and serve different purposes. The release attestation binds the tag commit and asset digest; the manifest binds the OpenAPI source. Record both in the lock/PR so neither is mistaken for the other.

**What I could not confirm:** the immutable-releases documentation does not state a public/private repository restriction, and I found no private-repository caveat. Verify that the “Enable release immutability” setting appears in the repository settings before relying on it; the current repository is public, where the feature is documented without qualification.

## 4. Two artefact classes, not one

### 4.1 The contract pin

**Recommendation:** the byte pin is the package-manager dependency, not a parallel hand-maintained digest file.

- `package.json` names the exact release-asset URL.
- `package-lock.json` (npm) or `pnpm-lock.yaml` (pnpm) records the resolved URL and `integrity`.
- The installed package’s `manifest.json` is the provenance record: `contractVersion`, `oasVersion`, `sourceCommit`, `workSpec`, and the accepted `workItems`.
- A small `contract verify` step asserts that the package version, `manifest.contractVersion`, `openapi.yaml`’s `info.version`, and the version embedded in the release URL all agree; that `oasVersion` equals the document’s `openapi` value; and that `sourceCommit` is a full 40-character SHA.

**What to do with the existing four-field lock format.** `docs/specs/api/CONSUMER-PINS.md` defines `contractVersion`, `url`, `sha256`, `sourceCommit`. Keep that format for the **private-repository fallback**, where there is no package manager to own the bytes. Do not duplicate it in the public npm path: a second `sha256` that is not checked by the installer will drift from the package manager’s `integrity`. If a human-readable record is wanted, record only `contractVersion` and `sourceCommit` in `contracts/work-spec.lock.json`; the byte proof is in the lockfile.

This is a deliberate simplification of the prior research, which assumed a custom downloader. The downloader needs the four-field lock; the package manager does not.

### 4.2 The work-specification pin

**Recommendation:** pin the work specification by **annotated tag plus full commit SHA**, and link to the exact file at that commit.

- The tag is the human name: `tickets-mvp-v1.0.0`.
- The commit is the real pin: `829bec263436ad42ca6ceefeafdede27e7ab6285` today, or the re-pointed release commit if the tag is moved before first publication.
- The link is a GitHub permalink — a URL containing the commit ID, which “will permanently link to the exact version of the file in that commit” ([Getting permanent links to files](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files)).
- Record both in `contracts/work-spec.lock.json`:

  ```json
  {
    "contract": {
      "version": "1.0.0",
      "sourceCommit": "8e2237be651a6d1a997f86a545bcb30a0b7f8154"
    },
    "workSpec": {
      "tag": "tickets-mvp-v1.0.0",
      "commit": "829bec263436ad42ca6ceefeafdede27e7ab6285",
      "path": ".scratch/shiftpatch-mvp"
    }
  }
  ```

**Why not a submodule.** A submodule records an exact commit, but ordinary clone and pull do not initialize it; it requires explicit `submodule update` commands and a nested Git workflow, and it exposes the entire specifications checkout to every consumer ([git-submodules](https://git-scm.com/docs/gitsubmodules)). Agents are especially likely to skip submodule initialization. The contract already has a purpose-built transport; the Markdown does not need a second one.

**Why not a release asset for Markdown.** Nothing builds from the tickets. A release would add a second immutability ceremony and a second download step for content that is read, not compiled. The tag plus commit is the identity; the commit is immutable in practice as long as the tag is protected or the PR records the SHA.

**If tamper-evidence is required,** add a repository ruleset that prevents tag updates and deletions, or cut a GitHub release for the ticket set. The commit SHA in every implementation PR remains the backstop even if a tag moves.

**Tag timing.** `tickets-mvp-v1.0.0` currently points at `829bec2`, which predates the contract release commits. It has never been pushed, so no consumer has pinned it. Before first publication, either re-point it to the commit that contains the final contract bundle (and update its message and the ticket 01 status), or cut `tickets-mvp-v1.0.1` at that commit. Re-pointing is acceptable only because the tag is unpublished; once pushed, treat it as immutable. This matters because the durable specs under `docs/specs/` moved after `829bec2`, and an implementer reading only the old tag would miss those corrections.

### 4.3 How the two stay in sync

**Recommendation:** make the contract release manifest the join point, and make the consumer record both pins in one file.

- Add a `workSpec` object to `manifest.json`:

  ```json
  {
    "contractVersion": "1.0.0",
    "oasVersion": "3.1.0",
    "sourceCommit": "8e2237be651a6d1a997f86a545bcb30a0b7f8154",
    "releaseTag": "api-v1.0.0",
    "workSpec": {
      "tag": "tickets-mvp-v1.0.0",
      "commit": "829bec263436ad42ca6ceefeafdede27e7ab6285"
    },
    "workItems": [ ... all 27 tickets with revisions and permalinks ... ]
  }
  ```

  Build the `workItems` permalinks at the work-spec commit, not at `sourceCommit`; the tickets belong to the work-spec artefact, while `sourceCommit` identifies the OpenAPI source.

- The consumer’s `contracts/work-spec.lock.json` records the contract version and source commit plus `workSpec.tag` and `workSpec.commit`.
- `contract verify` asserts that the installed `manifest.workSpec.commit` equals the consumer’s work-spec commit. A mismatch fails the build with a message telling the author to update both pins in the same pull request.
- For a paired backend/frontend feature, both pull requests must record the **same** contract version and the **same** work-spec tag/commit. The integration test runs against the same contract pin.

**Do not force one release for both axes.** A documentation-only ticket change bumps the work-spec tag and does not require a contract release. A contract-only correction bumps the contract and leaves the ticket tag alone. The manifest records the work-spec revision that motivated the contract; it does not claim that the two are always at the same revision.

### 4.4 What the implementation pull request records

**Recommendation:** add a `PULL_REQUEST_TEMPLATE.md` to both implementation repositories with this block, and require it in review:

```text
Work specification: tickets-mvp-v1.0.0 @ 829bec263436ad42ca6ceefeafdede27e7ab6285
  https://github.com/maxisun/shifters-specs/blob/829bec263436ad42ca6ceefeafdede27e7ab6285/.scratch/shiftpatch-mvp/issues/02-backend-walking-skeleton.md

API contract: 1.0.0 (api-v1.0.0)
Contract source: 8e2237be651a6d1a997f86a545bcb30a0b7f8154
Contract bytes: package-lock.json integrity sha512-…   (or pnpm-lock.yaml resolution.integrity)
Codegen: openapi-typescript 7.13.0; openapi-fetch 0.17.0 (frontend only)
Operations: getSession, listShifts, claimShift
```

The lockfile diff is the machine-checkable part; the block is the human-readable part. A reviewer can answer “which specification text and which contract bytes produced this change?” without cloning the specifications repository.

## 5. Bootstrap: the correct order

**Recommendation:** specifications first, backend second, frontend third. The frontend may initialize Git and convert to TypeScript in parallel, but it must not invent a second contract flow.

### 5.1 Phase 0 — specifications (blocks both)

1. **Update ticket 01** to `done`, bump its revision, and record the release URL, release commit, contract source commit, and verification evidence. This is the last ticket-set change before the tag.
2. **Extend the manifest** with `workSpec` and all 27 work items (IDs, revisions, full-commit permalinks). The current manifest lists only ticket 01.
3. **Repack the release payload as an npm package.** In the release payload directory (for example `docs/specs/api/releases/api-v1.0.0/package/`), add a `package.json` with `name: "@maxisun/shiftpatch-api"`, `version` from `info.version`, `files: ["openapi.yaml", "CHANGELOG.md", "manifest.json"]`, and the repository URL. The package must have no `dependencies` and no `scripts`; it is data, not code. Run `npm pack` in that directory and attach the resulting `.tgz`. Recompute the SHA-256 sidecar.
4. **Update `CONSUMER-PINS.md`** so the primary example is the exact tarball-URL dependency, with npm and pnpm lock excerpts. Keep the four-field format as the private-repository fallback, clearly labelled.
5. **Update `RELEASING.md`** with the npm-pack step, the `workSpec` field, and the rule that `sourceCommit` and the release-tag commit are different identifiers.
6. **Commit and push `main`.** The remote currently lacks the entire release preparation. Do not tag or release from an unpushed branch.
7. **Enable release immutability** in repository settings before the first release.
8. **Create the draft release** `api-v1.0.0` at the commit containing the final bundle, attach the `.tgz` and `.sha256`, review the assets, then publish.
9. **Verify**: `gh release verify api-v1.0.0 -R maxisun/shifters-specs`, `gh release verify-asset …`, and an anonymous `curl -fL` of the asset URL.
10. **Publish the work-spec tag**: re-point `tickets-mvp-v1.0.0` to the final commit and push it, or cut `tickets-mvp-v1.0.1` and push that. Verify the commit and the ticket file at the tag.

**Why not bump to `api-v1.0.1`?** SemVer §3 says a *released* version’s contents must not change ([SemVer 2.0.0](https://semver.org/spec/v2.0.0.html)). `api-v1.0.0` was never published; the release URL has never existed. Rebuilding it before first publication is legitimate. If the team prefers to treat the committed bundle as a release, cut `api-v1.0.1` and update the lock examples; either is coherent, but do not publish the old bytes as `api-v1.0.0` and then change them.

### 5.2 Phase 1 — backend (ticket 02)

1. Branch from `main`; do **not** re-initialize the repository. Ticket 02’s first checkbox is already satisfied.
2. Add the exact URL dependency:

   ```sh
   pnpm add "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
   ```

3. Install `openapi-typescript` as an exact dev dependency:

   ```sh
   pnpm add -D -E openapi-typescript@7.13.0
   ```

   There is no `openapitools.json`, no generator JAR, and no Java requirement. `openapi-typescript` is a Node CLI that supports OpenAPI 3.0 and 3.1 and produces runtime-free types ([openapi-typescript introduction](https://openapi-ts.dev/introduction); [CLI](https://openapi-ts.dev/cli)).
4. Add scripts:

   ```json
   {
     "scripts": {
       "contract:verify": "node scripts/contract-verify.mjs",
       "contract:generate": "openapi-typescript node_modules/@maxisun/shiftpatch-api/openapi.yaml -o src/generated/api/schema.d.ts && node scripts/write-provenance.mjs",
       "contract:check": "pnpm contract:verify && openapi-typescript node_modules/@maxisun/shiftpatch-api/openapi.yaml -o src/generated/api/schema.d.ts --check"
     }
   }
   ```

   `openapi-typescript --check` exits non-zero when the committed file differs from what the pinned schema would generate; it is a built-in drift check, not a `git diff` approximation ([CLI flags](https://openapi-ts.dev/cli)).
5. Run `pnpm contract:generate` once (the script also writes `PROVENANCE.json`) and commit `src/generated/api/schema.d.ts` and `src/generated/api/PROVENANCE.json`. The generated file is a single `.d.ts` (2,069 lines for this contract). It has no relative imports, so it compiles under the backend’s `module: nodenext` + `"type": "module"` configuration; I verified this with the backend’s TypeScript compiler. Backend imports follow the repo’s ESM rule: `import type { components } from "../generated/api/schema.js"` (TypeScript resolves the `.js` specifier to `schema.d.ts`).
6. Write `scripts/contract-verify.mjs`: read the installed `manifest.json`, the lockfile, and the contract version in the URL; assert package name, version, `contractVersion`, `oasVersion`, `sourceCommit` shape, and the `workSpec` commit against `contracts/work-spec.lock.json`. Add `yaml` as an exact dev dependency and use it for the two `openapi.yaml` fields; do not regex the document. Fail with the exact mismatch, not a generic error.
7. Add `contracts/work-spec.lock.json` with the work-spec tag/commit and the contract version/source commit.
8. Extend `.github/workflows/ci.yml` after `pnpm install --frozen-lockfile`:

   ```yaml
   - run: pnpm contract:check
   - run: pnpm check
   - run: pnpm build
   - run: pnpm test:cov
   - run: pnpm test:e2e
   ```

   The current workflow runs only unit tests with coverage. Ticket 02 explicitly requires `check`, `build`, `test`, and `test:e2e`.
9. Add `.github/PULL_REQUEST_TEMPLATE.md` with the traceability block.
10. Open the pull request; confirm the lockfile diff contains the release URL and an `integrity` value, and that the generated diff is reviewable.

### 5.3 Phase 2 — frontend (ticket 03)

1. `git init` in `shifters-fe`, commit the existing JavaScript scaffold as a baseline, and create the remote. **Recommendation:** name it `maxisun/shifter-fe` to match `maxisun/shifter-be` (singular), and record the canonical remote in the consumer documentation. The local directory can remain `shifters-fe`. If the team prefers `shifters-fe`, choose it deliberately and document it; do not let an inconsistent remote name leak into lock files or PR templates.
2. Add a minimal CI workflow that runs `npm ci` and `npm run build`. This gives a green baseline before the TypeScript conversion.
3. Convert to TypeScript in its own pull request, as ADR-0001 requires: add `tsconfig.json`, rename `App.jsx`/`main.jsx` to `.tsx`, add `typescript`, `@types/react`, `@types/react-dom`, a test runner, and linting. Add `typecheck` and `test` scripts. Do not combine this with the contract adoption.
4. Add the same exact URL dependency with npm:

   ```sh
   npm install "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
   ```

5. Install `openapi-typescript@7.13.0` (dev), `yaml` (dev), and `openapi-fetch@0.17.0` (runtime) as exact dependencies. Add the same `contract:generate` and `contract:check` behavior as the backend, writing `src/generated/api/schema.d.ts` from the pinned `openapi.yaml`. Use `npm run contract:verify` in the frontend’s `contract:check` script; the backend uses `pnpm`.
6. Add a small hand-written `src/api/client.ts`:

   ```ts
   import createClient from "openapi-fetch";
   import type { paths } from "../generated/api/schema";

   export const api = createClient<paths>({
     baseUrl: "/api/v1",
     credentials: "include",
   });
   ```

   Add a request middleware that reads the CSRF token from the session endpoint and sets `X-CSRF-Token` on unsafe requests. `openapi-fetch` is a type-safe `fetch` wrapper with middleware, and `credentials` is a standard fetch option ([openapi-fetch](https://openapi-ts.dev/openapi-fetch/); [API](https://openapi-ts.dev/openapi-fetch/api)). The contract declares cookie authentication and a required `X-CSRF-Token`; the middleware is the hand-written policy layer that keeps the generated types honest. With Vite’s `bundler` module resolution, the extensionless `../generated/api/schema` import is correct; the backend uses its `.js` extension rule instead. If the frontend and API are on different origins, the backend CORS policy must allow credentials and the exact origin.
7. Add `contracts/work-spec.lock.json` with the same work-spec tag/commit as the backend.
8. Add `contract:verify` and `contract:check`; the check runs `openapi-typescript … --check` against the committed `schema.d.ts`.
9. Extend CI: `npm run contract:check`, `npm run typecheck`, `npm test`, `npm run build`.
10. Add the same pull-request template. Open the pull request only after the backend’s contract PR has merged, so the frontend is copying a proven pattern rather than designing a second one.

**Why this order.** The release URL must exist before either consumer can pin it. The backend proves the npm-URL, codegen, verification, and CI pattern on the simpler (single-package-manager) side. The frontend then repeats it with npm instead of pnpm. The only differences are the lockfile format and the client wrapper; the contract version, work-spec commit, codegen versions, and PR template are identical.

### 5.4 What lands where

| Repository | Changes |
|---|---|
| `shifters-specs` | `release/package.json` (or a build script that writes it), npm-pack tarball, SHA-256 sidecar, `manifest.json` with `workSpec` and all work items, updated `CONSUMER-PINS.md` and `RELEASING.md`, published immutable release, pushed work-spec tag |
| `shifters-be` | Exact URL dependency, `pnpm-lock.yaml` integrity, `openapi-typescript@7.13.0`, `src/generated/api/schema.d.ts`, `src/generated/api/PROVENANCE.json`, `scripts/contract-verify.mjs`, `contracts/work-spec.lock.json`, CI steps, PR template |
| `shifters-fe` | Git repository and remote, baseline CI, TypeScript conversion, exact URL dependency, `package-lock.json` integrity, `openapi-typescript@7.13.0`, `openapi-fetch@0.17.0`, `src/generated/api/schema.d.ts`, `src/generated/api/PROVENANCE.json`, `src/api/client.ts`, `contracts/work-spec.lock.json`, CI steps, PR template |

## 6. Concrete day-one flow for tickets 02 and 03

### 6.1 Specifications (ticket 01 must actually finish)

```sh
cd /Users/maxisun/personal-projects/shifters/shifters-specs

# 1. Update ticket 01 to done, add the release URL and verification evidence.
# 2. Add workSpec and all 27 work items to the manifest.
# 3. Add the release package.json, rebuild the tarball, recompute the checksum.
# 4. Update CONSUMER-PINS.md and RELEASING.md.
# 5. Commit and push.
git add -A
git commit -m "Publish api-v1.0.0 as an npm-installable contract bundle"
git push origin main

# 6. Enable release immutability in repository settings (web UI).

# 7. Draft, attach, verify, publish.
gh release create api-v1.0.0 \
  docs/specs/api/releases/api-v1.0.0/shiftpatch-api-1.0.0.tgz \
  docs/specs/api/releases/api-v1.0.0/shiftpatch-api-1.0.0.tgz.sha256 \
  --target "$(git rev-parse HEAD)" \
  --draft --title "ShiftPatch API 1.0.0" --notes-file docs/specs/api/CHANGELOG.md

gh release edit api-v1.0.0 --draft=false
gh release verify api-v1.0.0 -R maxisun/shifters-specs
gh release verify-asset api-v1.0.0 \
  docs/specs/api/releases/api-v1.0.0/shiftpatch-api-1.0.0.tgz \
  -R maxisun/shifters-specs

# 8. Publish the work-spec tag.
git tag -f -a tickets-mvp-v1.0.0 -m "ShiftPatch MVP ticket set v1.0.0 (contract api-v1.0.0)"
git push -f origin tickets-mvp-v1.0.0
```

`git tag -f` is safe only because the tag has never been pushed and no consumer has pinned it. After this point, treat it as immutable and cut a new tag for changes.

### 6.2 Backend (ticket 02)

```sh
cd /Users/maxisun/personal-projects/shifters/shifters-be
git switch -c ticket-02-contract-consumption

pnpm add "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
pnpm add -D -E openapi-typescript@7.13.0
pnpm add -D -E yaml

# Add scripts/contract-verify.mjs, contracts/work-spec.lock.json,
# and the package.json scripts.
pnpm contract:generate
pnpm contract:verify

git add package.json pnpm-lock.yaml scripts contracts src/generated .github
git commit -m "Consume api-v1.0.0 from the immutable release asset"
```

**`contract sync` — what it should do.** With the npm-URL transport there is no download step to write. Name the command `contract sync` if the ticket vocabulary needs it, but define it as verify-then-generate:

1. Read the dependency URL from `package.json`; refuse anything that is not an exact `https://github.com/maxisun/shifters-specs/releases/download/api-vX.Y.Z/…tgz`.
2. Read `node_modules/@maxisun/shiftpatch-api/manifest.json`.
3. Assert: package version = manifest `contractVersion` = `openapi.yaml` `info.version` = the version in the URL; `sourceCommit` is 40 hex; `oasVersion` = `openapi.yaml` `openapi`; `workSpec.commit` = `contracts/work-spec.lock.json`; the lockfile contains an `integrity` for the package.
4. Regenerate `src/generated/api` with the pinned `openapi-typescript` version.
5. Write `src/generated/api/PROVENANCE.json` with the contract version, source commit, work-spec tag/commit, and codegen versions.
6. Print the traceability block for the pull request.

**`contract sync` — what it must refuse to do.**

| Refusal | Reason |
|---|---|
| Follow `main`, `latest`, a branch, or a tag without a commit | Reproducibility; the pin must identify bytes and source |
| Accept a URL that is not a release asset under `maxisun/shifters-specs` | Prevents a consumer from silently switching to a fork or a random host |
| Accept a missing or mismatched `integrity` | The lockfile is the byte proof |
| Accept `manifest.sourceCommit` that is not a full 40-hex SHA, or that disagrees with `contracts/work-spec.lock.json` | Provenance must be checkable |
| Accept `manifest.workSpec.commit` ≠ the work-spec lock | Keeps the two artefact classes aligned |
| Run a codegen version different from the version pinned in this repository | Output would not be reproducible |
| Write outside `src/generated/api` | Generated code must not overwrite hand-written code |
| Edit `openapi.yaml`, `package.json`, or the specs repository | The specs repo is the only authority; the pin changes by reviewed PR |
| Auto-commit, auto-merge, or auto-bump | Adoption is a reviewed change, not a background update |
| Fall back to a cached different version when the network fails | Fail loudly; a cache hit must still satisfy the integrity check |

For the private-repository fallback, the same command additionally downloads the asset with `gh`, checks SHA-256, and extracts it into `contracts/shiftpatch-api/`. The codegen input switches to that extracted `openapi.yaml`; the codegen command, output directory, verification, and PR template stay the same. The public npm path does no download itself; npm or pnpm already did it and verified the digest.

### 6.3 Frontend (ticket 03)

```sh
cd /Users/maxisun/personal-projects/shifters/shifters-fe

git init
git branch -M main
git add .
git commit -m "Baseline Vite + React scaffold"
# Create maxisun/shifter-fe first (web UI, or `gh repo create maxisun/shifter-fe --private`).
git remote add origin git@github.com:maxisun/shifter-fe.git
git push -u origin main

# Add baseline CI (npm ci + npm run build), then a TypeScript conversion PR.
git switch -c ticket-03-typescript
# ... tsconfig, .tsx rename, test runner, lint ...
git commit -m "Convert the frontend to TypeScript"
git push -u origin ticket-03-typescript

# After the backend contract PR merges:
git switch main && git pull
git switch -c ticket-03-contract-consumption
npm install "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
npm install -D -E openapi-typescript@7.13.0
npm install -D -E yaml
npm install -E openapi-fetch@0.17.0
# Add src/api/client.ts, contracts/work-spec.lock.json, and the contract scripts.
npm run contract:generate
npm run contract:verify
```

Open the frontend contract PR only after the backend’s contract PR is merged. The point is to copy a proven flow, not to independently discover one.

### 6.4 What must change in the specifications repository to make this possible

1. `api-v1.0.0` must be a **published** immutable release, not a committed tarball with a dead URL.
2. The release asset must be a **valid npm package** (`package.json` at the package root, version matching `info.version`).
3. `manifest.json` must carry `workSpec` and the complete work-item list, so the two pins can be checked against each other.
4. `CONSUMER-PINS.md` must describe the npm-URL dependency as the primary pin and the four-field lock as the private fallback.
5. `RELEASING.md` must include the `npm pack` step and the distinction between `sourceCommit` and the release-tag commit.
6. The work-spec tag must be pushed and must point at a commit that includes the final specs and the ticket 01 completion.
7. The sample consumer lock files in `docs/specs/api/consumers/` must match the published bytes, or be removed if they are not maintained; a stale sample is worse than no sample.

## 7. Generated code

**Recommendation: commit generated types, and make CI regenerate them with `openapi-typescript --check` and fail on any drift.**

**Why commit it.**

- The generated diff is the contract diff a reviewer actually reads. A type removed or a field made optional shows up in the pull request.
- Agents and developers can read the types without running a code generator.
- The frontend and backend builds do not need a code-generation step or a network fetch of a generator.
- A codegen version bump becomes a reviewable diff instead of an invisible build-time change.

**Why not build-time only.** Build-time generation makes every build depend on the generator and the schema; it hides contract changes inside build logs; and it makes “what generated this artefact?” depend on the build environment. The cost of committing is generated churn, which is bounded by one contract pin at a time.

**Sourced fact and observed test — why OpenAPI Generator’s TypeScript client loses here.** OpenAPI Generator’s `typescript-fetch` output (7.26.0) uses extensionless relative imports (`./Eligibility`, `../runtime`). The backend is native ESM: `package.json` has `"type": "module"` and `tsconfig.json` uses `module: nodenext` / `moduleResolution: nodenext`. Compiling the generated output with the backend’s TypeScript produced `TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'`. **Recommendation:** do not work around this by post-processing every generated import, switching the backend to a bundler resolution it cannot use at runtime, or maintaining custom templates. Choose a types-only generator. OpenAPI Generator’s `typescript-nestjs-server` is listed as **beta** and would scaffold a second NestJS application around the existing structure; that is not the ticket’s intent ([Generators list](https://openapi-generator.tech/docs/generators)). This is the prior research’s own rule — test the actual output before selecting a generator — applied to this backend.

**Tool choice.**

- **Both repositories:** `openapi-typescript` **7.13.0** generates a single runtime-free `schema.d.ts` from the pinned `openapi.yaml`. It supports OpenAPI 3.0 and 3.1, recommends Node 20+, and has no Java dependency ([introduction](https://openapi-ts.dev/introduction)). Its output has no relative imports; I generated it from this contract and compiled it with a `module: nodenext` / `moduleResolution: nodenext` configuration matching the backend’s, without errors.
- **Frontend client:** `openapi-fetch` **0.17.0** is a 6 KB type-safe `fetch` wrapper with middleware. It takes `credentials` as a normal fetch option and supports request middleware for the CSRF header ([openapi-fetch](https://openapi-ts.dev/openapi-fetch/); [API](https://openapi-ts.dev/openapi-fetch/api)). It is not a generated client file; it is a typed runtime whose `paths` generic comes from the generated schema. The ticket’s “low-level client” is satisfied by this typed client plus the hand-written policy wrapper.
- **Backend:** use the generated types for DTOs and hand-write the NestJS controllers. Reinterpret ticket 02’s “server interfaces” as typed DTOs plus a typed handler boundary, not a generated server application. Provider contract tests, not generated controllers, prove the server implements the contract.
- **Pin each tool exactly** in the repository that uses it: `openapi-typescript` in both, `openapi-fetch` in the frontend. There is no `openapitools.json` and no generator JAR.

**Failing the build on drift.**

```sh
# In CI, after the pinned install:
pnpm contract:verify
openapi-typescript node_modules/@maxisun/shiftpatch-api/openapi.yaml \
  -o src/generated/api/schema.d.ts --check
```

`openapi-typescript --check` exits non-zero when the committed file differs from what the pinned schema would generate ([CLI flags](https://openapi-ts.dev/cli)). This is a direct drift check, not a `git diff` approximation. The same command works through npm scripts, which resolve the local dev dependency.

**Never hand-edit generated files.** The generated header says “Do not make direct changes to the file.” If a type is wrong, fix the OpenAPI document and cut a new contract release; do not patch `schema.d.ts`. Put `src/generated` under `CODEOWNERS` so a human still reviews the diff.

**Codegen upgrades are their own pull request.** Bump `openapi-typescript` (and `openapi-fetch` if its types changed), regenerate, review the diff, run the application tests, and merge separately from a contract bump. Otherwise a reviewer cannot tell whether a type change came from the contract or the tool.

**Commit `PROVENANCE.json`.** The `contract:generate` wrapper writes a small file next to the generated types with the contract version, source commit, work-spec tag/commit, and codegen versions. It makes the pin visible in the repository even when `node_modules` is absent, and it gives the PR reviewer the same identifiers the template asks for.

## 8. GitHub-native options: what to use and what to reject

| Option | Decision | Why |
|---|---|---|
| **Immutable releases** | **Use** | Locks the tag and assets after publication and generates a release attestation. Enable before the first contract release. This is the strongest GitHub-native guarantee for the contract bytes. |
| **Release attestations / `gh release verify-asset`** | **Use at release time; scheduled in consumers** | Replaces a custom signature/attestation scheme. Not needed on every pull request because npm/pnpm `integrity` already checks bytes on every install. `gh` 2.103.2 is preinstalled on the Ubuntu 24.04 runner image. |
| **GitHub Packages** | **Reject** | Requires authentication even for public packages, only supports classic PATs, and adds a second publication target. The public release asset is anonymously readable and already integrity-checked by npm/pnpm. |
| **Reusable workflows** | **Reject for two repositories** | A reusable workflow can be called cross-repository with `workflow_call` and pinned to a SHA, but it adds a cross-repository `uses` dependency, a permissions chain, and a shared failure domain. Two repositories with ~10 lines of contract CI each do not justify it. Revisit if a third consumer appears. |
| **Composite action** | **Reject** | Same trade-off as a reusable workflow, plus it must be published or checked out from the specs repository. The contract verification script is small enough to live in each repo. |
| **Dependabot against a registry** | **Reject for the contract** | Dependabot’s documented npm configuration is registry- and version-oriented; the contract is an exact tarball URL, not a registry version. Dependabot can still update `openapi-typescript` and `openapi-fetch` as ordinary npm dev/runtime dependencies. If the team later adopts a registry, Dependabot can use a private registry or automatic GitHub Packages access. |
| **Renovate `github-releases` + regex manager** | **Reject on day one; revisit** | Renovate has a `github-releases` datasource that looks up releases in a GitHub repository, and a regex manager could rewrite the URL. That is real configuration for one dependency and one release per API change. The release event is already a deliberate, reviewed change. |
| **Submodules** | **Reject for both artefacts** | Adds nested Git, explicit initialization, and exposure of the whole specs checkout. The contract has a package transport; the work spec has a tag and a commit permalink. Neither needs a submodule. |
| **`actions/checkout` of the specs repo** | **Reject** | It would clone the whole repository and, for a private repo, need a cross-repo token; for a public repo it still adds a checkout step and a second source of truth. Fetch only the pinned asset. |
| **Tag protection rulesets** | **Use if available** | Immutable releases protect release tags, not the work-spec tag. A ruleset that blocks tag updates/deletes closes that gap; the commit SHA in the PR remains the backstop. |
| **Actions cache** | **Use via `setup-node`** | `setup-node` caches npm/pnpm package data keyed by the lockfile hash; it does not cache `node_modules` ([setup-node](https://github.com/actions/setup-node)). This is enough for the npm-URL flow; no custom cache is needed. |

## 9. Risks and trade-offs

| Risk | What actually happens | Mitigation |
|---|---|---|
| **Local-development auth** | Public npm-URL flow: none. GitHub Packages: every developer needs a classic PAT with `read:packages` in `~/.npmrc`. Private fallback: developers use `gh auth login` locally; CI uses a GitHub App token. | Stay on the public npm-URL flow. If the repo becomes private, use `gh auth login` locally and an App token in CI; do not introduce a registry. |
| **Offline builds** | A cold cache cannot fetch the tarball. npm/pnpm caches store it by integrity, so a warm cache works; `setup-node` caches the package-manager store keyed by the lockfile. | Accept that a first build needs network. If true offline builds become a requirement, vendor the tarball into the consumer and keep the same integrity/provenance check; that is a deliberate fallback, not the default. |
| **CI token scope** | Public flow needs no cross-repo token. Private flow needs `Contents: read` and `Attestations: read` on `shifters-specs` only. A broad PAT would grant far more. | Use a GitHub App installation token scoped to `shifters-specs` with `permission-contents: read` and `permission-attestations: read`; never `contents: write`; never a user PAT with repo-wide scopes. |
| **Tag immutability** | Immutable releases lock the release tag and assets. The work-spec tag is an ordinary Git tag and can be moved or deleted unless protected. | Enable immutable releases before the first contract release. Protect the work-spec tag with a ruleset. Record the full commit SHA in every PR; the SHA, not the tag, is the pin. |
| **Pin drift between backend and frontend** | The backend and frontend can adopt different contract versions; types compile, but the integration fails at runtime. | Require the same contract version and work-spec tag/commit in paired PRs; run the integration test against the same pin; make the release notes list the consumer PRs; have `contract verify` print both values. |
| **Codegen version drift** | Different `openapi-typescript` or `openapi-fetch` versions produce different types or client behavior; a contract bump and a codegen bump hide each other. | Pin `openapi-typescript@7.13.0` in both repos and `openapi-fetch@0.17.0` in the frontend; commit generated output; CI runs `contract:check`; upgrade codegen only in a dedicated PR with a reviewed diff. |
| **Cost of the extra repository** | One more release ceremony and two cross-repo PRs per contract change; the specs repo has no CI, so the release is manual. | One contract release per API change, not per commit; documentation-only changes do not release; the work-spec tag moves only when tickets change. The specs repo already exists; the extra cost is process, not infrastructure. |
| **Specifications repository becomes private** | The npm URL dependency has no documented authentication path for GitHub release assets; installs fail. | Switch to the `gh release download` + SHA-256 + App-token fallback. Keep the same contract version, manifest, and work-spec pins. Do not attempt to authenticate npm to `github.com`. |
| **Release asset deleted** | The immutable release prevents modification, not deletion; a deleted asset breaks new installs. | Do not delete published releases. The specs repo still has the committed bundle as a mirror, and warm caches still work, but consumers should not depend on the mirror. |
| **URL dependency is not auto-updated** | Dependabot has no documented path to bump an exact tarball URL; `npm update` will not move it. | This is intentional. The specs release is the update event; a human opens the two consumer PRs. Revisit Renovate if releases become frequent. |
| **Generated-code churn** | A contract change touches many generated files; merge conflicts are possible if two branches regenerate. | Keep the generated diff in its own commit; merge contract bumps promptly; put `src/generated` under `CODEOWNERS`; never hand-edit. |
| **`npm pack` reproducibility across npm versions** | The tarball bytes can differ across npm versions even with identical content, so a rebuild may not reproduce the published SHA-256. | The published SHA-256 and the release attestation are the pin, not rebuild reproducibility. Pin the release toolchain in `RELEASING.md` and record the npm/Node versions used. |

## 10. What I could not confirm

- **Immutable releases for private repositories.** The documentation describes repository and organization settings without a visibility restriction, but I did not find an explicit statement that private repositories are supported. The current repository is public; verify the setting before relying on it after a privacy change.
- **Authenticated npm installs from private GitHub release-asset URLs.** npm documents per-registry `_authToken` configuration, not authenticated arbitrary tarball URLs. I found no npm or GitHub documentation describing this flow. Treat it as unsupported until tested.
- **`gh release verify` without authentication on a public repository.** It was not tested here. Run it at release time with an authenticated `gh`, or use `curl` + the SHA-256 sidecar for anonymous consumer verification.
- **Dependabot support for raw tarball-URL dependencies.** The documentation describes registry-based npm updates and private-registry configuration; I found no documented path for a raw HTTPS tarball. Do not plan on automatic bumps.
- **GitHub Packages’ classic-PAT-only restriction changing.** The documentation is explicit today, but authentication support is the kind of thing that can change. Re-check before adopting a registry.
- **`openapi-typescript` / `openapi-fetch` output stability across versions.** 7.13.0 generated `schema.d.ts` from the 3.1.0 contract and the backend’s TypeScript compiler accepted it under a `nodenext` configuration matching the backend’s; I did not exercise `openapi-fetch` against a live server or compare output across versions. Pin both versions and review upgrades.

## Repository references

- `docs/research/specs-repo-consumption.md` — prior recommendation for immutable contract releases and per-consumer pins; this document changes the transport, not the model.
- `docs/specs/api/CONSUMER-PINS.md` — current four-field lock format and sample pins.
- `docs/specs/api/RELEASING.md` — pinned Redocly 2.72.1 and oasdiff 1.35.0, manual validation, draft-then-publish procedure.
- `docs/specs/api/openapi.yaml` — OpenAPI 3.1.0, `info.version: 1.0.0`, 37 operations, cookie auth plus `X-CSRF-Token`.
- `docs/specs/api/releases/api-v1.0.0/` — checked-in tarball, checksum, and manifest; not an npm package today.
- `.scratch/shiftpatch-mvp/README.md` — ticket-set tagging and revision rules.
- `.scratch/shiftpatch-mvp/issues/01-contract-baseline-and-consumer-pin.md`, `02-backend-walking-skeleton.md`, `03-frontend-walking-skeleton.md` — the tickets this flow unblocks.
- `shifters-be/.github/workflows/ci.yml` — current backend CI; only unit tests with coverage.
- `shifters-be/package.json`, `shifters-be/.nvmrc`, `shifters-be/tsconfig.json` — pnpm 12.14.0, Node 26.13, TypeScript 6, native ESM.
- `shifters-fe/package.json`, `shifters-fe/package-lock.json`, `shifters-fe/src/` — npm, React 19, JavaScript today, no Git repository.

## Sources

1. OpenAPI Initiative, [OpenAPI Specification 3.1.0](https://spec.openapis.org/oas/v3.1.0.html).
2. Tom Preston-Werner / SemVer project, [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), especially §3 (released contents must not change).
3. npm Docs, [Package spec](https://docs.npmjs.com/cli/v11/using-npm/package-spec), “Tarballs”.
4. npm Docs, [package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json), `resolved` and `integrity`.
5. npm Docs, [npm-pack](https://docs.npmjs.com/cli/v11/commands/npm-pack).
6. npm Docs, [Using private packages in a CI/CD workflow](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow).
7. npm Docs, [.npmrc](https://docs.npmjs.com/cli/v11/configuring-npm/npmrc).
8. pnpm Docs, [Reading `pnpm-lock.yaml`](https://pnpm.io/lockfile), integrity and tarball semantics.
9. pnpm Docs, [package.json](https://pnpm.io/package_json), dependencies and publish configuration.
10. GitHub Docs, [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), authentication, scoped packages, publishing and installing.
11. GitHub Docs, [Introduction to GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/about-github-packages), authentication and billing overview.
12. GitHub Docs, [About permissions for GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages), classic-PAT requirement and scopes.
13. GitHub Docs, [Configuring a package’s access control and visibility](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility), workflow access and inheritance.
14. GitHub Docs, [GitHub Packages billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages), included storage and data transfer.
15. GitHub Docs, [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token), repository-scoped permissions.
16. GitHub Docs, [Making authenticated API requests with a GitHub App in a GitHub Actions workflow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow).
17. GitHub, [actions/create-github-app-token](https://github.com/actions/create-github-app-token), inputs and token behavior.
18. GitHub CLI manual, [gh release download](https://cli.github.com/manual/gh_release_download).
19. GitHub CLI manual, [gh release verify](https://cli.github.com/manual/gh_release_verify).
20. GitHub CLI manual, [gh release verify-asset](https://cli.github.com/manual/gh_release_verify-asset).
21. GitHub Docs, [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).
22. GitHub Docs, [Preventing changes to your releases](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes).
23. GitHub Docs, [Verifying the integrity of a release](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity).
24. GitHub Docs, [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), tags, assets, limits.
25. GitHub Docs, [REST API endpoints for release assets](https://docs.github.com/en/rest/releases/assets), `Accept: application/octet-stream` and 200/302 handling.
26. GitHub Docs, [Permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), `Contents: read` release endpoints.
27. GitHub Docs, [Getting permanent links to files](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files).
28. Git project, [git-submodules(7)](https://git-scm.com/docs/gitsubmodules).
29. Git project, [git-tag(1)](https://git-scm.com/docs/git-tag).
30. GitHub Docs, [Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), `workflow_call` and cross-repository `uses`.
31. GitHub Docs, [Dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching).
32. GitHub, [actions/setup-node](https://github.com/actions/setup-node), npm/pnpm cache behavior.
33. GitHub, [actions/runner-images](https://github.com/actions/runner-images), Ubuntu 24.04 image includes GitHub CLI 2.103.2.
34. OpenAPI Tools, [OpenAPI Generator generators list](https://openapi-generator.tech/docs/generators), `typescript-fetch`, `typescript-nestjs-server (beta)`.
35. openapi-ts, [openapi-typescript introduction](https://openapi-ts.dev/introduction), OpenAPI 3.0/3.1 support and runtime-free types.
36. openapi-ts, [openapi-typescript CLI](https://openapi-ts.dev/cli), `--check` and the generation flags.
37. openapi-ts, [openapi-fetch getting started](https://openapi-ts.dev/openapi-fetch/), the 6 KB type-safe fetch client.
38. openapi-ts, [openapi-fetch API](https://openapi-ts.dev/openapi-fetch/api), fetch options and middleware.
39. npm, [`openapi-typescript` package metadata](https://registry.npmjs.org/openapi-typescript/latest), version 7.13.0 at the research date.
40. npm, [`openapi-fetch` package metadata](https://registry.npmjs.org/openapi-fetch/latest), version 0.17.0 at the research date.
41. GitHub Docs, [Dependabot options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference), registries and npm ecosystem.
42. Renovate Docs, [GitHub Releases datasource](https://docs.renovatebot.com/modules/datasource/github-releases/).
43. GitHub CLI manual, [gh release edit](https://cli.github.com/manual/gh_release_edit).
44. GitHub, [actions/cache](https://github.com/actions/cache), current major version 6.
45. GitHub Docs, [Permissions required for GitHub Apps](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps), `Attestations: read` and `GET /repos/{owner}/{repo}/attestations/{subject_digest}`.
46. GitHub CLI manual, [gh release create](https://cli.github.com/manual/gh_release_create), `--target`, `--draft`, and immutable-release behavior.
