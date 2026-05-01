import { UploadError } from './upload-error'

type Options = {
  maxBytes: number
  expectedSize: 1024 | 1200
}

export function validateWebpUpload(buf: Buffer, opts: Options): void {
  if (buf.byteLength > opts.maxBytes) throw new UploadError('upload_too_large')
  if (buf.byteLength < 30) throw new UploadError('upload_invalid_format')
  if (buf.subarray(0, 4).toString('ascii') !== 'RIFF') {
    throw new UploadError('upload_invalid_format')
  }
  if (buf.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new UploadError('upload_invalid_format')
  }
  const { width, height } = parseWebpDimensions(buf)
  if (width !== opts.expectedSize || height !== opts.expectedSize) {
    throw new UploadError('upload_invalid_dimensions')
  }
}

export function parseWebpDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.byteLength < 30) throw new UploadError('upload_invalid_format')
  const chunkType = buf.subarray(12, 16).toString('ascii')

  if (chunkType === 'VP8L') {
    if (buf[20] !== 0x2f) throw new UploadError('upload_invalid_format')
    const b1 = buf[21]
    const b2 = buf[22]
    const b3 = buf[23]
    const b4 = buf[24]
    const w = ((b2 & 0x3f) << 8) | b1
    const h = ((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)
    return { width: w + 1, height: h + 1 }
  }

  if (chunkType === 'VP8X') {
    const w = buf[24] | (buf[25] << 8) | (buf[26] << 16)
    const h = buf[27] | (buf[28] << 8) | (buf[29] << 16)
    return { width: w + 1, height: h + 1 }
  }

  if (chunkType === 'VP8 ') {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
      throw new UploadError('upload_invalid_format')
    }
    const w = (buf[26] | (buf[27] << 8)) & 0x3fff
    const h = (buf[28] | (buf[29] << 8)) & 0x3fff
    return { width: w, height: h }
  }

  throw new UploadError('upload_invalid_format')
}
