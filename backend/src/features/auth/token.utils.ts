import { CryptoHasher } from 'bun'

// Shared by email-verification and password-reset: both mint a 32-byte random
// token, hand the raw token to the user, and persist only its sha256 hash. Single
// source so the algorithm can't drift between the two flows.
export function generateRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hashToken(rawToken: string): string {
  const hasher = new CryptoHasher('sha256')
  hasher.update(rawToken)
  return hasher.digest('hex')
}
