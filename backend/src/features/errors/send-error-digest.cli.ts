#!/usr/bin/env bun

// Wired via `just send-error-digest` (scripts/just/ops.just).

import { db } from '../../db'
import { logger } from '../../lib/logger'
import { sendErrorDigest } from './digest'

sendErrorDigest(db)
  .then((result) => {
    if (result.sent) logger.info({ count: result.count }, 'error digest sent')
    else logger.info({ reason: result.reason }, 'error digest skipped')
    process.exit(0)
  })
  .catch((err) => {
    logger.error({ err }, 'error digest failed')
    process.exit(1)
  })
