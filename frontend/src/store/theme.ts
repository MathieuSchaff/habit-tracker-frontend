import { create } from 'zustand'

import { isServer } from '../lib/helpers/isServer'

type Theme = 'light' | 'dark'

const VALID_VARIANTS = ['terracota', 'foret', 'ardoise'] as const

export type Variant = (typeof VALID_VARIANTS)[number]

const DEFAULT_VARIANT: Variant = 'terracota'

const STORAGE_KEY = 'theme-preference'
const VARIANT_KEY = 'variant'

interface ThemeStore {
  theme: Theme
  isUserChoice: boolean
  variant: Variant
  toggle: () => void
  resetToSystem: () => void
  setVariant: (v: Variant) => Promise<void>
}

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const getInitialTheme = (): { theme: Theme; isUserChoice: boolean } => {
  if (isServer) return { theme: 'light', isUserChoice: false }
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return { theme: saved, isUserChoice: true }
  return { theme: getSystemTheme(), isUserChoice: false }
}

const getInitialVariant = (): Variant => {
  if (isServer) return DEFAULT_VARIANT
  const saved = localStorage.getItem(VARIANT_KEY)
  return VALID_VARIANTS.includes(saved as Variant) ? (saved as Variant) : DEFAULT_VARIANT
}

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
}

const applyVariant = (variant: Variant) => {
  document.documentElement.setAttribute('data-variant', variant)
}

// terracota ships statically; foret/ardoise CSS chunks are fetched on demand.
// Both light + dark of a variant preload together so theme toggle stays instant after first pick.
// setVariant awaits this so data-variant only flips once the <link> is injected (no FOUC).
const loadedVariants = new Set<Variant>(['terracota'])

const loadVariant = async (variant: Variant): Promise<void> => {
  if (loadedVariants.has(variant)) return

  switch (variant) {
    case 'foret':
      await Promise.all([
        import('../styles/tokens/colors-light-foret.css'),
        import('../styles/tokens/colors-dark-foret.css'),
      ])
      break
    case 'ardoise':
      await Promise.all([
        import('../styles/tokens/colors-light-ardoise.css'),
        import('../styles/tokens/colors-dark-ardoise.css'),
      ])
      break
    case 'terracota':
      break
    default: {
      const _exhaustive: never = variant
      throw new Error(`Unhandled variant: ${_exhaustive}`)
    }
  }
  loadedVariants.add(variant)
}

const initial = getInitialTheme()
const initialVariant = getInitialVariant()

// Client-only: RootDocument ships data-theme="light" for SSR/prerender; the
// client re-applies from storage after hydration.
if (!isServer) {
  applyTheme(initial.theme)
  applyVariant(initialVariant)
  void loadVariant(initialVariant)
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initial.theme,
  isUserChoice: initial.isUserChoice,
  variant: initialVariant,

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    set({ theme: next, isUserChoice: true })
  },

  resetToSystem: () => {
    localStorage.removeItem(STORAGE_KEY)
    const system = getSystemTheme()
    applyTheme(system)
    set({ theme: system, isUserChoice: false })
  },

  setVariant: async (v) => {
    localStorage.setItem(VARIANT_KEY, v)
    await loadVariant(v)
    applyVariant(v)
    set({ variant: v })
  },
}))

// Follow system theme changes only when the user hasn't picked manually.
if (!isServer) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!useThemeStore.getState().isUserChoice) {
      const next = e.matches ? 'dark' : 'light'
      applyTheme(next)
      useThemeStore.setState({ theme: next })
    }
  })
}
