// fetch_snapshot.js
// Script to fetch Drupal and GitLab data, outputting static JSON files for dashboard

const fs = require('fs');
const path = require('path');

// Placeholder: implement fetch logic for each data source
async function fetchRoster() {
  // Fetch and parse roster from Drupal.org
  const baseUrl = 'https://www.drupal.org/node/1121122/users';
  const proxyUrl = 'https://api.allorigins.win/raw?url=';
  let page = 0;
  let allUsernames = new Set();
  let hasNext = true;
  while (hasNext) {
    const url = page === 0 ? baseUrl : `${baseUrl}?page=${page}`;
    let html = '';
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DrupalOpenDashBot/1.0)' }
      });
      if (!res.ok) throw new Error('Direct fetch failed');
      html = await res.text();
    } catch (err) {
      const proxyRes = await fetch(proxyUrl + encodeURIComponent(url));
      if (!proxyRes.ok) throw new Error('Proxy fetch failed');
      html = await proxyRes.text();
    }
    // Extract usernames from links to /u/*
    const matches = html.match(/href="\/u\/([^"]+)"/g) || [];
    const usernames = matches.map(m => m.replace(/.*\/u\//, '').replace('"', ''));
    usernames.forEach(u => allUsernames.add(u));
    // Check for next page: look for a 'pager-next' link
    hasNext = /class="pager-next"/.test(html);
    page++;
  }
  return Array.from(allUsernames).map(u => ({ username: u }));
}

async function fetchCredits() {
  // Fetch contribution records from new.drupal.org
  // TODO: Implement credits fetching when a reliable API endpoint is available
  return [];
}

async function fetchCommentsByMonth() {
  // Fetch comments for a few Drupal projects (core and contrib)
  console.log('Fetching comments for selected Drupal projects...');
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
    let page = 0;
    let hasNext = true;
    let totalIssues = 0;
    while (hasNext) {
      const issuesUrl = `https://www.drupal.org/api-d7/node.json?type=project_issue&field_project_machine_name=${project}&page=${page}`;
      try {
        const issuesRes = await fetch(issuesUrl);
        if (!issuesRes.ok) {
          console.warn(`Failed to fetch issues for project ${project} (page ${page}): ${issuesRes.status}`);
          break;
        }
        const issuesData = await issuesRes.json();
        console.log(`Raw issues API response for project ${project} page ${page}:`, JSON.stringify(issuesData).slice(0, 500));
        const issues = issuesData.list || issuesData.nodes || issuesData;
        if (!Array.isArray(issues) || issues.length === 0) {
          if (page === 0) console.warn(`No issues found for project ${project}`);
          break;
        }
        totalIssues += issues.length;
        for (const issue of issues) {
          const nid = issue.nid || issue.id || issue.node || issue.nid;
          if (!nid) continue;
          const commentsUrl = `https://www.drupal.org/api-d7/comment.json?node_nid=${nid}`;
          try {
            const commentsRes = await fetch(commentsUrl);
            if (!commentsRes.ok) {
              console.warn(`Failed to fetch comments for issue ${nid}: ${commentsRes.status}`);
              continue;
            }
            const commentsData = await commentsRes.json();
            const comments = commentsData.list || commentsData.comments || commentsData;
            if (!Array.isArray(comments) || comments.length === 0) {
              continue;
            }
            for (const comment of comments) {
              if (comment.timestamp && new Date(comment.timestamp * 1000) >= new Date(since)) {
                allComments.push({
                  project,
                  issue: nid,
                  author: comment.name,
                  timestamp: comment.timestamp
                });
              }
            }
          } catch (err) {
            console.error(`Error fetching comments for issue ${nid}:`, err);
          }
        }
        // Pagination: api-d7 returns a 'next' link in 'links' or use length < 50 as end
        hasNext = Array.isArray(issues) && issues.length === 50;
        page++;
      } catch (err) {
        console.error(`Error fetching issues for project ${project} (page ${page}):`, err);
        break;
      }
    }
    console.log(`Fetched ${totalIssues} issues for project ${project}`);
  }
  console.log(`Fetched ${allComments.length} comments across all projects.`);
  // Aggregate by month (UTC)
  const commentsByMonth = {};
  for (const c of allComments) {
    const d = new Date(c.timestamp * 1000);
    const month = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
    commentsByMonth[month] = (commentsByMonth[month] || 0) + 1;
  }
  console.log('Aggregated comments by month:', commentsByMonth);
  if (Object.keys(commentsByMonth).length === 0) {
    console.warn('No comments found for any month. Output will be an empty object.');
  }
  return commentsByMonth;
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
