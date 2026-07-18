import clsx from 'clsx'
import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/component/Button/Button'
import { CardTitle } from '@/component/Typography/CardTitle/CardTitle'
import { Overline } from '@/component/Typography/Overline/Overline'
import './SectionCard.css'

type SectionCardProps = {
  overline: string
  title: string
  titleId: string
  children: ReactNode
  className?: string
  isEditing?: boolean
  onEdit?: () => void
  editLabel?: string
}

type SectionCardEmptyProps = {
  title: string
  children: ReactNode
  className?: string
}

export function SectionCardEmpty({ title, children, className }: SectionCardEmptyProps) {
  return (
    <div className={clsx('section-card-empty', className)}>
      <p className="section-card-empty__title">{title}</p>
      <p className="section-card-empty__text">{children}</p>
    </div>
  )
}

export function SectionCard({
  overline,
  title,
  titleId,
  children,
  className,
  isEditing = false,
  onEdit,
  editLabel,
}: SectionCardProps) {
  return (
    <section className={clsx('section-card', className)} aria-labelledby={titleId}>
      <header className="section-card__header">
        <div className="section-card__heading">
          <Overline decorative>{overline}</Overline>
          <CardTitle id={titleId}>{title}</CardTitle>
        </div>
        {!isEditing && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={editLabel}
            className="section-card__edit"
          >
            <Pencil size={16} aria-hidden="true" />
          </Button>
        )}
      </header>
      {children}
    </section>
  )
}
