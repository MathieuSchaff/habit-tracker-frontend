import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '../../../../store/theme'
import { renderWithProviders } from '../../../../test/utils'
import { PreferenceSettings } from '../../tabs/PreferencesTab/PreferenceSettings'

vi.mock('../../../../lib/queries/user-preferences', () => ({
  userPreferenceQueries: {
    get: () => ({
      queryKey: ['user-preferences'],
      queryFn: async () => ({
        displayScale: 'out_of_20',
        criteriaWeights: {
          tolerance: 1,
          efficacy: 1,
          sensoriality: 1,
          stability: 1,
          mixability: 1,
          valueForMoney: 1,
        },
      }),
    }),
  },
  useUpdateUserPreferences: () => ({ mutate: vi.fn() }),
}))

describe('PreferenceSettings — palette section', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
    useThemeStore.setState({ theme: 'light', variant: 'terracota' })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
    useThemeStore.setState({ theme: 'light', variant: 'terracota' })
  })

  it('shows palette section in light mode', async () => {
    renderWithProviders(<PreferenceSettings />)
    expect(await screen.findByText('Palette (mode clair)')).toBeInTheDocument()
  })

  it('shows palette section in dark mode too', async () => {
    useThemeStore.setState({ theme: 'dark', variant: 'terracota' })
    renderWithProviders(<PreferenceSettings />)
    expect(await screen.findByText('Palette (mode clair)')).toBeInTheDocument()
  })

  it('marks Terracota as active when variant is terracota', async () => {
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    const paletteGroup = screen.getByRole('radiogroup', { name: /palette/i })
    expect(within(paletteGroup).getByRole('radio', { name: /terracota/i })).toBeChecked()

    const others = within(paletteGroup).getAllByRole('radio', { name: /^(?!terracota)/i })
    for (const s of others) expect(s).not.toBeChecked()
  })

  it('marks the active swatch as checked', async () => {
    useThemeStore.setState({ theme: 'light', variant: 'ardoise' })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    expect(screen.getByRole('radio', { name: /ardoise/i })).toBeChecked()
  })

  it('calls setVariant when a swatch is clicked', async () => {
    const setVariant = vi.fn()
    useThemeStore.setState({ theme: 'light', variant: 'terracota', setVariant })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    fireEvent.click(screen.getByRole('radio', { name: /forêt/i }))
    expect(setVariant).toHaveBeenCalledWith('foret')
  })
})
