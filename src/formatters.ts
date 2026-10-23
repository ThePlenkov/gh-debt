/**
 * Output formatters for gh-debt — table, JSON, and summary views.
 * Follows bro's pattern of separate rendering from data collection.
 */
import type { DebtItem, DebtSummary } from './types.ts'

/**
 * Render debt items as a table, sorted by updatedAt ascending (oldest first).
 */
export function renderTable(items: DebtItem[]): string {
  // Sort oldest-first by updatedAt
  const sorted = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))

  // Build rows
  const rows = sorted.map((item) => [
    item.type.toUpperCase().padEnd(4),
    item.repo.padEnd(40),
    `#${item.number}`.padEnd(8),
    item.age.padEnd(5),
    truncate(item.title, 60),
  ])

  // Calculate column widths
  const headers = ['TYPE', 'REPO', 'NUM', 'AGE', 'TITLE']
  const allRows = [headers, ...rows]

  let output = '\n'
  for (const row of allRows) {
    output += row.join('  ') + '\n'
  }
  output += `\nTotal: ${items.length} items (oldest first)\n`
  return output
}

/**
 * Renders debt items as markdown table.
 */
export function renderMarkdown(items: DebtItem[]): string {
  const sorted = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))

  let output = '| Type | Repo | # | Age | Title |\n'
  output += '|------|------|---|-----|-------|\n'
  for (const item of sorted) {
    output += `| ${item.type.toUpperCase()} | ${item.repo} | ${item.number} | ${item.age} | ${truncate(item.title, 60)} |\n`
  }
  output += `\nTotal: ${items.length} items\n`
  return output
}

/**
 * Render debt items as JSON.
 */
export function renderJSON(items: DebtItem[]): string {
  return JSON.stringify(items, null, 2)
}

/**
 * Aggregate debt items into the summary shape.
 */
function summarize(items: DebtItem[]): DebtSummary {
  const byRepo: Record<string, number> = {}
  for (const item of items) {
    byRepo[item.repo] = (byRepo[item.repo] || 0) + 1
  }

  const sorted = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))

  return {
    total: items.length,
    prs: items.filter((i) => i.type === 'pr').length,
    issues: items.filter((i) => i.type === 'issue').length,
    byRepo,
    oldestUpdated: sorted[0]?.updatedAt ?? '',
    newestUpdated: sorted[sorted.length - 1]?.updatedAt ?? '',
  }
}

/**
 * Render a summary of debt items. `format` mirrors the global --format flag;
 * the default is the human-readable view.
 */
export function renderSummary(
  items: DebtItem[],
  format: 'table' | 'json' | 'md' = 'table',
): string {
  const summary = summarize(items)

  if (format === 'json') return JSON.stringify(summary, null, 2)

  const byRepo = Object.entries(summary.byRepo).sort(([, a], [, b]) => b - a)

  if (format === 'md') {
    let output = '| Repo | Count |\n|------|-------|\n'
    for (const [repo, count] of byRepo) {
      output += `| ${repo} | ${count} |\n`
    }
    output += `\nTotal: ${summary.total} (PRs ${summary.prs}, issues ${summary.issues})\n`
    return output
  }

  let output = `\n📊 GitHub Debt Summary\n`
  output += `=========================\n\n`
  output += `Total items:    ${summary.total}\n`
  output += `PRs to review:  ${summary.prs}\n`
  output += `Issues to fix:  ${summary.issues}\n\n`

  if (byRepo.length > 0) {
    output += 'By repository:\n'
    for (const [repo, count] of byRepo) {
      output += `  ${repo.padEnd(45)} ${count}\n`
    }
  }

  const sorted = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  if (sorted.length > 0) {
    const oldest = sorted[0]
    const newest = sorted[sorted.length - 1]
    output += `\nOldest item: ${oldest.repo}#${oldest.number} (updated ${oldest.updatedAt})\n`
    output += `Newest item: ${newest.repo}#${newest.number} (updated ${newest.updatedAt})\n`
  }

  output += '\n'
  return output
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 3) + '...'
}
