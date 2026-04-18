import './Spinner.css'

import clsx from 'clsx'

type SpinnerProps = {
  className?: string
}

export const Spinner = ({ className }: SpinnerProps) => {
  return <output className={clsx('spinner', className)} aria-label="Chargement" />
}
