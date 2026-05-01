import { useCallback, useRef, useState } from 'react'

type Phase =
  | { phase: 'idle' }
  | { phase: 'cropping'; sourceUrl: string; sourceFile: File; sourceImage: HTMLImageElement }
  | { phase: 'compressing' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'error'; message: string; code: string }

export type CropArea = { x: number; y: number; size: number }

export type UseImageUploadOptions = {
  endpoint: string
  outputSize: 1024 | 1200
  maxOutputBytes?: number
}

const ERROR_MESSAGES: Record<string, string> = {
  upload_invalid_format: 'Format invalide',
  upload_too_large: 'Image trop volumineuse',
  upload_invalid_dimensions: 'Dimensions incorrectes',
  upload_storage_failed: 'Échec serveur, réessaie',
  compress_too_large: 'Compression impossible',
  source_too_large: 'Image source > 8 Mo',
  not_found: 'Produit introuvable',
  unknown: 'Erreur inconnue',
}

const SOURCE_MAX_BYTES = 8 * 1024 * 1024

export function useImageUpload(opts: UseImageUploadOptions) {
  const maxOutputBytes = opts.maxOutputBytes ?? (opts.outputSize === 1024 ? 200_000 : 500_000)
  const [state, setState] = useState<Phase>({ phase: 'idle' })
  const inputRef = useRef<HTMLInputElement | null>(null)
  // escape hatch for jsdom tests: avoids File/createObjectURL which are unavailable
  const testSourceImageRef = useRef<HTMLImageElement | null>(null)

  const pickFile = useCallback(() => {
    if (!inputRef.current) {
      const el = document.createElement('input')
      el.type = 'file'
      el.accept = 'image/jpeg,image/png,image/webp'
      el.style.display = 'none'
      el.addEventListener('change', () => {
        const file = el.files?.[0]
        if (!file) return
        if (file.size > SOURCE_MAX_BYTES) {
          setState({
            phase: 'error',
            code: 'source_too_large',
            message: ERROR_MESSAGES.source_too_large,
          })
          return
        }
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () =>
          setState({ phase: 'cropping', sourceUrl: url, sourceFile: file, sourceImage: img })
        img.onerror = () =>
          setState({
            phase: 'error',
            code: 'upload_invalid_format',
            message: ERROR_MESSAGES.upload_invalid_format,
          })
        img.src = url
      })
      document.body.appendChild(el)
      inputRef.current = el
    }
    inputRef.current.value = ''
    inputRef.current.click()
  }, [])

  const cancel = useCallback(() => {
    if (state.phase === 'cropping') URL.revokeObjectURL(state.sourceUrl)
    setState({ phase: 'idle' })
  }, [state])

  async function compress(image: HTMLImageElement, area: CropArea): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = opts.outputSize
    canvas.height = opts.outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas context unavailable')
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.size,
      area.size,
      0,
      0,
      opts.outputSize,
      opts.outputSize
    )

    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), 'image/webp', quality)
      )
      if (!blob) continue
      if (blob.size <= maxOutputBytes) return blob
    }
    throw Object.assign(new Error('compress_too_large'), { code: 'compress_too_large' })
  }

  function uploadXhr(blob: Blob): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const form = new FormData()
      form.append('image', blob, 'image.webp')
      xhr.upload.onprogress = (ev) => {
        if (ev.total > 0) {
          const progress = Math.round((ev.loaded / ev.total) * 100)
          setState({ phase: 'uploading', progress })
        }
      }
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as
            | { success: true; data: { url: string } }
            | { success: false; error: string }
          if (xhr.status >= 200 && xhr.status < 300 && body.success) {
            resolve(body.data)
          } else {
            const code = (body as { error?: string }).error ?? 'unknown'
            reject(Object.assign(new Error(code), { code }))
          }
        } catch {
          reject(Object.assign(new Error('unknown'), { code: 'unknown' }))
        }
      }
      xhr.onerror = () =>
        reject(Object.assign(new Error('upload_storage_failed'), { code: 'upload_storage_failed' }))
      xhr.open('POST', opts.endpoint)
      xhr.send(form)
    })
  }

  const confirmCrop = useCallback(
    async (area: CropArea): Promise<{ url: string }> => {
      let image: HTMLImageElement | null = null
      let sourceUrlToRevoke: string | null = null
      if (state.phase === 'cropping') {
        image = state.sourceImage
        sourceUrlToRevoke = state.sourceUrl
      }
      if (!image && testSourceImageRef.current) image = testSourceImageRef.current
      if (!image) throw new Error('no_source')

      try {
        setState({ phase: 'compressing' })
        const blob = await compress(image, area)
        setState({ phase: 'uploading', progress: 0 })
        const result = await uploadXhr(blob)
        setState({ phase: 'idle' })
        return result
      } catch (e) {
        const code = (e as { code?: string }).code ?? 'unknown'
        setState({ phase: 'error', code, message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown })
        throw e
      } finally {
        if (sourceUrlToRevoke) URL.revokeObjectURL(sourceUrlToRevoke)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, opts.endpoint, opts.outputSize, maxOutputBytes]
  )

  const __setSourceForTest = (img: HTMLImageElement) => {
    testSourceImageRef.current = img
  }

  const api = { state, pickFile, confirmCrop, cancel } as const
  if (import.meta.env.MODE === 'test') {
    ;(api as unknown as Record<string, unknown>).__setSourceForTest = __setSourceForTest
  }
  return api as {
    state: Phase
    pickFile: () => void
    confirmCrop: (area: CropArea) => Promise<{ url: string }>
    cancel: () => void
  }
}
