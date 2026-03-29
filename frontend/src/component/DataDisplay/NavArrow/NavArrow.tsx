import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import './NavArrow.css'

interface NavArrowProps {
  size?: number
  className?: string
}

export function NavArrow({ size = 18, className }: NavArrowProps) {
  return <ChevronRight size={size} className={clsx('nav-arrow', className)} />
}
