# Domain Model and Rules

This document defines the implementation-facing domain model for the ShiftPatch MVP. “Must” indicates a required rule; “must not” indicates a prohibited behavior.

## Entities

### User

Every authenticated person has exactly one role: `ADMIN`, `FACILITY_MANAGER`, or `NURSE`.

Common account data consists of an ID, full name, verified email address, authentication state, and creation timestamps. A Facility Manager belongs to exactly one Facility. Nurses and Admins do not belong to a Facility.

Admins are provisioned operationally. Nurses self-register. Facility Managers are invited by an Admin after the Facility has been created. Public registration cannot grant Admin or Facility Manager privileges.

### Facility

A Facility is the tenant boundary and has:

- Unique ID
- Name
- Jurisdiction used for Nursing License matching
- IANA time zone used for Shift display and expiry-date evaluation
- Creation and update timestamps

There is no Location entity. A Shift belongs directly to one Facility. A hospital network using multiple physical sites represents each site as a separate Facility.

Jurisdiction and time zone are fixed when the Facility is created. An Admin may later correct only its name. Changing jurisdiction or time zone requires a new Facility so that eligibility and historical time boundaries do not change silently.

### Nurse

A Nurse is a User who can browse Open Shifts, upload Credentials, claim Shifts, and submit Timesheets. A Nurse has no ongoing Facility membership and may work through multiple Facilities.

### Credential

A Nurse has one current Nursing License and one current TB Test Result. Uploading a Credential of an existing type replaces the current record; the old record and document remain in history.

A **Nursing License** contains:

- License number
- Issuing jurisdiction
- Expiry date
- Document

A **TB Test Result** contains:

- Result outcome: `NEGATIVE` or `POSITIVE`
- Expiry date
- Document

Credential documents and metadata are accepted without human or registry verification. A Credential is current only until replaced; expiry does not delete it or erase history.

A Credential remains valid through the end of its expiry date in the Facility’s time zone. For a Shift ending on the same calendar date as the Credential expiry, the Credential satisfies the date requirement for the entire Shift.

### Shift

A Shift contains only operational reservation data:

- Unique ID
- Facility
- Start datetime
- End datetime
- Status
- Assigned Nurse, once claimed
- Creation and update timestamps

A Shift has no pay, Location, unit, specialty, or instruction fields. Its end must be after its start, and it must be published directly rather than passing through a Draft state. Each Shift can be filled by at most one Nurse; multiple openings require separate Shifts.

Statuses are:

- `OPEN`
- `FILLED`
- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

Withdrawal is an action that returns a Shift to `OPEN`, not a separate status.

### Timesheet

A Timesheet belongs to exactly one Filled Shift and contains:

- Numeric actual hours worked, greater than zero
- Optional note
- Submitter and submission timestamp
- Whether submission was by the Nurse or on their behalf
- Finalizer and finalization timestamp, once final
- Correction reason, when finalization changed submitted hours

A Timesheet is either submitted or final. A final Timesheet is not editable in the MVP. Scheduled hours are derived from the Shift and remain separate from actual hours. There are no clock events, breaks, rounding rules, overtime, or pay calculations.

### Inspector Export

An Inspector Export is associated with one Facility and contains original current and historical Credential documents plus a manifest of Nurse and Credential metadata.

Its Nurse population is every Nurse with at least one successful current or historical claim at that Facility, regardless of the Shift’s later outcome. It includes all current and replaced Credentials for those Nurses. Generation is audited.

### Audit Log

Audit entries are append-only and contain actor, action, affected resource, timestamp, Facility when applicable, and relevant reason. Entries cannot be edited or deleted through product workflows.

All create, update, replacement, invitation, workflow, finalization, and export actions affecting Facilities, roles, Credentials, Shifts, Timesheets, and Inspector Exports must be audited. Routine login and logout are excluded. Document contents and sensitive field values must not be copied into audit metadata.

The stable audit action vocabulary is `FACILITY_CREATED`, `FACILITY_UPDATED`, `MANAGER_INVITED`, `MANAGER_INVITATION_ACCEPTED`, `CREDENTIAL_CREATED`, `CREDENTIAL_REPLACED`, `SHIFT_CREATED`, `SHIFT_UPDATED`, `SHIFT_CLAIMED`, `SHIFT_WITHDRAWN`, `SHIFT_CANCELLED`, `SHIFT_NO_SHOW`, `TIMESHEET_SUBMITTED`, `TIMESHEET_FINALIZED`, and `INSPECTOR_EXPORT_CREATED`. Resource types are `FACILITY`, `USER`, `MANAGER_INVITATION`, `CREDENTIAL`, `SHIFT`, `TIMESHEET`, and `INSPECTOR_EXPORT`.

A Withdrawal audit entry records `withdrawalType` as `MANUAL` or `AUTOMATIC` in typed metadata. Detailed eligibility reasons appear in the Nurse’s claim projection and notifications, not in audit metadata, so TB results and other Credential field values are not duplicated into the append-only Audit Log. These values support action filtering and operational drill-down without exposing Credential field values.

## Eligibility rules

A Nurse may browse Open Shifts without current Credentials. To claim a Shift, all of the following must hold at the authoritative server-side check:

1. The Nurse has a verified email address.
2. The Shift is `OPEN` and its start is in the future.
3. A current Nursing License exists.
4. The license jurisdiction exactly matches the Facility jurisdiction.
5. The license remains valid through the Shift end.
6. A current TB Test Result exists with outcome `NEGATIVE`.
7. The TB Test Result remains valid through the Shift end.
8. The Shift does not overlap another `FILLED` Shift assigned to the Nurse.

