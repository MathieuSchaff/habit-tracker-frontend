// import { ingredientsSearchSchema } from '@habit-tracker/shared'

import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { IngredientsPage } from '../../component/pages/Ingredients/IngredientsPage'

const ingredientsSearchSchema = z.object({
  category: z.string().array().default([]),
  concern: z.string().array().default([]),
  skinType: z.string().array().default([]),
  attribute: z.string().array().default([]),
  page: z.number().min(1).default(1),
})

const defaultValues = {
  skinType: [] as string[],
  concern: [] as string[],
  attribute: [] as string[],
  category: [] as string[],
  page: 1,
}
export const Route = createFileRoute('/ingredients/')({
  // https://tanstack.com/router/latest/docs/guide/search-params
  // validate search transforme url en objet json
  // puis passe l'objet à schéma zod
  // zodValidator permet de dire a la page quel type est bon ou pas
  // en gros skinType est string[] et que toto n'est pas un searchparamas
  validateSearch: zodValidator(ingredientsSearchSchema),
  // search agit avant que url soit écrie dans la barre du navigateur
  // par défaut: ?skinType=[]&concern=[]&action=[]&category=[]
  // Le middleware stripSearchParams voit que [] est la valeur par défaut. Il retire skinType de l'URL.
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  component: IngredientsPage,
})
