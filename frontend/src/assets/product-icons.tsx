import { Droplets, FlaskConical, Package, Pill, Sun } from 'lucide-react'

// Individual icon components

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
      {/* bottle body */}
      <rect x="7" y="10" width="10" height="12" rx="2" />
      {/* neck */}
      <rect x="9" y="7" width="6" height="3" rx="1" />
      {/* pump stem */}
      <line x1="12" y1="7" x2="12" y2="3" />
      {/* pump arm */}
      <line x1="9" y1="3" x2="16" y2="3" />
      {/* nozzle */}
      <line x1="16" y1="3" x2="16" y2="5.5" />
    </svg>
  )
}

export function ProdDropperIcon({ size = 24 }: { size?: number }) {
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
      {/* rubber bulb */}
      <ellipse cx="12" cy="7" rx="3" ry="2.5" />
      {/* body */}
      <path d="M9 9.5 L9 19 Q9 20.5 12 20.5 Q15 20.5 15 19 L15 9.5" />
      {/* tip drop */}
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
      {/* jar body */}
      <path d="M4 14 L4 19 Q4 21 12 21 Q20 21 20 19 L20 14" />
      {/* lid rim */}
      <ellipse cx="12" cy="14" rx="8" ry="2" />
      {/* lid top */}
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
      {/* tube body */}
      <rect x="5.5" y="7.5" width="13" height="9" rx="3.5" />
      {/* cap */}
      <rect x="8.5" y="4" width="7" height="4" rx="2" />
      {/* squeeze crease */}
      <line x1="6" y1="13" x2="18" y2="13" />
    </svg>
  )
}

export function ProdSprayIcon({ size = 24 }: { size?: number }) {
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
      {/* bottle body */}
      <path d="M7 10.5 L7 20 Q7 21.5 11 21.5 L15 21.5 Q17 21.5 17 20 L17 10.5 Z" />
      {/* trigger housing */}
      <path d="M7 10.5 L7 7.5 Q7 5.5 9.5 5.5 L15.5 5.5 Q18 5.5 18 7.5 L18 9.5 Q18 10.5 17 10.5 Z" />
      {/* spray dots */}
      <circle cx="20.5" cy="5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="21.5" cy="8" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="11" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ProdSpfIcon({ size = 24 }: { size?: number }) {
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
      {/* small tube */}
      <rect x="3" y="9" width="10" height="12" rx="2" />
      <rect x="5.5" y="6" width="5" height="3.5" rx="1.5" />
      {/* sun */}
      <circle cx="19" cy="8" r="2.5" />
      <line x1="19" y1="3.5" x2="19" y2="2" />
      <line x1="19" y1="12.5" x2="19" y2="14" />
      <line x1="23.5" y1="8" x2="22" y2="8" />
      <line x1="22.2" y1="4.8" x2="21.1" y2="5.9" />
      <line x1="22.2" y1="11.2" x2="21.1" y2="10.1" />
    </svg>
  )
}

// Resolver

const UNIT_TO_ICON: Record<string, React.ElementType> = {
  pump: ProdPumpIcon,
  pompe: ProdPumpIcon,
  dropper: ProdDropperIcon,
  pipette: ProdDropperIcon,
  'compte-gouttes': ProdDropperIcon,
  jar: ProdCreamJarIcon,
  pot: ProdCreamJarIcon,
  crème: ProdCreamJarIcon,
  creme: ProdCreamJarIcon,
  cream: ProdCreamJarIcon,
  tube: ProdTubeIcon,
  spray: ProdSprayIcon,
  brume: ProdSprayIcon,
  brumisateur: ProdSprayIcon,
  spf: ProdSpfIcon,
  sunscreen: ProdSpfIcon,
  solaire: ProdSpfIcon,
}

const KIND_FALLBACK: Record<string, React.ElementType> = {
  skincare: FlaskConical,
  complément: Pill,
  complement: Pill,
  huile: Droplets,
  vitamine: Sun,
}

/**
 * Resolves the best icon for a product.
 * Priority: unit match → kind fallback → Package
 *
 * @param unit  Raw `unit` value from DB (e.g. "pump", "30ml", null)
 * @param kind  Raw `kind` value from DB (e.g. "complément", "skincare")
 */
export function getProductIcon(unit: string | null | undefined, kind: string): React.ElementType {
  const normalizedUnit = unit?.toLowerCase().trim()
  if (normalizedUnit && UNIT_TO_ICON[normalizedUnit]) {
    return UNIT_TO_ICON[normalizedUnit]
  }
  return KIND_FALLBACK[kind] ?? Package
}

// Convenience component

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
