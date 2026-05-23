// Re-exports the formula-pass detectors so the orchestrator imports a single
// barrel. Each file is one detector family — see the individual files for the
// full rationale of each tag's signal.

export { detectAbsenceClaimsFromText } from './absence-claims'
export { detectCernesPoches } from './cernes-poches'
export { detectEczemaAtopie } from './eczema-atopie'
export { detectOcclusifTags, detectSemiOcclusif } from './film-former'
export { detectFiniMat } from './fini-mat'
export { detectKeratosePilaire } from './keratose-pilaire'
export { detectPeauNormale } from './peau-normale'
export { detectPigmentsVerts } from './pigments-verts'
export { detectPrebiotique } from './prebiotique'
export { detectReparationCutanee } from './reparation-cutanee'
export { detectRepulpant } from './repulpant'
export { detectSolaireTags } from './solaire'
export { detectStepNettoyage1 } from './step-nettoyage-1'
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
