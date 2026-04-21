import { useEffect, useState } from 'react'

import { Input } from '@/component/Input/Input'

import './PriceRangeFilter.css'

type Props = {
  min?: number
  max?: number
  onChange: (next: { min?: number; max?: number }) => void
}

// Internal state holds euro strings so the user can clear the input;
// we only commit (in cents) when the field loses focus.
function centsToEuros(v?: number): string {
  return v === undefined ? '' : String(Math.round(v / 100))
}

function eurosToCents(v: string): number | undefined {
  const trimmed = v.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(n * 100)
}

export function PriceRangeFilter({ min, max, onChange }: Props) {
  const [minInput, setMinInput] = useState(centsToEuros(min))
  const [maxInput, setMaxInput] = useState(centsToEuros(max))

  // Keep local inputs in sync when URL-driven values change from outside
  // (e.g. reset button, external navigation).
  useEffect(() => {
    setMinInput(centsToEuros(min))
  }, [min])
  useEffect(() => {
    setMaxInput(centsToEuros(max))
  }, [max])

  const commit = () => {
    const nextMin = eurosToCents(minInput)
    const nextMax = eurosToCents(maxInput)
    if (nextMin !== min || nextMax !== max) {
      onChange({ min: nextMin, max: nextMax })
    }
  }

  return (
    <fieldset className="price-range">
      <legend className="price-range__legend">Prix (€)</legend>
      <div className="price-range__fields">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="Min"
          aria-label="Prix minimum en euros"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
        />
        <span className="price-range__separator" aria-hidden="true">
          —
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="Max"
          aria-label="Prix maximum en euros"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
        />
      </div>
    </fieldset>
  )
}
