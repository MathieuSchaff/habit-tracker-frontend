// Skincare ingredient slug groups. Root ingredient-slugs.ts re-exports from here.
export const HUMECTANTS = {
  HYDROXYETHYL_UREA: 'hydroxyethyl-urea', // INCI: Hydroxyethyl Urea | powerful humectant, improves skin elasticity
  GLUCOSAMINE_HCL: 'glucosamine-hcl', // INCI: Glucosamine HCl | hyaluronic acid precursor, mild humectant
  SODIUM_LACTATE: 'sodium-lactate', // INCI: Sodium Lactate | sodium salt of lactic acid, NMF component
  ALANINE: 'alanine', // INCI: Alanine | NMF amino acid, repairing and hydrating
  GLYCERIN: 'glycerin', // INCI: Glycerin | star humectant
  HYALURONIC_ACID: 'hyaluronic-acid', // INCI: Hyaluronic Acid | pure hyaluronic acid
  SODIUM_HYALURONATE: 'sodium-hyaluronate', // INCI: Sodium Hyaluronate | sodium salt of hyaluronic acid (most common form)
  HYDROLYZED_HYALURONIC_ACID: 'hydrolyzed-hyaluronic-acid', // INCI: Hydrolyzed Hyaluronic Acid | fragmented hyaluronic acid (deep penetration)
  SODIUM_HYALURONATE_CROSSPOLYMER: 'sodium-hyaluronate-crosspolymer', // INCI: Sodium Hyaluronate Crosspolymer | long-lasting 3D form
  SODIUM_ACETYLATED_HYALURONATE: 'sodium-acetylated-hyaluronate', // INCI: Sodium Acetylated Hyaluronate | "Super HA", high affinity and hydration
  HYDROXYPROPYLTRIMONIUM_HYALURONATE: 'hydroxypropyltrimonium-hyaluronate', // INCI: Hydroxypropyltrimonium Hyaluronate | cationic HA (adherence)
  POTASSIUM_HYALURONATE: 'potassium-hyaluronate', // INCI: Potassium Hyaluronate | potassium salt (continuous hydration)
  POLYGLUTAMIC_ACID: 'polyglutamic-acid', // INCI: Polyglutamic Acid | super-humectant (more than HA)
  SODIUM_PCA: 'sodium-pca', // INCI: Sodium PCA | natural NMF component, powerful humectant
  ARGININE_PCA: 'arginine-pca', // INCI: Arginine PCA / PCA Arginine | NMF humectant
  CALCIUM_PCA: 'calcium-pca', // INCI: Calcium PCA | NMF humectant
  UREA: 'urea', // INCI: Urea | humectant + keratolytic
  BETAINE: 'betaine', // INCI: Betaine | osmolyte humectant, often derived from beet
  PENTYLENE_GLYCOL: 'pentylene-glycol', // INCI: Pentylene Glycol | humectant + mild preservative
  PROPYLENE_GLYCOL: 'propylene-glycol', // INCI: Propylene Glycol | humectant/solvent
  GLYCERYL_GLUCOSIDE: 'glyceryl-glucoside', // INCI: Glyceryl Glucoside | humectant
  ACETYL_GLUCOSAMINE: 'acetyl-glucosamine', // INCI: Acetyl Glucosamine | amino derivative of glucose, humectant + mild brightening
  SNOW_MUSHROOM: 'snow-mushroom', // INCI: Tremella Fuciformis Extract / Polysaccharide | natural super-humectant
  // NMF amino acids
  ARGININE: 'arginine', // INCI: Arginine | NMF amino acid, adjusts pH
  SERINE: 'serine', // INCI: Serine | NMF amino acid
  HISTIDINE: 'histidine', // INCI: Histidine | NMF amino acid
  LEUCINE: 'leucine', // INCI: Leucine | NMF amino acid
  LYSINE_HCL: 'lysine-hcl', // INCI: Lysine HCl | NMF amino acid
  PHENYLALANINE: 'phenylalanine', // INCI: Phenylalanine | NMF amino acid
  TYROSINE: 'tyrosine', // INCI: Tyrosine | amino acid, melanin precursor
  GLUTAMINE: 'glutamine', // INCI: Glutamine | amino acid, hydrating / repairing
  COLLAGEN_AMINO_ACIDS: 'collagen-amino-acids', // INCI: Collagen Amino Acids | humectant collagen hydrolysate
  XYLITYLGLUCOSIDE: 'xylitylglucoside', // INCI: Xylitylglucoside | sugar derivative (Aquaxyl), boosts deep hydration
  XYLITOL: 'xylitol', // INCI: Xylitol | natural sugar humectant
  ANHYDROXYLITOL: 'anhydroxylitol', // INCI: Anhydroxylitol | xylitol derivative, hydration balance
  PCA: 'pca', // INCI: PCA | natural moisturizing factor (NMF)
  TREHALOSE: 'trehalose', // INCI: Trehalose | protective osmolyte, stabilizing humectant
  GLYCINE: 'glycine', // INCI: Glycine | hydrating and soothing amino acid
  MANNITOL: 'mannitol', // INCI: Mannitol | sugar humectant, often used in soothing complexes
  IMPERATA_CYLINDRICA_ROOT: 'imperata-cylindrica-root', // INCI: Imperata Cylindrica Root Extract | herbaceous extract, hydrating osmolyte
  DISODIUM_ACETYL_GLUCOSAMINE_PHOSPHATE: 'disodium-acetyl-glucosamine-phosphate', // INCI: Disodium Acetyl Glucosamine Phosphate | glucosamine derivative, hydrating, brightening
  ACETAMIDOETHOXYETHANOL: 'acetamidoethoxyethanol', // INCI: Acetamidoethoxyethanol (Hydromanil) | long-lasting biomimetic humectant
  SACCHARIDE_ISOMERATE: 'saccharide-isomerate', // INCI: Saccharide Isomerate | long-lasting plant humectant (Pentavitin)
} as const

