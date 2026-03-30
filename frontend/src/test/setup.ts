import '@testing-library/jest-dom/vitest'

import { vi } from 'vitest'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  try {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
      ...actual,
      Link: vi.fn(({ children }) => children),
      useRouter: vi.fn(() => ({ state: { location: { pathname: '/' } } })),
      useNavigate: vi.fn(() => vi.fn()),
      useParams: vi.fn(() => ({})),
      useSearch: vi.fn(() => ({})),
    }
  } catch (_e) {
    // If router is not yet generated or similar
    return {
      Link: vi.fn(({ children }) => children),
      useRouter: vi.fn(() => ({ state: { location: { pathname: '/' } } })),
      useNavigate: vi.fn(() => vi.fn()),
      useParams: vi.fn(() => ({})),
      useSearch: vi.fn(() => ({})),
    }
  }
})

// jsdom does not implement window.matchMedia — provide a minimal stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
