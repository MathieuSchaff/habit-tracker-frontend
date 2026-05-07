import path from 'node:path'

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
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
    }),
    react(),
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
  esbuild: {
    pure: ['console.log', 'console.debug'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react'
          if (id.includes('node_modules/@tanstack/')) return 'tanstack'
          if (id.includes('node_modules/zod/') || id.includes('node_modules/@hookform/') || id.includes('node_modules/react-hook-form/')) return 'forms'
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
          ) return undefined
          if (id.includes('node_modules/')) return 'vendor'
        },
      },
    },
  },
})