export const BARRIERE_EMOLLIENTS_OCCLUSIFS = {
  CETEARYL_ALCOHOL: 'cetearyl-alcohol', // INCI: Cetearyl Alcohol | fatty alcohol, emollient and thickener, non-drying
  GLYCERYL_STEARATE: 'glyceryl-stearate', // INCI: Glyceryl Stearate | emollient emulsifier, texture agent
  AVOCADO_OIL: 'avocado-oil', // INCI: Persea Gratissima (Avocado) Oil | avocado oil, nourishing and regenerating
  CERAMIDES: 'ceramides', // INCI: Ceramide (general) or blend (Ceramide NP, AP, EOP...)
  CERAMIDE_NP: 'ceramide-np', // INCI: Ceramide NP (Ceramide 3)
  CERAMIDE_AP: 'ceramide-ap', // INCI: Ceramide AP (Ceramide 6-II)
  CERAMIDE_EOP: 'ceramide-eop', // INCI: Ceramide EOP (Ceramide 1)
  CERAMIDE_NS: 'ceramide-ns', // INCI: Ceramide NS (Ceramide 2) – less common
  CHOLESTEROL: 'cholesterol', // INCI: Cholesterol | NMF component, very important in barrier creams
  PHYTOSPHINGOSINE: 'phytosphingosine', // INCI: Phytosphingosine | barrier lipid, antimicrobial
  GLYCOSPHINGOLIPIDS: 'glycosphingolipids', // INCI: Glycosphingolipids | barrier lipids, often with ceramides
  SQUALANE: 'squalane', // INCI: Squalane | stable hydrocarbon from olive or sugarcane
  SHEA_BUTTER: 'shea-butter', // INCI: Butyrospermum Parkii Butter | shea butter
  BEEF_TALLOW: 'beef-tallow', // INCI: Tallow | bovine fat, very occlusive
  DIMETHICONE: 'dimethicone', // INCI: Dimethicone | occlusive / smoothing silicone
  DICAPRYLYL_ETHER: 'dicaprylyl-ether', // INCI: Dicaprylyl Ether | light emollient, dry texture
  HYDROGENATED_POLYISOBUTENE: 'hydrogenated-polyisobutene', // INCI: Hydrogenated Polyisobutene | synthetic emollient
  PALMITAMIDE_MEA: 'palmitamide-mea', // INCI: Palmitamide MEA | emollient / soothing barrier-restructuring agent
  GLYCERYL_DIBEHENATE: 'glyceryl-dibehenate', // INCI: Glyceryl Dibehenate | emulsifier / thickener
  TRIBEHENIN: 'tribehenin', // INCI: Tribehenin | emollient / thickener
  CIRE_ABEILLE: 'cera-alba', // INCI: Cera Alba | beeswax
  HUILE_GRAINES_TOURNESOL: 'huile-graines-tournesol', // INCI: Helianthus Annuus (Sunflower) Seed Oil
  HUILE_D_ARGAN: 'huile-argan', // INCI: Argania Spinosa Kernel Oil
  HUILE_DE_JOJOBA: 'huile-jojoba', // INCI: Simmondsia Chinensis (Jojoba) Seed Oil
  HUILE_DE_COCO: 'huile-coco', // INCI: Cocos Nucifera (Coconut) Oil
  HUILE_DE_RICIN: 'ricinus-communis-seed-oil', // INCI: Ricinus Communis (Castor) Seed Oil | castor oil
  CAMELLIA_JAPONICA_OIL: 'camellia-japonica-seed-oil', // INCI: Camellia Japonica Seed Oil
  PRUNUS_AMYGDALUS_DULCIS_OIL: 'prunus-amygdalus-dulcis-oil', // INCI: Prunus Amygdalus Dulcis (Sweet Almond) Oil
  BOURRACHE: 'bourrache', // INCI: Borago Officinalis Seed Oil | rich in GLA
  HUILE_ONAGRE: 'huile-onagre', // INCI: Oenothera Biennis Oil | rich in GLA (+ EVENING_PRIMROSE_OIL)
  EVENING_PRIMROSE_OIL: 'evening-primrose-oil', // INCI: Oenothera Biennis Oil | evening primrose oil, rich in essential fatty acids
  HUILE_DE_PEPINS_DE_RAISIN: 'huile-de-pepins-de-raisin', // INCI: Vitis Vinifera (Grape) Seed Oil
  HUILE_DE_PEPINS_DE_FIGUE_DE_BARBARIE: 'huile-de-pepins-de-barbarie', // INCI: Opuntia Ficus-Indica Seed Oil
  APRICOT_KERNEL_OIL: 'prunus-armeniaca-kernel-oil', // INCI: Prunus Armeniaca Kernel Oil | apricot kernel oil
  HUILE_CARTHAME: 'huile-carthame', // INCI: Carthamus Tinctorius Seed Oil SAFFLOWER_SEED_OIL
  CERAMIDE_NG: 'ceramide-ng', // INCI: Ceramide NG | barrier-strengthening ceramide
  LINOLEIC_ACID: 'linoleic-acid', // INCI: Linoleic Acid | essential fatty acid, barrier anti-inflammatory
  BEURRE_CACAO: 'theobroma-cacao-butter', // INCI: Theobroma Cacao Seed Butter | cocoa butter, nourishing and protective
  OLEIC_ACID: 'oleic-acid', // INCI: Oleic Acid | omega-9 fatty acid emollient, strengthens the skin barrier, nourishes and hydrates (ideal for dry/mature skin)
  HUILE_SOJA: 'huile-soja',
  CAPRYLIC_CAPRIC_TRIGLYCERIDE: 'caprylic-capric-triglyceride',
  HUILE_COLZA: 'huile-colza',
  BUTYLENE_GLYCOL: 'butylene-glycol',
  ROSEHIP_SEED_OIL: 'rosehip-seed-oil', // INCI: Rosa Canina Seed Oil | rosehip oil, regenerating, healing, rich in vitamin A/C
  CAMELINA_SEED_OIL: 'camelina-seed-oil', // INCI: Camelina Sativa Seed Oil | camelina oil, omega-3, light and antioxidant
  HEMP_OIL: 'cannabis-sativa-seed-oil', // INCI: Cannabis Sativa Seed Oil | hemp oil, rich in omega-3/6, anti-inflammatory, soothing
  HUILE_COTON: 'huile-coton', // INCI: Gossypium Herbaceum Seed Oil | cottonseed oil
  ETHYLHEXYL_PALMITATE: 'ethylhexyl-palmitate', // INCI: Ethylhexyl Palmitate | esterified emollient
  C15_19_ALKANE: 'c15-19-alkane', // INCI: C15-19 Alkane | biomimetic alkane, dry emollient, silicone alternative
  C10_18_TRIGLYCERIDES: 'c10-18-triglycerides', // INCI: C10-18 Triglycerides | biomimetic solid triglycerides, structuring emollient
  HELIANTHUS_ANNUUS_SEED_WAX: 'helianthus-annuus-seed-wax', // INCI: Helianthus Annuus (Sunflower) Seed Wax | sunflower wax, structuring agent and occlusive film
  LANOLIN_OIL: 'lanolin-oil', // INCI: Lanolin Oil | oily fraction of lanolin, rich occlusive emollient
  HYDROXYSTEARIC_ACID_10: '10-hydroxystearic-acid', // INCI: 10-Hydroxystearic Acid | hydroxylated fatty acid, PPAR-α agonist
  PASSIFLORA_EDULIS: 'passiflora-edulis', // INCI: Passiflora Edulis Seed Oil (Passioline) | linoleic-rich oil, antioxidant
  MYROTHAMNUS_FLABELLIFOLIA: 'myrothamnus-flabellifolia', // INCI: Myrothamnus Flabellifolia Leaf/Stem Extract (Myramaze) | resurrection plant
  SQUALENE: 'squalene', // INCI: Squalene | unsaturated emollient lipid, non-hydrogenated form of squalane
} as const

export const EXFOLIANTS = {
  GLYCOLIC_ACID: 'glycolic-acid', // INCI: Glycolic Acid | star AHA (exfoliant)
  LACTIC_ACID: 'lactic-acid', // INCI: Lactic Acid | mild AHA + humectant
  MANDELIC_ACID: 'mandelic-acid', // INCI: Mandelic Acid | mild AHA, antibacterial
  MALIC_ACID: 'malic-acid', // INCI: Malic Acid | pure AHA
  MALIC_ACID_ESTER: 'malic-acid-ester', // INCI: Malic Acid | mild AHA
  PHA: 'pha', // Poly-Hydroxy Acid | most common INCI: Gluconolactone
  PAPAIN: 'papain', // INCI: Papain | exfoliating enzyme (papaya)
  PROTEASE: 'protease', // INCI: Protease | proteolytic exfoliating enzyme
  CAPRYLOYL_SALICYLIC_ACID: 'capryloyl-salicylic-acid', // INCI: Capryloyl Salicylic Acid | lipophilic BHA, mild exfoliant
  CITRUS_LIMON_FRUIT_WATER: 'citrus-limon-fruit-water', // INCI: Citrus Limon Fruit Water
  SUCCINIC_ACID: 'succinic-acid', // INCI: Succinic Acid | mild exfoliant, sebum regulator
  AHA_ESTERS: 'aha-esters', // AHA esters (esterified hydroxy-carboxylic acids) | extended release
  ESTER_ACIDE_MALIQUE: 'ester-acide-malique', // Malic acid ester | mild AHA with moderate release
  GLYCOLIDE: 'glycolide', // INCI: Glycolide | cyclic dimer of glycolic acid, time-release exfoliant
} as const

export const RETINOIDES = {
  // Classic OTC / cosmetic forms
  RETINOL: 'retinol', // INCI: Retinol | pure vitamin A, 2-step conversion, OTC anti-aging star
  RETINAL: 'retinal', // INCI: Retinal / Retinaldehyde | stronger form, 1-step conversion, 2025-2026 hype
  RETINYL_PALMITATE: 'retinyl-palmitate', // INCI: Retinyl Palmitate | most common ester, very mild (3 steps), beginners / basic creams
  RETINYL_PROPIONATE: 'retinyl-propionate', // INCI: Retinyl Propionate | mild ester, slightly more stable than palmitate, often in "gentle" formulas
  RETINYL_ACETATE: 'retinyl-acetate', // INCI: Retinyl Acetate | basic ester, low potency, very stable
  RETINYL_LINOLLEATE: 'retinyl-linoleate', // INCI: Retinyl Linoleate | less common ester, sometimes for oily skin
  // Modern / next-gen OTC forms
  HYDROXYPINACOLONE_RETINOATE: 'hydroxypinacolone-retinoate', // INCI: Hydroxypinacolone Retinoate | aka Granactive Retinoid / HPR, 0 steps, direct, low irritation, very popular
  GRANACTIVE_RETINOID: 'granactive-retinoid', // INCI: Hydroxypinacolone Retinoate (often marketed as such by The Ordinary etc.)
  RETINYL_RETINOATE: 'retinyl-retinoate', // INCI: Retinyl Retinoate | retinol + retinoic acid hybrid, stable and more active
  SODIUM_RETINOYL_HYALURONATE: 'sodium-retinoyl-hyaluronate', // INCI: Sodium Retinoyl Hyaluronate | retinol bound to hyaluronic acid, hydrating + anti-aging, good tolerance
  // Non-retinoid alternatives (retinol-like)
  BAKUCHIOL: 'bakuchiol', // INCI: Bakuchiol | "natural" alternative from Psoralea corylifolia, mimics the effects without irritation

  // Prescription / medical retinoids (potent, 0 steps)
  TRETINOINE: 'tretinoine', // INCI: Tretinoin | pure retinoic acid, gold standard, very potent but irritating
  ADAPALENE: 'adapalene', // INCI: Adapalene | synthetic retinoid, anti-acne, better tolerated than tretinoin
  TAZAROTENE: 'tazarotene', // INCI: Tazarotene | very potent (often > tretinoin on wrinkles/acne/psoriasis), prescription
  TRIFAROTENE: 'trifarotene', // INCI: Trifarotene | 4th generation, highly selective (RAR-γ), mainly face + body acne, recent prescription
  // Less common but sometimes cited
  ISOTRETINOIN: 'isotretinoin', // INCI: Isotretinoin | rare topical form (better known oral), severe anti-acne
  ALITRETINOIN: 'alitretinoin', // INCI: Alitretinoin | for chronic hand eczema, specific use
} as const

