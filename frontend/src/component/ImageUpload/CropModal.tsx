import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'

import './CropModal.css'

type Props = {
  sourceUrl: string
  onCancel: () => void
  onConfirm: (area: { x: number; y: number; size: number }) => void
}

export const CropModal = ({ sourceUrl, onCancel, onConfirm }: Props) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixelArea, setPixelArea] = useState<Area | null>(null)

  return (
    <Modal onClose={onCancel} size="md">
      <Modal.Title className="crop-modal__title">Recadrer la photo</Modal.Title>
      <p className="crop-modal__hint">
        Glisse pour repositionner. Zoom à la molette ou au pincement.
      </p>
      <div className="crop-modal__area">
        <Cropper
          image={sourceUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setPixelArea(pixels)}
        />
      </div>
      <input
        type="range"
        className="crop-modal__zoom"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        aria-label="Zoom"
      />
      <div className="crop-modal__actions">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="primary"
          disabled={!pixelArea}
          onClick={() => {
            if (!pixelArea) return
            onConfirm({ x: pixelArea.x, y: pixelArea.y, size: pixelArea.width })
          }}
        >
          Valider
        </Button>
      </div>
    </Modal>
  )
}
