import { spawn } from 'node:child_process'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import { render } from 'ink'
import { palette, truncate, type View } from './theme.ts'
import { matchesSource, sources, sourceLabel, type Source } from './source.ts'
import { useDebt } from './use-debt.ts'
import { Sources } from './sources.tsx'
import { ItemList } from './item-list.tsx'
import { Detail } from './detail.tsx'
import type { DebtItem } from '../types.ts'

export interface TuiOptions {
  /** Maximum items to fetch per query. The UI asks for more than the CLI. */
  limit?: number
  /** Only show items not updated in the last N days. */
  staleDays?: number
  /** Scope to one repository. */
  repo?: string
}

const TUI_LIMIT = 100

/** Keys shown in the footer, per level of the stack. */
const HINTS: Record<View, string> = {
  sources: '↑/↓ move · enter open · 1/2/3 jump · r refresh · q quit',
  list: '↑/↓ move · / filter · enter open · b browse · r refresh · esc back · q quit',
  detail: 'b browse · r refresh · esc back · q quit',
}

/** Open a URL with gh, which resolves the browser for the platform. */
function browse(url: string): void {
  const child = spawn('gh', ['browse', url], { stdio: 'ignore', detached: true })
  child.on('error', () => {
    /* opening a browser is best-effort */
  })
  child.unref()
}

function App({ limit = TUI_LIMIT, staleDays, repo }: TuiOptions) {
  const { exit } = useApp()
  const { columns, rows } = useWindowSize()

  // Navigation stack: sources → list → detail. Only one level is on screen.
  const [view, setView] = useState<View>('sources')
  const [source, setSource] = useState<Source>('all')
  const [sourceCursor, setSourceCursor] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [filter, setFilter] = useState('')
  const [filtering, setFiltering] = useState(false)

  const { items, counts, loading, error, reload } = useDebt(limit, staleDays, repo)

  const filtered = useMemo(() => {
    const bySource = items.filter((i) => matchesSource(i.type, source))
    const needle = filter.trim().toLowerCase()
    if (!needle) return bySource
    return bySource.filter((i) => `${i.repo} ${i.title}`.toLowerCase().includes(needle))
  }, [items, source, filter])

  // Keep the cursor inside the list as it shrinks and grows.
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  const selected: DebtItem | null = filtered[cursor] ?? null

  const openSource = useCallback((next: Source) => {
    setSource(next)
    setSourceCursor(sources.indexOf(next))
    setCursor(0)
    setFilter('')
    setView('list')
  }, [])

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit()
      return
    }

    // While filtering, every other key belongs to the input.
    if (filtering) {
      if (key.escape) {
        setFiltering(false)
        setFilter('')
        return
      }
      // Raw-mode terminals send \r for Enter, but \n shows up from some
      // terminals and from anything driving the process programmatically.
      if (key.return || input === '\r' || input === '\n') {
        setFiltering(false)
        return
      }
      if (key.backspace) {
        setFilter((f) => f.slice(0, -1))
        return
      }
      if (input && !key.ctrl && !key.meta && !key.tab) {
        setFilter((f) => (f + input).slice(0, 60))
        return
      }
      return
    }

    // Keys that work at every level.
    if (key.escape) {
      if (view === 'detail') setView('list')
      else if (view === 'list') setView('sources')
      return
    }
    if (input === 'r') {
      reload()
      return
    }
    if (input === 'b' && selected) {
      browse(selected.url)
      return
    }
    if (input === '1' || input === '2' || input === '3') {
      openSource(input === '1' ? 'all' : input === '2' ? 'prs' : 'issues')
      return
    }

    if (view === 'sources') {
      if (key.upArrow || input === 'k') {
        setSourceCursor((c) => Math.max(0, c - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setSourceCursor((c) => Math.min(sources.length - 1, c + 1))
        return
      }
      if (key.return || input === '\r' || input === '\n') {
        openSource(sources[sourceCursor] ?? 'all')
        return
      }
      return
    }

    if (view === 'list') {
      if (key.upArrow || input === 'k') {
        setCursor((c) => Math.max(0, c - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setCursor((c) => Math.min(filtered.length - 1, c + 1))
        return
      }
      if (input === 'g') {
        setCursor(0)
        return
      }
      if (input === 'G') {
        setCursor(Math.max(0, filtered.length - 1))
        return
      }
      if (input === '/') {
        setFiltering(true)
        return
      }
      if (key.return || input === '\r' || input === '\n') {
        if (selected) setView('detail')
        return
      }
      return
    }

    // detail: the global keys above already cover it.
  })

  // Full width for whichever level is on screen.
  const width = columns
  const listHeight = Math.max(6, rows - 8)
  const footerWidth = Math.max(20, width - 4)

  // Breadcrumb: where you are in the stack.
  const breadcrumb =
    view === 'sources'
      ? 'Sources'
      : view === 'list'
        ? `Sources › ${sourceLabel(source)}${loading ? '' : ` (${filtered.length}/${counts.all})`}`
        : `Sources › ${sourceLabel(source)} › ${selected ? `${selected.repo}#${selected.number}` : '…'}`

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="round" borderColor={palette.border} paddingX={1}>
        <Text bold color={palette.title}>gh-debt</Text>
        <Text color={palette.muted}>{"  "}</Text>
        <Text color={palette.focus}>{breadcrumb}</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={loading ? palette.issue : palette.live}>{loading ? '● loading' : '● live'}</Text>
        </Box>
      </Box>

      <Box flexGrow={1} marginTop={1}>
        {view === 'sources' && (
          <Sources counts={counts} loading={loading} cursor={sourceCursor} width={width} />
        )}
        {view === 'list' && (
          <ItemList
            items={filtered}
            cursor={cursor}
            filter={filter}
            filtering={filtering}
            loading={loading}
            error={error}
            width={width}
            height={listHeight}
          />
        )}
        {view === 'detail' && <Detail item={selected} width={width} />}
      </Box>

      <Box borderStyle="round" borderColor={palette.border} paddingX={1} marginTop={1}>
        <Text color={palette.muted} wrap="truncate">
          {' '}
          {truncate(HINTS[view], footerWidth)}
        </Text>
      </Box>
    </Box>
  )
}

/** Render the interactive UI. Called from the CLI's interactive branch. */
export function runTui(options: TuiOptions = {}): void {
  render(<App {...options} />, { patchConsole: false })
}
