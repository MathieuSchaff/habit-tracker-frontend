// Re-exports the formula-pass detectors so the orchestrator imports a single
// barrel. Each file is one detector family — see the individual files for the
// full rationale of each tag's signal.

export { detectCernesPoches } from './cernes-poches'
export { detectEczemaAtopie } from './eczema-atopie'
export { detectOcclusifTags, detectSemiOcclusif } from './film-former'
export { detectFiniMat } from './fini-mat'
export { detectGrossesseAvoid, RETINOID_PATTERNS } from './grossesse-avoid'
export { detectKeratosePilaire } from './keratose-pilaire'
export { detectPeauNormale } from './peau-normale'
export { detectPigmentsVerts } from './pigments-verts'
export { detectPrebiotique } from './prebiotique'
export { detectReparationCutanee } from './reparation-cutanee'
export { detectRepulpant } from './repulpant'
export { detectSolaireTags, SOLAIRE_KINDS } from './solaire'
export { detectStepNettoyage1, IONIC_SURFACTANT_PATTERNS } from './step-nettoyage-1'
export {
  detectNonGras,
  detectTextureBaumeFromName,
  detectTextureCremeEyeInci,
  detectTextureCremeInci,
  detectTextureFromField,
  detectTextureGelInci,
  detectTextureLegere,
  detectTextureRiche,
  detectTextureStickFromName,
} from './texture'
export { detectVegan, VEGAN_MIN_INGREDIENTS } from './vegan'
