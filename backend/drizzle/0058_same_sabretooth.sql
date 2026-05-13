ALTER TABLE "products" ADD CONSTRAINT "products_category_check" CHECK ("products"."category" IN ('skincare','solaire','complement','haircare','bodycare','dental'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_kind_category_check" CHECK ((
        ("products"."category" = 'skincare'   AND "products"."kind" IN ('serum','moisturizer','cleanser','toner','exfoliant','eye-cream','mask','mist','essence','spot-treatment','lip-care','balm','oil','primer','patch')) OR
        ("products"."category" = 'solaire'    AND "products"."kind" IN ('sunscreen','after-sun','self-tanner')) OR
        ("products"."category" = 'complement' AND "products"."kind" IN ('gelule','capsule','ampoule','poudre','sirop','gummy','huile')) OR
        ("products"."category" = 'haircare'   AND "products"."kind" IN ('shampoo','conditioner','hair-mask','hair-serum','hair-oil','styling')) OR
        ("products"."category" = 'bodycare'   AND "products"."kind" IN ('body-lotion','body-oil','body-scrub','body-wash','deodorant','hand-cream','foot-cream')) OR
        ("products"."category" = 'dental'     AND "products"."kind" IN ('toothpaste','mouthwash','teeth-whitening','floss'))
      ));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_unit_check" CHECK ("products"."unit" IN ('pump','dropper','jar','tube','bottle','spray','pack','roller','bar','aerosol','stick','sachet','cartridge','tablet','capsule','gummy','powder','ampoule'));