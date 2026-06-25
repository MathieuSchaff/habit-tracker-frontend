import type { ReactNode } from 'react'

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="privacy-link" target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (nouvelle fenêtre)</span>
    </a>
  )
}
