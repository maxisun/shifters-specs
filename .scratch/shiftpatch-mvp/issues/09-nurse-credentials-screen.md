# 09: Nurse Credentials screen

**Repo:** `shifters-fe` · **Contract:** `api-v1.0.0` (from 01)

**What to build:** The Nurse's own Credential workspace: one current card per type, replacement with retained history, expiry and reminder dates, authorized downloads, and the post-replacement summary of any future Shift that was automatically withdrawn.

**Blocked by:** 05 — Authentication screens; 08 — Credentials and document access

**Status:** ready-for-agent

**Revision:** 1

- [ ] `/app/credentials` shows exactly one current Nursing License card and one current TB Test Result card, each with expiry shown as a date and the statement that it remains valid through that date for eligibility.
- [ ] Upload and replacement forms capture exactly the metadata the contract requires; there is no delete action and no multi-current interface.
- [ ] Current and historical records are labelled distinctly, replacement history is visible, and authorized downloads work without caching private responses in shared browser caches.
- [ ] When the replacement response reports withdrawals, they render as a summary of every affected future Shift with its eligibility reasons, linking to `/app/my-shifts`; an empty list renders no summary.
- [ ] Scheduled reminder dates derived from the current Credential are shown alongside its eligibility impact.
- [ ] License numbers, TB outcomes, document contents, download URLs, and email addresses appear in neither analytics nor browser logs.

**Spec:** `docs/specs/frontend.md`, `docs/specs/domain.md`, `docs/specs/analytics.md`
