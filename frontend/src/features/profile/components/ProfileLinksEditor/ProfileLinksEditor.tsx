import type { ProfileLink } from '@habit-tracker/shared'

import { Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Input } from '@/component/Input/Input'
import './ProfileLinksEditor.css'

type ProfileLinksEditorProps = {
  links: ProfileLink[]
  onChange: (links: ProfileLink[]) => void
  disabled?: boolean
}

export const ProfileLinksEditor = ({ links, onChange, disabled }: ProfileLinksEditorProps) => {
  const [announcement, setAnnouncement] = useState('')
  const announcementTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const announce = (message: string) => {
    clearTimeout(announcementTimeout.current)
    setAnnouncement(message)
    announcementTimeout.current = setTimeout(() => setAnnouncement(''), 1000)
  }

  const addLink = () => {
    if (links.length >= 5) return
    onChange([...links, { label: '', url: '' }])
    announce(`Lien ${links.length + 1} ajouté`)
  }

  const removeLink = (index: number, label: string) => {
    onChange(links.filter((_, i) => i !== index))
    announce(`Lien ${label || `n°${index + 1}`} supprimé`)
  }

  const updateLink = (index: number, field: keyof ProfileLink, value: string) => {
    onChange(links.map((link, i) => (i === index ? { ...link, [field]: value } : link)))
  }

  return (
    <fieldset className="links-editor" aria-label="Liens de profil">
      <ul className="links-editor__list">
        {links.map((link, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order is stable here
          <li key={i}>
            <fieldset className="links-editor__row" disabled={disabled}>
              <legend className="sr-only">Lien {i + 1}</legend>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="links-editor__remove"
                onClick={() => removeLink(i, link.label)}
                disabled={disabled}
                aria-label={`Supprimer le lien ${link.label || `n°${i + 1}`}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </fieldset>
          </li>
        ))}
      </ul>
      {links.length < 5 ? (
        <Button type="button" variant="outline" size="sm" onClick={addLink} disabled={disabled}>
          <Plus size={16} aria-hidden="true" />
          Ajouter un lien
        </Button>
      ) : (
        <p className="links-editor__limit sr-only">Nombre maximum de liens atteint (5)</p>
      )}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </fieldset>
  )
}
