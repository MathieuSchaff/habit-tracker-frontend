// Skincare ingredient slug groups. Root ingredient-slugs.ts re-exports from here.
export const HUMECTANTS = {
  HYDROXYETHYL_UREA: 'hydroxyethyl-urea', // INCI: Hydroxyethyl Urea | humectant puissant, améliore l'élasticité cutanée
  GLUCOSAMINE_HCL: 'glucosamine-hcl', // INCI: Glucosamine HCl | précurseur d'acide hyaluronique, humectant doux
  SODIUM_LACTATE: 'sodium-lactate', // INCI: Sodium Lactate | sel sodique de l'acide lactique, composant NMF
  ALANINE: 'alanine', // INCI: Alanine | acide aminé NMF, réparateur et hydratant
  GLYCERIN: 'glycerin', // INCI: Glycerin | humectant star
  HYALURONIC_ACID: 'hyaluronic-acid', // INCI: Hyaluronic Acid | acide hyaluronique pur
  SODIUM_HYALURONATE: 'sodium-hyaluronate', // INCI: Sodium Hyaluronate | sel de sodium de l'acide hyaluronique (forme la plus courante)
  POLYGLUTAMIC_ACID: 'polyglutamic-acid', // INCI: Polyglutamic Acid | super-humectant (plus que HA)
  SODIUM_PCA: 'sodium-pca', // INCI: Sodium PCA | composant naturel du NMF, humectant puissant
  ARGININE_PCA: 'arginine-pca', // INCI: Arginine PCA / PCA Arginine | humectant NMF
  CALCIUM_PCA: 'calcium-pca', // INCI: Calcium PCA | humectant NMF
  UREA: 'urea', // INCI: Urea | humectant + kératolytique
  BETAINE: 'betaine', // INCI: Betaine | humectant osmolyte, souvent issu de betterave
  PENTYLENE_GLYCOL: 'pentylene-glycol', // INCI: Pentylene Glycol | humectant + conservateur doux
  PROPYLENE_GLYCOL: 'propylene-glycol', // INCI: Propylene Glycol | humectant/solvant
  GLYCERYL_GLUCOSIDE: 'glyceryl-glucoside', // INCI: Glyceryl Glucoside | humectant
  ACETYL_GLUCOSAMINE: 'acetyl-glucosamine', // INCI: Acetyl Glucosamine | dérivé aminé du glucose, humectant + éclaircissant doux
  SNOW_MUSHROOM: 'snow-mushroom', // INCI: Tremella Fuciformis Extract / Polysaccharide | super-humectant naturel
  // Acides aminés NMF
  ARGININE: 'arginine', // INCI: Arginine | acide aminé NMF, ajuste le pH
  SERINE: 'serine', // INCI: Serine | acide aminé NMF
  HISTIDINE: 'histidine', // INCI: Histidine | acide aminé NMF
  LEUCINE: 'leucine', // INCI: Leucine | acide aminé NMF
  LYSINE_HCL: 'lysine-hcl', // INCI: Lysine HCl | acide aminé NMF
  PHENYLALANINE: 'phenylalanine', // INCI: Phenylalanine | acide aminé NMF
  TYROSINE: 'tyrosine', // INCI: Tyrosine | acide aminé, précurseur mélanine
  GLUTAMINE: 'glutamine', // INCI: Glutamine | acide aminé, hydratant / réparateur
  COLLAGEN_AMINO_ACIDS: 'collagen-amino-acids', // INCI: Collagen Amino Acids | hydrolysat de collagène humectant
  XYLITYLGLUCOSIDE: 'xylitylglucoside', // INCI: Xylitylglucoside | sucre dérivé (Aquaxyl), booste hydratation profonde
  XYLITOL: 'xylitol', // INCI: Xylitol | humectant sucre naturel
  ANHYDROXYLITOL: 'anhydroxylitol', // INCI: Anhydroxylitol | dérivé xylitol, équilibre hydratation
  PCA: 'pca', // INCI: PCA | facteur d'hydratation naturel (NMF)
  TREHALOSE: 'trehalose', // INCI: Trehalose | osmolyte protecteur, hydratant stabilisant
  GLYCINE: 'glycine', // INCI: Glycine | acide aminé hydratant et apaisant
  MANNITOL: 'mannitol', // INCI: Mannitol | humectant sucre, souvent utilisé dans les complexes apaisants
} as const

