import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderJSON, renderMarkdown, renderSummary, renderTable } from './formatters.ts'
import type { DebtItem } from './types.ts'

function item(overrides: Partial<DebtItem> = {}): DebtItem {
  return {
    repo: 'owner/repo',
    number: 1,
    title: 'Fix the thing',
    url: 'https://github.com/owner/repo/pull/1',
    updatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2025-12-01T00:00:00Z',
    type: 'pr',
    state: 'open',
    author: 'someone',
    labels: ['bug'],
    age: '2mo',
    ...overrides,
  }
}

describe('renderTable', () => {
  it('sorts oldest first by updatedAt', () => {
    const output = renderTable([
      item({ number: 2, updatedAt: '2026-02-01T00:00:00Z' }),
      item({ number: 1, updatedAt: '2026-01-01T00:00:00Z' }),
    ])

    assert.ok(output.indexOf('#1') < output.indexOf('#2'), 'older item should come first')
  })

  it('reports the item count', () => {
    const output = renderTable([item(), item({ number: 2 })])
    assert.match(output, /Total: 2 items/)
  })

  it('renders zero items without throwing', () => {
    assert.match(renderTable([]), /Total: 0 items/)
  })

  it('truncates long titles instead of wrapping', () => {
    const long = 'y'.repeat(200)
    const output = renderTable([item({ title: long })])

    assert.ok(!output.includes(long), 'the full title must not appear')
    assert.ok(output.includes('...'), 'the truncation marker should be present')

    // Columns are type/repo/number/age/title joined by two spaces, and the
    // title column is fixed at 60 — so the row is one line, not a wrapped one.
    const row = output.split('\n').find((l) => l.includes('...')) ?? ''
    const title = row.split(/\s{2,}/).pop() ?? ''
    assert.equal(title.length, 60, `title should fill its 60-char column, got ${title.length}`)
  })
})

describe('renderMarkdown', () => {
  it('emits a markdown table header', () => {
    const output = renderMarkdown([item()])
    assert.match(output, /^\| Type \| Repo \| # \| Age \| Title \|/m)
    assert.match(output, /^\|------\|------\|---\|-----\|-------\|/m)
  })

  it('emits one row per item with the repo and number', () => {
    const output = renderMarkdown([item(), item({ number: 2, type: 'issue', repo: 'other/thing' })])
    assert.match(output, /\| PR \| owner\/repo \| 1 \|/)
    assert.match(output, /\| ISSUE \| other\/thing \| 2 \|/)
  })
})

describe('renderJSON', () => {
  it('round-trips through JSON', () => {
    const parsed = JSON.parse(renderJSON([item()])) as DebtItem[]
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].repo, 'owner/repo')
    assert.equal(parsed[0].age, '2mo')
  })

  it('emits an empty array, not null', () => {
    assert.equal(renderJSON([]), '[]')
  })
})

describe('renderSummary', () => {
  const items = [
    item({ type: 'pr', repo: 'a/one', updatedAt: '2026-01-01T00:00:00Z' }),
    item({ type: 'pr', number: 2, repo: 'a/one', updatedAt: '2026-02-01T00:00:00Z' }),
    item({ type: 'issue', number: 3, repo: 'b/two', updatedAt: '2026-03-01T00:00:00Z' }),
  ]

  it('counts totals by type', () => {
    const output = renderSummary(items)
    assert.match(output, /Total items:\s+3/)
    assert.match(output, /PRs to review:\s+2/)
    assert.match(output, /Issues to fix:\s+1/)
  })

  it('groups by repository, largest first', () => {
    const output = renderSummary(items)
    assert.ok(output.indexOf('a/one') < output.indexOf('b/two'), 'two-item repo should sort first')
    assert.match(output, /a\/one\s+2/)
  })

  it('reports oldest and newest', () => {
    const output = renderSummary(items)
    assert.match(output, /Oldest item: a\/one#1 \(updated 2026-01-01/)
    assert.match(output, /Newest item: b\/two#3 \(updated 2026-03-01/)
  })

  it('omits the oldest/newest lines for an empty list', () => {
    const output = renderSummary([])
    assert.match(output, /Total items:\s+0/)
    assert.ok(!output.includes('Oldest item'))
  })

  it('honours --format json with the DebtSummary shape', () => {
    const summary = JSON.parse(renderSummary(items, 'json')) as Record<string, unknown>
    assert.equal(summary.total, 3)
    assert.equal(summary.prs, 2)
    assert.equal(summary.issues, 1)
    assert.deepEqual(summary.byRepo, { 'a/one': 2, 'b/two': 1 })
    assert.equal(summary.oldestUpdated, '2026-01-01T00:00:00Z')
    assert.equal(summary.newestUpdated, '2026-03-01T00:00:00Z')
  })

  it('honours --format md', () => {
    const output = renderSummary(items, 'md')
    assert.match(output, /^\| Repo \| Count \|/m)
    assert.match(output, /Total: 3 \(PRs 2, issues 1\)/)
  })

  it('uses the text view by default', () => {
    assert.match(renderSummary(items), /GitHub Debt Summary/)
  })
})
