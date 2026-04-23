// Haircare ingredient slug groups. Root ingredient-slugs.ts re-exports from here.

export const HAIR_TENSIOACTIFS_ANIONIQUES = {
  SLS_HAIR: 'sls-hair', // Sodium Lauryl Sulfate | tensioactif anionique fort, moussant
  SLES_HAIR: 'sles-hair', // Sodium Laureth Sulfate | version éthoxylée plus douce du SLS
  AMMONIUM_LAURYL_SULFATE: 'ammonium-lauryl-sulfate', // tensioactif anionique, variante ammonium du SLS
  AMMONIUM_LAURETH_SULFATE: 'ammonium-laureth-sulfate', // variante ammonium éthoxylée
  SODIUM_COCOYL_SULFATE: 'sodium-cocoyl-sulfate', // dérivé coco, moins irritant que SLS
  DISODIUM_LAURETH_SULFOSUCCINATE: 'disodium-laureth-sulfosuccinate', // tensioactif doux, sulfosuccinate
  SODIUM_LAUROYL_SARCOSINATE: 'sodium-lauroyl-sarcosinate', // dérivé sarcosine, très doux
  SODIUM_COCOYL_GLUTAMATE: 'sodium-cocoyl-glutamate', // dérivé acide glutamique, doux
  SODIUM_LAUROYL_GLUTAMATE: 'sodium-lauroyl-glutamate', // dérivé glutamate C12
  SODIUM_COCOYL_ISETHIONATE: 'sodium-cocoyl-isethionate', // SCI, doux, pouvoir moussant crémeux
  SODIUM_LAURYL_METHYL_ISETHIONATE: 'sodium-lauryl-methyl-isethionate', // SLMI, doux, moussant fin
  SODIUM_COCO_SULFATE: 'sodium-coco-sulfate', // SCS, mélange coco, légèrement moins irritant que SLS
  TEA_LAURYL_SULFATE: 'tea-lauryl-sulfate', // variante TEA, pH neutre
} as const

export const HAIR_TENSIOACTIFS_AMPHOTERES = {
  COCAMIDOPROPYL_BETAINE: 'cocamidopropyl-betaine', // tensioactif amphotère doux, co-tensioactif classique
  COCO_BETAINE: 'coco-betaine', // betaïne pure, plus naturelle que cocamidopropyl
  SODIUM_COCOAMPHOACETATE: 'sodium-cocoamphoacetate', // amphotère doux, certifié naturel
  DISODIUM_COCOAMPHODIACETATE: 'disodium-cocoamphodiacetate', // amphotère doux, variante diacétate
} as const

export const HAIR_TENSIOACTIFS_NON_IONIQUES = {
  COCO_GLUCOSIDE: 'coco-glucoside', // glucoside coco, tensioactif doux naturel
  DECYL_GLUCOSIDE: 'decyl-glucoside', // glucoside décyl, très doux, certifiable naturel
  LAURYL_GLUCOSIDE: 'lauryl-glucoside', // glucoside lauryl, intermédiaire
  CAPRYLYL_CAPRYL_GLUCOSIDE: 'caprylyl-capryl-glucoside', // mélange C8/C10, très doux, peaux sensibles
  POLYSORBATE_20: 'polysorbate-20', // émulsifiant non-ionique, solubilisateur
  POLYSORBATE_60: 'polysorbate-60', // émulsifiant non-ionique, corps gras
  POLYSORBATE_80: 'polysorbate-80', // émulsifiant non-ionique, huiles
} as const

export const HAIR_TENSIOACTIFS_CATIONIQUES = {
  BEHENTRIMONIUM_CHLORIDE: 'behentrimonium-chloride', // cationique C22, conditionneur principal après-shampoing
  BEHENTRIMONIUM_METHOSULFATE: 'behentrimonium-methosulfate', // BTMS, conditionneur doux (moins irritant que chloride)
  CETRIMONIUM_CHLORIDE: 'cetrimonium-chloride', // cationique C16, conditionneur léger
  CETRIMONIUM_BROMIDE: 'cetrimonium-bromide', // variante bromure, antimicrobien + conditionneur
  STEARALKONIUM_CHLORIDE: 'stearalkonium-chloride', // conditionneur cationique, démêlant
} as const

