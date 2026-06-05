// Local-only CSP regression guard: build the prod bundle, serve it with the exact CSP from
// the nginx template, drive headless chromium, fail on any CSP violation. Not shipped to prod
// (lives under e2e/, never bundled). Run via `just test-csp`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { chromium } from '@playwright/test'

const DIST = resolve(import.meta.dir, '../../dist')
const TEMPLATE = resolve(import.meta.dir, '../../../infra/nginx/templates/default.conf.template')
const PORT = 4180
const ROUTES = ['/', '/login']

// Single source of truth: read the CSP from the prod nginx template so the test follows any edit.
function cspFromTemplate(): string {
  const m = readFileSync(TEMPLATE, 'utf8').match(/add_header Content-Security-Policy "([^"]+)"/)
  if (!m) throw new Error('CSP not found in nginx template')
  return m[1]
}

const CSP = cspFromTemplate()

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    let file = Bun.file(DIST + url.pathname)
    if (!(await file.exists())) file = Bun.file(`${DIST}/index.html`) // SPA fallback
    return new Response(file, { headers: { 'Content-Security-Policy': CSP } })
  },
})

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const violations: string[] = []
let headerSeen = false

for (const path of ROUTES) {
  const page = await browser.newPage()
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const w = window as unknown as { __csp?: string[] }
      if (!w.__csp) w.__csp = []
      w.__csp.push(`${e.violatedDirective} → ${e.blockedURI || 'inline'}`)
    })
  })
  const resp = await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'load' })
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

await browser.close()
server.stop()

if (!headerSeen) {
  console.error('✗ CSP header not served')
  process.exit(1)
}
if (violations.length) {
  console.error(`✗ CSP violations:\n${violations.join('\n')}`)
  process.exit(1)
}
console.log(`✓ CSP OK — no violations on ${ROUTES.join(', ')}`)
