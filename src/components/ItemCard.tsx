import CameraCapture from './CameraCapture'
import Spinner from './Spinner'
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from '../lib/ui'
import type { ChecklistItem, ItemStatus } from '../types'

const BADGE_SUCCESS =
  'inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success'
const BADGE_WARNING =
  'inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning'

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
    <div className={`${CARD} mb-3 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-contrast">
            {index}
          </div>
          <div>
            <p className="mb-1 text-base font-bold">{item.title}</p>
            {item.instructions && (
              <p className="m-0 text-sm leading-normal text-text-muted">{item.instructions}</p>
            )}
          </div>
        </div>
        {isDone && <span className={BADGE_SUCCESS}>Concluído</span>}
        {status === 'skipped' && <span className={BADGE_WARNING}>Pulado</span>}
      </div>

      {item.requires_photo &&
        (readOnly ? (
          photoUrl && (
            <div className="w-full overflow-hidden rounded-md border border-border bg-bg">
              <img
                src={photoUrl}
                alt={`Foto de ${item.title}`}
                className="block max-h-80 w-full object-cover"
              />
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
        <div className="flex gap-2.5">
          <button
            className={`${BTN_PRIMARY} w-full`}
            onClick={onMarkDone}
            disabled={isDone || saving || (item.requires_photo && !photoUrl)}
          >
            {saving ? <Spinner /> : isDone ? 'Concluído' : 'Confirmar item'}
          </button>
          {!isDone && !item.requires_photo && (
            <button className={BTN_SECONDARY} onClick={onSkip} disabled={saving}>
              Pular
            </button>
          )}
        </div>
      )}
    </div>
  )
}
