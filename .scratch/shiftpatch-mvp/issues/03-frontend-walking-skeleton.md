# 03: Frontend walking skeleton

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Take the bare Vite scaffold to a deployable React and TypeScript application that renders a real response from the deployed backend, with the routing, session, and navigation shell every later screen builds on.

**Blocked by:** 02 — Backend walking skeleton

**Guide:** `docs/guides/contract-consumption.md`, frontend branch. Follow it before any other work.

**Status:** ready-for-agent

**Revision:** 1

- [ ] The scaffold is converted from JavaScript to TypeScript, as ADR-0001 requires, before any screen work begins.
- [ ] The directory is a git repository with a remote, and has linting, formatting, a test runner, and CI, none of which the scaffold currently has.
- [ ] Types and a low-level client are generated from the pinned artifact only; no hand-written duplicate DTOs exist.
- [ ] Public, authenticated, and role-gated route groups exist; an unauthenticated visit to an app route redirects to sign-in.
- [ ] Navigation derives from the session role, and a hidden control is never treated as an authorization check.
- [ ] No object-storage SDK, storage credential, or bucket policy lives in the frontend; uploads go to the API and downloads use the backend-issued link.
- [ ] One real backend request renders explicit loading, empty, recoverable-error, and success states.
- [ ] CI runs typechecking and tests; the app is deployed at an HTTPS URL and completes that request against the deployed API.

**Spec:** `docs/specs/frontend.md`, `docs/specs/non-functional.md`, `docs/adr/0001-react-frontend.md`
