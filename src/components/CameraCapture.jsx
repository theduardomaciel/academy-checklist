import { useRef, useState } from 'react'
import { compressPhoto } from '../utils/imageCompression'

/**
 * Renders either an empty "take photo" drop zone or a preview of the
 * captured photo with a "retake" option. `capture="environment"` opens
 * the rear camera directly on phones; on desktop it just falls back to
 * a normal file picker.
 */
export default function CameraCapture({ photoUrl, onPhotoSelected, disabled }) {
  const inputRef = useRef(null)
  const [isCompressing, setIsCompressing] = useState(false)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const compressed = await compressPhoto(file)
      onPhotoSelected(compressed)
    } finally {
      setIsCompressing(false)
      // Allow selecting the same file again (e.g. retake) by resetting the input.
      e.target.value = ''
    }
  }

  if (photoUrl) {
    return (
      <div>
        <div className="photo-preview">
          <img src={photoUrl} alt="Foto do item registrado" />
        </div>
        <label className="capture-label" style={{ marginTop: 10, padding: '10px 16px' }}>
          Tirar outra foto
          <input
            ref={inputRef}
            className="capture-input"
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
    <label className="capture-label">
      {isCompressing ? (
        <>
          <span className="spinner" style={{ color: 'var(--color-accent)' }} />
          Otimizando foto...
        </>
      ) : (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Tirar foto do item
        </>
      )}
      <input
        ref={inputRef}
        className="capture-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || isCompressing}
      />
    </label>
  )
}
