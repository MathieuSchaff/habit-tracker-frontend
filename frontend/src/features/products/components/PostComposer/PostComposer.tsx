import { POST_TONES, type PostTone } from '@aurore/shared'

import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { POST_TONE_LABELS } from '@/constants/skin'
import { useAnnounce } from '@/hooks/useAnnounce'
import { useCreatePost } from '@/lib/queries/social'

import './PostComposer.css'

const TONE_OPTIONS = POST_TONES.map((value) => ({ value, label: POST_TONE_LABELS[value] }))

// Product is the implicit anchor here, so the composer can stay compact.
// Tone is an exclusive facet, not a free-text category.
export function PostComposer({ productId, slug }: { productId: string; slug: string }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [tone, setTone] = useState<PostTone>('principal')
  const { mutate, isPending } = useCreatePost(productId, slug)
  const announce = useAnnounce()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    mutate(
      { content: content.trim(), tone },
      {
        onSuccess: () => {
          setContent('')
          setTone('principal')
          setOpen(false)
          announce('Publication publiée')
        },
      }
    )
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Ouvrir une publication
      </Button>
    )
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      <SectionHeader title="Nouvelle publication" as="h3" />
      <ChipGroup
        mode="exclusive"
        options={TONE_OPTIONS}
        selected={[tone]}
        onChange={([v]) => v && setTone(v)}
        aria-label="Ton de la publication"
      />
      <Textarea
        label="Votre expérience"
        placeholder="Partagez votre expérience…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
      />
      <FormActions
        onCancel={() => setOpen(false)}
        submitLabel="Publier"
        isPending={isPending}
        disabled={!content.trim()}
      />
    </form>
  )
}
