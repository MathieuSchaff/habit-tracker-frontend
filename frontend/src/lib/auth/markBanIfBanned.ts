import { useAuthStore } from '@/store/auth'

export async function markBanIfBanned(res: Response): Promise<void> {
  try {
    const body = (await res.clone().json()) as {
      success?: boolean
      error?: string
      details?: { expiresAt?: string | null; reason?: string | null }
    }
    if (body?.error === 'banned') {
      useAuthStore.getState().markBanned({
        expiresAt: body.details?.expiresAt ?? null,
        reason: body.details?.reason ?? null,
      })
    }
  } catch {
    // if we are here: means it's not a ban, we don't touch store
  }
}
