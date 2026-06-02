// Pass wrappers for the formula detector family, ADR-0001 slice #3b.
//
// All emit `source: 'formula'`, `relevance: 'secondary'`. Each wrapper is a
// thin adapter binding the `PassContext` fields its underlying detector reads.
// Detector internals are unchanged; the wrappers exist only so the orchestrator
// can iterate a uniform `Pass[]` registry.
//
// `occlusifPass` (film-former-pass.ts) and `peauNormalePass` (peau-normale-pass.ts)
// were established in slice #2 and live in their own files.

import { asProposals } from '../../lib/pass-helpers'
import type { Pass } from '../../lib/pass-types'
import {
  detectAbsenceClaimsFromText,
  detectCernesPoches,
  detectEczemaAtopieFromName,
  detectFiniMat,
  detectKeratosePilaire,
  detectNonGras,
  detectPigmentsVerts,
  detectPrebiotique,
  detectProtection,
  detectReparationCutanee,
  detectRepulpant,
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

export const semiOcclusifPass: Pass = {
  name: 'formula:semi-occlusif',
  run: (ctx) =>
    asProposals(detectSemiOcclusif(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const solairePass: Pass = {
  name: 'formula:solaire',
  run: (ctx) =>
    asProposals(
      detectSolaireTags(ctx.inci, ctx.kind, ctx.category, ctx.normalizedIngredients),
      'formula'
    ),
}

export const prebiotiquePass: Pass = {
  name: 'formula:prebiotique',
  run: (ctx) => asProposals(detectPrebiotique(ctx.inci, ctx.normalizedIngredients), 'formula'),
}

export const reparationCutaneePass: Pass = {
  name: 'formula:reparation-cutanee',
  run: (ctx) =>
    asProposals(detectReparationCutanee(ctx.inci, ctx.normalizedIngredients), 'formula'),
}

export const protectionPass: Pass = {
  name: 'formula:protection',
  run: (ctx) => asProposals(detectProtection(ctx.kind, ctx.name, ctx.description), 'formula'),
}

export const eczemaAtopieNamePass: Pass = {
  name: 'formula:eczema-atopie-name',
  run: (ctx) => asProposals(detectEczemaAtopieFromName(ctx.name, ctx.description), 'formula'),
}

export const repulpantPass: Pass = {
  name: 'formula:repulpant',
  run: (ctx) =>
    asProposals(detectRepulpant(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const keratosePilairePass: Pass = {
  name: 'formula:keratose-pilaire',
  run: (ctx) =>
    asProposals(detectKeratosePilaire(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const stepNettoyage1Pass: Pass = {
  name: 'formula:step-nettoyage-1',
  run: (ctx) =>
    asProposals(detectStepNettoyage1(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const cernesPochesPass: Pass = {
  name: 'formula:cernes-poches',
  run: (ctx) =>
    asProposals(detectCernesPoches(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const finiMatPass: Pass = {
  name: 'formula:fini-mat',
  run: (ctx) => asProposals(detectFiniMat(ctx.inci, ctx.normalizedIngredients), 'formula'),
}

export const textureRichePass: Pass = {
  name: 'formula:texture-riche',
  run: (ctx) => asProposals(detectTextureRiche(ctx.inci, ctx.normalizedIngredients), 'formula'),
}

export const textureLegerePass: Pass = {
  name: 'formula:texture-legere',
  run: (ctx) =>
    asProposals(detectTextureLegere(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const nonGrasPass: Pass = {
  name: 'formula:non-gras',
  run: (ctx) =>
    asProposals(detectNonGras(ctx.inci, ctx.kind, ctx.normalizedIngredients), 'formula'),
}

export const pigmentsVertsPass: Pass = {
  name: 'formula:pigments-verts',
  run: (ctx) => asProposals(detectPigmentsVerts(ctx.inci, ctx.normalizedIngredients), 'formula'),
}

export const textureFromFieldPass: Pass = {
  name: 'formula:texture-from-field',
  run: (ctx) => asProposals(detectTextureFromField(ctx.texture), 'formula'),
}

export const textureGelInciPass: Pass = {
  name: 'formula:texture-gel-inci',
  run: (ctx) =>
    asProposals(
      detectTextureGelInci(ctx.inci, ctx.kind, ctx.texture, ctx.normalizedIngredients),
      'formula'
    ),
}

export const textureCremeInciPass: Pass = {
  name: 'formula:texture-creme-inci',
  run: (ctx) =>
    asProposals(
      detectTextureCremeInci(ctx.inci, ctx.kind, ctx.texture, ctx.normalizedIngredients),
      'formula'
    ),
}

export const textureBaumeNamePass: Pass = {
  name: 'formula:texture-baume-name',
  run: (ctx) => asProposals(detectTextureBaumeFromName(ctx.kind, ctx.texture, ctx.name), 'formula'),
}

export const textureStickNamePass: Pass = {
  name: 'formula:texture-stick-name',
  run: (ctx) => asProposals(detectTextureStickFromName(ctx.kind, ctx.texture, ctx.name), 'formula'),
}

export const textureCremeEyeInciPass: Pass = {
  name: 'formula:texture-creme-eye-inci',
  run: (ctx) =>
    asProposals(
      detectTextureCremeEyeInci(
        ctx.inci,
        ctx.kind,
        ctx.texture,
        ctx.name,
        ctx.normalizedIngredients
      ),
      'formula'
    ),
}

export const absenceClaimsTextPass: Pass = {
  name: 'formula:absence-claims-text',
  run: (ctx) => asProposals(detectAbsenceClaimsFromText(ctx.name, ctx.description), 'formula'),
}
