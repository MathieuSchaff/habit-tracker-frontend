import { useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useModerateContent, useVerifyCatalogItem } from '@/lib/queries/admin'
import { renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useSuspenseQuery: vi.fn() }
})

vi.mock('@/lib/queries/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/admin')>()
  return {
    ...actual,
    useModerateContent: vi.fn(),
    useVerifyCatalogItem: vi.fn(),
  }
})

import { AdminCatalogPage } from '../components/AdminCatalogPage'
import { adminLabels } from '../constants'

type CatalogItem = {
  kind: 'product' | 'ingredient'
  id: string
  name: string
  brand: string | null
  slug: string
  catalogQuality: 'unverified' | 'verified'
  moderationStatus: 'visible' | 'hidden'
  authorId: string | null
  createdAt: string
}

const UNVERIFIED_PRODUCT: CatalogItem = {
  kind: 'product',
  id: 'prod-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  name: 'Crème mystère',
  brand: 'BrandX',
  slug: 'creme-mystere',
  catalogQuality: 'unverified',
  moderationStatus: 'visible',
  authorId: 'usr-author',
  createdAt: '2026-05-30T10:00:00Z',
}

const HIDDEN_PRODUCT: CatalogItem = {
  ...UNVERIFIED_PRODUCT,
  id: 'prod-hidden-0000-0000-0000-000000000000',
  name: 'Fiche masquée',
  moderationStatus: 'hidden',
}

// The component reads `status` off the query options to branch « À vérifier » vs
// « Masqués » — capture the status arg so a tab switch can be asserted on the query.
let lastQueryStatus: string | undefined

function setupQuery(items: CatalogItem[]) {
  lastQueryStatus = undefined
  vi.mocked(useSuspenseQuery).mockImplementation((options: { queryKey: readonly unknown[] }) => {
    const params = options.queryKey[2] as { status?: string } | undefined
    lastQueryStatus = params?.status
    const view = params?.status === 'hidden' ? 'hidden' : 'visible'
    return {
      data: { items: items.filter((i) => i.moderationStatus === view) },
    } as unknown as ReturnType<typeof useSuspenseQuery>
  })
}

function setupMutations() {
  const verify = vi.fn()
  const moderate = vi.fn()
  vi.mocked(useVerifyCatalogItem).mockReturnValue({
    mutate: verify,
    isPending: false,
  } as unknown as ReturnType<typeof useVerifyCatalogItem>)
  vi.mocked(useModerateContent).mockReturnValue({
    mutate: moderate,
    isPending: false,
  } as unknown as ReturnType<typeof useModerateContent>)
  return { verify, moderate }
}

async function confirmDialog(label: string) {
  const dialog = await screen.findByRole('alertdialog')
  await userEvent.click(
    Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === label
    ) as HTMLButtonElement
  )
}

describe('AdminCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders both tab bars and an unverified product row with its actions', () => {
    setupQuery([UNVERIFIED_PRODUCT])
    setupMutations()
    renderWithProviders(<AdminCatalogPage />)

    expect(screen.getByRole('tab', { name: 'Produits' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Ingrédients' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'À vérifier' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Masqués' })).toBeInTheDocument()

    expect(screen.getByText('Crème mystère')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masquer' })).toBeInTheDocument()
  })

  it('shows the empty state when the view has no fiches', () => {
    setupQuery([])
    setupMutations()
    renderWithProviders(<AdminCatalogPage />)

    expect(screen.getByText(adminLabels.emptyCatalogQueue)).toBeInTheDocument()
  })

  it('verifies a fiche with kind+id after confirmation', async () => {
    setupQuery([UNVERIFIED_PRODUCT])
    const { verify } = setupMutations()
    renderWithProviders(<AdminCatalogPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Vérifier' }))
    await confirmDialog('Vérifier')

    await waitFor(() => {
      expect(verify).toHaveBeenCalledWith(
        { kind: 'product', id: UNVERIFIED_PRODUCT.id },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  it('hides a fiche with target=products + status=hidden after confirmation', async () => {
    setupQuery([UNVERIFIED_PRODUCT])
    const { moderate } = setupMutations()
    renderWithProviders(<AdminCatalogPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Masquer' }))
    await confirmDialog('Masquer')

    await waitFor(() => {
      expect(moderate).toHaveBeenCalledWith(
        { target: 'products', id: UNVERIFIED_PRODUCT.id, body: { status: 'hidden' } },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  it('queries status=hidden and shows Restaurer (no Vérifier) in the Masqués view', () => {
    setupQuery([HIDDEN_PRODUCT])
    setupMutations()
    renderWithProviders(<AdminCatalogPage />)

    fireEvent.click(screen.getByRole('tab', { name: 'Masqués' }))

    expect(lastQueryStatus).toBe('hidden')
    expect(screen.getByText('Fiche masquée')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restaurer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vérifier' })).not.toBeInTheDocument()
  })
})
