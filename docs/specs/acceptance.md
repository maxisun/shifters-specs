# Acceptance Scenarios

These scenarios are the end-to-end acceptance baseline for the MVP. API errors referenced below are defined in `api/openapi.yaml`.

## Accounts and tenancy

### ACC-01: Facility and Manager onboarding

**Given** an authenticated Admin  
**When** the Admin creates a Facility with name, jurisdiction, and IANA time zone and invites a Manager  
**Then** the Facility and invitation are persisted and audited  
**And** the invited person can accept only as a Manager for that Facility.

### ACC-02: Multiple Managers, one Facility each

**Given** two accepted Facility Managers for one Facility  
**Then** both have equal operational permissions for that Facility  
**And** neither can access another Facility as a Manager.

### ACC-03: Nurse registration and verification

**Given** a Nurse self-registers  
**Then** the account has only the Nurse role  
**And** role-based resources reject access until email verification succeeds  
**And** password-reset requests do not reveal account existence.

### ACC-04: No public privileged registration

**When** an unauthenticated user submits registration data requesting Admin or Facility Manager  
**Then** that role is not granted.

## Credentials and eligibility

### ACC-05: Current Credential replacement preserves history

**Given** a Nurse has a current Nursing License  
**When** the Nurse uploads a replacement  
**Then** exactly one Nursing License is current  
**And** the prior record and document remain in authorized history.

### ACC-06: Valid-through-end date boundary

**Given** a current Credential expires on the same calendar date as a Shift ends in the Facility time zone  
**Then** its expiry date satisfies that Shift’s validity requirement  
**But** it does not satisfy a Shift ending on a later date  
**And** that later Shift shows `LICENSE_NOT_VALID_THROUGH_SHIFT_END` or `TB_TEST_NOT_VALID_THROUGH_SHIFT_END` for the relevant Credential.

### ACC-07: Jurisdiction requirement

**Given** a Nurse’s current Nursing License jurisdiction differs from the Facility jurisdiction  
**Then** the Shift shows `LICENSE_JURISDICTION_MISMATCH`  
**And** the backend rejects a claim with `403 CREDENTIAL_INELIGIBLE`.

### ACC-08: TB requirement

**Given** a missing, expired or not-valid-through-end, or positive current TB Test Result  
**Then** the corresponding ineligibility reason is shown  
**And** the backend rejects the claim.

### ACC-09: Replacement causes automatic Withdrawal

**Given** a Nurse has a future Filled Shift  
**When** a Credential replacement makes that Shift ineligible before its start  
**Then** the Shift becomes Open and its assignment is cleared  
**And** history records the eligibility reason  
**And** the Nurse and Facility Manager receive emails  
**And** the Withdrawal and Credential replacement are audited.

### ACC-10: Expiry reminders

**Given** a current Credential approaches expiry  
**Then** one reminder is scheduled at each of 30, 7, and 1 day before expiry and one at expiry  
**And** replacing the Credential cancels its pending reminders.

## Shift discovery and reservation

### ACC-11: Basic Shift creation

**Given** an authorized Facility Manager  
**When** they publish a Shift with start after now and end after start  
**Then** an Open Shift is created directly  
**And** it contains no Draft, pay, Location, unit, specialty, or instruction data.

### ACC-12: Discovery and reasons

**Given** Open Shifts at several Facilities  
**When** a Nurse browses  
**Then** results are sorted by soonest start and can be filtered by Facility, jurisdiction, and start-date range  
**And** ineligible Shifts remain visible with all applicable reasons  
**And** no other Nurse’s identity or claim activity is exposed.

### ACC-13: Atomic competing claims

**Given** two eligible Nurses request the same Open Shift concurrently  
**Then** exactly one request succeeds and assigns that Nurse  
**And** the other receives `409 SHIFT_NOT_OPEN`  
**And** exactly one successful assignment and claim Audit Log event exist.

### ACC-14: Overlap prevention

**Given** a Nurse has a Filled Shift from 09:00 to 17:00  
**Then** a claim overlapping that interval is rejected with `409 OVERLAPPING_SHIFT`  
**But** a Shift beginning at 17:00 does not overlap solely because the boundaries touch.

### ACC-15: Edit rules

**Given** an Open Shift  
**Then** an authorized Manager can edit start and end with an audit entry  
**But** after it becomes Filled those reservation fields cannot be edited  
**And** material correction requires Cancellation and a new Shift.

### ACC-16: Manual Withdrawal

**Given** a Nurse has a Filled future Shift  
**When** the Nurse withdraws before start  
**Then** it becomes Open and another eligible Nurse can claim it  
**And** assignment history remains  
**And** the Facility Manager is emailed  
**And** if another Nurse later fills it, the prior Nurse’s history stays Withdrawn without revealing the new assignee or current status.

### ACC-17: Cancellation

