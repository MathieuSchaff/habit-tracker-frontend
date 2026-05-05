import { create } from 'zustand'

type Theme = 'light' | 'dark'
export type Variant = 'bleu' | 'terracota' | 'foret' | 'ardoise'

const VALID_VARIANTS: Variant[] = ['bleu', 'terracota', 'foret', 'ardoise']
const DEFAULT_VARIANT: Variant = 'bleu'

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

const initial = getInitialTheme()
const initialVariant = getInitialVariant()

applyTheme(initial.theme)
applyVariant(initialVariant)

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initial.theme,
  isUserChoice: initial.isUserChoice,
  variant: initialVariant,

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    // variant stays unchanged — toggle only switches light/dark
    set({ theme: next, isUserChoice: true })
  },

  resetToSystem: () => {
    localStorage.removeItem(STORAGE_KEY)
    const system = getSystemTheme()
    applyTheme(system)
    set({ theme: system, isUserChoice: false })
  },

  setVariant: (v) => {
    localStorage.setItem(VARIANT_KEY, v)
    applyVariant(v)
    set({ variant: v })
  },
}))

// Listen for system theme change, only if user didn't choose manually
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!useThemeStore.getState().isUserChoice) {
      const next = e.matches ? 'dark' : 'light'
      applyTheme(next)
      useThemeStore.setState({ theme: next })
    }
  })
}
