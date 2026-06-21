import { useEffect, useState } from 'react'

const SUCCESS_FEEDBACK_MS = 3500

// Transient success toast shared by admin moderation pages: holds a message and clears
// it after a delay. setSuccess(null) lets callers drop stale feedback on tab switch.
export function useSuccessFeedback() {
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [success])

  return { success, setSuccess }
}
