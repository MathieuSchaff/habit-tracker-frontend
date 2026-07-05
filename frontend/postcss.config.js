import globalData from '@csstools/postcss-global-data'
import purgecss from '@fullhuman/postcss-purgecss'
import customMedia from 'postcss-custom-media'
import nesting from 'postcss-nesting'

const isProd = process.env.NODE_ENV === 'production'

// Gate :hover rules behind (hover: hover) so taps on touch devices don't leave
// stuck hover states. Inline plugin: postcss-hover-media-feature@1.0.2 hangs on
// :hover inside :has(). Runs after nesting so it sees flat selectors.
// Caveat: substring match, so `:not(:hover)` is gated too (vanishes on touch) —
// none exist today; write a plain default state + :hover override if you need one.
const HOVER_MEDIA = /\(\s*hover\s*:\s*hover\s*\)/i
const hoverGate = () => ({
  postcssPlugin: 'hover-media-gate',
  OnceExit(root, { AtRule }) {
    root.walkRules((rule) => {
      if (
        !rule.selector.includes(':hover') ||
        (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes')
      )
        return
      for (let p = rule.parent; p; p = p.parent) {
        if (p.type === 'atrule' && p.name === 'media' && HOVER_MEDIA.test(p.params)) return
      }
      const hoverSels = rule.selectors.filter((s) => s.includes(':hover'))
      const media = new AtRule({ name: 'media', params: '(hover: hover)', source: rule.source })
      media.append(rule.clone({ selectors: hoverSels }))
      rule.after(media)
      const rest = rule.selectors.filter((s) => !s.includes(':hover'))
      if (rest.length) rule.selectors = rest
      else rule.remove()
    })
  },
})

export default {
  plugins: [
    globalData({ files: ['src/styles/tokens/breakpoints.css'] }),
    customMedia(),
    // Flatten nesting before PurgeCSS sees the CSS. Vite only flattens `&` via esbuild
    // after PostCSS, so PurgeCSS would otherwise get raw `&` selectors and drop them.
    nesting(),
    hoverGate(),
    isProd &&
      purgecss({
        content: ['./index.html', './src/**/*.{ts,tsx,html}'],
        defaultExtractor: (content) => content.match(/[A-Za-z0-9_-]+/g) || [],
        safelist: {
          standard: [/^is-/, /^has-/, /^data-/, /^aria-/],
          deep: [/^katex/, /^ProseMirror/],
          // BEM modifiers are built dynamically (`badge--${variant}`), so the extractor
          // only sees the `badge--` prefix. Keep any selector ending in `--modifier`.
          greedy: [/--[a-z][a-z0-9-]*$/],
        },
        keyframes: true,
        fontFace: true,
        variables: false,
        rejected: true,
      }),
  ].filter(Boolean),
}
