import React from 'react'
import { Box, Text } from 'ink'
import { palette, fit } from './theme.ts'
import { sourceLabel, sources, type Source } from './source.ts'
import type { DebtCounts } from './use-debt.ts'

const COLORS: Record<Source, string> = {
  all: palette.title,
  prs: palette.pr,
  issues: palette.issue,
}

/** Width of the label column, so the counts line up. */
const LABEL = 10

/**
 * Level 1 of the stack: pick a source.
 *
 * Full width, and the only thing on screen — this is the navigation root.
 */
export function Sources({
  counts,
  loading,
  cursor,
  width,
}: {
  counts: DebtCounts
  loading: boolean
  cursor: number
  width: number
}) {
  const inner = Math.max(8, width - 4)

  return (
    <Box
      width={width}
      borderStyle="round"
      borderColor={palette.focus}
      paddingX={1}
      flexDirection="column"
    >
      <Text bold color={palette.focus}>
        {' '}
        Sources
      </Text>

      {sources.map((s, i) => {
        const active = i === cursor
        const count = s === 'prs' ? counts.prs : s === 'issues' ? counts.issues : counts.all
        const head = active ? `▶ ${sourceLabel(s)}` : `  ${sourceLabel(s)}`
        const tail = loading ? '…' : String(count)
        const pad = Math.max(1, inner - LABEL - tail.length)

        return (
          <Text key={s} color={active ? COLORS[s] : palette.muted} bold={active}>
            {fit(head, LABEL) + ' '.repeat(pad) + tail}
          </Text>
        )
      })}

      <Box marginTop={1}>
        <Text color={palette.muted}>{'─'.repeat(inner)}</Text>
      </Box>
      <Text color={palette.muted}>↑/↓ move · enter open · 1/2/3 jump · r refresh · q quit</Text>
    </Box>
  )
}

/** Label column, kept next to the component so the width maths stays together. */
export const sourceLabelWidth = LABEL