export const PEPTIDES = {
  PALMITOYL_OLIGOPEPTIDE: 'palmitoyl-oligopeptide', // INCI: Palmitoyl Oligopeptide | anti-aging peptide, stimulates collagen synthesis
  ARGIRELINE: 'argireline', // INCI: Acetyl Hexapeptide-8 | "Botox-like" peptide
  MATRIXYL_3000: 'matrixyl-3000', // INCI: Palmitoyl Tripeptide-1 + Palmitoyl Tetrapeptide-7
  PALMITOYL_PENTAPEPTIDE_4: 'palmitoyl-pentapeptide-4', // INCI: Palmitoyl Pentapeptide-4 | original Matrixyl®
  PALMITOYL_TRIPEPTIDE_1: 'palmitoyl-tripeptide-1', // INCI: Palmitoyl Tripeptide-1
  PALMITOYL_TETRAPEPTIDE_7: 'palmitoyl-tetrapeptide-7', // INCI: Palmitoyl Tetrapeptide-7 | anti-inflammatory
  PALMITOYL_TETRAPEPTIDE_10: 'palmitoyl-tetrapeptide-10', // INCI: Palmitoyl Tetrapeptide-10 | anti-aging
  PALMITOYL_TRIPEPTIDE_38: 'palmitoyl-tripeptide-38', // INCI: Palmitoyl Tripeptide-38
  COPPER_PEPTIDES: 'copper-peptides', // INCI: Copper Tripeptide-1 (GHK-Cu) | repair / anti-aging
  ACETYL_TETRAPEPTIDE_5: 'acetyl-tetrapeptide-5', // INCI: Acetyl Tetrapeptide-5
  ACETYL_TETRAPEPTIDE_2: 'acetyl-tetrapeptide-2', // INCI: Acetyl Tetrapeptide-2
  MYRISTOYL_NONAPEPTIDE_3: 'myristoyl-nonapeptide-3', // INCI: Myristoyl Nonapeptide-3
  ACETYL_DIPEPTIDE_1_CETYL_ESTER: 'acetyl-dipeptide-1-cetyl-ester', // INCI: Acetyl Dipeptide-1 Cetyl Ester | Calmosensine™, neurosensory soothing
  SYN_AKE: 'syn-ake', // INCI: Dipeptide Diaminobutyroyl Benzylamide Diacetate | "snake-like" peptide
  PDRN: 'pdrn', // Polydeoxyribonucleotide | INCI: Sodium DNA (from salmon)
  PEPTIDE_COMPLEX: 'peptide-complex', // General category
  NICOTIANA_BENTHAMIANA_OCTAPEPTIDE_30_SH_OLIGOPEPTIDE_2:
    'nicotiana-benthamiana-octapeptide-30-sh-oligopeptide-2',
  NICOTIANA_BENTHAMIANA_HEXAPEPTIDE_40_SH_POLYPEPTIDE_76:
    'nicotiana-benthamiana-hexapeptide-40-sh-polypeptide-76',
  NICOTIANA_BENTHAMIANA_HEXAPEPTIDE_40_SH_OLIGOPEPTIDE_1:
    'nicotiana-benthamiana-hexapeptide-40-sh-oligopeptide-1',
  TETRAPEPTIDE_21: 'tetrapeptide-21', // INCI: Tetrapeptide-21 | biomimetic anti-aging peptide
  COPPER_PALMITOYL_HEPTAPEPTIDE_14: 'copper-palmitoyl-heptapeptide-14', // INCI: Copper Palmitoyl Heptapeptide-14 | copper peptide
  HEPTAPEPTIDE_15_PALMITATE: 'heptapeptide-15-palmitate', // INCI: Heptapeptide-15 Palmitate | palmitoylated peptide
  COPPER_TRIPEPTIDE_1_PALMITAMIDE: 'copper-tripeptide-1-palmitamide', // INCI: Copper Tripeptide-1 Palmitamide | lipophilic copper peptide
  TRIFLUOROACETYL_TRIPEPTIDE_2: 'trifluoroacetyl-tripeptide-2', // INCI: Trifluoroacetyl Tripeptide-2 | anti-sagging
  TRIPEPTIDE_1: 'tripeptide-1', // INCI: Tripeptide-1 | collagen stimulant
  ACETYL_TETRAPEPTIDE_15: 'acetyl-tetrapeptide-15', // INCI: Acetyl Tetrapeptide-15 | neuro-soothing peptide for sensitive skin
  ACETYL_HEXAPEPTIDE_51_AMIDE: 'acetyl-hexapeptide-51-amide', // INCI: Acetyl Hexapeptide-51 Amide | skin immune-modulating peptide
  COPPER_LYSINATE_PROLINATE: 'copper-lysinate-prolinate', // INCI: Copper Lysinate/Prolinate | copper salt of lysine+proline (Neodermyl), copper peptide family
} as const

