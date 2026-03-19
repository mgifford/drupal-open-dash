# Drupal Open Dash

An initial attempt to build a Drupal Open Dashboard is a static dashboard for visualizing Drupal.org and GitLab activity for an organization roster. It is designed for fully static hosting (e.g., GitHub Pages) and pre-fetches all data via scheduled GitHub Actions, serving only static JSON snapshots to the frontend.

## Features
- Visualizes Drupal issue comments, merge requests, credits, and project activity
- Pre-fetches data from Drupal.org and git.drupalcode.org APIs
- Stores data as static JSON files in `site/public/data/`
- No server or secrets required for runtime
- UI loads only local JSON files, avoiding CORS/API limits
- Supports CSV export for all charts and tables
- Drilldown views for people, projects, and merge requests

## Workflow
- GitHub Actions run on a schedule (hourly/daily) to fetch latest data
- Data is written to versioned JSON files
- The dashboard displays the latest snapshot timestamp

## License

This project is licensed under the GNU Affero General Public License (AGPL) v3.0. See [LICENSE](LICENSE) for details.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm ci` (in the `site` directory)
3. Start the development server: `npm run dev`
4. Build for production: `npm run build`

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements, bug fixes, or new features.

## Authors
- CivicActions (default organization)
- Maintained by mgifford

## AI Disclosure

Transparency about AI involvement is a core value of this project. The following AI tools have been used in the development of this project:

### Development-time AI

| AI Tool | Used For |
|---|---|
| **GitHub Copilot Coding Agent** | Scaffolding the initial project structure, generating boilerplate code, writing documentation (including `AGENTS.md` and `.github/copilot-instructions.md`), and implementing incremental code changes across multiple pull requests. |

### Runtime AI

**None.** No AI or LLM is invoked at runtime by this application. The dashboard is fully static: it loads only pre-generated JSON files and performs all aggregation and rendering client-side with no AI calls.

### Browser-based AI

**None.** No browser-based AI features (e.g., Copilot in the browser, AI-powered autocomplete, or AI-driven UI components) are enabled in this application.

---

*If you contribute to this project using an AI tool, please update the table above following the instructions in `AGENTS.md`.*

## AGPL License

This project is licensed under the AGPL v3.0. See the LICENSE file for full terms.
