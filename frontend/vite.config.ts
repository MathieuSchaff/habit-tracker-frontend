import path from 'node:path'

import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { bundleAnalyzerPlugin } from 'rolldown/experimental'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

// https://vitejs.dev/config/
// https://tanstack.com/router/latest/docs/framework/react/installation/with-vite
export default defineConfig({
  plugins: [
    // Dev-only (apply: 'serve'). Inspect per-plugin transforms at /__inspect/ — useful to
    // debug the custom transformIndexHtml plugins below.
    Inspect(),
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      quoteStyle: 'single',
      // string pattern, not RegExp: router-generator schema is z.string() only
      routeFileIgnorePattern: '\\.(test|spec)\\.[tj]sx?$',
    }),
    react(),
    // React Compiler runs via Babel; plugin-react 6 dropped its inline babel option.
    // Scope to app source so node_modules isn't transformed.
    babel({
      include: /src\/.*\.[jt]sx?$/,
      presets: [reactCompilerPreset()],
    }),

    // Body font (DM Sans 400 latin) ships via @fontsource CSS, so the browser only
    // discovers it after parsing the eager CSS (HTML→CSS→woff2, 2 hops). Preload it
    // by its real hashed name from the bundle to cut a render-blocking hop. Build-only.
    {
      name: 'preload-body-font',
      transformIndexHtml(html, ctx) {
        if (!ctx.bundle) return html
        const font = Object.keys(ctx.bundle).find(
          (f) => f.includes('dm-sans-latin-400-normal') && f.endsWith('.woff2')
        )
        if (!font) return html
        return {
          html,
          tags: [
            {
              tag: 'link',
              attrs: {
                rel: 'preload',
                as: 'font',
                type: 'font/woff2',
                href: `/${font}`,
                crossorigin: '',
              },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
    // Vite reserves a CSS file per chunk that imports CSS, decided early from imports.
    // After tree-shaking some end up empty (vendor with no CSS, schema deep-imports that
    // dropped their component CSS). An empty eager <link> still render-blocks first paint
    // for zero bytes, so strip the <link> from the HTML. Build-only.
    // Keep the (empty) asset though: the same CSS can be a lazy chunk's __vitePreload dep,
    // so deleting it 404s that preload at runtime. A served 0-byte 200 is harmless.
    // Tracks vitejs/vite#11672 (CSS slot reserved pre-tree-shake); delete if Vite ships a native fix.
    {
      name: 'strip-empty-css',
      transformIndexHtml(html, ctx) {
        if (!ctx.bundle) return html
        let out = html
        for (const [name, asset] of Object.entries(ctx.bundle)) {
          if (!name.endsWith('.css')) continue
          const source = 'source' in asset && typeof asset.source === 'string' ? asset.source : ''
          if (source.trim() !== '') continue
          out = out.replace(
            new RegExp(
              `\\s*<link[^>]*href="/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`
            ),
            ''
          )
        }
        return out
      },
    },
    // Bundle treemap with gzip/brotli size estimates. Production nginx currently serves gzip;
    // brotli remains useful as a comparison. Gated behind ANALYZE so normal/prod builds don't
    // emit stats.html. Must stay last. Run: ANALYZE=1 vite build
    Boolean(process.env.ANALYZE) &&
      visualizer({
        filename: './stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://api:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      // Native Rolldown analyzer (experimental). MD report tuned for code review of chunk
      // splitting — complements visualizer's gzip/brotli treemap. Gated behind ANALYZE,
      // emits dist/analyze-data.md. rolldown is Vite 8's engine: phantom dep, version-locked.
      plugins: process.env.ANALYZE ? [bundleAnalyzerPlugin({ format: 'md' })] : [],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'react'
          if (id.includes('node_modules/@tanstack/')) return 'tanstack'
          if (id.includes('node_modules/zod/')) return 'forms'
          // Route-scoped (/profile, products/new) — keep out of the eager vendor chunk
          if (id.includes('node_modules/react-easy-crop/')) return undefined
          // Keep markdown/katex out — they are lazy-loaded per route, don't force them into a shared chunk
          if (
            id.includes('node_modules/katex/') ||
            id.includes('node_modules/react-markdown/') ||
            id.includes('node_modules/remark') ||
            id.includes('node_modules/rehype') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/mdast') ||
            id.includes('node_modules/hast') ||
            id.includes('node_modules/unified/')
          )
            return undefined
          if (id.includes('node_modules/')) return 'vendor'
        },
      },
    },
  },
})
