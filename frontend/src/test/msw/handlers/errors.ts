import { HttpResponse, http } from 'msw'

// Error-reporter sink: components fire-and-forget to /api/errors on failure
// paths. Swallow it so error-path tests don't trip the unhandled-request guard.
export const errorsHandlers = [
  http.post('*/api/errors', () => new HttpResponse(null, { status: 204 })),
]