export const HAIR_CONDITIONNEURS = {
  CETYL_ALCOHOL_HAIR: 'cetyl-alcohol-hair', // alcool gras C16, émollient et épaississant
  CETEARYL_ALCOHOL_HAIR: 'cetearyl-alcohol-hair', // mélange C16/C18, base après-shampoing
  STEARYL_ALCOHOL_HAIR: 'stearyl-alcohol-hair', // alcool gras C18, texture riche
  BEHENYL_ALCOHOL: 'behenyl-alcohol', // alcool gras C22, conditionneur très doux
  ARACHIDYL_BEHENYL_ALCOHOL: 'arachidyl-behenyl-alcohol', // mélange C20/C22, texture veloutée
  DIMETHICONE_HAIR: 'dimethicone-hair', // silicone linéaire, lissant, protection thermique
  AMODIMETHICONE: 'amodimethicone', // silicone aminé, se dépose sur zones abîmées
  CYCLOPENTASILOXANE: 'cyclopentasiloxane', // D5, silicone volatil, texture légère
  CYCLOTETRASILOXANE: 'cyclotetrasiloxane', // D4, silicone cyclique volatil
  PHENYL_TRIMETHICONE: 'phenyl-trimethicone', // silicone phénylé, brillance, protection chaleur
  DIMETHICONOL: 'dimethiconol', // silicone haute masse, film protecteur
  POLYSILICONE_15: 'polysilicone-15', // silicone filmogène solaire
  TRIMETHYLSILYLAMODIMETHICONE: 'trimethylsilylamodimethicone', // silicone aminé léger
  SILICONE_QUATERNIUM_8: 'silicone-quaternium-8', // silicone cationique, conditionneur substantif
  SILICONE_QUATERNIUM_16: 'silicone-quaternium-16', // silicone cationique, démêlant
  SILICONE_QUATERNIUM_22: 'silicone-quaternium-22', // silicone cationique, conditionneur fin
  POLYQUATERNIUM_7: 'polyquaternium-7', // polymère cationique, antistatique, volume
  POLYQUATERNIUM_10: 'polyquaternium-10', // cellulose quaternaire, conditionneur classique
  POLYQUATERNIUM_11: 'polyquaternium-11', // fixateur + conditionneur
  POLYQUATERNIUM_37: 'polyquaternium-37', // épaississant + conditionneur
  POLYQUATERNIUM_44: 'polyquaternium-44', // conditionneur filmogène
  POLYQUATERNIUM_55: 'polyquaternium-55', // fixateur + conditionneur
  GUAR_HYDROXYPROPYLTRIMONIUM_CHLORIDE: 'guar-hydroxypropyltrimonium-chloride', // guar cationique, démêlant naturel
  HYDROXYPROPYL_GUAR: 'hydroxypropyl-guar', // guar non-ionique, texture glissante
  HONEYQUAT: 'honeyquat', // miel quaternisé, humectant + conditionneur
} as const

export const HAIR_HUMECTANTS = {
  AQUA_HAIR: 'aqua-hair', // eau purifiée, base universelle
  GLYCERIN_HAIR: 'glycerin-hair', // humectant star, attire l'eau atmosphérique
  PROPYLENE_GLYCOL_HAIR: 'propylene-glycol-hair', // humectant/solvant
  BUTYLENE_GLYCOL_HAIR: 'butylene-glycol-hair', // humectant doux, pénétrant
  PENTYLENE_GLYCOL_HAIR: 'pentylene-glycol-hair', // humectant + conservateur doux
  SORBITOL_HAIR: 'sorbitol-hair', // humectant sucre, non fermentescible
  SODIUM_PCA_HAIR: 'sodium-pca-hair', // composant NMF, humectant puissant
  PANTHENOL_HAIR: 'panthenol-hair', // pro-vitamine B5, hydratation + résistance
  ALOE_VERA_HAIR: 'aloe-vera-hair', // hydratation + apaisement cuir chevelu
  HYALURONIC_ACID_HAIR: 'hyaluronic-acid-hair', // hydratation intense multi-couches
  SODIUM_HYALURONATE_HAIR: 'sodium-hyaluronate-hair', // sel hyaluronate, pénétration corticale
  BETAINE_HAIR: 'betaine-hair', // osmolyte humectant, non irritant
  FRUCTOSE_HAIR: 'fructose-hair', // sucre humectant naturel
  TREHALOSE_HAIR: 'trehalose-hair', // osmolyte protecteur, stabilise la fibre
  ALLANTOIN_HAIR: 'allantoin-hair', // apaisant cuir chevelu, keratolytique doux
  AQUAXYL_COMPLEX: 'aquaxyl-complex', // complexe breveté Sederma, rétention eau biomimétique dans la fibre
  XYLITYLGLUCOSIDE: 'xylitylglucoside', // composant Aquaxyl
  ANHYDROXYLITOL: 'anhydroxylitol', // composant Aquaxyl
  XYLITOL_HAIR: 'xylitol-hair', // composant Aquaxyl, humectant sucre
} as const

