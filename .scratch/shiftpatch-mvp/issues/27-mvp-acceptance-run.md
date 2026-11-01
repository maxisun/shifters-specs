# 27: MVP acceptance run

**Repo:** both implementation repos · **Contract:** `api-v1.0.0` (from 01)

**What to build:** Evidence that the deployed MVP satisfies all 33 acceptance scenarios, the PostHog boundaries, the no-deletion rule, the accessibility floor, and the deployment requirement — with defects turned into new tickets rather than quietly waived.

**Blocked by:** every other ticket (01–26)

**Status:** ready-for-agent

**Revision:** 1

- [ ] All 33 scenarios in the acceptance baseline are executed against the sandbox/prod deployment, each with recorded evidence (request/response, screenshot, or log) and a pass or defect outcome.
- [ ] Inspection of emitted analytics shows workflow events only after commit, only the allowed properties, no prohibited data, session replay disabled, and autocapture off on authentication, Credential, Timesheet, Nurse detail, and export pages (ACC-29).
- [ ] No product API or UI offers hard deletion of Credentials, assignments, Timesheets, exports, or Audit Log entries, and no scheduled job removes them (ACC-30).
- [ ] Nurse discovery, Claim, Credential upload, Withdrawal, and Timesheet submission work at 320 CSS pixels with keyboard only, and no status is conveyed by color alone (ACC-31).
- [ ] The deployed React app and NestJS API are reachable over real HTTPS URLs and complete the accepted workflows against deployed PostgreSQL, private object storage, transactional email, and PostHog (ACC-32).
- [ ] Every defect found becomes a new ticket; no scenario is marked passed without evidence.

**Spec:** `docs/specs/acceptance.md` (all), `docs/specs/non-functional.md`, `docs/specs/analytics.md`
