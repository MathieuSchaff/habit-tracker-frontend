import { expect, test } from '@playwright/test'

import { registerFreshUser } from './helpers/auth'

test.describe('Profile — completion strip', () => {
  test('shows strip with both section buttons for empty profile', async ({ page }) => {
    await registerFreshUser(page)
    await page.goto('/profile')

    const strip = page.getByRole('complementary', { name: 'Compléter le profil' })
    await expect(strip).toBeVisible()
    await expect(strip.getByText(/à votre rythme/i)).toBeVisible()
    await expect(strip.getByRole('button', { name: 'Mes informations' })).toBeVisible()
    await expect(strip.getByRole('button', { name: 'Ma peau' })).toBeVisible()
  })

  test('clicking "Mes informations" opens the hero edit form', async ({ page }) => {
    await registerFreshUser(page)
    await page.goto('/profile')

    const strip = page.getByRole('complementary', { name: 'Compléter le profil' })
    await strip.getByRole('button', { name: 'Mes informations' }).click()

    // Scope to the textbox: a sibling Toggle's hint also matches this label.
    await expect(page.getByRole('textbox', { name: "Nom d'utilisateur" })).toBeVisible()
  })
})
