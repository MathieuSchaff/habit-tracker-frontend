import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPage } from '../features/legal/PrivacyPage/PrivacyPage'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})
