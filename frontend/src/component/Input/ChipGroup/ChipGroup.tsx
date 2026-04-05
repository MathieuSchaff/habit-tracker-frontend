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
  'aria-label'?: string
  'aria-describedby'?: string
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

  const isRadio = mode === 'exclusive'

  const chips = options.map(({ value, label }) => {
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
          className="sr-only"
          checked={isSelected}
          disabled={isDisabled}
          onChange={() => handleClick(value)}
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
    </fieldset>
  )
}
