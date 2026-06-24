#!/usr/bin/env bun

// Wired via `just sweep-demos` (scripts/just/ops.just).

import { logger } from '../../lib/logger'
import { sweepExpiredDemos } from './demo-cleanup'

sweepExpiredDemos()
  .then((count) => {
    logger.info({ count }, 'demo sweep done')
    process.exit(0)
  })
  .catch((err) => {
    logger.error({ err }, 'demo sweep failed')
    process.exit(1)
  })
