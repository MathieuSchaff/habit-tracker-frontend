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
import type { AutoTagProposal, Pass, PassContext } from '../../lib/pass-types'
import {
  ACNE_EXCLUSION_RE,
  ACNE_POSITION_RE,
  ANTI_AGE_POSITION_RE,
  ANTI_OXYDANT_POSITION_RE,
  APAISANT_EXCLUSION_RE,
  APAISANT_POSITION_RE,
  BARRIERE_EXCLUSION_RE,
  BARRIERE_POSITION_RE,
  CAMOUFLAGE_RE,
  CERNES_EXCLUSION_RE,
  CERNES_POSITION_RE,
  DESHYDRATATION_EXCLUSION_RE,
  DESHYDRATATION_POSITION_RE,
  detectAbsenceClaimsFromText,
  detectAcneImperfectionsFromName,
  detectAntiAgeFromName,
  detectAntiOxydantFromName,
  detectApaisantFromName,
  detectBarriereCutaneeFromName,
  detectCernesPochesFromName,
  detectDeshydratationFromName,
  detectEclatTeintFromName,
  detectEczemaAtopieFromName,
  detectFiniMat,
  detectHyperpigmentationFromName,
  detectKeratosePilaireFromName,
  detectNonGras,
  detectOcclusifTags,
  detectPeauGrasseFromName,
  detectPeauSecheFromName,
  detectPigmentsVerts,
  detectPoresSebumFromName,
  detectPrebiotique,
  detectProtection,
  detectReparateurFromName,
  detectReparationCutaneeFromName,
  detectRepulpant,
  detectRougeursVasculairesFromName,
  detectSansSavon,
  detectSeboRegulateurFromName,
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
  ECLAT_EXCLUSION_RE,
  ECLAT_POSITION_RE,
  KERATOSE_PILAIRE_POSITION_RE,
  PEAU_GRASSE_POSITION_RE,
  PEAU_SECHE_POSITION_RE,
  PIGMENT_EXCLUSION_RE,
  PIGMENT_POSITION_RE,
  PORES_SEBUM_POSITION_RE,
  REDNESS_POSITION_RE,
  REPARATION_EXCLUSION_RE,
  REPARATION_POSITION_RE,
} from '.'
import { matchNamePositioning } from './name-positioning'

function formulaPass(
  name: string,
  detect: (ctx: PassContext) => readonly SkincareProductTagSlug[]
): Pass {
  return { name, run: (ctx) => asProposals(detect(ctx), 'formula') }
}

// Name-positioning variant: keeps the tested detector as the emit oracle, then
// re-derives the matched name/description substring (audit evidence) from the same
// exported regex — single source, so detector and evidence cannot drift.
// `positionRe` must be non-global: a /g flag carries lastIndex across calls and
// would intermittently drop the re-derived evidence.
function namePass(
  name: string,
  detect: (ctx: PassContext) => readonly SkincareProductTagSlug[],
  positionRe: RegExp,
  exclusionRe?: RegExp
): Pass {
  return {
    name,
    run: (ctx) => {
      const slugs = detect(ctx)
      if (slugs.length === 0) return []
      const evidence = matchNamePositioning(ctx.name, ctx.description, positionRe, exclusionRe)
      return slugs.map(
        (tagSlug): AutoTagProposal => ({
          tagSlug,
          relevance: 'secondary',
          source: 'formula',
          ...(evidence ? { evidence } : {}),
        })
      )
    },
  }
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
  namePass(
    'formula:reparation-cutanee-name',
    (c) => detectReparationCutaneeFromName(c.name, c.description),
    REPARATION_POSITION_RE,
    REPARATION_EXCLUSION_RE
  ),
  formulaPass('formula:eczema-atopie-name', (c) =>
    detectEczemaAtopieFromName(c.name, c.description)
  ),
  namePass(
    'formula:rougeurs-vasculaires-name',
    (c) => detectRougeursVasculairesFromName(c.name, c.description),
    REDNESS_POSITION_RE,
    CAMOUFLAGE_RE
  ),
  namePass(
    'formula:hyperpigmentation-name',
    (c) => detectHyperpigmentationFromName(c.name, c.description),
    PIGMENT_POSITION_RE,
    PIGMENT_EXCLUSION_RE
  ),
  namePass(
    'formula:eclat-teint-name',
    (c) => detectEclatTeintFromName(c.name, c.description),
    ECLAT_POSITION_RE,
    ECLAT_EXCLUSION_RE
  ),
  namePass(
    'formula:pores-sebum-name',
    (c) => detectPoresSebumFromName(c.name, c.description),
    PORES_SEBUM_POSITION_RE
  ),
  namePass(
    'formula:sebo-regulateur-name',
    (c) => detectSeboRegulateurFromName(c.name, c.description),
    PORES_SEBUM_POSITION_RE
  ),
  namePass(
    'formula:peau-grasse-name',
    (c) => detectPeauGrasseFromName(c.name, c.description),
    PEAU_GRASSE_POSITION_RE
  ),
  namePass(
    'formula:peau-seche-name',
    (c) => detectPeauSecheFromName(c.name, c.description),
    PEAU_SECHE_POSITION_RE
  ),
  namePass(
    'formula:deshydratation-name',
    (c) => detectDeshydratationFromName(c.name, c.description),
    DESHYDRATATION_POSITION_RE,
    DESHYDRATATION_EXCLUSION_RE
  ),
  namePass(
    'formula:acne-imperfections-name',
    (c) => detectAcneImperfectionsFromName(c.name, c.description),
    ACNE_POSITION_RE,
    ACNE_EXCLUSION_RE
  ),
  namePass(
    'formula:anti-age-name',
    (c) => detectAntiAgeFromName(c.name, c.description),
    ANTI_AGE_POSITION_RE
  ),
  namePass(
    'formula:anti-oxydant-name',
    (c) => detectAntiOxydantFromName(c.name, c.description),
    ANTI_OXYDANT_POSITION_RE
  ),
  namePass(
    'formula:barriere-cutanee-name',
    (c) => detectBarriereCutaneeFromName(c.name, c.description),
    BARRIERE_POSITION_RE,
    BARRIERE_EXCLUSION_RE
  ),
  namePass(
    'formula:reparateur-name',
    (c) => detectReparateurFromName(c.name, c.description),
    BARRIERE_POSITION_RE,
    BARRIERE_EXCLUSION_RE
  ),
  namePass(
    'formula:apaisant-name',
    (c) => detectApaisantFromName(c.name, c.description),
    APAISANT_POSITION_RE,
    APAISANT_EXCLUSION_RE
  ),
  formulaPass('formula:repulpant', (c) => detectRepulpant(c.inci, c.kind, c.normalizedIngredients)),
  namePass(
    'formula:keratose-pilaire-name',
    (c) => detectKeratosePilaireFromName(c.name, c.description),
    KERATOSE_PILAIRE_POSITION_RE
  ),
  formulaPass('formula:sans-savon', (c) =>
    detectSansSavon(c.inci, c.kind, c.normalizedIngredients)
  ),
  formulaPass('formula:step-nettoyage-1', (c) =>
    detectStepNettoyage1(c.inci, c.kind, c.normalizedIngredients)
  ),
  namePass(
    'formula:cernes-poches-name',
    (c) => detectCernesPochesFromName(c.name, c.description),
    CERNES_POSITION_RE,
    CERNES_EXCLUSION_RE
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
