import React from 'react'
import { Box, Text } from 'ink'
import { palette, fit, truncate } from './theme.ts'
import type { DebtItem } from '../types.ts'

interface DetailProps {
  item: DebtItem | null
  focused: boolean
  width: number
  marginLeft?: number
}

function Field({
  label,
  value,
  color,
  inner,
}: {
  label: string
  value: string
  color?: string
  inner: number
}) {
  return (
    <Box>
      <Text color={palette.muted}>{`  ${fit(label, 9)}`}</Text>
      <Text color={color ?? palette.title}>{truncate(value, Math.max(8, inner - 11))}</Text>
    </Box>
  )
}

/** Right pane: the selected item, drilled down. */
export function Detail({ item, focused, width, marginLeft = 0 }: DetailProps) {
  const borderColor = focused ? palette.focus : palette.border
  const inner = Math.max(12, width - 4)

  const frame = (
    <Box
      width={width}
      marginLeft={marginLeft}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      flexDirection="column"
      flexShrink={0}
    >
      <Text bold color={focused ? palette.focus : palette.title}>
        {' '}Detail
      </Text>
      {!item && <Text color={palette.muted}>select an item ↑/↓</Text>}

      {item && (
        <>
          <Text bold color={item.type === 'pr' ? palette.pr : palette.issue}>
            {` ${item.repo}#${item.number}`}
          </Text>
          <Text bold color={palette.title} wrap="wrap">
            {' '}
            {truncate(item.title, inner * 2)}
          </Text>

          <Box marginTop={1} flexDirection="column">
            <Field label="type" value={item.type.toUpperCase()} color={item.type === 'pr' ? palette.pr : palette.issue} inner={inner} />
            <Field label="state" value={item.state} inner={inner} />
            <Field label="age" value={item.age} inner={inner} />
            <Field label="author" value={item.author ?? '—'} inner={inner} />
            <Field label="updated" value={item.updatedAt} inner={inner} />
            <Field label="created" value={item.createdAt} inner={inner} />
            <Field label="labels" value={item.labels.length ? item.labels.join(', ') : '—'} inner={inner} />
          </Box>

          <Box marginTop={1}>
            <Text color={palette.muted} wrap="truncate">
              {' '}
              {truncate(item.url, inner * 2)}
            </Text>
          </Box>

          <Box marginTop={1}>
            <Text color={palette.muted}>b browse · esc back</Text>
          </Box>
        </>
      )}
    </Box>
  )

  return frame
}
