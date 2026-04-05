import clsx from 'clsx'
import './Skeleton.css'

interface SkeletonProps {
  width?: string
  height?: string
  radius?: string
  className?: string
}

export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  return (
    <output
      className={clsx('skeleton', className)}
      style={{ width, height, borderRadius: radius }}
      aria-label="Chargement"
    />
  )
}
