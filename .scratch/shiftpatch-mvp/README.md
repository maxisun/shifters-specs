# ShiftPatch MVP — implementation tickets

27 tickets covering the MVP defined in `docs/PRODUCT.md` and `docs/specs/`. The specs are the source of truth; these tickets are the work breakdown and deliberately do not restate them.

## Reading a ticket

- **Repo** — the checkout the work lands in: `shifters-specs`, `shifters-be`, or `shifters-fe`.
- **Contract** — the pinned API artefact the work is built against. Only ticket 01 changes it.
- **Spec** — the durable document that governs the behaviour. Read it; do not work from the ticket alone.
- **Blocked by** — every listed ticket must be `done` before this one starts.
- **Status** — `ready-for-agent` until work begins.
- **Revision** — starts at `1`; see Revisions below for when it increments.

## Working the frontier

A ticket is available when all its blockers are done. Backend tickets are worked first by decision; frontend tickets are gated by their backend counterpart so "done" always means exercised against a real API rather than a mock.

A user-facing capability is a backend/frontend pair — for example 13+14 backend and 15 frontend. The pair is the tracer bullet; each ticket is sized to one fresh context window in one repo.

## Close-out

Ticket 27 is the acceptance gate. Defects it finds become new tickets; no scenario is marked passed without recorded evidence.

## Ordering

Numbers are dependency order, not calendar order. 26 is available as soon as 08 lands; 22 as soon as 06 lands.

## Revisions

A ticket set is consumed at a **tag**, never from a moving branch. Name it for the set and its version — `tickets-mvp-v1.0.0` — and treat the tag as the package the implementation repos pull. They record the tag, its commit SHA, and the contract version, so "which tickets were we working from" stays answerable after the fact. Until the tag exists, treat this directory as draft.

- **Numbers are permanent.** `17` stays `17`. A revisited ticket keeps its number; it is never renumbered or reused. New work takes the next free number.
- **A revision bumps the ticket.** Change `**Revision:** 1` to the next integer and append a dated entry under a `## Revisions` heading in that file: what changed and why. The `## Revisions` heading appears only once a ticket has been revised.
- **A tagged ticket is a promise.** Do not change the behaviour of a ticket a consumer has pinned without bumping its revision and cutting a new tag. When the behaviour change also alters the API, the contract takes its own SemVer bump.
- **Revisions are additive by default.** If revised work invalidates a ticket already in flight, prefer superseding it with a new numbered ticket over rewriting history, and say in the new ticket which one it replaces.
- **Deferred decisions live here**, not in chat, so the next revision can pick them up.

## Open decisions (not yet ticketed)

These are known gaps found while slicing. None blocks the first tag.

| Decision | Affects | Current state |
| --- | --- | --- |
| Maximum Credential document size | 08 | No maximum in the contract or the spec. Upload validation is required; the number is not set. |
| Refreshing an expired Inspector Export link | 24 | `createInspectorExport` returns the link once and no refresh operation exists. The ticket uses a 15-minute TTL; a longer TTL or a new operation is needed if a user can miss that window. |
| Reminder send time and time zone | 26 | Reminders fire 30, 7, 1, and 0 days before expiry with no time-of-day or zone defined. A Credential belongs to a Nurse, while eligibility boundaries use the Facility zone, so one Nurse may work across zones. |

