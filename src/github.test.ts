import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { humanAge, toDebtItem } from './github.ts'
import type { GitHubItem } from './github.ts'

function raw(overrides: Partial<GitHubItem> = {}): GitHubItem {
  return {
    repo: 'owner/repo',
    number: 1,
    title: 'Fix the thing',
    url: 'https://github.com/owner/repo/pull/1',
    updatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2025-12-01T00:00:00Z',
    type: 'pr',
    state: 'open',
    labels: [],
    ...overrides,
  }
}

describe('humanAge', () => {
  const now = Date.now()
  const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString()

  it('says "today" for anything under a day', () => {
    assert.equal(humanAge(new Date(now - 3_600_000).toISOString()), 'today')
    assert.equal(humanAge(new Date(now - 86_399_000).toISOString()), 'today')
  })

  it('counts days under a week', () => {
    assert.equal(humanAge(daysAgo(1)), '1d')
    assert.equal(humanAge(daysAgo(6)), '6d')
  })

  it('counts weeks under a month', () => {
    assert.equal(humanAge(daysAgo(7)), '1w')
    assert.equal(humanAge(daysAgo(29)), '4w')
  })

  it('counts months from a month on', () => {
    assert.equal(humanAge(daysAgo(30)), '1mo')
    assert.equal(humanAge(daysAgo(365)), '12mo')
  })
})

describe('toDebtItem', () => {
  it('adds a computed age and keeps every field', () => {
    const result = toDebtItem(raw({ author: 'someone', labels: ['bug'] }))

    assert.equal(result.repo, 'owner/repo')
    assert.equal(result.number, 1)
    assert.equal(result.author, 'someone')
    assert.deepEqual(result.labels, ['bug'])
    assert.equal(typeof result.age, 'string')
  })

  it('drops nothing from the source item', () => {
    const result = toDebtItem(raw())
    assert.equal(Object.keys(result).length, Object.keys(raw()).length + 1)
  })
})
