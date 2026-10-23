interface DebtItem {
  /** Repository full name, e.g. "ThePlenkov/bro" */
  repo: string;
  /** PR or issue number */
  number: number;
  /** Title of the PR or issue */
  title: string;
  /** Direct URL to the PR or issue on GitHub */
  url: string;
  /** When the item was last updated, ISO 8601 */
  updatedAt: string;
  /** When the item was created, ISO 8601 */
  createdAt: string;
  /** "pr" or "issue" */
  type: 'pr' | 'issue';
  /** Current state */
  state: 'open' | 'closed' | 'merged';
  /** Author login for PRs */
  author?: string;
  /** Labels on the issue/PR */
  labels: string[];
  /** Human-readable age description, e.g. "3d" or "2w" */
  age: string;
}
export { DebtItem as t };