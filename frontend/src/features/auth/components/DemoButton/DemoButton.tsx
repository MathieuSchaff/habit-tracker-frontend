import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { useDemo } from '../../../../lib/queries/auth'

export const DemoButton = () => {
  const navigate = useNavigate()
  const demo = useDemo()
  // Keep spinning through the /collection route load, not just the POST.
  const [redirecting, setRedirecting] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
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
      Essayer la démo
    </Button>
  )
}
