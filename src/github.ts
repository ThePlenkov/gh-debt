/**
 * GitHub API client for gh-debt — shells out to `gh api graphql`
 * following the pattern from @broject/core, avoiding any Octokit
 * dependency so auth, proxies, and GHES setups just work.
 */
import { spawnSync } from 'node:child_process'
import type { DebtItem } from './types.ts'

export interface GitHubItem {
  repo: string
  number: number
  title: string
  url: string
  updatedAt: string
  createdAt: string
  type: 'pr' | 'issue'
  state: 'open' | 'closed' | 'merged'
  author?: string
  labels: string[]
}

export interface DebtQueryOptions {
  limit?: number
  staleDays?: number
  repo?: string
}

/**
 * Spawn `gh api graphql` synchronously and parse JSON. Matches bro's
 * `ghJson` pattern — blocking spawnSync is fine for a CLI tool.
 * Variables are passed as `-F` fields (string/number/bool only).
 */
function ghGraphQL<T>(query: string, vars: Record<string, string | number | boolean>): T {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [k, v] of Object.entries(vars)) {
    args.push('-F', `${k}=${v}`)
  }
  const proc = spawnSync('gh', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
  if (proc.status !== 0) {
    throw new Error(`gh api graphql failed: ${proc.stderr?.trim() ?? 'unknown error'}`)
  }
  const parsed = JSON.parse(proc.stdout) as { data?: T; errors?: unknown[] }
  if (parsed.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(parsed.errors)}`)
  }
  if (!parsed.data) {
    throw new Error('No data in GraphQL response')
  }
  return parsed.data
}

/**
 * Format a date for the GraphQL `search:` qualifier — uses ISO date
 * without time for the stale filter.
 */
function daysAgoISO(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Query for PRs where the user is requested as a reviewer.
 * Uses type: ISSUE with is:pull-request filter — GitHub search
 * treats PRs as a subtype of issues, so the search index covers both.
 */
export function fetchReviewerPRs(opts: DebtQueryOptions): GitHubItem[] {
  const { limit = 30, staleDays, repo } = opts

  let qualifier = 'review-requested:@me is:pull-request state:open'
  if (repo) qualifier += ` repo:${repo}`
  if (staleDays) qualifier += ` updated:<${daysAgoISO(staleDays)}`

  const query = `query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on PullRequest {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        author { login }
        state
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`

  const data = ghGraphQL<{
    search: {
      nodes: Array<{
        number: number
        title: string
        repository: { nameWithOwner: string }
        url: string
        updatedAt: string
        createdAt: string
        author: { login: string } | null
        state: string
        labels: { nodes: Array<{ name: string }> }
      } | null>
    }
  }>(query, { q: qualifier, last: limit })

  return data.search.nodes
    .filter((n): n is NonNullable<typeof n> => n !== null && n.repository?.nameWithOwner !== undefined)
    .map((n) => ({
      repo: n.repository.nameWithOwner,
      number: n.number,
      title: n.title,
      url: n.url,
      updatedAt: n.updatedAt,
      createdAt: n.createdAt,
      type: 'pr' as const,
      state: n.state === 'MERGED' ? 'merged' : (n.state.toLowerCase() as 'open' | 'closed'),
      author: n.author?.login,
      labels: n.labels.nodes.map((l) => l.name),
    }))
}

/**
 * Query for issues assigned to the user.
 * Uses is:issue to exclude PRs — GitHub search treats PRs as a subtype.
 */
export function fetchAssignedIssues(opts: DebtQueryOptions): GitHubItem[] {
  const { limit = 30, staleDays, repo } = opts

  let qualifier = 'assignee:@me is:issue state:open'
  if (repo) qualifier += ` repo:${repo}`
  if (staleDays) qualifier += ` updated:<${daysAgoISO(staleDays)}`

  const query = `query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on Issue {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`

  const data = ghGraphQL<{
    search: {
      nodes: Array<{
        number: number
        title: string
        repository: { nameWithOwner: string }
        url: string
        updatedAt: string
        createdAt: string
        labels: { nodes: Array<{ name: string }> }
      } | null>
    }
  }>(query, { q: qualifier, last: limit })

  return data.search.nodes
    .filter((n): n is NonNullable<typeof n> => n !== null && n.repository?.nameWithOwner !== undefined)
    .map((n) => ({
      repo: n.repository.nameWithOwner,
      number: n.number,
      title: n.title,
      url: n.url,
      updatedAt: n.updatedAt,
      createdAt: n.createdAt,
      type: 'issue' as const,
      state: 'open' as const,
      labels: n.labels.nodes.map((l) => l.name),
    }))
}

/**
 * Query for PRs authored by the user that are awaiting review.
 */
export function fetchAuthoredPRs(opts: DebtQueryOptions): GitHubItem[] {
  const { limit = 30, staleDays, repo } = opts

  let qualifier = 'author:@me is:pull-request state:open'
  if (repo) qualifier += ` repo:${repo}`
  if (staleDays) qualifier += ` updated:<${daysAgoISO(staleDays)}`

  const query = `query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on PullRequest {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        state
      }
    }
  }
}`

  const data = ghGraphQL<{
    search: {
      nodes: Array<{
        number: number
        title: string
        repository: { nameWithOwner: string }
        url: string
        updatedAt: string
        createdAt: string
        state: string
      } | null>
    }
  }>(query, { q: qualifier, last: limit })

  return data.search.nodes
    .filter((n): n is NonNullable<typeof n> => n !== null && n.repository?.nameWithOwner !== undefined)
    .map((n) => ({
      repo: n.repository.nameWithOwner,
      number: n.number,
      title: n.title,
      url: n.url,
      updatedAt: n.updatedAt,
      createdAt: n.createdAt,
      type: 'pr' as const,
      state: n.state === 'MERGED' ? 'merged' : (n.state.toLowerCase() as 'open' | 'closed'),
      labels: [],
    }))
}

/**
 * Fetch all debt — PRs needing your review + issues assigned to you.
 */
export function fetchAllDebt(opts: DebtQueryOptions = {}): GitHubItem[] {
  const prs = fetchReviewerPRs(opts)
  const issues = fetchAssignedIssues(opts)
  return [...prs, ...issues]
}

/**
 * Compute human-readable age from an ISO date string.
 */
export function humanAge(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  const days = Math.floor((now - then) / (24 * 60 * 60 * 1000))

  if (days < 1) return 'today'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

/**
 * Convert a raw GitHubItem to a DebtItem with computed age.
 */
export function toDebtItem(item: GitHubItem): DebtItem {
  return {
    ...item,
    age: humanAge(item.updatedAt),
  }
}
