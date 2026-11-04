# 02: Backend walking skeleton

**Repo:** `shifters-be` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Take the existing NestJS scaffold to a deployable service that proves the whole path — HTTPS request through auth context and PostgreSQL to a response — with the cross-cutting behaviour every later ticket inherits. The scaffold already provides Nest 12 on Express, TypeScript 6 with native ESM, pnpm, Biome, Vitest, a multi-stage Dockerfile, and a compose dev service; extend those rather than replacing them.

**Blocked by:** 01 — Contract baseline and consumer pin

**Guide:** `docs/guides/contract-consumption.md`, backend branch. Follow it before any other work.

**Status:** ready-for-agent

**Revision:** 1

- [ ] The directory is a git repository with a remote, so CI, releases, and pull requests become possible; it currently is not one.
- [ ] PostgreSQL runs for development, migrations apply to a clean database, and a readiness check reports database connectivity while the container healthcheck keeps a 2xx route.
- [ ] API types and server interfaces are generated from the pinned contract; generated files are never hand-edited.
- [ ] Configuration and secrets come only from environment or deployment configuration; none are committed, and the missing `.env` loading is resolved for local development.
- [ ] Every request carries an ID, and structured logs exclude passwords, tokens, document contents, signed URLs, license numbers, and TB outcomes.
- [ ] Errors use the contract envelope for validation, unauthorized, forbidden, not found, and conflict.
- [ ] Cloudflare R2 is reachable through a small S3-compatible storage adapter, alongside transactional email and PostHog adapters that are safe no-ops when unconfigured.
- [ ] The AWS SDK checksum defaults are set to `WHEN_REQUIRED` for request and response, and a smoke test against a real R2 bucket covers put, presign, get, and delete.
- [ ] Local development runs MinIO in the compose stack, so the storage code path is identical locally and deployed.
- [ ] CI runs `check`, `build`, `test`, and `test:e2e`, and the deployed service is reachable at an HTTPS URL.

**Spec:** `docs/specs/non-functional.md`, `docs/specs/api/openapi.yaml`
