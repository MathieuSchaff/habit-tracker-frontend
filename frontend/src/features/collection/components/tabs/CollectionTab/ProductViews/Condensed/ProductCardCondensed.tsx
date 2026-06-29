import { getProductKindLabel, type UserProductStatus } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, ChevronDown, SmilePlus, Sparkles } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from 'react'

import { SentimentIcon } from '@/assets/sentiment-icons'
import { Card } from '@/component/Card/Card'
import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import {
  compatLabels,
  getCompatTone,
  SCORE_THRESHOLDS,
  statusLabels,
} from '@/features/collection/constants'
import { useCompatScore } from '@/features/collection/context/CollectionFilterContext'
import { ProductImage } from '@/features/products/components/ProductImage/ProductImage'
import { useAnnounce } from '@/hooks/useAnnounce'
import { calculateWeightedScore } from '@/lib/helpers/reviews'
import { userPreferenceQueries } from '@/lib/queries/user-preferences'
import type { UserProduct } from '@/lib/queries/user-products'
import { useUpdateUserProduct } from '@/lib/queries/user-products'
import { StatusPicker } from '../../ShelfView/StatusPicker'

import './ProductCardCondensed.css'

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 8

interface ProductCardCondensedProps {
  p: UserProduct
  onToggleExpand: () => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onMoveStatus?: (status: UserProductStatus) => void
}

function getScoreChipClass(score: string | null): string {
  if (score == null) return 'score-none'
  const n = Number.parseFloat(score)
  if (n >= SCORE_THRESHOLDS.gold) return 'score-gold'
  if (n >= SCORE_THRESHOLDS.rare) return 'score-rare'
  if (n >= SCORE_THRESHOLDS.good) return 'score-good'
  return 'score-none'
}

function getStatusClass(status: string): string {
  return status === 'archived' ? 'status-archived' : ''
}

export function ProductCardCondensed({
  p,
  onToggleExpand,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onMoveStatus,
}: ProductCardCondensedProps) {
  const updateMutation = useUpdateUserProduct()
  const announce = useAnnounce()
  const [isPopping, setIsPopping] = useState(false)
  const { data: prefs } = useQuery(userPreferenceQueries.get())
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStartPos = useRef<{ x: number; y: number } | null>(null)
  const longPressFired = useRef(false)

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!onToggleSelect) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const target = e.target as HTMLElement
      if (target.closest('[data-stop-long-press]')) return

      pressStartPos.current = { x: e.clientX, y: e.clientY }
      longPressFired.current = false
      clearTimer()
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true
        onToggleSelect()
        if ('vibrate' in navigator) navigator.vibrate?.(12)
      }, LONG_PRESS_MS)
    },
    [clearTimer, onToggleSelect]
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pressStartPos.current || !longPressTimer.current) return
      const dx = e.clientX - pressStartPos.current.x
      const dy = e.clientY - pressStartPos.current.y
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clearTimer()
    },
    [clearTimer]
  )

  const handlePointerUp = useCallback(() => {
    clearTimer()
    pressStartPos.current = null
  }, [clearTimer])

  const handleBodyClick = (e: React.MouseEvent) => {
    if (longPressFired.current) {
      longPressFired.current = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (selectMode && onToggleSelect) {
      onToggleSelect()
      return
    }
    onToggleExpand()
  }

  const handleNextSentiment = (e: React.MouseEvent) => {
    e.stopPropagation()
    const current = p.sentiment || 0
    const max = p.status === 'avoided' ? 5 : 6
    const next = current >= max ? null : current + 1
    updateMutation.mutate(
      { id: p.id, input: { sentiment: next } },
      { onSuccess: () => announce(next === null ? 'Ressenti retiré' : 'Ressenti enregistré') }
    )

    setIsPopping(true)
    setTimeout(() => setIsPopping(false), 350)
  }

  const displayScale = prefs?.displayScale ?? 'out_of_20'
  const score = calculateWeightedScore(p.review, prefs?.criteriaWeights, displayScale)
  const priceEuros = p.product.priceCents ? `${(p.product.priceCents / 100).toFixed(2)} €` : null

  const compatScore = useCompatScore(p.product.id)
  const compatTone = p.status === 'archived' ? null : getCompatTone(compatScore)

  const scoreChipClass = getScoreChipClass(score)
  const statusClass = getStatusClass(p.status)
  const statusCfg = statusLabels[p.status]
  const StatusIcon = statusCfg.icon

  return (
    <div
      className={clsx(
        'prod-card-wrapper',
        selectMode && 'pcc--select-mode',
        selected && 'pcc--selected'
      )}
      style={{ '--pcc-accent': statusCfg.color } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <button
        type="button"
        className={clsx('prod-sentiment-toggle', !p.sentiment && 'empty', isPopping && 'popping')}
        onClick={handleNextSentiment}
        aria-label={`Changer le ressenti pour ${p.product.name}`}
        data-stop-long-press
      >
        {p.sentiment ? (
          <SentimentIcon value={p.sentiment} size={26} />
        ) : (
          <SmilePlus size={22} aria-hidden="true" />
        )}
      </button>

      {/* Badge rond (.prod-sentiment-badge) — retiré le temps de retravailler les icônes. */}

      <span
        className={clsx('pcc-check', (selectMode || selected) && 'pcc-check--visible')}
        aria-hidden="true"
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>

      <Card accent={statusCfg.color} className={clsx('prod-card', statusClass)}>
        <div className="prod-card-top">
          <div className="prod-icon-wrap">
            <ProductImage
              kind={p.product.kind}
              unit={p.product.unit}
              imageUrl={p.product.imageUrl}
              size={56}
            />
          </div>

          <button
            type="button"
            className="prod-body"
            onClick={handleBodyClick}
            aria-label={`Voir les détails de ${p.product.name} par ${p.product.brand}`}
          >
            <div className="prod-brand">{p.product.brand}</div>
            <div className="prod-name">{p.product.name}</div>
            {p.comment && <div className="prod-comment">{p.comment}</div>}
          </button>
        </div>

        <Card.Footer>
          <div className="prod-chips">
            <span className="pcc-status-wrap" data-stop-long-press>
              <DropdownMenu>
                <DropdownMenu.Trigger>
                  <button
                    type="button"
                    className="pcc-status-pill"
                    aria-label={`Statut : ${statusCfg.label}. Toucher pour changer.`}
                  >
                    <StatusIcon size={12} aria-hidden="true" />
                    <span>{statusCfg.label}</span>
                    <ChevronDown size={11} aria-hidden="true" className="pcc-status-pill-chevron" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  className="pcc-picker"
                  ariaLabel="Déplacer vers…"
                >
                  <StatusPicker current={p.status} onPick={(s) => onMoveStatus?.(s)} />
                </DropdownMenu.Content>
              </DropdownMenu>
            </span>
            {p.product.kind && <Badge variant="chip">{getProductKindLabel(p.product.kind)}</Badge>}
            {compatTone && (
              <span className={clsx('pcc-compat', `pcc-compat--${compatTone}`)}>
                {compatTone === 'favorite' && <Sparkles size={11} aria-hidden="true" />}
                {compatLabels[compatTone]}
              </span>
            )}
          </div>
          {priceEuros && <div className="prod-price">{priceEuros}</div>}
        </Card.Footer>

        {(scoreChipClass === 'score-gold' || scoreChipClass === 'score-rare') && (
          <div className={clsx('prod-score-corner', scoreChipClass)} />
        )}
      </Card>
    </div>
  )
}
