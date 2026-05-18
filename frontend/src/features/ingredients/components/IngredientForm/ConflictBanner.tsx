import { AlertTriangle, X as XIcon } from 'lucide-react'

export function ConflictBanner({
  conflict,
  onDismiss,
}: {
  conflict: unknown
  onDismiss: () => void
}) {
  if (!conflict) return null
  return (
    <div className="ingredient-edit-form__conflict-banner">
      <div className="ingredient-edit-form__conflict-banner-header">
        <AlertTriangle size={16} />
        <span>
          <strong>Conflit détecté</strong> — quelqu'un a modifié cet ingrédient pendant ton édition.
          Le formulaire affiche maintenant la version à jour. Ton brouillon est affiché sous chaque
          champ modifié.
        </span>
      </div>
      <button type="button" className="ingredient-edit-form__conflict-dismiss" onClick={onDismiss}>
        <XIcon size={14} />
        Fermer les brouillons
      </button>
    </div>
  )
}
