import CameraCapture from './camera-capture'
import { Spinner } from './spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ChecklistItem, ItemStatus } from '@/types'

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
    <Card className="mb-3 shadow-sm">
      <CardHeader className="flex-row items-start gap-3">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
          {index}
        </div>
        <div className="flex-1">
          <p className="m-0 mb-1 text-base font-bold">{item.title}</p>
          {item.instructions && (
            <p className="m-0 text-sm leading-normal text-muted-foreground">{item.instructions}</p>
          )}
        </div>
        {isDone && <Badge className="bg-success-bg text-success">Concluído</Badge>}
        {status === 'skipped' && <Badge className="bg-warning-bg text-warning">Pulado</Badge>}
      </CardHeader>

      <CardContent>
        {item.requires_photo &&
          (readOnly ? (
            photoUrl && (
              <div className="w-full overflow-hidden rounded-md border bg-background">
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
            <Button
              className="w-full"
              onClick={onMarkDone}
              disabled={isDone || saving || (item.requires_photo && !photoUrl)}
            >
              {saving ? <Spinner /> : isDone ? 'Concluído' : 'Confirmar item'}
            </Button>
            {!isDone && !item.requires_photo && (
              <Button variant="outline" onClick={onSkip} disabled={saving}>
                Pular
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
