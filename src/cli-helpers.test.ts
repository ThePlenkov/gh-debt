import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSubCommand, subCommandNames } from './cli-helpers.ts'

describe('subcommand dispatch', () => {
  // citty runs the matched subcommand's `run` and then the main command's `run`,
  // so the main command's non-interactive fallback would print the same table a
  // second time. This is the decision that prevents it.
  it('recognises every subcommand in argv', () => {
    for (const name of subCommandNames) {
      assert.equal(isSubCommand([name]), true, `${name} should be recognised`)
      assert.equal(isSubCommand(['--limit', '5', name]), true)
    }
  })

  it('does not treat flags or their values as a subcommand', () => {
    assert.equal(isSubCommand([]), false)
    assert.equal(isSubCommand(['--limit', '5']), false)
    assert.equal(isSubCommand(['--format', 'json']), false)
    // `--repo list` passes the word as a value, not as a dispatch.
    assert.equal(isSubCommand(['--repo', 'list']), false)
    // An inline value does not hide a later subcommand.
    assert.equal(isSubCommand(['--repo=list', 'prs']), true)
    // A subcommand after a flag and its value is still a dispatch.
    assert.equal(isSubCommand(['--limit', '5', 'prs']), true)
  })
})