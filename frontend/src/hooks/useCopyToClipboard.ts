import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'

interface UseCopyToClipboardResult {
  copied: boolean
  copy: (text: string) => Promise<boolean>
}

export function useCopyToClipboard(resetMs = 2000): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        // The button's label swap (Copier → Copié) is not re-announced once focused;
        // the toast (aria-live polite) carries the confirmation to screen readers.
        toast.success('Copié', { id: 'clipboard-copy' })
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), resetMs)
        return true
      } catch {
        return false
      }
    },
    [resetMs]
  )

  return { copied, copy }
}
