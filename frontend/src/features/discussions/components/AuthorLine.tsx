interface AuthorLineProps {
  authorId: string | null
  authorName: string | null
  createdAt: string | Date
}

export function AuthorLine({ authorId, authorName, createdAt }: AuthorLineProps) {
  const displayName = authorId === null ? 'Utilisateur supprimé' : (authorName ?? 'Utilisateur')
  const date = new Date(createdAt)
  const formatted = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <span className="author-line">
      <span className="author-line__name">{displayName}</span>
      <span>·</span>
      <span>{formatted}</span>
    </span>
  )
}
