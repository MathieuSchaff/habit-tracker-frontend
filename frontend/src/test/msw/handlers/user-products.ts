import { HttpResponse, http } from 'msw'

const ok = <T>(data: T) => HttpResponse.json({ success: true, data })

// Sub-resources of a user-product detail view. Default to empty so the detail
// sheet renders its "no history / no purchase" states without an unhandled fetch.
export const userProductsHandlers = [
  http.get('*/api/user-products/:id/history', () => ok([])),
  http.get('*/api/user-products/:id/purchases', () => ok([])),
]
