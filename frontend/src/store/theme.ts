import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  isUserChoice: boolean // true = l'utilisateur a choisi explicitement
  toggle: () => void
  resetToSystem: () => void
}

const STORAGE_KEY = 'theme-preference'

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

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
}

const initial = getInitialTheme()
apply(initial.theme)

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initial.theme,
  isUserChoice: initial.isUserChoice,

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    apply(next)
    set({ theme: next, isUserChoice: true })
  },

  resetToSystem: () => {
    localStorage.removeItem(STORAGE_KEY)
    const system = getSystemTheme()
    apply(system)
    set({ theme: system, isUserChoice: false })
  },
}))

// Écoute les changements système (seulement si pas de choix utilisateur)
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!useThemeStore.getState().isUserChoice) {
      const next = e.matches ? 'dark' : 'light'
      apply(next)
      useThemeStore.setState({ theme: next })
    }
  })
}
