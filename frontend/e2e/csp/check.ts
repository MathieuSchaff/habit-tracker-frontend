// Local-only CSP regression guard: run the runtime SSR server, front it with a proxy
// that mimics the prod nginx (per-request nonce forwarded as X-CSP-Nonce and injected
// into the CSP header), drive headless chromium, fail on any CSP violation. Not shipped
// to prod (lives under e2e/, never bundled). Run via `just test-csp` (builds .output first).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { chromium } from '@playwright/test'

const SERVER = resolve(import.meta.dir, '../../.output/server/index.mjs')
const TEMPLATE = resolve(import.meta.dir, '../../../infra/nginx/templates/default.conf.template')
const PROXY_PORT = 4180
const SSR_PORT = 4181
// '/' exercises the nonce-stamped inline JSON-LD path (Organization/WebSite block).
// Detail pages need a backend this harness doesn't run; their JSON-LD is emitted
// by the same seoHead() builder, so the nonce path is covered once here.
const ROUTES = ['/', '/products']

// Single source of truth: read the CSP from the prod nginx template so the test follows any
// edit. It contains 'nonce-$request_id', which prod nginx (and this proxy) fill per request.
function cspTemplate(): string {
  const m = readFileSync(TEMPLATE, 'utf8').match(/add_header Content-Security-Policy "([^"]+)"/)
  if (!m) throw new Error('CSP not found in nginx template')
  return m[1]
}
const CSP_TEMPLATE = cspTemplate()

async function waitForPort(port: number, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${port}/favicon.svg`)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  throw new Error(`SSR server did not listen on ${port}`)
}

// Boot the nitro Bun server (the same artifact prod runs).
const ssr = Bun.spawn(['bun', 'run', SERVER], {
  env: { ...process.env, PORT: String(SSR_PORT) },
  stdout: 'ignore',
  stderr: 'ignore',
})
await waitForPort(SSR_PORT)

// Proxy mimicking prod nginx: mint a per-request nonce, forward it to the SSR app, and set the
// matching CSP so the app's nonce-stamped inline scripts are exactly what the policy admits.
const proxy = Bun.serve({
  port: PROXY_PORT,
  async fetch(req) {
    const nonce = crypto.randomUUID().replaceAll('-', '')
    const url = new URL(req.url)
    const upstream = await fetch(`http://localhost:${SSR_PORT}${url.pathname}${url.search}`, {
      headers: { ...Object.fromEntries(req.headers), 'x-csp-nonce': nonce },
      redirect: 'manual',
    })
    const headers = new Headers(upstream.headers)
    headers.set('content-security-policy', CSP_TEMPLATE.replaceAll('$request_id', nonce))
    return new Response(upstream.body, { status: upstream.status, headers })
  },
})

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const violations: string[] = []
let headerSeen = false

try {
  for (const path of ROUTES) {
    const page = await browser.newPage()
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        const w = window as unknown as { __csp?: string[] }
        if (!w.__csp) w.__csp = []
        w.__csp.push(`${e.violatedDirective} → ${e.blockedURI || 'inline'}`)
      })
    })
    const resp = await page.goto(`http://localhost:${PROXY_PORT}${path}`, { waitUntil: 'load' })
    if (resp?.headers()['content-security-policy']) headerSeen = true
    await page.waitForTimeout(800)
    const found = (await page.evaluate(
      () => (window as unknown as { __csp?: string[] }).__csp ?? []
    )) as string[]
    // A forms dependency probes Function() under try/catch to detect eval support; CSP correctly
    // blocks it and the dep falls back. We keep script-src strict (no 'unsafe-eval') and tolerate
    // this one benign eval report, while still failing on any other (e.g. a blocked external URL).
    violations.push(...found.filter((v) => !v.endsWith('→ eval')).map((v) => `${path}: ${v}`))
    await page.close()
  }
} finally {
  await browser.close()
  proxy.stop()
  ssr.kill()
}

if (!headerSeen) {
  console.error('✗ CSP header not served')
  process.exit(1)
}
if (violations.length) {
  console.error(`✗ CSP violations:\n${violations.join('\n')}`)
  process.exit(1)
}
console.log(`✓ CSP OK — no violations on ${ROUTES.join(', ')}`)
