import { Time } from '@/component/DataDisplay/Time/Time'

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
      <Time iso={createdAt} style="medium" />
    </span>
  )
}
