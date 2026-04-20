import { SKINCARE_INGREDIENT_CATEGORIES } from '@habit-tracker/shared'
import { INGREDIENT_SLUGS } from '../ingredient-slugs'
import type { IngredientInput } from '../seed-ingredients'

export const TENSIOACTIFS_NETTOYANTS: IngredientInput[] = [
  {
    name: 'Gleditsia Seed Extract (Gleditsia Triacanthos Seed Extract)',
    slug: INGREDIENT_SLUGS.GLEDITSIA_TRIACANTHOS_SEED_EXTRACT,
    category: SKINCARE_INGREDIENT_CATEGORIES.TENSIOACTIF,
    description:
      "Extrait de graines d'acacia à miel, antioxydant et protecteur, utilisé pour conditionner peau et cheveux tout en stabilisant les formules.",
    content: `
  # Gleditsia Seed Extract (Gleditsia Triacanthos Seed Extract)
  Extrait de graines de févier d'Amérique (honey locust), riche en composés protecteurs, apporte conditionnement et antioxydant.
  ## INCI
  **GLEDITSIA TRIACANTHOS SEED EXTRACT**
  (Extrait de graines)
  ## Composition chimique
  - **Composés phénoliques** : Antioxydants.
  - **Polysaccharides** : Filmogènes et hydratants.
  ## Mécanisme d’action
  1. **Antioxydant** : Protège contre stress oxydatif.
  2. **Conditionnement** : Adoucit et lisse peau/cheveux.
  3. **Film protecteur** : Barrière légère non occlusive.
  4. **Stabilisation** : Améliore texture des formules.
  ## Bienfaits
  - **Protection** : Contre radicaux libres.
  - **Douceur** : Peau et cheveux plus lisses.
  - **Apaisant** : Réduit irritations.
  - **Polyvalent** : Soins peau et capillaires.
  ## Utilisation
  - **Cible** : Peaux sèches, cheveux ternes, formules naturelles.
  - **Moment** : Quotidien.
  - **Type de soin** : Conditionneurs, crèmes, shampoings.
  ## Note technique
  Souvent utilisé comme épaississant naturel ou protecteur capillaire. Bonne tolérance, origine végétale.
    `,
  },
  {
    name: 'Sodium Cocoyl Isethionate (SCI)',
    slug: INGREDIENT_SLUGS.SODIUM_COCOYL_ISETHIONATE,
    category: SKINCARE_INGREDIENT_CATEGORIES.TENSIOACTIF,
    description:
      'Surnommé "mousse de bébé", ce tensioactif solide issu de l’huile de coco offre une mousse riche et crémeuse sans effet desséchant.',
    content: `
  # Sodium Cocoyl Isethionate : La Mousse de Soie

  Le **Sodium Cocoyl Isethionate (SCI)** est l'ingrédient phare de la cosmétique solide et des syndets de luxe. Sa structure moléculaire unique lui permet de nettoyer la peau en profondeur tout en laissant un fini doux et hydraté, contrairement aux savons traditionnels.

  ---

  ## ✨ Points Forts & Bénéfices
  * **Onctuosité Incomparable** : Produit une mousse dense, stable et crémeuse, même en eau calcaire.
  * **Effet Conditionneur** : Laisse un film protecteur léger sur la peau et les cheveux, facilitant le démêlage.
  * **Polyvalence** : L'ingrédient de choix pour les shampoings solides et les pains dermatologiques "sans savon".

  ---

  ## ⚖️ Transparence Scientifique & Limites
  * **Procédé de Fabrication** : Bien que d'origine naturelle (coco), son mode de production (éthoxylation) est un sujet de débat pour les labels bio les plus stricts.
  * **Sensibilité à l'Humidité** : Dans les produits solides, il peut rendre le produit mou s'il n'est pas correctement formulé avec des cires ou des beurres.

  ---

  ## 🛡️ Précautions & Sécurité
  * **Usage Externe** : Sous forme de poudre pure, il est très volatil et irritant pour les voies respiratoires du formulateur. Une fois intégré au produit fini, il est parfaitement sûr.
  `,
  },
  {
    name: 'Coco-Glucoside',
    slug: INGREDIENT_SLUGS.COCO_GLUCOSIDE,
    category: SKINCARE_INGREDIENT_CATEGORIES.TENSIOACTIF,
    description:
      'Un tensioactif non-ionique ultra-doux issu de la noix de coco et du sucre, conçu pour nettoyer la peau sans altérer son précieux film hydrolipidique.',
    content: `
  # Le Coco-Glucoside : La Caresse Nettoyante

  Loin des détergents sulfatés agressifs, le **Coco-Glucoside** incarne la nouvelle génération du nettoyage respectueux. Obtenu par la condensation de l'alcool de coco et du glucose, ce tensioactif biodégradable réconcilie efficacité purifiante et haute tolérance cutanée.

  ---

  ## ✨ Points Forts & Bénéfices
  * **Nettoyage Physiologique** : Élimine les impuretés et l'excès de sébum tout en respectant l'équilibre du microbiome.
  * **Douceur Extrême** : Particulièrement recommandé pour les peaux sensibles, atopiques ou les produits destinés aux nourrissons.
  * **Éco-Responsabilité** : Origine 100% végétale et renouvelable, avec une biodégradabilité exemplaire.
  * **Agent de Texture** : Améliore la viscosité et la qualité de la mousse pour une expérience sensorielle onctueuse.

  ---

  ## ⚖️ Transparence Scientifique & Limites
  * **Pouvoir Moussant** : Bien que très doux, son pouvoir moussant est naturellement inférieur aux sulfates synthétiques. Il nécessite souvent une formulation experte pour offrir une mousse généreuse.
  * **Pouvoir Détergent** : Pour les maquillages très tenaces ou "waterproof", il peut s'avérer insuffisant s'il n'est pas associé à d'autres agents nettoyants ou huiles.

  ---

  ## 🛡️ Précautions & Sécurité
  * **Innocuité** : Considéré comme l'un des tensioactifs les moins irritants du marché.
  * **Allergies** : Très rares cas d'allergies de contact rapportés, principalement chez des sujets déjà sensibilisés aux glucosides.
  `,
  },
  {
    name: 'Sodium Lauroyl Methyl Isethionate',
    slug: INGREDIENT_SLUGS.SODIUM_LAUROYL_METHYL_ISETHIONATE,
    category: SKINCARE_INGREDIENT_CATEGORIES.TENSIOACTIF,
    description:
      'Tensioactif anionique doux offrant une mousse crémeuse et un nettoyage efficace tout en restant plus tolérant que les sulfates classiques.',
    content: `
# Sodium Lauroyl Methyl Isethionate
Le Sodium Lauroyl Methyl Isethionate est un tensioactif anionique doux dérivé d’acides gras. Il est souvent utilisé comme alternative plus douce aux sulfates traditionnels.

## INCI
**SODIUM LAUROYL METHYL ISETHIONATE**

## Points forts
- **Mousse riche et crémeuse** : Sensation agréable à l’application.
- **Moins irritant que les sulfates** : Alternative au SLS/SLES.
- **Nettoyage efficace** : Élimine sébum et impuretés.
- **Bonne compatibilité cutanée** : Adapté aux formules dermatologiques.

## Rôle dans les soins
Très utilisé dans les nettoyants solides, pains dermatologiques et gels lavants doux pour améliorer la texture et la sensorialité.

## Utilisation
- **Cible** : Peaux normales à sensibles.
- **Type de soin** : Nettoyants visage, pains dermatologiques, gels douche doux.
`,
  },
  {
    name: 'Decyl Glucoside',
    slug: INGREDIENT_SLUGS.DECYL_GLUCOSIDE,
    category: SKINCARE_INGREDIENT_CATEGORIES.TENSIOACTIF,
    description:
      'Tensioactif non ionique particulièrement doux, adapté aux peaux sensibles et aux formules nettoyantes délicates.',
    content: `
# Decyl Glucoside
Le Decyl Glucoside est un tensioactif non ionique dérivé de sucre et d’alcool gras végétal. Il est réputé pour sa grande douceur.

## INCI
**DECYL GLUCOSIDE**

## Points forts
- **Très doux** : Convient aux peaux sensibles et réactives.
- **Nettoyage respectueux** : Préserve le film hydrolipidique.
- **Mousse modérée** : Nettoyage efficace sans décapage.
- **Biodégradable** : Profil écologique favorable.

## Rôle dans les soins
Souvent utilisé dans les nettoyants pour bébés ou les formules dermatologiques destinées aux peaux fragiles.

## Utilisation
- **Cible** : Peaux sensibles, sèches ou réactives.
- **Type de soin** : Nettoyants visage doux, gels intimes, shampoings doux.
`,
  },
  {
    name: 'PEG-20 Glyceryl Triisostearate',
    slug: INGREDIENT_SLUGS.PEG_20_GLYCERYL_TRIISOSTEARATE,
    category: SKINCARE_INGREDIENT_CATEGORIES.TENSIOACTIF,
    description:
      'Émulsifiant très efficace utilisé principalement dans les huiles et baumes démaquillants pour permettre un rinçage parfait à l’eau.',
    content: `
# PEG-20 Glyceryl Triisostearate : Le Secret du Démaquillage à l'Eau

Le **PEG-20 Glyceryl Triisostearate** est un agent émulsifiant de référence pour les formules huileuses. Sa fonction principale est de transformer l'huile en émulsion lactée au contact de l'eau, permettant d'éliminer toutes les traces de gras et de maquillage sans laisser de film résiduel.

## ✨ Points Forts & Bénéfices
* **Rinçage Exceptionnel** : Permet aux baumes et huiles de se rincer totalement à l'eau, évitant l'effet "film gras" sur la vue ou la peau.
* **Efficacité Solubilisante** : Aide à dissoudre les pigments du maquillage (même waterproof) et les filtres solaires.
* **Douceur** : Très bien toléré, il ne nécessite pas de frottement excessif de la peau.

## ⚖️ Transparence Scientifique & Limites
* **Origine** : C'est un ingrédient éthoxylé (synthétique), ce qui l'exclut généralement des chartes de cosmétique naturelle stricte.
* **Biodégradabilité** : Bien que sûr pour la peau, son impact environnemental est plus discuté que celui des tensioactifs purement végétaux.

## 🛡️ Précautions & Sécurité
* **Innocuité** : Largement utilisé et considéré comme sûr dans les produits rincés.
`,
  },
]
