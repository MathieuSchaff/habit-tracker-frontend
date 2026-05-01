import { Image as ImageIcon, Upload } from 'lucide-react'

import { CropModal } from './CropModal'
import { useImageUpload } from './useImageUpload'

import './ImageUpload.css'

type Props = {
  shape: 'round' | 'square'
  outputSize: 1024 | 1200
  endpoint: string
  currentImageUrl?: string | null
  alt: string
  onSuccess: (url: string) => void
  onError?: (msg: string) => void
}

export const ImageUpload = ({
  shape,
  outputSize,
  endpoint,
  currentImageUrl,
  alt,
  onSuccess,
  onError,
}: Props) => {
  const { state, pickFile, confirmCrop, cancel } = useImageUpload({ endpoint, outputSize })

  const overlayLabel = shape === 'round' ? 'Changer la photo' : 'Changer'

  const handleConfirm = async (area: { x: number; y: number; size: number }) => {
    try {
      const result = await confirmCrop(area)
      onSuccess(result.url)
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'unknown'
      onError?.(code)
    }
  }

  return (
    <div className={`image-upload image-upload--${shape}`}>
      <button type="button" className="image-upload__trigger" onClick={pickFile} aria-label={alt}>
        {currentImageUrl && state.phase === 'idle' ? (
          <img className="image-upload__image" src={currentImageUrl} alt={alt} />
        ) : (
          <span className="image-upload__placeholder" aria-hidden="true">
            {shape === 'round' ? <Upload size={32} /> : <ImageIcon size={32} />}
          </span>
        )}

        {state.phase === 'idle' && currentImageUrl && (
          <span className="image-upload__hover">{overlayLabel}</span>
        )}

        {(state.phase === 'compressing' || state.phase === 'uploading') && (
          <span className="image-upload__progress">
            <span className="image-upload__spinner" />
            <span className="image-upload__progress-text">
              {state.phase === 'compressing' ? 'Compression…' : `${state.progress}%`}
            </span>
          </span>
        )}

        {state.phase === 'error' && <span className="image-upload__error">{state.message}</span>}
      </button>

      {state.phase === 'cropping' && (
        <CropModal sourceUrl={state.sourceUrl} onCancel={cancel} onConfirm={handleConfirm} />
      )}
    </div>
  )
}