export const ANTIOXYDANTS_VITAMINES = {
  VITAMIN_C: 'vitamin-c', // Category – variable INCI
  ASCORBYL_GLUCOSIDE: 'ascorbyl-glucoside', // INCI: Ascorbyl Glucoside | stable vitamin C derivative
  ASCORBYL_PALMITATE: 'ascorbyl-palmitate', // INCI: Ascorbyl Palmitate | liposoluble form of vitamin C
  MAGNESIUM_ASCORBYL_PHOSPHATE: 'magnesium-ascorbyl-phosphate', // INCI: Magnesium Ascorbyl Phosphate | stable vitamin C derivative
  SODIUM_ASCORBYL_PHOSPHATE: 'sodium-ascorbyl-phosphate', // INCI: Sodium Ascorbyl Phosphate | vitamin C derivative
  THREE_O_ETHYL_ASCORBIC_ACID: '3-o-ethyl-ascorbic-acid', // INCI: 3-O-Ethyl Ascorbic Acid | stable and penetrating vitamin C derivative
  TOCOPHEROL: 'tocopherol', // INCI: Tocopherol | pure vitamin E
  TOCOPHERYL_ACETATE: 'tocopheryl-acetate', // INCI: Tocopheryl Acetate | stable vitamin E ester
  TOCOPHERYL_GLUCOSIDE: 'tocopheryl-glucoside', // INCI: Tocopheryl Glucoside | hydrophilic vitamin E derivative
  CYANOCOBALAMIN: 'cyanocobalamin', // INCI: Cyanocobalamin | vitamin B12
  NAD: 'nad', // INCI: NAD+ | antioxidant coenzyme / cellular energy
  RIBOSE: 'ribose', // INCI: Ribose | cellular energy sugar
  COQ10: 'coq10', // INCI: Ubiquinone | mitochondrial antioxidant
  ERGOTHIONEINE: 'ergothioneine', // INCI: Ergothioneine | potent and stable antioxidant
  RESVERATROL: 'resveratrol', // INCI: Resveratrol | antioxidant polyphenol
  CARNOSINE: 'carnosine', // INCI: Carnosine | antioxidant / anti-glycation dipeptide
  GREEN_TEA: 'green-tea', // INCI: Camellia Sinensis Leaf Extract | polyphenol antioxidant
  VACCINIUM_MYRTILLUS: 'vaccinium-myrtillus', // INCI: Vaccinium Myrtillus Fruit Extract (blueberry) | antioxidant
  HELICHRYSE_IMMORTELLE: 'helichryse-immortelle', // INCI: Helichrysum Italicum Flower Extract | antioxidant / regenerating
  CURCUMA_LONGA_ROOT_EXTRACT: 'curcuma-longa-root-extract', // INCI: Curcuma Longa (Turmeric) Root Extract | antioxidant
  ROMARIN: 'romarin', // INCI: Rosmarinus Officinalis (Rosemary) Leaf Extract | antioxidant
  SCHISANDRA: 'schisandra-sphenanthera', // INCI: Schisandra Sphenanthera Fruit Extract | adaptogen / antioxidant
  SALVIA_MILTIORRHIZA: 'salvia-miltiorrhiza', // INCI: Salvia Miltiorrhiza Root Extract (Chinese sage) | antioxidant
  PANAX_GINSENG: 'panax-ginseng', // INCI: Panax Ginseng Root Extract | adaptogen / antioxidant
  PLANKTON_EXTRACT: 'plankton-extract', // INCI: Plankton Extract | antioxidant / marine hydrating agent
  ASCOPHYLLUM_NODOSUM_EXTRACT: 'ascophyllum-nodosum-extract', // INCI: Ascophyllum Nodosum Extract | algae, antioxidant
  ASPARAGOPSIS_ARMATA_EXTRACT: 'asparagopsis-armata-extract', // INCI: Asparagopsis Armata Extract | red algae, anti-redness
  HUILE_ARGOUSIER: 'hippophae-rhamnoides', // INCI: Hippophae Rhamnoides Fruit Oil / Extract (sea buckthorn) | rich in antioxidants

  ASTAXANTHINE: 'astaxanthine', // INCI: Haematococcus Pluvialis Extract | algae rich in astaxanthin (potent antioxidant)
  HAEMATOCOCCUS_PLUVIALIS: 'astaxanthine', // Alias
  EPIGALLOCATECHIN_GALLATYL_GLUCOSIDE: 'egcg-glucoside', // INCI: Epigallocatechin Gallatyl Glucoside | stable EGCG
  PUNICA_GRANATUM: 'punica-granatum', // INCI: Punica Granatum Fruit Extract | pomegranate, anti-aging antioxidant
  VITAMIN_K1: 'vitamine-k1',
  FERULIC_ACID: 'ferulic-acid',
  HIBISCUS_SABDARIFFA: 'hibiscus-sabdariffa', // INCI: Hibiscus Sabdariffa Flower Extract | antioxidant, radiance, anti-aging
  BEET_ROOT_EXTRACT: 'beet-root-extract', // INCI: Beta Vulgaris Root Extract | beetroot, antioxidant betalains
  GARDENIA_FRUIT_EXTRACT: 'gardenia-fruit-extract', // INCI: Gardenia Jasminoides Fruit Extract | brightening / antioxidant
  GLYCERYL_ASCORBATE: '3-glyceryl-ascorbate', // INCI: 3-O-Glyceryl Ascorbate | stable and hydrophilic vitamin C derivative
  BENZOTRIAZOLYL_DODECYL_P_CRESOL: 'benzotriazolyl-dodecyl-p-cresol', // INCI: Benzotriazolyl Dodecyl p-Cresol (Tinogard TT) | formula-stabilizing antioxidant
  SUPEROXIDE_DISMUTASE: 'superoxide-dismutase', // INCI: Superoxide Dismutase | antioxidant enzyme, neutralizes superoxides
  SOPHORA_JAPONICA_FLOWER_EXTRACT: 'sophora-japonica-flower-extract', // INCI: Sophora Japonica Flower Extract | flavonoid-rich extract (rutin), antioxidant
  ASCORBYL_TETRAISOPALMITATE: 'ascorbyl-tetraisopalmitate', // INCI: Ascorbyl Tetraisopalmitate / Tetrahexyldecyl Ascorbate (alias: THDA / VC-IP) — ultra-stable liposoluble vitamin C derivative
  POLYGONUM_CUSPIDATUM_EXTRACT: 'polygonum-cuspidatum-extract', // INCI: Polygonum Cuspidatum Root Extract | natural source of resveratrol
  CISTUS_MONSPELIENSIS_EXTRACT: 'cistus-monspeliensis-extract', // INCI: Cistus Monspeliensis Extract | rock rose, Mediterranean antioxidant plant
  ACETYL_ZINGERONE: 'acetyl-zingerone', // INCI: Acetyl Zingerone | next-gen antioxidant (ginger), Vit C stabilizer
  GENISTEIN: 'genistein', // INCI: Genistein | soy isoflavone, phyto-estrogen-like antioxidant
  QUERCETIN: 'quercetin', // INCI: Quercetin | antioxidant and anti-inflammatory flavonoid
  SILYBIN: 'silybin', // INCI: Silybin | milk-thistle flavonolignan, anti-aging / anti-redness
  HESPERIDIN_METHYL_CHALCONE: 'hesperidin-methyl-chalcone', // INCI: Hesperidin Methyl Chalcone | citrus flavonoid, venotonic
  DIMETHYLMETHOXYCHROMANOL: 'dimethylmethoxychromanol', // INCI: Dimethylmethoxy Chromanol (Lipochroman) | dual hydro/lipo-mode antioxidant
  TETRAHYDRODIFERULOYLMETHANE: 'tetrahydrodiferuloylmethane', // INCI: Tetrahydrodiferuloylmethane (THC) | tetrahydrocurcuminoid, anti-pigmentation
  NARINGENIN: 'naringenin', // INCI: Naringenin | citrus flavonoid, anti-redness partner to azelaic acid
  GLUCOSYLRUTIN: 'glucosylrutin', // INCI: Glucosylrutin | stable glycosylated rutin
  RUTIN: 'rutin', // INCI: Rutin | quercetin glycoside, venotonic antioxidant
} as const

