import { MergeRequest } from '../types';
import { CONFIG, STORAGE_KEYS } from '../config';
import { storage } from '../storage';

const GL_BASE = CONFIG.gitlabApiBase;

export async function fetchMergeRequestDetails(mrUrl: string): Promise<Partial<MergeRequest>> {
    const token = storage.getSettings(STORAGE_KEYS.GITLAB_TOKEN, ''); // Actually retrieve from settings
    // If no token, we can't really fetch data from GitLab efficiently without hitting strict limits,
    // and private repos are off limits (though Drupal code is public).
    // Public GitLab API usage without token is rate limited.
    
    // Parse URL: https://git.drupalcode.org/project/PROJECT/-/merge_requests/IID
    const match = mrUrl.match(/git\.drupalcode\.org\/(.+)\/-\/merge_requests\/(\d+)/);
    if (!match) return { url: mrUrl, state: 'unknown' as any };
    
    const [, projectPath, iidStr] = match;
    const iid = parseInt(iidStr, 10);
    const encodedPath = encodeURIComponent(projectPath);

    const cacheKey = `mr-${projectPath}-${iid}`;
    const cached = storage.get<Partial<MergeRequest>>(cacheKey);
    if (cached) return cached;
    
    if (!token) {
        // Without token, minimal data or mock?
        // Actually, users might want just counts from URL.
        // We can return parsed structure.
        return {
            url: mrUrl,
            projectPath,
            iid,
            state: 'unknown' as any,
            createdAt: 0 // Unknown
        };
    }
    
    const url = `${GL_BASE}/projects/${encodedPath}/merge_requests/${iid}`;
    try {
        const res = await fetch(url, {
            headers: token ? { 'PRIVATE-TOKEN': token } : {}
        });
        
        if (!res.ok) throw new Error(`GL HTTP ${res.status}`);
        
        const data = await res.json();
        
        const mr: Partial<MergeRequest> = {
            url: mrUrl,
            projectPath,
            iid,
            state: data.state,
            createdAt: new Date(data.created_at).getTime(),
            mergedAt: data.merged_at ? new Date(data.merged_at).getTime() : undefined,
            closedAt: data.closed_at ? new Date(data.closed_at).getTime() : undefined,
            authorUsername: data.author?.username,
            webUrl: data.web_url
        };
        
        storage.set(cacheKey, mr);
        return mr;
    } catch (e) {
        console.warn(`Failed to fetch MR ${mrUrl}`, e);
        return { url: mrUrl, projectPath, iid, state: 'unknown' as any };
    }
}
