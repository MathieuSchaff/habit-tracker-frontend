import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { FormField } from '@/component/Input/FormField/FormField'
import { Input } from '@/component/Input/Input'

import './SlugEditModal.css'

interface SlugEditModalProps {
  currentSlug: string
  productName: string
  onClose: () => void
  onConfirm: (newSlug: string) => void
}

// Preview only — backend re-slugifies on receipt, divergences (e.g. "&") normalize server-side.
function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SLUG_RE = /^[a-z0-9-]+$/

export function SlugEditModal({
  currentSlug,
  productName,
  onClose,
  onConfirm,
}: SlugEditModalProps) {
  const [value, setValue] = useState(currentSlug)
  const trimmed = value.trim()
  const changed = trimmed !== currentSlug
  const validFormat = trimmed.length > 0 && SLUG_RE.test(trimmed)
  const error =
    trimmed.length === 0
      ? 'Le slug ne peut pas être vide.'
      : !validFormat
        ? 'Slug invalide : minuscules, chiffres et tirets uniquement.'
        : null

  return (
    <Modal onClose={onClose} size="md" className="slug-edit-modal">
      <Modal.Title className="slug-edit-modal__title">Modifier le slug de l’URL</Modal.Title>

      <p className="slug-edit-modal__warning">
        ⚠️ Action <strong>irréversible</strong> sans redirection. Tous les liens externes, bookmarks
        et résultats de recherche pointant vers <code>/products/{currentSlug}</code>
        retourneront 404.
      </p>

      <FormField
        label="Nouveau slug"
        htmlFor="slug-edit-input"
        error={error && changed ? error : undefined}
      >
        <Input
          id="slug-edit-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="ex: bioderma-atoderm-creme"
        />
      </FormField>

      <div className="slug-edit-modal__regen">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setValue(slugify(productName))}
          disabled={!productName.trim()}
        >
          Régénérer depuis le nom
        </Button>
        <span className="slug-edit-modal__regen-hint">
          → <code>{productName.trim() ? slugify(productName) : '…'}</code>
        </span>
      </div>

      {changed && validFormat && (
        <p className="slug-edit-modal__preview">
          URL : <code>/products/{currentSlug}</code> → <code>/products/{trimmed}</code>
        </p>
      )}

      <div className="slug-edit-modal__actions">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!changed || !validFormat}
          onClick={() => onConfirm(trimmed)}
        >
          Confirmer le changement
        </Button>
      </div>
    </Modal>
  )
}
