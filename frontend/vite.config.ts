import path from 'node:path'

import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
// https://tanstack.com/router/latest/docs/framework/react/installation/with-vite
export default defineConfig({
  plugins: [
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
    // Rolldown emits a whitespace-only CSS asset for the vendor chunk and links it
    // render-blocking in index.html. Drop the dead asset + its <link>. Build-only.
    {
      name: 'strip-empty-css',
      transformIndexHtml(html, ctx) {
        if (!ctx.bundle) return html
        let out = html
        for (const [name, asset] of Object.entries(ctx.bundle)) {
          if (!name.endsWith('.css')) continue
          const source = 'source' in asset && typeof asset.source === 'string' ? asset.source : ''
          if (source.trim() !== '') continue
          const next = out.replace(
            new RegExp(
              `\\s*<link[^>]*href="/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`
            ),
            ''
          )
          // Only drop the asset when it was an eager <link> in the HTML. Lazy route-chunk
          // CSS is injected by its JS chunk at runtime — deleting it would 404 on load.
          if (next !== out) {
            out = next
            delete ctx.bundle[name]
          }
        }
        return out
      },
    },
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
