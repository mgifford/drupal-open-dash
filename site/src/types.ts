export interface Person {
  username: string; // Drupal.org username (normalized)
  profileUrl: string;
  uid?: number; // Optional if we can parse it, useful for API
}

export interface CommentEvent {
  cid: number; // Comment ID
  nid: number; // Node ID (Issue)
  uid: number; // User ID of author
  username?: string; // If available directly
  created: number; // Timestamp (seconds or ms - let's standardise on ms for JS)
  projectKey?: string; // machine_name or other identifier
}

export interface IssueNode {
  nid: number;
  type: string; // 'project_issue'
  title: string;
  projectKey: string; // machine_name
  status?: string;
}

export interface MergeRequest {
  url: string;
  projectPath: string; // 'project/repo'
  iid: number;
  state: 'opened' | 'merged' | 'closed' | 'locked' | 'unknown';
  createdAt: number; // ms
  mergedAt?: number; // ms
  closedAt?: number; // ms
  authorUsername?: string;
  webUrl: string;
}

export interface CreditRecord {
  username: string;
  projectKey: string;
  date: number; // ms (approximate if only month available)
  weight: number; // usually 1
  isSecurityAdvisory?: boolean;
}

export interface ProjectActivity {
  projectKey: string;
  commentCount: number;
  mrCount: number;
  creditCount: number;
  lastActivity: number;
}

export interface TimeSeriesData {
  label: string; // Month YYYY-MM
  date: number; // timestamp for sorting
  value: number;
}

export interface AggregatedData {
  commentsByMonth: Record<string, number>; // "YYYY-MM" -> count
  mrsByMonth: {
    opened: Record<string, number>;
    merged: Record<string, number>;
    closed: Record<string, number>;
  };
  creditsByMonth: Record<string, number>;
  byPerson: Record<string, {
    comments: number;
    mrs: number;
    credits: number;
  }>;
  byProject: Record<string, ProjectActivity>;
}
