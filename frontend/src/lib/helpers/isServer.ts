// True in the SSR bundle, false in the browser bundle. Safe as a module const:
// each bundle only ever runs in its own environment. Single idiom for the
// environment guards (render fallbacks, client-only module init and loaders).
export const isServer = typeof document === 'undefined'
