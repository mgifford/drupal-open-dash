import { format, subMonths, startOfMonth, parseISO } from 'date-fns';
import { CreditRecord, CommentEvent, MergeRequest, AggregatedData } from './types';

export const getMonthLabels = (months: number): string[] => {
    const labels = [];
    let current = startOfMonth(new Date());
    for (let i = 0; i < months; i++) {
        labels.unshift(format(current, 'yyyy-MM'));
        current = subMonths(current, 1);
    }
    return labels;
};

export const aggregateData = (
    credits: CreditRecord[],
    comments: CommentEvent[],
    mrs: MergeRequest[],
    peopleUsernames: string[],
    monthLabels: string[]
): AggregatedData => {
    const data: AggregatedData = {
        commentsByMonth: {},
        mrsByMonth: { opened: {}, merged: {}, closed: {} },
        creditsByMonth: {},
        byPerson: {},
        byProject: {}
    };

    // Initialize months
    monthLabels.forEach(m => {
        data.commentsByMonth[m] = 0;
        data.mrsByMonth.opened[m] = 0;
        data.mrsByMonth.merged[m] = 0;
        data.mrsByMonth.closed[m] = 0;
        data.creditsByMonth[m] = 0;
    });
    
    // Initialize people
    peopleUsernames.forEach(u => {
        data.byPerson[u.toLowerCase()] = { comments: 0, mrs: 0, credits: 0 };
    });

    // Process Credits
    credits.forEach(c => {
        const dateStr = format(new Date(c.date), 'yyyy-MM');
        if (data.creditsByMonth[dateStr] !== undefined) {
            data.creditsByMonth[dateStr] += c.weight;
        }
        
        const u = c.username.toLowerCase();
        if (!data.byPerson[u]) data.byPerson[u] = { comments: 0, mrs: 0, credits: 0 };
        data.byPerson[u].credits += c.weight;

        if (!data.byProject[c.projectKey]) {
            data.byProject[c.projectKey] = {
                projectKey: c.projectKey,
                commentCount: 0, mrCount: 0, creditCount: 0, lastActivity: 0
            };
        }
        data.byProject[c.projectKey].creditCount += c.weight;
        data.byProject[c.projectKey].lastActivity = Math.max(data.byProject[c.projectKey].lastActivity, c.date);
    });

    // Process Comments
    comments.forEach(c => {
        const dateStr = format(new Date(c.created), 'yyyy-MM');
        if (data.commentsByMonth[dateStr] !== undefined) {
            data.commentsByMonth[dateStr]++;
        }
        // ... map uid to username? We need that mapping passed in or stored in CommentEvent
        // For now, assuming CommentEvent has username or we skip per-person attribution if missing
        // In drupalApiD7, we store uid. We need to map back to username from Roster/UID resolution.
    });

    // Process MRs
    mrs.forEach(mr => {
        // Opened
        const openDate = format(new Date(mr.createdAt), 'yyyy-MM');
        if (data.mrsByMonth.opened[openDate] !== undefined) data.mrsByMonth.opened[openDate]++;

        if (mr.mergedAt) {
            const date = format(new Date(mr.mergedAt), 'yyyy-MM');
            if (data.mrsByMonth.merged[date] !== undefined) data.mrsByMonth.merged[date]++;
        }
        // ...
        
        const u = mr.authorUsername?.toLowerCase();
        if (u && data.byPerson[u]) {
            data.byPerson[u].mrs++;
        }
        
        const pKey = mr.projectPath; // Use path as key
        if (!data.byProject[pKey]) {
            data.byProject[pKey] = {
                projectKey: pKey, commentCount: 0, mrCount: 0, creditCount: 0, lastActivity: 0
            };
        }
        data.byProject[pKey].mrCount++;
    });

    return data;
};