export const HAIR_HUILES_VEGETALES = {
  ARGAN_OIL_HAIR: 'argan-oil-hair', // Argania Spinosa, riche tocophérols, brillance
  COCONUT_OIL_HAIR: 'coconut-oil-hair', // Cocos Nucifera, pénètre la fibre, protéine retention
  JOJOBA_OIL_HAIR: 'jojoba-oil-hair', // Simmondsia Chinensis, cire liquide, légère
  OLIVE_OIL_HAIR: 'olive-oil-hair', // Olea Europaea, oléique dominant, nourrissant
  AVOCADO_OIL_HAIR: 'avocado-oil-hair', // Persea Gratissima, pénètre profondément
  CASTOR_OIL_HAIR: 'castor-oil-hair', // Ricinus Communis, occlusif, stimulant circulation
  HEMP_OIL_HAIR: 'hemp-oil-hair', // Cannabis Sativa, oméga 3/6 équilibrés
  SUNFLOWER_OIL_HAIR: 'sunflower-oil-hair', // Helianthus Annuus, linoléique, légère
  MACADAMIA_OIL_HAIR: 'macadamia-oil-hair', // Macadamia Ternifolia, palmitoléique, soyeux
  ALMOND_OIL_HAIR: 'almond-oil-hair', // Prunus Amygdalus Dulcis, oléique, pénétrant
  ROSEHIP_OIL_HAIR: 'rosehip-oil-hair', // Rosa Canina, rétinoïdes naturels, réparateur
  CAMELLIA_SINENSIS_OIL_HAIR: 'camellia-sinensis-oil-hair', // Camellia Sinensis, légère, brillance
  MORINGA_OIL_HAIR: 'moringa-oil-hair', // Moringa Oleifera, béhénique, purifiante
  HAZELNUT_OIL_HAIR: 'hazelnut-oil-hair', // Corylus Avellana, astringente, légère
  BLACK_SEED_OIL_HAIR: 'black-seed-oil-hair', // Nigella Sativa, thymoquinone, antipelliculaire
  SAFFLOWER_OIL_HAIR: 'safflower-oil-hair', // Carthamus Tinctorius, linoléique élevé
  HYDROGENATED_CASTOR_OIL_HAIR: 'hydrogenated-castor-oil-hair', // forme solide du ricin, agent de lustre
  BAOBAB_OIL_HAIR: 'baobab-oil-hair', // Adansonia Digitata, oméga 3/6/9, pénétrant
  CRAMBE_ABYSSINICA_OIL: 'crambe-abyssinica-seed-oil', // huile d'Abyssinie, légère, protection thermique
} as const

export const HAIR_BEURRES_VEGETAUX = {
  SHEA_BUTTER_HAIR: 'shea-butter-hair', // Butyrospermum Parkii, occlusif, réparateur
  CACAO_BUTTER_HAIR: 'cacao-butter-hair', // Theobroma Cacao, brillance, rigidité
  MANGO_BUTTER_HAIR: 'mango-butter-hair', // Mangifera Indica, légère, brillance
  SAL_BUTTER_HAIR: 'sal-butter-hair', // Shorea Robusta, proche karité, fondant
  MADHUCA_LONGIFOLIA_BUTTER: 'madhuca-longifolia-butter', // beurre de mahua, conditionneur ayurvédique
} as const

