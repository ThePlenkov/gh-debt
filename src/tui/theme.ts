/**
 * Palette and shared presentation helpers for the interactive UI.
 * Hex values are used deliberately — they survive terminal colour schemes
 * better than the 16 ANSI names.
 */
export const palette = {
  /** Border of the pane that currently has focus. */
  focus: '#4cc9f0',
  /** Border of panes that do not. */
  border: '#3b3b4f',
  /** Background of the highlighted list row. */
  selection: '#1f3b4d',
  /** PR rows. */
  pr: '#3fb950',
  /** Issue rows. */
  issue: '#d29922',
  /** Secondary text: ages, counts, key hints. */
  muted: '#8b949e',
  /** Item titles. */
  title: '#e6edf3',
  /** Errors. */
  danger: '#f85149',
  /** Live/online indicator. */
  live: '#3fb950',
} as const

/**
 * The three levels of the navigation stack.
 *
 * The UI is navigation, not a three-pane split: each level takes the full
 * width and you drill down and back out of it. A side-by-side layout leaves
 * the middle column too narrow to hold a repo and a title at once.
 */
export type View = 'sources' | 'list' | 'detail'

export const viewOrder: View[] = ['sources', 'list', 'detail']

export function nextView(view: View): View {
  const i = viewOrder.indexOf(view)
  return viewOrder[Math.min(viewOrder.length - 1, i + 1)]
}

export function prevView(view: View): View {
  const i = viewOrder.indexOf(view)
  return viewOrder[Math.max(0, i - 1)]
}

/** Truncate from the left, keeping the end of the string. */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  if (max <= 1) return '…'
  return '…' + str.slice(-(max - 1))
}

/** Pad or truncate to an exact width so columns line up. */
export function fit(str: string, width: number): string {
  if (str.length > width) return truncate(str, width)
  return str.padEnd(width)
}
