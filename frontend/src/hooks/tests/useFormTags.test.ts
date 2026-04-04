import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type TagState, useFormTags } from '../useFormTags'

const ALL_TAGS = [
  { id: 't1', name: 'Hydratant', category: 'type' },
  { id: 't2', name: 'Anti-âge', category: 'type' },
  { id: 't3', name: 'Apaisant', category: 'type' },
]

const INITIAL_TAGS: TagState[] = [{ tagId: 't1', tagName: 'Hydratant', relevance: 'primary' }]

describe('useFormTags', () => {
  it('initializes with the provided tags', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    expect(result.current.tags).toEqual(INITIAL_TAGS)
    expect(result.current.isTagsDirty).toBe(false)
  })

  it('adds a tag with default "secondary" relevance', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    act(() => result.current.addTag('t2'))

    expect(result.current.tags).toHaveLength(2)
    expect(result.current.tags[1]).toEqual({
      tagId: 't2',
      tagName: 'Anti-âge',
      relevance: 'secondary',
    })
    expect(result.current.isTagsDirty).toBe(true)
  })

  it('does not add a duplicate tag', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    act(() => result.current.addTag('t1'))

    expect(result.current.tags).toHaveLength(1)
  })

  it('does not add a tag that is not in allTags', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    act(() => result.current.addTag('unknown'))

    expect(result.current.tags).toHaveLength(1)
  })

  it('removes a tag', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    act(() => result.current.removeTag('t1'))

    expect(result.current.tags).toHaveLength(0)
    expect(result.current.isTagsDirty).toBe(true)
  })

  it('updates the relevance of a tag', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    act(() => result.current.updateRelevance('t1', 'avoid'))

    expect(result.current.tags[0].relevance).toBe('avoid')
    expect(result.current.isTagsDirty).toBe(true)
  })

  it('computes availableTags by excluding already selected ones', () => {
    const { result } = renderHook(() =>
      useFormTags({ initialTags: INITIAL_TAGS, allTags: ALL_TAGS })
    )

    // t1 is already selected
    expect(result.current.availableTags).toEqual([
      { id: 't2', name: 'Anti-âge', category: 'type' },
      { id: 't3', name: 'Apaisant', category: 'type' },
    ])

    act(() => result.current.addTag('t2'))

    expect(result.current.availableTags).toEqual([{ id: 't3', name: 'Apaisant', category: 'type' }])
  })

  it('isTagsDirty is order-independent', () => {
    const initial: TagState[] = [
      { tagId: 't1', tagName: 'Hydratant', relevance: 'primary' },
      { tagId: 't2', tagName: 'Anti-âge', relevance: 'secondary' },
    ]
    const { result } = renderHook(() => useFormTags({ initialTags: initial, allTags: ALL_TAGS }))

    // Reverse the order by removing and re-adding
    act(() => {
      result.current.setTags([
        { tagId: 't2', tagName: 'Anti-âge', relevance: 'secondary' },
        { tagId: 't1', tagName: 'Hydratant', relevance: 'primary' },
      ])
    })

    // Same content, different order — should NOT be dirty
    expect(result.current.isTagsDirty).toBe(false)
  })

  it('handles undefined allTags gracefully', () => {
    const { result } = renderHook(() => useFormTags({ initialTags: [], allTags: undefined }))

    expect(result.current.availableTags).toEqual([])

    act(() => result.current.addTag('t1'))
    expect(result.current.tags).toHaveLength(0)
  })
})
