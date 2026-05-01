import { env } from '../../config/env'
import { UploadError } from './upload-error'

export async function putToBunny(key: string, buffer: Buffer): Promise<void> {
  const url = `https://${env.BUNNY_STORAGE_HOSTNAME}/${env.BUNNY_STORAGE_ZONE}/${key}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: env.BUNNY_STORAGE_PASSWORD,
        'Content-Type': 'image/webp',
      },
      body: buffer,
    })
  } catch {
    throw new UploadError('upload_storage_failed')
  }
  if (!res.ok) {
    throw new UploadError('upload_storage_failed')
  }
}
