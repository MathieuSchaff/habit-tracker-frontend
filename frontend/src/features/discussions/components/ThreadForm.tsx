import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Input } from '@/component/Input/Input'
import { Textarea } from '@/component/Textarea/Textarea'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
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

  function handleSubmit(e: React.SubmitEvent) {
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
      <SectionHeader title="Nouvelle discussion" as="h3" />
      <Input
        label="Sujet"
        placeholder="Sujet (ex: Ce produit m'a fait des boutons)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        required
      />
      <Textarea
        label="Ton expérience"
        placeholder="Décris ton expérience..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
      />
      <FormActions onCancel={() => setOpen(false)} submitLabel="Publier" isPending={isPending} />
    </form>
  )
}
