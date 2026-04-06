import clsx from 'clsx'
import { useId, useState } from 'react'

import './ChipGroup.css'

type ChipOption<T extends string> = {
  value: T
  label: string
}

type ChipGroupProps<T extends string> = {
  options: ChipOption<T>[]
  selected: T[]
  onChange: (selected: T[]) => void
  max?: number
  size?: 'sm' | 'md'
  mode?: 'toggle' | 'exclusive'
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  maxVisible?: number
  chipTabIndex?: number
  onChipKeyDown?: (e: React.KeyboardEvent) => void
}

export function ChipGroup<T extends string>({
  options,
  selected,
  onChange,
  max,
  size = 'md',
  mode = 'toggle',
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  maxVisible,
  chipTabIndex,
  onChipKeyDown,
}: ChipGroupProps<T>) {
  const groupId = useId()
  const [expanded, setExpanded] = useState(false)

  const handleClick = (value: T) => {
    if (mode === 'exclusive') {
      onChange([value])
      return
    }
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      if (max && selected.length >= max) return
      onChange([...selected, value])
    }
  }

  const limit = maxVisible ?? options.length
  const visibleOptions = expanded ? options : options.slice(0, limit)
  const hiddenCount = options.length - limit

  const isRadio = mode === 'exclusive'

  const chips = visibleOptions.map(({ value, label }) => {
    const isSelected = selected.includes(value)
    const isDisabled = disabled || (!isSelected && max != null && selected.length >= max)

    return isRadio ? (
      <label
        key={value}
        className={clsx(
          'chip',
          `chip--${size}`,
          isSelected && 'chip--active',
          isDisabled && 'chip--disabled'
        )}
      >
        <input
          type="radio"
          name={groupId}
          className="sr-only"
          checked={isSelected}
          disabled={isDisabled}
          onChange={() => handleClick(value)}
          tabIndex={chipTabIndex}
          onKeyDown={onChipKeyDown}
        />
        {label}
      </label>
    ) : (
      <button
        key={value}
        type="button"
        className={clsx('chip', `chip--${size}`, isSelected && 'chip--active')}
        onClick={() => handleClick(value)}
        aria-pressed={isSelected}
        disabled={isDisabled}
        tabIndex={chipTabIndex}
        onKeyDown={onChipKeyDown}
      >
        {label}
      </button>
    )
  })

  return (
    <fieldset
      className={clsx('chip-group', className)}
      role={isRadio ? 'radiogroup' : 'group'}
      aria-describedby={ariaDescribedBy}
    >
      {ariaLabel && <legend className="sr-only">{ariaLabel}</legend>}
      {chips}
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          className={clsx('chip', `chip--${size}`, 'chip--more')}
          onClick={() => setExpanded(true)}
          tabIndex={chipTabIndex}
          aria-label={`Voir les ${options.length} options`}
        >
          Voir tout ({options.length})
        </button>
      )}
    </fieldset>
  )
}
