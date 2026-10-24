import React from 'react'
import { Box, Text } from 'ink'
import { palette, fit, truncate } from './theme.ts'
import type { DebtItem } from '../types.ts'

/** Columns before the title: type, repo, number, age. */
const LABEL_WIDTH = 6 + 30 + 8 + 5

interface ItemListProps {
  items: DebtItem[]
  cursor: number
  filter: string
  filtering: boolean
  loading: boolean
  error: string | null
  /** Full width, including borders and padding. */
  width: number
  /** Total height, including borders. */
  height: number
}

function rowLabel(item: DebtItem): string {
  const type = item.type === 'pr' ? 'PR' : 'ISSUE'
  return `${fit(type, 6)}${fit(item.repo, 30)}${fit(`#${item.number}`, 8)}${fit(item.age, 5)}`
}

/**
 * Level 2 of the stack: the items of the current source.
 *
 * Full width — the title column is what made the three-pane layout unusable.
 */
export function ItemList({
  items,
  cursor,
  filter,
  filtering,
  loading,
  error,
  width,
  height,
}: ItemListProps) {
  const rows = Math.max(1, height - 2)
  // Borders (2) + paddingX (2) + the leading space before the title.
  const titleColumn = Math.max(8, width - LABEL_WIDTH - 5)

  // Keep the cursor inside the visible window.
  const start = Math.max(0, Math.min(cursor - Math.floor(rows / 2), Math.max(0, items.length - rows)))
  const visible = items.slice(start, start + rows)

  return (
    <Box
      width={width}
      borderStyle="round"
      borderColor={palette.focus}
      paddingX={1}
      flexDirection="column"
    >
      <Box>
        <Text bold color={palette.focus}>
          {' '}Items
        </Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={filtering ? palette.focus : palette.muted}>
            {filtering ? `filter: ${filter}▏` : filter ? `filter: ${filter}` : '/ to filter'}
          </Text>
        </Box>
      </Box>

      {loading && <Text color={palette.muted}>  loading…</Text>}
      {error && (
        <Text color={palette.danger} wrap="truncate">
          {' '}
          {truncate(error, titleColumn)}
        </Text>
      )}
      {!loading && !error && items.length === 0 && <Text color={palette.muted}>  nothing here</Text>}

      {visible.map((item, i) => {
        const index = start + i
        const selected = index === cursor
        return (
          <Box key={`${item.repo}#${item.number}`} backgroundColor={selected ? palette.selection : undefined}>
            <Text color={item.type === 'pr' ? palette.pr : palette.issue} wrap="truncate">
              {' '}
              {rowLabel(item)}
            </Text>
            <Text color={selected ? palette.title : palette.muted} wrap="truncate">
              {truncate(item.title, titleColumn)}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
