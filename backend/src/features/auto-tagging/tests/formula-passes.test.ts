// Shape tests for the 20 formula-family pass wrappers (ADR-0001 slice #3b).
//
// Each wrapper does `asProposals(detector(ctx fields), 'formula')`. The test
// verifies that the wrapper's output equals the raw detector output mapped
// the same way — catches arg-order bugs, dropped fields, wrong source string.
//
// `occlusifPass` (slice #2) and `peauNormalePass` (slice #2) live in their
// own test files.

import { describe, expect, test } from 'bun:test'

import type { ProductKind, ProductTexture, SkincareProductTagSlug } from '@aurore/shared'

import { analyzeINCI, normalize, splitINCI } from 'algo-derm'

import { mapKindToContext } from '../../../lib/algo-derm-product-context'
import { stripMarketingPreamble } from '../lib/ingredient-resolver'
import { asProposals } from '../lib/pass-helpers'
import type { Pass, PassContext } from '../lib/pass-types'
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
} from '../passes/formula'
import {
  absenceClaimsTextPass,
  cernesPochesPass,
  eczemaAtopieNamePass,
  finiMatPass,
  keratosePilairePass,
  nonGrasPass,
  pigmentsVertsPass,
  prebiotiquePass,
  protectionPass,
  reparationCutaneePass,
  repulpantPass,
  semiOcclusifPass,
  solairePass,
  stepNettoyage1Pass,
  textureBaumeNamePass,
  textureCremeEyeInciPass,
  textureCremeInciPass,
  textureFromFieldPass,
  textureGelInciPass,
  textureLegerePass,
  textureRichePass,
  textureStickNamePass,
} from '../passes/formula/formula-passes'

function makeCtx(input: {
  inci?: string | null
  kind: ProductKind
  category: string
  texture?: ProductTexture | null
  name?: string | null
  description?: string | null
}): PassContext {
  const inci = input.inci ?? null
  const hasInci = !!inci?.trim()
  const cleanedInci = hasInci ? stripMarketingPreamble(inci ?? '') : ''
  const ingredients = hasInci ? splitINCI(cleanedInci) : []
  const normalizedIngredients = hasInci ? ingredients.map(normalize) : []
  const assessment = hasInci
    ? analyzeINCI(cleanedInci, { context: mapKindToContext(input.kind) })
    : undefined
  return {
    inci,
    kind: input.kind,
    category: input.category,
    brand: null,
    texture: input.texture ?? null,
    name: input.name ?? null,
    description: input.description ?? null,
    percentClaims: undefined,
    knownConcentrations: undefined,
    brandCertifications: undefined,
    hasInci,
    cleanedInci,
    ingredients,
    normalizedIngredients,
    assessment,
    detectAutoTagsOptions: {},
  }
}

// Cases tuned to actually trigger their detector — the equality check still
// works when the detector emits []. `expectNonEmpty: true` means the fixture
// is rich enough that the detector should fire; flags wrapper-detector mismatches
// that would otherwise hide behind two trivially-empty paths.
type Case = {
  name: string
  pass: Pass
  ctx: PassContext
  expected: readonly SkincareProductTagSlug[]
  expectNonEmpty?: boolean
}

