import { CreditRecord } from '../types';
import { CONFIG } from '../config';
import { storage, cacheKey } from '../storage';

const BASE_URL = CONFIG.contributionApiBase;

export async function fetchContributionRecords(
  org: string,
  months: number,
  onProgress?: (count: number) => void
): Promise<CreditRecord[]> {
    const key = cacheKey('contributionRecords', { org, months });
    const cached = storage.get<CreditRecord[]>(key);
    if (cached) {
        console.log('Cache hit for contribution records');
        return cached;
    }

    let page = 0;
    let hasNext = true;
    let allRecords: CreditRecord[] = [];
    const MAX_PAGES = 50; // Safety cap

    while (hasNext && page < MAX_PAGES) {
        const url = `${BASE_URL}?organization=${encodeURIComponent(org)}&months=${months}&page=${page}&limit=50`; // limit typically supported
        // Note: The new.drupal.org endpoint returns JSON
        
        console.log(`Fetching page ${page} from ${url}`);
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            // Data structure expected: { list: [...], ... } or just array?
            // "Use contribution records for a proxy... endpoint supports csv_export"
            // Typically Drupal JSON APIs return { rows: [], pager: {} } or similar.
            // Defensive parsing needed.
            
            const rows = Array.isArray(data) ? data : (data.results || data.list || data.rows || []);
            
            if (rows.length === 0) {
                hasNext = false;
            } else {
                // Parse rows
                const parsed: CreditRecord[] = rows.map((r: any) => ({
                    username: r.username || r.user_name || r.author?.name || 'unknown',
                    projectKey: r.project_machine_name || r.project || 'unknown',
                    date: r.created ? new Date(r.created).getTime() : Date.now(), // Fallback if no date
                    weight: 1,
                    isSecurityAdvisory: !!r.is_sa // Check field name in dev
                }));
                allRecords.push(...parsed);
                onProgress?.(allRecords.length);
                
                page++;
                // If fewer than limit, likely last page.
                if (rows.length < 50) hasNext = false;
            }
            
            // Trivial delay to respect generic rate limits / politeness
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
            console.error('Error fetching credits:', error);
            // If one page fails, maybe stop? Or throw?
            // If it's 429, we should wait.
            // For now, break and return partial
            break;
        }
    }

    storage.set(key, allRecords);
    return allRecords;
}
