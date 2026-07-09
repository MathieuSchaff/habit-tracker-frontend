import {
  type Faro,
  faro,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
} from '@grafana/faro-react'

let initialized = false

function stringifyContextValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function normalizeContext(context?: Record<string, unknown>): Record<string, string> | undefined {
  if (!context) return undefined
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, stringifyContextValue(value)])
  )
}

const SENSITIVE = new Set(['token', 'code', 'state', 'concern'])
export function scrubUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of SENSITIVE) u.searchParams.delete(key)
    return u.toString()
  } catch {
    return raw.split('?')[0]
  }
}
export function initFaro(): Faro | null {
  const url = import.meta.env.VITE_FARO_URL
  if (!url) return null
  if (initialized) return faro

  initialized = true
  return initializeFaro({
    url,
    app: {
      name: 'aurore-frontend',
      version: import.meta.env.VITE_APP_VERSION ?? import.meta.env.MODE,
      environment: import.meta.env.MODE,
    },
    // https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/instrument/custom-signals/events/
    beforeSend: (item) => {
      // we drop web-vitals
      if (item.type === 'measurement') return null
      if (item.meta.page?.url) {
        item.meta.page.url = scrubUrl(item.meta.page.url)
      }
      return item
    },
    instrumentations: [...getWebInstrumentations(), new ReactIntegration()],
  })
}

export function captureFrontendError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return
  faro.api.pushError(error instanceof Error ? error : new Error(String(error)), {
    context: normalizeContext(context),
  })
}
