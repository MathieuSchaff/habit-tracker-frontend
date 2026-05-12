// Public API for the auto-tagging subsystem.
//
// Single entry point for external consumers (db/seed/seeders/seed-core.ts,
// features/products/service.ts, future routes). Internal runners and tests
// import from the concrete module paths.

export {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  type AutoTagPair,
  type AutoTagRelevance,
  type AutoTagSource,
  detectAllAutoTags,
  type OrchestratorInput,
  type OrchestratorOptions,
} from './orchestrator'
export { type WriteTagsResult, writeTagsForProduct } from './write'