export const APAISANTS_ANTI_INFLAMMATOIRES = {
  SODIUM_DEXTRAN_SULFATE: 'sodium-dextran-sulfate', // INCI: Sodium Dextran Sulfate | soothing and vascular decongestant
  CENTELLA_ASIATICA: 'centella-asiatica', // INCI: Centella Asiatica Extract
  CENTELLA_COMPLEX: 'centella-complex', // Centella active complex
  MADECASSOSIDE: 'madecassoside', // INCI: Madecassoside | pure Centella triterpene
  ASIATICOSIDE: 'asiaticoside', // INCI: Asiaticoside | pure Centella compound
  ALOE_VERA: 'aloe-vera', // INCI: Aloe Barbadensis Leaf Juice / Extract
  AVENA_SATIVA: 'avena-sativa', // INCI: Avena Sativa (Oat) Kernel Extract | soothing beta-glucan
  BETA_GLUCAN: 'beta-glucan', // INCI: Beta-Glucan | soothing / immunomodulator
  HEARTLEAF: 'heartleaf', // INCI: Houttuynia Cordata Extract | K-beauty anti-inflammatory
  HEARTLEAF_WATER: 'heartleaf-water', // INCI: Houttuynia Cordata Flower/Leaf/Stem Water | soothing distillate
  BISABOLOL: 'bisabolol', // INCI: Bisabolol | soothing, from chamomile
  ECTOIN: 'ectoin', // INCI: Ectoin | cell protector, anti-pollution, barrier-strengthening
  CALENDULA: 'calendula-officinalis', // INCI: Calendula Officinalis Flower Extract
  EXTRAIT_BARDANE: 'arctium-lappa-root-extract', // INCI: Arctium Lappa Root Extract | burdock, soothing, purifying (Asteraceae)
  BLEUET: 'bleuet', // INCI: Centaurea Cyanus Flower Water / Extract | cornflower, soothing for eyes

  MAUVE: 'mauve', // INCI: Malva Sylvestris Extract | softening, soothing
  PAQUERETTE: 'paquerette', // INCI: Bellis Perennis (Daisy) Flower Extract | soothing / brightening
  HAMAMELIS: 'hammamelis', // INCI: Hamamelis Virginiana (Witch Hazel) Water / Extract | astringent, soothing
  CUCUMBER_EXTRACT: 'cucumis-sativus-fruit-extract', // INCI: Cucumis Sativus Fruit Extract | decongestant, soothing
  PORTULACA_OLERACEA: 'portulaca-oleracea', // INCI: Portulaca Oleracea Extract | anti-inflammatory
  RHAMNOSE: 'rhamnose', // INCI: Rhamnose | sugar, sometimes anti-inflammatory
  MANGANESE_GLUCONATE: 'manganese-gluconate', // INCI: Manganese Gluconate | trace element, soothing
  EAU_DE_ROSE: 'eau-de-rose', // INCI: Rosa Damascena Flower Water | soothing, toning
  ROYAL_JELLY_EXTRACT: 'royal-jelly-extract', // INCI: Royal Jelly Extract | soothing / nourishing
  PROPOLIS: 'propolis-extract', // INCI: Propolis Extract | soothing / antioxidant / healing
  ZANTHOXYLUM_BUNGEANUM: 'zanthoxylum-bungeanum', // INCI: Zanthoxylum Bungeanum Fruit Extract | Sichuan pepper, anti-itch
  COLLOIDAL_OATMEAL: 'colloidal-oatmeal',
  EXTRAIT_CAMOMILLE: 'extrait-camomille',
  EXTRAIT_EPILOBE: 'extrait-epilobe',
  BOSWELLIA_SERRATA: 'boswellia-serrata', // INCI: Boswellia Serrata Gum/Extract | potent soothing agent
  ZINGIBER_OFFICINALE: 'zingiber-officinale', // INCI: Zingiber Officinale Root Extract | ginger, toning/antioxidant
  MORINDA_CITRIFOLIA: 'morinda-citrifolia', // INCI: Morinda Citrifolia Fruit Extract | Noni, protective/antioxidant
  GLYCYRRHETINIC_ACID: 'glycyrrhetinic-acid', // INCI: Glycyrrhetinic Acid (alias INN/BAN: Enoxolone), anti-inflammatory
  DIPOTASSIUM_GLYCYRRHIZATE: 'dipotassium-glycyrrhizate', // INCI: Dipotassium Glycyrrhizate | potent soothing agent from licorice
  NEUTRAZEN: 'neutrazen', // INCI: (specialized soothing component) | complex for reactive skin / rosacea
  SYMSITIVE: 'symsitive', // INCI: 4-t-Butylcyclohexanol | skin sensitivity regulator
  LICOCHALCONE_A: 'licochalcone-a', // INCI: Glycyrrhiza Inflata Root Extract | potent antioxidant and soothing agent from Chinese licorice
  ASTER_TRIPOLIUM: 'aster-tripolium', // INCI: Aster Tripolium Extract | sea aster, soothing and anti-redness
  SAMBUCUS_NIGRA: 'sambucus-nigra', // INCI: Sambucus Nigra Flower Extract | elderflower, soothing
  DAUCUS_CAROTA: 'daucus-carota', // INCI: Daucus Carota Sativa Root Extract | carrot, soothing
  ARTEMISIA_ANNUA: 'artemisia-annua', // INCI: Artemisia Annua Extract | soothing mugwort (K-beauty signature)
  GINKGO_BILOBA: 'ginkgo-biloba', // INCI: Ginkgo Biloba Leaf Extract | antioxidant / circulatory
  MALTOOLIGOSYL_GLUCOSIDE: 'maltooligosyl-glucoside', // INCI: Maltooligosyl Glucoside | biomimetic soothing polysaccharide (Rosactiv 2.0)
  METHYLHYDANTOIN_IMIDE: 'methylhydantoin-imide', // INCI: 1-Methylhydantoin-2-Imide | TRPV1 neuro-soothing active, sensory discomfort relief
  SWERTIA_CHIRATA: 'swertia-chirata', // INCI: Swertia Chirata Extract (swertiamarin) | soothing, Himalayan gentian
  SALICORNIA_HERBACEA: 'salicornia-herbacea', // INCI: Salicornia Herbacea Extract (Saliporine-8) | neurocosmetic soothing agent
} as const

export const ECLAIRCISSANTS_DEPIGMENTANTS = {
  ALPHA_ARBUTIN: 'alpha-arbutin', // INCI: Alpha-Arbutin | anti-dark-spot
  KOJIC_ACID: 'kojic-acid', // INCI: Kojic Acid | tyrosinase inhibitor
  TRANEXAMIC_ACID: 'tranexamic-acid', // INCI: Tranexamic Acid | anti-spot, anti-inflammatory
  PHENYLETHYL_RESORCINOL: 'phenylethyl-resorcinol', // INCI: Phenylethyl Resorcinol | SymWhite 377
  SEPIWHITE: 'sepiwhite', // INCI: Undecylenoyl Phenylalanine | Sepiwhite™
  HEXYLRESORCINOL: 'hexylresorcinol', // INCI: Hexylresorcinol | brightening, tyrosinase inhibitor
  BUTYLRESORCINOL: 'butylresorcinol', // INCI: 4-Butylresorcinol | potent brightening agent, tyrosinase inhibitor
  REGLISSE: 'reglisse', // INCI: Glycyrrhiza Glabra (Licorice) Root Extract | brightening
  DIACETYL_BOLDINE: 'diacetyl-boldine', // INCI: Diacetyl Boldine | brightening / antioxidant
  GLUTATHION: 'glutathion', // INCI: Glutathione | major antioxidant, brightening
  MELITANE: 'melitane', // INCI: Acetyl Hexapeptide-1 | pro-pigmenting peptide (self-tanning)
  MELASYL: 'melasyl', // INCI: Melasyl | specific anti-dark-spot agent (patented)
  GALLYL_GLUCOSIDE: 'gallyl-glucoside', // INCI: Gallyl Glucoside | gallic acid derivative, antioxidant brightening
  IRIS_EXTRACT: 'iris-extract', // INCI: Iris Florentina Root Extract | natural brightening, depigmenting
} as const

export const ANTI_ACNE_SEBUM = {
  AZELAIC_ACID: 'azelaic-acid', // INCI: Azelaic Acid | anti-acne, anti-rosacea, brightening
  AZELOCALM: 'azelocalm', // INCI: Azelaic Acid (complexed variant) | soothed azelaic acid, better tolerance
  AZECOGLYCINE: 'azecoglycine', // INCI: Azelaic Acid + Glycine | synergistic anti-acne sebum-regulating complex
  SALICYLIC_ACID: 'salicylic-acid', // INCI: Salicylic Acid | BHA
  NIACINAMIDE: 'niacinamide', // INCI: Niacinamide | vitamin B3, multi-function / sebum regulator
  ACNESYL_X_PRO: 'acnesyl-x-pro', // Multi-active anti-acne complex | sebum control, antibacterial, anti-comedogenic
  ZINC_PCA: 'zinc-pca', // INCI: Zinc PCA | sebum regulator
  ZINC_GLUCONATE: 'zinc-gluconate', // INCI: Zinc Gluconate | anti-inflammatory / sebum regulator
  ZINC_LACTATE: 'zinc-lactate', // INCI: Zinc Lactate | sebum regulator, anti-blemish
  ZINC_SULFATE: 'zinc-sulfate', // INCI: Zinc Sulfate | astringent, antimicrobial, sebum regulator
  COPPER_SULFATE: 'copper-sulfate', // INCI: Copper Sulfate | antimicrobial, astringent
  COPPER_GLUCONATE: 'copper-gluconate', // INCI: Copper Gluconate | sebum regulator / antibacterial
  COPPER_PCA: 'copper-pca', // INCI: Copper PCA | copper salt of PCA, microbial and sebum regulator
  SULFUR: 'soufre', // INCI: Sulfur | keratolytic, anti-acne
  TEA_TREE: 'tea-tree', // INCI: Melaleuca Alternifolia Leaf Oil | natural antibacterial
  HYPOCHLOROUS_ACID: 'hypochlorous-acid', // INCI: Hypochlorous Acid | mild antiseptic
  PIROCTONE_OLAMINE: 'piroctone-olamine', // INCI: Piroctone Olamine | antifungal (anti-Malassezia), anti-dandruff
  COMEDOCLASTIN: 'comedoclastin', // Titrated Silybum marianum extract (Cleanance) | anti-comedogenic
  LENS_ESCULENTA_SEED_EXTRACT: 'lens-esculenta-seed-extract', // Lentil extract (Oil Control) | mattifying
  PEA_EXTRACT: 'pea-extract', // INCI: Pisum Sativum Extract | pea extract, mattifying / sebum
  SARCOSINE: 'sarcosine', // INCI: Sarcosine | anti-sebum amino acid, cleansing
  AMMONIUM_LACTATE: 'ammonium-lactate', // INCI: Ammonium Lactate | mild keratolytic, anti-acne
  AZELAMIDE_MEA: 'azelamide-mea', // INCI: Azelamide MEA | amide derivative of azelaic acid, soluble anti-blemish
  AZELAMIDOPROPYL_DIMETHYL_AMINE: 'azelamidopropyl-dimethyl-amine', // INCI: Azelamidopropyl Dimethyl Amine (Epi-On) | amine derivative of azelaic acid
} as const

