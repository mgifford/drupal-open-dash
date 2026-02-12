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
  // TODO: Implement credits fetching when a reliable API endpoint is available
  return [];
}

async function fetchCommentsByMonth() {
  // Fetch comments for a few Drupal projects (core and contrib)
  // We'll use the api-d7 endpoint for project_issue comments
  const projects = [
    'drupal', // Drupal core
    'webform', // Example contrib module
    'pathauto' // Example contrib module
  ];
  const months = 12;
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - months, 1).toISOString();
  let allComments = [];
  for (const project of projects) {
    // Fetch issues for the project
    const issuesUrl = `https://www.drupal.org/api-d7/node.json?type=project_issue&field_project_machine_name=${project}`;
    const issuesRes = await fetch(issuesUrl);
    if (!issuesRes.ok) continue;
    const issuesData = await issuesRes.json();
    const issues = issuesData.list || issuesData.nodes || issuesData;
    for (const issue of issues) {
      const nid = issue.nid || issue.id || issue.node || issue.nid;
      if (!nid) continue;
      // Fetch comments for the issue
      const commentsUrl = `https://www.drupal.org/api-d7/comment.json?node_nid=${nid}`;
      const commentsRes = await fetch(commentsUrl);
      if (!commentsRes.ok) continue;
      const commentsData = await commentsRes.json();
      const comments = commentsData.list || commentsData.comments || commentsData;
      for (const comment of comments) {
        // Only include comments in the last 12 months
        if (comment.timestamp && new Date(comment.timestamp * 1000) >= new Date(since)) {
          allComments.push({
            project,
            issue: nid,
            author: comment.name,
            timestamp: comment.timestamp
          });
        }
      }
    }
  }
  return allComments;
}

async function fetchMRs() {
  // Fetch MRs for a few Drupal projects (core and contrib)
  // We'll use the GitLab API for public projects
  const projects = [
    'project/drupal',
    'project/webform',
    'project/pathauto'
  ];
  let allMRs = [];
  for (const project of projects) {
    const mrsUrl = `https://git.drupalcode.org/api/v4/projects/${encodeURIComponent(project)}/merge_requests?state=merged&per_page=10`;
    const mrsRes = await fetch(mrsUrl);
    if (!mrsRes.ok) continue;
    const mrs = await mrsRes.json();
    for (const mr of mrs) {
      allMRs.push({
        project,
        iid: mr.iid,
        title: mr.title,
        author: mr.author && mr.author.username,
        created_at: mr.created_at,
        merged_at: mr.merged_at,
        state: mr.state,
        web_url: mr.web_url
      });
    }
  }
  return allMRs;
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
