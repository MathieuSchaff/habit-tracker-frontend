import type { ProfileLink } from '@habit-tracker/shared'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { Input } from '@/component/Input/Input'
import './ProfileLinksEditor.css'

type ProfileLinksEditorProps = {
  links: ProfileLink[]
  onChange: (links: ProfileLink[]) => void
  disabled?: boolean
}

export const ProfileLinksEditor = ({ links, onChange, disabled }: ProfileLinksEditorProps) => {
  const addLink = () => {
    if (links.length >= 5) return
    onChange([...links, { label: '', url: '' }])
  }

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, field: keyof ProfileLink, value: string) => {
    onChange(links.map((link, i) => (i === index ? { ...link, [field]: value } : link)))
  }

  return (
    <div className="links-editor">
      {links.map((link, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: order is stable here
        <div key={i} className="links-editor__row">
          <Input
            label="Label"
            value={link.label}
            onChange={(e) => updateLink(i, 'label', e.target.value)}
            placeholder="Instagram"
            maxLength={50}
            disabled={disabled}
          />
          <Input
            label="URL"
            type="url"
            value={link.url}
            onChange={(e) => updateLink(i, 'url', e.target.value)}
            placeholder="https://instagram.com/..."
            disabled={disabled}
          />
          <button
            type="button"
            className="links-editor__remove"
            onClick={() => removeLink(i)}
            disabled={disabled}
            aria-label="Supprimer ce lien"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
      {links.length < 5 && (
        <Button type="button" variant="outline" size="sm" onClick={addLink} disabled={disabled}>
          <Plus size={16} aria-hidden="true" />
          Ajouter un lien
        </Button>
      )}
    </div>
  )
}
