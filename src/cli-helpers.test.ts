import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { isInteractiveTerminal, isSubCommand, runInteractive, subCommandNames } from './cli-helpers.ts'

/** argv, the TTY flags and the exit code are process-global, so every case restores them. */
const realArgv = process.argv
const realStdin = process.stdin.isTTY
const realStdout = process.stdout.isTTY
const realExitCode = process.exitCode

afterEach(() => {
  process.argv = realArgv
  process.stdin.isTTY = realStdin
  process.stdout.isTTY = realStdout
  // The non-TTY fallback sets it through withErrors; a stray 1 would fail the runner.
  process.exitCode = realExitCode
})

describe('subcommand dispatch', () => {
  // citty runs the matched subcommand's `run` and then the main command's `run`,
  // so the main command must do nothing when a subcommand was dispatched.
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

/** Run the main command's `run` and report how many times the UI was launched. */
async function launchedCount(argv: string[], terminal: boolean): Promise<number> {
  process.argv = ['node', 'cli.mjs', ...argv]
  process.stdin.isTTY = terminal
  process.stdout.isTTY = terminal
  let launched = 0
  await runInteractive({ limit: 30 } as never, false, () => {
    launched += 1
  })
  return launched
}

describe('what the main command does after citty dispatches', () => {
  // The regression that shipped once: guarding only the non-TTY fallback let
  // `gh debt list` print its table and then open the UI on top of it. On a
  // terminal the UI is the output; off one, plain text is.
  it('launches nothing when a subcommand was dispatched (on a terminal)', async () => {
    assert.equal(await launchedCount(['list'], true), 0)
  })

  it('launches the UI when no subcommand was given (on a terminal)', async () => {
    assert.equal(await launchedCount([], true), 1)
  })

  it('launches nothing when a subcommand was dispatched (off a terminal)', async () => {
    assert.equal(await launchedCount(['list'], false), 0)
  })

  it('launches nothing when no subcommand was given either (off a terminal)', async () => {
    // Off a terminal the main command prints plain text instead of opening the UI.
    assert.equal(await launchedCount([], false), 0)
  })

  it('still reports --interactive as needing a terminal', async () => {
    process.argv = ['node', 'cli.mjs', '--interactive']
    process.stdin.isTTY = false
    process.stdout.isTTY = false
    const original = console.error
    const seen: string[] = []
    console.error = (...args: unknown[]) => seen.push(args.join(' '))
    try {
      await runInteractive({ limit: 30 } as never, true, () => {})
    } finally {
      console.error = original
    }
    assert.equal(seen.length, 2)
    assert.match(seen[0], /needs a terminal/)
  })

  it('isInteractiveTerminal reports the stubbed terminal', () => {
    process.stdin.isTTY = true
    process.stdout.isTTY = true
    assert.equal(isInteractiveTerminal(), true)
    process.stdout.isTTY = false
    assert.equal(isInteractiveTerminal(), false)
  })

  it('propagates a failed TUI launch to the caller', async () => {
    // A detached import rejects where citty cannot see it; awaiting the launcher
    // is what puts the failure in the command error handler's path.
    process.argv = ['node', 'cli.mjs']
    process.stdin.isTTY = true
    process.stdout.isTTY = true
    await assert.rejects(
      () => runInteractive({ limit: 30 } as never, false, () => Promise.reject(new Error('ink missing'))),
      /ink missing/,
    )
  })
})
