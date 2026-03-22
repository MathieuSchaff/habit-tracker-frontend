import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '../../../../store/theme'
import { renderWithProviders } from '../../../../test/utils'
import { PreferenceSettings } from '../PreferenceSettings'

// Mock the TanStack Query response for existing preferences
vi.mock('../../../../lib/queries/user-preferences', () => ({
  userPreferenceQueries: {
    get: () => ({
      queryKey: ['user-preferences'],
      queryFn: async () => ({
        displayScale: 'out_of_20',
        criteriaWeights: {
          tolerance: 1, efficacy: 1, sensoriality: 1,
          stability: 1, mixability: 1, valueForMoney: 1,
        },
      }),
    }),
  },
  useUpdateUserPreferences: () => ({ mutate: vi.fn() }),
}))

describe('PreferenceSettings — palette section', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-light-variant')
    useThemeStore.setState({ theme: 'light', lightVariant: null })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.removeAttribute('data-light-variant')
    useThemeStore.setState({ theme: 'light', lightVariant: null })
  })

  it('shows palette section when theme is light', async () => {
    useThemeStore.setState({ theme: 'light' })
    renderWithProviders(<PreferenceSettings />)
    expect(await screen.findByText('Palette (mode clair)')).toBeInTheDocument()
  })

  it('hides palette section when theme is dark', async () => {
    useThemeStore.setState({ theme: 'dark' })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Échelle d\'affichage')
    expect(screen.queryByText('Palette (mode clair)')).not.toBeInTheDocument()
  })

  it('shows no swatch as active when lightVariant is null', async () => {
    useThemeStore.setState({ theme: 'light', lightVariant: null })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    const swatches = screen.getAllByRole('radio')
    swatches.forEach((s) => expect(s).not.toBeChecked())
  })

  it('marks the active swatch as checked', async () => {
    useThemeStore.setState({ theme: 'light', lightVariant: 'ardoise' })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    expect(screen.getByRole('radio', { name: /ardoise/i })).toBeChecked()
  })

  it('calls setLightVariant when a swatch is clicked', async () => {
    const setLightVariant = vi.fn()
    useThemeStore.setState({ theme: 'light', lightVariant: null, setLightVariant })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    fireEvent.click(screen.getByRole('radio', { name: /forêt/i }))
    expect(setLightVariant).toHaveBeenCalledWith('foret')
  })

  it('calls setLightVariant(null) when clicking the already-active swatch', async () => {
    const setLightVariant = vi.fn()
    useThemeStore.setState({ theme: 'light', lightVariant: 'foret', setLightVariant })
    renderWithProviders(<PreferenceSettings />)
    await screen.findByText('Palette (mode clair)')
    fireEvent.click(screen.getByRole('radio', { name: /forêt/i }))
    expect(setLightVariant).toHaveBeenCalledWith(null)
  })
})
