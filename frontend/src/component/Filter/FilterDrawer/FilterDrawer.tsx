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
}: FilterDrawerProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [localFilters, setLocalFilters] = useState<FilterValues<T>>(currentFilters)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useScrollLock(open)

  // remember which button opened the dialog so we can restore focus on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }
  }, [open])

  const handleClose = useCallback(() => {
    onApply(localFilters)
    onClose()
    setTimeout(() => previousFocusRef.current?.focus(), 0)
  }, [localFilters, onApply, onClose])

  useEffect(() => {
    if (open) {
      setLocalFilters(currentFilters)
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open, currentFilters])

  const handleToggle = (key: T, value: string) => {
    setLocalFilters((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
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

          {advancedGroups.length > 0 && (
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
            </fieldset>
          )}
        </form>

        <div className="filter-drawer__footer">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocalFilters(initialFilters)
              onReset()
            }}
            aria-label="Réinitialiser tous les filtres"
          >
            Réinitialiser
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="filter-drawer__apply"
            onClick={handleClose}
            aria-label="Appliquer les filtres sélectionnés"
          >
            Appliquer
          </Button>
        </div>
      </div>
    </dialog>
  )
}
