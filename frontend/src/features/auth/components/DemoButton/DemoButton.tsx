import { useNavigate } from '@tanstack/react-router'

import { Button } from '../../../../component/Button/Button'
import { useDemo } from '../../../../lib/queries/auth'

export const DemoButton = () => {
  const navigate = useNavigate()
  const demo = useDemo()

  return (
    <Button
      type="button"
      variant="ghost"
      fullWidth
      loading={demo.isPending}
      onClick={() => demo.mutate(undefined, { onSuccess: () => navigate({ to: '/collection' }) })}
    >
      Essayer la demo
    </Button>
  )
}