// Squalane + dimethicone in top 5 (semi-occlusif signal), zero occlusive
// patterns (cera alba / petrolatum) so the semi-occlusif mutex stays clear.
const richMoisturizer = makeCtx({
  inci: 'Aqua, Glycerin, Squalane, Dimethicone, Tocopherol, Panthenol',
  kind: 'moisturizer',
  category: 'skincare',
})
const sunscreen = makeCtx({
  inci: 'Aqua, Octocrylene, Avobenzone, Homosalate, Glycerin, Tocopherol',
  kind: 'sunscreen',
  category: 'solaire',
})
const eyeCream = makeCtx({
  inci: 'Aqua, Caffeine, Glycerin, Niacinamide, Tocopherol',
  kind: 'eye-cream',
  category: 'skincare',
})
// Oil-led cleanser — triggers step-nettoyage-1 via OIL_BALM_PATTERNS top 3.
const cleanser = makeCtx({
  inci: 'Caprylic Capric Triglyceride, Olea Europaea Fruit Oil, Aqua, Glycerin',
  kind: 'cleanser',
  category: 'skincare',
})
// kind=moisturizer (not 'balm' — `TEXTURE_BAUME_NAME_KINDS` is
// {eye-cream, moisturizer}) + name with 'Baume' → texture-baume-name fires.
// Cera Alba + shea butter pos 1-2 also feed texture-riche (≥ 2 butter/wax top 8).
const baumeNamed = makeCtx({
  inci: 'Cera Alba, Butyrospermum Parkii Butter, Tocopherol',
  kind: 'moisturizer',
  category: 'skincare',
  texture: null,
  name: 'Baume Réparateur',
})
const stickNamed = makeCtx({
  inci: 'Cera Alba, Tocopherol',
  kind: 'lip-care',
  category: 'skincare',
  texture: null,
  name: 'Lip Stick',
})
const fieldTexture = makeCtx({
  kind: 'moisturizer',
  category: 'skincare',
  texture: 'gel',
})
const eczemaNamed = makeCtx({
  inci: 'Aqua, Glycerin, Butyrospermum Parkii Butter',
  kind: 'moisturizer',
  category: 'skincare',
  name: 'Baume Émollient Peau Atopique',
})
const absenceText = makeCtx({
  kind: 'serum',
  category: 'skincare',
  name: 'Sérum Sans Parfum',
  description: 'Formulé sans alcool, sans parfum, testé sous contrôle dermatologique',
})

