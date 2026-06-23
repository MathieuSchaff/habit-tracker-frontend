import { FlaskConical, Package, Pill, Sun } from 'lucide-react'

export function ProdPumpIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Icône de flacon pompe</title>
      <rect x="7" y="10" width="10" height="12" rx="2" />
      <rect x="9" y="7" width="6" height="3" rx="1" />
      <line x1="12" y1="7" x2="12" y2="3" />
      <line x1="9" y1="3" x2="16" y2="3" />
      <line x1="16" y1="3" x2="16" y2="5.5" />
    </svg>
  )
}

function ProdDropperIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Icône de pipette</title>
      <ellipse cx="12" cy="7" rx="3" ry="2.5" />
      <path d="M9 9.5 L9 19 Q9 20.5 12 20.5 Q15 20.5 15 19 L15 9.5" />
      <path d="M10.5 20.5 Q12 23 13.5 20.5" />
    </svg>
  )
}

export function ProdCreamJarIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Icône de pot de crème</title>
      <path d="M4 14 L4 19 Q4 21 12 21 Q20 21 20 19 L20 14" />
      <ellipse cx="12" cy="14" rx="8" ry="2" />
      <ellipse cx="12" cy="11.5" rx="6.5" ry="1.75" />
    </svg>
  )
}

export function ProdTubeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Icône de tube</title>
      <rect x="5.5" y="7.5" width="13" height="9" rx="3.5" />
      <rect x="8.5" y="4" width="7" height="4" rx="2" />
      <line x1="6" y1="13" x2="18" y2="13" />
    </svg>
  )
}

function ProdSprayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Icône de spray</title>
      <path d="M7 10.5 L7 20 Q7 21.5 11 21.5 L15 21.5 Q17 21.5 17 20 L17 10.5 Z" />
      <path d="M7 10.5 L7 7.5 Q7 5.5 9.5 5.5 L15.5 5.5 Q18 5.5 18 7.5 L18 9.5 Q18 10.5 17 10.5 Z" />
      <circle cx="20.5" cy="5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="21.5" cy="8" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="11" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ProdSpfIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Icône de protection solaire</title>
      <rect x="3" y="9" width="10" height="12" rx="2" />
      <rect x="5.5" y="6" width="5" height="3.5" rx="1.5" />
      <circle cx="19" cy="8" r="2.5" />
      <line x1="19" y1="3.5" x2="19" y2="2" />
      <line x1="19" y1="12.5" x2="19" y2="14" />
      <line x1="23.5" y1="8" x2="22" y2="8" />
      <line x1="22.2" y1="4.8" x2="21.1" y2="5.9" />
      <line x1="22.2" y1="11.2" x2="21.1" y2="10.1" />
    </svg>
  )
}

// Specific unit shapes only - generic containers (bottle, stick, bar, pack,
// sachet, cartridge) fall through to the kind map so the icon reflects what
// the product *is*, not just its outer container.
// Render functions, not component refs: a dynamic JSX element type
// (`const Icon = …; <Icon />`) bails the whole component out of the
// React Compiler. Returning ReactNode from a static-typed map keeps it
// optimizable.
type IconRender = (size: number) => React.ReactNode

const UNIT_TO_ICON: Record<string, IconRender> = {
  pump: (size) => <ProdPumpIcon size={size} />,
  pompe: (size) => <ProdPumpIcon size={size} />,
  dropper: (size) => <ProdDropperIcon size={size} />,
  pipette: (size) => <ProdDropperIcon size={size} />,
  'compte-gouttes': (size) => <ProdDropperIcon size={size} />,
  ampoule: (size) => <ProdDropperIcon size={size} />,
  jar: (size) => <ProdCreamJarIcon size={size} />,
  pot: (size) => <ProdCreamJarIcon size={size} />,
  crème: (size) => <ProdCreamJarIcon size={size} />,
  creme: (size) => <ProdCreamJarIcon size={size} />,
  cream: (size) => <ProdCreamJarIcon size={size} />,
  tube: (size) => <ProdTubeIcon size={size} />,
  spray: (size) => <ProdSprayIcon size={size} />,
  brume: (size) => <ProdSprayIcon size={size} />,
  brumisateur: (size) => <ProdSprayIcon size={size} />,
  aerosol: (size) => <ProdSprayIcon size={size} />,
  spf: (size) => <ProdSpfIcon size={size} />,
  sunscreen: (size) => <ProdSpfIcon size={size} />,
  solaire: (size) => <ProdSpfIcon size={size} />,
  capsule: (size) => <Pill size={size} />,
  tablet: (size) => <Pill size={size} />,
  gummy: (size) => <Pill size={size} />,
  powder: (size) => <FlaskConical size={size} />,
  roller: (size) => <ProdDropperIcon size={size} />,
}

