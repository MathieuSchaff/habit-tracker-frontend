import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { useScrollLock } from '@/hooks/useScrollLock'
import { FilterAccordion } from '../FilterAccordion/FilterAccordion'
import type { FilterGroupConfig, FilterValues } from '../types'

import './FilterDrawer.css'

type FilterDrawerProps<T extends string> = {
  open: boolean
  onClose: () => void
  groups: FilterGroupConfig<T>[]
  currentFilters: FilterValues<T>
  onApply: (filters: FilterValues<T>) => void
  onReset: () => void
  initialFilters: FilterValues<T>
  children?: React.ReactNode
  // Rendered after the essential accordions, before the "Avancé" separator.
  // Used for non-tag essentials so they sit inside the essential block
  // instead of floating above the whole list.
  essentialExtras?: React.ReactNode
  // Rendered at the end of the advanced section (after all advanced
  // accordions). Used for non-tag advanced controls (e.g. price range).
  advancedExtras?: React.ReactNode
  // Live count of products matching the in-flight selection, displayed on
  // the Apply button. Parent owns the query — drawer just renders.
  previewCount?: number
  // Emitted on every local change so the parent can drive a preview query.
  onLocalFiltersChange?: (filters: FilterValues<T>) => void
}

export function FilterDrawer<T extends string>({
  open,
  onClose,
  groups,
  currentFilters,
  onApply,
  onReset,
  initialFilters,
  children,
  essentialExtras,
  advancedExtras,
  previewCount,
  onLocalFiltersChange,
}: FilterDrawerProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [localFilters, setLocalFilters] = useState<FilterValues<T>>(currentFilters)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Stable ref so commitLocal can call the latest callback without
  // re-creating itself every render.
  const onLocalFiltersChangeRef = useRef(onLocalFiltersChange)
  onLocalFiltersChangeRef.current = onLocalFiltersChange

  useScrollLock(open)

  // remember which button opened the dialog so we can restore focus on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }
  }, [open])

  // Drawer model: drawer = staging, Apply = commit, X / Esc / backdrop = drop
  // draft (no commit). Local filters are re-synced from currentFilters on
  // next open via the open-sync effect, so a closed-then-reopened drawer
  // shows the canonical state.
  const handleClose = useCallback(() => {
    onClose()
    setTimeout(() => previousFocusRef.current?.focus(), 0)
  }, [onClose])

  const handleApply = useCallback(() => {
    onApply(localFilters)
    onClose()
    setTimeout(() => previousFocusRef.current?.focus(), 0)
  }, [localFilters, onApply, onClose])

  useEffect(() => {
    if (open) setLocalFilters(currentFilters)
  }, [open, currentFilters])

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  // Emit on user action instead of via effect on localFilters: an effect
  // would call setDraftFilters in the parent, which re-renders and ships a
  // new currentFilters ref back, triggering Maximum update depth.
  const commitLocal = (next: FilterValues<T>) => {
    setLocalFilters(next)
    onLocalFiltersChangeRef.current?.(next)
  }

  const handleToggle = (key: T, value: string) => {
    const current = localFilters[key] ?? []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    commitLocal({ ...localFilters, [key]: next })
  }

  const handleCancel = (e: React.UIEvent<HTMLDialogElement>) => {
    e.preventDefault()
    handleClose()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      handleClose()
    }
  }

  // arrow keys move focus between accordion triggers,
  // but only when the trigger itself is focused — we don't want
  // to hijack arrows inside a SearchSelect or other inputs
  const handleArrowNav = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const target = e.target as HTMLElement
    if (!target.classList.contains('filter-accordion__trigger')) return
    e.preventDefault()
    const form = e.currentTarget as HTMLElement
    const triggers = Array.from(form.querySelectorAll<HTMLElement>('.filter-accordion__trigger'))
    const currentIndex = triggers.indexOf(target)
    if (currentIndex === -1) return
    const nextIndex =
      e.key === 'ArrowDown'
        ? (currentIndex + 1) % triggers.length
        : (currentIndex - 1 + triggers.length) % triggers.length
    triggers[nextIndex]?.focus()
  }

  // Native <dialog> + showModal() blocks focus from leaving the dialog but
  // does NOT cycle Tab/Shift+Tab at the boundaries (Chromium escapes to body
  // on Shift+Tab from first focusable / Tab from last). Wrap explicitly.
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const handleTabTrap = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  const titleId = useId()
  const essentialGroups = groups.filter((g) => g.tier === 'essential')
  const advancedGroups = groups.filter((g) => g.tier === 'advanced')

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is not focusable, keyboard handler would do nothing
    <dialog
      ref={dialogRef}
      className="filter-drawer"
      aria-labelledby={titleId}
      aria-modal="true"
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      onKeyDown={handleTabTrap}
    >
      <div className="filter-drawer__panel">
        <div className="filter-drawer__header">
          <h2 id={titleId} className="filter-drawer__title">
            Filtres
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="filter-drawer__close"
            onClick={handleClose}
            aria-label="Fermer les filtres"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>

        <form
          className="filter-drawer__body"
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={handleArrowNav}
        >
          {children}
          {essentialGroups.map((group) => (
            <FilterAccordion
              key={group.id}
              group={group}
              localFilters={localFilters}
              onToggle={handleToggle}
            />
          ))}
          {essentialExtras}

          {(advancedGroups.length > 0 || advancedExtras) && (
            <fieldset aria-label="Filtres avancés">
              <div className="filter-drawer__separator">
                <span className="filter-drawer__separator-label">Avancé</span>
              </div>

              {advancedGroups.map((group) => (
                <FilterAccordion
                  key={group.id}
                  group={group}
                  localFilters={localFilters}
                  onToggle={handleToggle}
                />
              ))}
              {advancedExtras}
            </fieldset>
          )}
        </form>

        <div className="filter-drawer__footer">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              commitLocal(initialFilters)
              onReset()
            }}
            aria-label="Réinitialiser tous les filtres"
          >
            Réinitialiser
          </Button>
          <Button
            variant="primary"
            size="md"
            className="filter-drawer__apply"
            onClick={handleApply}
            aria-label="Appliquer les filtres sélectionnés"
          >
            {previewCount === undefined
              ? 'Appliquer'
              : `Voir ${previewCount} produit${previewCount > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
