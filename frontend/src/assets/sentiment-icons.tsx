import { sentimentLabels } from '@/utils/sentimentMap'

// Hand-drawn "carnet" sentiment scale. Faces 1-5 share one slightly irregular
// outline and read by their mouth curve alone, monotonic so the order is
// legible at 26px (stroke 2 + bold eyes: the badge renders at 18px).
// Level 6 (Saint Graal) is deliberately off-scale — a gem, per product
// doctrine — sized to match the faces' visual weight, with its sparkle
// isolated in <g id="spark"> so the dev can shimmer it without touching
// the drawing.

type IconProps = { size?: number }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

// Wobbly near-circle: warmer than a geometric face.
const FACE =
  'M12 3.6C16.5 3.4 20.4 7 20.4 11.8 20.4 16.6 16.7 20.4 12 20.4 7.3 20.4 3.6 16.4 3.6 11.9 3.6 7.2 7.6 3.7 12 3.6Z'

function Eye({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={1.2} fill="currentColor" stroke="none" />
}

function Face({
  size,
  value,
  children,
}: {
  size: number
  value: number
  children: React.ReactNode
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <title>{sentimentLabels[value]}</title>
      <path d={FACE} />
      {children}
    </svg>
  )
}

function Sentiment1({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={1}>
      <Eye cx={8.7} cy={10.3} />
      <Eye cx={15.3} cy={10.3} />
      <path d="M8.4 16.4Q12 13.2 15.6 16.4" />
    </Face>
  )
}

function Sentiment2({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={2}>
      <Eye cx={8.7} cy={10.3} />
      <Eye cx={15.3} cy={10.3} />
      <path d="M9 15.8Q12 14.8 15 15.8" />
    </Face>
  )
}

function Sentiment3({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={3}>
      <Eye cx={8.7} cy={10.3} />
      <Eye cx={15.3} cy={10.3} />
      <path d="M9 15.2L15 15.2" />
    </Face>
  )
}

function Sentiment4({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={4}>
      <Eye cx={8.7} cy={10.3} />
      <Eye cx={15.3} cy={10.3} />
      <path d="M9 14.6Q12 16.4 15 14.6" />
    </Face>
  )
}

function Sentiment5({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={5}>
      <path d="M7.6 10.7Q8.7 9.4 9.8 10.7" />
      <path d="M14.2 10.7Q15.3 9.4 16.4 10.7" />
      <path d="M8.4 14Q12 17.8 15.6 14Q12 15.8 8.4 14Z" fill="currentColor" />
    </Face>
  )
}

// Saint Graal: a faceted gem, the most precious of the set, with a twinkle.
export function Sentiment6({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <title>{sentimentLabels[6]}</title>
      <path d="M8.5 7L15.5 7 18.5 10.5 12 19 5.5 10.5Z" />
      <path d="M5.5 10.5L18.5 10.5" />
      <path d="M8.5 7L10.5 10.5" />
      <path d="M15.5 7L13.5 10.5" />
      <path d="M10.5 10.5L12 19" />
      <path d="M13.5 10.5L12 19" />
      <g id="spark">
        <path
          d="M19.5 1.8Q19.5 4 21.7 4 19.5 4 19.5 6.2 19.5 4 17.3 4 19.5 4 19.5 1.8Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  )
}

const SENTIMENT_ICONS: Record<number, (props: IconProps) => React.ReactElement> = {
  1: Sentiment1,
  2: Sentiment2,
  3: Sentiment3,
  4: Sentiment4,
  5: Sentiment5,
  6: Sentiment6,
}

export function SentimentIcon({ value, size = 24 }: { value: number; size?: number }) {
  const Icon = SENTIMENT_ICONS[value]
  return Icon ? <Icon size={size} /> : null
}
