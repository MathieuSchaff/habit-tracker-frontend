import { create } from 'zustand'

type Theme = 'light' | 'dark'
export type LightVariant = 'foret' | 'ardoise'

const VALID_VARIANTS: LightVariant[] = ['foret', 'ardoise']

interface ThemeStore {
  theme: Theme
  isUserChoice: boolean
  lightVariant: LightVariant | null
  toggle: () => void
  resetToSystem: () => void
  setLightVariant: (v: LightVariant | null) => void
}

const STORAGE_KEY = 'theme-preference'
const VARIANT_KEY = 'light-variant'

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const getInitialTheme = (): { theme: Theme; isUserChoice: boolean } => {
  if (typeof window === 'undefined') {
    return { theme: 'light', isUserChoice: false }
  }
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') {
    return { theme: saved, isUserChoice: true }
  }
  return { theme: getSystemTheme(), isUserChoice: false }
}

const getInitialVariant = (): LightVariant | null => {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(VARIANT_KEY)
  return VALID_VARIANTS.includes(saved as LightVariant) ? (saved as LightVariant) : null
}

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
}

const applyLightVariant = (v: LightVariant | null) => {
  if (v !== null) {
    document.documentElement.setAttribute('data-light-variant', v)
  } else {
    document.documentElement.removeAttribute('data-light-variant')
  }
}

const initial = getInitialTheme()
const initialVariant = getInitialVariant()
applyTheme(initial.theme)
applyLightVariant(initialVariant)

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initial.theme,
  isUserChoice: initial.isUserChoice,
  lightVariant: initialVariant,

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

  setLightVariant: (v) => {
    if (v !== null) {
      localStorage.setItem(VARIANT_KEY, v)
    } else {
      localStorage.removeItem(VARIANT_KEY)
    }
    applyLightVariant(v)
    set({ lightVariant: v })
  },
}))

// Listen for system theme changes (only when user has not made an explicit choice)
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!useThemeStore.getState().isUserChoice) {
      const next = e.matches ? 'dark' : 'light'
      applyTheme(next)
      useThemeStore.setState({ theme: next })
    }
  })
}
