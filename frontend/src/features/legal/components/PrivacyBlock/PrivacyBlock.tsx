import type { ReactNode } from 'react'
import './PrivacyBlock.css'

export function PrivacyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="privacy-block">
      <h2 className="privacy-block__title">{title}</h2>
      {children}
    </section>
  )
}
