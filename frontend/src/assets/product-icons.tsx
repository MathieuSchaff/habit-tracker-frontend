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
const UNIT_TO_ICON: Record<string, React.ElementType> = {
  pump: ProdPumpIcon,
  pompe: ProdPumpIcon,
  dropper: ProdDropperIcon,
  pipette: ProdDropperIcon,
  'compte-gouttes': ProdDropperIcon,
  ampoule: ProdDropperIcon,
  jar: ProdCreamJarIcon,
  pot: ProdCreamJarIcon,
  crème: ProdCreamJarIcon,
  creme: ProdCreamJarIcon,
  cream: ProdCreamJarIcon,
  tube: ProdTubeIcon,
  spray: ProdSprayIcon,
  brume: ProdSprayIcon,
  brumisateur: ProdSprayIcon,
  aerosol: ProdSprayIcon,
  spf: ProdSpfIcon,
  sunscreen: ProdSpfIcon,
  solaire: ProdSpfIcon,
  capsule: Pill,
  tablet: Pill,
  gummy: Pill,
  powder: FlaskConical,
  roller: ProdDropperIcon,
}

const KIND_FALLBACK: Record<string, React.ElementType> = {
  serum: ProdDropperIcon,
  moisturizer: ProdCreamJarIcon,
  cleanser: ProdTubeIcon,
  toner: ProdSprayIcon,
  exfoliant: ProdTubeIcon,
  'eye-cream': ProdDropperIcon,
  mask: ProdCreamJarIcon,
  mist: ProdSprayIcon,
  essence: ProdSprayIcon,
  'spot-treatment': ProdDropperIcon,
  'lip-care': ProdTubeIcon,
  balm: ProdCreamJarIcon,
  oil: ProdDropperIcon,
  primer: ProdPumpIcon,
  patch: Package,
  sunscreen: ProdSpfIcon,
  'after-sun': ProdSpfIcon,
  'self-tanner': ProdSpfIcon,
  gelule: Pill,
  capsule: Pill,
  ampoule: ProdDropperIcon,
  poudre: FlaskConical,
  sirop: FlaskConical,
  gummy: Pill,
  huile: ProdDropperIcon,
  shampoo: ProdTubeIcon,
  conditioner: ProdTubeIcon,
  'hair-mask': ProdCreamJarIcon,
  'hair-serum': ProdDropperIcon,
  'hair-oil': ProdDropperIcon,
  styling: ProdSprayIcon,
  'hair-color': ProdTubeIcon,
  'body-lotion': ProdTubeIcon,
  'body-oil': ProdDropperIcon,
  'body-scrub': ProdCreamJarIcon,
  'body-wash': ProdTubeIcon,
  deodorant: ProdSprayIcon,
  'hand-cream': ProdTubeIcon,
  'foot-cream': ProdTubeIcon,
  toothpaste: ProdTubeIcon,
  mouthwash: ProdSprayIcon,
  'teeth-whitening': ProdTubeIcon,
  floss: Package,
  skincare: FlaskConical,
  complément: Pill,
  complement: Pill,
  vitamine: Sun,
}

// priority: specific unit shape → kind archetype → Package
function getProductIcon(unit: string | null | undefined, kind: string): React.ElementType {
  const normalizedUnit = unit?.toLowerCase().trim()
  if (normalizedUnit && UNIT_TO_ICON[normalizedUnit]) {
    return UNIT_TO_ICON[normalizedUnit]
  }
  return KIND_FALLBACK[kind] ?? Package
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
  const Icon = getProductIcon(unit, kind)
  return <Icon size={size} />
}
