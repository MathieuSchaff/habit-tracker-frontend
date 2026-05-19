import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadBlobAsFile, parseAttachmentFilename } from '../download'

describe('parseAttachmentFilename', () => {
  it('returns null for missing header', () => {
    expect(parseAttachmentFilename(null)).toBeNull()
    expect(parseAttachmentFilename(undefined)).toBeNull()
    expect(parseAttachmentFilename('')).toBeNull()
  })

  it('extracts a double-quoted filename', () => {
    expect(parseAttachmentFilename('attachment; filename="aurore-export-abc-20260519.json"')).toBe(
      'aurore-export-abc-20260519.json'
    )
  })

  it('extracts an unquoted filename', () => {
    expect(parseAttachmentFilename('attachment; filename=plain.json')).toBe('plain.json')
  })

  it('is case-insensitive on the parameter name', () => {
    expect(parseAttachmentFilename('attachment; FileName="x.json"')).toBe('x.json')
  })

  it('returns null when filename param is absent', () => {
    expect(parseAttachmentFilename('attachment')).toBeNull()
    expect(parseAttachmentFilename('inline')).toBeNull()
  })

  it('trims surrounding whitespace from unquoted values', () => {
    expect(parseAttachmentFilename('attachment; filename=   spaced.json  ')).toBe('spaced.json')
  })
})

describe('downloadBlobAsFile', () => {
  // jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them.
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates an anchor with the requested filename and triggers a click', () => {
    const blob = new Blob(['{"hello":"world"}'], { type: 'application/json' })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlobAsFile(blob, 'test.json')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe('test.json')
    expect(anchor.href).toBe('blob:mock-url')
    expect(anchor.rel).toBe('noopener')
  })

  it('revokes the object URL after the click', () => {
    const blob = new Blob(['x'])
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlobAsFile(blob, 'x.json')

    // setTimeout(..., 0) → fires on the next macrotask tick. Async cleanup
    // matters here because Safari needs the blob URL alive long enough to
    // kick off the download before we tear it down.
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
