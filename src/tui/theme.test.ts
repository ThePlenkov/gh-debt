import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fit, nextView, palette, prevView, truncate } from './theme.ts'

describe('truncate', () => {
  it('leaves short strings alone', () => {
    assert.equal(truncate('abc', 5), 'abc')
    assert.equal(truncate('abc', 3), 'abc')
  })

  it('keeps the end of the string, which is what identifies a repo', () => {
    assert.equal(truncate('theplenkov-forks/vercel-labs-skills', 22), '…ks/vercel-labs-skills')
  })

  it('never exceeds the requested width', () => {
    for (const width of [1, 2, 5, 10]) {
      assert.ok(truncate('x'.repeat(50), width).length <= width)
    }
  })
})

describe('fit', () => {
  it('pads short strings on the right so columns line up', () => {
    assert.equal(fit('PR', 5), 'PR   ')
    assert.equal(fit('ab', 2), 'ab')
  })

  it('truncates long strings to exactly the width', () => {
    assert.equal(fit('abcdef', 3), '…ef')
    assert.equal(fit('abcdef', 3).length, 3)
  })
})

describe('navigation stack', () => {
  it('drills down in order, and stops at the bottom', () => {
    assert.equal(nextView('sources'), 'list')
    assert.equal(nextView('list'), 'detail')
    assert.equal(nextView('detail'), 'detail')
  })

  it('goes back up, and stops at the top', () => {
    assert.equal(prevView('detail'), 'list')
    assert.equal(prevView('list'), 'sources')
    assert.equal(prevView('sources'), 'sources')
  })

  it('has a palette entry for every state the UI paints', () => {
    const keys = ['focus', 'border', 'selection', 'pr', 'issue', 'muted', 'title', 'danger'] as const
    for (const key of keys) {
      assert.equal(typeof palette[key], 'string')
    }
  })
})