export const HAIR_PROTEINES = {
  HYDROLYZED_KERATIN: 'hydrolyzed-keratin', // kératine hydrolysée, comble les lacunes corticales
  HYDROLYZED_WHEAT_PROTEIN: 'hydrolyzed-wheat-protein', // protéine blé, renforce et hydrate
  HYDROLYZED_SILK: 'hydrolyzed-silk', // soie hydrolysée, brillance, douceur
  HYDROLYZED_SOY_PROTEIN: 'hydrolyzed-soy-protein', // protéine soja, volume léger
  HYDROLYZED_COLLAGEN_HAIR: 'hydrolyzed-collagen-hair', // collagène, hydratation + résistance
  HYDROLYZED_RICE_PROTEIN: 'hydrolyzed-rice-protein', // protéine riz, volume, force
  HYDROLYZED_OAT_PROTEIN: 'hydrolyzed-oat-protein', // protéine avoine, adoucissant, apaisant
  HYDROLYZED_QUINOA_PROTEIN: 'hydrolyzed-quinoa-protein', // protéine quinoa, lissant thermique
  WHEAT_AMINO_ACIDS: 'wheat-amino-acids', // acides aminés blé, pénétration profonde
  SILK_AMINO_ACIDS: 'silk-amino-acids', // acides aminés soie, brillance
  ARGININE_HAIR: 'arginine-hair', // acide aminé, répare les ponts disulfures
  HYDROLYZED_JOJOBA_PROTEIN: 'hydrolyzed-jojoba-protein', // protéine jojoba hydrolysée, brillance + douceur
  CREATINE_HAIR: 'creatine-hair', // renforce liaisons internes de la fibre
  PROLINE_HAIR: 'proline-hair', // acide aminé libre, réparation kératine
  THREONINE_HAIR: 'threonine-hair', // acide aminé libre, réparation kératine
  SERINE_HAIR: 'serine-hair', // acide aminé libre, réparation kératine
  GLYCINE_HAIR: 'glycine-hair', // acide aminé libre haircare (supplément séparé)
  ALANINE_HAIR: 'alanine-hair', // acide aminé libre
  VALINE_HAIR: 'valine-hair', // acide aminé libre
  HISTIDINE_HAIR: 'histidine-hair', // acide aminé libre
  PHENYLALANINE_HAIR: 'phenylalanine-hair', // acide aminé libre
  ASPARTIC_ACID_HAIR: 'aspartic-acid-hair', // acide aminé libre
} as const

export const HAIR_CERAMIDES_LIPIDES = {
  CERAMIDE_NP_HAIR: 'ceramide-np-hair', // Ceramide NP, restaure enveloppe lipidique cuticule
  CERAMIDE_AP_HAIR: 'ceramide-ap-hair', // Ceramide AP, composant naturel fibre
  CERAMIDE_EOP_HAIR: 'ceramide-eop-hair', // Ceramide EOP, liant cuticule-cortex
  CERAMIDE_NS_HAIR: 'ceramide-ns-hair', // Ceramide NS, barrière cuticule
  CERAMIDE_AS_HAIR: 'ceramide-as-hair', // Ceramide AS, composant mineur fibre
  CERAMIDE_2_HAIR: 'ceramide-2-hair', // alias Ceramide NS
  CERAMIDE_3_HAIR: 'ceramide-3-hair', // alias Ceramide NP
  PHYTOSPHINGOSINE_HAIR: 'phytosphingosine-hair', // précurseur céramides, antimicrobien doux
  CHOLESTEROL_HAIR: 'cholesterol-hair', // lipide structurant cuticule
  LINOLEIC_ACID_HAIR: 'linoleic-acid-hair', // oméga-6, composant lipides intercellulaires
  OLEIC_ACID_HAIR: 'oleic-acid-hair', // oméga-9, pénètre le cortex
  BEHENIC_ACID: 'behenic-acid', // acide gras C22, conditionneur de surface
  SQUALANE_HAIR: 'squalane-hair', // émollient léger analogue sébum, pénètre le cortex
  PHOSPHOLIPIDS_HAIR: 'phospholipids-hair', // restauration lipidique membranaire fibre
  PHOSPHATIDYLCHOLINE_HAIR: 'phosphatidylcholine-hair', // phospholipide membranaire, restauration cuticule
} as const

