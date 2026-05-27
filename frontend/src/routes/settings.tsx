import { createFileRoute, redirect } from '@tanstack/react-router'

// Direct hits on /settings - bookmarks, browser history, external links - land on the profile
// dashboard where the Réglages tab lives. The _authenticated guard kicks in via /profile.
export const Route = createFileRoute('/settings')({
  beforeLoad: () => {
    throw redirect({ to: '/profile' })
  },
})
