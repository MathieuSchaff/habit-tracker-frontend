import { createFileRoute } from '@tanstack/react-router'

import { AboutPage } from '../features/about/AboutPage/AboutPage'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})
