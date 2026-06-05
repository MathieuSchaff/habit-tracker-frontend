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
          if (
            id.includes('node_modules/zod/') ||
            id.includes('node_modules/@hookform/') ||
            id.includes('node_modules/react-hook-form/')
          )
            return 'forms'
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
