import { ChevronDown } from 'lucide-react'

type Props = {
  onDismiss: () => void
}

export function DismissButton({ onDismiss }: Props) {
  return (
    <button
      type="button"
      className="search-select__dismiss"
      onMouseDown={(e) => {
        e.preventDefault()
        onDismiss()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onDismiss()
        }
      }}
      aria-label="Fermer la liste"
    >
      <ChevronDown size={14} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
    </button>
  )
}
