import { useCallback, useMemo, useState } from 'react'

export type TagRelevance = 'primary' | 'secondary' | 'avoid'

export type TagState = {
  tagId: string
  tagName: string
  relevance: TagRelevance
}

interface UseFormTagsProps {
  initialTags: TagState[]
  allTags: Array<{ id: string; name: string; category?: string | null }> | undefined
}

export function useFormTags({ initialTags, allTags }: UseFormTagsProps) {
  const [tags, setTags] = useState<TagState[]>(initialTags)

  const addTag = useCallback(
    (tagId: string) => {
      const tag = allTags?.find((t) => t.id === tagId)
      if (tag && !tags.find((t) => t.tagId === tagId)) {
        setTags((prev) => [...prev, { tagId, tagName: tag.name, relevance: 'secondary' }])
      }
    },
    [allTags, tags]
  )

  const removeTag = useCallback((tagId: string) => {
    setTags((prev) => prev.filter((t) => t.tagId !== tagId))
  }, [])

  const updateRelevance = useCallback((tagId: string, relevance: TagRelevance) => {
    setTags((prev) => prev.map((t) => (t.tagId === tagId ? { ...t, relevance } : t)))
  }, [])

  // Only show tags that are not already selected
  const availableTags = useMemo(
    () => allTags?.filter((at) => !tags.find((t) => t.tagId === at.id)) ?? [],
    [allTags, tags]
  )

  // Create a key to compare tags by order, not by insertion order
  const getSortedTagsKey = useCallback((arr: TagState[]) => {
    return JSON.stringify(
      [...arr]
        .map((t) => ({ id: t.tagId, r: t.relevance }))
        .sort((a, b) => a.id.localeCompare(b.id))
    )
  }, [])

  const isTagsDirty = useMemo(() => {
    return getSortedTagsKey(tags) !== getSortedTagsKey(initialTags)
  }, [tags, initialTags, getSortedTagsKey])

  return {
    tags,
    setTags,
    addTag,
    removeTag,
    updateRelevance,
    availableTags,
    isTagsDirty,
  }
}
