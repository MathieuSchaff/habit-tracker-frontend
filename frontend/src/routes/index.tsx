import { createFileRoute } from '@tanstack/react-router'

import { canonicalUrl, seoHead } from '@/lib/seo'
import { HomePage } from '../features/home/page/HomePage/HomePage'

export const Route = createFileRoute('/')({
  ssr: true,
  // Title/description/OG inherited from the root; only the canonical/og:url are
  // page-specific here.
  head: () =>
    seoHead({
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: 'Aurore',
            url: canonicalUrl('/'),
            logo: canonicalUrl('/favicon.svg'),
          },
          { '@type': 'WebSite', name: 'Aurore', url: canonicalUrl('/') },
        ],
      },
    }),
  component: HomePage,
})
