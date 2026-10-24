/** Which slice of debt the list is showing. */
export type Source = 'all' | 'prs' | 'issues'

export const sources: Source[] = ['all', 'prs', 'issues']

export function sourceLabel(source: Source): string {
  return source === 'all' ? 'All' : source === 'prs' ? 'PRs' : 'Issues'
}

export function matchesSource(itemType: 'pr' | 'issue', source: Source): boolean {
  if (source === 'all') return true
  if (source === 'prs') return itemType === 'pr'
  return itemType === 'issue'
}
