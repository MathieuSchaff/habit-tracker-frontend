// Mirrors src/assets/aurore-icon.svg (3 sunrise arcs).
type Props = {
  size?: number
  stroke?: string
  className?: string
  'aria-hidden'?: boolean
}

export function AuroreBrandMark({ size = 28, stroke, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden={rest['aria-hidden'] ?? true}
    >
      <title>Aurore</title>
      <g stroke={stroke ?? 'var(--color-accent)'} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M 27.5 50 A 11.25 11.25 0 0 1 38.75 38.75 A 11.25 11.25 0 0 1 50 50" />
        <path d="M 38.75 50 A 11.25 11.25 0 0 1 50 38.75 A 11.25 11.25 0 0 1 61.25 50" />
        <path d="M 50 50 A 11.25 11.25 0 0 1 61.25 38.75 A 11.25 11.25 0 0 1 72.5 50" />
      </g>
    </svg>
  )
}
