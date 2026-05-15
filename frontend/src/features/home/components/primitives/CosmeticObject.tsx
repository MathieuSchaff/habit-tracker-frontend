import './CosmeticObject.css'

export type CosmeticObjectKind = 'jar' | 'bottle' | 'dropper' | 'spray'

type Props = {
  kind?: CosmeticObjectKind
  className?: string
}

/**
 * Objet cosmétique décoratif (pot, flacon, pipette, spray).
 * 100 % CSS — pas d'image, pas d'asset externe.
 * Utilisé dans les piliers et hero pour donner un univers tactile.
 */
export function CosmeticObject({ kind = 'jar', className }: Props) {
  return (
    <span
      className={['aur-obj', `aur-obj--${kind}`, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}
