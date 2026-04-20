import type { ProductCategory } from '@habit-tracker/shared'
import { PRODUCT_KINDS } from '@habit-tracker/shared'
import type { UnifiedProductSeed, Ingredient, ProductTagGroups } from './types'

const kindToCategory: Record<string, ProductCategory> = Object.fromEntries(
  (Object.entries(PRODUCT_KINDS) as [ProductCategory, Record<string, string>][]).flatMap(
    ([cat, kinds]) => Object.values(kinds).map((k) => [k, cat]),
  ),
)

// Brand imports
import { ABIB_SEED } from './abib/abib.seed'
import { ANUA_SEED } from './anua/anua.seed'
import { ADERMA_SEED } from './aDerma/aDerma.seed'
import { BIODERMA_SEED } from './bioderma/bioderma.seed'
import { AESTURA_SEED } from './aestura/aestura.seed'
import { TORRIDEN_SEED } from './torriden/torriden.seed'
import { PURITO_SEED } from './purito/purito.seed'
import { PAI_SEED } from './pai/pai.seed'
import { DIEUX_SEED } from './dieux/dieux.seed'
import { INNISFREE_SEED } from './innisfree/innisfree.seed'
import { DR_ALTHEA_SEED } from './drAlthea/drAlthea.seed'
import { DR_JART_SEED } from './dr-jart/dr-jart.seed'
import { DERMALOGICA_SEED } from './dermalogica/dermalogica.seed'
import { DERMACEUTIC_SEED } from './dermaceutic/dermaceutic.seed'
import { ISNTREE_SEED } from './isntree/isntree.seed'
import { MEDICUBE_SEED } from './medicube/medicube.seed'
import { NUMBUZIN_SEED } from './numbuzin/numbuzin.seed'
import { ETUDE_HOUSE_SEED } from './etude-house/etude-house.seed'
import { HARUHARU_SEED } from './haruharu/haruharu.seed'
import { DUCRAY_SEED } from './ducray/ducray.seed'
import { SK_II_SEED } from './skII/skII.seed'
import { ROUND_LAB_SEED } from './roundlab/roundlab.seed'
import { MIXSOON_SEED } from './mixsoon/mixsoon.seed'
import { PREQUEL_SEED } from './prequel/prequel.seed'
import { SULWHASOO_SEED } from './sulwhasoo/sulwhasoo.seed'
import { SOME_BY_MI_SEED } from './somebymi/somebymi.seed'
import { SOL_DE_JANEIRO_SEED } from './sol-de-janeiro/sol-de-janeiro.seed'
import { MEDIK8_SEED } from './medik8/medik8.seed'
import { REMEDY_SEED } from './remedy/remedy.seed'
import { COSRX_SEED } from './cosrx/cosrx.seed'
import { DR_G_SEED } from './dr-g/dr-g.seed'
import { NOREVA_SEED } from './noreva/noreva.seed'
import { ACM_SEED } from './acm/acm.seed'
import { EUCERIN_SEED } from './eucerin/eucerin.seed'
import { IM_FROM_SEED } from './im-from/im-from.seed'
import { EQQUALBERRY_SEED } from './eqqualberry/eqqualberry.seed'
import { THE_ORDINARY_SEED } from './theOrdinary/theOrdinary.seed'
import { NIOD_SEED } from './niod/niod.seed'
import { NOOANCE_SEED } from './nooance/nooance.seed'
import { SEPHORA_SEED } from './sephora/sephora.seed'
import { MIXA_SEED } from './mixa/mixa.seed'
import { MEME_CANCER_SEED } from './memeCancer/memeCancer.seed'
import { AROMA_ZONE_SEED } from './aromaZone/aromaZone.seed'
import { CERAVE_SEED } from './cerave/cerave.seed'
import { AMLACTIN_SEED } from './amlactin/amlactin.seed'
import { PAULAS_CHOICE_SEED } from './paulasChoice/paulasChoice.seed'
import { BYOMA_SEED } from './byoma/byoma.seed'
import { TOPICREM_SEED } from './topicrem/topicrem.seed'
import { SKINCEUTICALS_SEED } from './skinCeuticals/skinCeuticals.seed'
import { THE_INKEY_LIST_SEED } from './theInkeyList/theInkeyList.seed'
import { ISDIN_SEED } from './isdin/isdin.seed'
import { DR_IDRISS_SEED } from './drIdriss/drIdriss.seed'
import { GARANCIA_SEED } from './garancia/garancia.seed'
import { GEEK_AND_GORGEOUS_SEED } from './geekAndGorgeous/geekAndGorgeous.seed'
import { FILORGA_SEED } from './filorga/filorga.seed'
import { URIAGE_SEED } from './uriage/uriage.seed'
import { RIEMANN_SEED } from './riemann/riemann.seed'
import { THERAMID_SEED } from './theramid/theramid.seed'
import { AZELAIQUE_SEED } from './azelaique/azelaique.seed'
import { NINE_LESS_SEED } from './nineLess/nineLess.seed'
import { ALLIES_OF_SKIN_SEED } from './alliesOfSkin/alliesOfSkin.seed'
import { TYPOLOGY_SEED } from './typology/typology.seed'
import { TIRTIR_SEED } from './tirtir/tirtir.seed'
import { VT_SEED } from './vt/vt.seed'
import { AVENE_SEED } from './avene/avene.seed'
import { BEAUTY_OF_JOSEON_SEED } from './beautyOfJoseon/beautyOfJoseon.seed'
import { COLIBRI_SEED } from './colibri/colibri.seed'
import { CYLA_SEED } from './cyla/cyla.seed'
import { ISISPHARMA_SEED } from './isispharma/isispharma.seed'
import { MAD_ABOUT_SKIN_SEED } from './madAboutSkin/madAboutSkin.seed'
import { LAB_BIARRITZ_SEED } from './labBiarritz/labBiarritz.seed'
import { LA_ROCHE_POSAY_SEED } from './laRochePosay/laRochePosay.seed'
import { DERMEDEN_SEED } from './dermeden/dermeden.seed'
import { OCCITANE_SEED } from './occitane/occitane.seed'
import { SVR_SEED } from './svr/svr.seed'
import { SKIN1004_SEED } from './skin1004/skin1004.seed'
import { SHISEIDO_SEED } from './shiseido/shiseido.seed'
import { WELEDA_SEED } from './weleda/weleda.seed'
import { VICHY_LABORATORIES_SEED } from './vichy-laboratories/vichy-laboratories.seed'
import { IUNIK_SEED } from './iunik/iunik.seed'
import { MISSHA_SEED } from './missha/missha.seed'

