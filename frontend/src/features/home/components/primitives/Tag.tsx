import './Tag.css'

type Variant = 'active' | 'safe' | 'warn' | 'outline'

type Props = {
  variant?: Variant
  children: React.ReactNode
}

/** Pill tag — uppercase, tracked. Variants pull from --tag-* tokens. */
export function Tag({ variant, children }: Props) {
  const cls = `aur-tag${variant ? ` aur-tag--${variant}` : ''}`
  return <span className={cls}>{children}</span>
}
