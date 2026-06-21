import { errorsHandlers } from './errors'
import { ingredientsHandlers } from './ingredients'
import { productsHandlers } from './products'
import { userProductsHandlers } from './user-products'

export const defaultHandlers = [
  ...errorsHandlers,
  ...ingredientsHandlers,
  ...productsHandlers,
  ...userProductsHandlers,
]