// Aggregation

const allUnified: UnifiedProductSeed[] = [
  ...ABIB_SEED,
  ...ANUA_SEED,
  ...ADERMA_SEED,
  ...BIODERMA_SEED,
  ...AESTURA_SEED,
  ...TORRIDEN_SEED,
  ...PURITO_SEED,
  ...PAI_SEED,
  ...DIEUX_SEED,
  ...INNISFREE_SEED,
  ...DR_ALTHEA_SEED,
  ...DR_JART_SEED,
  ...DERMALOGICA_SEED,
  ...DERMACEUTIC_SEED,
  ...ISNTREE_SEED,
  ...MEDICUBE_SEED,
  ...NUMBUZIN_SEED,
  ...ETUDE_HOUSE_SEED,
  ...HARUHARU_SEED,
  ...DUCRAY_SEED,
  ...SK_II_SEED,
  ...ROUND_LAB_SEED,
  ...MIXSOON_SEED,
  ...PREQUEL_SEED,
  ...SULWHASOO_SEED,
  ...SOME_BY_MI_SEED,
  ...SOL_DE_JANEIRO_SEED,
  ...MEDIK8_SEED,
  ...REMEDY_SEED,
  ...COSRX_SEED,
  ...DR_G_SEED,
  ...NOREVA_SEED,
  ...ACM_SEED,
  ...EUCERIN_SEED,
  ...IM_FROM_SEED,
  ...EQQUALBERRY_SEED,
  ...THE_ORDINARY_SEED,
  ...NIOD_SEED,
  ...NOOANCE_SEED,
  ...SEPHORA_SEED,
  ...MIXA_SEED,
  ...MEME_CANCER_SEED,
  ...AROMA_ZONE_SEED,
  ...CERAVE_SEED,
  ...AMLACTIN_SEED,
  ...PAULAS_CHOICE_SEED,
  ...BYOMA_SEED,
  ...TOPICREM_SEED,
  ...SKINCEUTICALS_SEED,
  ...THE_INKEY_LIST_SEED,
  ...ISDIN_SEED,
  ...DR_IDRISS_SEED,
  ...GARANCIA_SEED,
  ...GEEK_AND_GORGEOUS_SEED,
  ...FILORGA_SEED,
  ...URIAGE_SEED,
  ...RIEMANN_SEED,
  ...THERAMID_SEED,
  ...AZELAIQUE_SEED,
  ...NINE_LESS_SEED,
  ...ALLIES_OF_SKIN_SEED,
  ...TYPOLOGY_SEED,
  ...TIRTIR_SEED,
  ...VT_SEED,
  ...AVENE_SEED,
  ...BEAUTY_OF_JOSEON_SEED,
  ...COLIBRI_SEED,
  ...CYLA_SEED,
  ...ISISPHARMA_SEED,
  ...MAD_ABOUT_SKIN_SEED,
  ...LAB_BIARRITZ_SEED,
  ...LA_ROCHE_POSAY_SEED,
  ...DERMEDEN_SEED,
  ...OCCITANE_SEED,
  ...SVR_SEED,
  ...SKIN1004_SEED,
  ...SHISEIDO_SEED,
  ...WELEDA_SEED,
  ...VICHY_LABORATORIES_SEED,
  ...IUNIK_SEED,
  ...MISSHA_SEED,
]

// Derived exports (previously split across 4 files)

export const allProductData = allUnified.map(({ tags: _tags, keyIngredients: _ki, ...product }) => ({
  category: kindToCategory[product.kind],
  ...product,
}))

export const allProductTagsMap: Record<string, ProductTagGroups> = Object.fromEntries(
  allUnified.map((p) => [p.slug, p.tags]),
)

const allProductIngredientsMap: Record<string, Ingredient[]> = Object.fromEntries(
  allUnified
    .filter((p) => p.keyIngredients && p.keyIngredients.length > 0)
    .map((p) => [p.slug, p.keyIngredients!]),
)

export { allProductIngredientsMap as ALL_PRODUCT_INGREDIENTS_MAP }

export const allIngredientProductTags = Object.entries(allProductIngredientsMap).flatMap(
  ([productSlug, ings]) =>
    ings.map((ing) => ({
      productSlug,
      ingredientSlug: ing.slug,
      concentrationValue: ing.concentrationValue ?? ing.value ?? null,
      concentrationUnit: ing.concentrationUnit ?? ing.unit ?? null,
      notes: ing.notes ?? null,
    })),
)
