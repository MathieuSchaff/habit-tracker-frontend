import '../discussions.css'

import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { useCreateReply } from '@/lib/queries/discussions'

interface ReplyFormProps {
  entityType: 'product' | 'ingredient'
  slug: string
  threadId: string
}

export function ReplyForm({ entityType, slug, threadId }: ReplyFormProps) {
  const [content, setContent] = useState('')
  const { mutate, isPending } = useCreateReply(entityType, slug, threadId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    mutate({ content: content.trim() }, { onSuccess: () => setContent('') })
  }

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      <p className="reply-form__title">Répondre</p>
      <textarea
        className="textarea"
        placeholder="Ta réponse..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        required
      />
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? 'Envoi...' : 'Répondre'}
      </Button>
    </form>
  )
}
