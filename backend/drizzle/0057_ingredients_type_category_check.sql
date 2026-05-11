ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_type_category_check" CHECK ("ingredients"."category" IS NULL OR (
        ("ingredients"."type" = 'skincare'   AND "ingredients"."category" IN ('actif','humectant','emollient','filtre-uv','tensioactif','excipient')) OR
        ("ingredients"."type" = 'haircare'   AND "ingredients"."category" IN ('actif','conditionneur','filmogene','humectant','tensioactif','excipient')) OR
        ("ingredients"."type" = 'dental'     AND "ingredients"."category" IN ('actif','abrasif','aromatisant','humectant','tensioactif','excipient')) OR
        ("ingredients"."type" = 'supplement' AND "ingredients"."category" IN ('vitamine','mineral','acide-amine','acide-gras','antioxydant','carotenoide','plante','adaptogene','champignon','probiotique','prebiotique','peptide','collagene','polyphenol','neuroactif','longevite','enzyme','autre'))
      ));