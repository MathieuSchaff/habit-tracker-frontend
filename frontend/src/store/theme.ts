import { create } from 'zustand'

type Theme = 'light' | 'dark'
export type Variant = 'terracota' | 'foret' | 'ardoise'

const VALID_VARIANTS: Variant[] = ['terracota', 'foret', 'ardoise']
const DEFAULT_VARIANT: Variant = 'terracota'

const STORAGE_KEY = 'theme-preference'
const VARIANT_KEY = 'variant'

interface ThemeStore {
  theme: Theme
  isUserChoice: boolean
  variant: Variant
  toggle: () => void
  resetToSystem: () => void
  setVariant: (v: Variant) => void
}

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const getInitialTheme = (): { theme: Theme; isUserChoice: boolean } => {
  if (typeof window === 'undefined') return { theme: 'light', isUserChoice: false }
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return { theme: saved, isUserChoice: true }
  return { theme: getSystemTheme(), isUserChoice: false }
}

const getInitialVariant = (): Variant => {
  if (typeof window === 'undefined') return DEFAULT_VARIANT
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
// Brief FOUC possible on first switch since Vite injects <link> asynchronously.
const loadedVariants = new Set<Variant>(['terracota'])

const loadVariant = (variant: Variant): void => {
  if (loadedVariants.has(variant)) return
  loadedVariants.add(variant)

  switch (variant) {
    case 'foret':
      void import('../styles/tokens/colors-light-foret.css')
      void import('../styles/tokens/colors-dark-foret.css')
      break
    case 'ardoise':
      void import('../styles/tokens/colors-light-ardoise.css')
      void import('../styles/tokens/colors-dark-ardoise.css')
      break
  }
}

const initial = getInitialTheme()
const initialVariant = getInitialVariant()

applyTheme(initial.theme)
applyVariant(initialVariant)
loadVariant(initialVariant)

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

  setVariant: (v) => {
    loadVariant(v)
    localStorage.setItem(VARIANT_KEY, v)
    applyVariant(v)
    set({ variant: v })
  },
}))

// Follow system theme changes only when the user hasn't picked manually.
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!useThemeStore.getState().isUserChoice) {
      const next = e.matches ? 'dark' : 'light'
      applyTheme(next)
      useThemeStore.setState({ theme: next })
    }
  })
}
