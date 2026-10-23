import { t as DebtItem } from "./types-rw0KCxm4.mjs";
export interface GitHubItem {
  repo: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  createdAt: string;
  type: 'pr' | 'issue';
  state: 'open' | 'closed' | 'merged';
  author?: string;
  labels: string[];
}
export interface DebtQueryOptions {
  limit?: number;
  staleDays?: number;
  repo?: string;
}
/**
 * Query for PRs where the user is requested as a reviewer.
 * Uses type: ISSUE with is:pull-request filter — GitHub search
 * treats PRs as a subtype of issues, so the search index covers both.
 */
export declare function fetchReviewerPRs(opts: DebtQueryOptions): GitHubItem[];
/**
 * Query for issues assigned to the user.
 * Uses is:issue to exclude PRs — GitHub search treats PRs as a subtype.
 */
export declare function fetchAssignedIssues(opts: DebtQueryOptions): GitHubItem[];
/**
 * Query for PRs authored by the user that are awaiting review.
 */
export declare function fetchAuthoredPRs(opts: DebtQueryOptions): GitHubItem[];
/**
 * Fetch all debt — PRs needing your review + issues assigned to you.
 */
export declare function fetchAllDebt(opts?: DebtQueryOptions): GitHubItem[];
/**
 * Compute human-readable age from an ISO date string.
 */
export declare function humanAge(isoDate: string): string;
/**
 * Convert a raw GitHubItem to a DebtItem with computed age.
 */
export declare function toDebtItem(item: GitHubItem): DebtItem;