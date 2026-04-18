import { dentalArticles } from './dental'
import { haircareArticles } from './haircare'
import { lifestyleArticles } from './lifestyle'
import { nutritionArticles } from './nutrition'
import { phytotherapieArticles } from './phytotherapie'
import { routinesArticles } from './routines'
import { scienceArticles } from './science'
import type { ArticleInput } from './seed-articles'
import { skincareArticles } from './skincare'
import { supplementsArticles } from './supplements'

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
