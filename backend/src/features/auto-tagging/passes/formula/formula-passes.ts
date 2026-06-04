// Formula pass family (ADR-0001).
//
// Every formula detector emits `source: 'formula'`, `relevance: 'secondary'`,
// so the family is one declarative table instead of N hand-written `Pass`
// objects. `formulaPass` stamps the shared metadata; each row binds the
// `PassContext` fields its detector reads. Detector signatures are unchanged —
// they stay directly unit-tested in `tests/formula.test.ts`.
//
// Order is load-bearing: it is the pass-4 dedup tiebreaker (first-emitting pass
// owns the source attribution) and is pinned by the orchestrator parity test.
// `peauNormalePass` is not here — it runs last and reads `prior` (own file).

import type { SkincareProductTagSlug } from '@aurore/shared'

import { asProposals } from '../../lib/pass-helpers'
import type { Pass, PassContext } from '../../lib/pass-types'
import {
  detectAbsenceClaimsFromText,
  detectAcneImperfectionsFromName,
  detectAntiAgeFromName,
  detectApaisantFromName,
  detectBarriereCutaneeFromName,
  detectCernesPoches,
  detectDeshydratationFromName,
  detectEclatTeintFromName,
  detectEczemaAtopieFromName,
  detectFiniMat,
  detectHyperpigmentationFromName,
  detectKeratosePilaire,
  detectNonGras,
  detectOcclusifTags,
  detectPigmentsVerts,
  detectPoresSebumFromName,
  detectPrebiotique,
  detectProtection,
  detectReparationCutanee,
  detectRepulpant,
  detectRougeursVasculairesFromName,
  detectSansSavon,
  detectSemiOcclusif,
  detectSolaireTags,
  detectStepNettoyage1,
  detectTextureBaumeFromName,
  detectTextureCremeEyeInci,
  detectTextureCremeInci,
  detectTextureFromField,
  detectTextureGelInci,
  detectTextureLegere,
  detectTextureRiche,
  detectTextureStickFromName,
} from '.'

function formulaPass(
  name: string,
  detect: (ctx: PassContext) => readonly SkincareProductTagSlug[]
): Pass {
  return { name, run: (ctx) => asProposals(detect(ctx), 'formula') }
}

// Pass 4. Same order as the pre-cutover orchestrator (preserves dedup outcomes).
export const FORMULA_PASSES: readonly Pass[] = [
  formulaPass('formula:occlusif', (c) => detectOcclusifTags(c.inci, c.normalizedIngredients)),
  formulaPass('formula:semi-occlusif', (c) =>
    detectSemiOcclusif(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:solaire', (c) =>
    detectSolaireTags(c.inci, c.kind, c.category, c.normalizedIngredients)
  ),
  formulaPass('formula:prebiotique', (c) => detectPrebiotique(c.inci, c.normalizedIngredients)),
  formulaPass('formula:protection', (c) => detectProtection(c.kind, c.name, c.description)),
  formulaPass('formula:reparation-cutanee', (c) =>
    detectReparationCutanee(c.inci, c.normalizedIngredients)
  ),
  formulaPass('formula:eczema-atopie-name', (c) =>
    detectEczemaAtopieFromName(c.name, c.description)
  ),
  formulaPass('formula:rougeurs-vasculaires-name', (c) =>
    detectRougeursVasculairesFromName(c.name, c.description)
  ),
  formulaPass('formula:hyperpigmentation-name', (c) =>
    detectHyperpigmentationFromName(c.name, c.description)
  ),
  formulaPass('formula:eclat-teint-name', (c) => detectEclatTeintFromName(c.name, c.description)),
  formulaPass('formula:pores-sebum-name', (c) => detectPoresSebumFromName(c.name, c.description)),
  formulaPass('formula:deshydratation-name', (c) =>
    detectDeshydratationFromName(c.name, c.description)
  ),
  formulaPass('formula:acne-imperfections-name', (c) =>
    detectAcneImperfectionsFromName(c.name, c.description)
  ),
  formulaPass('formula:anti-age-name', (c) => detectAntiAgeFromName(c.name, c.description)),
  formulaPass('formula:barriere-cutanee-name', (c) =>
    detectBarriereCutaneeFromName(c.name, c.description)
  ),
  formulaPass('formula:apaisant-name', (c) => detectApaisantFromName(c.name, c.description)),
  formulaPass('formula:repulpant', (c) => detectRepulpant(c.inci, c.kind, c.normalizedIngredients)),
  formulaPass('formula:keratose-pilaire', (c) =>
    detectKeratosePilaire(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:sans-savon', (c) =>
    detectSansSavon(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:step-nettoyage-1', (c) =>
    detectStepNettoyage1(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:cernes-poches', (c) =>
    detectCernesPoches(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:fini-mat', (c) => detectFiniMat(c.inci, c.normalizedIngredients)),
  formulaPass('formula:texture-riche', (c) => detectTextureRiche(c.inci, c.normalizedIngredients)),
  formulaPass('formula:texture-legere', (c) =>
    detectTextureLegere(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:non-gras', (c) => detectNonGras(c.inci, c.kind, c.normalizedIngredients)),
  formulaPass('formula:pigments-verts', (c) =>
    detectPigmentsVerts(c.inci, c.normalizedIngredients)
  ),
  formulaPass('formula:texture-from-field', (c) => detectTextureFromField(c.texture)),
  formulaPass('formula:texture-gel-inci', (c) =>
    detectTextureGelInci(c.inci, c.kind, c.texture, c.normalizedIngredients)
  ),
  formulaPass('formula:texture-creme-inci', (c) =>
    detectTextureCremeInci(c.inci, c.kind, c.texture, c.normalizedIngredients)
  ),
  formulaPass('formula:texture-baume-name', (c) =>
    detectTextureBaumeFromName(c.kind, c.texture, c.name)
  ),
  formulaPass('formula:texture-stick-name', (c) =>
    detectTextureStickFromName(c.kind, c.texture, c.name)
  ),
  formulaPass('formula:texture-creme-eye-inci', (c) =>
    detectTextureCremeEyeInci(c.inci, c.kind, c.texture, c.name, c.normalizedIngredients)
  ),
  formulaPass('formula:absence-claims-text', (c) =>
    detectAbsenceClaimsFromText(c.name, c.description)
  ),
]
