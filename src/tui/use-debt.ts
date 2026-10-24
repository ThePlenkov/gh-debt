import { useCallback, useEffect, useState } from 'react'
import { fetchAllDebtAsync, toDebtItem } from '../github.ts'
import type { DebtItem } from '../types.ts'

export interface DebtCounts {
  all: number
  prs: number
  issues: number
}

export interface DebtState {
  items: DebtItem[]
  counts: DebtCounts
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Fetch debt for the interactive UI.
 *
 * A single `all` query feeds every sidebar tab, so switching between
 * All/PRs/Issues is instant and the counts are consistent with the list.
 */
export function useDebt(limit: number, staleDays?: number, repo?: string): DebtState {
  const [items, setItems] = useState<DebtItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllDebtAsync({ limit, staleDays, repo })
      .then((raw) => {
        if (cancelled) return
        setItems(raw.map(toDebtItem))
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [limit, staleDays, repo, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const counts: DebtCounts = {
    all: items.length,
    prs: items.filter((i) => i.type === 'pr').length,
    issues: items.filter((i) => i.type === 'issue').length,
  }

  return { items, counts, loading, error, reload }
}
