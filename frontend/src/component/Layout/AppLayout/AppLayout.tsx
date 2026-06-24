import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'

import { setLiveRegion } from '../../../lib/announce'
import { useResendVerification } from '../../../lib/queries/auth'
import { useAuthStore } from '../../../store/auth'
import { BackToTopButton } from '../../BackToTopButton/BackToTopButton'
import { Button } from '../../Button/Button'
import { BottomNav } from '../../Header/BottomNav/BottomNav'
import { Header } from '../../Header/Header'

export const AppLayout = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthRoute = pathname.startsWith('/auth/')

  const user = useAuthStore((s) => s.user)
  const emailVerified = useAuthStore((s) => s.emailVerified)
  const resend = useResendVerification()

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
      <BottomNav />
      <BackToTopButton />
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <Toaster position="top-center" />
    </div>
  )
}
