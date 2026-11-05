# 02: Backend walking skeleton

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Take the existing NestJS scaffold to a deployable service that proves the whole path — HTTPS request through auth context and PostgreSQL to a response — with the cross-cutting behaviour every later ticket inherits. The scaffold already provides Nest 12 on Express, TypeScript 6 with native ESM, pnpm, Biome, Vitest, a multi-stage Dockerfile, and a compose dev service; extend those rather than replacing them.

**Blocked by:** 01 — Contract baseline and consumer pin

**Guide:** `docs/guides/contract-consumption.md`, backend branch. Follow it before any other work.

**Status:** done

**Revision:** 2

- [x] The directory is a git repository with a remote, so CI, releases, and pull requests are possible.
- [x] PostgreSQL runs for development, migrations apply to a clean database, and the container healthcheck keeps a 2xx process-liveness route; a separate database-readiness endpoint is intentionally not required.
- [x] API types and server interfaces are generated from the pinned contract; generated files are never hand-edited.
- [x] Configuration and secrets come only from environment or deployment configuration; none are committed, and `.env` loading works for local development.
- [x] Every request carries an ID, and structured logs exclude passwords, tokens, document contents, signed URLs, license numbers, and TB outcomes.
- [x] Errors use the contract envelope for validation, unauthorized, forbidden, not found, and conflict.
- [x] Cloudflare R2 is supported through an S3-compatible storage adapter, alongside transactional email and PostHog adapters that are safe no-ops when unconfigured.
- [x] The AWS SDK checksum defaults are set to `WHEN_REQUIRED` for request and response, and the storage smoke test covers put, presign, get, and delete against local MinIO through the same S3-compatible adapter; a live R2 run is not required for this ticket.
- [x] Local development runs MinIO in the compose stack, so the storage code path is the same as the deployed adapter.
- [x] CI runs `check`, `build`, `test`, and `test:e2e`, and the deployed service is reachable at <https://shifter-be.onrender.com>.

## Revisions

- **2026-11-05 — Revision 2:** Record the accepted scope: no database-dependent readiness endpoint is required, and local MinIO smoke coverage is accepted instead of a live R2 run. Record the deployed HTTPS URL and close the ticket.

## Comments

**2026-11-05 — completed**

- `contract:verify`, `contract:check`, `check`, `build`, `test` (133 passed), and `test:e2e` (14 passed) passed in `shifters-be`.
- `GET https://shifter-be.onrender.com/health/live` returned an `ok` status, and `/` returned `Hello World!`.
- The backend deployment notes record a successful local MinIO smoke through the same S3-compatible adapter.

**Spec:** `docs/specs/non-functional.md`, `docs/specs/api/openapi.yaml`