export const BARRIERE_EMOLLIENTS_OCCLUSIFS = {
  CETEARYL_ALCOHOL: 'cetearyl-alcohol', // INCI: Cetearyl Alcohol | alcool gras émollient et épaississant, non asséchant
  GLYCERYL_STEARATE: 'glyceryl-stearate', // INCI: Glyceryl Stearate | émulsifiant émollient, agent de texture
  AVOCADO_OIL: 'avocado-oil', // INCI: Persea Gratissima (Avocado) Oil | huile d'avocat, nourrissante et régénérante
  CERAMIDES: 'ceramides', // INCI: Ceramide (général) ou mélange (Ceramide NP, AP, EOP...)
  CERAMIDE_NP: 'ceramide-np', // INCI: Ceramide NP (Ceramide 3)
  CERAMIDE_AP: 'ceramide-ap', // INCI: Ceramide AP (Ceramide 6-II)
  CERAMIDE_EOP: 'ceramide-eop', // INCI: Ceramide EOP (Ceramide 1)
  CERAMIDE_NS: 'ceramide-ns', // INCI: Ceramide NS (Ceramide 2) – moins courant
  CHOLESTEROL: 'cholesterol', // INCI: Cholesterol | composant du NMF, très important dans les crèmes barrière
  PHYTOSPHINGOSINE: 'phytosphingosine', // INCI: Phytosphingosine | lipide barrière, anti-microbien
  GLYCOSPHINGOLIPIDS: 'glycosphingolipids', // INCI: Glycosphingolipids | lipides barrière, souvent avec céramides
  SQUALANE: 'squalane', // INCI: Squalane | hydrocarbure stable issu d'olive ou de canne à sucre
  SHEA_BUTTER: 'shea-butter', // INCI: Butyrospermum Parkii Butter | beurre de karité
  BEEF_TALLOW: 'beef-tallow', // INCI: Tallow | graisse bovine, très occlusive
  DIMETHICONE: 'dimethicone', // INCI: Dimethicone | silicone occlusif / lissant
  DICAPRYLYL_ETHER: 'dicaprylyl-ether', // INCI: Dicaprylyl Ether | émollient léger, texture sèche
  HYDROGENATED_POLYISOBUTENE: 'hydrogenated-polyisobutene', // INCI: Hydrogenated Polyisobutene | émollient synthétique
  PALMITAMIDE_MEA: 'palmitamide-mea', // INCI: Palmitamide MEA | émollient / agent apaisant restructurant barrière
  GLYCERYL_DIBEHENATE: 'glyceryl-dibehenate', // INCI: Glyceryl Dibehenate | émulsifiant / épaississant
  TRIBEHENIN: 'tribehenin', // INCI: Tribehenin | émollient / épaississant
  CIRE_ABEILLE: 'cera-alba', // INCI: Cera Alba | cire d'abeille
  HUILE_GRAINES_TOURNESOL: 'huile-graines-tournesol', // INCI: Helianthus Annuus (Sunflower) Seed Oil
  HUILE_D_ARGAN: 'huile-argan', // INCI: Argania Spinosa Kernel Oil
  HUILE_DE_JOJOBA: 'huile-jojoba', // INCI: Simmondsia Chinensis (Jojoba) Seed Oil
  HUILE_DE_COCO: 'huile-coco', // INCI: Cocos Nucifera (Coconut) Oil
  HUILE_DE_RICIN: 'ricinus-communis-seed-oil', // INCI: Ricinus Communis (Castor) Seed Oil | huile de ricin
  CAMELLIA_JAPONICA_OIL: 'camellia-japonica-seed-oil', // INCI: Camellia Japonica Seed Oil
  PRUNUS_AMYGDALUS_DULCIS_OIL: 'prunus-amygdalus-dulcis-oil', // INCI: Prunus Amygdalus Dulcis (Sweet Almond) Oil
  BOURRACHE: 'bourrache', // INCI: Borago Officinalis Seed Oil | riche en GLA
  HUILE_ONAGRE: 'huile-onagre', // INCI: Oenothera Biennis Oil | riche en GLA (+ EVENING_PRIMROSE_OIL)
  EVENING_PRIMROSE_OIL: 'evening-primrose-oil', // INCI: Oenothera Biennis Oil | huile d'onagre, riche en acides gras essentiels
  HUILE_DE_PEPINS_DE_RAISIN: 'huile-de-pepins-de-raisin', // INCI: Vitis Vinifera (Grape) Seed Oil
  HUILE_DE_PEPINS_DE_FIGUE_DE_BARBARIE: 'huile-de-pepins-de-barbarie', // INCI: Opuntia Ficus-Indica Seed Oil
  APRICOT_KERNEL_OIL: 'prunus-armeniaca-kernel-oil', // INCI: Prunus Armeniaca Kernel Oil | huile d'abricot
  HUILE_CARTHAME: 'huile-carthame', // INCI: Carthamus Tinctorius Seed Oil SAFFLOWER_SEED_OIL
  CERAMIDE_NG: 'ceramide-ng', // INCI: Ceramide NG | céramide renforçant barrière cutanée
  LINOLEIC_ACID: 'linoleic-acid', // INCI: Linoleic Acid | acide gras essentiel, anti-inflammatoire barrière
  BEURRE_CACAO: 'theobroma-cacao-butter', // INCI: Theobroma Cacao Seed Butter | beurre de cacao, nourrissant protecteur
  OLEIC_ACID: 'oleic-acid', // INCI: Oleic Acid | acide gras oméga-9 émollient, renforce la barrière cutanée, nourrit et hydrate (idéal peaux sèches/matures)
  HUILE_SOJA: 'huile-soja',
  CAPRYLIC_CAPRIC_TRIGLYCERIDE: 'caprylic-capric-triglyceride',
  HUILE_COLZA: 'huile-colza',
  BUTYLENE_GLYCOL: 'butylene-glycol',
  ROSEHIP_SEED_OIL: 'rosehip-seed-oil', // INCI: Rosa Canina Seed Oil | huile d'églantier, régénérante, cicatrisante, riche en vitamine A/C
  CAMELINA_SEED_OIL: 'camelina-seed-oil', // INCI: Camelina Sativa Seed Oil | huile de cameline, oméga-3, légère et antioxydante
  HEMP_OIL: 'cannabis-sativa-seed-oil', // INCI: Cannabis Sativa Seed Oil | huile de chanvre, riche en oméga-3/6, anti-inflammatoire, apaisante
  HUILE_COTON: 'huile-coton', // INCI: Gossypium Herbaceum Seed Oil | huile de coton
  ETHYLHEXYL_PALMITATE: 'ethylhexyl-palmitate', // INCI: Ethylhexyl Palmitate | émollient estérifié
} as const

export const EXFOLIANTS = {
  GLYCOLIC_ACID: 'glycolic-acid', // INCI: Glycolic Acid | AHA star (exfoliant)
  LACTIC_ACID: 'lactic-acid', // INCI: Lactic Acid | AHA doux + humectant
  MANDELIC_ACID: 'mandelic-acid', // INCI: Mandelic Acid | AHA doux, antibactérien
  MALIC_ACID: 'malic-acid', // INCI: Malic Acid | AHA pur
  MALIC_ACID_ESTER: 'malic-acid-ester', // INCI: Malic Acid | AHA doux
  PHA: 'pha', // Poly-Hydroxy Acid | INCI le plus courant: Gluconolactone
  PAPAIN: 'papain', // INCI: Papain | enzyme exfoliante (papaye)
  PROTEASE: 'protease', // INCI: Protease | enzyme exfoliante protéolytique
  CAPRYLOYL_SALICYLIC_ACID: 'capryloyl-salicylic-acid', // INCI: Capryloyl Salicylic Acid | BHA lipophile, exfoliant doux
  CITRUS_LIMON_FRUIT_WATER: 'citrus-limon-fruit-water', // INCI: Citrus Limon Fruit Water
  SUCCINIC_ACID: 'succinic-acid', // INCI: Succinic Acid | exfoliant doux, régulateur sébum
  AHA_ESTERS: 'aha-esters', // Esters d'AHA (acides hydroxy-carboxyliques éstérifiés) | libération prolongée
  ESTER_ACIDE_MALIQUE: 'ester-acide-malique', // Ester d'acide malique | AHA doux à libération modérée
} as const

export const RETINOIDES = {
  // Formes classiques OTC / cosmétiques
  RETINOL: 'retinol', // INCI: Retinol | vitamine A pure, 2 étapes de conversion, star OTC anti-âge
  RETINAL: 'retinal', // INCI: Retinal / Retinaldehyde | forme plus forte, 1 étape de conversion, hype 2025-2026
  RETINYL_PALMITATE: 'retinyl-palmitate', // INCI: Retinyl Palmitate | ester le plus courant, très doux (3 étapes), débutants / crèmes basiques
  RETINYL_PROPIONATE: 'retinyl-propionate', // INCI: Retinyl Propionate | ester doux, un peu plus stable que palmitate, souvent dans les formules "gentle"
  RETINYL_ACETATE: 'retinyl-acetate', // INCI: Retinyl Acetate | ester basique, faible puissance, très stable
  RETINYL_LINOLLEATE: 'retinyl-linoleate', // INCI: Retinyl Linoleate | ester moins courant, parfois pour peaux grasses
  // Formes modernes / next-gen OTC
  HYDROXYPINACOLONE_RETINOATE: 'hydroxypinacolone-retinoate', // INCI: Hydroxypinacolone Retinoate | aka Granactive Retinoid / HPR, 0 étape, direct, faible irritation, très populaire
  GRANACTIVE_RETINOID: 'granactive-retinoid', // INCI: Hydroxypinacolone Retinoate (souvent commercialisé comme ça par The Ordinary etc.)
  RETINYL_RETINOATE: 'retinyl-retinoate', // INCI: Retinyl Retinoate | hybride retinol + acide rétinoïque, stable et plus actif
  SODIUM_RETINOYL_HYALURONATE: 'sodium-retinoyl-hyaluronate', // INCI: Sodium Retinoyl Hyaluronate | rétinol lié à l'acide hyaluronique, hydratant + anti-âge, bonne tolérance
  // Alternatives non-rétinoïdes (retinol-like)
  BAKUCHIOL: 'bakuchiol', // INCI: Bakuchiol | alternatif "naturel" issu de Psoralea corylifolia, mime les effets sans irritation

  // Rétinoïdes prescription / médicaux (puissants, 0 étape)
  TRETINOINE: 'tretinoine', // INCI: Tretinoin | acide rétinoïque pur, gold standard, très puissant mais irritant
  ADAPALENE: 'adapalene', // INCI: Adapalene | rétinoïde de synthèse, anti-acné, mieux toléré que trétinoïne
  TAZAROTENE: 'tazarotene', // INCI: Tazarotene | très puissant (souvent > trétinoïne sur rides/acné/psoriasis), prescription
  TRIFAROTENE: 'trifarotene', // INCI: Trifarotene | 4e génération, très sélectif (RAR-γ), surtout acné visage + corps, prescription récente
  // Moins courants mais parfois cités
  ISOTRETINOIN: 'isotretinoin', // INCI: Isotretinoin | topique rare (plus connu oral), anti-acné sévère
  ALITRETINOIN: 'alitretinoin', // INCI: Alitretinoin | pour eczéma chronique des mains, usage spécifique
} as const

