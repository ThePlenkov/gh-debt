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
export type GraphqlVars = Record<string, string | number | boolean>;
/**
 * Query for PRs where the user is requested as a reviewer.
 * Uses type: ISSUE with is:pull-request filter — GitHub search
 * treats PRs as a subtype of issues, so the search index covers both.
 */
export declare function fetchReviewerPRs(opts?: DebtQueryOptions): GitHubItem[];
/** Async counterpart of {@link fetchReviewerPRs}. */
export declare function fetchReviewerPRsAsync(opts?: DebtQueryOptions): Promise<GitHubItem[]>;
/**
 * Query for issues assigned to the user.
 * Uses is:issue to exclude PRs — GitHub search treats PRs as a subtype.
 */
export declare function fetchAssignedIssues(opts?: DebtQueryOptions): GitHubItem[];
/** Async counterpart of {@link fetchAssignedIssues}. */
export declare function fetchAssignedIssuesAsync(opts?: DebtQueryOptions): Promise<GitHubItem[]>;
/**
 * Query for PRs authored by the user that are awaiting review.
 */
export declare function fetchAuthoredPRs(opts?: DebtQueryOptions): GitHubItem[];
/**
 * Fetch all debt — PRs needing your review + issues assigned to you.
 *
 * `limit` caps the combined result, so it is split between the two queries
 * rather than applied to each (which would return up to twice as many items).
 */
export declare function fetchAllDebt(opts?: DebtQueryOptions): GitHubItem[];
/**
 * Async counterpart of {@link fetchAllDebt} for the interactive UI. The two
 * queries run concurrently, so the wait is one `gh` round-trip, not two.
 */
export declare function fetchAllDebtAsync(opts?: DebtQueryOptions): Promise<GitHubItem[]>;
/**
 * Fetch one category for the UI's sidebar. Mirrors the plain CLI's
 * `all` / `prs` / `issues` commands.
 */
export declare function fetchByCategoryAsync(category: 'all' | 'prs' | 'issues', opts?: DebtQueryOptions): Promise<GitHubItem[]>;
/**
 * Compute human-readable age from an ISO date string.
 */
export declare function humanAge(isoDate: string): string;
/**
 * Convert a raw GitHubItem to a DebtItem with computed age.
 */
export declare function toDebtItem(item: GitHubItem): DebtItem;