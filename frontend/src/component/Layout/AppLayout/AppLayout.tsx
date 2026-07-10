import { Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { Toaster, toast, useToasterStore } from 'react-hot-toast'

import { useIsStandalone } from '../../../hooks/useIsStandalone'
import { setLiveRegion } from '../../../lib/announce'
import { useResendVerification } from '../../../lib/queries/auth'
import { useAuthStore } from '../../../store/auth'
import { BackToTopButton } from '../../BackToTopButton/BackToTopButton'
import { Button } from '../../Button/Button'
import { Header } from '../../Header/Header'

// PWA-only bottom nav: lazy so its code + CSS stay out of the main bundle for browser tabs.
const BottomNav = lazy(() =>
  import('../../Header/BottomNav/BottomNav').then((m) => ({ default: m.BottomNav }))
)

export const AppLayout = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthRoute = pathname.startsWith('/auth/')

  const user = useAuthStore((s) => s.user)
  const emailVerified = useAuthStore((s) => s.emailVerified)
  const resend = useResendVerification()
  const isStandalone = useIsStandalone()

  const liveRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setLiveRegion(liveRef.current)
    return () => setLiveRegion(null)
  }, [])

  const handleResend = () => {
    resend.mutate(undefined, {
      onSuccess: () => toast.success('Email envoyé !'),
      onError: () => toast.error('Erreur, réessayez plus tard.'),
    })
  }

  return (
    <div className="app-layout">
      {!isAuthRoute && user && !emailVerified && (
        <div className="email-verification-banner" role="alert">
          <span>Vérifiez votre adresse email pour continuer à utiliser Aurore.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resend.isPending}
          >
            {resend.isPending ? (
              <>
                <span aria-hidden="true">...</span>
                <span className="sr-only">Envoi en cours</span>
              </>
            ) : (
              'Renvoyer'
            )}
          </Button>
        </div>
      )}
      <Header />
      <main className="content">
        <Outlet />
      </main>
      {isStandalone && (
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      )}
      <BackToTopButton />
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <AppToaster />
    </div>
  )
}

// Native <dialog>.showModal() puts modals in the browser top layer, above ANY z-index. A plain
// Toaster (z-index ~9999) therefore renders behind open dialogs. Promote the toaster into the top
// layer via the popover API, shown only while toasts are live so each appearance re-enters the
// top layer above whatever dialog is currently open.
function AppToaster() {
  const ref = useRef<HTMLDivElement>(null)
  const { toasts } = useToasterStore()
  // length, not some(visible): keep the popover up through a toast's exit animation (visible flips
  // false before react-hot-toast drops it from the array), otherwise the leave transition is cut.
  const hasToasts = toasts.length > 0

  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.showPopover !== 'function') return
    try {
      if (hasToasts) el.showPopover()
      else el.hidePopover()
    } catch {
      // showPopover throws if already shown, hidePopover if already hidden — both no-ops here.
    }
  }, [hasToasts])

  return (
    <div ref={ref} popover="manual" className="app-toaster">
      <Toaster position="top-center" />
    </div>
  )
}
