# AGENTS.md (drupal-open-dash)

This repository is a static dashboard (GitHub Pages compatible) that visualizes Drupal.org activity for an organization roster.

## Snapshot Workflow (Static JSON via GitHub Actions)

To ensure fully static hosting and avoid CORS/API limits, all Drupal and GitLab data is pre-fetched by a scheduled GitHub Action and served as static JSON files:

- A GitHub Action runs on a schedule (hourly/daily).
- It fetches Drupal data from:
  - https://new.drupal.org/... contribution record endpoints
  - https://www.drupal.org/api-d7/... nodes/comments for issues
  - https://git.drupalcode.org/api/v4/... for MR details (token optional)
- Results are written to versioned files in `public/data/`:
  - roster.json
  - comments_by_month.json
  - mrs.json
  - credits.json
- The dashboard loads only these local JSON files. No CORS problem.

### Trade-offs
- You lose “live” data. You gain “latest snapshot at <timestamp>”.
- Rate limits and pagination are managed in the Action, not the browser.

### Implementation
- Scripts in `scripts/` fetch and aggregate data, outputting JSON to `site/public/data/`.
- The GitHub Action workflow schedules and runs these scripts, commits/pushes updated JSON.
- The frontend loads only static JSON, showing snapshot timestamp.

### Benefits
- Fully static hosting (no server, no secrets exposed).
- Reliable, fast UI with no CORS issues.
- Easy to export, version, and debug data.

### Limitations
- Data is not real-time; it’s as fresh as the last Action run.
- Requires maintaining a GitHub Action workflow for data fetching and snapshotting.
Primary goals:
- Comments in Drupal issue queues over time (team + per person)
- Merge Request activity tied to Drupal issues (baseline from Drupal.org, enhanced via git.drupalcode.org GitLab API)
- Activity by project (issues, comments, MRs, credits)
- Drupal contribution credits over time

Default org: CivicActions
Canonical roster page: https://www.drupal.org/node/1121122/users

## Non-negotiables

- Baseline must work without any secrets.
- Do not commit tokens, keys, cookies, or captured API responses containing secrets.
- If a GitLab token is supported, it must be:
  - entered in the UI
  - stored in memory by default
  - optionally persisted via an explicit “remember” toggle with a warning
- Be conservative with requests:
  - throttle concurrency
  - paginate safely
  - cache responses with TTL
  - expose “Clear cache”
- Never fabricate API fields. Parse defensively and degrade gracefully with explicit “data unavailable” labeling.

## Repo structure (expected)

- `site/`
  - Vite + React + TypeScript frontend (GitHub Pages deploy)
  - `src/`
    - `data/` data-source modules and types
    - `ui/` components
    - `pages/` route-level views (or equivalent)
  - `public/`
    - optional bundled snapshots (if used)
- `scripts/` (optional)
  - local tooling for testing endpoints, fixtures, or building sample data
- `data/` (optional)
  - cached/snapshot JSON for development only (do not require for runtime)
- `tests/`
  - unit tests for HTML roster parsing + MR URL parsing

If the repo differs, follow the existing layout and update this file rather than forcing a restructure.

## Data sources and how to use them

### 1) Roster (canonical, HTML)
Source:
- https://www.drupal.org/node/1121122/users

Rules:
- Treat this page as the source of truth for “staff included in dashboard”.
- Parse in-browser from HTML.
- Implement multiple selectors and fallbacks because markup can change.
- If parsing fails, show an error with:
  - a copyable debug excerpt (first N chars of HTML)
  - a manual username input fallback (textarea)
- Normalize usernames:
  - trim whitespace
  - preserve case for display, but use lowercased keys internally

### 2) Drupal credits (preferred metrics, new.drupal.org)
Use “contribution records” endpoints.
Required:
- `months` parameter must be set (default 12, UI 1–60)
- paginate until empty
- support filtering by `username` and `machine_name` where possible

Store as:
- per-user totals
- per-month totals (if timestamp/period exists)
- per-project machine_name totals
- security advisory credits if flagged

### 3) Issue comments over time (api-d7)
Use Drupal.org read-only REST endpoints under:
- https://www.drupal.org/api-d7/

Goal:
- count of comments made by roster members over time
- bucket by month
- breakdown by person and by project where possible

