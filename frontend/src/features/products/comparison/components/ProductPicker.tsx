import { COMPARISON_MAX_PRODUCTS } from '@habit-tracker/shared'

import { useEffect, useState } from 'react'

import { Button } from '@/component/Button'
import { Input } from '@/component/Input/Input'
import { api } from '@/lib/api'

type Suggestion = { id: string; name: string; brand: string }

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

// Parent passes raw IDs; we cache labels seen via search results so chips
// can render "Brand — Name" without an extra resolve roundtrip.
export function ProductPicker({ selectedIds, onChange }: Props) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const run = async () => {
      const res = await api.products.search.$get({ query: { q: debouncedQ } })
      if (!res.ok) return
      const json = await res.json()
      if (cancelled) return
      const items: Suggestion[] = json.data.items.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
      }))
      setSuggestions(items)
      setLabels((prev) => {
        let changed = false
        const next = { ...prev }
        for (const item of items) {
          const label = `${item.brand} — ${item.name}`
          if (next[item.id] !== label) {
            next[item.id] = label
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [debouncedQ])

  const atCap = selectedIds.length >= COMPARISON_MAX_PRODUCTS

  const add = (s: Suggestion) => {
    if (selectedIds.includes(s.id)) return
    if (atCap) return
    onChange([...selectedIds, s.id])
    setLabels((m) => ({ ...m, [s.id]: `${s.brand} — ${s.name}` }))
    setQ('')
    setSuggestions([])
  }

  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id))

  const filteredSuggestions = suggestions.filter((s) => !selectedIds.includes(s.id))

  return (
    <div>
      {selectedIds.length > 0 && (
        <div className="search-select__selected">
          {selectedIds.map((id) => (
            <button
              key={id}
              type="button"
              className="chip chip--sm chip--active chip--removable"
              onClick={() => remove(id)}
              aria-label={`Retirer ${labels[id] ?? id}`}
            >
              {labels[id] ?? id}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un produit"
        aria-label="Rechercher un produit"
        disabled={atCap}
      />
      {filteredSuggestions.length > 0 && (
        <ul>
          {filteredSuggestions.map((s) => (
            <li key={s.id}>
              <Button type="button" variant="ghost" onClick={() => add(s)}>
                {s.brand} — {s.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
