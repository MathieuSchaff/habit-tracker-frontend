import type { BlogCategory } from '@aurore/shared'

export type ArticleInput = {
  title: string
  slug: string
  excerpt?: string
  content: string
  category: BlogCategory
  coverImageUrl?: string
  publishedAt?: string | null
}

// Skeleton: the ~70 blog articles were removed (they live in the SQL snapshot).
// One inline article is kept as a shape example. To seed the blog from TS again,
// re-add category folders under blog/ and spread their arrays here.
export const articleData: ArticleInput[] = [
  {
    title: 'Exemple d’article',
    slug: 'exemple-article',
    excerpt: 'Gabarit minimal pour ré-ajouter des articles de blog.',
    content: '# Exemple\n\nContenu markdown de l’article.',
    category: 'skincare',
    publishedAt: null,
  },
]
