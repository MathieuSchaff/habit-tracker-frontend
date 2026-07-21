import { createFileRoute } from '@tanstack/react-router'

import { seoHead } from '@/lib/seo'
import { AboutPage } from '../features/about/AboutPage/AboutPage'

export const Route = createFileRoute('/about')({
  ssr: true,
  head: () =>
    seoHead({
      path: '/about',
      title: 'À propos — Aurore',
      description:
        'Pourquoi Aurore existe : relier vos produits skincare, vos notes et la raison de chaque choix. Un outil calme, sans score ni publicité, pas pour pousser à acheter.',
      ogTitle: 'À propos d’Aurore',
      ogDescription:
        'Aurore est né d’un problème simple : trop d’informations dispersées. Relier vos produits et vos décisions, sans vendre ni pousser à consommer.',
    }),
  component: AboutPage,
})