const cases: Case[] = [
  {
    name: 'semiOcclusifPass',
    pass: semiOcclusifPass,
    ctx: richMoisturizer,
    expected: detectSemiOcclusif(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.normalizedIngredients
    ),
    expectNonEmpty: true,
  },
  {
    name: 'solairePass',
    pass: solairePass,
    ctx: sunscreen,
    expected: detectSolaireTags(
      sunscreen.inci,
      sunscreen.kind,
      sunscreen.category,
      sunscreen.normalizedIngredients
    ),
    expectNonEmpty: true,
  },
  {
    name: 'prebiotiquePass',
    pass: prebiotiquePass,
    ctx: richMoisturizer,
    expected: detectPrebiotique(richMoisturizer.inci, richMoisturizer.normalizedIngredients),
  },
  {
    name: 'protectionPass',
    pass: protectionPass,
    ctx: sunscreen,
    expected: detectProtection(sunscreen.kind, sunscreen.name, sunscreen.description),
    expectNonEmpty: true,
  },
  {
    name: 'reparationCutaneePass',
    pass: reparationCutaneePass,
    ctx: richMoisturizer,
    expected: detectReparationCutanee(richMoisturizer.inci, richMoisturizer.normalizedIngredients),
  },
  {
    name: 'repulpantPass',
    pass: repulpantPass,
    ctx: richMoisturizer,
    expected: detectRepulpant(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.normalizedIngredients
    ),
  },
  {
    name: 'keratosePilairePass',
    pass: keratosePilairePass,
    ctx: richMoisturizer,
    expected: detectKeratosePilaire(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.normalizedIngredients
    ),
  },
  {
    name: 'stepNettoyage1Pass',
    pass: stepNettoyage1Pass,
    ctx: cleanser,
    expected: detectStepNettoyage1(cleanser.inci, cleanser.kind, cleanser.normalizedIngredients),
    expectNonEmpty: true,
  },
  {
    name: 'cernesPochesPass',
    pass: cernesPochesPass,
    ctx: eyeCream,
    expected: detectCernesPoches(eyeCream.inci, eyeCream.kind, eyeCream.normalizedIngredients),
    expectNonEmpty: true,
  },
  {
    name: 'eczemaAtopieNamePass',
    pass: eczemaAtopieNamePass,
    ctx: eczemaNamed,
    expected: detectEczemaAtopieFromName(eczemaNamed.name, eczemaNamed.description),
    expectNonEmpty: true,
  },
  {
    name: 'finiMatPass',
    pass: finiMatPass,
    ctx: richMoisturizer,
    expected: detectFiniMat(richMoisturizer.inci, richMoisturizer.normalizedIngredients),
  },
  {
    name: 'textureRichePass',
    pass: textureRichePass,
    ctx: baumeNamed,
    expected: detectTextureRiche(baumeNamed.inci, baumeNamed.normalizedIngredients),
    expectNonEmpty: true,
  },
  {
    name: 'textureLegerePass',
    pass: textureLegerePass,
    ctx: richMoisturizer,
    expected: detectTextureLegere(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.normalizedIngredients
    ),
  },
  {
    name: 'nonGrasPass',
    pass: nonGrasPass,
    ctx: richMoisturizer,
    expected: detectNonGras(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.normalizedIngredients
    ),
  },
  {
    name: 'pigmentsVertsPass',
    pass: pigmentsVertsPass,
    ctx: richMoisturizer,
    expected: detectPigmentsVerts(richMoisturizer.inci, richMoisturizer.normalizedIngredients),
  },
  {
    name: 'textureFromFieldPass',
    pass: textureFromFieldPass,
    ctx: fieldTexture,
    expected: detectTextureFromField(fieldTexture.texture),
    expectNonEmpty: true,
  },
  {
    name: 'textureGelInciPass',
    pass: textureGelInciPass,
    ctx: richMoisturizer,
    expected: detectTextureGelInci(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.texture,
      richMoisturizer.normalizedIngredients
    ),
  },
  {
    name: 'textureCremeInciPass',
    pass: textureCremeInciPass,
    ctx: richMoisturizer,
    expected: detectTextureCremeInci(
      richMoisturizer.inci,
      richMoisturizer.kind,
      richMoisturizer.texture,
      richMoisturizer.normalizedIngredients
    ),
  },
  {
    name: 'textureBaumeNamePass',
    pass: textureBaumeNamePass,
    ctx: baumeNamed,
    expected: detectTextureBaumeFromName(baumeNamed.kind, baumeNamed.texture, baumeNamed.name),
    expectNonEmpty: true,
  },
  {
    name: 'textureStickNamePass',
    pass: textureStickNamePass,
    ctx: stickNamed,
    expected: detectTextureStickFromName(stickNamed.kind, stickNamed.texture, stickNamed.name),
    expectNonEmpty: true,
  },
  {
    name: 'textureCremeEyeInciPass',
    pass: textureCremeEyeInciPass,
    ctx: eyeCream,
    expected: detectTextureCremeEyeInci(
      eyeCream.inci,
      eyeCream.kind,
      eyeCream.texture,
      eyeCream.name,
      eyeCream.normalizedIngredients
    ),
  },
  {
    name: 'absenceClaimsTextPass',
    pass: absenceClaimsTextPass,
    ctx: absenceText,
    expected: detectAbsenceClaimsFromText(absenceText.name, absenceText.description),
    expectNonEmpty: true,
  },
]

describe('formula pass shape parity', () => {
  for (const c of cases) {
    test(`${c.name} wraps its detector with source='formula', relevance='secondary'`, () => {
      const out = c.pass.run(c.ctx, [])
      expect(out).toEqual(asProposals(c.expected, 'formula'))
      if (c.expectNonEmpty) expect(out.length).toBeGreaterThan(0)
    })
  }
})

describe('formula pass invariants', () => {
  test('every formula pass emits source=formula and relevance=secondary across the rich fixture', () => {
    for (const c of cases) {
      for (const p of c.pass.run(c.ctx, [])) {
        expect(p.source).toBe('formula')
        expect(p.relevance).toBe('secondary')
      }
    }
  })
})
