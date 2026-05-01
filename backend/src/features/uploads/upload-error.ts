import type { UploadErrorCode } from '@habit-tracker/shared'

export class UploadError extends Error {
  constructor(public code: UploadErrorCode | 'not_found') {
    super(code)
    this.name = 'UploadError'
  }
}
