import { join, resolve } from 'node:path'

const DEFAULT_IMAGE_OUTPUT_DIR = join(import.meta.dir, '..', '..', 'output')

export function resolveImageOutputDir(env?: { IMAGE_OUTPUT_DIR?: string }): string {
  const configured = (
    env === undefined ? process.env.IMAGE_OUTPUT_DIR : env.IMAGE_OUTPUT_DIR
  )?.trim()
  return configured ? resolve(configured) : DEFAULT_IMAGE_OUTPUT_DIR
}
