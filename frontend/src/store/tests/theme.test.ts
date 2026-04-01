import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('variant — initialization', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
    mockMatchMedia(false)
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
  })

  it('defaults to bleu when localStorage is empty', async () => {
    const { useThemeStore } = await import('../theme')
    expect(useThemeStore.getState().variant).toBe('bleu')
    expect(document.documentElement.getAttribute('data-variant')).toBe('bleu')
  })

  it('restores variant from localStorage on init', async () => {
    localStorage.setItem('variant', 'foret')
    const { useThemeStore } = await import('../theme')
    expect(useThemeStore.getState().variant).toBe('foret')
    expect(document.documentElement.getAttribute('data-variant')).toBe('foret')
  })

  it('falls back to bleu for invalid localStorage values', async () => {
    localStorage.setItem('variant', 'invalid-value')
    const { useThemeStore } = await import('../theme')
    expect(useThemeStore.getState().variant).toBe('bleu')
    expect(document.documentElement.getAttribute('data-variant')).toBe('bleu')
  })

  it('applies variant on init in dark mode too', async () => {
    mockMatchMedia(true) // system = dark
    localStorage.setItem('variant', 'ardoise')
    const { useThemeStore } = await import('../theme')
    expect(useThemeStore.getState().variant).toBe('ardoise')
    expect(document.documentElement.getAttribute('data-variant')).toBe('ardoise')
  })
})

describe('setVariant', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
    mockMatchMedia(false)
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
  })

  it('sets the variant, saves to localStorage, and applies data-variant', async () => {
    const { useThemeStore } = await import('../theme')
    useThemeStore.getState().setVariant('ardoise')

    expect(useThemeStore.getState().variant).toBe('ardoise')
    expect(localStorage.getItem('variant')).toBe('ardoise')
    expect(document.documentElement.getAttribute('data-variant')).toBe('ardoise')
  })

  it('switching variant updates data-variant in place', async () => {
    const { useThemeStore } = await import('../theme')
    useThemeStore.getState().setVariant('foret')
    useThemeStore.getState().setVariant('ardoise')

    expect(useThemeStore.getState().variant).toBe('ardoise')
    expect(document.documentElement.getAttribute('data-variant')).toBe('ardoise')
  })

  it('works in dark mode too — variant is global', async () => {
    mockMatchMedia(true) // system = dark
    const { useThemeStore } = await import('../theme')
    useThemeStore.getState().setVariant('terracota')

    expect(useThemeStore.getState().variant).toBe('terracota')
    expect(document.documentElement.getAttribute('data-variant')).toBe('terracota')
  })

  it('does not affect the theme field', async () => {
    const { useThemeStore } = await import('../theme')
    const themeBefore = useThemeStore.getState().theme
    useThemeStore.getState().setVariant('ardoise')
    expect(useThemeStore.getState().theme).toBe(themeBefore)
  })
})

describe('toggle — variant stays unchanged', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
    mockMatchMedia(false) // system = light
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-variant')
  })

  it('toggle keeps the same variant when switching to dark', async () => {
    localStorage.setItem('variant', 'terracota')
    const { useThemeStore } = await import('../theme')

    expect(document.documentElement.getAttribute('data-variant')).toBe('terracota')
    useThemeStore.getState().toggle()

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-variant')).toBe('terracota')
  })

  it('toggle keeps the same variant when switching back to light', async () => {
    localStorage.setItem('variant', 'foret')
    const { useThemeStore } = await import('../theme')

    useThemeStore.getState().toggle() // → dark
    useThemeStore.getState().toggle() // → light

    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.getAttribute('data-variant')).toBe('foret')
  })
})