export const PEPTIDES = {
  PALMITOYL_OLIGOPEPTIDE: 'palmitoyl-oligopeptide', // INCI: Palmitoyl Oligopeptide | peptide anti-âge, stimule la synthèse de collagène
  ARGIRELINE: 'argireline', // INCI: Acetyl Hexapeptide-8 | peptide "Botox-like"
  MATRIXYL_3000: 'matrixyl-3000', // INCI: Palmitoyl Tripeptide-1 + Palmitoyl Tetrapeptide-7
  PALMITOYL_PENTAPEPTIDE_4: 'palmitoyl-pentapeptide-4', // INCI: Palmitoyl Pentapeptide-4 | Matrixyl® original
  PALMITOYL_TRIPEPTIDE_1: 'palmitoyl-tripeptide-1', // INCI: Palmitoyl Tripeptide-1
  PALMITOYL_TETRAPEPTIDE_7: 'palmitoyl-tetrapeptide-7', // INCI: Palmitoyl Tetrapeptide-7 | anti-inflammatoire
  PALMITOYL_TETRAPEPTIDE_10: 'palmitoyl-tetrapeptide-10', // INCI: Palmitoyl Tetrapeptide-10 | anti-âge
  PALMITOYL_TRIPEPTIDE_38: 'palmitoyl-tripeptide-38', // INCI: Palmitoyl Tripeptide-38
  COPPER_PEPTIDES: 'copper-peptides', // INCI: Copper Tripeptide-1 (GHK-Cu) | réparation / anti-âge
  ACETYL_TETRAPEPTIDE_5: 'acetyl-tetrapeptide-5', // INCI: Acetyl Tetrapeptide-5
  ACETYL_TETRAPEPTIDE_2: 'acetyl-tetrapeptide-2', // INCI: Acetyl Tetrapeptide-2
  MYRISTOYL_NONAPEPTIDE_3: 'myristoyl-nonapeptide-3', // INCI: Myristoyl Nonapeptide-3
  ACETYL_DIPEPTIDE_1_CETYL_ESTER: 'acetyl-dipeptide-1-cetyl-ester', // INCI: Acetyl Dipeptide-1 Cetyl Ester | Calmosensine™, apaisant neurosensoriel
  SYN_AKE: 'syn-ake', // INCI: Dipeptide Diaminobutyroyl Benzylamide Diacetate | peptide "serpent-like"
  PDRN: 'pdrn', // Polydeoxyribonucleotide | INCI: Sodium DNA (issu de saumon)
  PEPTIDE_COMPLEX: 'peptide-complex', // Catégorie générale
  NICOTIANA_BENTHAMIANA_OCTAPEPTIDE_30_SH_OLIGOPEPTIDE_2:
    'nicotiana-benthamiana-octapeptide-30-sh-oligopeptide-2',
  NICOTIANA_BENTHAMIANA_HEXAPEPTIDE_40_SH_POLYPEPTIDE_76:
    'nicotiana-benthamiana-hexapeptide-40-sh-polypeptide-76',
  NICOTIANA_BENTHAMIANA_HEXAPEPTIDE_40_SH_OLIGOPEPTIDE_1:
    'nicotiana-benthamiana-hexapeptide-40-sh-oligopeptide-1',
  TETRAPEPTIDE_21: 'tetrapeptide-21', // INCI: Tetrapeptide-21 | peptide biomimétique anti-âge
  COPPER_PALMITOYL_HEPTAPEPTIDE_14: 'copper-palmitoyl-heptapeptide-14', // INCI: Copper Palmitoyl Heptapeptide-14 | peptide cuivré
  HEPTAPEPTIDE_15_PALMITATE: 'heptapeptide-15-palmitate', // INCI: Heptapeptide-15 Palmitate | peptide palmitoylé
  COPPER_TRIPEPTIDE_1_PALMITAMIDE: 'copper-tripeptide-1-palmitamide', // INCI: Copper Tripeptide-1 Palmitamide | peptide cuivré lipophile
  TRIFLUOROACETYL_TRIPEPTIDE_2: 'trifluoroacetyl-tripeptide-2', // INCI: Trifluoroacetyl Tripeptide-2 | anti-relâchement
  TRIPEPTIDE_1: 'tripeptide-1', // INCI: Tripeptide-1 | stimulant collagène
} as const

