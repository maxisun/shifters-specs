# ShiftPatch — Product Brief

## Problem

Healthcare facilities need to fill short-notice nursing shifts quickly. Juan runs operations for a growing hospital network and currently coordinates this work manually, making it difficult to know which shifts remain open and which have been filled.

ShiftPatch gives Facilities, Facility Managers, and Nurses one place to post, claim, and track nursing shifts.

## Product goal and validation boundary

The business goal is to validate demand among hospital operations managers and healthcare staffing directors. ShiftPatch itself implements the staffing workflow; customer-discovery activity is not a product feature.

Public nursing registries and hospital directories may be used outside the product for prospect research. They are not data sources or integrations in the MVP.

## Users

- **Admin:** a ShiftPatch operator who manages operations across all Facilities.
- **Facility Manager:** a user who manages Shifts, Timesheets, and associated Nurse records for one Facility.
- **Nurse:** a self-registered user who claims and works Shifts through one or more Facilities without an ongoing Facility membership.

These are the only user roles. “Facility” replaces the original term “agency”; third-party staffing agencies are not part of the product model.

## MVP scope

### Accounts and Facilities

- Email/password authentication, email verification, and password reset.
- Admin-created Facilities with a name, jurisdiction, and time zone.
- Admin invitations for Facility Managers; multiple Managers per Facility.
- Nurse self-registration and authenticated Shift browsing.
- Facility data isolation with cross-Facility Admin oversight.

### Credentials and eligibility

- Nurse-uploaded Nursing License and TB Test Result documents.
- One current Credential of each type per Nurse, with retained replacement history.
- Expiry-based eligibility without human or registry verification.
- Jurisdiction matching, negative-TB requirements, and validity through the Shift end.
- Automatic Withdrawal when a replacement makes a future Shift ineligible.
- Credential expiry reminders and authorized document access.

### Shift marketplace

- Directly published, single-Nurse Shifts with Facility, start/end datetimes, and status.
- Nurse discovery with Facility, jurisdiction, and start-date filters.
- Immediate first-successful-claim allocation with no approval step.
- Overlap prevention and specific ineligibility reasons.
- Editing for Open Shifts; Withdrawal, Cancellation, and No-show workflows.

### Timesheets and operations

- Actual-hours Timesheets submitted by Nurses or on their behalf.
- Facility Manager approval, audited corrections, and Completion.
- Role-based dashboards with updates propagated within five seconds.
- Operational reporting for Shift outcomes, Withdrawals, No-shows, and actual hours.
- Email notifications for the agreed operational events.
- Append-only Audit Logs with Admin global and Facility-scoped access.
- One-action Inspector Export of Credential documents and metadata.

### Analytics and delivery

- PostHog analytics for major product actions with sensitive-data exclusions.
- React web frontend, NestJS backend, TypeScript, PostgreSQL, REST, and polling.
- External private S3-compatible document storage.
- Local and sandbox/prod environments, with sandbox/prod deployed to a real HTTPS URL.
- Responsive layouts with WCAG 2.2 AA as a design target.

## Explicit non-goals

The MVP does not include:

- Patient information or patient-record workflows.
- Third-party staffing agency accounts.
- A Location hierarchy or address book.
- Pay rates, payroll, payments, financial reporting, or overtime calculations.
- Facility-specific Nurse pools, invitations, or claim approval.
- Human Credential approval, registry verification, or compact-license rules.
- Multiple current Credentials of the same type.
- Draft Shifts, applications, offers, shortlists, recommendations, or matching scores.
- Specialty-specific eligibility, unit fields, Shift instructions, or travel-time buffers.
- Clock-in/clock-out tracking, break calculations, or a Timesheet dispute workflow.
- SMS, push notifications, native mobile apps, or an in-app notification center.
- Predictive analytics, custom report builders, or a separate staging environment.

## Implementation-facing specifications

- [Canonical domain language](../GLOSSARY.md)
- [Domain model and rules](./specs/domain.md)
- [Workflows and notifications](./specs/workflows.md)
- [Permissions](./specs/permissions.md)
- [Frontend requirements](./specs/frontend.md)
- [Non-functional requirements](./specs/non-functional.md)
- [Analytics contract](./specs/analytics.md)
- [Acceptance scenarios](./specs/acceptance.md)
- [OpenAPI contract](./specs/api/openapi.yaml)