const KIND_FALLBACK: Record<string, IconRender> = {
  serum: (size) => <ProdDropperIcon size={size} />,
  moisturizer: (size) => <ProdCreamJarIcon size={size} />,
  cleanser: (size) => <ProdTubeIcon size={size} />,
  toner: (size) => <ProdSprayIcon size={size} />,
  exfoliant: (size) => <ProdTubeIcon size={size} />,
  'eye-cream': (size) => <ProdDropperIcon size={size} />,
  mask: (size) => <ProdCreamJarIcon size={size} />,
  mist: (size) => <ProdSprayIcon size={size} />,
  essence: (size) => <ProdSprayIcon size={size} />,
  'spot-treatment': (size) => <ProdDropperIcon size={size} />,
  'lip-care': (size) => <ProdTubeIcon size={size} />,
  balm: (size) => <ProdCreamJarIcon size={size} />,
  oil: (size) => <ProdDropperIcon size={size} />,
  primer: (size) => <ProdPumpIcon size={size} />,
  patch: (size) => <Package size={size} />,
  sunscreen: (size) => <ProdSpfIcon size={size} />,
  'after-sun': (size) => <ProdSpfIcon size={size} />,
  'self-tanner': (size) => <ProdSpfIcon size={size} />,
  gelule: (size) => <Pill size={size} />,
  capsule: (size) => <Pill size={size} />,
  ampoule: (size) => <ProdDropperIcon size={size} />,
  poudre: (size) => <FlaskConical size={size} />,
  sirop: (size) => <FlaskConical size={size} />,
  gummy: (size) => <Pill size={size} />,
  huile: (size) => <ProdDropperIcon size={size} />,
  shampoo: (size) => <ProdTubeIcon size={size} />,
  conditioner: (size) => <ProdTubeIcon size={size} />,
  'hair-mask': (size) => <ProdCreamJarIcon size={size} />,
  'hair-serum': (size) => <ProdDropperIcon size={size} />,
  'hair-oil': (size) => <ProdDropperIcon size={size} />,
  styling: (size) => <ProdSprayIcon size={size} />,
  'hair-color': (size) => <ProdTubeIcon size={size} />,
  'body-lotion': (size) => <ProdTubeIcon size={size} />,
  'body-oil': (size) => <ProdDropperIcon size={size} />,
  'body-scrub': (size) => <ProdCreamJarIcon size={size} />,
  'body-wash': (size) => <ProdTubeIcon size={size} />,
  deodorant: (size) => <ProdSprayIcon size={size} />,
  'hand-cream': (size) => <ProdTubeIcon size={size} />,
  'foot-cream': (size) => <ProdTubeIcon size={size} />,
  toothpaste: (size) => <ProdTubeIcon size={size} />,
  mouthwash: (size) => <ProdSprayIcon size={size} />,
  'teeth-whitening': (size) => <ProdTubeIcon size={size} />,
  floss: (size) => <Package size={size} />,
  skincare: (size) => <FlaskConical size={size} />,
  complément: (size) => <Pill size={size} />,
  complement: (size) => <Pill size={size} />,
  vitamine: (size) => <Sun size={size} />,
}

// priority: specific unit shape → kind archetype → Package
function getProductIcon(unit: string | null | undefined, kind: string): IconRender {
  const normalizedUnit = unit?.toLowerCase().trim()
  if (normalizedUnit && UNIT_TO_ICON[normalizedUnit]) {
    return UNIT_TO_ICON[normalizedUnit]
  }
  return KIND_FALLBACK[kind] ?? ((size) => <Package size={size} />)
}

export function ProductIcon({
  unit,
  kind,
  size = 24,
}: {
  unit: string | null | undefined
  kind: string
  size?: number
}) {
  return getProductIcon(unit, kind)(size)
}