export const ANTIOXYDANTS_VITAMINES = {
  VITAMIN_C: 'vitamin-c', // Catégorie – INCI variable
  ASCORBYL_GLUCOSIDE: 'ascorbyl-glucoside', // INCI: Ascorbyl Glucoside | dérivé stable de vitamine C
  ASCORBYL_PALMITATE: 'ascorbyl-palmitate', // INCI: Ascorbyl Palmitate | forme liposoluble de vitamine C
  MAGNESIUM_ASCORBYL_PHOSPHATE: 'magnesium-ascorbyl-phosphate', // INCI: Magnesium Ascorbyl Phosphate | dérivé vitamine C stable
  SODIUM_ASCORBYL_PHOSPHATE: 'sodium-ascorbyl-phosphate', // INCI: Sodium Ascorbyl Phosphate | dérivé vitamine C
  THREE_O_ETHYL_ASCORBIC_ACID: '3-o-ethyl-ascorbic-acid', // INCI: 3-O-Ethyl Ascorbic Acid | dérivé vitamine C stable et pénétrant
  THD_ASCORBATE: 'thd-ascorbate', // INCI: Tetrahexyldecyl Ascorbate | dérivé vitamine C liposoluble
  TOCOPHEROL: 'tocopherol', // INCI: Tocopherol | vitamine E pure
  TOCOPHERYL_ACETATE: 'tocopheryl-acetate', // INCI: Tocopheryl Acetate | ester stable de vitamine E
  TOCOPHERYL_GLUCOSIDE: 'tocopheryl-glucoside', // INCI: Tocopheryl Glucoside | dérivé hydrophile vitamine E
  CYANOCOBALAMIN: 'cyanocobalamin', // INCI: Cyanocobalamin | vitamine B12
  NAD: 'nad', // INCI: NAD+ | coenzyme antioxydant / énergie cellulaire
  RIBOSE: 'ribose', // INCI: Ribose | sucre énergétique cellulaire
  COQ10: 'coq10', // INCI: Ubiquinone | antioxydant mitochondrial
  ERGOTHIONEINE: 'ergothioneine', // INCI: Ergothioneine | antioxydant puissant et stable
  RESVERATROL: 'resveratrol', // INCI: Resveratrol | polyphénol antioxydant
  CARNOSINE: 'carnosine', // INCI: Carnosine | dipeptide antioxydant / anti-glycation
  GREEN_TEA: 'green-tea', // INCI: Camellia Sinensis Leaf Extract | antioxydant polyphénols
  VACCINIUM_MYRTILLUS: 'vaccinium-myrtillus', // INCI: Vaccinium Myrtillus Fruit Extract (myrtille) | antioxydant
  HELICHRYSE_IMMORTELLE: 'helichryse-immortelle', // INCI: Helichrysum Italicum Flower Extract | antioxydant / régénérant
  CURCUMA_LONGA_ROOT_EXTRACT: 'curcuma-longa-root-extract', // INCI: Curcuma Longa (Turmeric) Root Extract | antioxydant
  ROMARIN: 'romarin', // INCI: Rosmarinus Officinalis (Rosemary) Leaf Extract | antioxydant
  SCHISANDRA: 'schisandra-sphenanthera', // INCI: Schisandra Sphenanthera Fruit Extract | adaptogène / antioxydant
  SALVIA_MILTIORRHIZA: 'salvia-miltiorrhiza', // INCI: Salvia Miltiorrhiza Root Extract (sauge chinoise) | antioxydant
  PANAX_GINSENG: 'panax-ginseng', // INCI: Panax Ginseng Root Extract | adaptogène / antioxydant
  PLANKTON_EXTRACT: 'plankton-extract', // INCI: Plankton Extract | antioxydant / hydratant marin
  ASCOPHYLLUM_NODOSUM_EXTRACT: 'ascophyllum-nodosum-extract', // INCI: Ascophyllum Nodosum Extract | algue, antioxant
  ASPARAGOPSIS_ARMATA_EXTRACT: 'asparagopsis-armata-extract', // INCI: Asparagopsis Armata Extract | algue rouge, anti-rougeurs
  HUILE_ARGOUSIER: 'hippophae-rhamnoides', // INCI: Hippophae Rhamnoides Fruit Oil / Extract (argousier) | riche en antioxydants

  ASTAXANTHINE: 'astaxanthine', // INCI: Haematococcus Pluvialis Extract | algue riche en astaxanthine (antioxydant puissant)
  HAEMATOCOCCUS_PLUVIALIS: 'astaxanthine', // Alias
  EPIGALLOCATECHIN_GALLATYL_GLUCOSIDE: 'egcg-glucoside', // INCI: Epigallocatechin Gallatyl Glucoside | EGCG stable
  PUNICA_GRANATUM: 'punica-granatum', // INCI: Punica Granatum Fruit Extract | grenade, antioxydant anti-âge
  VITAMIN_K1: 'vitamine-k1',
  FERULIC_ACID: 'ferulic-acid',
  HIBISCUS_SABDARIFFA: 'hibiscus-sabdariffa', // INCI: Hibiscus Sabdariffa Flower Extract | antioxydant, éclat, anti-âge
  BEET_ROOT_EXTRACT: 'beet-root-extract', // INCI: Beta Vulgaris Root Extract | betterave, bétalaïnes antioxydantes
  GARDENIA_FRUIT_EXTRACT: 'gardenia-fruit-extract', // INCI: Gardenia Jasminoides Fruit Extract | éclaircissant / antioxydant
  GLYCERYL_ASCORBATE: '3-glyceryl-ascorbate', // INCI: 3-O-Glyceryl Ascorbate | dérivé vitamine C stable et hydrophile
} as const

export const APAISANTS_ANTI_INFLAMMATOIRES = {
  SODIUM_DEXTRAN_SULFATE: 'sodium-dextran-sulfate', // INCI: Sodium Dextran Sulfate | apaisant et décongestionnant vasculaire
  CENTELLA_ASIATICA: 'centella-asiatica', // INCI: Centella Asiatica Extract
  CENTELLA_COMPLEX: 'centella-complex', // Complexe actifs Centella
  MADECASSOSIDE: 'madecassoside', // INCI: Madecassoside | triterpène pur de Centella
  ASIATICOSIDE: 'asiaticoside', // INCI: Asiaticoside | composé pur de Centella
  ALOE_VERA: 'aloe-vera', // INCI: Aloe Barbadensis Leaf Juice / Extract
  AVENA_SATIVA: 'avena-sativa', // INCI: Avena Sativa (Oat) Kernel Extract | bêta-glucane apaisante
  BETA_GLUCAN: 'beta-glucan', // INCI: Beta-Glucan | apaisant / immunomodulateur
  HEARTLEAF: 'heartleaf', // INCI: Houttuynia Cordata Extract | anti-inflammatoire K-beauty
  BISABOLOL: 'bisabolol', // INCI: Bisabolol | apaisant, issu de camomille
  ECTOIN: 'ectoin', // INCI: Ectoin | protecteur cellulaire, anti-pollution, barrière renforçante
  CALENDULA: 'calendula-officinalis', // INCI: Calendula Officinalis Flower Extract
  BLEUET: 'bleuet', // INCI: Centaurea Cyanus Flower Water / Extract | apaisant oculaire
  MAUVE: 'mauve', // INCI: Malva Sylvestris Extract | adoucissant, apaisant
  PAQUERETTE: 'paquerette', // INCI: Bellis Perennis (Daisy) Flower Extract | apaisant / éclaircissant
  HAMAMELIS: 'hammamelis', // INCI: Hamamelis Virginiana (Witch Hazel) Water / Extract | astringent, apaisant
  CUCUMBER_EXTRACT: 'cucumis-sativus-fruit-extract', // INCI: Cucumis Sativus Fruit Extract | décongestionnant, apaisant
  PORTULACA_OLERACEA: 'portulaca-oleracea', // INCI: Portulaca Oleracea Extract | anti-inflammatoire
  RHAMNOSE: 'rhamnose', // INCI: Rhamnose | sucre, parfois anti-inflammatoire
  MANGANESE_GLUCONATE: 'manganese-gluconate', // INCI: Manganese Gluconate | oligo-élément, apaisant
  EAU_DE_ROSE: 'eau-de-rose', // INCI: Rosa Damascena Flower Water | apaisant, tonique
  ROYAL_JELLY_EXTRACT: 'royal-jelly-extract', // INCI: Royal Jelly Extract | apaisant / nourrissant
  PROPOLIS: 'propolis-extract', // INCI: Propolis Extract | apaisant / antioxydant / cicatrisant
  ZANTHOXYLUM_BUNGEANUM: 'zanthoxylum-bungeanum', // INCI: Zanthoxylum Bungeanum Fruit Extract | poivre Sichuan, anti-démangeaisons
  COLLOIDAL_OATMEAL: 'colloidal-oatmeal',
  EXTRAIT_CAMOMILLE: 'extrait-camomille',
  EXTRAIT_EPILOBE: 'extrait-epilobe',
  BOSWELLIA_SERRATA: 'boswellia-serrata', // INCI: Boswellia Serrata Gum/Extract | apaisant puissant
  ZINGIBER_OFFICINALE: 'zingiber-officinale', // INCI: Zingiber Officinale Root Extract | gingembre, tonifiant/antioxydant
  MORINDA_CITRIFOLIA: 'morinda-citrifolia', // INCI: Morinda Citrifolia Fruit Extract | Noni, protecteur/antioxydant
  ENOXOLONE: 'enoxolone', // INCI: Enoxolone | dérivé glycyrrhizinique, anti-inflammatoire puissant
  DIPOTASSIUM_GLYCYRRHIZATE: 'dipotassium-glycyrrhizate', // INCI: Dipotassium Glycyrrhizate | apaisant puissant issu de la réglisse
  NEUTRAZEN: 'neutrazen', // INCI: (composant appaisant spécialisé) | complexe pour peaux réactives / couperose
  SYMSITIVE: 'symsitive', // INCI: 4-t-Butylcyclohexanol | régulateur de sensibilité cutanée
  LICOCHALCONE_A: 'licochalcone-a', // INCI: Glycyrrhiza Inflata Root Extract | antioxydant et apaisant puissant issu de la réglisse chinoise
  ASTER_TRIPOLIUM: 'aster-tripolium', // INCI: Aster Tripolium Extract | aster maritime, apaisant et anti-rougeurs
  SAMBUCUS_NIGRA: 'sambucus-nigra', // INCI: Sambucus Nigra Flower Extract | sureau noir, apaisant
  DAUCUS_CAROTA: 'daucus-carota', // INCI: Daucus Carota Sativa Root Extract | carotte, apaisant
  ARTEMISIA_ANNUA: 'artemisia-annua', // INCI: Artemisia Annua Extract | armoise apaisante (signature K-beauty)
  GINKGO_BILOBA: 'ginkgo-biloba', // INCI: Ginkgo Biloba Leaf Extract | antioxydant / circulatoire
} as const

