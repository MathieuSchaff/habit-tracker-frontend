import { useNavigate } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { useDemo } from '../../../../lib/queries/auth'

import './DemoCallout.css'

export const DemoCallout = () => {
  const navigate = useNavigate()
  const demo = useDemo()
  // Keep spinning through the /collection route load, not just the POST.
  const [redirecting, setRedirecting] = useState(false)

  return (
    <aside className="demo-callout" aria-label="Découvrir Aurore sans compte">
      <p className="demo-callout__title">Juste curieux ?</p>
      <p className="demo-callout__hint">
        Explorez Aurore avec une collection d'exemple, sans créer de compte.
      </p>
      <Button
        type="button"
        variant="primary"
        fullWidth
        loading={demo.isPending || redirecting}
        onClick={() =>
          demo.mutate(undefined, {
            onSuccess: () => {
              setRedirecting(true)
              navigate({ to: '/collection' })
            },
          })
        }
      >
        <Sparkles size={16} aria-hidden="true" />
        Essayer la démo
      </Button>
    </aside>
  )
}