export const ANTI_ROSACEE_VASOCONSTRICTEURS = {
  BRIMONIDINE: 'brimonidine', // INCI: Brimonidine Tartrate | topical vasoconstrictor (Mirvaso®)
  OXYMETAZOLINE: 'oxymetazoline', // INCI: Oxymetazoline HCl | topical vasoconstrictor (Rhofade®)
  IVERMECTINE: 'ivermectine', // INCI: Ivermectin | anti-Demodex (Soolantra®)
  METRONIDAZOLE: 'metronidazole', // INCI: Metronidazole | antibiotic / anti-inflammatory (Rozex®)
  ANGIOPAUSINE: 'angiopausine', // Rosamed-specific active | anti-vascular-redness
  ENDOTHELYOL: 'endothelyol', // Endothelyol® component | vascular protection / photoprotection
} as const

export const FILTRES_UV = {
  TITANIUM_DIOXIDE: 'titanium-dioxide', // Mineral filter
  ZINC_OXIDE: 'zinc-oxyde', // Mineral filter
  BIS_ETHYLHEXYLOXYPHENOL_METHOXYPHENYL_TRIAZINE: 'bis-ethylhexyloxyphenol-methoxyphenyl-triazine', // Tinosorb S
  DIETHYLAMINO_HYDROXYBENZOYL_HEXYL_BENZOATE: 'diethylamino-hydroxybenzoyl-hexyl-benzoate', // Uvinul A Plus
  ETHYLHEXYL_TRIAZONE: 'ethylhexyl-triazone', // Uvinul T 150
  TRIASORB: 'triasorb', // Ultra broad-spectrum filter
  IRON_OXIDE: 'oxide-de-fer', // INCI: Iron Oxides | mineral pigments, visible-light / HEV protection
  DROMETRIZOLE_TRISILOXANE: 'drometrizole-trisiloxane', // INCI: Drometrizole Trisiloxane | photostable UVA filter (Mexoryl XL)
  BUTYL_METHOXYDIBENZOYLMETHANE: 'butyl-methoxydibenvoylmethane', // INCI: Butyl Methoxydibenzoylmethane | UVA filter (Avobenzone)
  AVOBENZONE: 'butyl-methoxydibenvoylmethane', // Alias
  OCTOCRYLENE: 'octocrylene', // INCI: Octocrylene | stabilizing UVB filter
  HOMOSALATE: 'homosalate', // INCI: Homosalate | UVB filter
  ETHYLHEXYL_SALICYLATE: 'ethylhexyl-salicylate', // INCI: Ethylhexyl Salicylate | UVB filter (Octisalate)
  ISOAMYL_P_METHOXYCINNAMATE: 'isoamyl-p-methoxycinnamate', // INCI: Isoamyl p-Methoxycinnamate | UVB filter (Amiloxate)
  ETHYLHEXYL_METHOXYCINNAMATE: 'ethylhexyl-methoxycinnamate', // INCI: Ethylhexyl Methoxycinnamate | UVB filter (Octinoxate)
  METHYLENE_BIS_BENZOTRIAZOLYL_TETRAMETHYLBUTYLPHENOL:
    'methylene-bis-benzotriazolyl-tetramethylbutylphenol', // Tinosorb M – UVA/UVB, mineral-like
  TRIS_BIPHENYL_TRIAZINE: 'tris-biphenyl-triazine', // Tinosorb A2B nano – broad spectrum
  DIETHYLHEXYL_BUTAMIDO_TRIAZONE: 'diethylhexyl-butamido-triazone', // INCI: Diethylhexyl Butamido Triazone | Uvasorb HEB – broad-spectrum UVB/UVA filter, very photostable
  ENSULIZOLE: 'ensulizole', // INCI: Phenylbenzimidazole Sulfonic Acid | water-soluble UVB filter (Ensulizole / PBSA)
} as const

export const PROBIOTIQUES_PREBIOTIQUES_POSTBIOTIQUES = {
  PSEUDOALTEROMONAS_FERMENT: 'pseudoalteromonas-ferment', // INCI: Pseudoalteromonas Ferment Extract | marine postbiotic, hydrating and protective
  PROBIOTICS: 'probiotics', // Common INCI: Lactobacillus Ferment | living bacteria
  POSTBIOTICS: 'postbiotics', // Variable INCI (e.g. Lactobacillus Ferment Filtrate)
  ALPHA_GLUCAN_OLIGOSACCHARIDE: 'alpha-glucan-oligosaccharide', // INCI: Alpha-Glucan Oligosaccharide | prebiotic
  SNAIL_MUCIN: 'snail-secretion-filtrate', // INCI: Snail Secretion Filtrate | regenerating / hydrating
  D_SENSINOSE: 'd-sensinose', // Postbiotic active (Tolérance Control)
  AQUAPHILUS_DOLOMIAE_EXTRACT: 'aquaphilus-dolomiae-extract', // I-modulia (XeraCalm)
  AQUAPHILUS_DOLOMIAE_FERMENT_FILTRATE: 'aquaphilus-dolomiae-ferment-filtrate', // C+ Restore (Cicalfate+)
  VITREOSCILLA_FERMENT: 'vitreoscilla-ferment', // INCI: Vitreoscilla Ferment | soothing, repairing and fortifying bacterial ferment (postbiotic-like)
  FRUCTOOLIGOSACCHARIDES: 'fructooligosaccharides', // INCI: Fructooligosaccharides | prebiotic, supports the skin microbiome
  INULINE: 'inuline', // INCI: Cichorium Intybus Root Extract | chicory root, source of prebiotic inulin
  MICROBIOTA_REGULATOR: 'microbiota-regulator', // Skin microbiome regulator | balances bacterial flora
  MELABIOME_XP: 'melabiome-xp', // Pre/postbiotic complex | microbiome rebalancing and protection
  GALACTOMYCES_FERMENT_FILTRATE: 'galactomyces-ferment-filtrate', // INCI: Galactomyces Ferment Filtrate | Pitera (SK-II), nutrient-rich ferment
  RAHNELLA_SOY_PROTEIN_FERMENT: 'rahnella-soy-protein-ferment', // INCI: Rahnella/Soy Protein Ferment | soy protein ferment postbiotic (Bio-Bustyl), skin support
  LACTOBACILLUS_FERMENT: 'lactobacillus-ferment', // INCI: Lactobacillus Ferment | probiotic ferment, soothing and barrier support
  LEUCONOSTOC_FERMENT_FILTRATE: 'leuconostoc-ferment-filtrate', // INCI: Leuconostoc Ferment Filtrate | radish-root ferment, hydrating and mild preservative
  SACCHAROMYCES_FERMENT_FILTRATE: 'saccharomyces-ferment-filtrate', // INCI: Saccharomyces Ferment Filtrate | yeast ferment, radiance and hydration
} as const

export const ACTIFS_ANTI_AGE_REPARATEURS = {
  ADENOSINE: 'adenosine', // Anti-wrinkle
  ASIATIC_ACID: 'asiatic-acid', // INCI: Asiatic Acid | TECA (madecassic + asiaticoside + asiatic acid) – signature Centella soothing agent
  MADECASSIC_ACID: 'madecassic-acid', // INCI: Madecassic Acid | Centella component, soothing and repairing
  ALLANTOIN: 'allantoin', // INCI: Allantoin | soothing, healing
  PANTHENOL: 'panthenol', // INCI: Panthenol | provitamin B5, soothing / hydrating
  CHARDON_MARIE: 'chardon-marie', // INCI: Silybum Marianum Seed Extract | regenerating
  HYDROXYPALMITOYL_SPHINGANINE: 'hydroxypalmitoyl-sphinganine', // INCI: Hydroxypalmitoyl Sphinganine | ceramide-like, strengthens the barrier
  TWO_OLEAMIDO_1_3_OCTADECANEDIOL: '2-oleamido-1-3-octadecanediol', // INCI: 2-Oleamido-1,3-Octadecanediol | biomimetic repairing lipid
  PROTEOGLYCAN_COMPLEX: 'proteoglycan-complex', // Proteoglycan complex | skin structure
  ACMELLA_OLERACEA_EXTRACT: 'acmella-oleracea-extract', // INCI: Acmella Oleracea Extract | natural lifting effect, plant "Botox-like"
  PHYTIC_ACID: 'phytic-acid', // INCI: Phytic Acid | antioxidant and metal chelator, mild anti-inflammatory
  CALCIUM_PANTOTHENATE: 'calcium-pantothenate', // INCI: Calcium Pantothenate | calcium salt of provitamin B5, soothing and repairing
  BIOTIN: 'biotin', // INCI: Biotin | topical vitamin B8, strengthens the skin barrier
  HYDROLYZED_LUPINE_PROTEIN: 'hydrolyzed-lupine-protein', // INCI: Hydrolyzed Lupine Protein | plant peptides, firmness
  TRIMETHOXYBENZYL_ACETYLSINAPATE: 'trimethoxybenzyl-acetylsinapate', // INCI: Trimethoxybenzyl Acetylsinapate | anti-glycation and photoprotective active
  ONOPORDUM_ACANTHIUM_EXTRACT: 'onopordum-acanthium-extract', // INCI: Onopordum Acanthium Extract | silver thistle, anti-glycation and anti-aging
  METHYLSILANOL_MANNURONATE: 'methylsilanol-mannuronate', // INCI: Methylsilanol Mannuronate | topical organosilicon (Algisium C), silicon skin support
} as const

