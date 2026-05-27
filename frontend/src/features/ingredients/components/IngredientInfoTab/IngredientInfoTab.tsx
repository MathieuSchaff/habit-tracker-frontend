import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { useMemo } from 'react'
import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { NavArrow } from '@/component/DataDisplay/NavArrow/NavArrow'
import { Time } from '@/component/DataDisplay/Time/Time'
import { IconBox } from '@/component/Layout/IconBox/IconBox'
import { RichText } from '@/component/Typography/RichText/RichText'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { normalizeLatexMarkdown } from '@/lib/markdown'
import { ingredientQueries } from '@/lib/queries/ingredients'
import { ingredientLabels } from '../../constants'
import './IngredientInfoTab.css'

const MAX_VISIBLE_PRODUCTS = 5

const route = getRouteApi('/ingredients/$slug/')

export function IngredientInfoTab() {
  const { slug } = route.useParams()
  const { data: ingredient } = useSuspenseQuery(ingredientQueries.bySlug(slug))
  const { data: products } = useQuery(ingredientQueries.products(slug))
  const { data: tags } = useQuery(ingredientQueries.tags(ingredient.id))

  const beneficialTags = useMemo(
    () => tags?.filter((t) => t.relevance === 'primary' || t.relevance === 'secondary') ?? [],
    [tags]
  )
  const avoidTags = useMemo(() => tags?.filter((t) => t.relevance === 'avoid') ?? [], [tags])

  const hasFamily = Boolean(ingredient.type || ingredient.category)

  return (
    <>
      {hasFamily && (
        <div className="ingredient-section">
          <SectionHeader title="Famille" variant="primary" />
          <div className="ingredient-famille">
            {ingredient.type && (
              <span className="tag-pill tag-pill--primary">{ingredient.type}</span>
            )}
            {ingredient.category && <span className="tag-pill">{ingredient.category}</span>}
          </div>
        </div>
      )}

      {beneficialTags.length > 0 && (
        <div className="ingredient-section">
          <SectionHeader title="Fonctions" variant="primary" />
          <div className="ingredient-tags-list">
            {beneficialTags.map((t) => (
              <span
                key={t.ingredientTagId}
                className={`tag-pill ${t.relevance === 'primary' ? 'tag-pill--primary' : ''}`}
              >
                {t.tagName}
              </span>
            ))}
          </div>
        </div>
      )}

      {ingredient.description && (
        <div className="ingredient-section">
          <SectionHeader title="Profil" variant="primary" />
          <RichText>
            <Markdown>{ingredient.description}</Markdown>
          </RichText>
        </div>
      )}

      <div className="ingredient-section">
        <SectionHeader title="À noter" variant="primary" />
        {avoidTags.length > 0 && (
          <div className="ingredient-tags-list ingredient-tags-list--spaced">
            {avoidTags.map((t) => (
              <Badge key={t.ingredientTagId} variant="error">
                {t.tagName}
              </Badge>
            ))}
          </div>
        )}
        <p className="ingredient-reading-note">
          Ces repères servent à lire une formule, pas à poser un diagnostic. L'effet d'un ingrédient
          dépend de sa concentration, du reste de la formule et de votre peau.
        </p>
      </div>

      {ingredient.content && (
        <div className="ingredient-section">
          <SectionHeader title="Détail" variant="primary" />
          <RichText>
            <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizeLatexMarkdown(ingredient.content)}
            </Markdown>
          </RichText>
        </div>
      )}

      <div className="ingredient-section">
        <SectionHeader title="Produits" variant="primary" />
        {products && products.length > 0 ? (
          <div className="ingredient-products">
            {products.slice(0, MAX_VISIBLE_PRODUCTS).map((product) => (
              <Link
                key={product.id}
                to="/products/$slug"
                params={{ slug: product.slug }}
                className="ingredient-product-link"
              >
                <IconBox className="ingredient-product-link__icon">
                  <Package size={16} />
                </IconBox>
                <span className="ingredient-product-link__name">{product.name}</span>
                <NavArrow size={16} />
              </Link>
            ))}
            {products.length > MAX_VISIBLE_PRODUCTS && (
              <Link
                to="/products"
                search={{ ingredient: [ingredient.slug] }}
                className="ingredient-products-more"
              >
                Voir tous les produits ({products.length})
              </Link>
            )}
          </div>
        ) : (
          <p className="ingredient-products-empty">{ingredientLabels.noProductsAssociated}</p>
        )}
      </div>

      <p className="ingredient-updated-at">
        Fiche mise à jour le <Time iso={ingredient.updatedAt} style="long" />
      </p>
    </>
  )
}
