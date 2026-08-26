import CameraCapture from './CameraCapture'
import type { ChecklistItem, ItemStatus } from '../types'

interface ItemCardProps {
  index: number
  item: ChecklistItem
  photoUrl?: string | null
  status?: ItemStatus
  onPhotoSelected?: (file: File) => void
  onMarkDone?: () => void
  onSkip?: () => void
  readOnly?: boolean
  saving?: boolean
}

export default function ItemCard({
  index,
  item,
  photoUrl,
  status,
  onPhotoSelected,
  onMarkDone,
  onSkip,
  readOnly,
  saving
}: ItemCardProps) {
  const isDone = status === 'done'

  return (
    <div className="card item-card">
      <div className="item-card__head">
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="item-card__index">{index}</div>
          <div>
            <p className="item-card__title">{item.title}</p>
            {item.instructions && (
              <p className="item-card__instructions">{item.instructions}</p>
            )}
          </div>
        </div>
        {isDone && <span className="badge badge-success">Concluído</span>}
        {status === 'skipped' && <span className="badge badge-warning">Pulado</span>}
      </div>

      {item.requires_photo &&
        (readOnly ? (
          photoUrl && (
            <div className="photo-preview">
              <img src={photoUrl} alt={`Foto de ${item.title}`} />
            </div>
          )
        ) : (
          <CameraCapture
            photoUrl={photoUrl}
            onPhotoSelected={(file) => onPhotoSelected?.(file)}
            disabled={isDone}
          />
        ))}

      {!readOnly && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary btn-block"
            onClick={onMarkDone}
            disabled={isDone || saving || (item.requires_photo && !photoUrl)}
          >
            {saving ? <span className="spinner" /> : isDone ? 'Concluído' : 'Confirmar item'}
          </button>
          {!isDone && !item.requires_photo && (
            <button className="btn btn-secondary" onClick={onSkip} disabled={saving}>
              Pular
            </button>
          )}
        </div>
      )}
    </div>
  )
}
