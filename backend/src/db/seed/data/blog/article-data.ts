import type { BlogCategory } from '@habit-tracker/shared'

import { dentalArticles } from './dental'
import { haircareArticles } from './haircare'
import { lifestyleArticles } from './lifestyle'
import { nutritionArticles } from './nutrition'
import { phytotherapieArticles } from './phytotherapie'
import { routinesArticles } from './routines'
import { scienceArticles } from './science'
import { skincareArticles } from './skincare'
import { supplementsArticles } from './supplements'

export type ArticleInput = {
  title: string
  slug: string
  excerpt?: string
  content: string
  category: BlogCategory
  coverImageUrl?: string
  publishedAt?: string | null
}

export const articleData: ArticleInput[] = [
  ...skincareArticles,
  ...haircareArticles,
  ...dentalArticles,
  ...nutritionArticles,
  ...supplementsArticles,
  ...phytotherapieArticles,
  ...routinesArticles,
  ...scienceArticles,
  ...lifestyleArticles,
]
