# Non-functional Requirements

## Security and privacy

- Apply backend authorization and Facility isolation to every resource, export, and download.
- Require verified email before role-based application access.
- Use secure session handling. If cookie sessions are used, cookies must be `HttpOnly`, `Secure` in sandbox/prod, and have an appropriate `SameSite` policy; unsafe cookie-authenticated requests require CSRF protection.
- Authentication, invitation, verification, and reset tokens must not appear in application logs or PostHog.
- Do not reveal whether an email is registered through password-reset or verification-resend responses.
- Do not collect or store patient information.
- Do not expose another Nurse’s identity, contact information, Credentials, Timesheets, or claim activity to a Nurse.
- Treat TB Test Results and all Credential documents as sensitive workforce data even though no patient data is stored.

## Document and export storage

- Store Credential document binaries and generated Inspector Exports in external private S3-compatible object storage.
- PostgreSQL stores operational records and document metadata, not document binaries.
- Encrypt documents in transit and at rest.
- Require an authorized backend check for every download. Use either an authorized streaming response or a short-lived signed URL; never issue permanent public URLs.
- Do not log signed URLs, document bytes, license numbers, TB outcomes, or sensitive form values.
- Apply the same authorization rules to current and historical documents and to generated exports.

## Data integrity and concurrency

- The backend is authoritative for role, Facility association, current time, status transitions, and eligibility.
- Claim and status-transition checks must be atomic with their writes. Exactly one Nurse can hold a Shift assignment.
- Email, analytics, object-storage URLs, and dashboard polling must never weaken or bypass workflow invariants.
- A notification or analytics failure must not roll back an already committed claim, Withdrawal, Cancellation, No-show, or Timesheet finalization.
- Record all timestamps in API responses as RFC 3339 datetimes. Use the Facility’s IANA time zone for local display, date-range reporting, and expiry-date boundaries.

## Performance and availability

- Under normal operation, a successful claim response is immediate and includes the authoritative Shift state.
- Active operational views poll no less frequently than once every five seconds, so other actors’ changes propagate within the agreed bound under normal operation.
- The MVP has no formal availability SLA. Failures must produce recoverable errors rather than silently showing stale data as current.
- Export generation may take longer than ordinary reads, but the UI must represent only actual success and must not expose partial files.

## Retention and deletion

- Do not automatically delete historical Credentials, Shifts, assignment history, Timesheets, Inspector Exports, or Audit Log entries.
- Replacing a Credential changes only which record is current; it does not delete the prior record or document.
- The MVP exposes no hard-delete operation for users or operational records. If an account with history must be deactivated, that is an operational Admin action outside the product UI; access is revoked without deleting history.
- No jurisdiction-specific retention duration is asserted by the MVP. A later formal policy may introduce one through an explicit product decision.
- Audit entries have no product edit or delete operation.

## Accessibility and client support

- Deliver a responsive web application, not native mobile applications.
- Support current stable major browsers in sandbox/prod.
- Target WCAG 2.2 AA semantics, keyboard access, focus visibility, contrast, labels, and error identification. This is a design target, not an audited certification requirement.
- Preserve core Nurse workflows on small screens and operational workflows on desktop screens.

## Environments and deployment

The environment topology is exactly:

1. **Local:** developer-run frontend, backend, dependencies, and test data.
2. **Sandbox/prod:** the single deployed environment, available at a real HTTPS URL.

There is no separate staging environment. Local uses non-production credentials and test data. Sandbox/prod secrets are supplied through deployment configuration and are never committed to any repo. Its frontend, backend, PostgreSQL, private object storage, transactional email, and PostHog configuration must reference the intended deployed environment.

The deployed React app and NestJS API must use HTTPS, and direct HTTP access must redirect to HTTPS where the hosting platform permits it.

## Observability

- Keep the append-only domain Audit Log separate from technical logs and PostHog.
- Technical logs include request IDs and actionable errors but exclude passwords, tokens, document contents, signed URLs, license numbers, TB outcomes, and unnecessary personal data.
- PostHog follows `analytics.md`; session replay and sensitive-form autocapture are disabled.
- Backend implementation-specific tracing, logger libraries, and monitoring vendors remain in the backend repo.
