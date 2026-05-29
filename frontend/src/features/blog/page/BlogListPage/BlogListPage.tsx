import { BLOG_CATEGORY_LABELS, type BlogCategory } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BookOpen, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { ListPagination } from '@/component/DataDisplay/Pagination/ListPagination'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { articleQueries } from '@/lib/queries/articles'
import { useAuthStore } from '@/store/auth'
import { BlogArticleCard } from '../../components/BlogArticleCard/BlogArticleCard'
import { BlogCategoryNav } from '../../components/BlogCategoryNav/BlogCategoryNav'
import { BlogSearchInput } from '../../components/BlogSearchInput/BlogSearchInput'
import { BlogListSkeleton } from '../../components/skeletons/BlogSkeletons'

import '@/component/Layout/PageLayout/ListPage.css'
import './BlogListPage.css'

const PAGE_SIZE = 20

type BlogListPageProps = {
  category?: BlogCategory
  page: number
  q?: string
  onPageChange: (page: number) => void
  onSearchChange: (q: string) => void
}

function emptySubtitle(q: string | undefined, category: BlogCategory | undefined): string {
  if (q) return `Pas de résultat pour « ${q} ».`
  if (category) return 'Pas encore de contenu dans cette catégorie.'
  return "Pas encore d'articles."
}

export function BlogListPage({
  category,
  page,
  q,
  onPageChange,
  onSearchChange,
}: BlogListPageProps) {
  const [inputValue, setInputValue] = useState(q ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local input when URL param changes (browser back/forward).
  useEffect(() => {
    setInputValue(q ?? '')
  }, [q])

  const handleInput = (value: string) => {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, 400)
  }

  const isAdmin = useAuthStore((s) => s.role === 'admin')

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    ...articleQueries.list({ category, page, q, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const pageTitle = category ? BLOG_CATEGORY_LABELS[category] : 'Blog'
  const meta = isLoading ? undefined : `${total} article${total > 1 ? 's' : ''}`
  const searchPlaceholder = category
    ? `Rechercher dans ${BLOG_CATEGORY_LABELS[category]}…`
    : 'Rechercher un article…'

  const heroId = items[0]?.coverImageUrl ? items[0].id : null

  const renderListBody = () => {
    if (isError && !isPlaceholderData) {
      return (
        <EmptyState
          icon={<AlertTriangle size={24} />}
          title="Chargement impossible"
          subtitle="On n'a pas pu récupérer les articles. Réessaie dans un instant."
        >
          <Button onClick={() => refetch()}>Réessayer</Button>
        </EmptyState>
      )
    }
    if (isLoading && !isPlaceholderData) return <BlogListSkeleton />
    if (items.length === 0) {
      return (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Aucun article"
          subtitle={emptySubtitle(q, category)}
        />
      )
    }
    return (
      <>
        <div className="list-grid blog-list-grid">
          {items.map((article) => (
            <BlogArticleCard key={article.id} article={article} isHero={article.id === heroId} />
          ))}
        </div>
        <ListPagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      </>
    )
  }

  return (
    <div className="list-page blog-list-page">
      <PageHeader
        title={pageTitle}
        meta={meta}
        isLoading={isPlaceholderData}
        actions={
          isAdmin ? (
            <Button to="/blog/admin/new" variant="outline" size="sm">
              <Plus size={14} />
              Nouvel article
            </Button>
          ) : undefined
        }
      />

      <div className="blog-list-page__body">
        <BlogCategoryNav category={category} />
        <div className="blog-list-page__main">
          <BlogSearchInput
            value={inputValue}
            placeholder={searchPlaceholder}
            onChange={handleInput}
          />
          <main className={`list-main${isPlaceholderData ? ' list-main--syncing' : ''}`}>
            {renderListBody()}
          </main>
        </div>
      </div>
    </div>
  )
}
