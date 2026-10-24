/**
 * GitHub API client for gh-debt — shells out to `gh api graphql`
 * following the pattern from @broject/core, avoiding any Octokit
 * dependency so auth, proxies, and GHES setups just work.
 */
import { spawn, spawnSync } from 'node:child_process'
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

export type GraphqlVars = Record<string, string | number | boolean>

/** Raw GraphQL search node for a pull request. */
interface RawPrNode {
  number: number
  title: string
  repository: { nameWithOwner: string }
  url: string
  updatedAt: string
  createdAt: string
  author: { login: string } | null
  state: string
  labels: { nodes: Array<{ name: string }> }
}

/** Raw GraphQL search node for an issue. */
interface RawIssueNode {
  number: number
  title: string
  repository: { nameWithOwner: string }
  url: string
  updatedAt: string
  createdAt: string
  labels: { nodes: Array<{ name: string }> }
}

interface SearchData<T> {
  search: { nodes: Array<T | null> }
}

/** Query for PRs where the user is requested as a reviewer. */
const REVIEWER_QUERY = `query($q: String!, $last: Int!) {
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

/** Query for issues assigned to the user. */
const ISSUE_QUERY = `query($q: String!, $last: Int!) {
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

/** Query for PRs authored by the user that are awaiting review. */
const AUTHORED_QUERY = `query($q: String!, $last: Int!) {
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

/**
 * Format a date for the GraphQL `search:` qualifier — uses ISO date
 * without time for the stale filter.
 */
function daysAgoISO(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

function graphQLArgs(query: string, vars: GraphqlVars): string[] {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [k, v] of Object.entries(vars)) {
    args.push('-F', `${k}=${v}`)
  }
  return args
}

function parseGraphQL<T>(stdout: string): T {
  const parsed = JSON.parse(stdout) as { data?: T; errors?: unknown[] }
  if (parsed.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(parsed.errors)}`)
  }
  if (!parsed.data) {
    throw new Error('No data in GraphQL response')
  }
  return parsed.data
}

/**
 * Spawn `gh api graphql` synchronously and parse JSON. Matches bro's
 * `ghJson` pattern — blocking spawnSync is fine for a one-shot CLI command.
 * Variables are passed as `-F` fields (string/number/bool only).
 */
