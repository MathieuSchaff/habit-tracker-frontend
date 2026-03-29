import { Trash2 } from 'lucide-react'

import type { TagState } from '@/hooks/useFormTags'
import './TagManager.css'

type TagManagerProps = {
  tags: TagState[]
  availableTags: { id: string; name: string; category?: string | null }[]
  onAddTag: (tagId: string) => void
  onRemoveTag: (tagId: string) => void
  onUpdateRelevance: (tagId: string, relevance: 'primary' | 'secondary' | 'avoid') => void
  // Optional custom class for the root element
  className?: string
}

export function TagManager({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onUpdateRelevance,
  className = '',
}: TagManagerProps) {
  return (
    <div className={`tag-manager ${className}`}>
      {/* List of active tags */}
      <div className="tag-manager__list">
        {tags.map((tag) => (
          <div key={tag.tagId} className={`tag-item tag-item--${tag.relevance}`}>
            <span className="tag-item__name">{tag.tagName}</span>
            <select
              value={tag.relevance}
              className="tag-item__relevance"
              aria-label={`Relevance for tag ${tag.tagName}`}
              onChange={(e) =>
                onUpdateRelevance(tag.tagId, e.target.value as 'primary' | 'secondary' | 'avoid')
              }
            >
              <option value="primary">Principal</option>
              <option value="secondary">Secondaire</option>
              <option value="avoid">À éviter</option>
            </select>
            <button
              type="button"
              className="tag-item__remove"
              aria-label={`Remove tag ${tag.tagName}`}
              onClick={() => onRemoveTag(tag.tagId)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Add tag dropdown */}
      <div className="tag-manager__add">
        <select
          className="tag-manager__select"
          aria-label="Add a tag"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onAddTag(e.target.value)
              e.target.value = '' // Reset dropdown after selection
            }
          }}
        >
          <option value="" disabled>
            Ajouter un tag...
          </option>
          {availableTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name} ({tag.category ?? 'Sans catégorie'})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
