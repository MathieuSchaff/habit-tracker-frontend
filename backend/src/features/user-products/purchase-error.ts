import type { PurchaseErrorCode } from '@aurore/shared'

export class PurchaseError extends Error {
  constructor(public code: PurchaseErrorCode) {
    super(code)
    this.name = 'PurchaseError'
  }
}