Eligibility is evaluated using the Facility’s jurisdiction and time zone. No Facility-specific approval or additional Credential type is allowed in the MVP.

Two Shifts overlap when their half-open intervals `[startAt, endAt)` intersect. One Shift ending exactly when another starts is not an overlap. No travel-time buffer is applied.

The claim operation must be atomic. If two Nurses claim one Open Shift concurrently, exactly one succeeds; the other receives a conflict and sees the current Shift state.

## Credential replacement and eligibility

Only current Credentials are used for new claims. Replacement retains the prior record and document for history and exports.

If replacement causes an assigned future Shift to fail any Credential rule, the system must:

1. Withdraw the Nurse automatically before the Shift starts.
2. Return the Shift to `OPEN` and clear the assignment.
3. Record an eligibility Withdrawal reason.
4. Audit the event.
5. Notify the Nurse and Facility Manager.

The system must not automatically disrupt a Shift that has already started. Manual operational handling applies after the start.

## Shift transitions

| Current state | Action | Guard | Next state | Required effects |
| --- | --- | --- | --- | --- |
| None | Publish | Valid future interval and Facility access | `OPEN` | Audit creation; notify dashboards |
| `OPEN` | Edit | Facility Manager for own Facility or Admin | `OPEN` | Audit all changed fields |
| `OPEN` | Claim | Eligible Nurse; atomic availability check | `FILLED` | Assign Nurse; audit; email both parties |
| `FILLED` | Withdraw | Assigned Nurse; before start | `OPEN` | Clear assignment; retain history; audit; email Facility Manager |
| `FILLED` | Automatic Withdrawal | Credential replacement breaks eligibility; before start | `OPEN` | Clear assignment; retain reason; audit; email both parties |
| `OPEN` | Cancel | Facility Manager for own Facility or Admin; before start | `CANCELLED` | Terminal; audit |
| `FILLED` | Cancel | Facility Manager for own Facility or Admin; before start | `CANCELLED` | Terminal; retain assignment history; audit; email Nurse |
| `FILLED` | Record No-show | Facility Manager for own Facility or Admin; at or after start | `NO_SHOW` | Terminal; audit; email Nurse |
| `FILLED` | Finalize Timesheet | Valid submitted or Manager-entered hours | `COMPLETED` | Final Timesheet; audit; email Nurse |

Additional invariants:

- A filled Shift’s reservation details are locked. Material changes require Cancellation and a new Shift.
- Cancellation is terminal and never reopens a Shift.
- A Nurse cannot withdraw at or after the start.
- No-show detection is manual; elapsed time alone never changes status.
- A No-show or Cancelled Shift has no final Timesheet and cannot become Completed.
- A Shift does not become Completed merely because its end passed.

## Nurse claim history

The Nurse’s own history is a privacy-preserving claim projection, not a view of other Nurses’ current Shift state. For each Shift the Nurse successfully claimed, it exposes the Facility, reservation times, and the Nurse’s own outcome: `ACTIVE`, `WITHDRAWN`, `CANCELLED`, `COMPLETED`, or `NO_SHOW`.

A Withdrawal includes its `MANUAL` or `AUTOMATIC` reason and affected eligibility reasons. If another Nurse later fills the same Shift, the prior Nurse’s history stays `WITHDRAWN` and must not reveal the current assignee or current Shift status. A Shift detail endpoint is readable by a Nurse only while the Shift is Open or currently assigned to that Nurse.

## Timesheet rules

After a Shift ends, the assigned Nurse may submit actual hours and an optional note. A Facility Manager for the Facility or an Admin may:

- Approve and finalize the submitted hours.
- Correct the hours while finalizing, with a mandatory correction reason.
- Enter and finalize hours on the Nurse’s behalf if the Nurse has not submitted.

The assigned Nurse may create or replace the Timesheet for their Shift until it is final, even when a Facility Manager or Admin initially submitted it on their behalf; the replacement is recorded as a Nurse submission. Once any submission exists, a Facility Manager or Admin cannot replace it through the on-behalf path; they must finalize it, supplying changed hours with a mandatory correction reason.

The final hours, submitter and finalizer identities, and any correction reason must be visible to the Nurse. The system records who submitted and finalized. No dispute or reopening workflow exists in the MVP.

## Reporting definitions

Operational reporting supports date filters and, for Admins, Facility filters. Facility Managers are restricted to their Facility.

- **Shifts by outcome:** count Shifts grouped by their current status.
- **Withdrawals:** count manual and automatic Withdrawal events, with reason available for drill-down.
- **No-shows:** count Shifts with status `NO_SHOW`.
- **Actual hours:** sum final Timesheet hours only.

Reporting filters use inclusive calendar start dates. Each Shift is evaluated against the selected dates in its own Facility’s local time, including when an Admin aggregates multiple Facilities. Every Shift-based metric in the range uses the Shift start date as its basis; actual hours still come only from final Timesheets. No predictive, financial, or custom reporting is required.

The dashboard’s credential exception count is independent of the Shift date filters. It counts current Credentials expiring from the current UTC calendar date through the next 30 calendar days, inclusive, and is scoped to the caller: a Nurse’s own Credentials, a Facility Manager’s Associated Nurses, or an Admin’s selected Facility or all Facilities.

## History and retention

Successful claims, assignments, Withdrawals, Cancellations, Credential replacements, Timesheet actions, exports, and their actors remain traceable even after the current Shift or Credential state changes. The MVP has no automated deletion schedule for these records.
