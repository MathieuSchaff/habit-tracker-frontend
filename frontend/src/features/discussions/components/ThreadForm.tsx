import '../discussions.css'

import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { useCreateThread } from '@/lib/queries/discussions'

interface ThreadFormProps {
  entityType: 'product' | 'ingredient'
  slug: string
}

export function ThreadForm({ entityType, slug }: ThreadFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useCreateThread(entityType, slug)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    mutate(
      { title: title.trim(), content: content.trim() },
      {
        onSuccess: () => {
          setTitle('')
          setContent('')
          setOpen(false)
        },
      }
    )
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Ouvrir une discussion
      </Button>
    )
  }

  return (
    <form className="thread-form" onSubmit={handleSubmit}>
      <p className="thread-form__title">Nouvelle discussion</p>
      <input
        className="input"
        placeholder="Sujet (ex: Ce produit m'a fait des boutons)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        required
      />
      <textarea
        className="textarea"
        placeholder="Décris ton expérience..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
      />
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Envoi...' : 'Publier'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
