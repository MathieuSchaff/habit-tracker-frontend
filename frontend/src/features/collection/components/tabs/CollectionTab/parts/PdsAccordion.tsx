import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'

import './PdsAccordion.css'

interface PdsAccordionProps {
  icon: ReactNode
  title: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  accent?: boolean
  children: ReactNode
}

export function PdsAccordion({
  icon,
  title,
  badge,
  defaultOpen = false,
  accent = false,
  children,
}: PdsAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  return (
    <section className={clsx('pds-acc', open && 'is-open', accent && 'is-accent')}>
      <button
        type="button"
        className="pds-acc-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pds-acc-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="pds-acc-title">{title}</span>
        {badge ? <span className="pds-acc-badge">{badge}</span> : null}
        <ChevronDown size={14} className="pds-acc-chev" aria-hidden="true" />
      </button>
      <div id={bodyId} className="pds-acc-body" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
