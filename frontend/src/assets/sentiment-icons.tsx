import { useId } from 'react'

import { sentimentLabels } from '@/utils/sentimentMap'

import './sentiment-icons.css'

type IconProps = { size?: number }

export const SENTIMENT_COLORS: Record<number, string> = {
  1: 'var(--sentiment-1)',
  2: 'var(--sentiment-2)',
  3: 'var(--sentiment-3)',
  4: 'var(--sentiment-4)',
  5: 'var(--sentiment-5)',
  6: 'var(--status-color-holy-grail)',
}

const SENTIMENT_FILLS: Record<number, string> = {
  1: 'var(--sentiment-1-fill)',
  2: 'var(--sentiment-2-fill)',
  3: 'var(--sentiment-3-fill)',
  4: 'var(--sentiment-4-fill)',
  5: 'var(--sentiment-5-fill)',
  6: 'var(--sentiment-6-fill)',
}

const SENTIMENT_SHADES: Record<number, string> = {
  1: 'color-mix(in oklch, var(--sentiment-1-fill) 68%, var(--sentiment-1))',
  2: 'color-mix(in oklch, var(--sentiment-2-fill) 68%, var(--sentiment-2))',
  3: 'color-mix(in oklch, var(--sentiment-3-fill) 68%, var(--sentiment-3))',
  4: 'color-mix(in oklch, var(--sentiment-4-fill) 68%, var(--sentiment-4))',
  5: 'color-mix(in oklch, var(--sentiment-5-fill) 68%, var(--sentiment-5))',
}

const INK = 'var(--sentiment-ink)'
const BLUSH = 'var(--sentiment-blush)'
const HIGHLIGHT = 'var(--surface-bright)'
const COMPACT_MAX_SIZE = 18

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function isCompact(size: number): boolean {
  return size <= COMPACT_MAX_SIZE
}

function Eye({ cx, cy, radius = 1.3 }: { cx: number; cy: number; radius?: number }) {
  return <circle className="snt-eye" cx={cx} cy={cy} r={radius} fill={INK} stroke="none" />
}

function CompactExpression({ value }: { value: number }) {
  switch (value) {
    case 1:
      return (
        <>
          <Eye cx={8.4} cy={10.2} radius={1.45} />
          <Eye cx={15.6} cy={10.2} radius={1.45} />
          <path className="snt-mouth" d="M7.8 17Q12 12.4 16.2 17" stroke={INK} strokeWidth={2.4} />
        </>
      )
    case 2:
      return (
        <>
          <path className="snt-eye" d="M7.2 10.4H9.8M14.2 10.4H16.8" stroke={INK} />
          <path
            className="snt-mouth"
            d="M8.3 16.2Q12 13.7 15.7 16.2"
            stroke={INK}
            strokeWidth={2.4}
          />
        </>
      )
    case 3:
      return (
        <>
          <Eye cx={8.4} cy={10.2} radius={1.45} />
          <Eye cx={15.6} cy={10.2} radius={1.45} />
          <path className="snt-mouth" d="M8.2 15.5H15.8" stroke={INK} strokeWidth={2.4} />
        </>
      )
    case 4:
      return (
        <>
          <Eye cx={8.4} cy={10.2} radius={1.45} />
          <Eye cx={15.6} cy={10.2} radius={1.45} />
          <path
            className="snt-mouth"
            d="M7.9 14.2Q12 18.4 16.1 14.2"
            stroke={INK}
            strokeWidth={2.4}
          />
        </>
      )
    case 5:
      return (
        <>
          <path className="snt-eye" d="M7.1 10.8Q8.5 8.8 9.9 10.8" stroke={INK} />
          <path className="snt-eye" d="M14.1 10.8Q15.5 8.8 16.9 10.8" stroke={INK} />
          <path
            className="snt-mouth"
            d="M7.8 13.8Q12 19 16.2 13.8Q12 16.3 7.8 13.8Z"
            fill={INK}
            stroke={INK}
          />
        </>
      )
    default:
      return null
  }
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
  const compact = isCompact(size)
  const faceGradientId = useId()
  const blushGradientId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="snt-icon"
      {...stroke}
      strokeWidth={compact ? 2.3 : stroke.strokeWidth}
      style={{ color: SENTIMENT_COLORS[value] }}
    >
      <title>{sentimentLabels[value]}</title>
      <defs>
        <radialGradient id={faceGradientId} cx="34%" cy="28%" r="74%" fx="30%" fy="24%">
          <stop offset="0%" stopColor={HIGHLIGHT} />
          <stop offset="52%" stopColor={SENTIMENT_FILLS[value]} />
          <stop offset="100%" stopColor={SENTIMENT_SHADES[value]} />
        </radialGradient>
        {!compact && (
          <radialGradient id={blushGradientId}>
            <stop offset="0%" stopColor={BLUSH} stopOpacity={0.52} />
            <stop offset="55%" stopColor={BLUSH} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BLUSH} stopOpacity={0} />
          </radialGradient>
        )}
      </defs>
      <circle
        className="snt-face"
        cx={12}
        cy={12}
        r={8.75}
        fill={`url(#${faceGradientId})`}
        stroke="none"
      />
      {!compact && (
        <>
          <ellipse
            className="snt-cheek"
            cx={6.7}
            cy={13.2}
            rx={2.5}
            ry={1.7}
            fill={`url(#${blushGradientId})`}
            stroke="none"
          />
          <ellipse
            className="snt-cheek snt-cheek--r"
            cx={17.3}
            cy={13.2}
            rx={2.5}
            ry={1.7}
            fill={`url(#${blushGradientId})`}
            stroke="none"
          />
        </>
      )}
      {children}
    </svg>
  )
}