export const ECLAIRCISSANTS_DEPIGMENTANTS = {
  ALPHA_ARBUTIN: 'alpha-arbutin', // INCI: Alpha-Arbutin | anti-taches pigmentaires
  KOJIC_ACID: 'kojic-acid', // INCI: Kojic Acid | inhibiteur de tyrosinase
  TRANEXAMIC_ACID: 'tranexamic-acid', // INCI: Tranexamic Acid | anti-taches, anti-inflammatoire
  PHENYLETHYL_RESORCINOL: 'phenylethyl-resorcinol', // INCI: Phenylethyl Resorcinol | SymWhite 377
  SEPIWHITE: 'sepiwhite', // INCI: Undecylenoyl Phenylalanine | Sepiwhite™
  HEXYLRESORCINOL: 'hexylresorcinol', // INCI: Hexylresorcinol | éclaircissant, inhibiteur de tyrosinase
  BUTYLRESORCINOL: 'butylresorcinol', // INCI: 4-Butylresorcinol | éclaircissant puissant, inhibiteur de tyrosinase
  REGLISSE: 'reglisse', // INCI: Glycyrrhiza Glabra (Licorice) Root Extract | éclaircissant
  DIACETYL_BOLDINE: 'diacetyl-boldine', // INCI: Diacetyl Boldine | éclaircissant / antioxydant
  GLUTATHION: 'glutathion', // INCI: Glutathione | antioxydant majeur, éclaircissant
  MELITANE: 'melitane', // INCI: Acetyl Hexapeptide-1 | peptide pro-pigmentant (auto-bronzant)
  MELASYL: 'melasyl', // INCI: Melasyl | anti-taches pigmentaires spécifique (breveté)
  GALLYL_GLUCOSIDE: 'gallyl-glucoside', // INCI: Gallyl Glucoside | dérivé gallique, éclaircissant antioxydant
  IRIS_EXTRACT: 'iris-extract', // INCI: Iris Florentina Root Extract | éclaircissant naturel, dépigmentant
} as const

export const ANTI_ACNE_SEBUM = {
  AZELAIC_ACID: 'azelaic-acid', // INCI: Azelaic Acid | anti-acné, anti-rosacée, éclaircissant
  AZELOCALM: 'azelocalm', // INCI: Azelaic Acid (variante complexée) | acide azélaïque apaisé, meilleure tolérance
  AZECOGLYCINE: 'azecoglycine', // INCI: Azelaic Acid + Glycine | complexe anti-acné, séborégulateur synergique
  SALICYLIC_ACID: 'salicylic-acid', // INCI: Salicylic Acid | BHA
  NIACINAMIDE: 'niacinamide', // INCI: Niacinamide | vitamine B3, multifonction / séborégulateur
  ACNESYL_X_PRO: 'acnesyl-x-pro', // Complexe anti-acné multi-actif | contrôle sébum, antibactérien, anti-comédogène
  ZINC_PCA: 'zinc-pca', // INCI: Zinc PCA | séborégulateur
  ZINC_GLUCONATE: 'zinc-gluconate', // INCI: Zinc Gluconate | anti-inflammatoire / séborégulateur
  ZINC_LACTATE: 'zinc-lactate', // INCI: Zinc Lactate | séborégulateur, anti-imperfections
  ZINC_SULFATE: 'zinc-sulfate', // INCI: Zinc Sulfate | astringent, antimicrobien, séborégulateur
  COPPER_SULFATE: 'copper-sulfate', // INCI: Copper Sulfate | antimicrobien, astringent
  COPPER_GLUCONATE: 'copper-gluconate', // INCI: Copper Gluconate | régulateur sébum / anti-bactérien
  SULFUR: 'soufre', // INCI: Sulfur | kératolytique, anti-acné
  TEA_TREE: 'tea-tree', // INCI: Melaleuca Alternifolia Leaf Oil | antibactérien naturel
  HYPOCHLOROUS_ACID: 'hypochlorous-acid', // INCI: Hypochlorous Acid | antiseptique doux
  PIROCTONE_OLAMINE: 'piroctone-olamine', // INCI: Piroctone Olamine | antifongique (anti-Malassezia), anti-pelliculaire
  COMEDOCLASTIN: 'comedoclastin', // Extrait de Silybum marianum titré (Cleanance) | anti-comédogène
  LENS_ESCULENTA_SEED_EXTRACT: 'lens-esculenta-seed-extract', // Extrait de lentille (Oil Control) | matifiant
  PEA_EXTRACT: 'pea-extract', // INCI: Pisum Sativum Extract | extrait de pois, matifiant / sébum
  SARCOSINE: 'sarcosine', // INCI: Sarcosine | acide aminé anti-sébum, assainissant
  AMMONIUM_LACTATE: 'ammonium-lactate', // INCI: Ammonium Lactate | kératolytique doux, anti-acné
} as const

