/**
 * Plain (non-interactive) command implementations, shared by the citty
 * subcommands in `cli.ts`.
 */
import { fetchAllDebt, fetchAssignedIssues, fetchReviewerPRs, toDebtItem } from './github.ts'
import { renderJSON, renderMarkdown, renderSummary, renderTable } from './formatters.ts'
import type { DebtItem } from './types.ts'

export interface CommonArgs {
  limit: number
  staleDays?: number
  repo?: string
  format: 'table' | 'json' | 'md'
  days: number
}

/** Normalise the citty arg bag into the shape the fetchers expect. */
export function parseCommon(raw: Record<string, unknown>): CommonArgs {
  const limit = Number.parseInt(String(raw.limit ?? '30'), 10)
  const stale = raw.stale === undefined ? Number.NaN : Number.parseInt(String(raw.stale), 10)
  const days = Number.parseInt(String(raw.days ?? '7'), 10)
  const format = String(raw.format ?? 'table')

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 30,
    staleDays: Number.isFinite(stale) && stale > 0 ? stale : undefined,
    repo: raw.repo ? String(raw.repo) : undefined,
    format: format === 'json' || format === 'md' ? format : 'table',
    days: Number.isFinite(days) && days > 0 ? days : 7,
  }
}

export function renderItems(items: DebtItem[], format: CommonArgs['format']): void {
  if (format === 'json') console.log(renderJSON(items))
  else if (format === 'md') console.log(renderMarkdown(items))
  else console.log(renderTable(items))
}

/** Run a command, turning failures into the friendly message the CLI always used. */
export function withErrors(fn: () => void): number {
  try {
    fn()
    return 0
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('gh api graphql failed') || msg.includes('GraphQL errors')) {
      console.error('❌ Failed to query GitHub. Ensure you are authenticated:')
      console.error('   gh auth login')
      console.error(`   ${msg}`)
    } else {
      console.error(`❌ Error: ${msg}`)
    }
    return 1
  }
}

const all = (args: CommonArgs) => fetchAllDebt({ limit: args.limit, staleDays: args.staleDays, repo: args.repo })

export function runList(args: CommonArgs): void {
  renderItems(all(args).map(toDebtItem), args.format)
}

export function runPrs(args: CommonArgs): void {
  renderItems(
    fetchReviewerPRs({ limit: args.limit, staleDays: args.staleDays, repo: args.repo }).map(toDebtItem),
    args.format,
  )
}

export function runIssues(args: CommonArgs): void {
  renderItems(
    fetchAssignedIssues({ limit: args.limit, staleDays: args.staleDays, repo: args.repo }).map(toDebtItem),
    args.format,
  )
}

export function runStale(args: CommonArgs): void {
  renderItems(all({ ...args, staleDays: args.days }).map(toDebtItem), args.format)
}

export function runStats(args: CommonArgs): void {
  console.log(renderSummary(all(args).map(toDebtItem), args.format))
}