export const HAIR_EPAISSISSANTS = {
  CARBOMER_HAIR: 'carbomer-hair', // polyacrylate, gélifiant classique
  ACRYLATES_COPOLYMER_HAIR: 'acrylates-copolymer-hair', // gélifiant filmogène
  XANTHAN_GUM_HAIR: 'xanthan-gum-hair', // polysaccharide, gélifiant naturel
  CELLULOSE_GUM_HAIR: 'cellulose-gum-hair', // CMC, épaississant cellulosique
  HYDROXYETHYLCELLULOSE: 'hydroxyethylcellulose', // HEC, gélifiant/conditionneur naturel
  HYDROXYPROPYL_METHYLCELLULOSE: 'hydroxypropyl-methylcellulose', // HPMC, épaississant filmogène
  PEG_120_METHYL_GLUCOSE_DIOLEATE: 'peg-120-methyl-glucose-dioleate', // épaississant anioniquecompatible
  SODIUM_ALGINATE_HAIR: 'sodium-alginate-hair', // algue, gélifiant naturel
  SCLEROTIUM_GUM: 'sclerotium-gum', // champignon, gélifiant naturel rhéologique
  TARA_GUM: 'tara-gum', // Caesalpinia Spinosa, gélifiant naturel
  CETEARYL_GLUCOSIDE: 'cetearyl-glucoside', // émulsifiant sucre + alcool gras
  PEG_40_HYDROGENATED_CASTOR_OIL: 'peg-40-hydrogenated-castor-oil', // solubilisateur huiles
} as const

export const HAIR_ANTIPELLICULAIRES = {
  ZINC_PYRITHIONE: 'zinc-pyrithione', // antifongique/antibactérien, standard antipelliculaire
  PIROCTONE_OLAMINE: 'piroctone-olamine', // antifongique doux, alternative zinc pyrithione
  SELENIUM_SULFIDE: 'selenium-sulfide', // antifongique puissant, usage médical
  SALICYLIC_ACID_HAIR: 'salicylic-acid-hair', // kératolytique, décolle squames
  KETOCONAZOLE: 'ketoconazole', // antifongique azolé, usage médical
  COAL_TAR: 'coal-tar', // ralentit prolifération cellulaire, usage dermatologique
  CLIMBAZOLE: 'climbazole', // antifongique azolé cosmétique
  TEA_TREE_OIL_HAIR: 'tea-tree-oil-hair', // Melaleuca Alternifolia, antifongique naturel
  SULFUR_HAIR: 'sulfur-hair', // soufre, kératolytique + antifongique
} as const

export const HAIR_STIMULANTS_CROISSANCE = {
  CAFFEINE_HAIR: 'caffeine-hair', // inhibe DHT, stimule follicules
  NIACINAMIDE_HAIR: 'niacinamide-hair', // améliore microcirculation cuir chevelu
  BIOTIN_HAIR: 'biotin-hair', // vitamine B8, cofacteur synthèse kératine
  MINOXIDIL: 'minoxidil', // vasodilatateur, seul actif prouvé FDA contre chute
  CAPIXYL: 'capixyl', // Acetyl Tetrapeptide-3, inhibe DHT + stimule follicule
  REDENSYL: 'redensyl', // DHQG + EGCG, réactive cellules souches folliculaires
  PROCAPIL: 'procapil', // apigenin + biotinoyl tripeptide-1 + acide oléanolique
  GINSENG_EXTRACT_HAIR: 'ginseng-extract-hair', // Panax Ginseng, stimule prolifération kératinocytes
  CRESSON_CAPUCINE_EXTRACT: 'cresson-capucine-extract', // isothiocyanates, stimulant croissance
  SAW_PALMETTO: 'saw-palmetto', // Serenoa Serrulata, inhibiteur 5α-réductase naturel
} as const

