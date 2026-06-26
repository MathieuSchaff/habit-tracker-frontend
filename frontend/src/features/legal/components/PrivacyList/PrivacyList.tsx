import type { ReactNode } from 'react'

export function PrivacyList({ items }: { items: { label: ReactNode; body: ReactNode }[] }) {
  return (
    <ul role="list" className="privacy-list">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: items list is static and never reordered
        <li key={i}>
          <strong>{item.label}</strong> {item.body}
        </li>
      ))}
    </ul>
  )
}