function ghGraphQL<T>(query: string, vars: GraphqlVars): T {
  const proc = spawnSync('gh', graphQLArgs(query, vars), {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
  if (proc.status !== 0) {
    throw new Error(`gh api graphql failed: ${proc.stderr?.trim() ?? 'unknown error'}`)
  }
  return parseGraphQL<T>(proc.stdout ?? '')
}

/**
 * Async counterpart of {@link ghGraphQL}. Used by the interactive UI so a
 * slow `gh` call does not freeze rendering; the plain CLI stays on the
 * synchronous path.
 */
function ghGraphQLAsync<T>(query: string, vars: GraphqlVars): Promise<T> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', graphQLArgs(query, vars), { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`gh api graphql failed: ${stderr.trim() || 'unknown error'}`))
        return
      }
      try {
        resolve(parseGraphQL<T>(stdout))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function usableNodes<T extends { repository?: { nameWithOwner?: string } }>(data: SearchData<T>): T[] {
  return data.search.nodes.filter(
    (n): n is NonNullable<typeof n> => n !== null && n.repository?.nameWithOwner !== undefined,
  )
}

function toPrItem(n: RawPrNode): GitHubItem {
  return {
    repo: n.repository.nameWithOwner,
    number: n.number,
    title: n.title,
    url: n.url,
    updatedAt: n.updatedAt,
    createdAt: n.createdAt,
    type: 'pr',
    state: n.state === 'MERGED' ? 'merged' : (n.state.toLowerCase() as 'open' | 'closed'),
    author: n.author?.login,
    labels: n.labels.nodes.map((l) => l.name),
  }
}

function toIssueItem(n: RawIssueNode): GitHubItem {
  return {
    repo: n.repository.nameWithOwner,
    number: n.number,
    title: n.title,
    url: n.url,
    updatedAt: n.updatedAt,
    createdAt: n.createdAt,
    type: 'issue',
    state: 'open',
    labels: n.labels.nodes.map((l) => l.name),
  }
}

function toAuthoredItem(n: RawPrNode): GitHubItem {
  return { ...toPrItem({ ...n, labels: { nodes: [] } }), labels: [] }
}

function reviewerQualifier(opts: DebtQueryOptions): string {
  let qualifier = 'review-requested:@me is:pull-request state:open'
  if (opts.repo) qualifier += ` repo:${opts.repo}`
  if (opts.staleDays) qualifier += ` updated:<${daysAgoISO(opts.staleDays)}`
  return qualifier
}

function issueQualifier(opts: DebtQueryOptions): string {
  let qualifier = 'assignee:@me is:issue state:open'
  if (opts.repo) qualifier += ` repo:${opts.repo}`
  if (opts.staleDays) qualifier += ` updated:<${daysAgoISO(opts.staleDays)}`
  return qualifier
}

function authoredQualifier(opts: DebtQueryOptions): string {
  let qualifier = 'author:@me is:pull-request state:open'
  if (opts.repo) qualifier += ` repo:${opts.repo}`
  if (opts.staleDays) qualifier += ` updated:<${daysAgoISO(opts.staleDays)}`
  return qualifier
}

/**
 * Query for PRs where the user is requested as a reviewer.
 * Uses type: ISSUE with is:pull-request filter — GitHub search
 * treats PRs as a subtype of issues, so the search index covers both.
 */
export function fetchReviewerPRs(opts: DebtQueryOptions = {}): GitHubItem[] {
  const { limit = 30 } = opts
  const data = ghGraphQL<SearchData<RawPrNode>>(REVIEWER_QUERY, {
    q: reviewerQualifier(opts),
    last: limit,
  })
  return usableNodes(data).map(toPrItem)
}

/** Async counterpart of {@link fetchReviewerPRs}. */
export async function fetchReviewerPRsAsync(opts: DebtQueryOptions = {}): Promise<GitHubItem[]> {
  const { limit = 30 } = opts
  const data = await ghGraphQLAsync<SearchData<RawPrNode>>(REVIEWER_QUERY, {
    q: reviewerQualifier(opts),
    last: limit,
  })
  return usableNodes(data).map(toPrItem)
}

/**
 * Query for issues assigned to the user.
 * Uses is:issue to exclude PRs — GitHub search treats PRs as a subtype.
 */
export function fetchAssignedIssues(opts: DebtQueryOptions = {}): GitHubItem[] {
  const { limit = 30 } = opts
  const data = ghGraphQL<SearchData<RawIssueNode>>(ISSUE_QUERY, {
    q: issueQualifier(opts),
    last: limit,
  })
  return usableNodes(data).map(toIssueItem)
}

/** Async counterpart of {@link fetchAssignedIssues}. */
export async function fetchAssignedIssuesAsync(opts: DebtQueryOptions = {}): Promise<GitHubItem[]> {
  const { limit = 30 } = opts
  const data = await ghGraphQLAsync<SearchData<RawIssueNode>>(ISSUE_QUERY, {
    q: issueQualifier(opts),
    last: limit,
  })
  return usableNodes(data).map(toIssueItem)
}

/**
 * Query for PRs authored by the user that are awaiting review.
 */
export function fetchAuthoredPRs(opts: DebtQueryOptions = {}): GitHubItem[] {
  const { limit = 30 } = opts
  const data = ghGraphQL<SearchData<RawPrNode>>(AUTHORED_QUERY, {
    q: authoredQualifier(opts),
    last: limit,
  })
  return usableNodes(data).map(toAuthoredItem)
}

/**
 * Fetch all debt — PRs needing your review + issues assigned to you.
 *
 * `limit` caps the combined result, so it is split between the two queries
 * rather than applied to each (which would return up to twice as many items).
 */
export function fetchAllDebt(opts: DebtQueryOptions = {}): GitHubItem[] {
  const limit = opts.limit ?? 30
  const prs = fetchReviewerPRs({ ...opts, limit: Math.ceil(limit / 2) })
  const issues = fetchAssignedIssues({ ...opts, limit: Math.floor(limit / 2) })
  return [...prs, ...issues]
}

/**
 * Async counterpart of {@link fetchAllDebt} for the interactive UI. The two
 * queries run concurrently, so the wait is one `gh` round-trip, not two.
 */
export async function fetchAllDebtAsync(opts: DebtQueryOptions = {}): Promise<GitHubItem[]> {
  const limit = opts.limit ?? 30
  const [prs, issues] = await Promise.all([
    fetchReviewerPRsAsync({ ...opts, limit: Math.ceil(limit / 2) }),
    fetchAssignedIssuesAsync({ ...opts, limit: Math.floor(limit / 2) }),
  ])
  return [...prs, ...issues]
}

/**
 * Fetch one category for the UI's sidebar. Mirrors the plain CLI's
 * `all` / `prs` / `issues` commands.
 */
export async function fetchByCategoryAsync(
  category: 'all' | 'prs' | 'issues',
  opts: DebtQueryOptions = {},
): Promise<GitHubItem[]> {
  if (category === 'prs') return fetchReviewerPRsAsync(opts)
  if (category === 'issues') return fetchAssignedIssuesAsync(opts)
  return fetchAllDebtAsync(opts)
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
