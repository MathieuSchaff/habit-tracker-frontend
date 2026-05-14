import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus, safeUrl } from '../core'

export const uploadResponseSchema = z.object({
  url: safeUrl,
})
export type UploadResponse = z.infer<typeof uploadResponseSchema>

export type UploadErrorCode =
  | 'upload_invalid_format'
  | 'upload_too_large'
  | 'upload_invalid_dimensions'
  | 'upload_storage_failed'

export const uploadErrorMapping = {
  upload_invalid_format: HTTP_STATUS.BAD_REQUEST,
  upload_too_large: HTTP_STATUS.BAD_REQUEST,
  upload_invalid_dimensions: HTTP_STATUS.BAD_REQUEST,
  upload_storage_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<UploadErrorCode, HttpStatus>
