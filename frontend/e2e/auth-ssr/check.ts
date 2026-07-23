// Local-only auth-boot regression guard against the production SSR build: run the
// runtime server, front it with a proxy that mocks the whole /api boundary (browser
// AND server-side fetches hit it — the build pins VITE_API_URL to the proxy), then
// drive headless chromium through the four boot outcomes: failed refresh, hint gone
// before hydration, restored session, anonymous visitor. Every page also fails on
// hydration-mismatch console errors. Shell markers are asserted via aur-* classes on
// purpose: the same vocabulary works for the raw SSR HTML string and the hydrated
// DOM. Not shipped to prod (lives under e2e/). Run via `just test-auth-ssr`.
import { resolve } from 'node:path'

import { type Browser, chromium, expect, type Page } from '@playwright/test'

const SERVER = resolve(import.meta.dir, '../../.output/server/index.mjs')
const PROXY_PORT = 4190
const SSR_PORT = 4191
const BASE_URL = `http://127.0.0.1:${PROXY_PORT}`

// A stale process from a crashed run would make waitForPort succeed against an old
// build and silently validate the wrong bundle — fail fast instead.
async function assertPortFree(port: number) {
  try {
    await fetch(`http://127.0.0.1:${port}/favicon.svg`)
  } catch {
    return
  }
  throw new Error(`Port ${port} is already in use (stale run?). Kill that process first.`)
}

async function waitForPort(ssr: ReturnType<typeof Bun.spawn>, port: number, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (ssr.exitCode !== null) {
      throw new Error(`SSR server exited early with code ${ssr.exitCode}`)
    }
    try {
      await fetch(`http://127.0.0.1:${port}/favicon.svg`)
      return
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150))
    }
  }
  throw new Error(`SSR server did not listen on ${port}`)
}

// React recovers from hydration mismatches silently (console.error only), so a
// structural guarantee alone could rot. Collect and assert per page.
function watchHydration(page: Page): () => void {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    // Minified React hydration errors are #418/#423/#425.
    if (/hydrat|Minified React error #(418|423|425)\b/i.test(text)) {
      problems.push(`console: ${text}`)
    }
  })
  return () => expect(problems).toEqual([])
}

await assertPortFree(SSR_PORT)
await assertPortFree(PROXY_PORT)

let ssr: ReturnType<typeof Bun.spawn> | null = null
let proxy: ReturnType<typeof Bun.serve> | null = null
let browser: Browser | null = null

let failedRefreshCount = 0
let successfulRefreshCount = 0

