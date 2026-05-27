import { useRef, useState } from 'react'

import type { UserProduct } from '@/lib/queries/user-products'

const STATUSES_REQUIRING_REASON_PROMPT: ReadonlyArray<UserProduct['status']> = [
  'avoided',
  'archived',
]

// avoided/archived open an inline reason prompt before submit; reason lands on the status log,
// never in comment. Prompt lives in §6 so we scroll there when triggered from the header popover.
export function useStatusDecision(
  p: UserProduct,
  onCommitStatus: (status: UserProduct['status'], reason?: string) => void
) {
  const decisionSectionRef = useRef<HTMLElement>(null)
  const [pendingStatus, setPendingStatus] = useState<UserProduct['status'] | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')

  const handleStatusChange = (newStatus: UserProduct['status']) => {
    if (newStatus === p.status) return
    if (STATUSES_REQUIRING_REASON_PROMPT.includes(newStatus)) {
      setPendingStatus(newStatus)
      setReasonDraft('')
      requestAnimationFrame(() => {
        decisionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }
    onCommitStatus(newStatus)
  }

  const handleConfirmStatus = () => {
    if (!pendingStatus) return
    const trimmed = reasonDraft.trim()
    onCommitStatus(pendingStatus, trimmed || undefined)
    setPendingStatus(null)
    setReasonDraft('')
  }

  const handleCancelStatus = () => {
    setPendingStatus(null)
    setReasonDraft('')
  }

  return {
    decisionSectionRef,
    pendingStatus,
    reasonDraft,
    setReasonDraft,
    handleStatusChange,
    handleConfirmStatus,
    handleCancelStatus,
  }
}

export type StatusDecision = ReturnType<typeof useStatusDecision>
