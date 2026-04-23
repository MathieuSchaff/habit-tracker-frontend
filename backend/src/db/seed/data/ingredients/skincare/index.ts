import type { IngredientInput } from '../types'
import { ACTIFS_ANTI_AGE_REPARATEURS } from './actifs-anti-age-reparateurs'
import { ANTI_ACNE_SEBUM } from './anti-acne-sebum'
import { ANTI_ROSACEE_VASOCONSTRICTEURS } from './anti-rosacee-vasoconstricteurs'
import { ANTIOXYDANTS_VITAMINES } from './antioxydants-vitamines'
import { APAISANTS_ANTI_INFLAMMATOIRES } from './apaisants-anti-inflammatoires'
import { BARRIERE_EMOLLIENTS_OCCLUSIFS } from './barriere-emollients-occlusifs'
import { CIRCULATOIRE_DRAINAGE } from './circulatoire-drainage'
import { DIVERS_NON_CLASSES } from './divers-non-classes'
import { ECLAIRCISSANTS_DEPIGMENTANTS } from './eclaircissants-depigmentants'
import { EXFOLIANTS } from './exfoliants'
import { FILLERS } from './fillers'
import { FILTRES_UV } from './filtres-uv'
import { HUMECTANTS } from './humectants'
import { PEPTIDES } from './peptides'
import { PROBIOTIQUES_PREBIOTIQUES_POSTBIOTIQUES } from './probiotiques-prebiotiques-postbiotiques'
import { RETINOIDES } from './retinoides'
import { TENSIOACTIFS_NETTOYANTS } from './tensioactifs-nettoyants'
import { TEXTURANTS_FONCTIONNELS } from './texturants-fonctionnels'

export const skincareIngredients: IngredientInput[] = [
  ...HUMECTANTS,
  ...BARRIERE_EMOLLIENTS_OCCLUSIFS,
  ...EXFOLIANTS,
  ...RETINOIDES,
  ...PEPTIDES,
  ...ANTIOXYDANTS_VITAMINES,
  ...APAISANTS_ANTI_INFLAMMATOIRES,
  ...ECLAIRCISSANTS_DEPIGMENTANTS,
  ...ANTI_ACNE_SEBUM,
  ...ANTI_ROSACEE_VASOCONSTRICTEURS,
  ...FILTRES_UV,
  ...PROBIOTIQUES_PREBIOTIQUES_POSTBIOTIQUES,
  ...ACTIFS_ANTI_AGE_REPARATEURS,
  ...CIRCULATOIRE_DRAINAGE,
  ...TENSIOACTIFS_NETTOYANTS,
  ...TEXTURANTS_FONCTIONNELS,
  ...FILLERS,
  ...DIVERS_NON_CLASSES,
]
