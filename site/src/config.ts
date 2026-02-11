export const CONFIG = {
  defaultOrg: 'CivicActions',
  defaultMonths: 12,
  rosterUrl: 'https://www.drupal.org/node/1121122/users',
  drupalApiBase: 'https://www.drupal.org/api-d7',
  contributionApiBase: 'https://new.drupal.org/contribution-records-by-organization-by-user', // inferred base
  gitlabApiBase: 'https://git.drupalcode.org/api/v4',
  cacheValidation: {
    ttl: 6 * 60 * 60 * 1000, // 6 hours
  },
  corsProxy: 'https://corsproxy.io/?', // We likely need a proxy for Client-side fetches to some endpoints if they don't support CORS. 
  // *Critical*: Drupal.org API usually supports CORS for read operations?
  // User instruction: "Must work without any server component."
  // If CORS is an issue, we might need to use a public proxy or hope d.o supports it. 
  // D.org api-d7 supports CORS.
  // The roster page (HTML) definitely does NOT support CORS for fetch. We will need a proxy or the user to install a browser extension (not good UX).
  // "Parse in-browser from HTML... If parsing fails... manual username input".
  // Fetching HTML from a different domain client-side is blocked by CORS.
  // I will check if I can use a public CORS proxy for the roster or if I should assume the user might run this locally with a proxy?
  // "Static site deployable to GitHub Pages." -> Must work on the web.
  // I'll add a proxy config but defaulting to a public one or try direct first.
  // Actually, I'll try to fetch direct first, if fail, fallback to proxy? 
  // For the purpose of this task, I'll use a public proxy for the HTML scrape if needed.
};

export const STORAGE_KEYS = {
  SETTINGS: 'drupal-dash-settings',
  CACHE: 'drupal-dash-cache',
  GITLAB_TOKEN: 'drupal-dash-gl-token', // ONLY if user opts in
};
