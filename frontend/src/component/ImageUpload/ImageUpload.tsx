import { Image as ImageIcon, Upload } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import { useAnnounce } from '@/hooks/useAnnounce'
import { useImageUpload } from './useImageUpload'

// react-easy-crop (~39 kB) loads only when the crop modal opens, not with the whole profile route.
const CropModal = lazy(() => import('./CropModal').then((m) => ({ default: m.CropModal })))

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
  const { state, pickFile, dropFile, confirmCrop, cancel } = useImageUpload({
    endpoint,
    outputSize,
  })
  const [dragging, setDragging] = useState(false)
  const announce = useAnnounce()
  // 'error' is droppable too, so a rejected drop can be retried without the native picker.
  const canDrop = state.phase === 'idle' || state.phase === 'error'

  const overlayLabel = shape === 'round' ? 'Changer la photo' : 'Changer'

  const handleConfirm = async (area: { x: number; y: number; size: number }) => {
    try {
      const result = await confirmCrop(area)
      onSuccess(result.url)
      // Success returns the phase to 'idle', so the phase-derived region below stays
      // silent; announce here covers every parent (avatar, product image).
      announce('Image enregistrée')
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'unknown'
      onError?.(code)
    }
  }

  return (
    <div className={`image-upload image-upload--${shape}`}>
      <button
        type="button"
        className={`image-upload__trigger${dragging ? ' image-upload__trigger--dragging' : ''}`}
        onClick={pickFile}
        onDragOver={(e) => {
          e.preventDefault()
          if (canDrop) setDragging(true)
        }}
        onDragLeave={(e) => {
          // Ignore leaves onto child nodes (the image), which would otherwise flicker the state.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!canDrop) return
          const file = e.dataTransfer.files?.[0]
          if (file) dropFile(file)
        }}
        aria-label={alt}
      >
        {currentImageUrl && state.phase === 'idle' ? (
          <img className="image-upload__image" src={currentImageUrl} alt={alt} />
        ) : (
          <span className="image-upload__placeholder" aria-hidden="true">
            {shape === 'round' ? <Upload size={32} /> : <ImageIcon size={32} />}
          </span>
        )}

        {state.phase === 'idle' && currentImageUrl && !dragging && (
          <span className="image-upload__hover" aria-hidden="true">
            {overlayLabel}
          </span>
        )}

        {dragging && (
          <span className="image-upload__drop" aria-hidden="true">
            Déposez l'image
          </span>
        )}

        {(state.phase === 'compressing' || state.phase === 'uploading') && (
          <span className="image-upload__progress">
            <span className="image-upload__spinner" />
            <span className="image-upload__progress-text">
              {state.phase === 'compressing' ? 'Compression…' : `${state.progress}%`}
            </span>
          </span>
        )}

        {state.phase === 'error' && !dragging && (
          <span className="image-upload__error">{state.message}</span>
        )}
      </button>

      {state.phase === 'cropping' && (
        <Suspense fallback={null}>
          <CropModal sourceUrl={state.sourceUrl} onCancel={cancel} onConfirm={handleConfirm} />
        </Suspense>
      )}

      {/* Phase-derived, not the live %: text changes only on phase boundaries, so the
          polite region announces compress/upload/error without flooding on each tick. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {state.phase === 'compressing'
          ? "Compression de l'image…"
          : state.phase === 'uploading'
            ? 'Téléversement en cours…'
            : state.phase === 'error'
              ? state.message
              : ''}
      </span>
    </div>
  )
}
