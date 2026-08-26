import type { ChangeEvent } from 'react'
import { compressPhoto } from '../utils/imageCompression'
import CameraIcon from './icons/CameraIcon'

const CAPTURE_INPUT_CLASS = 'hidden'

const CAPTURE_LABEL_CLASS =
  'flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 text-center text-sm font-semibold text-muted-foreground transition-colors hover:border-brand-cyan hover:text-brand-cyan'

interface CameraCaptureProps {
  photoUrl?: string | null
  onPhotoSelected: (file: File) => void
  disabled?: boolean
}

/**
 * Renders either an empty "take photo" drop zone or a preview of the
 * captured photo with a "retake" option. `capture="environment"` opens
 * the rear camera directly on phones; on desktop it just falls back to
 * a normal file picker.
 */
export default function CameraCapture({ photoUrl, onPhotoSelected, disabled }: CameraCaptureProps) {
  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const compressed = await compressPhoto(file)
      onPhotoSelected(compressed)
    } finally {
      // Allow selecting the same file again (e.g. retake) by resetting the input.
      e.target.value = ''
    }
  }

  if (photoUrl) {
    return (
      <div>
        <div className="w-full overflow-hidden rounded-md border bg-background">
          <img
            src={photoUrl}
            alt="Foto do item registrado"
            className="block max-h-80 w-full object-cover"
          />
        </div>
        <label className={`${CAPTURE_LABEL_CLASS} mt-2.5 border py-2.5`}>
          Tirar outra foto
          <input
            className={CAPTURE_INPUT_CLASS}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </label>
      </div>
    )
  }

  return (
    <label className={`${CAPTURE_LABEL_CLASS} border py-7`}>
      <CameraIcon />
      Tirar foto do item
      <input
        className={CAPTURE_INPUT_CLASS}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </label>
  )
}
