import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseCommon, renderItems } from './commands.ts'

describe('parseCommon', () => {
  it('applies the documented defaults', () => {
    assert.deepEqual(parseCommon({}), {
      limit: 30,
      staleDays: undefined,
      repo: undefined,
      format: 'table',
      days: 7,
    })
  })

  it('parses numbers out of the string args citty hands over', () => {
    assert.equal(parseCommon({ limit: '20' }).limit, 20)
    assert.equal(parseCommon({ stale: '14' }).staleDays, 14)
    assert.equal(parseCommon({ days: '3' }).days, 3)
  })

  it('falls back when a number is missing or nonsense', () => {
    assert.equal(parseCommon({ limit: 'abc' }).limit, 30)
    assert.equal(parseCommon({ limit: '' }).limit, 30)
    assert.equal(parseCommon({ stale: 'nope' }).staleDays, undefined)
    assert.equal(parseCommon({ days: '-5' }).days, 7)
  })

  it('treats a zero limit as absent rather than asking for nothing', () => {
    assert.equal(parseCommon({ limit: '0' }).limit, 30)
  })

  it('keeps only the known output formats', () => {
    assert.equal(parseCommon({ format: 'json' }).format, 'json')
    assert.equal(parseCommon({ format: 'md' }).format, 'md')
    assert.equal(parseCommon({ format: 'table' }).format, 'table')
    assert.equal(parseCommon({ format: 'xml' }).format, 'table')
  })

  it('passes the repo through when set', () => {
    assert.equal(parseCommon({ repo: 'owner/repo' }).repo, 'owner/repo')
    assert.equal(parseCommon({ repo: '' }).repo, undefined)
  })
})

describe('renderItems', () => {
  it('writes to stdout', () => {
    const original = console.log
    const seen: string[] = []
    console.log = (...args: unknown[]) => seen.push(args.join(' '))
    try {
      renderItems([], 'table')
    } finally {
      console.log = original
    }
    assert.equal(seen.length, 1)
    assert.match(seen[0], /Total: 0 items/)
  })
})

describe('subcommand output', () => {
  // citty runs the matched subcommand's `run` and then the main command's `run`,
  // so the main command must not fall back to plain output when a subcommand
  // already rendered — that printed every table twice.
  it('renders nothing when a subcommand already rendered', async () => {
    const { runMainBranchOnce } = await import('./cli-helpers.ts')
    const original = console.log
    const seen: string[] = []
    console.log = (...args: unknown[]) => seen.push(args.join(' '))
    try {
      await runMainBranchOnce({ limit: 0 } as never, ['list'])
    } finally {
      console.log = original
    }
    assert.equal(seen.length, 0)
  })

  it('falls back to plain output when no subcommand was given', async () => {
    const { runMainBranchOnce } = await import('./cli-helpers.ts')
    const original = console.log
    const seen: string[] = []
    console.log = (...args: unknown[]) => seen.push(args.join(' '))
    try {
      await runMainBranchOnce({ limit: 0 } as never, [])
    } finally {
      console.log = original
    }
    assert.equal(seen.length, 1)
  })
})
