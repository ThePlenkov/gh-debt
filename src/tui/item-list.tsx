import React from 'react'
import { Box, Text } from 'ink'
import { palette, fit, truncate } from './theme.ts'
import type { DebtItem } from '../types.ts'

/** Columns before the title: type, repo, number, age. */
const LABEL_WIDTH = 5 + 22 + 8 + 5

interface ItemListProps {
  items: DebtItem[]
  cursor: number
  focused: boolean
  filter: string
  filtering: boolean
  loading: boolean
  error: string | null
  /** Total pane width, including borders and padding. */
  width: number
  /** Visible rows. */
  height: number
  marginLeft?: number
}

function rowLabel(item: DebtItem): string {
  const type = item.type === 'pr' ? 'PR' : 'ISSUE'
  return `${fit(type, 5)}${fit(item.repo, 22)}${fit(`#${item.number}`, 8)}${fit(item.age, 5)}`
}

/** Middle pane: the filterable list, windowed around the cursor. */
export function ItemList({
  items,
  cursor,
  focused,
  filter,
  filtering,
  loading,
  error,
  width,
  height,
  marginLeft = 0,
}: ItemListProps) {
  const borderColor = focused ? palette.focus : palette.border
  const rows = Math.max(1, height - 2)
  // Borders (2) + paddingX (2) come off the pane width; one leading space
  // separates the label from the title.
  const titleColumn = Math.max(8, width - LABEL_WIDTH - 6)

  // Keep the cursor inside the visible window.
  const start = Math.max(0, Math.min(cursor - Math.floor(rows / 2), Math.max(0, items.length - rows)))
  const visible = items.slice(start, start + rows)

  return (
    <Box
      width={width}
      marginLeft={marginLeft}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      flexDirection="column"
      flexShrink={0}
    >
      <Box>
        <Text bold color={focused ? palette.focus : palette.title}>
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
