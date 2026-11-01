# Permissions

Authorization must be enforced by the backend for every request. Hiding a frontend control is not an authorization check.

## General rules

- Authentication is required for every application resource; only authentication, registration, invitation acceptance, and product-information routes are public.
- Email verification is required before using role-based application resources.
- Admins have the same operational capabilities as Facility Managers across every Facility.
- Facility Managers are limited to their assigned Facility.
- Nurses have no ongoing Facility membership. Association for Credential and profile access begins only after a successful claim.
- Nurses cannot see another Nurse’s identity, contact details, claim activity, Credentials, or Timesheets.
- All document downloads and exports require an authorized authenticated request.

## Capability matrix

“Own Facility” means the Facility Manager’s assigned Facility. “Associated Nurse” means a Nurse with at least one current or historical successful claim at that Facility.

| Capability | Admin | Facility Manager | Nurse |
| --- | --- | --- | --- |
| Create Facility initial information | Yes | No | No |
| Update Facility name | Yes | No | No |
| View Facility basic information | Any Facility | Own Facility | Facilities needed for Open Shift discovery |
| List Associated Nurses | Any Facility | Own Facility | No |
| Invite Facility Managers | Any Facility | No | No |
| Accept Facility Manager invitation | N/A | Invited user only | No |
| Provision Admins | Operational process only | No | No |
| Browse Open Shifts | All | Own Facility | All Facilities |
| View Open Shift reservation details | All | Own Facility | Yes |
| View ineligibility reasons | N/A | N/A | Own eligibility only |
| Publish Shifts | Any Facility | Own Facility | No |
| Edit Open Shifts | Any Facility | Own Facility | No |
| Edit Filled Shift reservation details | No | No | No |
| Claim Shifts | No | No | Self, when eligible |
| Withdraw before start | Operational view only | Operational view only | Own claimed Shift |
| Cancel before start | Any Facility | Own Facility | No |
| View assigned Nurse identity | Any Facility | Own Facility | Self only |
| Record No-show | Any Facility | Own Facility | No |
| Submit Timesheet after end | On behalf only when none exists | Own Facility, only when none exists | Own claim, including before final |
| Finalize or correct Timesheet | Any Facility | Own Facility | No |
| View Timesheet | Any Facility | Own Facility | Own only |
| Upload or replace Credentials | Operational view only | Operational view only | Own only |
| View Credential metadata | Any Nurse | Associated Nurses | Own only |
| Download Credential documents | Any Nurse | Associated Nurses | Own only |
| Generate Inspector Export | Any Facility | Own Facility | No |
| View operational dashboard | All Facilities | Own Facility | Own Shifts and Credentials |
| Filter reports by Facility | Yes | No; fixed to own Facility | No |
| View Audit Log | Global | Own Facility | No |
| View own operational history | Yes | Yes | Yes |

## Resource-specific restrictions

### Shifts

A Nurse may retrieve an Open Shift or a Shift currently assigned to them. Historical claims use the privacy-preserving “my claim” projection, which shows the caller’s own outcome without revealing another Nurse’s assignment or claim activity. A Nurse must not retrieve another Nurse’s Filled, Completed, Cancelled, or No-show Shift details. Facility Managers and Admins may retrieve Shifts and Associated Nurses only within their authorized Facility scope.

An Admin acting on a Facility must explicitly identify that Facility. A Facility Manager’s Facility is derived from server-side account data, never trusted from a client-supplied Facility ID.

Facility Managers and Admins may list a Facility’s Associated Nurses so that historical Credential access remains reachable after a Withdrawal or Cancellation. The list exposes only identity and contact information already permitted after a successful claim.

### Credentials

Credential documents are never public. A successful claim grants the Facility’s Managers access to that Nurse’s current and historical Credentials; later Withdrawal or Cancellation does not revoke historical access. Open Shift browsing alone grants no Nurse or Credential access.

Nurses may replace their own current Credentials but cannot delete current or historical records. Admins and Facility Managers have read-only Credential access.

### Timesheets

Only the assigned Nurse can submit as the Nurse. They may create or replace the Timesheet until it is final, including one initially submitted on their behalf. A Facility Manager or Admin may create an on-behalf submission only when no submission of any kind exists; if one exists, they must finalize or correct it rather than overwrite it. The on-behalf actor is recorded as the submitter. Only a Facility Manager for the Shift’s Facility or an Admin can finalize.

### Audit Log and Inspector Export

Facility-scoped queries must be applied before pagination, filtering, or export. An Admin may select any Facility; a Facility Manager cannot override the server-derived Facility scope. Exported files and their download URLs receive the same access checks as their source records.
