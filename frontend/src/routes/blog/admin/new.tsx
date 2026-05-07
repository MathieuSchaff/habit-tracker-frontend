import type { BlogCategory } from '@habit-tracker/shared'

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { ArticleEditorForm } from '@/features/blog/components/ArticleEditorForm'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/blog/admin/new')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAdmin) throw redirect({ to: '/blog' })
  },
  component: NewArticleRoute,
})

function NewArticleRoute() {
  const navigate = useNavigate()

  function handleSuccess(category: BlogCategory, slug: string) {
    navigate({ to: '/blog/$category/$slug', params: { category, slug } })
  }

  return (
    <DetailPageLayout>
      <PageTopActions>
        <BackButton to="/blog">Retour</BackButton>
      </PageTopActions>
      <PageHeader title="Nouvel article" />
      <ArticleEditorForm
        mode="create"
        onSuccess={handleSuccess}
        onCancel={() => navigate({ to: '/blog' })}
      />
    </DetailPageLayout>
  )
}
