// fetch_snapshot.js
// Script to fetch Drupal and GitLab data, outputting static JSON files for dashboard

const fs = require('fs');
const path = require('path');

// Placeholder: implement fetch logic for each data source
async function fetchRoster() {
  // Fetch and parse roster from Drupal.org
  const rosterUrl = 'https://www.drupal.org/node/1121122/users';
  const proxyUrl = 'https://api.allorigins.win/raw?url=';
  let html = '';
  try {
    // Try direct fetch with user-agent header
    const res = await fetch(rosterUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DrupalOpenDashBot/1.0)' }
    });
    if (!res.ok) throw new Error('Direct fetch failed');
    html = await res.text();
  } catch (err) {
    // Fallback to public proxy
    const proxyRes = await fetch(proxyUrl + encodeURIComponent(rosterUrl));
    if (!proxyRes.ok) throw new Error('Proxy fetch failed');
    html = await proxyRes.text();
  }
  // Simple regex to extract usernames from links to /u/*
  const matches = html.match(/href="\/u\/([^"]+)"/g) || [];
  const usernames = matches.map(m => m.replace(/.*\/u\//, '').replace('"', ''));
  // Deduplicate and normalize
  return Array.from(new Set(usernames)).map(u => ({ username: u }));
}

async function fetchCredits() {
  // Fetch contribution records from new.drupal.org
  const org = 'CivicActions';
  const months = 12;
  const url = `https://new.drupal.org/api/contribution-records?organization=${encodeURIComponent(org)}&months=${months}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch credits');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || data.list || data.rows || []);
}

async function fetchCommentsByMonth() {
  // Fetch comments from api-d7
  // For demo: fetch comments for CivicActions users in last 12 months
  // This would require resolving user IDs and then fetching comments per user
  // Here, just return empty array for placeholder
  return [];
}

async function fetchMRs() {
  // Fetch MR details from git.drupalcode.org
  // For demo: return empty array
  return [];
}

async function main() {
  const outDir = path.join(__dirname, '../site/public/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const roster = await fetchRoster();
  fs.writeFileSync(path.join(outDir, 'roster.json'), JSON.stringify(roster, null, 2));

  const credits = await fetchCredits();
  fs.writeFileSync(path.join(outDir, 'credits.json'), JSON.stringify(credits, null, 2));

  const comments = await fetchCommentsByMonth();
  fs.writeFileSync(path.join(outDir, 'comments_by_month.json'), JSON.stringify(comments, null, 2));

  const mrs = await fetchMRs();
  fs.writeFileSync(path.join(outDir, 'mrs.json'), JSON.stringify(mrs, null, 2));

  // Optionally, add timestamp file
  fs.writeFileSync(path.join(outDir, 'snapshot_timestamp.txt'), new Date().toISOString());
}

main().catch(err => {
  console.error('Snapshot fetch failed:', err);
  process.exit(1);
});
