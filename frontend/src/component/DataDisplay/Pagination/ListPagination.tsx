import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ListPagination.css'

type ListPaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ListPagination({ currentPage, totalPages, onPageChange }: ListPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="list-pagination">
      <button
        type="button"
        className="list-pagination__btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="list-pagination__info">
        {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        className="list-pagination__btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