export const ANTI_ROSACEE_VASOCONSTRICTEURS = {
  BRIMONIDINE: 'brimonidine', // INCI: Brimonidine Tartrate | vasoconstricteur topique (Mirvaso®)
  OXYMETAZOLINE: 'oxymetazoline', // INCI: Oxymetazoline HCl | vasoconstricteur topique (Rhofade®)
  IVERMECTINE: 'ivermectine', // INCI: Ivermectin | anti-Demodex (Soolantra®)
  METRONIDAZOLE: 'metronidazole', // INCI: Metronidazole | antibiotique / anti-inflammatoire (Rozex®)
  ANGIOPAUSINE: 'angiopausine', // Actif spécifique Rosamed | anti-rougeurs vasculaires
  ENDOTHELYOL: 'endothelyol', // Composant Endothelyol® | protection vasculaire / photoprotection
} as const

export const FILTRES_UV = {
  TITANIUM_DIOXIDE: 'titanium-dioxide', // Filtre minéral
  ZINC_OXIDE: 'zinc-oxyde', // Filtre minéral
  BIS_ETHYLHEXYLOXYPHENOL_METHOXYPHENYL_TRIAZINE: 'bis-ethylhexyloxyphenol-methoxyphenyl-triazine', // Tinosorb S
  DIETHYLAMINO_HYDROXYBENZOYL_HEXYL_BENZOATE: 'diethylamino-hydroxybenzoyl-hexyl-benzoate', // Uvinul A Plus
  ETHYLHEXYL_TRIAZONE: 'ethylhexyl-triazone', // Uvinul T 150
  TRIASORB: 'triasorb', // Filtre ultra-large spectre
  IRON_OXIDE: 'oxide-de-fer', // INCI: Iron Oxides | pigments minéraux, protection lumière visible / HEV
  DROMETRIZOLE_TRISILOXANE: 'drometrizole-trisiloxane', // INCI: Drometrizole Trisiloxane | filtre UVA photostable (Mexoryl XL)
  BUTYL_METHOXYDIBENZOYLMETHANE: 'butyl-methoxydibenvoylmethane', // INCI: Butyl Methoxydibenzoylmethane | filtre UVA (Avobenzone)
  AVOBENZONE: 'butyl-methoxydibenvoylmethane', // Alias
  OCTOCRYLENE: 'octocrylene', // INCI: Octocrylene | filtre UVB stabilisant
  HOMOSALATE: 'homosalate', // INCI: Homosalate | filtre UVB
  ETHYLHEXYL_SALICYLATE: 'ethylhexyl-salicylate', // INCI: Ethylhexyl Salicylate | filtre UVB (Octisalate)
  ISOAMYL_P_METHOXYCINNAMATE: 'isoamyl-p-methoxycinnamate', // INCI: Isoamyl p-Methoxycinnamate | filtre UVB (Amiloxate)
  ETHYLHEXYL_METHOXYCINNAMATE: 'ethylhexyl-methoxycinnamate', // INCI: Ethylhexyl Methoxycinnamate | filtre UVB (Octinoxate)
  METHYLENE_BIS_BENZOTRIAZOLYL_TETRAMETHYLBUTYLPHENOL:
    'methylene-bis-benzotriazolyl-tetramethylbutylphenol', // Tinosorb M – UVA/UVB, minéral-like
  TRIS_BIPHENYL_TRIAZINE: 'tris-biphenyl-triazine', // Tinosorb A2B nano – large spectre
  DIETHYLHEXYL_BUTAMIDO_TRIAZONE: 'diethylhexyl-butamido-triazone', // INCI: Diethylhexyl Butamido Triazone | Uvasorb HEB – filtre UVB/UVA large spectre, très photostable
} as const

export const PROBIOTIQUES_PREBIOTIQUES_POSTBIOTIQUES = {
  PSEUDOALTEROMONAS_FERMENT: 'pseudoalteromonas-ferment', // INCI: Pseudoalteromonas Ferment Extract | postbiotique marin, hydratant et protecteur
  PROBIOTICS: 'probiotics', // INCI fréquent: Lactobacillus Ferment | bactéries vivantes
  POSTBIOTICS: 'postbiotics', // INCI variable (ex: Lactobacillus Ferment Filtrate)
  ALPHA_GLUCAN_OLIGOSACCHARIDE: 'alpha-glucan-oligosaccharide', // INCI: Alpha-Glucan Oligosaccharide | prébiotique
  SNAIL_MUCIN: 'snail-secretion-filtrate', // INCI: Snail Secretion Filtrate | régénérant / hydratant
  D_SENSINOSE: 'd-sensinose', // Actif postbiotique (Tolérance Control)
  AQUAPHILUS_DOLOMIAE_EXTRACT: 'aquaphilus-dolomiae-extract', // I-modulia (XeraCalm)
  AQUAPHILUS_DOLOMIAE_FERMENT_FILTRATE: 'aquaphilus-dolomiae-ferment-filtrate', // C+ Restore (Cicalfate+)
  VITREOSCILLA_FERMENT: 'vitreoscilla-ferment', // INCI: Vitreoscilla Ferment | ferment bactérien apaisant, réparateur et fortifiant (postbiotique-like)
  FRUCTOOLIGOSACCHARIDES: 'fructooligosaccharides', // INCI: Fructooligosaccharides | prébiotique, soutient le microbiote cutané
  INULINE: 'inuline', // INCI: Cichorium Intybus Root Extract | racine de chicorée, source d'inuline prébiotique
  MICROBIOTA_REGULATOR: 'microbiota-regulator', // Régulateur du microbiote cutané | équilibre flore bactérienne cutanée
  MELABIOME_XP: 'melabiome-xp', // Complexe de postbiotiques et prébiotiques | rééquilibrage et protection microbiote
  GALACTOMYCES_FERMENT_FILTRATE: 'galactomyces-ferment-filtrate', // INCI: Galactomyces Ferment Filtrate | Pitera (SK-II), ferment riche en nutriments
} as const

export const ACTIFS_ANTI_AGE_REPARATEURS = {
  ADENOSINE: 'adenosine', // Anti-rides
  ASIATIC_ACID: 'asiatic-acid', // INCI: Asiatic Acid | TECA (madecassic + asiaticoside + asiatic acid) – apaisant signature Centella
  MADECASSIC_ACID: 'madecassic-acid', // INCI: Madecassic Acid | composant Centella, apaisant et réparateur
  ALLANTOIN: 'allantoin', // INCI: Allantoin | apaisant, cicatrisant
  PANTHENOL: 'panthenol', // INCI: Panthenol | provitamine B5, apaisant / hydratant
  CHARDON_MARIE: 'chardon-marie', // INCI: Silybum Marianum Seed Extract | régénérant
  HYDROXYPALMITOYL_SPHINGANINE: 'hydroxypalmitoyl-sphinganine', // INCI: Hydroxypalmitoyl Sphinganine | céramide-like, renforce barrière
  TWO_OLEAMIDO_1_3_OCTADECANEDIOL: '2-oleamido-1-3-octadecanediol', // INCI: 2-Oleamido-1,3-Octadecanediol | lipide biomimétique réparateur
  PROTEOGLYCAN_COMPLEX: 'proteoglycan-complex', // Complexe de protéoglycanes | structure cutanée
  ACMELLA_OLERACEA_EXTRACT: 'acmella-oleracea-extract', // INCI: Acmella Oleracea Extract | effet liftant naturel, "Botox-like" végétal
  PHYTIC_ACID: 'phytic-acid', // INCI: Phytic Acid | acide phytique, antioxydant et chélateur de métaux, anti-inflammatoire léger
} as const

