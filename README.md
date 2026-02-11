# Drupal Open Dash

Drupal Open Dash is a static dashboard for visualizing Drupal.org and GitLab activity for an organization roster. It is designed for fully static hosting (e.g., GitHub Pages) and pre-fetches all data via scheduled GitHub Actions, serving only static JSON snapshots to the frontend.

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

## AGPL License

This project is licensed under the AGPL v3.0. See the LICENSE file for full terms.
