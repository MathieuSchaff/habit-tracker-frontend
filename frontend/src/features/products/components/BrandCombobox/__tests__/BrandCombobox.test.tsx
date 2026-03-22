import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BrandCombobox } from '../BrandCombobox'

// Mock des queries pour éviter les appels API réels
vi.mock('@/lib/queries/products', () => ({
  productQueries: {
    brands: vi.fn(() => ({
      queryKey: ['brands'],
      queryFn: () => Promise.resolve(['The Ordinary', 'CeraVe', 'La Roche-Posay']),
    })),
  },
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('BrandCombobox', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  const renderComponent = (props = {}) => {
    const defaultProps = {
      value: '',
      onChange: vi.fn(),
      placeholder: 'Chercher une marque',
      ...props,
    }
    return render(
      <QueryClientProvider client={queryClient}>
        <BrandCombobox {...defaultProps} />
      </QueryClientProvider>
    )
  }

  it('affiche le placeholder correct', () => {
    renderComponent()
    expect(screen.getByPlaceholderText('Chercher une marque')).toBeInTheDocument()
  })

  it('affiche les suggestions quand on tape', async () => {
    renderComponent()
    const input = screen.getByPlaceholderText('Chercher une marque')

    await userEvent.type(input, 'The')

    await waitFor(() => {
      expect(screen.getByText('The Ordinary')).toBeInTheDocument()
    })
  })

  it("appelle onChange avec confirmed=true lors d'un clic sur une suggestion", async () => {
    const onChange = vi.fn()
    renderComponent({ onChange })
    const input = screen.getByPlaceholderText('Chercher une marque')

    await userEvent.type(input, 'The')
    const option = await screen.findByText('The Ordinary')
    await userEvent.click(option)

    expect(onChange).toHaveBeenCalledWith('The Ordinary', true)
  })

  it('sélectionne la première suggestion avec la touche Tab sans bloquer le focus', async () => {
    const onChange = vi.fn()
    renderComponent({ onChange })
    const input = screen.getByPlaceholderText('Chercher une marque')

    await userEvent.type(input, 'The')
    await screen.findByText('The Ordinary')

    // Simuler la touche Tab
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(onChange).toHaveBeenCalledWith('The Ordinary', true)
    // On ne fait pas de preventDefault sur Tab, donc le test de focus se ferait en intégration réelle
  })

  it('affiche le message de confirmation si la marque est inconnue au blur', async () => {
    const onChange = vi.fn()
    renderComponent({ onChange })
    const input = screen.getByPlaceholderText('Chercher une marque')

    await userEvent.type(input, 'Marque Inconnue')
    fireEvent.blur(input)

    await waitFor(
      () => {
        expect(screen.getByText(/Marque « Marque Inconnue » introuvable/)).toBeInTheDocument()
      },
      { timeout: 500 }
    )
  })

  it("permet de confirmer la création d'une nouvelle marque", async () => {
    const onChange = vi.fn()
    renderComponent({ onChange })
    const input = screen.getByPlaceholderText('Chercher une marque')

    await userEvent.type(input, 'Nouvelle Marque')
    fireEvent.blur(input)

    const confirmBtn = await screen.findByText('Oui')
    await userEvent.click(confirmBtn)

    expect(onChange).toHaveBeenCalledWith('Nouvelle Marque', true)
  })

  it("permet d'annuler la création d'une nouvelle marque", async () => {
    const onChange = vi.fn()
    renderComponent({ onChange })
    const input = screen.getByPlaceholderText('Chercher une marque')

    await userEvent.type(input, 'Erreur')
    fireEvent.blur(input)

    const cancelBtn = await screen.findByText('Non')
    await userEvent.click(cancelBtn)

    expect(onChange).toHaveBeenCalledWith('', false)
    expect(input).toHaveValue('')
  })
})
