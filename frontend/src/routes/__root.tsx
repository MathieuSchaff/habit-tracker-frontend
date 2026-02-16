import { createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import { AppLayout } from '../component/Layout/AppLayout/AppLayout'
import { silentRefresh } from '../lib/queries/silentRefresh'
import type { RouterContext } from '../routerContext'
import { useAuthStore } from '../store/auth'

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    // si pas de token, on tente un refresh silencieux pour le header (Connexion/Déconnexion)
    // Si ça échoue, pas grave, on est peut-être sur une page publique
    if (!useAuthStore.getState().accessToken) {
      await silentRefresh(context.queryClient)
    }
  },
  component: () => (
    <>
      <AppLayout />
      <TanStackRouterDevtools />
    </>
  ),
  errorComponent: () => <div>404 Not found</div>,
})
