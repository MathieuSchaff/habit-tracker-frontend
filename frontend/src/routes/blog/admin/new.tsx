import type { BlogCategory } from '@aurore/shared'

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { BackButton } from '@/component/Button/BackButton'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import { PageTopActions } from '@/component/Layout/PageLayout/PageTopActions'
import { ArticleEditorForm } from '@/features/blog/page/ArticleEditorForm/ArticleEditorForm'
import { awaitBootRefresh } from '@/lib/auth/awaitBootRefresh'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/blog/admin/new')({
  // Await the boot probe so a cold-load hard nav reads the resolved role, not the default 'user'.
  beforeLoad: async ({ context }) => {
    await awaitBootRefresh(context.queryClient)
    if (useAuthStore.getState().role !== 'admin') throw redirect({ to: '/blog' })
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