export const HAIR_CHELATEURS = {
  DISODIUM_EDTA_HAIR: 'disodium-edta-hair', // chélateur calcaire, stabilise formule
  TETRASODIUM_EDTA: 'tetrasodium-edta', // chélateur puissant, efficace eau très calcaire
  PHYTIC_ACID_HAIR: 'phytic-acid-hair', // chélateur naturel (son de riz)
  SODIUM_GLUCONATE_HAIR: 'sodium-gluconate-hair', // chélateur doux naturel, biodégradable
} as const

export const HAIR_AGENTS_NACRANTS = {
  GLYCOL_DISTEARATE: 'glycol-distearate', // agent nacrant cristallin, opacifie le shampooing
  MICA_HAIR: 'mica-hair', // minéral, reflets nacré/satiné
  TITANIUM_DIOXIDE_HAIR: 'titanium-dioxide-hair', // opacifiant blanc
} as const

export const HAIR_HUILES_MINERALES = {
  PARAFFINUM_LIQUIDUM_HAIR: 'paraffinum-liquidum-hair', // huile minérale, occlusive, brillance
  PETROLATUM_HAIR: 'petrolatum-hair', // vaseline, occlusive puissante
  MINERAL_OIL_HAIR: 'mineral-oil-hair', // huile minérale légère
  CERESIN_HAIR: 'ceresin-hair', // cire minérale, texture solide
  OZOKERITE_HAIR: 'ozokerite-hair', // cire fossile, rigidifiant
  CERA_MICROCRISTALLINA_HAIR: 'cera-microcristallina-hair', // cire microcristalline, tenue
} as const

export const HAIR_DIVERS = {
  TOCOPHEROL_HAIR: 'tocopherol-hair', // vitamine E, antioxydant, protège huiles
  RETINYL_PALMITATE_HAIR: 'retinyl-palmitate-hair', // vitamine A, stimule croissance cellulaire
  COENZYME_Q10_HAIR: 'coenzyme-q10-hair', // ubiquinone, antioxydant énergétique follicule
  BAMBOU_EXTRACT_HAIR: 'bambou-extract-hair', // silice naturelle, résistance, volume
  ROMARIN_EXTRACT_HAIR: 'romarin-extract-hair', // Rosmarinus Officinalis, antioxydant + stimulant
  KAOLIN_HAIR: 'kaolin-hair', // argile blanche, absorbe sébum
  ACTIVATED_CHARCOAL_HAIR: 'activated-charcoal-hair', // charbon actif, adsorbe impuretés
  BAMBOU_CHARCOAL_HAIR: 'bambou-charcoal-hair', // charbon de bambou, adsorbant doux
  SEA_SALT_HAIR: 'sea-salt-hair', // NaCl, texture, minéraux
  SHIKAKAI_HAIR: 'shikakai-hair', // Acacia Concinna, tensioactif ayurvédique naturel
  REETHA_HAIR: 'reetha-hair', // Sapindus Mukorossi, saponines moussantes naturelles
  AMLA_HAIR: 'amla-hair', // Phyllanthus Emblica, vitamine C, anti-chute ayurvédique
  BIS_AMINOPROPYL_DIGLYCOL_DIMALEATE: 'bis-aminopropyl-diglycol-dimaleate', // molécule Olaplex, reconnecte ponts disulfure cassés
  HYDROXYPROPYL_CYCLODEXTRIN: 'hydroxypropyl-cyclodextrin', // complexe délivrance, potentialise pénétration actifs
  PHYTANTRIOL_HAIR: 'phytantriol-hair', // antioxydant stabilisant, améliore pénétration
  MORINDA_CITRIFOLIA_EXTRACT: 'morinda-citrifolia-extract', // noni, antioxydant polyphénols
  EUTERPE_OLERACEA_EXTRACT: 'euterpe-oleracea-extract', // açaï, antioxydant polyphénols
  PUNICA_GRANATUM_EXTRACT: 'punica-granatum-extract', // grenade, antioxydant polyphénols
  PALMITOYL_MYRISTYL_SERINATE: 'palmitoyl-myristyl-serinate', // peptide conditionneur filmogène
} as const
