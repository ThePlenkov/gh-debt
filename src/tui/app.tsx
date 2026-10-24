import { spawn } from 'node:child_process'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import { render } from 'ink'
import { nextPane, prevPane, palette, truncate } from './theme.ts'
import { matchesSource, nextSource, prevSource, sourceLabel, type Source } from './source.ts'
import { useDebt } from './use-debt.ts'
import { ItemList } from './item-list.tsx'
import { Sidebar } from './sidebar.tsx'
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

/** Keys shown in the footer, in order. */
const HINTS: Array<[string, string]> = [
  ['1/2/3', 'source'],
  ['←/→', 'cycle'],
  ['↑/↓', 'move'],
  ['tab', 'pane'],
  ['/', 'filter'],
  ['↵', 'expand'],
  ['b', 'browse'],
  ['r', 'refresh'],
  ['q', 'quit'],
]

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

  const [source, setSource] = useState<Source>('all')
  const [cursor, setCursor] = useState(0)
  const [filter, setFilter] = useState('')
  const [filtering, setFiltering] = useState(false)
  const [focus, setFocus] = useState<'sources' | 'items' | 'detail'>('items')
  const [expanded, setExpanded] = useState(false)

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

  const changeSource = useCallback((next: Source) => {
    setSource(next)
    setCursor(0)
    setFilter('')
    setExpanded(false)
    setFocus('items')
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

    if (key.tab) {
      setFocus(key.shift ? prevPane(focus) : nextPane(focus))
      return
    }
    if (key.upArrow || input === 'k') {
      setFocus('items')
      setCursor((c) => Math.max(0, c - 1))
      return
    }
    if (key.downArrow || input === 'j') {
      setFocus('items')
      setCursor((c) => Math.min(filtered.length - 1, c + 1))
      return
    }
    if (key.leftArrow || input === 'h') {
      changeSource(prevSource(source))
      return
    }
    if (key.rightArrow || input === 'l') {
      changeSource(nextSource(source))
      return
    }
    if (input === '/') {
      setFocus('items')
      setFiltering(true)
      return
    }
    if (key.return || input === '\r' || input === '\n') {
      setFocus('detail')
      setExpanded((v) => !v)
      return
    }
    if (key.escape) {
      setExpanded(false)
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
      changeSource(input === '1' ? 'all' : input === '2' ? 'prs' : 'issues')
    }
  })

  // Pane widths. Each ink box carries 2 border chars and 2 paddingX, and the
  // two right-hand panes each add a 1-column margin.
  const sidebarWidth = Math.max(18, Math.min(22, Math.round(columns * 0.16)))
  const detailWidth = expanded
    ? Math.max(34, columns - sidebarWidth - 28)
    : Math.max(28, Math.min(34, Math.round(columns * 0.25)))
  const itemWidth = Math.max(28, columns - sidebarWidth - detailWidth - 2)
  const listHeight = Math.max(6, rows - 8)

  const hintText = HINTS.map(([k, label]) => `${k} ${label}`).join('  ·  ')
  const footerWidth = Math.max(20, columns - 4)

  return (
    <Box flexDirection="column" height="100%">
      <Box
        borderStyle="round"
        borderColor={focus === 'sources' ? palette.focus : palette.border}
        paddingX={1}
      >
        <Text bold color={palette.title}>gh-debt</Text>
        <Text color={palette.muted}>{"  "}</Text>
        <Text color={loading ? palette.issue : palette.live}>{loading ? '● loading' : '● live'}</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={palette.muted}>
            {sourceLabel(source)} {loading ? '' : `${filtered.length}/${counts.all}`}
            {repo ? `  repo:${repo}` : ''}
            {staleDays ? `  stale>${staleDays}d` : ''}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="row" flexGrow={1} marginTop={1}>
        <Sidebar
          source={source}
          counts={counts}
          loading={loading}
          focused={focus === 'sources'}
          width={sidebarWidth}
        />
        <ItemList
          items={filtered}
          cursor={cursor}
          focused={focus === 'items'}
          filter={filter}
          filtering={filtering}
          loading={loading}
          error={error}
          width={itemWidth}
          height={listHeight}
          marginLeft={1}
        />
        <Detail item={selected} focused={focus === 'detail'} width={detailWidth} marginLeft={1} />
      </Box>

      <Box borderStyle="round" borderColor={palette.border} paddingX={1} marginTop={1}>
        <Text color={palette.muted} wrap="truncate">
          {' '}
          {truncate(hintText, footerWidth)}
        </Text>
      </Box>
    </Box>
  )
}

/** Render the interactive UI. Called from the CLI's interactive branch. */
export function runTui(options: TuiOptions = {}): void {
  render(<App {...options} />, { patchConsole: false })
}