export const CIRCULATOIRE_DRAINAGE = {
  ESCIN: 'escin', // INCI: Escin | from horse chestnut, anti-edema / circulatory
  RUSCUS_ACULEATUS: 'ruscus-aculeatus', // INCI: Ruscus Aculeatus Root Extract (butcher's broom) | venotonic
  CAFFEINE: 'caffeine', // INCI: Caffeine | lipolytic, decongestant
  ARNICA: 'arnica', // INCI: Arnica Montana Flower Extract | anti-bruising, circulatory
  CYPRES: 'cypres', // INCI: Cupressus Sempervirens | toning, circulatory and astringent
} as const

export const TENSIOACTIFS_NETTOYANTS = {
  COCO_GLUCOSIDE: 'coco-glucoside', // INCI: Coco-Glucoside | mild non-ionic surfactant
  DECYL_GLUCOSIDE: 'decyl-glucoside', // INCI: Decyl Glucoside | mild surfactant
  SODIUM_LAUROYL_METHYL_ISETHIONATE: 'sodium-lauroyl-methyl-isethionate', // INCI: Sodium Lauroyl Methyl Isethionate | mild surfactant
  SODIUM_COCOYL_ISETHIONATE: 'sodium-cocoyl-isethionate', // INCI: Sodium Cocoyl Isethionate | mild coco-derived surfactant
  GLEDITSIA_TRIACANTHOS_SEED_EXTRACT: 'gleditsia-seed-extract', // INCI: Gleditsia Triacanthos Seed Extract | natural mild surfactant / thickener
  PEG_20_GLYCERYL_TRIISOSTEARATE: 'peg-20-glyceryl-triisostearate', // INCI: PEG-20 Glyceryl Triisostearate | oily emulsifier (cleansers)
  COCAMIDOPROPYL_HYDROXYSULTAINE: 'cocamidopropyl-hydroxysultaine', // INCI: Cocamidopropyl Hydroxysultaine | mild amphoteric surfactant
  CAPRYLOYL_GLYCINE: 'capryloyl-glycine', // INCI: Capryloyl Glycine | amino acid alkyl amide, mild antimicrobial, sebum regulator
} as const

export const TEXTURANTS_FONCTIONNELS = {
  SILICA: 'silica', // INCI: Silica | mattifying, texturizing
  HYDROCOLLOID: 'hydrocolloid', // INCI: Hydrocolloid | occlusive dressing
  ZEA_MAYS_STARCH: 'zea-mays-starch', // INCI: Zea Mays Starch | corn starch, texturizing / absorbent
  ORYZA_SATIVA: 'oryza-sativa', // INCI: Oryza Sativa (Rice) Starch / Extract | texturizing, soothing
  SPHINGOMONAS_FERMENT: 'sphingomonas-ferment-extract', // INCI: Sphingomonas Ferment Extract | natural thickener
  SALIX_NIGRA: 'salix-nigra', // INCI: Salix Nigra (Willow) Bark Extract | mild exfoliant / astringent
  CITRUS_AURANTIUM_DULCIS: 'citrus-aurantium-dulcis', // INCI: Citrus Aurantium Dulcis (Orange) Peel Extract / Oil
  VERVEINE: 'verveine', // INCI: Lippia Citriodora / Verbena Officinalis
  MENTHE_POIVREE: 'menthe-poivree', // INCI: Mentha Piperita (Peppermint) Oil / Extract | refreshing
  BIOSACCHARIDE_GUM_1: 'biosaccharide-gum-1', // INCI: Biosaccharide Gum-1 | film-forming exopolysaccharide, long-lasting hydration
  AHNFELTIA_CONCINNA: 'ahnfeltia-concinna', // INCI: Ahnfeltiopsis Concinna Extract | red algae, hydrating and film-forming
  CHARCOAL_POWDER: 'charcoal-powder', // INCI: Charcoal / Activated Charcoal | powerful absorbent, purifying, detoxifying
  KAOLIN: 'kaolin', // INCI: Kaolin | mineral clay, absorbent, purifying, texturizing (powder or suspension)
  BENTONITE: 'bentonite', // INCI: Bentonite | montmorillonite clay, powerful absorbent and purifying
  CORN_STARCH_MODIFIED: 'corn-starch-modified', // INCI: Corn Starch Modified / Distarch Phosphate | modified corn starch, mattifying absorbent texturizer
  BIOSACCHARIDE_GUM_4: 'biosaccharide-gum-4', // INCI: Biosaccharide Gum-4 | biotech polysaccharide, anti-pollution
  AMMONIUM_ACRYLOYLDIMETHYLTAURATE_VP_COPOLYMER: 'ammonium-acryloyldimethyltaurate-vp-copolymer', // INCI: Ammonium Acryloyldimethyltaurate/VP Copolymer | rheology gelling agent (Aristoflex AVC)
} as const

