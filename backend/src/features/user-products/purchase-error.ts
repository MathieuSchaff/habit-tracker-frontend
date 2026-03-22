import type { PurchaseErrorCode } from '@habit-tracker/shared'

export class PurchaseError extends Error {
  constructor(public code: PurchaseErrorCode) {
    super(code)
    this.name = 'PurchaseError'
  }
}
