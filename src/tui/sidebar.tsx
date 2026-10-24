import React from 'react'
import { Box, Text } from 'ink'
import { palette, fit } from './theme.ts'
import { sourceLabel, type Source } from './source.ts'
import type { DebtCounts } from './use-debt.ts'

interface SidebarProps {
  source: Source
  counts: DebtCounts
  loading: boolean
  focused: boolean
  width: number
}

function Row({
  active,
  label,
  count,
  loading,
  color,
  width,
}: {
  active: boolean
  label: string
  count: number
  loading: boolean
  color: string
  width: number
}) {
  const head = active ? `▶ ${label}` : `  ${label}`
  const tail = loading ? '…' : String(count)
  const pad = Math.max(1, width - head.length - tail.length)

  return (
    <Text color={active ? color : palette.muted} bold={active}>
      {head + ' '.repeat(pad) + tail}
    </Text>
  )
}

/** Left pane: the debt sources, with counts. */
export function Sidebar({ source, counts, loading, focused, width }: SidebarProps) {
  const borderColor = focused ? palette.focus : palette.border
  const inner = Math.max(8, width - 4) // two border chars, two paddingX
  const activeCount = source === 'prs' ? counts.prs : source === 'issues' ? counts.issues : counts.all

  return (
    <Box
      width={width}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      flexDirection="column"
      flexShrink={0}
    >
      <Text bold color={focused ? palette.focus : palette.title}>
        {' '}
        {fit('Sources', inner)}
      </Text>
      <Row
        active={source === 'all'}
        label="All"
        count={counts.all}
        loading={loading}
        color={palette.title}
        width={inner}
      />
      <Row
        active={source === 'prs'}
        label="PRs"
        count={counts.prs}
        loading={loading}
        color={palette.pr}
        width={inner}
      />
      <Row
        active={source === 'issues'}
        label="Issues"
        count={counts.issues}
        loading={loading}
        color={palette.issue}
        width={inner}
      />
      <Box marginTop={1}>
        <Text color={palette.muted}>{'·'.repeat(Math.min(inner, 40))}</Text>
      </Box>
      <Text color={palette.muted}>
        {` ${sourceLabel(source)}: ${loading ? 'loading' : `${activeCount} items`}`}
      </Text>
      <Text color={palette.muted}> 1/2/3 jump</Text>
      <Text color={palette.muted}> ←/→ cycle</Text>
      <Text color={palette.muted}> b browse</Text>
    </Box>
  )
}
