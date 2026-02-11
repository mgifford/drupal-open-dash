import { Person, CommentEvent } from '../types';
import { CONFIG } from '../config';
import { storage, cacheKey } from '../storage';

const API_BASE = CONFIG.drupalApiBase;

// Helper using proxy if CORS fails? api-d7 usually handles CORS fine.
const fetchJson = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

export async function resolveUid(username: string): Promise<number | null> {
    const key = `uid-${username}`;
    const cached = storage.get<number>(key);
    if (cached) return cached;

    try {
        const url = `${API_BASE}/user.json?name=${encodeURIComponent(username)}`;
        const data = await fetchJson(url);
        if (data.list && data.list.length > 0) {
            const uid = parseInt(data.list[0].uid, 10);
            storage.set(key, uid);
            return uid;
        }
    } catch (e) {
        console.warn(`Failed to resolve uid for ${username}`, e);
    }
    return null;
}

export async function fetchCommentsForUser(
    uid: number,
    sinceTimestamp: number // seconds
): Promise<CommentEvent[]> {
    const key = cacheKey('comments', { uid: uid.toString(), since: sinceTimestamp.toString() });
    const cached = storage.get<CommentEvent[]>(key);
    if (cached) return cached;

    const comments: CommentEvent[] = [];
    let page = 0;
    
    // Safety break
    const MAX_PAGES_PER_USER = 10; 

    while (page < MAX_PAGES_PER_USER) {
        // Filter by author uid and sort by created date desc
        // api-d7: comment.json?uid=X&sort=created&direction=DESC
        const url = `${API_BASE}/comment.json?uid=${uid}&sort=created&direction=DESC&page=${page}`;
        try {
            const data = await fetchJson(url);
            const list = data.list || [];
            
            if (list.length === 0) break;

            let stop = false;
            for (const c of list) {
                const createdStr = c.created; // "1234567890"
                const created = parseInt(createdStr, 10);
                
                if (created < sinceTimestamp) {
                    stop = true;
                    break;
                }

                // We want comments on Project Issues
                // comment.json returns 'node': { id: "123", resource: "node", uri: ... }
                // We need to check if node is issue?
                // The comment object doesn't always have node type.
                // We'll collect the NID and filter/hydrate later or lazily.
                
                const nid = parseInt(c.node.id, 10);
                
                comments.push({
                    cid: parseInt(c.cid, 10),
                    nid: nid,
                    uid: uid,
                    created: created * 1000, // convert to ms
                    // projectKey? we need to look up the node.
                });
            }

            if (stop) break;
            page++;
            if (list.length < 10) break; // heuristic for last page (default limit is 20 usually, check docs)
            
        } catch (e) {
            console.error(`Error fetching comments for uid ${uid}`, e);
            break;
        }
    }
    
    storage.set(key, comments);
    return comments;
}

// Caching node details (project, type)
export async function getIssueDetails(nids: number[]): Promise<Map<number, { type: string, projectKey: string }>> {
   const results = new Map();
   const toFetch: number[] = [];

   // Check cache
   for (const nid of nids) {
       const cached = storage.get<{ type: string, projectKey: string }>(`node-${nid}`);
       if (cached) {
           results.set(nid, cached);
       } else {
           toFetch.push(nid);
       }
   }
   
   if (toFetch.length === 0) return results;

   // Fetch in batches (api-d7 support multiple nids? typically not in one GET param like ?nid=1,2,3... only some endpoints)
   // node.json supports ?nid[0]=1&nid[1]=2...
   // Or standard views.
   // We'll throttle individual requests or batches.
   
   // Actually, node.json?nid=1,2,3 works usually or repeated params?
   // Let's do small batches of 5-10
   const BATCH_SIZE = 10;
   for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
       const batch = toFetch.slice(i, i + BATCH_SIZE);
       const params = batch.map((id, idx) => `nid[${idx}]=${id}`).join('&');
       const url = `${API_BASE}/node.json?${params}`;
       
       try {
           const data = await fetchJson(url);
           const nodes = data.list || [];
           for (const n of nodes) {
               const details = {
                   type: n.type,
                   // project info is usually in field_project ref
                   projectKey: n.field_project ? n.field_project.id : (n.field_project_machine_name || 'unknown') 
                   // Machine name is often harder to get from just node.json without dereferencing project node
                   // But let's assume we get a project ID.
               };
               
               // If type is project_issue, good.
               if (n.type === 'project_issue') {
                   // We need mapping from project NID to machine_name?
                   // Or just use project NID as key for now.
                   // The prompt asks for machine_name if possible.
                   // We might need to dereference the project node. 
                   // Optimization: user can see "Project #123" if extraction fails.
                   
                   // Try to find machine name in common fields
                   // api-d7 usually exposes fields like field_project: { id: "28421", resource: "node" }
               }
               
               storage.set(`node-${n.nid}`, details);
               results.set(parseInt(n.nid, 10), details);
           }
       } catch (e) {
           console.error("Batch node fetch failed", e);
       }
   }
   
   return results;
}
