import globalData from '@csstools/postcss-global-data'
import purgecss from '@fullhuman/postcss-purgecss'
import customMedia from 'postcss-custom-media'

const isProd = process.env.NODE_ENV === 'production'

export default {
  plugins: [
    globalData({ files: ['src/styles/tokens/breakpoints.css'] }),
    customMedia(),
    isProd &&
      purgecss({
        content: ['./index.html', './src/**/*.{ts,tsx,html}'],
        defaultExtractor: (content) => content.match(/[A-Za-z0-9_-]+/g) || [],
        safelist: {
          standard: [/^is-/, /^has-/, /^data-/, /^aria-/],
          deep: [/^katex/, /^ProseMirror/],
          greedy: [/--[a-z][a-z0-9-]*$/],
        },
        keyframes: true,
        fontFace: true,
        variables: false,
        rejected: true,
      }),
  ].filter(Boolean),
}
