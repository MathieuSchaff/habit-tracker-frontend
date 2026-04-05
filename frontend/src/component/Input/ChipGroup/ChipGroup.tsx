import clsx from 'clsx'

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
}: ChipGroupProps<T>) {
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

  return (
    <div className={clsx('chip-group', className)}>
      {options.map(({ value, label }) => {
        const isSelected = selected.includes(value)
        const isDisabled = disabled || (!isSelected && max != null && selected.length >= max)

        return (
          <button
            key={value}
            type="button"
            className={clsx('chip', `chip--${size}`, isSelected && 'chip--active')}
            onClick={() => handleClick(value)}
            aria-pressed={isSelected}
            disabled={isDisabled}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
