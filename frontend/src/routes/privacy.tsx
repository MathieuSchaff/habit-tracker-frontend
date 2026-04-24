import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPage } from '../features/legal/components/PrivacyPage/PrivacyPage'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})
