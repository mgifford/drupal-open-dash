# Copilot Instructions for drupal-open-dash

## Primary reference

**Read [`AGENTS.md`](../AGENTS.md) in the repository root first.**
It contains the authoritative description of this project's architecture,
data sources, coding conventions, UI requirements, caching/throttling rules,
test requirements, deployment model, and known limitations.
Everything below is a quick orientation that supplements that file.

---

## What this repo is

A **static dashboard** (GitHub Pages) that visualizes Drupal.org contribution
activity for an organisation roster.

- No backend server. All data is pre-fetched by a scheduled GitHub Action and
  written as static JSON to `site/public/data/`.
- The frontend (Vite + React + TypeScript in `site/`) loads only those local
  JSON files—no CORS issues, no exposed secrets.

## Repository layout

```
AGENTS.md              ← full agent instructions (read this!)
README.md
scripts/               ← data-fetch/aggregate scripts run by the Action
site/                  ← Vite + React + TypeScript frontend
  src/
    data/              ← data-source modules and TypeScript types
    ui/                ← reusable components
    pages/             ← route-level views
  public/data/         ← static JSON snapshots committed by the Action
.github/
  workflows/
    snapshot.yml       ← scheduled Action that refreshes JSON data
```

## Key rules (from AGENTS.md)

- **TypeScript everywhere.** Define explicit types for `Person`,
  `CommentEvent`, `IssueNode`, `MergeRequest`, `CreditRecord`, and
  aggregation outputs.
- **No secrets in source.** Tokens entered via the UI are stored in memory
  only (optional localStorage with an explicit "remember" toggle + warning).
- **Be conservative with requests:** throttle concurrency, paginate safely,
  cache with TTL, expose "Clear cache".
- **Never fabricate API fields.** Degrade gracefully with "data unavailable"
  messaging.
- **Dates:** store as ISO strings or epoch seconds; convert to month buckets
  in one place; use UTC throughout.

## Local development commands

```bash
# from site/
npm ci
npm run dev        # dev server
npm run build      # production build → site/dist/
npm run lint
npm run typecheck  # or: npm run check
npm test
```

If `package.json` scripts differ from the above, follow what is actually
defined there and update `AGENTS.md` accordingly.

## Adding new features

1. Confirm the data source and its pagination/rate-limit behaviour.
2. Add a typed data model and a fixture file.
3. Implement aggregation as pure functions.
4. Add a UI panel with loading, error, and "data unavailable" states.
5. Add CSV export for every table/chart.
6. Add or update unit tests (roster parser, MR URL parser, date bucketing).

## Errors and workarounds

_Document here any errors encountered during development and how they were
resolved, so future agents can skip the same pitfalls._

<!-- Example:
- **Vite base-path issue on Pages (2024-06-01):** Set `base: './'` in
  `vite.config.ts`; without it asset URLs were absolute and 404'd on
  the Pages subdirectory.
-->
