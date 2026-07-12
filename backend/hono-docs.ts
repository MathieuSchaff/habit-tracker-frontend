import { defineConfig } from '@rcmade/hono-docs'

export default defineConfig({
  // Solution-style tsconfig.json has `files: []`; ts-morph would see an empty
  // project and skip JSDoc extraction. Point at the real build project instead.
  tsConfigPath: './tsconfig.build.json',
  openApi: {
    openapi: '3.0.0',
    info: { title: 'Aurore API (test)', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000' }],
  },
  outputs: {
    openApiJson: './openapi/openapi.json',
  },
  apis: [
    {
      name: 'Aurore',
      apiPrefix: '',
      appTypePath: 'src/index.ts',
    },
  ],
})
