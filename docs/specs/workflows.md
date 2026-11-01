# Workflows and Notifications

## Facility and Facility Manager onboarding

1. An Admin creates a Facility with its name, jurisdiction, and IANA time zone.
2. The system audits Facility creation.
3. The Admin invites one or more Facility Managers by email.
4. The invited person accepts, supplies their full name and password, and receives a verified Facility Manager account associated with that Facility.
5. The invitation cannot be used to select another Facility or role.
6. Additional Managers have the same permissions as the first Manager.

Facility self-service signup and public Manager registration are not supported.

## Nurse registration and authentication

1. A Nurse registers with full name, email, and password.
2. The system sends an email containing a verification action.
3. Until verification succeeds, the account cannot access role-based application resources.
4. After verification, the Nurse can sign in, browse Shifts, and manage their own Credentials.
5. Password-reset requests always produce a generic response so account existence is not disclosed.
6. Authentication provider errors must not prevent already committed staffing operations from remaining committed.

Admin accounts are provisioned operationally and cannot be created through public registration.

## Credential upload and replacement

1. The Nurse selects the Credential type and supplies its required metadata and document.
2. The backend stores the document privately and records the new Credential as current.
3. Any prior current Credential of that type becomes historical and remains downloadable to authorized users.
4. The system audits the upload and replacement.
5. The backend reevaluates the Nurse’s assigned future Shifts.
6. Each newly ineligible future Shift is automatically withdrawn and reopened, with the reason, notifications, and audit entries described in the domain rules.
7. The Nurse sees the new current Credential and each affected Shift with its Withdrawal reason when the workflow completes.

Credential expiry itself never deletes a record. Once a Credential reaches its expiry date, it stops satisfying any Shift ending after the valid-through boundary.

## Publish and edit a Shift

1. A Facility Manager selects their own Facility implicitly; an Admin explicitly selects a Facility during creation.
2. The actor supplies start and end datetimes. The backend validates that end is after start and start is in the future.
3. Publishing creates an `OPEN` Shift immediately and audits the action.
4. While the Shift remains `OPEN`, an authorized actor may edit its start or end and republish the updated reservation details.
5. The Facility is immutable after creation. Once Filled, start and end are also locked. Any material change requires Cancellation and creation of a replacement Shift.

There is no Draft, pay, Location, unit, specialty, or instruction data in the form. Facility is read-only on edit.

## Browse and claim

1. An authenticated Nurse retrieves all Open Shifts, sorted by soonest start.
2. Optional filters are Facility, jurisdiction, and start-date range.
3. For each Shift, the frontend displays current eligibility and all applicable reasons when claiming is unavailable.
4. The Nurse submits a claim for an eligible Shift.
5. The backend repeats every eligibility and availability check atomically.
6. On success, the Shift becomes Filled, the assignment and audit event are stored, and notification emails are queued to the Nurse and Facility Manager.
7. On a race, the losing request receives `409 SHIFT_NOT_OPEN`; the frontend refreshes the Shift and list.

The Nurse can see Open Shifts for which they are ineligible, but cannot bypass the server-side claim checks.

## Nurse Withdrawal

1. The assigned Nurse withdraws before the Shift start.
2. The backend verifies the Shift is Filled to that Nurse and the start has not arrived.
3. The Shift returns to Open and the current assignment is cleared.
4. Prior assignment history remains traceable.
5. The Withdrawal is audited, the Facility Manager is emailed, and relevant dashboards update.

A Nurse cannot withdraw after the start. No penalty or approval workflow is applied.

## Facility Cancellation

1. A Facility Manager or Admin selects an Open or Filled Shift before its start.
2. Cancellation changes the Shift to `CANCELLED` permanently.
3. The actor, prior assignment, and action are retained in history and audited.
4. If a Nurse was assigned, the Nurse receives a Cancellation email.
5. The Shift cannot be claimed, edited, withdrawn, or completed afterward.

