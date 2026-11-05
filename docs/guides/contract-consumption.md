# Consuming the API contract

**For:** the person or agent starting ticket 02 (`shifters-be`) or ticket 03
(`shifters-fe`).

**Scope:** the contract pin, the provenance check, and generated types. Every
other acceptance criterion in those tickets stays in the ticket.

The contract is authored and published from this repository. A consumer never
clones this repository, never follows `main`, and never edits a pinned copy.

## Two pins, never one

| Pin | Records | Lives in the consumer as |
| --- | --- | --- |
| **Contract** | version, asset URL, digest, source commit | a `package.json` dependency plus the lockfile `integrity`, or an explicit `contracts/shiftpatch-api.lock.json` |
| **Work specification** | ticket-set tag and its full commit | `contracts/work-spec.lock.json` |

The contract pin is the bytes. The work-spec pin is the thinking those bytes
were agreed under. Record both in every implementation pull request.

`docs/specs/api/CONSUMER-PINS.md` owns the pin format. Do not restate it here;
read it once and follow Shape 1.

## Backend — `shifters-be`

### 1. Adopt the pin

```sh
git switch -c ticket-02-contract-consumption
pnpm add -D "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
pnpm add -D -E openapi-typescript@7.13.0
pnpm install --frozen-lockfile
```

A dev dependency is correct: nothing at runtime reads `openapi.yaml`. The
generator does, at build time, and the generated types are committed.

**Done when** `pnpm-lock.yaml` records the URL and an `integrity`, and a clean
`pnpm install --frozen-lockfile` exits zero.

### 2. Pin the work specification

Create `contracts/work-spec.lock.json`:

```json
{
  "ticketSet": "tickets-mvp-v1.0.1",
  "commit": "<full 40-character SHA the tag points at>"
}
```

**Done when** `git ls-remote --tags https://github.com/maxisun/shifters-specs.git tickets-mvp-v1.0.1`
resolves the tag to that same commit.

### 3. Verify provenance before generating

Add `scripts/contract-verify.mjs` and a `contract:verify` script. It reads the
installed package and fails loudly unless all of these hold:

- the dependency specifier is an exact
  `https://github.com/maxisun/shifters-specs/releases/download/api-v<X.Y.Z>/…tgz`
  URL, not a branch, range, or `latest`;
- the installed package `version`, `manifest.contractVersion`, the URL's
  `<X.Y.Z>`, and `info.version` in the bundled `openapi.yaml` all agree;
- `manifest.oasVersion` equals the `openapi` dialect in the bundled document;
- `manifest.sourceCommit` is a full 40-character lowercase SHA;
- the lockfile contains an `integrity` for the package;
- `manifest.workItems` is not empty and every entry has `id` and `revision`.

**Done when** the script passes on the real package and fails when you corrupt
any one field of a copied `manifest.json`.

### 4. Generate

```sh
pnpm exec openapi-typescript \
  node_modules/@maxisun/shiftpatch-api/openapi.yaml \
  -o src/generated/api/schema.d.ts
```

Add three scripts:

```json
{
  "contract:verify": "node scripts/contract-verify.mjs",
  "contract:generate": "openapi-typescript node_modules/@maxisun/shiftpatch-api/openapi.yaml -o src/generated/api/schema.d.ts",
  "contract:check": "openapi-typescript node_modules/@maxisun/shiftpatch-api/openapi.yaml -o src/generated/api/schema.d.ts --check"
}
```

**Done when** `pnpm contract:check` exits zero, and CI runs it after
`pnpm install --frozen-lockfile`.

### 5. Compile against it

Handlers and DTOs take their shapes from the generated types:

```ts
import type { components } from "../../generated/api/schema.js";

export class ClaimShiftDto implements components["schemas"]["ClaimShiftRequest"] {
  // ...
}
```

**Done when** changing a property name in the generated type makes `pnpm build`
fail, with no hand-written duplicate DTO anywhere in `src/`.

### 6. Record traceability

Put this block in the pull request body:

```text
Work specification: <permalink to ticket 02 at its full commit>
API contract: api-v1.0.0
Contract source: <manifest.sourceCommit>
Ticket set: tickets-mvp-v1.0.1 @ <full commit>
Operations: <comma-separated operationIds this change touches>
```

**Done when** all five lines are present and the SHA in `Contract source`
matches the installed manifest.

## Frontend — `shifters-fe`

Order matters. Ticket 03 requires TypeScript before screen work, and the pin
should copy a flow the backend has already proven.

1. **Create the repository.** `git init`, push to `maxisun/shifter-fe`, add
   baseline CI (`npm ci`, `npm run build`). Done when CI is green on `main`.
2. **Convert to TypeScript** as ADR-0001 requires. Done when the build and
   tests run from `src/**/*.tsx` with no `allowJs`.
3. **Adopt the pin.**

   ```sh
   npm install "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
   npm install -D -E openapi-typescript@7.13.0
   npm install -E openapi-fetch@0.17.0
   ```

   Done when `package-lock.json` records `resolved` and `integrity`, and
   `npm ci` succeeds from a clean checkout.
4. **Generate** into `src/generated/api/schema.d.ts` with the same
   `--check` gate. Done when `npm run contract:check` is clean in CI.
5. **Build one client.** `src/api/client.ts` wraps `createClient<paths>()` from
   `openapi-fetch`; screens import the wrapper, never the generated types
   directly. Done when no screen file imports from `generated/`.
6. **Record traceability** with the same five-line block as the backend.

## What the consumer must refuse

These are the failures that look harmless and are not.

| Refusal | Why |
| --- | --- |
| A branch, `latest`, a range, or a tag without a release asset | The pin must name bytes, not a moving ref |
| A URL that is not a release asset of `maxisun/shifters-specs` | Stops a consumer silently switching to a fork or mirror |
| A missing or mismatched lockfile `integrity` | The lockfile is the byte proof |
| A `manifest.sourceCommit` that is not a full SHA | Provenance must be checkable |
| Running a codegen version other than the pinned one | Output would not be reproducible |
| Writing generated files outside `src/generated` | Generated code must not overwrite hand-written code |
| Editing `openapi.yaml` or `package.json` by hand to "fix" a type | The contract changes here, then a new version is adopted |
| Auto-bumping the pin in a background job | Adoption is a reviewed change |

## Pointers

- `docs/specs/api/CONSUMER-PINS.md` — pin format and verification commands.
- `docs/specs/api/RELEASING.md` — how a release is cut, and why generated
  backend documents are a diagnostic only.
- `docs/research/spec-consumption-flow.md` — the reasoning behind this flow,
  including why a registry and a custom downloader were rejected.
- `.scratch/shiftpatch-mvp/issues/02-*.md`, `03-*.md` — the full tickets.