try {
  ssr = Bun.spawn(['bun', 'run', SERVER], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(SSR_PORT),
    },
    stdout: 'ignore',
    stderr: 'inherit',
  })
  await waitForPort(ssr, SSR_PORT)

  proxy = Bun.serve({
    hostname: '127.0.0.1',
    port: PROXY_PORT,
    async fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === '/api/auth/refresh') {
        if (request.headers.get('x-auth-ssr-result') === 'success') {
          successfulRefreshCount++
          const accessToken = `h.${btoa(
            JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
          )}.s`
          return Response.json({
            success: true,
            data: {
              accessToken,
              user: {
                id: 'build-user',
                email: 'build@example.test',
                emailVerified: true,
                role: 'user',
                isDemo: false,
              },
            },
          })
        }

        failedRefreshCount++
        const headers = new Headers({ 'content-type': 'application/json' })
        headers.append('set-cookie', 'refresh_token=; Max-Age=0; Path=/api/auth; HttpOnly')
        headers.append('set-cookie', 'aurore_session=; Max-Age=0; Path=/')
        return new Response(JSON.stringify({ success: false, error: 'invalid_refresh_token' }), {
          status: 401,
          headers,
        })
      }
      if (url.pathname.startsWith('/api/')) {
        return Response.json({ success: false, error: 'not_found' }, { status: 404 })
      }

      const upstreamHeaders = new Headers(request.headers)
      if (url.searchParams.has('server-hint-only')) {
        upstreamHeaders.set('cookie', 'aurore_session=1')
      }
      return fetch(`http://127.0.0.1:${SSR_PORT}${url.pathname}${url.search}`, {
        headers: upstreamHeaders,
        redirect: 'manual',
      })
    },
  })

  browser = await chromium.launch({ args: ['--no-sandbox'] })

  // Raw SSR HTML, hinted: neutral shell, marketing never in the payload. On /products
  // the neutral marker is the filtered nav (no « Accueil » item text; the logo only
  // carries it as an aria-label attribute).
  const serverHtml = await fetch(BASE_URL, {
    headers: { cookie: 'aurore_session=1' },
  }).then((response) => response.text())
  expect(serverHtml).toContain('aur-hub-boot')
  expect(serverHtml).not.toContain('aur-opening')

  const serverProductsHtml = await fetch(`${BASE_URL}/products`, {
    headers: { cookie: 'aurore_session=1' },
  }).then((response) => response.text())
  expect(serverProductsHtml).toContain('Produits')
  expect(serverProductsHtml).not.toContain('>Accueil<')

  // Raw SSR HTML, anonymous: marketing served directly, never the skeleton.
  const serverAnonymousHtml = await fetch(BASE_URL).then((response) => response.text())
  expect(serverAnonymousHtml).toContain('aur-opening')
  expect(serverAnonymousHtml).not.toContain('aur-hub-boot')

  // Scenario 1 — hinted boot, refresh 401: skeleton resolves to the anonymous home.
  const context = await browser.newContext()
  await context.addCookies([{ name: 'aurore_session', value: '1', url: BASE_URL }])
  const page = await context.newPage()
  const assertFailedHydration = watchHydration(page)
  const refreshSettled = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/refresh') && response.request().method() === 'POST'
  )

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await refreshSettled

  await expect(page.locator('.aur-opening')).toBeVisible()
  await expect(page.locator('.aur-hub-boot')).toHaveCount(0)
  expect(failedRefreshCount).toBe(1)
  assertFailedHydration()

  await context.close()

  // Scenario 2 — hint seen by the SSR only, gone in the browser: anonymous decision
  // without any refresh request, skeleton still resolves.
  const noClientHintContext = await browser.newContext()
  const noClientHintPage = await noClientHintContext.newPage()
  const assertNoClientHintHydration = watchHydration(noClientHintPage)
  const failedRefreshCountBeforeNavigation = failedRefreshCount

  await noClientHintPage.goto(`${BASE_URL}/?server-hint-only=1`, {
    waitUntil: 'domcontentloaded',
  })

  await expect(noClientHintPage.locator('.aur-opening')).toBeVisible()
  await expect(noClientHintPage.locator('.aur-hub-boot')).toHaveCount(0)
  expect(failedRefreshCount).toBe(failedRefreshCountBeforeNavigation)
  assertNoClientHintHydration()

  await noClientHintContext.close()

  // Scenario 3 — hinted boot, refresh 200: authenticated hub, marketing never mounts.
  const restoredContext = await browser.newContext({
    extraHTTPHeaders: { 'x-auth-ssr-result': 'success' },
  })
  await restoredContext.addCookies([{ name: 'aurore_session', value: '1', url: BASE_URL }])
  const restoredPage = await restoredContext.newPage()
  const assertRestoredHydration = watchHydration(restoredPage)
  await restoredPage.addInitScript(() => {
    const state = window as typeof window & { __sawAnonymousHome?: boolean }
    state.__sawAnonymousHome = false
    // Inspect addedNodes instead of querying the live DOM: a mount that is removed
    // within the same tick would be invisible to querySelector by callback time.
    const sawOpening = (node: Node): boolean =>
      node instanceof Element &&
      (node.matches('.aur-opening') || node.querySelector('.aur-opening') !== null)
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const added of mutation.addedNodes) {
          if (sawOpening(added)) state.__sawAnonymousHome = true
        }
      }
    }).observe(document, { childList: true, subtree: true })
  })
  const successfulRefresh = restoredPage.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/refresh') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  )

  await restoredPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await successfulRefresh

  await expect(restoredPage.locator('.aur-hero__title')).toBeVisible()
  await expect(restoredPage.locator('.aur-hub-boot')).toHaveCount(0)
  expect(
    await restoredPage.evaluate(
      () => (window as typeof window & { __sawAnonymousHome?: boolean }).__sawAnonymousHome
    )
  ).toBe(false)
  expect(successfulRefreshCount).toBe(1)
  assertRestoredHydration()

  await restoredContext.close()

  // Scenario 4 — visitor without any hint cookie: marketing home, zero refresh calls.
  const anonymousContext = await browser.newContext()
  const anonymousPage = await anonymousContext.newPage()
  const assertAnonymousHydration = watchHydration(anonymousPage)
  const failedBefore = failedRefreshCount
  const successBefore = successfulRefreshCount

  await anonymousPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

  await expect(anonymousPage.locator('.aur-opening')).toBeVisible()
  await expect(anonymousPage.locator('.aur-hub-boot')).toHaveCount(0)
  expect(failedRefreshCount).toBe(failedBefore)
  expect(successfulRefreshCount).toBe(successBefore)
  assertAnonymousHydration()

  await anonymousContext.close()
} finally {
  await browser?.close()
  proxy?.stop()
  ssr?.kill()
}

console.log('✓ Auth SSR boot converges after failed, skipped, successful, and absent refreshes')
