import { ingredientsHandlers } from './ingredients'
import { productsHandlers } from './products'
import { userProductsHandlers } from './user-products'

export const defaultHandlers = [
  ...ingredientsHandlers,
  ...productsHandlers,
  ...userProductsHandlers,
]