export const CIRCULATOIRE_DRAINAGE = {
  ESCIN: 'escin', // INCI: Escin | issu de marron d'Inde, anti-œdème / circulatoire
  RUSCUS_ACULEATUS: 'ruscus-aculeatus', // INCI: Ruscus Aculeatus Root Extract (fragon épineux) | veinotonique
  CAFFEINE: 'caffeine', // INCI: Caffeine | lipolytique, décongestionnant
  ARNICA: 'arnica', // INCI: Arnica Montana Flower Extract | anti-hématomes, circulatoire
  CYPRES: 'cypres', // INCI: Cupressus Sempervirens | Tonifiant, circulatoire et astringent
} as const

export const TENSIOACTIFS_NETTOYANTS = {
  COCO_GLUCOSIDE: 'coco-glucoside', // INCI: Coco-Glucoside | tensioactif doux non-ionique
  DECYL_GLUCOSIDE: 'decyl-glucoside', // INCI: Decyl Glucoside | tensioactif doux
  SODIUM_LAUROYL_METHYL_ISETHIONATE: 'sodium-lauroyl-methyl-isethionate', // INCI: Sodium Lauroyl Methyl Isethionate | tensioactif doux
  SODIUM_COCOYL_ISETHIONATE: 'sodium-cocoyl-isethionate', // INCI: Sodium Cocoyl Isethionate | tensioactif doux dérivé de coco
  GLEDITSIA_TRIACANTHOS_SEED_EXTRACT: 'gleditsia-seed-extract', // INCI: Gleditsia Triacanthos Seed Extract | tensioactif / épaississant naturel doux
  PEG_20_GLYCERYL_TRIISOSTEARATE: 'peg-20-glyceryl-triisostearate', // INCI: PEG-20 Glyceryl Triisostearate | émulsifiant huileux (nettoyants)
} as const

export const TEXTURANTS_FONCTIONNELS = {
  SILICA: 'silica', // INCI: Silica | matifiant, texturant
  HYDROCOLLOID: 'hydrocolloid', // INCI: Hydrocolloid | pansement occlusif
  ZEA_MAYS_STARCH: 'zea-mays-starch', // INCI: Zea Mays Starch | amidon de maïs, texturant / absorbant
  ORYZA_SATIVA: 'oryza-sativa', // INCI: Oryza Sativa (Rice) Starch / Extract | texturant, apaisant
  SPHINGOMONAS_FERMENT: 'sphingomonas-ferment-extract', // INCI: Sphingomonas Ferment Extract | épaississant naturel
  SALIX_NIGRA: 'salix-nigra', // INCI: Salix Nigra (Willow) Bark Extract | exfoliant doux / astringent
  CITRUS_AURANTIUM_DULCIS: 'citrus-aurantium-dulcis', // INCI: Citrus Aurantium Dulcis (Orange) Peel Extract / Oil
  VERVEINE: 'verveine', // INCI: Lippia Citriodora / Verbena Officinalis
  MENTHE_POIVREE: 'menthe-poivree', // INCI: Mentha Piperita (Peppermint) Oil / Extract | rafraîchissant
  BIOSACCHARIDE_GUM_1: 'biosaccharide-gum-1', // INCI: Biosaccharide Gum-1 | exopolysaccharride filmogène hydratant longue durée
  AHNFELTIA_CONCINNA: 'ahnfeltia-concinna', // INCI: Ahnfeltiopsis Concinna Extract | algue rouge, hydratante et filmogène
  CHARCOAL_POWDER: 'charcoal-powder', // INCI: Charcoal / Activated Charcoal | absorbant puissant, purifiant, détoxifiant
  KAOLIN: 'kaolin', // INCI: Kaolin | argile minérale, absorbante, puifiante, texturante (poudre ou en suspension)
  BENTONITE: 'bentonite', // INCI: Bentonite | argile montmorillonite, absorbante et puifiante puissante
} as const

export const DIVERS_NON_CLASSES = {
  HUMECTANTS_EMOLLIENTS_OCCLUSIFS: 'humectants-emollients-occlusifs', // Catégorie générale
  PEPTIDES: 'peptides', // Catégorie générale
  BIXA_ORELLANA: 'bixa-orellana', // INCI: Bixa Orellana Seed Extract / Annatto | source de bixine (colorant naturel)
  AMARANTHUS_CAUDATUS: 'amaranthus', // INCI: Amaranthus Caudatus Seed Extract
  OPHIOPOGON_JAPONICUS: 'ophiopogon-japonicus', // INCI: Ophiopogon Japonicus Root Extract (mondo grass)
  ISOSORBIDE_DICAPRYLATE: 'isosorbide-dicaprylate', // INCI: Isosorbide Dicaprylate | hydratant lipophile intelligent
  RICE_AMINO_ACIDS: 'rice-amino-acids', // INCI: Rice Amino Acids | acides aminés riz, conditionnants
  HUILE_BABASSU: 'huile-babassu', // INCI: Orbignya Oleifera Seed Oil | huile babassu, émolliente légère
  PINUS_PALUSTRIS: 'pinus-palustris', // INCI: Pinus Palustris Leaf Extract | pin, tonifiant antioxydant
  VETIVERIA_ZIZANOIDES: 'vetiveria-zizanoides', // INCI: Vetiveria Zizanoides Root Extract | vétiver, apaisant régénérant
  APHANIZOMENON_FLOS_AQUAE: 'aphanizomenon-flos-aquae', // INCI: Aphanizomenon Flos-Aquae Extract | algue bleue-verte nutritive
  ULVA_LACTUCA: 'ulva-lactuca', // INCI: Ulva Lactuca Extract | laitue de mer, riche en magnésium et élastine-like (souplesse)
  CHLORELLA_VULGARIS: 'chlorella-vulgaris', // INCI: Chlorella Vulgaris Extract | micro-algue verte, correcteur de cernes et restructurant
  SPIRULINA_PLATENSIS: 'spirulina-platensis', // INCI: Spirulina Platensis Extract | micro-algue bleue, super-aliment riche en protéines et revitalisante
  DUNALIELLA_SALINA: 'dunaliella-salina', // INCI: Dunaliella Salina Extract | micro-algue orangée, très riche en bêta-carotène (effet bonne mine et antioxydant)
  CHONDRUS_CRISPUS: 'chondrus-crispus', // INCI: Chondrus Crispus Extract | mousse d'Irlande, filmogène protecteur et gélifiant naturel
  PALMARIA_PALMATA: 'palmaria-palmata', // INCI: Palmaria Palmata Extract | Dulse, tonifiante et favorise la microcirculation (éclat du teint)
  JANIA_RUBENS: 'jania-rubens', // INCI: Jania Rubens Extract | algue rouge calcaire, ultra-hydratante et "anti-fatigue" cellulaire
  LAMINARIA_DIGITATA: 'laminaria-digitata', // INCI: Laminaria Digitata Extract | algue brune, reminéralisante et hydratante (riche en alginates)
  FUCUS_VESICULOSUS: 'fucus-vesiculosus', // INCI: Fucus Vesiculosus Extract | algue brune, détoxifiante et drainante (souvent utilisée pour le contour des yeux)
  ALARIA_ESCULENTA: 'alaria-esculenta', // INCI: Alaria Esculenta Extract | algue brune, booster de collagène et d'élastine (fermeté)
  UNDARIA_PINNATIFIDA: 'undaria-pinnatifida', // INCI: Undaria Pinnatifida Extract | Wakamé, protecteur de la matrice extracellulaire et antioxydant
  NMN: 'nmn',
  SPINACIA_OLERACEA: 'spinacia-oleracea', // INCI: Spinacia Oleracea Leaf Extract | épinard, antioxydant anti-pollution
  TARAXACUM_OFFICINALE: 'taraxacum-officinale', // INCI: Taraxacum Officinale Leaf Extract | pissenlit, détoxifiant anti-pollution
  ARISTOTELIA_CHILENSIS: 'aristotelia-chilensis', // INCI: Aristotelia Chilensis Fruit Extract | maqui berry, antioxydant puissant
  TEPHROSIA_PURPUREA: 'tephrosia-purpurea', // INCI: Tephrosia Purpurea Seed Extract | anti-pollution urbaine
  AVENE_THERMAL_SPRING_WATER: 'avene-thermal-spring-water', // Eau thermale Avène | apaisante, anti-irritante
  URIAGE_THERMAL_SPRING_WATER: 'uriage-thermal-spring-water', // Eau thermale Uriage | apaisante, reminéralisante naturelle
  TRIPTERYGIUM_WILFORDII_CALLUS_EXTRACT: 'tripterygium-wilfordii-callus-extract',
  MYRTUS_COMMUNIS_LEAF_EXTRACT: 'myrtus-communis-leaf-extract',
  TASMANNIA_LANCEOLATA: 'tasmannia-lanceolata', // INCI: Tasmannia Lanceolata Fruit Extract | épice australienne, matifiante et tonifiante anti-âge
  AQUABIOME: 'aquabiome', // Complexe d'actifs marins | protecteur du microbiome cutané marin / barrière cutanée
} as const

