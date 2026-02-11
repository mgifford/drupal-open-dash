import { Person } from '../types';
import { CONFIG } from '../config';

const PROXY_URL = 'https://api.allorigins.win/raw?url='; // Use allorigins as it's reliable for text/html

export async function fetchRoster(url: string = CONFIG.rosterUrl): Promise<Person[]> {
  console.log(`Fetching roster from ${url}`);
  try {
    // Try direct fetch first (unlikely to work due to CORS but good practice)
    let response = await fetch(url).catch(() => null);
    
    if (!response || !response.ok) {
        console.warn('Direct fetch failed, trying proxy...');
        response = await fetch(PROXY_URL + encodeURIComponent(url));
    }

    if (!response || !response.ok) {
      throw new Error(`Failed to fetch roster: ${response?.statusText || 'Network Error'}`);
    }

    const html = await response.text();
    return parseRosterHtml(html);
  } catch (error) {
    console.error('Error fetching roster:', error);
    throw error;
  }
}

export function parseRosterHtml(html: string): Person[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const people: Person[] = [];
  const uniqueUsernames = new Set<string>();

  // Selectors based on observation of Drupal.org views tables
  // Usually: .view-people .views-field-name a
  // Or: .view-id-org_people ...
  // Fallback: look for any links to /u/* inside a table or list
  
  // Specific selector for the CivicActions page structure (and generic d.org org pages)
  const selectors = [
    '.view-content td.views-field-name a, .view-content .views-field-name a', // Standard Views Table
    '.view-content .views-row .views-field-name a', // Views List/Grid
    'td.views-field-name a',
    '.user-name', // Sometimes used
  ];

  let nodes: NodeListOf<Element> | null = null;
  
  for (const selector of selectors) {
    const found = doc.querySelectorAll(selector);
    if (found.length > 0) {
      nodes = found;
      break;
    }
  }

  // Fallback: Find all links to /u/ or /user/
  if (!nodes || nodes.length === 0) {
      const allLinks = doc.querySelectorAll('a[href^="/u/"], a[href^="/user/"]');
      if (allLinks.length > 5) { // Heuristic: if we find many user links, assume valid
          nodes = allLinks;
      }
  }

  if (nodes) {
    nodes.forEach(node => {
      const href = node.getAttribute('href');
      const text = node.textContent?.trim();
      
      if (href && text) {
        // Extract username from href if possible, or use text
        // href is usually /u/username or /user/123
        // If /u/username, the username is in the URL.
        // If /user/123, we rely on text.
        
        let username = '';
        if (href.startsWith('/u/')) {
            username = href.substring(3);
        } else {
            username = text; // Fallback to display name
        }

        // Normalize
        // Drupal usernames in URLs are case-insensitive but usually presented roughly correctly.
        // We'll store the clean text version.
        // Filter out junk
        if (username && !uniqueUsernames.has(username.toLowerCase())) {
            
            // Exclude some common false positives if aggressive scraping (like "Title", "Name" header)
            if (username.length < 2 || username === 'Name') return;

            uniqueUsernames.add(username.toLowerCase());
            people.push({
                username: username,
                profileUrl: href.startsWith('http') ? href : `https://www.drupal.org${href}`
            });
        }
      }
    });
  }

  if (people.length === 0) {
      throw new Error('No users found in roster HTML');
  }

  return people;
}
