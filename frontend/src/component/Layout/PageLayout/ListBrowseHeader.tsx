import type { ReactNode } from 'react'

import './ListBrowseHeader.css'

interface ListBrowseHeaderProps {
  title: string
  /** Rendered inside a polite live region next to the title (result count). */
  meta?: ReactNode
  /** Marks the meta live region busy while placeholder data is shown. */
  metaBusy?: boolean
  /** Right-aligned controls (sort, create, filter). */
  tools?: ReactNode
  tabs?: ReactNode
  search?: ReactNode
  /** Escape hatch for page-specific extras rendered after the toolbar (e.g. scroll sentinel). */
  children?: ReactNode
}

// Rail comes from --list-browse-rail (required on the page root); spacing relies on the parent header's column gap.
export function ListBrowseHeader({
  title,
  meta,
  metaBusy,
  tools,
  tabs,
  search,
  children,
}: ListBrowseHeaderProps) {
  return (
    <>
      <div className="list-browse-header__top-inner">
        <div className="list-page-layout__header-info">
          <h1 className="list-page-layout__title">{title}</h1>
          {meta !== undefined && meta !== null && meta !== false && (
            <span
              className="list-page-layout__meta"
              aria-live="polite"
              aria-busy={metaBusy || undefined}
            >
              {meta}
            </span>
          )}
        </div>
        {tools && <div className="list-browse-header__tools">{tools}</div>}
      </div>

      {(tabs || search) && (
        <div className="list-browse-header__toolbar">
          <div className="list-browse-header__toolbar-inner">
            {tabs}
            {search && <div className="list-browse-header__search">{search}</div>}
          </div>
        </div>
      )}

      {children}
    </>
  )
}
