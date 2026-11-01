# ShiftPatch

ShiftPatch connects healthcare facilities that need short-notice nursing coverage with nurses who can work those shifts.

## Language

### People and organizations

**Facility**:
A healthcare organization that posts and manages nursing shifts on ShiftPatch.
_Avoid_: Agency

**Facility Manager**:
A user who manages shifts and related staffing operations for one Facility.
_Avoid_: Agency user

**Admin**:
A ShiftPatch platform operator who oversees and manages operations across Facilities.
_Avoid_: Administrator

**Nurse**:
A user who claims and works individual nursing shifts through one or more Facilities without an ongoing Facility membership.

**Associated Nurse**:
A Nurse with at least one current or historical successful claim at a Facility.

### Shifts

**Shift**:
A single nursing opening for a Facility during a specified period, fillable by at most one Nurse.
_Avoid_: Opening, slot

**Claim**:
The assignment of an eligible Nurse to an Open Shift, making the Shift Filled.
_Avoid_: Booking

**Open Shift**:
A Shift that is available for an eligible Nurse to claim.
_Avoid_: Available Shift

**Filled Shift**:
A Shift with an assigned Nurse whose work and Timesheet are not yet final.
_Avoid_: Booked Shift

**Completed Shift**:
A Shift whose Timesheet has been finalized.
_Avoid_: Closed Shift

**Withdrawal**:
The release of a Nurse from a claimed Shift before it starts, returning it to Open; initiated by the Nurse or automatically when eligibility is lost.
_Avoid_: Nurse cancellation

**Cancellation**:
Termination of a Shift by a Facility Manager or Admin, making it unavailable for further claims.
_Avoid_: Facility cancellation

**No-show**:
A terminal Shift outcome recorded by a Facility Manager or Admin when the assigned Nurse does not attend.
_Avoid_: Missed Shift

### Credentials and records

**Credential**:
A Nurse-uploaded qualification record, such as a nursing license or tuberculosis test result, whose presence and expiry affect shift eligibility.
_Avoid_: Certification

**Nursing License**:
A Credential that identifies the jurisdiction in which a Nurse is licensed and its expiry date.

**TB Test Result**:
A Credential that records the outcome and expiry date of a Nurse's tuberculosis test.
_Avoid_: TB clearance

**Timesheet**:
A record of the actual hours worked for a Shift, submitted by the Nurse or on their behalf and finalized by a Facility Manager or Admin.
_Avoid_: Timecard

**Inspector Export**:
A bundle of current and historical Credential documents and metadata for Nurses associated with a Facility, prepared for a state inspection.
_Avoid_: License export

**Audit Log**:
An append-only record of actions affecting Facilities, users, Credentials, Shifts, Timesheets, and Inspector Exports.
_Avoid_: Activity feed
