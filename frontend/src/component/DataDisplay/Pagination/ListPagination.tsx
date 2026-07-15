import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ListPagination.css'

type ListPaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function ListPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: ListPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      className={clsx('list-pagination', className)}
      aria-label={`Page ${currentPage} sur ${totalPages}`}
    >
      <button
        type="button"
        className="list-pagination__btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <span className="list-pagination__info" aria-live="polite">
        {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        className="list-pagination__btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}
