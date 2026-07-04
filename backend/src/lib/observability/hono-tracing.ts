import { SpanStatusCode, trace } from '@opentelemetry/api'
import type { MiddlewareHandler } from 'hono'

import type { AppEnv } from '../../app-env'

const tracer = trace.getTracer('aurore-api')

function getRoute(c: Parameters<MiddlewareHandler<AppEnv>>[0]) {
  const reqWithRoute = c.req as typeof c.req & { routePath?: string }
  return reqWithRoute.routePath ?? c.req.path
}

export const otelTracingMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const method = c.req.method
  const initialRoute = c.req.path

  return tracer.startActiveSpan(`${method} ${initialRoute}`, async (span) => {
    span.setAttribute('http.method', method)

    try {
      await next()
      const route = getRoute(c)
      span.updateName(`${method} ${route}`)
      span.setAttribute('http.route', route)
      span.setAttribute('http.status_code', c.res.status)

      if (c.res.status >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR })
      }
    } catch (err) {
      const route = getRoute(c)
      span.updateName(`${method} ${route}`)
      span.setAttribute('http.route', route)
      span.setAttribute('http.status_code', 500)
      span.recordException(err instanceof Error ? err : new Error(String(err)))
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      })
      throw err
    } finally {
      span.end()
    }
  })
}