After the start, Cancellation is unavailable; actual-hours and No-show workflows apply instead.

## No-show

1. At or after the Shift start, a Facility Manager or Admin records that the assigned Nurse did not attend.
2. The Shift becomes `NO_SHOW`, which is terminal.
3. The action is audited and the Nurse is emailed.
4. No Timesheet can be finalized and the Shift does not reopen.

There is no automatic No-show detection.

## Timesheet and Completion

### Nurse submission

1. After the Shift ends, the assigned Nurse enters numeric actual hours and an optional note.
2. The backend stores the submission and emails the Facility Manager.
3. A Facility Manager or Admin finalizes the same hours, or supplies corrected hours with a mandatory correction reason.
4. Finalization makes the Timesheet immutable and the Shift Completed.
5. The Nurse is emailed and can view the final hours and any correction reason.

### Submission on the Nurse’s behalf

1. If no submission exists after the Shift ends, a Facility Manager or Admin enters actual hours and an optional note.
2. If any submission already exists, the on-behalf submission is rejected rather than overwriting it; the Manager must finalize with corrected hours and a reason.
3. The system records that the hours were submitted on the Nurse’s behalf.
4. The assigned Nurse may replace that non-final submission, which changes the recorded source to a Nurse submission.
5. That actor or another authorized Manager/Admin finalizes the Timesheet.
6. The Shift becomes Completed and the Nurse is emailed.

Email delivery failure does not roll back a committed Timesheet or Shift transition.

## Inspector Export

1. A Facility Manager selects their Facility implicitly; an Admin selects a Facility explicitly.
2. The backend determines every Nurse with a current or historical successful claim at that Facility.
3. It gathers all current and replaced Nursing License and TB Test Result records for those Nurses.
4. It creates a ZIP containing the original documents and a manifest of Nurse and Credential metadata.
5. The ZIP is stored privately in external object storage and a short-lived authorized download is returned.
6. The export action is audited without recording document contents or sensitive metadata in analytics.

The export action does not modify Credential or Shift state.

## Dashboards and reporting

- Clients poll the relevant dashboard or collection endpoint at intervals no greater than five seconds while the view is active.
- The backend response is authoritative; polling does not relax claim concurrency checks.
- Facility Manager responses are scoped to their Facility before filtering.
- Admins may filter across Facilities; Nurses receive only their own operational data and Open Shift discovery data.
- Reports use the calculations in `domain.md`; actual hours include final Timesheets only.
- Report filters use inclusive calendar dates interpreted per Shift in its Facility’s local time, including Admin aggregation across Facilities.
- The dashboard credential exception count is independent of Shift date filters and covers current Credentials expiring from the current UTC date through the next 30 days for a Nurse’s own Credentials, a Facility Manager’s Associated Nurses, or an Admin’s selected Facility or all Facilities.

## Notification matrix

Email is the only notification channel. Each email identifies the affected Facility and Shift or Credential where applicable and links back to the appropriate authenticated screen.

| Event | Recipient | Timing and conditions |
| --- | --- | --- |
| Successful claim | Nurse and Facility Manager | After the claim commits |
| Manual Withdrawal | Facility Manager | After the Shift reopens |
| Cancellation | Assigned Nurse | Only when a Filled Shift is cancelled |
| Automatic eligibility Withdrawal | Nurse and Facility Manager | Includes the eligibility reason |
| Upcoming Credential expiry | Nurse | 30, 7, and 1 day before expiry |
| Credential expired | Nurse | Once when the current Credential expires |
| Timesheet submitted | Facility Manager | After Nurse submission |
| Timesheet finalized or corrected | Nurse | Includes final hours and correction reason when present |
| No-show recorded | Nurse | After the terminal transition |

For each current Credential, each scheduled reminder is sent at most once. Replacing a Credential cancels its pending reminders. Historical Credentials do not generate reminders. A newly eligible replacement does not suppress notifications for other current Credentials.
