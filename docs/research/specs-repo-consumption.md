# Consuming a specifications repository from backend and frontend repositories

**Date:** 2026-10-31  
**Scope:** ShiftPatch's three-repository model: specifications, backend, and frontend.  
**Terminology below:** “sourced fact” describes what a standard or tool guarantees; “recommendation” is the proposed ShiftPatch policy and its trade-offs.

## Executive recommendation

**Use two consumption paths for two different kinds of truth:**

1. **Human/product/work specifications:** keep them as reviewed Markdown in the specs repository. Implementation issues and pull requests reference the relevant work item by a **full-commit permalink**, not by `main` or by an unversioned issue title.
2. **Machine-readable API contracts:** hand-author OpenAPI in the specs repository, validate it in CI, and publish each approved contract as an **immutable, SemVer-versioned release artifact**. Backend and frontend each pin an exact artifact version, URL, checksum, and source commit in a small committed lock file; each generates its own types/client/server interfaces from that artifact.

This avoids making either implementation repository consume the whole specs checkout merely to obtain an HTTP contract. It also makes adoption an explicit, reviewable change instead of an invisible update to a moving branch. Git submodules, subtrees, and language packages remain reasonable in the circumstances described below; there is no universally best transport.

## 1. Separate work specifications from API contracts

**Sourced fact.** OpenAPI is a language-agnostic description of an HTTP API's surface. An OpenAPI Description can drive documentation, client/server generation, and testing tools ([OpenAPI Specification 3.2.1, §2](https://spec.openapis.org/oas/v3.2.1.html#introduction)). It is therefore a good machine contract, but that scope does not make it a complete product or work specification.

**Recommendation:**

| Artifact | Owns | Does not own | How consumers use it |
|---|---|---|---|
| Product/work specification (Markdown) | Problem, user behavior, scope, non-goals, acceptance criteria, UX states, rollout and business rules | Exact serialization details better expressed in OpenAPI | Read during implementation; link tests and PRs to its stable ID and exact revision |
| OpenAPI Description | Paths/operations, parameters, request/response media types and schemas, status codes, security declarations, API examples and errors | Product rationale, all UI behavior, implementation design, and proof that code behaves correctly | Validate, diff, render docs, generate language bindings, and test HTTP interactions |

Link the two rather than duplicating either. A work item should name affected OpenAPI `operationId`s; a contract release manifest should list the accepted work-item revisions that motivated it. Do not generate product specifications from OpenAPI, and do not treat generated API documentation as acceptance criteria.

## 2. Consumption mechanisms and trade-offs

