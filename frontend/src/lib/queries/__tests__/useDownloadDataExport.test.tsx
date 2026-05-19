import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api', () => ({
  api: {
    profile: {
      export: {
        $get: vi.fn(),
      },
    },
  },
}))

import { api } from '../../api'
import { ExportRateLimitError, useDownloadDataExport } from '../profile'

const mockExportGet = vi.mocked(api.profile.export.$get) as unknown as ReturnType<typeof vi.fn>

function makeResponse(init: { status?: number; body: BodyInit; headers?: HeadersInit }): Response {
  return new Response(init.body, { status: init.status ?? 200, headers: init.headers })
}

describe('useDownloadDataExport', () => {
  let queryClient: QueryClient

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    queryClient = new QueryClient({
      // Disable retry so a failed call surfaces immediately in the test.
      defaultOptions: { mutations: { retry: false } },
    })
    mockExportGet.mockReset()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    queryClient.clear()
    clickSpy.mockRestore()
  })

  it('downloads the blob with the server-supplied filename on 200', async () => {
    mockExportGet.mockResolvedValue(
      makeResponse({
        status: 200,
        body: '{"_meta":{"schemaVersion":"1"}}',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="aurore-export-abc-20260519.json"',
        },
      })
    )

    const { result } = renderHook(() => useDownloadDataExport(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe('aurore-export-abc-20260519.json')
  })

  it('falls back to a default filename when Content-Disposition is missing', async () => {
    mockExportGet.mockResolvedValue(
      makeResponse({
        status: 200,
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { result } = renderHook(() => useDownloadDataExport(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe('aurore-export.json')
  })

  it('throws ExportRateLimitError carrying retryAfter on a 429 response', async () => {
    mockExportGet.mockResolvedValue(
      makeResponse({
        status: 429,
        body: JSON.stringify({
          success: false,
          error: 'rate_limit_exceeded',
          details: { retryAfter: 240 },
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { result } = renderHook(() => useDownloadDataExport(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ExportRateLimitError)
    expect((result.current.error as ExportRateLimitError).retryAfterSec).toBe(240)
    // No blob URL must be created when the request was rejected.
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('surfaces a generic Error on other failures', async () => {
    mockExportGet.mockResolvedValue(
      makeResponse({
        status: 500,
        body: JSON.stringify({ success: false, error: 'server_error' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { result } = renderHook(() => useDownloadDataExport(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error).not.toBeInstanceOf(ExportRateLimitError)
  })
})
