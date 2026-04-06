import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Textarea } from '@/component/Textarea/Textarea'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { useCreateReply } from '@/lib/queries/discussions'

interface ReplyFormProps {
  entityType: 'product' | 'ingredient'
  slug: string
  threadId: string
}

export function ReplyForm({ entityType, slug, threadId }: ReplyFormProps) {
  const [content, setContent] = useState('')
  const { mutate, isPending } = useCreateReply(entityType, slug, threadId)

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    if (!content.trim()) return
    mutate({ content: content.trim() }, { onSuccess: () => setContent('') })
  }

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      <SectionHeader title="Répondre" as="h3" />
      <Textarea
        label="Ta réponse"
        placeholder="Ta réponse..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        required
      />
      <Button type="submit" variant="primary" loading={isPending}>
        Répondre
      </Button>
    </form>
  )
}
