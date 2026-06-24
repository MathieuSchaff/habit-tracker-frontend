import { expect, test } from '@playwright/test'

import { loginAsSeed } from './helpers/auth'

// 256×256 solid PNG, inline so the spec carries its own fixture. A real raster is
// required: E2E drives the live crop modal (react-easy-crop + canvas), and the
// MODE==='test' source-injection hatch in useImageUpload is off in a real build.
const AVATAR_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGUExURUR3qv///1g0EhkAAAABYktHRAH/Ai3eAAAAB3RJTUUH6gYYBgsCaJHcwQAAAB9JREFUaN7twQENAAAAwqD3T20ON6AAAAAAAAAAAL4NIQAAAX8ZnKcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDYtMjRUMDY6MTE6MDIrMDA6MDD6ipErAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA2LTI0VDA2OjExOjAyKzAwOjAwi9cplwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wNi0yNFQwNjoxMTowMiswMDowMNzCCEgAAAAASUVORK5CYII=',
  'base64'
)

const MOCK_URL = 'https://cdn.example.test/avatars/seed.webp?v=1'

// The unit tests mock XHR; this proves the recovery end-to-end — real XMLHttpRequest,
// real /api/auth/refresh, real React state machine — through the actual upload UI.
test.describe('Image upload — 401 recovery via silent refresh', () => {
  test('avatar upload that 401s once recovers via refresh + a single retry', async ({ page }) => {
    await loginAsSeed(page)

    // First upload POST 401s (stands in for a token rejected server-side between the
    // proactive-refresh tick and xhr.send); the second — after the token rotates —
    // succeeds. Only the upload response is stubbed (this also keeps bytes off Bunny);
    // the refresh and retry run for real.
    let uploadCalls = 0
    await page.route('**/api/uploads/avatar', async (route) => {
      uploadCalls += 1
      await route.fulfill(
        uploadCalls === 1
          ? {
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ success: false, error: 'unauthorized' }),
            }
          : {
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, data: { url: MOCK_URL } }),
            }
      )
    })

    await page.goto('/profile')
    await page.getByRole('button', { name: 'Modifier mes informations' }).click()

    // pickFile creates and clicks the input imperatively, so catch the chooser event
    // rather than targeting a static locator.
    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /^Avatar de / }).click()
    const chooser = await chooserPromise
    await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: AVATAR_PNG })

    // "Valider" enables once react-easy-crop reports the initial pixel area.
    const valider = page.getByRole('button', { name: 'Valider', exact: true })
    await expect(valider).toBeEnabled({ timeout: 15_000 })
    await valider.click()

    // Recovery oracle: the avatar settles on the mocked URL (onSuccess propagated) and
    // the endpoint was hit exactly twice (401 → refresh → retry, no extra sends).
    await expect(page.locator('img.image-upload__image')).toHaveAttribute('src', MOCK_URL, {
      timeout: 15_000,
    })
    expect(uploadCalls).toBe(2)
  })
})
