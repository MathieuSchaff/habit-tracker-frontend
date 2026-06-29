import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

export type DoorwayItem = {
  id: string
  icon: React.ReactNode
  title: string
  line: string
  to: LinkProps['to']
  search?: LinkProps['search']
  hash?: LinkProps['hash']
  cta: string
}

export function DoorwayCard({ icon, title, line, to, search, hash, cta }: Omit<DoorwayItem, 'id'>) {
  return (
    <Link to={to} search={search} hash={hash} className="aur-doorway">
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
