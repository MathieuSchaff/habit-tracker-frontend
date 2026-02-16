import type React from 'react'

interface AuroreLogoProps {
  size?: number
  className?: string
  showBackground?: boolean
}

export const AuroreLogo: React.FC<AuroreLogoProps> = ({
  size = 120,
  className = '',
  showBackground = true,
}) => {
  return (
    <svg
      width={size}
      height={size * 0.67} // Maintient le ratio hauteur/largeur
      viewBox="0 0 120 80"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Aurore"
      className={className}
    >
      {showBackground && (
        <>
          <path d="M 0 80 A 60 60 0 0 1 120 80 Z" fill="#F2A09A" opacity="0.6" />
          <path d="M 30 80 A 30 30 0 0 1 90 80" fill="#F2A09A" opacity="0.8" />
        </>
      )}
      <g stroke="#E67C73" strokeWidth="3" fill="none">
        <path d="M 0 80 A 30 30 0 0 1 60 80" />
        <path d="M 30 80 A 30 30 0 0 1 90 80" />
        <path d="M 60 80 A 30 30 0 0 1 120 80" />
      </g>
    </svg>
  )
}
