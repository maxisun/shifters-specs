# Frontend Requirements

The frontend is a responsive React application written in TypeScript. It consumes the REST contract in `api/openapi.yaml`; component libraries, state libraries, styling tools, and internal project structure belong to the frontend implementation repo.

## Global behavior

- Protect role-based routes and derive visible navigation from the authenticated role.
- Enforce permissions again in the backend; frontend role checks are for presentation only.
- Show explicit loading, empty, validation, permission, and recoverable error states.
- Display Shift datetimes in the Facility’s IANA time zone and include the time-zone abbreviation or name.
- Display Credential expiry as a date and state that it remains valid through that date for Shift eligibility.
- Never place document contents, license numbers, TB outcomes, email addresses, or authentication secrets in analytics or browser logs.
- Do not cache private Credential or Inspector Export responses in shared browser caches.
- After a mutation, refresh affected detail, list, and dashboard data. Polling does not replace immediate post-mutation refresh.

## Public and authentication routes

| Route | Purpose |
| --- | --- |
| `/` | Product information and sign-in/register links |
| `/login` | Email/password login |
| `/register/nurse` | Nurse self-registration with full name, email, and password |
| `/verify-email` | Email verification result and resend action |
| `/forgot-password` | Generic password-reset request |
| `/reset-password` | Token-based password reset |
| `/invitations/accept` | Facility Manager invitation acceptance |

Authenticated but unverified users are directed to `/verify-email`. There is no public Shift listing and no public Admin or Facility Manager registration.

## Shared authenticated routes

| Route | Role behavior |
| --- | --- |
| `/app` | Role-scoped dashboard summary |
| `/app/shifts` | Nurse Open Shift discovery; Facility-scoped operational list for Managers; global list for Admins |
| `/app/shifts/:shiftId` | Authorized Shift details and available workflow actions |
| `/app/timesheets` | Nurse own Timesheets; Facility-scoped queue for Managers; global queue for Admins |
| `/app/reports` | Facility-scoped operational reports for Managers; Facility filters for Admins |
| `/app/audit-log` | Facility-scoped entries for Managers; global entries for Admins; hidden for Nurses |
| `/app/account` | Own account information and password/session actions |

Admin-only Facility management lives at `/app/facilities` and `/app/facilities/:facilityId`; editing a Facility changes only its name. Nurse-only pages live at `/app/my-shifts` and `/app/credentials`. Facility Managers and Admins reach Associated Nurses from `/app/nurses` and `/app/nurses/:nurseId`.

## Nurse Shift discovery

The `/app/shifts` Nurse view must provide:

- All Open Shifts sorted by soonest start.
- Facility, jurisdiction, and start-date-range filters.
- Facility name, local start/end, time zone, and claim status.
- Current eligibility on each Shift detail.
- All applicable ineligibility reasons, including missing Credentials, a Credential that is not valid through the Shift end, non-negative TB result, jurisdiction mismatch, or overlapping Shift.
- A disabled claim action when ineligible and an enabled action only when currently eligible.
- Immediate handling of `409` claim conflicts with a refreshed list and a clear message that the Shift is no longer available.

No pay, specialty, unit, recommendation score, application count, or other Nurse identity is shown.

## Nurse own Shifts and Credentials

`/app/my-shifts` shows the Nurse’s own claim projection: Facility, start/end, and the caller’s outcome of `ACTIVE`, `WITHDRAWN`, `CANCELLED`, `COMPLETED`, or `NO_SHOW`, plus permitted Withdrawal and Timesheet actions. A Withdrawn claim shows its manual or automatic reason. If another Nurse subsequently fills that Shift, this screen must not reveal the current assignee or current Shift status.

`/app/credentials` provides:

- One current Nursing License card and one current TB Test Result card.
- Upload/replacement forms with exactly the metadata required by the API.
- Current-versus-historical labels and replacement history.
- Authorized document downloads.
- Expiry dates, scheduled reminder dates derived from the current Credential, and eligibility impact.
- A post-replacement summary of every automatically withdrawn future Shift and its eligibility reasons.

There is no delete action or multi-current-Credential interface.

## Associated Nurses

`/app/nurses` lists the Facility’s Associated Nurses for Facility Managers, or the selected Facility’s Associated Nurses for Admins. The list shows name and contact information and links to `/app/nurses/:nurseId`, where authorized users can review current and historical Credential metadata and download documents. The list and detail pages never expose non-associated Nurses or other Facilities’ data.

## Facility and Admin Shift operations

The operational Shift list supports status, date, and—in the Admin view—Facility filters. It exposes assigned Nurse identity only to authorized operational roles.

The Shift creation form contains Facility (Admin only), start datetime, end datetime, and no other reservation fields. Facility is read-only when editing; a Facility Manager’s Facility is fixed by the backend. Editing start and end is available only while Open. Filled Shift details explain that material changes require Cancellation and reposting.

Available detail actions are:

- Cancel before start for Facility Managers and Admins.
- Record No-show at or after start for Facility Managers and Admins.
- Withdraw before start for the assigned Nurse.
- Submit or finalize Timesheet according to role and state.

Destructive or terminal actions require confirmation and show their consequences before submission.

## Timesheets

The Timesheet queue distinguishes:

- Awaiting submission
- Submitted and awaiting finalization
- Final

The form uses numeric actual hours greater than zero and an optional note. On-behalf entry is available only when no submission exists, and the form explains that an existing submission must be corrected during finalization. The assigned Nurse may replace a non-final submission, including one initially recorded on their behalf. Finalization displays scheduled hours separately and never calculates pay. Corrections require a visible reason. Final Timesheets are read-only, and the Nurse can see submitter and finalizer names, final hours, and correction reason.

## Dashboards and reports

The dashboard presents role-relevant Shift counts, upcoming Shifts, pending Timesheets, and Credential exceptions. The exception count is independent of Shift date filters and covers current Credentials expiring from the current UTC date through the next 30 days for a Nurse’s own Credentials, a Facility Manager’s Associated Nurses, or an Admin’s selected Facility or all Facilities. Active operational views poll at least once every five seconds; hidden tabs should pause polling and refresh when visible again.

Reports use inclusive calendar-date filters interpreted in each Shift’s Facility-local time and provide:

- Shifts grouped by current status
- Manual and automatic Withdrawal counts
- No-show count
- Sum of final actual hours
- Date filtering and Admin Facility filtering

There are no financial widgets or custom report builders.

## Inspector Export

Authorized Facility and Nurse screens provide one export action scoped to the Facility. The action confirms the Facility and explains that current and historical Credential documents for all associated Nurses are included. The UI handles generation errors without implying that an export succeeded and opens only the short-lived authorized download returned by the backend.

## Audit Log

The Audit Log supports actor, the documented stable action, resource type, and date filtering within the caller’s permitted Facility scope. Rows show actor name and role, action, resource, timestamp, Facility, and relevant operational reason. Withdrawal rows expose manual versus automatic type but not Credential field values. No edit or delete controls exist. Document contents and sensitive Credential values are not rendered in audit metadata.

## Responsive and accessible behavior

- Nurse claiming, Withdrawal, Credential upload, and Timesheet submission must be usable at a 320 CSS-pixel viewport without horizontal page scrolling.
- Operational tables may use responsive cards or contained horizontal scrolling where appropriate.
- Interactive elements use semantic HTML, visible focus, keyboard operation, labels, and accessible error associations.
- Status is never communicated by color alone.
- WCAG 2.2 AA is a design target, not a certification claim for the MVP.
