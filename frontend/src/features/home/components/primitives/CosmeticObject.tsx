import './CosmeticObject.css'

type CosmeticObjectKind = 'jar' | 'bottle' | 'dropper' | 'spray'

type Props = {
  kind?: CosmeticObjectKind
  className?: string
}

export function CosmeticObject({ kind = 'jar', className }: Props) {
  return (
    <span
      className={['aur-obj', `aur-obj--${kind}`, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}