export const FILLERS = {
  // Solvants aqueux
  AQUA: 'aqua', // INCI: Aqua (Water) | solvant universel, inerte
  PROPANEDIOL: 'propanediol', // INCI: Propanediol | solvant/véhicule neutre

  // Ajusteurs de pH & chélateurs
  CITRIC_ACID: 'citric-acid', // INCI: Citric Acid | ajusteur pH, traces
  SODIUM_HYDROXIDE: 'sodium-hydroxide', // INCI: Sodium Hydroxide | ajusteur pH, neutralisé dans la formule
  POTASSIUM_HYDROXIDE: 'potassium-hydroxide', // INCI: Potassium Hydroxide | ajusteur pH
  TRIETHANOLAMINE: 'triethanolamine', // INCI: Triethanolamine | ajusteur pH
  TROMETHAMINE: 'tromethamine', // INCI: Tromethamine | ajusteur pH
  SODIUM_CITRATE: 'sodium-citrate', // INCI: Sodium Citrate | tampon pH
  DISODIUM_EDTA: 'disodium-edta', // INCI: Disodium EDTA | chélateur, traces, inerte cutanément
  TETRASODIUM_EDTA: 'tetrasodium-edta', // INCI: Tetrasodium EDTA | chélateur, traces

  // Épaississants / gélifiants
  CARBOMER: 'carbomer', // INCI: Carbomer | gélifiant inerte, haute tolérance
  XANTHAN_GUM: 'xanthan-gum', // INCI: Xanthan Gum | gélifiant inerte
  ACRYLATES_CROSSPOLYMER: 'acrylates-c10-30-alkyl-acrylate-crosspolymer', // INCI: Acrylates/C10-30 Alkyl Acrylate Crosspolymer | gélifiant inerte
  HYDROXYETHYLCELLULOSE: 'hydroxyethylcellulose', // INCI: Hydroxyethylcellulose | épaississant inerte
  HYDROXYPROPYL_METHYLCELLULOSE: 'hydroxypropyl-methylcellulose', // INCI: Hydroxypropyl Methylcellulose | épaississant inerte
  SODIUM_POLYACRYLATE: 'sodium-polyacrylate', // INCI: Sodium Polyacrylate | épaississant inerte
  SCLEROTIUM_GUM: 'sclerotium-gum', // INCI: Sclerotium Gum | gélifiant inerte

  // Alcools gras & émulsifiants structurels
  CETYL_ALCOHOL: 'cetyl-alcohol', // INCI: Cetyl Alcohol | structurel émulsion, inerte
  STEARYL_ALCOHOL: 'stearyl-alcohol', // INCI: Stearyl Alcohol | structurel émulsion, inerte
  BEHENYL_ALCOHOL: 'behenyl-alcohol', // INCI: Behenyl Alcohol | structurel émulsion, inerte
  PEG_100_STEARATE: 'peg-100-stearate', // INCI: PEG-100 Stearate | émulsifiant structurel
  CETEARETH_20: 'ceteareth-20', // INCI: Ceteareth-20 | émulsifiant structurel

  // Silicones véhicules
  DIMETHICONOL: 'dimethiconol', // INCI: Dimethiconol | véhicule/texture inerte
  CYCLOPENTASILOXANE: 'cyclopentasiloxane', // INCI: Cyclopentasiloxane (D5) | véhicule inerte
  CYCLOHEXASILOXANE: 'cyclohexasiloxane', // INCI: Cyclohexasiloxane (D6) | véhicule inerte
  PHENYL_TRIMETHICONE: 'phenyl-trimethicone', // INCI: Phenyl Trimethicone | véhicule inerte

  // Huiles minérales & hydrocarbures inertes
  MINERAL_OIL: 'mineral-oil', // INCI: Mineral Oil (Paraffinum Liquidum) | occlusif inerte
  PETROLATUM: 'petrolatum', // INCI: Petrolatum | occlusif inerte
  ISOHEXADECANE: 'isohexadecane', // INCI: Isohexadecane | véhicule léger inerte
  ISODODECANE: 'isododecane', // INCI: Isododecane | véhicule léger inerte

  // Esters synthétiques véhicules
  DICAPRYLYL_CARBONATE: 'dicaprylyl-carbonate', // INCI: Dicaprylyl Carbonate | émollient véhicule inerte
  COCO_CAPRYLATE_CAPRATE: 'coco-caprylate-caprate', // INCI: Coco-Caprylate/Caprate | émollient véhicule inerte

  // Sels ioniques inertes
  SODIUM_CHLORIDE: 'sodium-chloride', // INCI: Sodium Chloride | sel basique, inerte
  POTASSIUM_CHLORIDE: 'potassium-chloride', // INCI: Potassium Chloride | sel basique, inerte
} as const
