// Public API for the auto-tagging subsystem.
//
// Single entry point for external consumers (db/seed/seeders/seed-core.ts,
// features/products/service.ts). Internal runners and tests import from the
// concrete module paths.

export { detectAllAutoTags } from './orchestrator'
export { partitionEczemaReview } from './passes/formula'
export { writeTagsForProductFailSoft } from './write'
