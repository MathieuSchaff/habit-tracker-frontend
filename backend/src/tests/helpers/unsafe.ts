import type { Email, RawPassword } from '@habit-tracker/shared'

export const unsafeEmail = (e: string) => e as unknown as Email
export const unsafePassword = (p: string) => p as unknown as RawPassword
