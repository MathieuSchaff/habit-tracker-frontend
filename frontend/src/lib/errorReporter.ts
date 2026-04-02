import { useAuthStore } from '../store/auth'

interface ErrorPayload {
  source: 'frontend'
  message: string
  stack?: string
  context?: Record<string, unknown>
  userId?: string
}

// Fire-and-forget — never throws. Errors in the reporter must not cause new errors.
export async function reportError(error: Error, context?: Record<string, unknown>): Promise<void> {
  const userId = useAuthStore.getState().user?.id

  const payload: ErrorPayload = {
    source: 'frontend',
    message: error.message,
    stack: error.stack,
    context: { url: window.location.href, ...context },
    ...(userId ? { userId } : {}),
  }

  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // intentionally empty — error reporter must never throw
  }
}