**Given** an Open or Filled Shift before start  
**When** an authorized Manager cancels it  
**Then** it becomes permanently Cancelled and cannot be claimed  
**And** an assigned Nurse is emailed.

### ACC-18: No-show

**Given** a Filled Shift at or after start  
**When** an authorized Manager records No-show  
**Then** it becomes terminal `NO_SHOW` without reopening  
**And** the Nurse is emailed  
**And** no Timesheet can finalize it.

## Timesheets

### ACC-19: Nurse submission and approval

**Given** a Filled Shift whose end has passed  
**When** the assigned Nurse submits positive actual hours and an authorized Manager finalizes them unchanged  
**Then** the Shift becomes Completed and the Timesheet becomes read-only  
**And** the Nurse is emailed.

### ACC-20: Corrected hours

**Given** a submitted Timesheet  
**When** a Manager finalizes different hours with a correction reason  
**Then** the final hours and reason are visible to the Nurse  
**And** the correction is audited  
**But** finalization with changed hours and no reason is rejected.

### ACC-21: Manager submission on behalf

**Given** no Nurse Timesheet submission after the Shift ends  
**When** an authorized Manager enters and finalizes actual hours  
**Then** the submitter is recorded as acting on the Nurse’s behalf  
**And** the Shift becomes Completed  
**And** the Nurse is emailed.

### ACC-22: No automatic Completion

**Given** a Filled Shift’s end has passed without a final Timesheet  
**Then** it remains Filled rather than becoming Completed automatically.

## Operations and privacy

### ACC-23: Facility isolation

**Given** a Facility Manager requests another Facility’s Shift, Credential, Timesheet, export, or Audit Log entry  
**Then** the backend denies access regardless of client-supplied IDs or filters.

### ACC-24: Credential access

**Given** a Nurse has only browsed a Facility’s Open Shift  
**Then** its Managers cannot access that Nurse’s Credentials  
**But** after a successful claim they can find the Nurse through `/facilities/{facilityId}/nurses` and access current and historical Credentials, including after later Withdrawal.

### ACC-25: Dashboard propagation

**Given** two active authorized dashboard clients  
**When** a Shift is created, claimed, withdrawn, or cancelled  
**Then** polling reflects the committed change within five seconds under normal operation.

### ACC-26: Reporting

**Given** final and non-final Timesheets and various Shift outcomes  
**Then** reports count statuses, Withdrawals, and No-shows using inclusive Facility-local start dates  
**And** actual hours include final Timesheets only  
**And** Admin Facility filters and Facility Manager isolation are enforced.

### ACC-27: Inspector Export

**Given** Nurses with current or historical successful claims at a Facility  
**When** an authorized Manager generates the Inspector Export  
**Then** the ZIP includes every such Nurse’s current and replaced License and TB documents plus metadata manifest  
**And** it is privately stored and accessed through a short-lived authorized download  
**And** generation is audited.

### ACC-28: Append-only Audit Log

**Given** audited actions have occurred  
**Then** authorized users can read actor, action, resource, Facility, timestamp, and reason  
**And** no API or UI permits editing or deleting entries  
**And** routine login/logout entries are not required.

### ACC-29: PostHog boundaries

**Given** the analytics events are inspected  
**Then** successful workflow events occur only after commit  
**And** no prohibited data listed in `analytics.md` is present  
**And** session replay is disabled.

### ACC-30: Retention and no hard deletion

**Given** an account has operational history  
**Then** no product API or UI offers hard deletion of its Credentials, assignments, Timesheets, exports, or Audit Log entries  
**And** no automatic retention job deletes those records.

### ACC-31: Responsive and accessible workflows

**Given** a 320 CSS-pixel viewport and keyboard-only navigation  
**Then** Nurse discovery, claim, Credential upload, Withdrawal, and Timesheet submission remain usable  
**And** status is not conveyed by color alone.

### ACC-32: Deployed sandbox/prod

**Given** the sandbox/prod deployment  
**Then** the React app and NestJS API are reachable through real HTTPS URLs  
**And** the frontend can complete the accepted workflows against deployed PostgreSQL, private external storage, email, and PostHog configuration  
**And** no separate staging environment is required.

### ACC-33: Timesheet overwrite prevention

**Given** a Nurse submission already exists  
**When** a Manager attempts an on-behalf submission  
**Then** it is rejected with `TIMESHEET_ALREADY_SUBMITTED`  
**And** the Manager can instead change hours only through finalization with a correction reason.

**Given** a non-final on-behalf submission exists  
**When** any Manager attempts another on-behalf submission  
**Then** it is rejected with `TIMESHEET_ALREADY_SUBMITTED`.

**Given** a non-final on-behalf submission exists  
**When** the assigned Nurse replaces the Timesheet  
**Then** the replacement succeeds, the source becomes a Nurse submission, and the submitter becomes the Nurse.
