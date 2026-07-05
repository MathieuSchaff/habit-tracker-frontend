import type { RefObject } from 'react'

type ComboboxTextInputProps = {
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  placeholder?: string
  label: string
  ariaLabelledBy?: string
  listboxId: string
  activeIndex: number
  /** aria-expanded/controls gate: isOpen (sync) vs showDropdown (async, network-aware). */
  expanded: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

// Shared text input of both Filter comboboxes; all divergence lives in the props.
export function ComboboxTextInput({
  inputRef,
  value,
  placeholder,
  label,
  ariaLabelledBy,
  listboxId,
  activeIndex,
  expanded,
  onChange,
  onFocus,
  onKeyDown,
}: ComboboxTextInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      className="search-select__input"
      placeholder={placeholder ?? 'Rechercher...'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={expanded}
      aria-controls={expanded ? listboxId : undefined}
      aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
      aria-label={ariaLabelledBy ? undefined : label}
      aria-labelledby={ariaLabelledBy}
    />
  )
}
