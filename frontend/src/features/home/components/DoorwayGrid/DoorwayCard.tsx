import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

export type DoorwayItem = {
  id: string
  icon: React.ReactNode
  title: string
  line: string
  to: LinkProps['to']
  cta: string
}

export function DoorwayCard({ icon, title, line, to, cta }: Omit<DoorwayItem, 'id'>) {
  return (
    <Link to={to} className="aur-doorway">
      <span className="aur-doorway__icon">{icon}</span>
      <h3 className="aur-doorway__title">{title}</h3>
      <p className="aur-doorway__line">{line}</p>
      <span className="aur-doorway__cta">
        {cta}
        <ArrowUpRight size={15} aria-hidden="true" />
      </span>
    </Link>
  )
}
