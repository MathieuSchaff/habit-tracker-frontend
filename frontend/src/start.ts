import { createStart } from '@tanstack/react-start'

// Keep application routes client-rendered by default. Public content opts into
// runtime SSR explicitly.
export const startInstance = createStart(() => ({
  defaultSsr: false,
}))
