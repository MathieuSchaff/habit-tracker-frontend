import { createFileRoute } from '@tanstack/react-router'

import { seoHead } from '@/lib/seo'
import { PrivacyPage } from '../features/legal/page/PrivacyPage/PrivacyPage'

export const Route = createFileRoute('/privacy')({
  ssr: true,
  head: () =>
    seoHead({
      path: '/privacy',
      title: 'Confidentialité — Aurore',
      description:
        'Comment Aurore protège vos données : Row-Level Security PostgreSQL, bases légales RGPD par traitement, et suppression complète de votre compte à tout moment.',
      ogTitle: 'Confidentialité — Aurore',
      ogDescription:
        'Vos données d’usage, la base légale RGPD de chaque traitement, et le droit d’effacer tout votre compte quand vous voulez.',
    }),
  component: PrivacyPage,
})
