# PostHog Analytics Contract

PostHog measures whether the agreed staffing workflows are used. It is not an Audit Log, a source of operational state, or a recipient of Credential contents.

## Collection rules

- Use the ShiftPatch user ID as the distinct ID after authentication; anonymous authentication-page events use an anonymous ID until login.
- Include only the properties listed for each event plus `environment`, `role` when authenticated, and the standard event timestamp.
- Use `sandbox/prod` as the deployed environment value and `local` locally.
- Disable PostHog in local by default unless a developer explicitly configures a separate test project.
- Emit workflow-success events only after the backend commits the operation. Frontend-only clicks must not be reported as successful workflows.
- Disable session replay. Do not autocapture sensitive form values on authentication, Credential, Timesheet, Nurse detail, or Inspector Export pages.

## Events

| Event | When emitted | Allowed event-specific properties |
| --- | --- | --- |
| `nurse_registered` | Nurse account creation commits | None |
| `email_verified` | Email verification commits | None |
| `facility_created` | Facility creation commits | `facility_id` |
| `facility_manager_invited` | Invitation is created | `facility_id` |
| `credential_uploaded` | Current Credential creation commits | `credential_type`, `is_replacement` |
| `shift_created` | Open Shift creation commits | `shift_id`, `facility_id` |
| `shift_updated` | Open Shift update commits | `shift_id`, `facility_id` |
| `shift_claimed` | Claim commits | `shift_id`, `facility_id` |
| `shift_withdrawn` | Manual or automatic Withdrawal commits | `shift_id`, `facility_id`, `withdrawal_type` |
| `shift_cancelled` | Cancellation commits | `shift_id`, `facility_id`, `was_filled` |
| `shift_no_show_recorded` | No-show transition commits | `shift_id`, `facility_id` |
| `timesheet_submitted` | Nurse or on-behalf submission commits | `shift_id`, `facility_id`, `submission_source` |
| `timesheet_finalized` | Finalization commits | `shift_id`, `facility_id`, `was_corrected` |
| `inspector_export_created` | Export is stored successfully | `facility_id`, `nurse_count` |
| `dashboard_viewed` | Role-scoped dashboard loads | `dashboard_role` |

`withdrawal_type` is `manual` or `automatic`, matching the domain vocabulary. `submission_source` is `nurse`, `facility_manager`, or `admin`. No other free-form properties are permitted for these events without updating this contract.

## Prohibited data

Never send the following to PostHog:

- Email addresses, full names, passwords, session data, or authentication/invitation/reset tokens
- License numbers or document identifiers
- TB outcomes, test dates, expiry dates, or other Credential field values
- Credential documents, document URLs, signed URLs, file contents, or export file contents
- Actual hours, Timesheet notes, correction reasons, or free-form Shift data
- Patient data, which is prohibited throughout the MVP
- Audit Log message payloads or technical stack traces

IDs explicitly listed in the event table are allowed. Jurisdiction and Facility time zone are omitted from analytics even though they are operational data.

## Failure behavior

Analytics delivery is best-effort and happens after the authoritative operation. PostHog downtime, blocked browser requests, or invalid event delivery must not fail or roll back product workflows. Do not retry sensitive payloads through unrelated logging systems.
