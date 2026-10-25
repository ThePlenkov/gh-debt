/**
 * The one decision the CLI's entry point has to make twice: whether citty
 * already dispatched to a subcommand.
 *
 * citty runs the matched subcommand's `run` and then the main command's `run`,
 * so the main command's non-interactive fallback would print the same table a
 * second time. Extracted here so the decision is testable without running the
 * whole CLI.
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
 */
export async function runMainBranchOnce(
  common: CommonArgs,
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  if (isSubCommand(argv)) return 0
  process.exitCode = withErrors(() => runList(common))
  return process.exitCode
}