| Mechanism | Sourced behavior | Recommendation and trade-offs |
|---|---|---|
| **Git submodule** | A superproject records the submodule's exact commit in a gitlink; ordinary clone/pull does not check out submodules by default ([Git submodule guide](https://git-scm.com/docs/gitsubmodules#_description), [implementation details](https://git-scm.com/docs/gitsubmodules#_implementation_details)). | Exact revision and no release infrastructure; useful for frequent cross-repository authoring. Costs are explicit initialization/update commands, a nested Git workflow, and exposure of the entire specs checkout. Updates should still be separate consumer PRs at a tagged commit. |
| **Git subtree / vendored snapshot** | A subtree is ordinary content in a subdirectory and needs no `.gitmodules` or special consumer workflow; updates are merged from the source project ([Git subtree manual](https://github.com/git/git/blob/master/contrib/subtree/git-subtree.adoc)). | Simple, self-contained/offline checkouts and easy local reading. In exchange, content is copied into each consumer, updates are merge operations, and local edits can diverge. Prefer one-way vendoring with a recorded upstream commit if this is chosen. |
| **Language package dependency** (for example npm) | npm accepts registry versions, tarballs, and Git refs; its committed lockfile records the exact resolved dependency tree and artifact integrity ([npm package spec](https://docs.npmjs.com/cli/v11/using-npm/package-spec), [package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json#description)). | Best when native dependency/update tooling matters, especially for a generated TypeScript client. Publishing and authentication become part of the pipeline; separate ecosystems need separate packages, and generated clients couple consumers to generator/runtime choices. Pin exact versions and commit the ecosystem lockfile. |
| **Versioned release artifact** | GitHub releases are based on tags and can carry assets ([GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)). GitHub's immutable-release option locks published assets and the associated tag and provides an attestation ([immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)). | **Recommended default:** language-neutral, curated, small, explicitly versioned, and independent of implementation release cadence. It needs a small download/verify/update command and usable private-artifact credentials. Enable immutable releases where available; checksums additionally detect content drift. |
| **Direct Git URL at a commit** | A GitHub file URL containing a commit ID links to that exact file version; a branch URL can change ([GitHub permalinks](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files)). | Good for PR previews and traceability, and acceptable as a minimal bootstrap. It lacks curated release notes and release-level compatibility semantics, so it should not be the long-term default for production consumer builds. |

**Do not combine multiple writable copies of the contract.** Regardless of transport, the specs repository is authoritative; consumer-side OpenAPI edits must be proposed upstream, not patched locally. Avoid floating `main`, `latest`, branch names, or mutable release assets in reproducible consumer builds.

### When the default should change

- If both consumers are JavaScript/TypeScript and a private registry already exists, an exactly pinned npm package containing the OpenAPI document—and optionally a generated client—may be simpler than custom artifact download code.
- If the team has no release pipeline and frequently edits all three repositories together, a submodule pinned to contract tags is a reasonable starting point.
- If CI must be fully offline or checkouts must be self-contained, a one-way subtree/vendor snapshot may outweigh duplication.
- These are operational preferences, not changes to the source-of-truth or versioning model.

## 3. Concrete default layout

The following is illustrative; it does not require moving the existing local `.scratch` tracker.

```text
shifters-specs/
  work-items/
    SP-123-incremental-shift-patch.md   # human-authored; stable ID
  contracts/
    shiftpatch-api/
      openapi.yaml                     # hand-authored entry document
      paths/                           # optional hand-authored splits
      schemas/                         # API DTO schemas, not DB entities
      compatibility-policy.md
  docs/

shifters-backend/
  contracts/shiftpatch-api.lock.json   # committed exact release pin
  codegen/                             # pinned generator version/config
  src/generated/                       # derived; never hand-edited
  src/                                 # handlers, domain logic, adapters, tests

shifters-frontend/
  contracts/shiftpatch-api.lock.json   # same version, updated independently
  codegen/
  src/generated/api/                   # derived types/low-level client
  src/                                 # hand-written application-facing data layer/UI
```

Publish release `api-v1.4.0` with:

- `shiftpatch-api-1.4.0.tar.gz`: the complete OpenAPI Description, any referenced local schema files, a changelog, and `manifest.json`;
- a SHA-256 checksum file and, where supported, the platform's release attestation;
- optional rendered API documentation.

The manifest should contain `contractVersion`, `oasVersion`, full specs `sourceCommit`, and exact work-item links. It should not contain implementation code. An illustrative consumer lock file is:

```json
{
  "contractVersion": "1.4.0",
  "url": "https://github.com/ORG/shifters-specs/releases/download/api-v1.4.0/shiftpatch-api-1.4.0.tar.gz",
  "sha256": "<64-hex-digest>",
  "sourceCommit": "<full-specs-commit-sha>"
}
```

A tiny repository-owned `contract sync` command should download only that URL, verify the digest, replace derived contract files, and run generation. A bot may propose lock-file updates, but a normal consumer PR reviews and merges them.

## 4. Versioning, compatibility, and traceability

### Keep the version axes distinct

- **Work specification revision:** full Git commit permalink. A stable work-item ID alone identifies the work, not the exact accepted text.
- **Contract release:** SemVer `MAJOR.MINOR.PATCH`: major for incompatible API changes, minor for backward-compatible functionality, patch for backward-compatible fixes ([SemVer 2.0.0](https://semver.org/spec/v2.0.0.html#semantic-versioning-specification-semver)). Released versions must not be modified in place ([SemVer §3](https://semver.org/spec/v2.0.0.html#spec-item-3)).
- **OpenAPI dialect:** the `openapi` field identifies the specification version used by the document; `info.version` identifies the OpenAPI document version and is distinct from both the dialect and the described API's version ([OAS fixed fields](https://spec.openapis.org/oas/v3.2.1.html#fixed-fields), [Info Object](https://spec.openapis.org/oas/v3.2.1.html#info-object)). Use `info.version` for the contract release, and also record the source commit because documentation-only edits and provenance still matter.
- **Generator/toolchain version:** pin independently in each consumer. A contract being valid does not guarantee identical output from different generators or versions.

### Written compatibility policy

Classify changes by whether a client written against the old contract can stop working, not merely by whether the diff is “additive.” Oasdiff uses this contract-oriented model; for example, adding a required request property is breaking even if a particular server remains lenient ([oasdiff compatibility model](https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md#how-oasdiff-decides-what-is-breaking)).

Recommended policy:

- **Usually compatible:** documentation corrections with no semantic change, new operations, and new optional request inputs. Response additions require an explicit client-tolerance policy because strict validators and closed generated models can behave differently.
- **Potentially or definitely breaking:** removing/renaming operations or fields, adding required request data, tightening validation, changing types/nullability/status or media types/auth, changing meaning, and adding response enum values that closed clients cannot handle. Oasdiff specifically supports an extensible-enum convention only when clients provide unknown-value fallback behavior ([enum guidance](https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md#breaking-changes-to-enum-values)).
- **Breaking release:** bump the contract major and provide a runtime migration plan. A new artifact number alone does not keep a deployed API compatible. Prefer **expand → migrate consumers → retire**; support old and new runtime interfaces for the announced overlap, and only remove the old interface after measured consumer migration.

A contract major version, a runtime API version (for example `/v2`), and a work-item revision are related but not interchangeable. Record all applicable identifiers in migration notes.

### Traceability rule

Every backend/frontend implementation PR should include:

```text
Work specification: <full-commit permalink>#<section-or-acceptance-criterion>
API contract: api-v1.4.0
Contract source: <full specs commit SHA>
Operations: createShiftPatch, getShiftPatch
```

Deployment/release notes should retain the same contract pin. If a local `.scratch` item is not published in Git, it cannot provide an immutable cross-repository link; reference an accepted, commit-addressable product/work specification instead rather than pretending a local-only file is reproducible provenance.

## 5. Design-first authoring and generation

**Recommended hand-authored source:**

- Work specifications and curated acceptance examples.
- OpenAPI operations and stable `operationId`s, parameters, API DTO schemas, success/error responses, security requirements, descriptions, and compatibility notes.
- Backend business logic, persistence/domain models, handler adapters, and frontend presentation/application behavior.
- Consumer tests that verify important semantics and acceptance criteria.

**Recommended generated output:**

- Frontend transport types and a low-level client, hidden behind a small hand-written application data layer.
- Backend API DTOs and server interfaces/stubs where the selected framework benefits from them; handlers and domain mapping remain hand-written.
- API reference documentation, optional mocks, and derived validation code.

OpenAPI Generator, for example, provides client, server, documentation, and schema generators across many languages, with differing stability labels ([official generator list](https://openapi-generator.tech/docs/generators)); its CLI accepts an input document, generator, output directory, and checked-in configuration ([generation usage](https://openapi-generator.tech/docs/usage#generate)). Select and pin a generator only after testing its actual output; do not assume feature parity.

Generate separately in backend and frontend by default. Publishing a central generated SDK is worthwhile only when several consumers need the same language/runtime behavior; it adds another release and compatibility surface. Never hand-edit generated files, and never regenerate an alternative OpenAPI document from backend annotations and treat it as a second authority. A backend-emitted document may be compared against the pinned source as a diagnostic.

## 6. CI and testing gates

### Specs repository, on every contract PR

1. Validate the OpenAPI document and resolve all intended references; lint team rules and validate examples. Oasdiff's `validate` command checks structural/OpenAPI/JSON-Schema violations and unresolved references ([validation documentation](https://github.com/oasdiff/oasdiff/blob/main/docs/VALIDATE.md)).
2. Diff against the latest released contract, produce a readable changelog, and gate breaking/potentially breaking findings. For a strict initial policy, run `oasdiff breaking --fail-on WARN base.yaml revision.yaml`; `ERR` denotes definite and `WARN` potential breaking changes ([CLI semantics](https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md#checks)). Review waivers explicitly rather than silently ignoring them.
3. Check the intended SemVer bump and require migration notes for a major. Oasdiff has version-bump checks, but they are informational by default and must be raised to errors if used as a gate ([versioning checks](https://github.com/oasdiff/oasdiff/blob/main/docs/VERSIONING.md#enforcing-the-policy)).
4. Smoke-test the chosen representative generators. Human review remains necessary for behavior, semantics, acceptance criteria, and any change classes a tool does not cover; automated diffing is not proof of compatibility.

Publish only from the protected main branch after approval. For immutable releases, create a draft, attach all assets, then publish—the order recommended by GitHub ([release workflow](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases#best-practices-for-publishing-immutable-releases)).

### Backend and frontend, on every update/implementation PR

- Verify the exact artifact digest and source commit; regenerate from a clean checkout. If generated files are committed, fail on unexpected generation drift; otherwise generate deterministically during build/test.
- Compile, lint, and run unit tests. Pin generator versions and configuration as well as the contract.
- **Backend:** run provider contract tests against real HTTP handlers, including success, validation errors, authentication/authorization, and documented error bodies. Schema-driven property tests, for example with Schemathesis, can supplement hand-written examples ([Schemathesis documentation](https://schemathesis.readthedocs.io/en/stable/)).
- **Frontend:** test generated-request serialization and response handling against mocks derived from the same pin, including unknown/tolerated data where the compatibility policy requires it.
- Run a smaller set of integration tests against the real backend; types and mocks cannot establish that the provider implements the contract.

Pact defines integration contract testing as checking consumer and provider interactions in isolation against concrete request/response expectations ([Pact: how it works](https://docs.pact.io/getting_started/how_pact_works)). Its documentation distinguishes this from standalone provider validation against OpenAPI, which does not test whether consumers call the provider correctly ([Pact introduction](https://docs.pact.io/#provider-contract-testing)). **Recommendation:** do not add a second Pact contract ecosystem by default for one backend/frontend pair; add consumer-driven contract tests when concrete consumer expectations justify their maintenance, and check them for consistency with the authoritative OpenAPI contract.

## 7. End-to-end change workflow

1. **Specify:** create or update the work item with acceptance criteria and API impact. Assign a stable ID.
2. **Design together:** in one specs PR, update the work item and hand-authored OpenAPI; name affected operations. Product, backend, and frontend review the same proposed interface before implementation.
3. **Validate and release:** merge after CI/review, then publish the next immutable contract artifact with its SemVer bump, changelog, checksum, source commit, and work-item links. Documentation-only work-spec changes need no contract release. Use a prerelease artifact for explicitly experimental coordination rather than silently treating it as stable.
4. **Adopt explicitly:** backend and frontend each open a PR changing their lock file to that release, regenerate, and inspect the contract/codegen diff. Neither repository auto-follows the specs main branch.
5. **Implement independently:** backend implements provider behavior and provider contract tests; frontend implements against generated types/mocks. Both PRs record the exact work-spec permalink and contract release.
6. **Verify together:** run integration/acceptance tests using the same contract pin. If the contract was wrong, return to step 2 and publish a new version; do not patch a consumer's copy.
7. **Deploy compatibly:** for additive changes, make the provider available before requiring it from the frontend. For breaking changes, execute the documented expand/migrate/retire sequence rather than switching all repositories atomically.
8. **Close with evidence:** mark the work item complete only after implementation adoption and acceptance verification. Retain the work-spec revision, contract release, implementation PRs, and deployment versions as the traceability chain.

## 8. Remaining uncertainties and decision points

- Backend language, frontend stack, hosting provider, and private-artifact authentication were not specified. They determine whether release-asset download code or a native package registry is operationally cheaper.
- Do not adopt the newest OpenAPI dialect solely because it is newest. At the research date, 3.2.1 is the latest published version ([OAS version list](https://spec.openapis.org/oas/v3.2.1.html)); choose a dialect supported correctly by the selected validators, generators, and runtime libraries, and pin that toolchain.
- If independently evolving APIs appear, give each its own contract path, version stream, tag prefix, and lock entry; do not force unrelated contracts into one repository-wide major version.
- Generated-code commits versus build-time generation is a consumer-local choice. The default here is clean deterministic generation in CI; committing generated output can improve reviewability/offline builds but requires a no-drift check.

## Sources

1. OpenAPI Initiative, [OpenAPI Specification 3.2.1](https://spec.openapis.org/oas/v3.2.1.html), especially §§2, 4.1–4.2.
2. Tom Preston-Werner/SemVer project, [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
3. Git project, [gitsubmodules(7)](https://git-scm.com/docs/gitsubmodules) and [git-submodule(1)](https://git-scm.com/docs/git-submodule).
4. Git project, [git-subtree manual, source](https://github.com/git/git/blob/master/contrib/subtree/git-subtree.adoc).
5. GitHub Docs, [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) and [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).
6. GitHub Docs, [Getting permanent links to files](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files).
7. npm Docs, [Package spec](https://docs.npmjs.com/cli/v11/using-npm/package-spec) and [package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json).
8. OpenAPI Tools, [OpenAPI Generator: generators](https://openapi-generator.tech/docs/generators) and [usage](https://openapi-generator.tech/docs/usage).
9. Oasdiff project, [Breaking changes](https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md), [validation](https://github.com/oasdiff/oasdiff/blob/main/docs/VALIDATE.md), and [versioning](https://github.com/oasdiff/oasdiff/blob/main/docs/VERSIONING.md).
10. Pact Foundation, [Introduction](https://docs.pact.io/) and [How Pact works](https://docs.pact.io/getting_started/how_pact_works).
11. Schemathesis project, [official documentation](https://schemathesis.readthedocs.io/en/stable/).