export const DIVERS_NON_CLASSES = {
  HUMECTANTS_EMOLLIENTS_OCCLUSIFS: 'humectants-emollients-occlusifs', // General category
  PEPTIDES: 'peptides', // General category
  BIXA_ORELLANA: 'bixa-orellana', // INCI: Bixa Orellana Seed Extract / Annatto | source of bixin (natural dye)
  AMARANTHUS_CAUDATUS: 'amaranthus', // INCI: Amaranthus Caudatus Seed Extract
  OPHIOPOGON_JAPONICUS: 'ophiopogon-japonicus', // INCI: Ophiopogon Japonicus Root Extract (mondo grass)
  ISOSORBIDE_DICAPRYLATE: 'isosorbide-dicaprylate', // INCI: Isosorbide Dicaprylate | smart lipophilic humectant
  RICE_AMINO_ACIDS: 'rice-amino-acids', // INCI: Rice Amino Acids | rice amino acids, conditioning
  HUILE_BABASSU: 'huile-babassu', // INCI: Orbignya Oleifera Seed Oil | babassu oil, light emollient
  PINUS_PALUSTRIS: 'pinus-palustris', // INCI: Pinus Palustris Leaf Extract | pine, toning antioxidant
  VETIVERIA_ZIZANOIDES: 'vetiveria-zizanoides', // INCI: Vetiveria Zizanoides Root Extract | vetiver, soothing regenerating
  APHANIZOMENON_FLOS_AQUAE: 'aphanizomenon-flos-aquae', // INCI: Aphanizomenon Flos-Aquae Extract | nutritive blue-green algae
  ULVA_LACTUCA: 'ulva-lactuca', // INCI: Ulva Lactuca Extract | sea lettuce, rich in magnesium and elastin-like compounds (suppleness)
  CHLORELLA_VULGARIS: 'chlorella-vulgaris', // INCI: Chlorella Vulgaris Extract | green microalgae, dark-circle corrector and restructuring
  SPIRULINA_PLATENSIS: 'spirulina-platensis', // INCI: Spirulina Platensis Extract | blue microalgae, protein-rich superfood, revitalizing
  DUNALIELLA_SALINA: 'dunaliella-salina', // INCI: Dunaliella Salina Extract | orange microalgae, very rich in beta-carotene (glow effect and antioxidant)
  CHONDRUS_CRISPUS: 'chondrus-crispus', // INCI: Chondrus Crispus Extract | Irish moss, protective film-forming and natural gelling agent
  PALMARIA_PALMATA: 'palmaria-palmata', // INCI: Palmaria Palmata Extract | Dulse, toning, promotes microcirculation (complexion radiance)
  JANIA_RUBENS: 'jania-rubens', // INCI: Jania Rubens Extract | calcareous red algae, ultra-hydrating and cellular "anti-fatigue"
  LAMINARIA_DIGITATA: 'laminaria-digitata', // INCI: Laminaria Digitata Extract | brown algae, remineralizing and hydrating (rich in alginates)
  FUCUS_VESICULOSUS: 'fucus-vesiculosus', // INCI: Fucus Vesiculosus Extract | brown algae, detoxifying and draining (often used around the eye contour)
  ALARIA_ESCULENTA: 'alaria-esculenta', // INCI: Alaria Esculenta Extract | brown algae, collagen and elastin booster (firmness)
  UNDARIA_PINNATIFIDA: 'undaria-pinnatifida', // INCI: Undaria Pinnatifida Extract | Wakame, protects the extracellular matrix, antioxidant
  NMN: 'nmn',
  SPINACIA_OLERACEA: 'spinacia-oleracea', // INCI: Spinacia Oleracea Leaf Extract | spinach, anti-pollution antioxidant
  TARAXACUM_OFFICINALE: 'taraxacum-officinale', // INCI: Taraxacum Officinale Leaf Extract | dandelion, anti-pollution detoxifier
  ARISTOTELIA_CHILENSIS: 'aristotelia-chilensis', // INCI: Aristotelia Chilensis Fruit Extract | maqui berry, potent antioxidant
  TEPHROSIA_PURPUREA: 'tephrosia-purpurea', // INCI: Tephrosia Purpurea Seed Extract | urban anti-pollution
  AVENE_THERMAL_SPRING_WATER: 'avene-thermal-spring-water', // Avène thermal spring water | soothing, anti-irritant
  URIAGE_THERMAL_SPRING_WATER: 'uriage-thermal-spring-water', // Uriage thermal spring water | soothing, naturally remineralizing
  TRIPTERYGIUM_WILFORDII_CALLUS_EXTRACT: 'tripterygium-wilfordii-callus-extract',
  MYRTUS_COMMUNIS_LEAF_EXTRACT: 'myrtus-communis-leaf-extract',
  TASMANNIA_LANCEOLATA: 'tasmannia-lanceolata', // INCI: Tasmannia Lanceolata Fruit Extract | Australian spice, mattifying and anti-aging toning
  AQUABIOME: 'aquabiome', // Marine active complex | protects the marine skin microbiome
  O_CYMEN_5_OL: 'o-cymen-5-ol', // INCI: o-Cymen-5-ol (Biosol) | mild antimicrobial preservative, paraben alternative
  GLYCERYL_CAPRYLATE_CAPRATE: 'glyceryl-caprylate-caprate', // INCI: Glyceryl Caprylate/Caprate | multifunctional natural preservative, emollient
  MELANIN: 'melanin', // INCI: Melanin | biomimetic tinting and photoprotective pigment (UV/HEV)
  HYDROLYZED_YEAST_PROTEIN: 'hydrolyzed-yeast-protein', // INCI: Hydrolyzed Yeast Protein | beta-glucan-rich yeast hydrolysate, fortifying
  MELIA_AZADIRACHTA: 'melia-azadirachta', // INCI: Melia Azadirachta Leaf Extract | neem leaf, purifying
  HOLY_BASIL: 'holy-basil', // INCI: Ocimum Sanctum Leaf Extract | holy basil (tulsi), antioxidant and soothing
  CORALLINA_OFFICINALIS: 'corallina-officinalis', // INCI: Corallina Officinalis Extract | red algae, mineral source
  LAVENDER_OIL: 'lavender-oil', // INCI: Lavandula Angustifolia Oil | lavender essential oil (contains fragrance allergens)
  GERANIUM_OIL: 'geranium-oil', // INCI: Pelargonium Graveolens Oil | rose geranium essential oil (contains fragrance allergens)
} as const

export const FILLERS = {
  // Aqueous solvents
  AQUA: 'aqua', // INCI: Aqua (Water) | universal solvent, inert
  PROPANEDIOL: 'propanediol', // INCI: Propanediol | neutral solvent/vehicle

  // pH adjusters & chelators
  CITRIC_ACID: 'citric-acid', // INCI: Citric Acid | pH adjuster, trace
  SODIUM_HYDROXIDE: 'sodium-hydroxide', // INCI: Sodium Hydroxide | pH adjuster, neutralized in the formula
  POTASSIUM_HYDROXIDE: 'potassium-hydroxide', // INCI: Potassium Hydroxide | pH adjuster
  TRIETHANOLAMINE: 'triethanolamine', // INCI: Triethanolamine | pH adjuster
  TROMETHAMINE: 'tromethamine', // INCI: Tromethamine | pH adjuster
  SODIUM_CITRATE: 'sodium-citrate', // INCI: Sodium Citrate | pH buffer
  DISODIUM_EDTA: 'disodium-edta', // INCI: Disodium EDTA | chelator, trace, skin-inert
  TETRASODIUM_EDTA: 'tetrasodium-edta', // INCI: Tetrasodium EDTA | chelator, trace

  // Thickeners / gelling agents
  CARBOMER: 'carbomer', // INCI: Carbomer | inert gelling agent, high tolerance
  XANTHAN_GUM: 'xanthan-gum', // INCI: Xanthan Gum | inert gelling agent
  ACRYLATES_CROSSPOLYMER: 'acrylates-c10-30-alkyl-acrylate-crosspolymer', // INCI: Acrylates/C10-30 Alkyl Acrylate Crosspolymer | inert gelling agent
  HYDROXYETHYLCELLULOSE: 'hydroxyethylcellulose', // INCI: Hydroxyethylcellulose | inert thickener
  HYDROXYPROPYL_METHYLCELLULOSE: 'hydroxypropyl-methylcellulose', // INCI: Hydroxypropyl Methylcellulose | inert thickener
  SODIUM_POLYACRYLATE: 'sodium-polyacrylate', // INCI: Sodium Polyacrylate | inert thickener
  SCLEROTIUM_GUM: 'sclerotium-gum', // INCI: Sclerotium Gum | inert gelling agent

  // Fatty alcohols & structural emulsifiers
  CETYL_ALCOHOL: 'cetyl-alcohol', // INCI: Cetyl Alcohol | emulsion structuring agent, inert
  STEARYL_ALCOHOL: 'stearyl-alcohol', // INCI: Stearyl Alcohol | emulsion structuring agent, inert
  BEHENYL_ALCOHOL: 'behenyl-alcohol', // INCI: Behenyl Alcohol | emulsion structuring agent, inert
  PEG_100_STEARATE: 'peg-100-stearate', // INCI: PEG-100 Stearate | structural emulsifier
  CETEARETH_20: 'ceteareth-20', // INCI: Ceteareth-20 | structural emulsifier

  // Vehicle silicones
  DIMETHICONOL: 'dimethiconol', // INCI: Dimethiconol | inert vehicle/texture
  CYCLOPENTASILOXANE: 'cyclopentasiloxane', // INCI: Cyclopentasiloxane (D5) | inert vehicle
  CYCLOHEXASILOXANE: 'cyclohexasiloxane', // INCI: Cyclohexasiloxane (D6) | inert vehicle
  PHENYL_TRIMETHICONE: 'phenyl-trimethicone', // INCI: Phenyl Trimethicone | inert vehicle

  // Mineral oils & inert hydrocarbons
  MINERAL_OIL: 'mineral-oil', // INCI: Mineral Oil (Paraffinum Liquidum) | inert occlusive
  PETROLATUM: 'petrolatum', // INCI: Petrolatum | inert occlusive
  ISOHEXADECANE: 'isohexadecane', // INCI: Isohexadecane | light inert vehicle
  ISODODECANE: 'isododecane', // INCI: Isododecane | light inert vehicle

  // Synthetic vehicle esters
  DICAPRYLYL_CARBONATE: 'dicaprylyl-carbonate', // INCI: Dicaprylyl Carbonate | inert vehicle emollient
  COCO_CAPRYLATE_CAPRATE: 'coco-caprylate-caprate', // INCI: Coco-Caprylate/Caprate | inert vehicle emollient

  // Inert ionic salts
  SODIUM_CHLORIDE: 'sodium-chloride', // INCI: Sodium Chloride | basic salt, inert
  POTASSIUM_CHLORIDE: 'potassium-chloride', // INCI: Potassium Chloride | basic salt, inert

  // Mild emulsifiers
  GLYCERYL_STEARATE_CITRATE: 'glyceryl-stearate-citrate', // INCI: Glyceryl Stearate Citrate | mild emulsifier, barrier-biocompatible
  SUCROSE_STEARATE: 'sucrose-stearate', // INCI: Sucrose Stearate | sugar ester emulsifier, ultra-mild
} as const
