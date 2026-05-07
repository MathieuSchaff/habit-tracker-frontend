import type { BlogCategory } from '@habit-tracker/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { ArticleEditorForm } from '@/features/blog/components/ArticleEditorForm'
import { articleQueries } from '@/lib/queries/articles'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/blog/admin/edit/$slug')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAdmin) throw redirect({ to: '/blog' })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(articleQueries.bySlug(params.slug)),
  component: EditArticleRoute,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
})

function EditArticleRoute() {
  const { slug } = Route.useParams()
  const { data: article } = useSuspenseQuery(articleQueries.bySlug(slug))
  const navigate = useNavigate()

  function handleSuccess(category: BlogCategory, newSlug: string) {
    navigate({ to: '/blog/$category/$slug', params: { category, slug: newSlug } })
  }

  function handleCancel() {
    navigate({
      to: '/blog/$category/$slug',
      params: { category: article.category, slug: article.slug },
    })
  }

  return (
    <DetailPageLayout>
      <PageTopActions>
        <BackButton
          to="/blog/$category/$slug"
          params={{ category: article.category, slug: article.slug }}
        >
          Retour
        </BackButton>
      </PageTopActions>
      <PageHeader title={`Modifier : ${article.title}`} />
      <ArticleEditorForm
        mode="edit"
        article={article}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </DetailPageLayout>
  )
}
