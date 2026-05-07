import { formatInstant } from '@/lib/dates'

interface AuthorLineProps {
  authorId: string | null
  authorName: string | null
  createdAt: string
}

export function AuthorLine({ authorId, authorName, createdAt }: AuthorLineProps) {
  const displayName = authorId === null ? 'Utilisateur supprimé' : (authorName ?? 'Utilisateur')

  return (
    <span className="author-line">
      <span className="author-line__name">{displayName}</span>
      <span>·</span>
      <span>{formatInstant(createdAt, 'medium')}</span>
    </span>
  )
}