Implementation guidance:
- Prefer fetching comments by author, then resolving the referenced issue nodes only as needed to determine:
  - node type is `project_issue`
  - project identifier (machine_name or project node reference)
- Cache node lookups aggressively (node fetches are expensive).
- If author-filtering is not supported as expected, degrade:
  - show comment counts only for issues that can be discovered by other means
  - or clearly mark the feature “limited by API” and fall back to credits as proxy

### 4) Merge Requests (two-tier)
Baseline (no token):
- Pull MR URLs from Drupal issue nodes using `related_mrs=1`
- Aggregate counts and list MRs by URL
- If timestamps cannot be derived reliably, do not guess

Enhanced (GitLab token):
- Use git.drupalcode.org GitLab API v4 to hydrate MR details:
  - state, created_at, merged_at, closed_at
  - author, merged_by (if available)
  - labels
  - approvals/pipelines best-effort
- Compute:
  - opened/merged/closed per month
  - median/p75 time-to-merge
  - per-user and per-project rollups

Automation policy:
- Do not encourage heavy scraping.
- Provide conservative defaults (12 months, limited concurrency).
- Provide “Reduce load” guidance in UI.

## UI requirements (must preserve)
- Tabs/sections:
  - Overview
  - Comments
  - Merge Requests
  - Projects
  - Credits
  - People
- Filters:
  - date range (months)
  - person
  - project
  - “include bots” toggle
- Export:
  - every chart and table must be exportable to CSV
- Drilldowns:
  - click a person to open their detail view
  - link out to Drupal.org profile and GitLab MR where appropriate
- Show:
  - last refresh timestamp
  - request count
  - cache hit ratio (developer mode)

## Coding conventions

- TypeScript everywhere.
- Prefer pure functions for aggregation.
- Define explicit types/interfaces for:
  - `Person`
  - `CommentEvent`
  - `IssueNode`
  - `MergeRequest`
  - `CreditRecord`
  - aggregation outputs (by month/person/project)
- Date handling:
  - store timestamps as ISO strings or epoch seconds consistently
  - convert to month buckets in one place only
  - do not mix local time and UTC silently; choose one and document it (prefer UTC)
- Error handling:
  - all network calls must handle:
    - HTTP errors
    - timeouts/abort
    - 429 backoff
  - show user-friendly errors with debug details in developer mode

## Caching and throttling

- Concurrency limit (default 4–6).
- Cache layer:
  - in-memory cache always
  - optional localStorage cache with TTL (default 6 hours)
- Provide:
  - “Clear cache”
  - “Refresh now”
- Hard cap total requests per session load (default 500).
  - If exceeded: stop, warn, suggest reducing months or disabling MR hydration.

## Tests (required)

Minimum unit tests:
- roster HTML parser:
  - extracts usernames correctly from fixture HTML
  - handles markup changes (at least one alternate fixture)
- MR URL parser:
  - extracts project path + IID from common drupalcode URL patterns
- date bucketing:
  - stable month bucket output across timezones (use UTC-based tests)

## Local development

Expected commands (adjust to actual package scripts):
- install:
  - `npm ci`
- dev:
  - `npm run dev`
- build:
  - `npm run build`
- lint/typecheck:
  - `npm run lint`
  - `npm run typecheck` (or `npm run check`)
- tests:
  - `npm test` (or `npm run test`)

If scripts differ, update this section to match `package.json`.

## Deployment (GitHub Pages)

- Site must build to a static bundle.
- Use relative base paths suitable for Pages.
- Include a single deploy workflow (if present) that:
  - builds from main
  - publishes `site/dist` (or equivalent)

Do not add server dependencies. Do not add required runtime secrets.

## Safe defaults for new features

When adding a new panel/metric:
1) Prove the data source and its limits (pagination, rate limits).
2) Add a typed data model and a fixture.
3) Implement aggregation as pure functions.
4) Add UI with:
   - loading state
   - error state
   - “data unavailable” messaging where appropriate
5) Add CSV export.

## Known limitations (keep current)

- Roster is parsed from HTML and may break if Drupal.org markup changes.
- Some comment filtering may not be exposed cleanly by api-d7; do not pretend it is complete.
- MR detail hydration depends on a user-provided GitLab token; baseline shows URLs only when token absent.
- Credits endpoints may not provide per-event timestamps; if only period totals exist, chart by period and label it accurately.

Update this list when limitations change.