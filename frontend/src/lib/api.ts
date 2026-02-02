// frontend/src/lib/api.ts
import { hc } from 'hono/client'
import type { AppType } from '../../../backend/src'

const client = hc<AppType>('/')
export const api = client.api
