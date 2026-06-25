import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '../features/home/page/HomePage/HomePage'

export const Route = createFileRoute('/')({
  component: HomePage,
})
