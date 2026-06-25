import type { UserProductStatus } from '@aurore/shared'

import { Sentiment6 } from './sentiment-icons'

// Hand-drawn "carnet" empty-state scenes. Larger grid (64) carries a little
// more detail than the 24-grid icons; same monochrome currentColor so every
// theme (light + dark) tints them for free. An empty shelf here is an
// invitation to fill it, never a failure. Sparkles are reserved for the
// Holy Grail (and the onboarding scene) so they keep their meaning.

type IconProps = { size?: number }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Frame({
  size,
  label,
  children,
}: {
  size: number
  label: string
  children: React.ReactNode
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" {...stroke}>
      <title>{label}</title>
      {children}
    </svg>
  )
}

// Small 4-point twinkle (arms bow toward the centre). Holy Grail only.
function Spark({ cx, cy, r = 3.4 }: { cx: number; cy: number; r?: number }) {
  const d = [
    `M${cx} ${cy - r}`,
    `Q${cx} ${cy} ${cx + r} ${cy}`,
    `Q${cx} ${cy} ${cx} ${cy + r}`,
    `Q${cx} ${cy} ${cx - r} ${cy}`,
    `Q${cx} ${cy} ${cx} ${cy - r}Z`,
  ].join(' ')
  return <path d={d} fill="currentColor" stroke="none" />
}

function EmptyInStock({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Étagère vide">
      <path d="M12 47L52 47" />
      <path d="M16 47L16 51" />
      <path d="M48 47L48 51" />
      <rect x="26" y="29" width="12" height="18" rx="4" />
      <rect x="29.5" y="23" width="5" height="6" rx="2" />
      <path d="M32 23L32 19 36 19" />
    </Frame>
  )
}

// Wishlist = a notebook page with a small heart: "notez vos envies".
// Distinct base from the bottles so it can't be read as stock.
function EmptyWishlist({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Wishlist vide">
      <rect x="18" y="13" width="28" height="38" rx="4" />
      <path d="M24 22L32 22" />
      <path d="M24 31L40 31" />
      <path d="M24 39L34 39" />
      <path d="M39 26C36.2 23.7 35.7 21.4 37.3 20.2C38.3 19.4 39 20.1 39 21C39 20.1 39.7 19.4 40.7 20.2C42.3 21.4 41.8 23.7 39 26Z" />
    </Frame>
  )
}

function EmptyWatched({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Rien sous le coude">
      <path d="M14 32Q32 19 50 32 32 45 14 32Z" />
      <circle cx="32" cy="32" r="6" />
      <circle cx="34" cy="30" r="1.1" fill="currentColor" stroke="none" />
    </Frame>
  )
}

function EmptyArchived({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Rien d'archivé">
      <rect x="16" y="26" width="32" height="22" rx="3" />
      <path d="M16 33L48 33" />
      <path d="M28 29.5L36 29.5" />
      <rect x="25" y="38" width="14" height="6" rx="1.5" />
    </Frame>
  )
}

// Avoided = the bottle crossed out by one big hand stroke: "rayé".
// A single soft curved diagonal — the user's own decision, not a ban
// sign (no circle, no X, the bottle stays intact and friendly).
function EmptyAvoided({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Rien à éviter">
      <rect x="25" y="27" width="14" height="20" rx="4" />
      <rect x="29" y="21" width="6" height="6" rx="2" />
      <path d="M17 15Q28 22 34 32Q40 42 47 49" />
    </Frame>
  )
}

function EmptyHolyGrail({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Pas encore de Saint Graal">
      <path d="M24 22L40 22 46 30 32 50 18 30Z" />
      <path d="M18 30L46 30" />
      <path d="M24 22L28 30" />
      <path d="M40 22L36 30" />
      <path d="M28 30L32 50" />
      <path d="M36 30L32 50" />
      <g id="spark">
        <Spark cx={48} cy={15} r={4.5} />
      </g>
    </Frame>
  )
}

// Repurchase = the bottle itself inside a renewal loop with a solid
// arrowhead — the object in the cycle is what keeps it from reading
// as a generic refresh button.
function EmptyRepurchase({ size = 64 }: IconProps) {
  return (
    <Frame size={size} label="Rien à racheter">
      <rect x="27" y="28" width="10" height="14" rx="3" />
      <rect x="29.5" y="23" width="5" height="5" rx="1.5" />
      <path d="M32 19A15 15 0 1 1 17.9 39.1" />
      <path d="M15.5 32.5L21.2 37.9L14.6 40.3Z" fill="currentColor" stroke="none" />
    </Frame>
  )
}

type EmptyKind = UserProductStatus | 'holy_grail' | 'repurchase'

const EMPTY_ICONS: Record<EmptyKind, (props: IconProps) => React.ReactElement> = {
  in_stock: EmptyInStock,
  wishlist: EmptyWishlist,
  watched: EmptyWatched,
  archived: EmptyArchived,
  avoided: EmptyAvoided,
  holy_grail: EmptyHolyGrail,
  repurchase: EmptyRepurchase,
}

export function EmptyIllustration({ kind, size = 96 }: { kind: EmptyKind; size?: number }) {
  const Icon = EMPTY_ICONS[kind]
  return Icon ? <Icon size={size} /> : null
}

// Onboarding ornaments (24-grid, match the product-icons family).
// Each hint is the miniature of its empty-state scene so the metaphor
// stays single: shelf=stock, heart=wishlist, gem=grail.

const smallStroke = { ...stroke, strokeWidth: 1.75 } as const

// SVG replacement for the sparkle asterisk used in the empty-shelf first-visit scene.
export function SparkleIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <title>Étincelle</title>
      <path d="M12 5C12.7 10.6 13.4 11.3 19 12 13.4 12.7 12.7 13.4 12 19 11.3 13.4 10.6 12.7 5 12 10.6 11.3 11.3 10.6 12 5Z" />
    </svg>
  )
}

export function HintInStock({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...smallStroke}>
      <title>En stock</title>
      <path d="M4 19.5L20 19.5" />
      <rect x="9" y="9.5" width="6" height="10" rx="2" />
      <rect x="10.5" y="5.5" width="3" height="4" rx="1" />
    </svg>
  )
}

export function HintWishlist({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...smallStroke}>
      <title>Wishlist</title>
      <path d="M12 19.5C6.6 15.3 5.6 11.4 8.3 9.2C10 7.8 11.9 8.8 12 10.3C12.1 8.8 14 7.8 15.7 9.2C18.4 11.4 17.4 15.3 12 19.5Z" />
    </svg>
  )
}

export function HintHolyGrail({ size = 18 }: IconProps) {
  return <Sentiment6 size={size} />
}
