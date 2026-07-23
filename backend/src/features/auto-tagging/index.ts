// Public API for the auto-tagging subsystem.
//
// Single entry point for external consumers (db/seed/seeders/seed-core.ts,
// features/products/service.ts). Internal runners and tests import from the
// concrete module paths.

export { loadTagSlugToInfo } from './lib/fetch-auto-tag-bundle'
export { buildOrchestratorInput, type OrchestratorProductFields } from './lib/orchestrator-input'
export type { AutoTagSource } from './lib/pass-types'
export { resolveTagRows } from './lib/resolve-tag-rows'
export { detectAllAutoTags, isAutoTagEligibleCategory } from './orchestrator'
export { partitionEczemaReview } from './passes/formula'
export { writeTagsForProductFailSoft } from './write'
