import { BLOG_CATEGORY_LABELS } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { Button } from '@/component/Button/Button'
import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { Time } from '@/component/DataDisplay/Time/Time'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { RichText } from '@/component/Typography/RichText/RichText'
import { normalizeLatexMarkdown } from '@/lib/markdown'
import { articleQueries, useDeleteArticle } from '@/lib/queries/articles'
import { useAuthStore } from '@/store/auth'
import './BlogArticlePage.css'

type BlogArticlePageProps = {
  slug: string
}

export function BlogArticlePage({ slug }: BlogArticlePageProps) {
  const { data: article } = useSuspenseQuery(articleQueries.bySlug(slug))
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const navigate = useNavigate()
  const deleteArticle = useDeleteArticle()

  function handleDelete() {
    if (!confirm(`Supprimer « ${article.title} » ? Cette action est irréversible.`)) return
    deleteArticle.mutate(article.slug, {
      onSuccess: () => navigate({ to: '/blog/$category', params: { category: article.category } }),
    })
  }

  return (
    <article className="blog-article">
      <div className="blog-article__topbar">
        <Link
          to="/blog/$category"
          params={{ category: article.category }}
          className="blog-article__back"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {BLOG_CATEGORY_LABELS[article.category]}
        </Link>
        {isAdmin && (
          <div className="blog-article__admin-actions">
            <Button
              to="/blog/admin/edit/$slug"
              params={{ slug: article.slug }}
              variant="outline"
              size="sm"
            >
              <Pencil size={14} />
              Modifier
            </Button>
            <Button
              variant="danger-ghost"
              size="sm"
              onClick={handleDelete}
              loading={deleteArticle.isPending}
            >
              <Trash2 size={14} />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      <PageHeader
        title={article.title}
        meta={
          <div className="blog-article__meta">
            <Badge variant="chip">{BLOG_CATEGORY_LABELS[article.category]}</Badge>
            {article.publishedAt && <Time iso={article.publishedAt} style="long" />}
          </div>
        }
      />

      {article.coverImageUrl && (
        <img src={article.coverImageUrl} alt="" className="blog-article__cover" loading="lazy" />
      )}

      {article.excerpt && <p className="blog-article__excerpt">{article.excerpt}</p>}

      <RichText>
        <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {normalizeLatexMarkdown(article.content)}
        </Markdown>
      </RichText>
    </article>
  )
}