function Sentiment1({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={1}>
      {isCompact(size) ? (
        <CompactExpression value={1} />
      ) : (
        <>
          <Eye cx={8.7} cy={10.3} />
          <Eye cx={15.3} cy={10.3} />
          <path className="snt-mouth" d="M8.4 16.4Q12 13.2 15.6 16.4" stroke={INK} />
        </>
      )}
    </Face>
  )
}

function Sentiment2({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={2}>
      {isCompact(size) ? (
        <CompactExpression value={2} />
      ) : (
        <>
          <Eye cx={8.7} cy={10.3} />
          <Eye cx={15.3} cy={10.3} />
          <path className="snt-mouth" d="M9 15.8Q12 14.8 15 15.8" stroke={INK} />
        </>
      )}
    </Face>
  )
}

function Sentiment3({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={3}>
      {isCompact(size) ? (
        <CompactExpression value={3} />
      ) : (
        <>
          <Eye cx={8.7} cy={10.3} />
          <Eye cx={15.3} cy={10.3} />
          <path className="snt-mouth" d="M9 15.2L15 15.2" stroke={INK} />
        </>
      )}
    </Face>
  )
}

function Sentiment4({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={4}>
      {isCompact(size) ? (
        <CompactExpression value={4} />
      ) : (
        <>
          <Eye cx={8.7} cy={10.3} />
          <Eye cx={15.3} cy={10.3} />
          <path className="snt-mouth" d="M9 14.6Q12 16.4 15 14.6" stroke={INK} />
        </>
      )}
    </Face>
  )
}

function Sentiment5({ size = 24 }: IconProps) {
  return (
    <Face size={size} value={5}>
      {isCompact(size) ? (
        <CompactExpression value={5} />
      ) : (
        <>
          <path className="snt-eye" d="M7.6 10.7Q8.7 9.4 9.8 10.7" stroke={INK} />
          <path className="snt-eye" d="M14.2 10.7Q15.3 9.4 16.4 10.7" stroke={INK} />
          <path
            className="snt-mouth"
            d="M8.4 14Q12 17.8 15.6 14Q12 15.8 8.4 14Z"
            fill={INK}
            stroke={INK}
          />
        </>
      )}
    </Face>
  )
}

// Saint Graal: a faceted gem, the most precious of the set, with a twinkle.
export function Sentiment6({ size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="snt-icon"
      {...stroke}
      style={{ color: SENTIMENT_COLORS[6] }}
    >
      <title>{sentimentLabels[6]}</title>
      <g className="snt-gem">
        <path d="M8.5 7L15.5 7 18.5 10.5 12 19 5.5 10.5Z" fill={SENTIMENT_FILLS[6]} />
        <path d="M5.5 10.5L18.5 10.5" />
        <path d="M8.5 7L10.5 10.5" />
        <path d="M15.5 7L13.5 10.5" />
        <path d="M10.5 10.5L12 19" />
        <path d="M13.5 10.5L12 19" />
      </g>
      <g id="spark" className="snt-spark">
        <path
          d="M19.5 1.8Q19.5 4 21.7 4 19.5 4 19.5 6.2 19.5 4 17.3 4 19.5 4 19.5 1.8Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
      <path
        className="snt-spark-2"
        d="M4.6 3.1Q4.6 4.2 5.7 4.2 4.6 4.2 4.6 5.3 4.6 4.2 3.5 4.2 4.6 4.2 4.6 3.1Z"
        fill="currentColor"
        stroke="none"
      />
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
