import path from 'node:path'

import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

// Keep this file separate until the Vite 8/Rolldown setup replaces the main config.

// Finds the eager stylesheet tag for an emitted empty CSS asset so it can be removed.
const EMPTY_CSS_LINK_PATTERN = (href: string) =>
  new RegExp(
    `\\s*<link\\b(?=[^>]*\\brel=(?:"stylesheet"|'stylesheet'))(?=[^>]*\\bhref=(?:"${escapeRegExp(
      href
    )}"|'${escapeRegExp(href)}'))[^>]*>`,
    'g'
  )

// Escapes an emitted asset path before injecting it into a RegExp.
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Normalizes Rolldown asset sources so CSS can be inspected as text.
function assetText(asset: { source: string | Uint8Array }) {
  return typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
}

// Builds the public asset URL while preserving static-preview relative bases.
function withBase(base: string, emittedFile: string) {
  const file = emittedFile.replace(/^\/+/, '')

  if (base === '') return file
  if (base === './') return `./${file}`

  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${file}`
}

function preloadBodyFont(): Plugin {
  let base = '/'

  return {
    name: 'aurore:preload-body-font',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html

        // Fontsource hides the body font behind CSS; preload the real hashed file.
        // Keep this aligned with the import in `src/main.tsx`.
        const font = Object.keys(ctx.bundle).find(
          (file) => file.includes('dm-sans-latin-400-normal') && file.endsWith('.woff2')
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
                href: withBase(base, font),
                crossorigin: '',
              },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
  }
}

function stripEmptyEagerCssLinks(): Plugin {
  let base = '/'

  return {
    name: 'aurore:strip-empty-eager-css-links',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html

        let transformedHtml = html
        for (const [fileName, bundledFile] of Object.entries(ctx.bundle)) {
          if (bundledFile.type !== 'asset' || !fileName.endsWith('.css')) continue
          if (assetText(bundledFile).trim() !== '') continue

          // Strip only the eager HTML link. Lazy preloads may still need the asset.
          const href = withBase(base, fileName)
          transformedHtml = transformedHtml.replace(EMPTY_CSS_LINK_PATTERN(href), '')
        }

        return transformedHtml
      },
    },
  }
}

function enabled(value: string | undefined) {
  return value === '1' || value === 'true'
}

export default defineConfig(async ({ command, mode, isPreview }): Promise<UserConfig> => {
  // Config files need `loadEnv`; `import.meta.env` is not ready here.
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const apiUrl = process.env.VITE_API_URL ?? fileEnv.VITE_API_URL ?? 'http://api:3000'
  const analyze = enabled(process.env.ANALYZE ?? fileEnv.ANALYZE)
  // Preview also uses `serve`, but Inspect should stay dev-only.
  const devServer = command === 'serve' && isPreview !== true

  let visualizerPlugin: Plugin | false = false

  if (analyze) {
    // Rolldown's builtin bundleAnalyzerPlugin never emits under `vite build` (the native
    // plugin isn't wired into Vite's build pipeline), so bundle analysis comes from the
    // Vite DevTools Rolldown panel instead. visualizer stays for the gzip/brotli treemap.
    const visualizerModule = 'rollup-plugin-visualizer'
    const { visualizer } = await import(visualizerModule)

    visualizerPlugin = visualizer({
      filename: './stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
    }) as Plugin
  }

  return {
    plugins: [
      devServer && Inspect(),

      // TanStack Router must run before React so route splitting sees source files.
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        quoteStyle: 'single',
        routeFileIgnorePattern: '\\.(test|spec)\\.[tj]sx?$',
      }),
      react(),

      // React Compiler still runs through Babel; keep it scoped to app code.
      babel({
        include: /src[\\/].*\.[jt]sx?$/,
        presets: [reactCompilerPreset()],
      }),

      preloadBodyFont(),
      stripEmptyEagerCssLinks(),
      visualizerPlugin,
    ],

    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },

    css: {
      // Devtools should point at source CSS, not PostCSS output.
      devSourcemap: true,
    },

    // DevTools keeps a server alive, so a plain `vite build` never exits (breaks
    // profile-prod and CI). Enable it only where it's wanted: the dev server and
    // ANALYZE builds (the latter records a Rolldown session, then holds for browsing).
    devtools: { enabled: devServer || analyze },

    server: {
      host: true,
      port: 5173,
      strictPort: true,

      // Do not use `allowedHosts: true`; it opens the dev server to DNS rebinding.
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },

    preview: {
      host: true,
      port: 4173,
      strictPort: true,
    },

    build: {
      // Gzip size reporting is useful for analysis, not for every build.
      reportCompressedSize: analyze,
      rolldownOptions: {
        output: {
          // Keep only stable shared groups explicit. Route-only deps should stay lazy.
          codeSplitting: {
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
                priority: 40,
              },
              {
                name: 'tanstack',
                // Router and Query are app-wide. Recheck this before adding route-only TanStack deps.
                test: /node_modules[\\/]@tanstack[\\/]/,
                priority: 30,
              },
              {
                name: 'forms',
                test: /node_modules[\\/]zod[\\/]/,
                priority: 20,
              },
              {
                name: 'vendor',
                test: /node_modules[\\/]/,
                priority: 10,
                minShareCount: 2,
                minSize: 20 * 1024,
                entriesAware: true,
                entriesAwareMergeThreshold: 10 * 1024,
              },
            ],
          },
        },
      },
    },
  }
})
