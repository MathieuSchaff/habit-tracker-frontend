import '@testing-library/jest-dom/vitest'

import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { server } from './msw/server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

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

// jsdom does not implement Element.prototype.scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// jsdom does not implement <dialog>.showModal()/close(). Provide minimal stubs
// so components that toggle a modal dialog (FilterDrawer, etc.) don't throw on
// mount/unmount.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}

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
