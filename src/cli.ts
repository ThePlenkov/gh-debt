#!/usr/bin/env node
/**
 * gh-debt — GitHub CLI extension for tracking technical debt.
 *
 * Shows PRs where you're requested as a reviewer, issues assigned to you,
 * and stale items across all your repos, prioritized by last-updated date.
 *
 * A subcommand (or piped output) prints plain text, so it stays scriptable.
 * With no subcommand on a terminal — or with -i — the interactive UI opens.
 */
import { readFile } from 'node:fs/promises'
import { defineCommand, runMain, type ArgsDef, type CommandDef } from 'citty'
import {
  parseCommon,
  runIssues,
  runList,
  runPrs,
  runStale,
  runStats,
  withErrors,
  type CommonArgs,
} from './commands.ts'
import { runInteractive } from './cli-helpers.ts'

type RawArgs = Record<string, unknown> & { interactive?: boolean }

/** Flags shared by the main command and every subcommand. */
function sharedArgs(): ArgsDef {
  return {
    limit: {
      type: 'string',
      description: 'Maximum items to fetch (default: 30)',
      default: '30',
      alias: ['l'],
    },
    stale: {
      type: 'string',
      description: 'Only show items not updated in the last N days',
      alias: ['s'],
    },
    repo: {
      type: 'string',
      description: 'Scope to a specific repository (OWNER/REPO)',
      alias: ['r'],
    },
    format: {
      type: 'string',
      description: 'Output format: table | json | md',
      default: 'table',
      alias: ['f'],
    },
    days: {
      type: 'string',
      description: 'Days for the stale filter (stale command, default: 7)',
      default: '7',
      alias: ['d'],
    },
  }
}

async function packageVersion(): Promise<string> {
  try {
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/** Wrap a plain-text command as a citty subcommand. */
function plain(name: string, description: string, run: (args: CommonArgs) => void) {
  return defineCommand({
    meta: { name, description },
    args: sharedArgs(),
    run({ args }) {
      process.exitCode = withErrors(() => run(parseCommon(args)))
    },
  })
}

const main = defineCommand({
  meta: {
    name: 'gh-debt',
    version: await packageVersion(),
    description:
      'Track GitHub technical debt — PRs awaiting your review, issues assigned to you, and stale items, prioritized by last-updated date.',
  },
  args: {
    ...sharedArgs(),
    interactive: {
      type: 'boolean',
      description: 'Open the interactive UI (implied on a terminal with no subcommand)',
      alias: ['i'],
    },
  },
  subCommands: {
    list: plain('list', 'Show all debt (PRs + issues)', runList),
    prs: plain('prs', 'Show PRs where you are requested as a reviewer', runPrs),
    issues: plain('issues', 'Show issues assigned to you', runIssues),
    stats: plain('stats', 'Show a summary breakdown by repository', runStats),
    stale: plain('stale', 'Show items not updated in N days (default: 7)', runStale),
  },
  async run({ args }) {
    await runInteractive(parseCommon(args), Boolean(args.interactive))
  },
})

runMain(main)
