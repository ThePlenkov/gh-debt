/**
 * The decisions the CLI's entry point has to make twice: whether citty
 * already dispatched to a subcommand, and what the main command does when it
 * did not.
 *
 * citty runs the matched subcommand's `run` and then the main command's `run`,
 * so the main command must do nothing when a subcommand was dispatched. That
 * holds on a terminal too: guarding only the non-TTY fallback let
 * `gh debt list` print its table and then open the UI on top of it. Both
 * branches are guarded, and both are covered by tests.
 */
import { runList, withErrors, type CommonArgs } from './commands.ts'

/** Subcommand names, in the order they appear in the command's `subCommands`. */
export const subCommandNames = ['list', 'prs', 'issues', 'stats', 'stale']

/** Flags that take a value, so the next argv word is a value, not a command. */
const valueFlags = new Set([
  '--limit',
  '-l',
  '--stale',
  '-s',
  '--repo',
  '-r',
  '--format',
  '-f',
  '--days',
  '-d',
])

/**
 * True when one of the subcommands is the first positional word in argv — the
 * same position citty dispatches from. A subcommand-looking word that follows a
 * value flag (`--repo list`) is a value, not a dispatch.
 */
export function isSubCommand(argv: string[] = process.argv.slice(2)): boolean {
  let skipNext = false
  for (const arg of argv) {
    if (skipNext) {
      skipNext = false
      continue
    }
    if (arg === '--') return false
    if (arg.startsWith('-')) {
      // `--repo=list` carries its value inline and does not consume the next word.
      skipNext = !arg.includes('=') && valueFlags.has(arg)
      continue
    }
    return subCommandNames.includes(arg)
  }
  return false
}

/**
 * The main command's non-interactive branch: skip when a subcommand already
 * rendered, otherwise print the plain list.
 *
 * `fallback` is injectable so the decision can be tested without reaching
 * GitHub — the default shells out to `gh`, which needs credentials.
 */
export function runMainBranchOnce(
  common: CommonArgs,
  argv: string[] = process.argv.slice(2),
  fallback: () => void = () => {
    process.exitCode = withErrors(() => runList(common))
  },
): void {
  if (isSubCommand(argv)) return
  fallback()
}

/** True when stdin and stdout are both terminals. */
export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY)
}

/**
 * The main command's `run`. A subcommand owns the output, so it returns
 * immediately; otherwise it prints plain text off a terminal, or opens the UI.
 *
 * `launchTui` is injectable so the dispatch can be tested without rendering:
 * the default imports the Ink app, which needs React. It is awaited, so a
 * failed import reaches citty's error handler instead of rejecting detached.
 */
export async function runInteractive(
  common: CommonArgs,
  explicit: boolean,
  launchTui: () => void | Promise<void> = () =>
    import('./tui/app.tsx').then(({ runTui }) => {
      // The UI feeds every sidebar tab from one fetch, so it asks for more
      // items than a single plain command would.
      runTui({
        limit: Math.max(common.limit, 100),
        staleDays: common.staleDays,
        repo: common.repo,
      })
    }),
): Promise<void> {
  if (isSubCommand()) return

  if (!isInteractiveTerminal()) {
    if (explicit) {
      console.error('❌ --interactive needs a terminal: stdin and stdout must both be TTYs.')
      console.error('   Run a subcommand instead, e.g. `gh debt list`.')
      process.exitCode = 1
      return
    }
    runMainBranchOnce(common)
    return
  }

  await launchTui()
}
